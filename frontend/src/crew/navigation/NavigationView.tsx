import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Map as MapLibreMap, Marker, GeoJSONSource } from 'maplibre-gl';
import type { LayerSpecification, StyleSpecification } from 'maplibre-gl';
import '../../map/maplibre';
import { Ambulance, Coordinates, EmergencyCall, Incident, RouteInfo } from '../../types';
import { calculateRoute, getErrorMessage, updateAmbulanceLocation, voteIncident } from '../../services/api';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../auth/AuthContext';
import { useGeolocation, useSimulatedGeolocation } from './useGeolocation';
import { useNavigation } from './useNavigation';
import { formatNavDistance, maneuverIcon, maneuverText, spokenInstruction } from './instructions';
import { googleMapsUrl } from './mapsLink';
import { useMapStyle } from '../../map/useMapStyle';
import { DATA_ATTRIBUTION } from '../../map/attribution';
import { setThemePreference, useMapTheme } from '../../map/useMapTheme';
import { nextThemePreference, THEME_OPTIONS } from '../../map/ThemeSwitch';
import { MapTheme, ROUTE_COLORS } from '../../map/mapStyle';
import { lineFeature, toLngLat } from '../../map/geojson';
import { CallMarker } from '../../map/Markers';
import {
  DASHED_OUTLINE_FILTER,
  EFFECT_META,
  INCIDENT_FILL,
  INCIDENT_LABEL,
  INCIDENT_OUTLINE,
  INCIDENT_OUTLINE_DASHED,
  SOLID_OUTLINE_FILTER,
  incidentAreas,
  sourceLabel
} from '../../map/incidents';
import { IncidentIcon } from '../../ui/IncidentIcon';
import { ArrivalIcon, CheckCircleIcon, DetourIcon, MyLocationIcon, ReportIcon, VolumeOffIcon, VolumeOnIcon } from '../../ui/icons';
import ReportSheet from '../incidents/ReportSheet';
import StillTherePrompt from '../incidents/StillTherePrompt';
import { useIncidentAlerts } from '../incidents/useIncidentAlerts';
import { formatNavDistance as formatAlertDistance } from './instructions';
import styles from './NavigationView.module.css';

const REROUTE_INTERVAL_MS = 15000;
// Bloqueio novo à frente: recalcula logo (o intervalo só evita repetir enquanto a rota nova chega)
const BLOCK_REROUTE_INTERVAL_MS = 5000;
const LOCATION_SYNC_MS = 10000;
const VOICE_KEY = 'samu:voz';

const VEHICLE_SVG =
  '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#2563eb" stroke="white" stroke-width="3"/><path d="M20 8 L29.5 29 L20 24 L10.5 29 Z" fill="white"/></svg>';

// O mapa nasce vazio e recebe o estilo SAMU assim que ele carrega
const EMPTY_STYLE: StyleSpecification = { version: 8, sources: {}, layers: [] };

// Áreas das ocorrências, por baixo da rota
const INCIDENT_LAYERS: LayerSpecification[] = [
  { id: 'incident-fill', type: 'fill', source: 'incidents', paint: INCIDENT_FILL },
  { id: 'incident-outline', type: 'line', source: 'incidents', filter: SOLID_OUTLINE_FILTER, paint: INCIDENT_OUTLINE },
  { id: 'incident-outline-dashed', type: 'line', source: 'incidents', filter: DASHED_OUTLINE_FILTER, paint: INCIDENT_OUTLINE_DASHED }
];

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
  incidents: Incident[];
  simulate: boolean;
  onExit: () => void;
  onFinish: () => Promise<void>;
  onIncidentsChange: () => void; // relato ou resposta enviada: atualiza a lista
}

