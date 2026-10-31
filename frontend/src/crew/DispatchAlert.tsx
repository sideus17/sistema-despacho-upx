import { useEffect } from 'react';
import { Coordinates, EmergencyCall, RouteInfo } from '../types';
import { formatDistance, formatDuration } from '../services/api';
import { distance } from './navigation/geo';
import { PRIORITY_META, riskVars } from '../utils/calls';
import { signalsText } from '../utils/triage';
import { playAlert } from '../utils/alertSound';
import { styles } from './DispatchAlert.styles';

// Intervalo do toque: o alarme repete até a equipe tocar em "Ciente"
export const ALARM_INTERVAL_MS = 2500;
const VIBRATION = [400, 200, 400, 200, 400];

interface DispatchAlertProps {
  call: EmergencyCall;
  onAck: () => void;
  // Rota da prévia (calculada enquanto o alarme toca) e a posição da viatura, para a distância até o local
  route?: RouteInfo | null;
  from?: Coordinates;
  // Com a rota pronta, o principal já abre a navegação ("Ciente e navegar") e o "Só ciente" fica de lado
  onAckAndNavigate?: () => void;
}

// "2,3 km · 6 min" pela rota; sem ela, a distância em linha reta
function distanceLine(call: EmergencyCall, route?: RouteInfo | null, from?: Coordinates): string | null {
  if (route) return `${formatDistance(route.distance)} · ${formatDuration(route.duration)}`;
  if (from) return `~${formatDistance(distance(from, call.location))} em linha reta`;
  return null;
}

// Despacho novo em tela cheia, como uma ligação recebida: toca e vibra até o "Ciente"
export default function DispatchAlert({ call, onAck, route, from, onAckAndNavigate }: DispatchAlertProps) {
  useEffect(() => {
    const ring = () => {
      playAlert('despacho', call.priority);
      navigator.vibrate?.(VIBRATION);
    };
    ring();
    const timer = window.setInterval(ring, ALARM_INTERVAL_MS);
    return () => {
      window.clearInterval(timer);
      navigator.vibrate?.(0);
    };
  }, []);

  // A cor do chamado numa faixa no topo, como a pulseira em tamanho grande: a tela inteira na cor cansa a
  // vista e, à noite, ofusca a cabine. O resto segue o tema
  const meta = PRIORITY_META[call.priority];
  const navigate = route ? onAckAndNavigate : undefined;
  const RiskIcon = meta.icon;
  return (
    <div
      className={styles.screen}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="novo-despacho despacho-cor"
      style={riskVars(call.priority)}
    >
      <header className={styles.band}>
        <RiskIcon />
        <p id="despacho-cor" className={styles.priority}>
          <span className={styles.colorName}>{meta.name}</span>
          <span className={styles.srOnly}> · </span>
          <span className={styles.colorLabel}>{meta.label}</span>
        </p>
      </header>
      <div className={styles.content}>
        <h1 id="novo-despacho" className={styles.title}>Novo despacho</h1>
        <p className={styles.address}>{call.address}</p>
        {distanceLine(call, route, from) && <p className={styles.distance}>{distanceLine(call, route, from)}</p>}
        {call.description && <p className={styles.description}>{call.description}</p>}
        {call.reference && <p className={styles.detail}>Referência: {call.reference}</p>}
        {call.triage?.signals.length ? <p className={styles.detail}>Sinais: {signalsText(call.triage.signals)}</p> : null}
      </div>
      {/* O mesmo botão troca o rótulo quando a rota chega: o foco não se perde */}
      <div className={styles.actions}>
        <button className={styles.ack} onClick={navigate ?? onAck} autoFocus>
          {navigate ? 'Ciente e navegar' : 'Ciente'}
        </button>
        {navigate && <button className={styles.ackOnly} onClick={onAck}>Só ciente</button>}
      </div>
    </div>
  );
}
