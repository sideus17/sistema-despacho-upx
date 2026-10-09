import type { CSSProperties } from 'react';
import { AmbulanceStatus, CallPriority, RiskLevel, WeatherEventType } from '../types';
import { PRIORITY_META } from '../utils/calls';
import { AmbulanceMarkerIcon, EmergencyIcon, HospitalIcon } from '../ui/icons';
import { WeatherEventIcon } from '../ui/WeatherEventIcon';
import styles from './Markers.module.css';

const AMBULANCE_COLOR: Record<AmbulanceStatus, string> = {
  [AmbulanceStatus.DISPONIVEL]: '#22c55e',
  [AmbulanceStatus.EM_ATENDIMENTO]: '#f59e0b',
  [AmbulanceStatus.INDISPONIVEL]: '#ef4444'
};

// Cinza: viatura sem motorista em turno (fora de serviço)
const OFF_DUTY_COLOR = '#9ca3af';

export const RISK_COLOR: Record<RiskLevel, string> = {
  [RiskLevel.CRITICO]: '#dc2626',
  [RiskLevel.ALTO]: '#f59e0b',
  [RiskLevel.MEDIO]: '#eab308',
  [RiskLevel.BAIXO]: '#3b82f6'
};

export function AmbulanceMarker({ status, hasDriver = true }: { status: AmbulanceStatus; hasDriver?: boolean }) {
  const color = hasDriver ? AMBULANCE_COLOR[status] ?? OFF_DUTY_COLOR : OFF_DUTY_COLOR;
  return (
    <div className={styles.ambulance} style={{ background: color }}>
      <AmbulanceMarkerIcon />
    </div>
  );
}

interface CallMarkerProps {
  priority: CallPriority;
  selected?: boolean;
  pulsing?: boolean;
}

export function CallMarker({ priority, selected = false, pulsing = false }: CallMarkerProps) {
  const color = PRIORITY_META[priority]?.color ?? '#dc2626';
  return (
    <div
      className={`${styles.call} ${selected ? styles.callSelected : ''}`}
      style={{ '--marker-color': color } as CSSProperties}
    >
      {pulsing && <span className={styles.pulse} />}
      <svg className={styles.callPin} viewBox="0 0 36 46" aria-hidden="true">
        <path
          d="M18 1.5C8.9 1.5 1.5 8.7 1.5 17.6 1.5 29.3 18 44.5 18 44.5s16.5-15.2 16.5-26.9C34.5 8.7 27.1 1.5 18 1.5z"
          fill={color}
          stroke="white"
          strokeWidth="2.5"
        />
      </svg>
      <span className={styles.callIcon}>
        <EmergencyIcon />
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

export function WeatherMarker({ type, riskLevel }: { type: WeatherEventType; riskLevel: RiskLevel }) {
  return (
    <div className={styles.weather} style={{ background: RISK_COLOR[riskLevel] ?? RISK_COLOR[RiskLevel.BAIXO] }}>
      <WeatherEventIcon type={type} />
    </div>
  );
}
