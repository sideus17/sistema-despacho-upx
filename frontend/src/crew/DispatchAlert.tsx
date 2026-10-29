import { useEffect } from 'react';
import { EmergencyCall } from '../types';
import { PRIORITY_META, riskVars } from '../utils/calls';
import { signalsText } from '../utils/triage';
import { playAlert } from '../utils/alertSound';
import styles from './DispatchAlert.module.css';

// Intervalo do toque: o alarme repete até a equipe tocar em "Ciente"
export const ALARM_INTERVAL_MS = 2500;
const VIBRATION = [400, 200, 400, 200, 400];

interface DispatchAlertProps {
  call: EmergencyCall;
  onAck: () => void;
}

// Despacho novo em tela cheia, como uma ligação recebida: toca e vibra até o "Ciente"
export default function DispatchAlert({ call, onAck }: DispatchAlertProps) {
  useEffect(() => {
    const ring = () => {
      playAlert('despacho');
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
        {call.reference && <p className={styles.detail}>Referência: {call.reference}</p>}
        {call.triage?.signals.length ? <p className={styles.detail}>Sinais: {signalsText(call.triage.signals)}</p> : null}
      </div>
      <button className={styles.ack} onClick={onAck} autoFocus>Ciente</button>
    </div>
  );
}
