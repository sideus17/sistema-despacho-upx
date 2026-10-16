import { useEffect, useMemo, useRef, useState } from 'react';
import { Map as MapGL, Marker, Popup, MapRef } from '@vis.gl/react-maplibre';
import '../map/maplibre';
import {
  Ambulance,
  EmergencyCall,
  Base,
  Incident,
  AmbulanceStatus,
  CallPriority,
  CallStatus,
  IncidentEffect,
  IncidentSource,
  IncidentType,
  Coordinates
} from '../types';
import { useMapStyle } from '../map/useMapStyle';
import { DATA_ATTRIBUTION } from '../map/attribution';
import { ALT_ROUTE_COLORS, MAP_BACKGROUND, ROUTE_COLORS } from '../map/mapStyle';
import { useTheme } from '../theme/theme';
import { RouteLayer } from '../map/RouteLayer';
import { ROUTE_OPTIONS_LAYER, RouteOptionsLayer } from '../map/RouteOptionsLayer';
import { boundsOf, toLngLat } from '../map/geojson';
import { AmbulanceMarker, BaseMarker, CallMarker, IncidentMarker } from '../map/Markers';
import { IncidentLayer } from '../map/IncidentLayer';
import { EFFECT_META, expiryLabel, incidentTypeLabel, sourceLabel } from '../map/incidents';
import { PRIORITY_META } from '../utils/calls';
import { getTimeAgo, reversePlace } from '../services/api';
import { ExpandLessIcon, ExpandMoreIcon, LocationIcon, PinDropIcon } from '../ui/icons';
import { Avatar } from '../ui/Avatar';
import { MapControls } from './MapControls';
import RoutePlanner, { PlannerField } from './RoutePlanner';
import { useRoutePlanner } from './useRoutePlanner';
import type { PlaceValue } from './AddressSearch';
import styles from './Map.module.css';

// Sorocaba
const INITIAL_VIEW = { longitude: -47.4526, latitude: -23.5015, zoom: 13 };

type Selection = { kind: 'ambulance' | 'call' | 'base' | 'incident'; id: string } | null;

interface MapProps {
  ambulances: Ambulance[];
  calls: EmergencyCall[];
  bases: Base[];
  incidents: Incident[];
  selectedCall?: EmergencyCall | null;
  routeGeometry?: Coordinates[] | null;
  onCallSelect?: (call: EmergencyCall) => void;
  // Pedido para mostrar uma ocorrência (a cada pedido muda o `at`)
  focusIncident?: { id: string; at: number } | null;
}

