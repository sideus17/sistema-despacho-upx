import { Queue, formatWait, waitLevel, waitSpoken } from '../utils/calls';
import { TimerIcon } from './icons';
import styles from './WaitPill.module.css';

// Cronômetro da espera na fila (fila, regulação e análise do despacho): o mesmo formato em todo lugar
export function WaitPill({ waited, queue }: { waited: number; queue: Queue }) {
  const regulation = queue === 'regulacao';
  return (
    <span
      className={`${styles.wait} ${styles[`wait_${waitLevel(waited, queue)}`]}`}
      title={regulation ? 'Esperando a regulação' : 'Esperando a viatura'}
      aria-label={`${regulation ? 'Aguardando regulação' : 'Aguardando despacho'} há ${waitSpoken(waited)}`}
    >
      <TimerIcon /> {formatWait(waited)}
    </span>
  );
}
