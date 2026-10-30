import { useEffect, useMemo, useRef, useState } from 'react';
import { Map as MapGL, Marker, Popup, MapRef } from '@vis.gl/react-maplibre';
import '../map/maplibre';
import {
  Ambulance,
  EmergencyCall,
  Base,
  Hospital,
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
import { MAP_LOCALE } from '../map/locale';
import { DATA_ATTRIBUTION } from '../map/attribution';
import { MAP_BACKGROUND, ROUTE_COLORS } from '../map/mapStyle';
import { useTheme } from '../theme/theme';
import { RouteLayer } from '../map/RouteLayer';
import { boundsOf, toLngLat } from '../map/geojson';
import { AmbulanceMarker, BaseMarker, CallMarker, HospitalMarker, IncidentMarker } from '../map/Markers';
import { IncidentLayer } from '../map/IncidentLayer';
import { TrafficLayer } from '../map/TrafficLayer';
import { TRAFFIC_COLORS } from '../map/traffic';
import { EFFECT_META, effectVars, expiryLabel, incidentTypeLabel, sourceLabel } from '../map/incidents';
import { CALL_STATUS_LABEL, PRIORITIES_BY_SEVERITY, PRIORITY_META, STAGE_META, callStage, elapsedLabel, timeline } from '../utils/calls';
import { AMBULANCE_STATUS_LABEL, AMBULANCE_TYPE_LABEL, staleLocationText } from '../utils/ambulances';
import { HOSPITAL_KIND_LABEL } from '../utils/hospitals';
import { signalsText } from '../utils/triage';
import { PriorityLabel } from '../ui/PriorityLabel';
import { formatPhone } from '../utils/documents';
import { getTimeAgo, withAuthRequest } from '../services/api';
import { ExpandLessIcon, ExpandMoreIcon, LocationIcon, PinDropIcon } from '../ui/icons';
import { Avatar } from '../ui/Avatar';
import { MapControls } from './MapControls';
import styles from './Map.module.css';

// Sorocaba
const INITIAL_VIEW = { longitude: -47.4526, latitude: -23.5015, zoom: 13 };

type Selection = { kind: 'ambulance' | 'call' | 'base' | 'hospital' | 'incident'; id: string } | null;

interface MapProps {
  ambulances: Ambulance[];
  calls: EmergencyCall[];
  bases: Base[];
  hospitals?: Hospital[];
  incidents: Incident[];
  selectedCall?: EmergencyCall | null;
  routeGeometry?: Coordinates[] | null;
  onCallSelect?: (call: EmergencyCall) => void;
  // Pedido para mostrar uma ocorrência ou uma viatura (a cada pedido muda o `at`)
  focusIncident?: { id: string; at: number } | null;
  focusAmbulance?: { id: string; at: number } | null;
  // "Escolher no mapa" do formulário de chamado: o próximo clique vira o local
  callPick?: { onPick: (location: Coordinates) => void; onCancel: () => void } | null;
  // Local do chamado sendo aberto (pino de prévia)
  callDraft?: Coordinates | null;
}

// Ícones das ocorrências na central (alagamento, buraco, acidente…): ligados por padrão, a escolha fica no
// aparelho. O congestionamento não ganha ícone: a cor do trânsito já mostra onde está parado
const INCIDENT_ICONS_KEY = 'samu:icones-ocorrencias';

function readIncidentIcons(): boolean {
  try {
    return localStorage.getItem(INCIDENT_ICONS_KEY) !== '0';
  } catch {
    return true;
  }
}

export default function Map({
  ambulances,
  calls,
  bases,
  hospitals = [],
  incidents,
  selectedCall,
  routeGeometry,
  onCallSelect,
  focusIncident,
  focusAmbulance,
  callPick,
  callDraft
}: MapProps) {
  const mapRef = useRef<MapRef>(null);
  const fitted = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [popup, setPopup] = useState<Selection>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [incidentIcons, setIncidentIcons] = useState(readIncidentIcons);
  const toggleIncidentIcons = () => {
    setIncidentIcons(value => {
      try {
        localStorage.setItem(INCIDENT_ICONS_KEY, value ? '0' : '1');
      } catch {
        // Sem armazenamento: vale até fechar a página
      }
      return !value;
    });
  };
  const { theme } = useTheme();
  const mapStyle = useMapStyle(theme);

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

  // Esc desiste de escolher no mapa o local do chamado
  useEffect(() => {
    if (!callPick) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') callPick.onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [callPick]);

  // Local do chamado escolhido: o mapa vai até ele se estiver fora da tela ou longe demais
  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map || !callDraft) return;
    if (map.getZoom() >= 15 && map.getBounds().contains(toLngLat(callDraft))) return;
    map.flyTo({ center: toLngLat(callDraft), zoom: Math.max(map.getZoom(), 16), duration: 600 });
  }, [loaded, callDraft?.lat, callDraft?.lng]);

  // Ocorrência pedida pela lista: centraliza e abre o popup
  useEffect(() => {
    const map = mapRef.current;
    const incident = incidents.find(i => i.id === focusIncident?.id);
    if (!loaded || !map || !incident) return;
    map.flyTo({ center: toLngLat(incident.location), zoom: Math.max(map.getZoom(), 15), duration: 600 });
    setPopup({ kind: 'incident', id: incident.id });
  }, [loaded, focusIncident]);

  // Viatura pedida pela Frota: centraliza e abre o popup
  useEffect(() => {
    const map = mapRef.current;
    const ambulance = ambulances.find(a => a.id === focusAmbulance?.id);
    if (!loaded || !map || !ambulance) return;
    map.flyTo({ center: toLngLat(ambulance.location), zoom: Math.max(map.getZoom(), 15), duration: 600 });
    setPopup({ kind: 'ambulance', id: ambulance.id });
  }, [loaded, focusAmbulance]);

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
            <p><strong>Tipo:</strong> {AMBULANCE_TYPE_LABEL[ambulance.type] ?? ambulance.type}</p>
            <p>
              <strong>Status:</strong>{' '}
              {AMBULANCE_STATUS_LABEL[ambulance.status] ?? ambulance.status}
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
            {staleLocationText(ambulance, Date.now()) && <p className={styles.popupWarning}>{staleLocationText(ambulance, Date.now())}</p>}
            <p><strong>Médico:</strong> {ambulance.crew.medic}</p>
            {ambulance.crew.nurse && <p><strong>Enfermeiro:</strong> {ambulance.crew.nurse}</p>}
          </>
        )
      };
    }

    if (popup.kind === 'call') {
      const call = calls.find(c => c.id === popup.id);
      if (!call) return null;
      const stage = callStage(call);
      const steps = timeline(call);
      const destination = hospitals.find(hospital => hospital.id === call.hospitalId);
      return {
        location: call.location,
        offset: 48,
        content: (
          <>
            <h3>Chamado</h3>
            <p><PriorityLabel priority={call.priority} /></p>
            {!stage && <p><strong>Situação:</strong> {CALL_STATUS_LABEL[call.status]}</p>}
            <p><strong>Endereço:</strong> {call.address}</p>
            {call.reference && <p><strong>Referência:</strong> {call.reference}</p>}
            {call.callerPhone && <p><strong>Telefone:</strong> {formatPhone(call.callerPhone)}</p>}
            <p><strong>Descrição:</strong> {call.description}</p>
            {call.triage?.signals.length ? <p><strong>Sinais:</strong> {signalsText(call.triage.signals)}</p> : null}
            {call.patientInfo.age && <p><strong>Idade:</strong> {call.patientInfo.age} anos</p>}
            {stage && <p><strong>Etapa:</strong> {STAGE_META[stage.stage].label} · {elapsedLabel(stage.since, Date.now())}</p>}
            {destination && <p><strong>Hospital:</strong> {destination.shortName}</p>}
            {steps.length > 0 && <p className={styles.popupTimeline}>{steps.map(step => `${step.label} ${step.time}`).join(' · ')}</p>}
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

    if (popup.kind === 'hospital') {
      const hospital = hospitals.find(h => h.id === popup.id);
      if (!hospital) return null;
      return {
        location: hospital.location,
        offset: 18,
        content: (
          <>
            <h3>{hospital.name}</h3>
            <p><strong>{HOSPITAL_KIND_LABEL[hospital.kind]}</strong></p>
            <p>{hospital.address}</p>
            {hospital.notes && <p>{hospital.notes}</p>}
          </>
        )
      };
    }

    const incident = incidents.find(i => i.id === popup.id);
    if (!incident) return null;
    const effect = EFFECT_META[incident.effect];
    // O TomTom informa um trecho de rua e se atualiza sozinho: "confirmada" não diz nada
    const tomtom = incident.source === IncidentSource.TOMTOM;
    const confirmed = !tomtom && incident.lastConfirmedAt && incident.lastConfirmedAt !== incident.createdAt;
    return {
      location: incident.location,
      offset: 18,
      content: (
        <>
          <h3>{incidentTypeLabel(incident.type)}</h3>
          <p>
            <span className={styles.effectPill} style={effectVars(incident.effect)}>{effect.label}</span> {effect.hint}
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
        </>
      )
    };
  };

  const activePopup = renderPopup();
  const hasRoute = !!routeGeometry && routeGeometry.length > 1;

  return (
    <div className={styles.wrapper}>
      {mapStyle ? (
        <MapGL
          ref={mapRef}
          locale={MAP_LOCALE}
          initialViewState={INITIAL_VIEW}
          mapStyle={mapStyle}
          style={{ width: '100%', height: '100%' }}
          // Mapa da central sempre com o norte para cima
          dragRotate={false}
          pitchWithRotate={false}
          touchPitch={false}
          attributionControl={{ compact: true, customAttribution: DATA_ATTRIBUTION }}
          transformRequest={withAuthRequest}
          cursor={callPick ? 'crosshair' : undefined}
          onClick={event => callPick?.onPick({ lat: event.lngLat.lat, lng: event.lngLat.lng })}
          onLoad={event => {
            event.target.touchZoomRotate.disableRotation();
            // Créditos recolhidos no "i" (um toque abre), como no app da equipe
            event.target.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
            setLoaded(true);
          }}
        >
          <MapControls />
          <TrafficLayer theme={theme} />

          <IncidentLayer
            incidents={incidents}
            onSelect={(incident, event) => open('incident', incident.id)(event)}
            showMarker={incident => incidentIcons && incident.type !== IncidentType.CONGESTIONAMENTO}
          />

          {routeGeometry && routeGeometry.length > 1 && <RouteLayer line={routeGeometry} theme={theme} />}

          {callDraft && (
            <Marker longitude={callDraft.lng} latitude={callDraft.lat} anchor="bottom" style={{ zIndex: 3 }}>
              <span className={styles.draftPin} title="Local do chamado"><LocationIcon /></span>
            </Marker>
          )}

          {hospitals.map(hospital => (
            <Marker key={hospital.id} longitude={hospital.location.lng} latitude={hospital.location.lat} onClick={open('hospital', hospital.id)}>
              <HospitalMarker kind={hospital.kind} />
            </Marker>
          ))}

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
                <AmbulanceMarker status={ambulance.status} hasDriver={!!ambulance.driver} stale={!!staleLocationText(ambulance, Date.now())} />
              </Marker>
            );
          })}

          {calls.map(call => {
            const selected = selectedCall?.id === call.id;
            const waiting = call.status === CallStatus.AGUARDANDO_REGULACAO || call.status === CallStatus.PENDENTE;
            return (
              <Marker
                key={call.id}
                longitude={call.location.lng}
                latitude={call.location.lat}
                anchor="bottom"
                style={{ zIndex: selected ? 2 : 1 }}
                onClick={event => {
                  open('call', call.id)(event);
                  // Chamados nas filas abrem a regulação ou a análise; os demais mostram apenas o popup
                  if (waiting) onCallSelect?.(call);
                }}
              >
                <CallMarker
                  priority={call.priority}
                  selected={selected}
                  pulsing={waiting}
                  provisional={call.status === CallStatus.AGUARDANDO_REGULACAO}
                />
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

      {callPick && (
        <div className={`${styles.pickHint} ${styles.pickHintAction}`} role="status">
          <PinDropIcon /> Clique no mapa para marcar o local do chamado
          <button type="button" onClick={callPick.onCancel}>Cancelar</button>
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
        <button type="button" role="switch" aria-checked={incidentIcons} className={styles.iconsSwitch} onClick={toggleIncidentIcons}>
          Ícones de ocorrência <span className={styles.switchTrack} aria-hidden="true"><span /></span>
        </button>
        {legendOpen && (
          <ul className={styles.legendItems}>
            <li><span className={styles.legendIcon}><AmbulanceMarker status={AmbulanceStatus.DISPONIVEL} /></span> Viatura disponível</li>
            <li><span className={styles.legendIcon}><AmbulanceMarker status={AmbulanceStatus.EM_ATENDIMENTO} /></span> Em atendimento</li>
            <li><span className={styles.legendIcon}><AmbulanceMarker status={AmbulanceStatus.INDISPONIVEL} /></span> Indisponível</li>
            <li><span className={styles.legendIcon}><AmbulanceMarker status={AmbulanceStatus.DISPONIVEL} hasDriver={false} /></span> Sem motorista</li>
            <li><span className={styles.legendIcon}><AmbulanceMarker status={AmbulanceStatus.DISPONIVEL} stale /></span> GPS sem atualizar</li>
            <li>
              <span className={`${styles.legendIcon} ${styles.legendPin}`}><CallMarker priority={CallPriority.EMERGENCIA} /></span> Chamado
              <span className={styles.legendRisk} aria-label="cores: vermelho, amarelo, verde e azul">
                {PRIORITIES_BY_SEVERITY.map(priority => <i key={priority} style={{ background: PRIORITY_META[priority].color }} title={PRIORITY_META[priority].name} />)}
              </span>
            </li>
            <li><span className={`${styles.legendIcon} ${styles.legendPin}`}><CallMarker priority={CallPriority.URGENTE} provisional /></span> Cor sugerida, falta regular</li>
            <li><span className={`${styles.legendIcon} ${styles.legendPin}`}><CallMarker priority={CallPriority.URGENTE} pulsing /></span> Esperando a viatura (pulsa)</li>
            <li><span className={styles.legendIcon}><BaseMarker /></span> Base</li>
            {hospitals.length > 0 && <li><span className={styles.legendIcon}><HospitalMarker /></span> Hospital</li>}
            <li><span className={styles.legendIcon}><IncidentMarker type={IncidentType.VIA_BLOQUEADA} effect={IncidentEffect.BLOQUEIO} /></span> Bloqueio (rota desvia)</li>
            <li><span className={styles.legendIcon}><IncidentMarker type={IncidentType.ALAGAMENTO} effect={IncidentEffect.RISCO} /></span> Atenção na via</li>
            <li><span className={styles.legendIcon}><IncidentMarker type={IncidentType.OBRAS} effect={IncidentEffect.AVISO} /></span> Aviso (só informa)</li>
            <li>
              <span className={styles.legendIcon}>
                <span className={styles.legendTraffic}>
                  {(['slow', 'heavy', 'stopped'] as const).map(level => <i key={level} style={{ background: TRAFFIC_COLORS[theme][level] }} />)}
                </span>
              </span>
              Trânsito: lento a parado
            </li>
            {hasRoute && <li><span className={styles.legendIcon}><span className={styles.legendRoute} style={{ background: ROUTE_COLORS[theme].line, boxShadow: `0 0 0 2px ${ROUTE_COLORS[theme].casing}` }} /></span> Rota selecionada</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