export default function Map({
  ambulances,
  calls,
  bases,
  incidents,
  selectedCall,
  routeGeometry,
  onCallSelect,
  focusIncident
}: MapProps) {
  const mapRef = useRef<MapRef>(null);
  const fitted = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [popup, setPopup] = useState<Selection>(null);
  const [legendOpen, setLegendOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  const { theme } = useTheme();
  const mapStyle = useMapStyle(theme);
  const planner = useRoutePlanner();
  // Campo do painel de rotas esperando um clique no mapa
  const [picking, setPicking] = useState<PlannerField | null>(null);
  const plannerRoutes = planner.open ? planner.routes : [];
  const plannerLines = useMemo(() => plannerRoutes.map(route => route.geometry), [plannerRoutes]);

  const allPoints = useMemo(() => [
    ...ambulances.map(amb => amb.location),
    ...calls.map(call => call.location),
    ...bases.map(base => base.location)
  ], [ambulances, calls, bases]);

  // Enquadra todos os pontos só na primeira carga, para não desfazer o zoom do usuário
  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map || fitted.current || allPoints.length === 0) return;
    map.fitBounds(boundsOf(allPoints), { padding: 50, maxZoom: 15, duration: 0 });
    fitted.current = true;
  }, [loaded, allPoints]);

  // Leva o mapa até a rota selecionada ou, sem rota, até o chamado em foco
  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    if (routeGeometry && routeGeometry.length > 1) {
      map.fitBounds(boundsOf(routeGeometry), { padding: 60, duration: 600 });
    } else if (selectedCall) {
      map.flyTo({ center: toLngLat(selectedCall.location), zoom: Math.max(map.getZoom(), 15), duration: 600 });
    }
  }, [loaded, selectedCall?.id, routeGeometry]);

  // Rotas novas do painel: enquadra todas, deixando espaço para o painel à esquerda
  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map || plannerLines.length === 0) return;
    const wide = window.matchMedia('(min-width: 769px)').matches;
    const padding = wide ? { top: 60, bottom: 60, left: 440, right: 80 } : { top: 200, bottom: 40, left: 30, right: 60 };
    map.fitBounds(boundsOf(plannerLines.flat()), { padding, duration: 600 });
  }, [loaded, plannerLines]);

  // Esc desiste de escolher o ponto no mapa
  useEffect(() => {
    if (!picking) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setPicking(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [picking]);

  // Ponto clicado vira partida ou destino; o nome da rua chega logo depois
  const pickPoint = async (field: PlannerField, location: Coordinates) => {
    const set = field === 'from' ? planner.setFrom : planner.setTo;
    const point: PlaceValue = { label: 'Ponto no mapa', location, kind: 'mapa' };
    set(point);
    setPicking(null);
    try {
      const place = await reversePlace(location);
      if (place) set(current => (current?.location === location ? { ...point, label: place.label, detail: place.detail } : current));
    } catch {
      // Sem nome: fica "Ponto no mapa"
    }
  };

  // Ocorrência pedida pela lista: centraliza e abre o popup
  useEffect(() => {
    const map = mapRef.current;
    const incident = incidents.find(i => i.id === focusIncident?.id);
    if (!loaded || !map || !incident) return;
    map.flyTo({ center: toLngLat(incident.location), zoom: Math.max(map.getZoom(), 15), duration: 600 });
    setPopup({ kind: 'incident', id: incident.id });
  }, [loaded, focusIncident]);

  const open = (kind: NonNullable<Selection>['kind'], id: string) => (event: { originalEvent: MouseEvent }) => {
    // Sem isso o clique chega ao mapa e fecha o popup na hora
    event.originalEvent.stopPropagation();
    setPopup({ kind, id });
  };

  const renderPopup = () => {
    if (!popup) return null;

    if (popup.kind === 'ambulance') {
      const ambulance = ambulances.find(a => a.id === popup.id);
      if (!ambulance) return null;
      return {
        location: ambulance.location,
        offset: 20,
        content: (
          <>
            <h3>{ambulance.code}</h3>
            <p><strong>Tipo:</strong> {ambulance.type}</p>
            <p>
              <strong>Status:</strong>{' '}
              <span style={{
                color: ambulance.status === AmbulanceStatus.DISPONIVEL ? '#22c55e' :
                       ambulance.status === AmbulanceStatus.EM_ATENDIMENTO ? '#f59e0b' : '#ef4444'
              }}>
                {ambulance.status}
              </span>
            </p>
            <p className={styles.popupDriver}>
              <strong>Motorista:</strong>
              {ambulance.driver ? (
                <>
                  <Avatar
                    name={ambulance.driver.name}
                    seed={ambulance.driver.id}
                    icon={ambulance.driver.avatar}
                    color={ambulance.driver.avatarColor}
                    size={20}
                  />
                  {ambulance.driver.name}
                </>
              ) : 'sem motorista em turno'}
            </p>
            <p><strong>Médico:</strong> {ambulance.crew.medic}</p>
            {ambulance.crew.nurse && <p><strong>Enfermeiro:</strong> {ambulance.crew.nurse}</p>}
          </>
        )
      };
    }

    if (popup.kind === 'call') {
      const call = calls.find(c => c.id === popup.id);
      if (!call) return null;
      return {
        location: call.location,
        offset: 48,
        content: (
          <>
            <h3>Chamado de Emergência</h3>
            <p>
              <strong>Prioridade:</strong>{' '}
              <span style={{ color: PRIORITY_META[call.priority]?.color, fontWeight: 'bold' }}>{call.priority}</span>
            </p>
            <p><strong>Endereço:</strong> {call.address}</p>
            <p><strong>Descrição:</strong> {call.description}</p>
            <p><strong>Sintomas:</strong> {call.patientInfo.symptoms}</p>
            {call.patientInfo.age && <p><strong>Idade:</strong> {call.patientInfo.age} anos</p>}
          </>
        )
      };
    }

    if (popup.kind === 'base') {
      const base = bases.find(b => b.id === popup.id);
      if (!base) return null;
      return {
        location: base.location,
        offset: 20,
        content: (
          <>
            <h3>{base.name}</h3>
            <p><strong>Endereço:</strong> {base.address}</p>
            <p><strong>Capacidade:</strong> {base.capacity} ambulâncias</p>
          </>
        )
      };
    }

    const incident = incidents.find(i => i.id === popup.id);
    if (!incident) return null;
    const effect = EFFECT_META[incident.effect];
    // O TomTom informa um trecho de rua e se atualiza sozinho: raio interno e "confirmada" não dizem nada
    const tomtom = incident.source === IncidentSource.TOMTOM;
    const confirmed = !tomtom && incident.lastConfirmedAt && incident.lastConfirmedAt !== incident.createdAt;
    return {
      location: incident.location,
      offset: 18,
      content: (
        <>
          <h3>{incidentTypeLabel(incident.type)}</h3>
          <p>
            <span className={styles.effectPill} style={{ background: effect.color }}>{effect.label}</span> {effect.hint}
          </p>
          <p><strong>Fonte:</strong> {sourceLabel(incident)} · {getTimeAgo(incident.createdAt)}</p>
          <p className={styles.capitalize}>{expiryLabel(incident)}</p>
          {confirmed && <p><strong>Confirmada:</strong> {getTimeAgo(incident.lastConfirmedAt!)}</p>}
          {incident.votes.no > 0 && (
            <p className={styles.popupWarning}>
              {incident.votes.no === 1 ? '1 equipe disse' : `${incident.votes.no} equipes disseram`} que não está mais lá
            </p>
          )}
          {incident.description && <p>{incident.description}</p>}
          {incident.radius > 0 && !tomtom && <p><strong>Raio:</strong> {incident.radius} m</p>}
        </>
      )
    };
  };

  const activePopup = renderPopup();
  // Com rotas no painel, elas tomam o lugar da rota da análise de despacho
  const showPlanner = plannerLines.length > 0;
  const hasRoute = showPlanner || (!!routeGeometry && routeGeometry.length > 1);

  return (
    <div className={styles.wrapper}>
      {mapStyle ? (
        <MapGL
          ref={mapRef}
          initialViewState={INITIAL_VIEW}
          mapStyle={mapStyle}
          style={{ width: '100%', height: '100%' }}
          // Mapa da central sempre com o norte para cima
          dragRotate={false}
          pitchWithRotate={false}
          touchPitch={false}
          attributionControl={{ compact: true, customAttribution: DATA_ATTRIBUTION }}
          cursor={picking ? 'crosshair' : undefined}
          interactiveLayerIds={showPlanner ? [ROUTE_OPTIONS_LAYER] : undefined}
          onClick={event => {
            if (picking) {
              pickPoint(picking, { lat: event.lngLat.lat, lng: event.lngLat.lng });
              return;
            }
            // Clique numa rota cinza: ela passa a ser a escolhida
            const index = event.features?.[0]?.properties?.index;
            if (typeof index === 'number') planner.setSelected(index);
          }}
          onLoad={event => {
            event.target.touchZoomRotate.disableRotation();
            // No celular os créditos abertos cobrem o zoom: começam recolhidos no "i" (um toque abre)
            if (window.matchMedia('(max-width: 768px)').matches) {
              event.target.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
            }
            setLoaded(true);
          }}
        >
          <MapControls />

          <IncidentLayer incidents={incidents} onSelect={(incident, event) => open('incident', incident.id)(event)} />

          {showPlanner ? (
            <RouteOptionsLayer routes={plannerLines} selected={planner.selected} theme={theme} />
          ) : (
            routeGeometry && routeGeometry.length > 1 && <RouteLayer line={routeGeometry} theme={theme} />
          )}

          {planner.open && planner.from && (
            <Marker longitude={planner.from.location.lng} latitude={planner.from.location.lat}>
              <span className={styles.plannerOrigin} title={`Partida: ${planner.from.label}`} />
            </Marker>
          )}
          {planner.open && planner.to && (
            <Marker longitude={planner.to.location.lng} latitude={planner.to.location.lat} anchor="bottom">
              <span className={styles.plannerDestination} title={`Destino: ${planner.to.label}`}><LocationIcon /></span>
            </Marker>
          )}

          {bases.map(base => (
            <Marker key={base.id} longitude={base.location.lng} latitude={base.location.lat} onClick={open('base', base.id)}>
              <BaseMarker />
            </Marker>
          ))}

          {ambulances.map((ambulance, index) => {
            // Deslocamento minúsculo (~15 metros) para evitar que ícones fiquem 100% sobrepostos na base
            const offsetLat = (index % 2 === 0 ? 0.00015 : -0.00015) * Math.floor(index / 2 + 1);
            const offsetLng = (index % 3 === 0 ? 0.00015 : -0.00015) * Math.floor(index / 2 + 1);

            return (
              <Marker
                key={ambulance.id}
                longitude={ambulance.location.lng + offsetLng}
                latitude={ambulance.location.lat + offsetLat}
                onClick={open('ambulance', ambulance.id)}
              >
                <AmbulanceMarker status={ambulance.status} hasDriver={!!ambulance.driver} />
              </Marker>
            );
          })}

          {calls.map(call => {
            const selected = selectedCall?.id === call.id;
            return (
              <Marker
                key={call.id}
                longitude={call.location.lng}
                latitude={call.location.lat}
                anchor="bottom"
                style={{ zIndex: selected ? 2 : 1 }}
                onClick={event => {
                  open('call', call.id)(event);
                  // Só chamados pendentes abrem a análise; os demais mostram apenas o popup
                  if (call.status === CallStatus.PENDENTE) onCallSelect?.(call);
                }}
              >
                <CallMarker priority={call.priority} selected={selected} pulsing={call.status === CallStatus.PENDENTE} />
              </Marker>
            );
          })}

          {activePopup && (
            <Popup
              longitude={activePopup.location.lng}
              latitude={activePopup.location.lat}
              offset={activePopup.offset}
              maxWidth="300px"
              focusAfterOpen={false}
              onClose={() => setPopup(null)}
            >
              <div className={styles.popup}>{activePopup.content}</div>
            </Popup>
          )}
        </MapGL>
      ) : (
        <div className={styles.placeholder} style={{ background: MAP_BACKGROUND[theme] }} aria-label="Carregando mapa" />
      )}

      {mapStyle && (
        <RoutePlanner
          planner={planner}
          ambulances={ambulances}
          bases={bases}
          onPickOnMap={field => setPicking(field)}
        />
      )}

      {picking && (
        <div className={styles.pickHint} role="status">
          <PinDropIcon /> Clique no mapa para escolher {picking === 'from' ? 'a partida' : 'o destino'} (Esc cancela)
        </div>
      )}

      {/* Legend */}
      <div className={styles.legend}>
        <button
          className={styles.legendToggle}
          onClick={() => setLegendOpen(open => !open)}
          aria-expanded={legendOpen}
        >
          Legenda {legendOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </button>
        {legendOpen && (
          <ul className={styles.legendItems}>
            <li><span className={styles.legendIcon}><AmbulanceMarker status={AmbulanceStatus.DISPONIVEL} /></span> Viatura disponível</li>
            <li><span className={styles.legendIcon}><AmbulanceMarker status={AmbulanceStatus.EM_ATENDIMENTO} /></span> Em atendimento</li>
            <li><span className={styles.legendIcon}><AmbulanceMarker status={AmbulanceStatus.INDISPONIVEL} /></span> Indisponível</li>
            <li><span className={styles.legendIcon}><AmbulanceMarker status={AmbulanceStatus.DISPONIVEL} hasDriver={false} /></span> Sem motorista</li>
            <li><span className={`${styles.legendIcon} ${styles.legendPin}`}><CallMarker priority={CallPriority.EMERGENCIA} /></span> Chamado</li>
            <li><span className={styles.legendIcon}><BaseMarker /></span> Base</li>
            <li><span className={styles.legendIcon}><IncidentMarker type={IncidentType.VIA_BLOQUEADA} effect={IncidentEffect.BLOQUEIO} /></span> Bloqueio (rota desvia)</li>
            <li><span className={styles.legendIcon}><IncidentMarker type={IncidentType.ALAGAMENTO} effect={IncidentEffect.RISCO} /></span> Risco na via</li>
            {hasRoute && <li><span className={styles.legendIcon}><span className={styles.legendRoute} style={{ background: ROUTE_COLORS[theme].line, boxShadow: `0 0 0 2px ${ROUTE_COLORS[theme].casing}` }} /></span> Rota selecionada</li>}
            {plannerLines.length > 1 && <li><span className={styles.legendIcon}><span className={styles.legendRoute} style={{ background: ALT_ROUTE_COLORS[theme].line, boxShadow: `0 0 0 2px ${ALT_ROUTE_COLORS[theme].casing}` }} /></span> Rota alternativa</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
