import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Map as MapLibreMap, Marker, GeoJSONSource } from 'maplibre-gl';
import type { LayerSpecification, StyleSpecification } from 'maplibre-gl';
import '../../map/maplibre';
import { Ambulance, Coordinates, EmergencyCall, RouteInfo } from '../../types';
import { calculateRoute, getErrorMessage, updateAmbulanceLocation } from '../../services/api';
import { useToast } from '../../components/Toast';
import { useGeolocation, useSimulatedGeolocation } from './useGeolocation';
import { useNavigation } from './useNavigation';
import { formatNavDistance, maneuverIcon, maneuverText, spokenInstruction } from './instructions';
import { googleMapsUrl } from './mapsLink';
import { useMapStyle } from '../../map/useMapStyle';
import { setThemePreference, useMapTheme } from '../../map/useMapTheme';
import { nextThemePreference, THEME_OPTIONS } from '../../map/ThemeSwitch';
import { MapTheme, ROUTE_COLORS } from '../../map/mapStyle';
import { lineFeature, toLngLat } from '../../map/geojson';
import { CallMarker } from '../../map/Markers';
import { ArrivalIcon, CheckCircleIcon, DetourIcon, MyLocationIcon, VolumeOffIcon, VolumeOnIcon } from '../../ui/icons';
import styles from './NavigationView.module.css';

const REROUTE_INTERVAL_MS = 15000;
const LOCATION_SYNC_MS = 10000;
const VOICE_KEY = 'samu:voz';

const VEHICLE_SVG =
  '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#2563eb" stroke="white" stroke-width="3"/><path d="M20 8 L29.5 29 L20 24 L10.5 29 Z" fill="white"/></svg>';

// O mapa nasce vazio e recebe o estilo SAMU assim que ele carrega
const EMPTY_STYLE: StyleSpecification = { version: 8, sources: {}, layers: [] };

function routeLayers(theme: MapTheme): LayerSpecification[] {
  const layout = { 'line-join': 'round', 'line-cap': 'round' } as const;
  return [
    { id: 'route-casing', type: 'line', source: 'route', layout, paint: { 'line-color': ROUTE_COLORS[theme].casing, 'line-width': 13 } },
    { id: 'route-line', type: 'line', source: 'route', layout, paint: { 'line-color': ROUTE_COLORS[theme].line, 'line-width': 8 } }
  ];
}

function readVoicePreference(): boolean {
  try {
    return localStorage.getItem(VOICE_KEY) !== 'off';
  } catch {
    return true;
  }
}

interface NavigationViewProps {
  ambulance: Ambulance;
  call: EmergencyCall;
  initialRoute: RouteInfo;
  simulate: boolean;
  onExit: () => void;
  onFinish: () => Promise<void>;
}

