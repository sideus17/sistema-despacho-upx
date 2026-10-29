import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Map as MapLibreMap, Marker, GeoJSONSource, VectorTileSource } from 'maplibre-gl';
import type { LayerSpecification, StyleSpecification } from 'maplibre-gl';
import '../../map/maplibre';
import { Ambulance, CallPriority, Coordinates, Incident, RouteInfo, SpeedLimitSegment } from '../../types';
import type { Destination } from '../destination';
import { calculateRoute, getErrorMessage, getSpeedLimits, trafficTileUrl, updateAmbulanceLocation, voteIncident, withAuthRequest } from '../../services/api';
import { TRAFFIC_SOURCE, useTrafficVersion, withTrafficLayer } from '../../map/traffic';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../auth/AuthContext';
import { useGeolocation, useSimulatedGeolocation } from './useGeolocation';
import { useNavigation } from './useNavigation';
import { overLimit, speedLimitAt, toKmh } from './speed';
import { PanelHandle, usePanelCollapsed } from '../PanelHandle';
import { LANDSCAPE_PHONE, useMediaQuery } from '../../ui/useMediaQuery';
import { formatNavDistance, maneuverIcon, maneuverText, spokenInstruction } from './instructions';
import { wazeUrl } from './mapsLink';
import { useMapStyle } from '../../map/useMapStyle';
import { DATA_ATTRIBUTION } from '../../map/attribution';
import { useTheme } from '../../theme/theme';
import { MapTheme, ROUTE_COLORS } from '../../map/mapStyle';
import { lineFeature, toLngLat } from '../../map/geojson';
import { CallMarker, HospitalMarker } from '../../map/Markers';
import {
  DASHED_OUTLINE_FILTER,
  EFFECT_META,
  effectVars,
  INCIDENT_FILL,
  INCIDENT_LINE,
  INCIDENT_LINE_LAYOUT,
  INCIDENT_OUTLINE,
  INCIDENT_OUTLINE_DASHED,
  LINE_FILTER,
  SOLID_OUTLINE_FILTER,
  incidentAreas,
  incidentTypeLabel,
  sourceLabel
} from '../../map/incidents';
import { IncidentIcon } from '../../ui/IncidentIcon';
import { ArrivalIcon, DetourIcon, HospitalIcon, LocationIcon, MyLocationIcon, ReportIcon, VolumeOffIcon, VolumeOnIcon } from '../../ui/icons';
import { riskVars } from '../../utils/calls';
import { MAP_LOCALE } from '../../map/locale';
import ReportSheet from '../incidents/ReportSheet';
import StillTherePrompt from '../incidents/StillTherePrompt';
import { useIncidentAlerts } from '../incidents/useIncidentAlerts';
import { formatNavDistance as formatAlertDistance } from './instructions';
import styles from './NavigationView.module.css';

const REROUTE_INTERVAL_MS = 15000;
// Bloqueio novo à frente: recalcula logo (o intervalo só evita repetir enquanto a rota nova chega)
const BLOCK_REROUTE_INTERVAL_MS = 5000;
const LOCATION_SYNC_MS = 10000;
// Quanto tempo o aviso "Destino mudou" fica no topo
const DESTINATION_NOTICE_MS = 8000;
const VOICE_KEY = 'samu:voz';

const VEHICLE_SVG =
  '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#2563eb" stroke="white" stroke-width="3"/><path d="M20 8 L29.5 29 L20 24 L10.5 29 Z" fill="white"/></svg>';

// O mapa nasce vazio e recebe o estilo SAMU assim que ele carrega
const EMPTY_STYLE: StyleSpecification = { version: 8, sources: {}, layers: [] };

// Áreas das ocorrências, por baixo da rota
const INCIDENT_LAYERS: LayerSpecification[] = [
  { id: 'incident-fill', type: 'fill', source: 'incidents', paint: INCIDENT_FILL },
  { id: 'incident-outline', type: 'line', source: 'incidents', filter: SOLID_OUTLINE_FILTER, paint: INCIDENT_OUTLINE },
  { id: 'incident-outline-dashed', type: 'line', source: 'incidents', filter: DASHED_OUTLINE_FILTER, paint: INCIDENT_OUTLINE_DASHED },
  { id: 'incident-line', type: 'line', source: 'incidents', filter: LINE_FILTER, paint: INCIDENT_LINE, layout: INCIDENT_LINE_LAYOUT }
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
  destination: Destination; // o chamado e, depois do local, o hospital
  priority: CallPriority; // cor do chamado: a pulseira do destino, também a caminho do hospital
  reference?: string | null; // referência do local ("portão azul"), dita junto do endereço
  initialRoute: RouteInfo;
  incidents: Incident[];
  simulate: boolean;
  onExit: () => void;
  onIncidentsChange: () => void; // relato ou resposta enviada: atualiza a lista
}