export default function NavigationView({
  ambulance,
  call,
  initialRoute,
  incidents,
  simulate,
  onExit,
  onFinish,
  onIncidentsChange
}: NavigationViewProps) {
  const { me } = useAuth();
  const [route, setRoute] = useState(initialRoute);
  const [reporting, setReporting] = useState(false);
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
  const incidentsRef = useRef(incidents);
  incidentsRef.current = incidents;
  const lastReroute = useRef(0);
  const announced = useRef(new Set<string>());
  const voiceRef = useRef(voiceOn);
  const fixRef = useRef(fix);
  voiceRef.current = voiceOn;
  fixRef.current = fix;

  const heading = fix && fix.heading !== null && (fix.speed ?? 0) > 2 ? fix.heading : nav.routeBearing;

  // `interrupt`: instruções de manobra cortam a fala anterior; avisos entram na fila, sem cortar
  const speak = useCallback((text: string, interrupt = true) => {
    if (!voiceRef.current || !('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    if (interrupt) window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, []);
  const speakQueued = useCallback((text: string) => speak(text, false), [speak]);

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
      attributionControl: { compact: true, customAttribution: DATA_ATTRIBUTION }
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
        sources: {
          ...next.sources,
          incidents: { type: 'geojson', data: incidentAreas(incidentsRef.current) },
          route: { type: 'geojson', data: lineFeature(routeLineRef.current) }
        },
        layers: [...next.layers, ...INCIDENT_LAYERS, ...routeLayers(theme)]
      })
    });
  }, [mapStyle, theme]);

  // Ocorrências novas ou encerradas aparecem sem recarregar o estilo
  useEffect(() => {
    (mapRef.current?.getSource('incidents') as GeoJSONSource | undefined)?.setData(incidentAreas(incidents));
  }, [incidents]);

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

  // Recalcula a partir de onde o carro está (o backend desvia das ocorrências ativas)
  const reroute = useCallback((message: string, minInterval: number) => {
    const current = fixRef.current;
    if (rerouting || !current || Date.now() - lastReroute.current < minInterval) return;

    lastReroute.current = Date.now();
    setRerouting(true);
    speak(message);

    calculateRoute(current.position, call.location)
      .then(newRoute => {
        announced.current.clear();
        setRoute(newRoute);
      })
      .catch(error => toast(getErrorMessage(error, 'Não foi possível recalcular a rota.'), 'error'))
      .finally(() => setRerouting(false));
  }, [rerouting, call.location, speak, toast]);

  const alerts = useIncidentAlerts({
    incidents,
    route,
    remaining: nav.remaining,
    position: fix?.position ?? null,
    meId: me.id,
    active: !!fix && !nav.arrived && !rerouting,
    speak: speakQueued
  });

  // Saiu da rota
  useEffect(() => {
    if (nav.offRoute) reroute('Recalculando rota', REROUTE_INTERVAL_MS);
  }, [nav.offRoute, reroute]);

  // Bloqueio novo no caminho que falta
  useEffect(() => {
    if (alerts.blockedAhead && !nav.arrived) reroute('Via bloqueada à frente. Recalculando rota', BLOCK_REROUTE_INTERVAL_MS);
  }, [alerts.blockedAhead, nav.arrived, reroute]);

  const { prompt, closePrompt } = alerts;
  const answerPrompt = useCallback((answer: 'SIM' | 'NAO' | null) => {
    closePrompt();
    if (!prompt || !answer) return;
    voteIncident(prompt.id, answer)
      .then(() => {
        speak('Obrigado', false);
        onIncidentsChange();
      })
      .catch(() => { /* sem sinal: a pergunta só não conta */ });
  }, [prompt, closePrompt, speak, onIncidentsChange]);

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
      if (current) updateAmbulanceLocation(ambulance.id, current.position, current.speed).catch(() => {});
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

      {/* Instrução e, logo abaixo, avisos (empilhados: a instrução pode ter duas linhas) */}
      <div className={styles.top}>
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
        ) : alerts.alert ? (
          <div
            className={styles.incidentAlert}
            style={{ '--alert-color': EFFECT_META[alerts.alert.incident.effect].color } as React.CSSProperties}
            role="status"
          >
            <span className={styles.incidentAlertIcon}><IncidentIcon type={alerts.alert.incident.type} /></span>
            <p>
              <strong>
                {INCIDENT_LABEL[alerts.alert.incident.type]}
                {alerts.alert.distance !== null && ` em ${formatAlertDistance(alerts.alert.distance)}`}
              </strong>
              <span>
                {alerts.alert.distance === null
                  ? alerts.alert.incident.description ?? sourceLabel(alerts.alert.incident)
                  : `${sourceLabel(alerts.alert.incident)} · ${EFFECT_META[alerts.alert.incident.effect].label.toLowerCase()}`}
              </span>
            </p>
          </div>
        ) : null}
      </div>

      {alerts.prompt && <StillTherePrompt incident={alerts.prompt} onAnswer={answerPrompt} />}

      {!nav.arrived && !alerts.prompt && (
        <button className={styles.report} onClick={() => setReporting(true)}><ReportIcon /> Reportar</button>
      )}

      {reporting && (
        <ReportSheet
          getPosition={async () => fixRef.current?.position ?? null}
          onClose={() => setReporting(false)}
          onReported={onIncidentsChange}
          speak={speakQueued}
        />
      )}

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