export default function NavigationView({ ambulance, call, initialRoute, simulate, onExit, onFinish }: NavigationViewProps) {
  const [route, setRoute] = useState(initialRoute);
  const [rerouting, setRerouting] = useState(false);
  const [following, setFollowing] = useState(true);
  const [voiceOn, setVoiceOn] = useState(readVoicePreference);
  const [finishing, setFinishing] = useState(false);
  const toast = useToast();
  const { theme, preference } = useMapTheme();
  const mapStyle = useMapStyle(theme);
  // Elemento do marcador de destino: o MapLibre posiciona, o React desenha o pino
  const [destinationEl] = useState(() => document.createElement('div'));

  const real = useGeolocation(!simulate);
  const sim = useSimulatedGeolocation(route.geometry, simulate);
  const fix = simulate ? sim.fix : real.fix;
  const nav = useNavigation(route, call.location, fix);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const vehicleRef = useRef<Marker | null>(null);
  const routeLineRef = useRef<Coordinates[]>(initialRoute.geometry);
  const lastReroute = useRef(0);
  const announced = useRef(new Set<string>());
  const voiceRef = useRef(voiceOn);
  const fixRef = useRef(fix);
  voiceRef.current = voiceOn;
  fixRef.current = fix;

  const heading = fix && fix.heading !== null && (fix.speed ?? 0) > 2 ? fix.heading : nav.routeBearing;

  const speak = useCallback((text: string) => {
    if (!voiceRef.current || !('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, []);

  // Cria o mapa uma vez
  useEffect(() => {
    if (!containerRef.current) return;
    const start = initialRoute.geometry[0] ?? ambulance.location;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: EMPTY_STYLE,
      center: toLngLat(start),
      zoom: 17,
      pitch: 50,
      bearing: nav.routeBearing,
      attributionControl: { compact: true }
    });
    mapRef.current = map;

    // Mexer no mapa com o dedo desliga o "seguir o carro" (zoom não desliga)
    const stopFollowing = (event: { originalEvent?: unknown }) => {
      if (event.originalEvent) setFollowing(false);
    };
    map.on('dragstart', stopFollowing);
    map.on('rotatestart', stopFollowing);

    new Marker({ element: destinationEl, anchor: 'bottom' }).setLngLat(toLngLat(call.location)).addTo(map);

    const vehicle = document.createElement('div');
    vehicle.className = styles.vehicle;
    vehicle.innerHTML = VEHICLE_SVG;
    vehicleRef.current = new Marker({ element: vehicle, rotationAlignment: 'map', pitchAlignment: 'map' })
      .setLngLat(toLngLat(start))
      .addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Aplica o estilo levando a rota junto (também na troca dia/noite, sem recriar o mapa)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapStyle) return;
    map.setStyle(mapStyle, {
      transformStyle: (_previous, next) => ({
        ...next,
        sources: { ...next.sources, route: { type: 'geojson', data: lineFeature(routeLineRef.current) } },
        layers: [...next.layers, ...routeLayers(theme)]
      })
    });
  }, [mapStyle, theme]);

  // A cada leitura: move o carro, apaga o trecho percorrido e gira o mapa na direção do movimento
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !nav.position) return;

    vehicleRef.current?.setLngLat(toLngLat(nav.position)).setRotation(heading);
    routeLineRef.current = nav.remaining;
    (map.getSource('route') as GeoJSONSource | undefined)?.setData(lineFeature(nav.remaining));

    if (following) {
      map.easeTo({
        center: toLngLat(nav.position),
        bearing: heading,
        pitch: 50,
        duration: 1000,
        easing: t => t,
        // Carro no terço de baixo da tela, como nos apps de navegação
        padding: { top: map.getContainer().clientHeight * 0.35, bottom: 0, left: 0, right: 0 }
      });
    }
  }, [nav.position, nav.remaining, heading, following]);

  // Saiu da rota: recalcula a partir de onde o carro está (o backend reaplica o desvio de risco)
  useEffect(() => {
    const current = fixRef.current;
    if (!nav.offRoute || rerouting || !current || Date.now() - lastReroute.current < REROUTE_INTERVAL_MS) return;

    lastReroute.current = Date.now();
    setRerouting(true);
    speak('Recalculando rota');

    calculateRoute(current.position, call.location)
      .then(newRoute => {
        announced.current.clear();
        setRoute(newRoute);
      })
      .catch(error => toast(getErrorMessage(error, 'Não foi possível recalcular a rota.'), 'error'))
      .finally(() => setRerouting(false));
  }, [nav.offRoute, rerouting, call.location, speak, toast]);

  // Avisos por voz: ~300 m antes da manobra, na hora da manobra e na chegada
  const step = route.steps[nav.stepIndex];
  useEffect(() => {
    if (!fixRef.current || !step || nav.offRoute || rerouting) return;

    const once = (key: string, text: string) => {
      if (announced.current.has(key)) return;
      announced.current.add(key);
      speak(text);
    };

    if (nav.arrived) {
      once('arrived', 'Você chegou ao destino');
      return;
    }

    const meters = nav.distanceToManeuver;
    // Ao iniciar (ou após recalcular) fala a próxima manobra, esteja ela perto ou longe
    if (!announced.current.has('start')) {
      once('start', spokenInstruction(step, meters));
      if (meters <= 300) announced.current.add(`${nav.stepIndex}:far`);
      if (meters <= 50) announced.current.add(`${nav.stepIndex}:near`);
      return;
    }

    if (meters <= 50) once(`${nav.stepIndex}:near`, maneuverText(step));
    else if (meters <= 300) once(`${nav.stepIndex}:far`, spokenInstruction(step, meters));
  }, [nav.stepIndex, nav.distanceToManeuver, nav.arrived, nav.offRoute, rerouting, step, speak]);

  // Tela sempre acesa enquanto navega
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        lock = (await navigator.wakeLock?.request('screen')) ?? null;
      } catch {
        // Sem suporte ou bateria fraca: segue sem travar a tela
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') request();
    };

    request();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      lock?.release().catch(() => {});
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Posição para a central acompanhar a viatura
  useEffect(() => {
    const sync = () => {
      const current = fixRef.current;
      if (current) updateAmbulanceLocation(ambulance.id, current.position).catch(() => {});
    };
    const timer = window.setInterval(sync, LOCATION_SYNC_MS);
    return () => {
      window.clearInterval(timer);
      sync();
    };
  }, [ambulance.id]);

  const recenter = () => {
    setFollowing(true);
    if (nav.position) mapRef.current?.easeTo({ center: toLngLat(nav.position), bearing: heading, pitch: 50, zoom: 17, duration: 600 });
  };

  const toggleVoice = () => {
    const next = !voiceOn;
    setVoiceOn(next);
    if (!next) window.speechSynthesis?.cancel();
    try {
      localStorage.setItem(VOICE_KEY, next ? 'on' : 'off');
    } catch {
      // Preferência vale só nesta sessão
    }
  };

  const handleFinish = async () => {
    setFinishing(true);
    try {
      await onFinish();
    } finally {
      setFinishing(false);
    }
  };

  const eta = new Date(Date.now() + nav.durationRemaining * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const mapsUrl = googleMapsUrl(fix?.position ?? ambulance.location, call.location, nav.remaining, route.waypoints);
  const StepIcon = step ? maneuverIcon(step) : null;
  const themeOption = THEME_OPTIONS.find(option => option.value === preference) ?? THEME_OPTIONS[0];
  const ThemeIcon = themeOption.Icon;

  return (
    <div className={styles.screen} data-theme={theme}>
      <div ref={containerRef} className={styles.map} />
      {createPortal(<CallMarker priority={call.priority} />, destinationEl)}

      <header className={`${styles.banner} ${rerouting ? styles.bannerWarning : ''}`} aria-live="polite">
        {rerouting ? (
          <p className={styles.bannerText}>Recalculando rota…</p>
        ) : nav.arrived ? (
          <>
            <span className={styles.icon}><ArrivalIcon /></span>
            <p className={styles.bannerText}>Você chegou ao destino</p>
          </>
        ) : step && StepIcon ? (
          <>
            <span className={styles.icon}><StepIcon /></span>
            <div>
              <p className={styles.distance}>{formatNavDistance(nav.distanceToManeuver)}</p>
              <p className={styles.bannerText}>{maneuverText(step)}</p>
            </div>
          </>
        ) : null}
      </header>

      {!simulate && real.error ? (
        <p className={styles.notice}>{real.error}</p>
      ) : !fix ? (
        <p className={styles.notice}>Obtendo sua localização…</p>
      ) : null}

      {!following && (
        <button className={styles.recenter} onClick={recenter}><MyLocationIcon /> Recentralizar</button>
      )}

      <footer className={styles.panel}>
        {nav.arrived ? (
          <button className={styles.finish} disabled={finishing} onClick={handleFinish}>
            {finishing ? 'Finalizando…' : <><CheckCircleIcon /> Finalizar atendimento</>}
          </button>
        ) : (
          <div className={styles.summary}>
            <strong>{eta}</strong>
            <span>{Math.max(1, Math.round(nav.durationRemaining / 60))} min · {formatNavDistance(nav.distanceRemaining)}</span>
          </div>
        )}

        <div className={styles.actions}>
          <button
            className={styles.iconButton}
            onClick={toggleVoice}
            aria-label={voiceOn ? 'Silenciar instruções de voz' : 'Ativar instruções de voz'}
          >
            {voiceOn ? <VolumeOnIcon /> : <VolumeOffIcon />}
          </button>
          <button
            className={styles.iconButton}
            onClick={() => setThemePreference(nextThemePreference(preference))}
            aria-label={`Mapa: ${themeOption.label}. Toque para mudar`}
            title={`Mapa: ${themeOption.label}`}
          >
            <ThemeIcon />
          </button>
          <a className={styles.mapsButton} href={mapsUrl} target="_blank" rel="noopener noreferrer">
            Google Maps
          </a>
          {simulate && (
            <button className={styles.iconButton} onClick={sim.deviate} title="Simular saída da rota" aria-label="Simular saída da rota"><DetourIcon /></button>
          )}
          <button className={styles.exitButton} onClick={onExit}>Sair</button>
        </div>
      </footer>
    </div>
  );
}