export default function NavigationView({
  ambulance,
  destination,
  priority,
  reference,
  initialRoute,
  incidents,
  simulate,
  onExit,
  onIncidentsChange
}: NavigationViewProps) {
  const { me } = useAuth();
  const [route, setRoute] = useState(initialRoute);
  const [reporting, setReporting] = useState(false);
  const [rerouting, setRerouting] = useState(false);
  const [following, setFollowing] = useState(true);
  const [voiceOn, setVoiceOn] = useState(readVoicePreference);
  const toast = useToast();
  const { theme } = useTheme();
  const mapStyle = useMapStyle(theme);
  // Elemento do marcador de destino: o MapLibre posiciona, o React desenha o pino
  const [destinationEl] = useState(() => document.createElement('div'));

  const real = useGeolocation(!simulate);
  const sim = useSimulatedGeolocation(route.geometry, simulate);
  const fix = simulate ? sim.fix : real.fix;
  const nav = useNavigation(route, destination.location, fix);
  const arrivalText = destination.kind === 'hospital' ? 'Você chegou ao hospital' : 'Você chegou ao local';

  // Limites de velocidade da rota atual (início e cada recálculo); sem resposta, a placa não aparece
  const [limits, setLimits] = useState<SpeedLimitSegment[]>([]);
  useEffect(() => {
    let cancelled = false;
    setLimits([]);
    getSpeedLimits(route.geometry)
      .then(segments => { if (!cancelled) setLimits(segments); })
      .catch(() => { /* sem limites: só o velocímetro */ });
    return () => { cancelled = true; };
  }, [route]);
  const speedKmh = toKmh(fix?.speed);
  const speedLimit = speedLimitAt(limits, nav.travelled);

  const containerRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  // Deitado, o painel vira uma coluna à esquerda e começa recolhido; em pé, ele pode descer
  const landscape = useMediaQuery(LANDSCAPE_PHONE);
  const [panelCollapsed, setPanelCollapsed] = usePanelCollapsed(landscape);
  // Ao chegar, o painel abre sozinho para o "Sair da navegação" (finalizar é no card do chamado)
  const collapsed = panelCollapsed && !nav.arrived;
  const landscapeRef = useRef(landscape);
  landscapeRef.current = landscape;
  const mapRef = useRef<MapLibreMap | null>(null);
  const vehicleRef = useRef<Marker | null>(null);
  const routeLineRef = useRef<Coordinates[]>(initialRoute.geometry);
  const incidentsRef = useRef(incidents);
  incidentsRef.current = incidents;
  // Trânsito (TomTom): entra no estilo montado à mão, sempre ligado
  const trafficVersion = useTrafficVersion();
  const trafficVersionRef = useRef(trafficVersion);
  trafficVersionRef.current = trafficVersion;
  const lastReroute = useRef(0);
  const destinationMarkerRef = useRef<Marker | null>(null);
  const destinationIdRef = useRef(destination.id);
  const [destinationNotice, setDestinationNotice] = useState<string | null>(null);
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
      attributionControl: { compact: true, customAttribution: DATA_ATTRIBUTION },
      locale: MAP_LOCALE,
      // Os blocos do trânsito vêm da nossa API, que exige login
      transformRequest: withAuthRequest
    });
    mapRef.current = map;
    // Créditos abertos cobririam o velocímetro: começam recolhidos no "i" (um toque abre)
    map.once('load', () => {
      map.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
    });

    // Mexer no mapa com o dedo desliga o "seguir o carro" (zoom não desliga)
    const stopFollowing = (event: { originalEvent?: unknown }) => {
      if (event.originalEvent) setFollowing(false);
    };
    map.on('dragstart', stopFollowing);
    map.on('rotatestart', stopFollowing);

    destinationMarkerRef.current = new Marker({ element: destinationEl, anchor: destination.kind === 'hospital' ? 'center' : 'bottom' })
      .setLngLat(toLngLat(destination.location))
      .addTo(map);

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
      transformStyle: (_previous, next) => withTrafficLayer({
        ...next,
        sources: {
          ...next.sources,
          incidents: { type: 'geojson', data: incidentAreas(incidentsRef.current, theme) },
          route: { type: 'geojson', data: lineFeature(routeLineRef.current) }
        },
        layers: [...next.layers, ...INCIDENT_LAYERS, ...routeLayers(theme)]
      }, theme, trafficVersionRef.current)
    });
  }, [mapStyle, theme]);

  // A cada 2 min os blocos do trânsito são pedidos de novo
  useEffect(() => {
    (mapRef.current?.getSource(TRAFFIC_SOURCE) as VectorTileSource | undefined)?.setTiles([trafficTileUrl(trafficVersion)]);
  }, [trafficVersion]);

  // Ocorrências novas ou encerradas aparecem sem recarregar o estilo
  useEffect(() => {
    (mapRef.current?.getSource('incidents') as GeoJSONSource | undefined)?.setData(incidentAreas(incidents, theme));
  }, [incidents, theme]);

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
        // Carro no terço de baixo da tela, como nos apps de navegação; deitado, à direita do painel
        padding: landscapeRef.current
          ? { top: map.getContainer().clientHeight * 0.3, bottom: 0, left: (panelRef.current?.offsetWidth ?? 0) + 20, right: 0 }
          : { top: map.getContainer().clientHeight * 0.35, bottom: 0, left: 0, right: 0 }
      });
    }
  }, [nav.position, nav.remaining, heading, following]);

  // Altura do painel numa variável CSS: os botões flutuantes e os créditos do mapa ficam logo acima dele
  useEffect(() => {
    const panel = panelRef.current;
    const screen = screenRef.current;
    if (!panel || !screen || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => screen.style.setProperty('--panel-h', `${panel.offsetHeight}px`));
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);

  // Recalcula a partir de onde o carro está (o backend desvia das ocorrências ativas)
  const reroute = useCallback((message: string, minInterval: number) => {
    const current = fixRef.current;
    if (rerouting || !current || Date.now() - lastReroute.current < minInterval) return;

    lastReroute.current = Date.now();
    setRerouting(true);
    speak(message);

    calculateRoute(current.position, destination.location)
      .then(newRoute => {
        announced.current.clear();
        setRoute(newRoute);
      })
      .catch(error => toast(getErrorMessage(error, 'Não foi possível recalcular a rota.'), 'error'))
      .finally(() => setRerouting(false));
  }, [rerouting, destination.location, speak, toast]);

  // A central trocou o hospital com a navegação aberta: o destino muda sem fechar a tela.
  // Move o pino, fala, avisa no topo e calcula a rota nova a partir de onde o carro está.
  useEffect(() => {
    if (destinationIdRef.current === destination.id) return;
    destinationIdRef.current = destination.id;
    destinationMarkerRef.current?.setLngLat(toLngLat(destination.location));
    const text = `Destino mudou: ${destination.label}`;
    setDestinationNotice(text);
    speak(text);
    lastReroute.current = Date.now();
    setRerouting(true);
    calculateRoute(fixRef.current?.position ?? ambulance.location, destination.location)
      .then(newRoute => {
        announced.current.clear();
        setRoute(newRoute);
      })
      .catch(error => toast(getErrorMessage(error, 'Não foi possível calcular a rota para o novo destino.'), 'error'))
      .finally(() => setRerouting(false));
  }, [destination.id, destination.label, destination.location, ambulance.location, speak, toast]);

  // O aviso do destino novo fica alguns segundos no topo
  useEffect(() => {
    if (!destinationNotice) return;
    const timer = window.setTimeout(() => setDestinationNotice(null), DESTINATION_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [destinationNotice]);

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
      once('arrived', arrivalText);
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

  // A tela fica acesa pelo turno (useWakeLock no CrewApp); ao sair, a voz para
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

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

  const eta = new Date(Date.now() + nav.durationRemaining * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  // Reserva se a nossa navegação falhar: o Waze leva ao destino pelo caminho dele
  const wazeLink = wazeUrl(destination.location);
  const StepIcon = step ? maneuverIcon(step) : null;

  return (
    <div ref={screenRef} className={styles.screen} data-theme={theme}>
      <div ref={containerRef} className={styles.map} />
      {createPortal(
        destination.kind === 'hospital' ? <HospitalMarker /> : <CallMarker priority={priority} />,
        destinationEl
      )}

      {/* Instrução e, logo abaixo, avisos (empilhados: a instrução pode ter duas linhas) */}
      <div className={styles.top}>
        <header className={`${styles.banner} ${rerouting ? styles.bannerWarning : ''}`} aria-live="polite">
          {rerouting ? (
            <p className={styles.bannerText}>Recalculando rota…</p>
          ) : nav.arrived ? (
            <>
              <span className={styles.icon}><ArrivalIcon /></span>
              <p className={styles.bannerText}>{arrivalText}</p>
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

        {destinationNotice && <p className={`${styles.notice} ${styles.noticeStrong}`} role="status">{destinationNotice}</p>}

        {!simulate && real.error ? (
          <p className={styles.notice}>{real.error}</p>
        ) : !fix ? (
          <p className={styles.notice}>Obtendo sua localização…</p>
        ) : alerts.alert ? (
          <div
            className={styles.incidentAlert}
            style={effectVars(alerts.alert.incident.effect)}
            role="status"
          >
            <span className={styles.incidentAlertIcon}><IncidentIcon type={alerts.alert.incident.type} /></span>
            <p>
              <strong>
                {incidentTypeLabel(alerts.alert.incident.type)}
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

      {/* Placa do limite da via e velocímetro, como no Waze (só informa: em atendimento a viatura pode passar do limite) */}
      {!nav.arrived && (speedLimit !== null || speedKmh !== null) && (
        <div className={styles.speed}>
          {speedLimit !== null && (
            <span className={styles.speedLimit} role="img" aria-label={`Limite da via: ${speedLimit} km/h`}>{speedLimit}</span>
          )}
          {speedKmh !== null && (
            <span
              className={`${styles.speedometer} ${overLimit(speedKmh, speedLimit) ? styles.speeding : ''}`}
              role="img"
              aria-label={`Velocidade: ${speedKmh} km/h`}
            >
              <strong>{speedKmh}</strong>
              <small>km/h</small>
            </span>
          )}
        </div>
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

      <footer ref={panelRef} className={`${styles.panel} ${collapsed ? styles.collapsed : ''}`}>
        {!nav.arrived && <PanelHandle collapsed={collapsed} onChange={setPanelCollapsed} label="painel da navegação" />}
        {/* Para onde vai: o motorista confere o endereço e a referência na chegada, sem sair da navegação */}
        <p className={styles.destination} style={riskVars(priority)}>
          {destination.kind === 'hospital' ? <HospitalIcon /> : <LocationIcon />}
          <span>
            {destination.label}
            {destination.kind === 'chamado' && reference && <small> · {reference}</small>}
          </span>
        </p>
        {nav.arrived ? (
          <button className={styles.finish} onClick={onExit}>
            Sair da navegação
          </button>
        ) : (
          <div className={styles.summary}>
            <strong>{eta}</strong>
            <span>{Math.max(1, Math.round(nav.durationRemaining / 60))} min · {formatNavDistance(nav.distanceRemaining)}</span>
          </div>
        )}

        {!collapsed && <div className={styles.actions}>
          <button
            className={styles.iconButton}
            onClick={toggleVoice}
            aria-label={voiceOn ? 'Silenciar instruções de voz' : 'Ativar instruções de voz'}
          >
            {voiceOn ? <VolumeOnIcon /> : <VolumeOffIcon />}
          </button>
          <a className={styles.mapsButton} href={wazeLink} target="_blank" rel="noopener noreferrer">
            Waze
          </a>
          {simulate && (
            <button className={styles.iconButton} onClick={sim.deviate} title="Simular saída da rota" aria-label="Simular saída da rota"><DetourIcon /></button>
          )}
          <button className={styles.exitButton} onClick={onExit}>Sair</button>
        </div>}
      </footer>
    </div>
  );
}
