import { AmbulanceStatus, CallPriority, Hospital, IncidentEffect, IncidentType } from '../types';
import { PRIORITY_META } from '../utils/calls';
import { AmbulanceMarkerIcon, HospitalIcon } from '../ui/icons';
import { IncidentIcon } from '../ui/IncidentIcon';
import { effectVars } from './incidents';
import styles from './Markers.module.css';

// Viatura pela forma, não pela cor (a cor forte fica para a classificação dos chamados): livre com
// contorno, em atendimento preenchida, indisponível tracejada e sem motorista apagada
const AMBULANCE_CLASS: Record<AmbulanceStatus, string> = {
  [AmbulanceStatus.DISPONIVEL]: styles.ambulanceFree,
  [AmbulanceStatus.EM_ATENDIMENTO]: styles.ambulanceBusy,
  [AmbulanceStatus.INDISPONIVEL]: styles.ambulanceUnavailable
};

export function AmbulanceMarker({ status, hasDriver = true }: { status: AmbulanceStatus; hasDriver?: boolean }) {
  const shape = hasDriver ? AMBULANCE_CLASS[status] ?? styles.ambulanceOff : styles.ambulanceOff;
  return (
    <div className={`${styles.ambulance} ${shape}`}>
      <AmbulanceMarkerIcon />
    </div>
  );
}

interface CallMarkerProps {
  priority: CallPriority;
  selected?: boolean;
  pulsing?: boolean;
  provisional?: boolean; // cor sugerida no registro, ainda sem regulação: pino vazado
}

export function CallMarker({ priority, selected = false, pulsing = false, provisional = false }: CallMarkerProps) {
  const meta = PRIORITY_META[priority] ?? PRIORITY_META[CallPriority.EMERGENCIA];
  // O pino vazado é branco: o contorno usa a cor de borda, que tem contraste sobre o branco
  const stroke = provisional ? meta.edge.day : 'white';
  // O ícone da cor no pino: quem não distingue as cores ainda diferencia os chamados
  const Icon = meta.icon;
  return (
    <div className={`${styles.call} ${selected ? styles.callSelected : ''}`}>
      {pulsing && <span className={styles.pulse} style={{ background: meta.color }} />}
      <svg className={styles.callPin} viewBox="0 0 36 46" aria-hidden="true">
        <path
          d="M18 1.5C8.9 1.5 1.5 8.7 1.5 17.6 1.5 29.3 18 44.5 18 44.5s16.5-15.2 16.5-26.9C34.5 8.7 27.1 1.5 18 1.5z"
          fill={provisional ? 'white' : meta.color}
          stroke={stroke}
          strokeWidth={provisional ? 3 : 2.5}
        />
      </svg>
      <span className={styles.callIcon} style={{ color: provisional ? meta.edge.day : meta.onColor }}>
        <Icon />
      </span>
    </div>
  );
}

export function BaseMarker() {
  return (
    <div className={styles.base}>
      <HospitalIcon />
    </div>
  );
}

// Hospital: "H" no quadrado, como a placa (a base usa o prédio com a cruz)
export function HospitalMarker({ kind }: { kind?: Hospital['kind'] }) {
  return (
    <div className={`${styles.hospital} ${kind === 'PRONTO_SOCORRO' ? styles.hospitalSmall : ''}`} aria-hidden="true">
      H
    </div>
  );
}

export function IncidentMarker({ type, effect }: { type: IncidentType; effect: IncidentEffect }) {
  return (
    <div
      className={`${styles.incident} ${effect === IncidentEffect.BLOQUEIO ? styles.incidentBlock : ''}`}
      style={effectVars(effect)}
    >
      <IncidentIcon type={type} />
    </div>
  );
}
