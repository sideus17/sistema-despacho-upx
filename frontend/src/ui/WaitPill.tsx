import { Queue, formatWait, waitLevel, waitSpoken } from '../utils/calls';
import { AlarmIcon, TimerIcon } from './icons';
import styles from './WaitPill.module.css';

// Cronômetro da espera na fila (fila, regulação e análise do despacho): o mesmo formato em todo lugar
export function WaitPill({ waited, queue }: { waited: number; queue: Queue }) {
  const regulation = queue === 'regulacao';
  const level = waitLevel(waited, queue);
  // Espera crítica: contorno grosso e o ícone de alarme (uma placa cheia se confundiria com o botão "Regular")
  const Icon = level === 'critico' ? AlarmIcon : TimerIcon;
  return (
    <span
      className={`${styles.wait} ${styles[`wait_${level}`]}`}
      title={regulation ? 'Esperando a regulação' : 'Esperando a viatura'}
      aria-label={`${regulation ? 'Aguardando regulação' : 'Aguardando despacho'} há ${waitSpoken(waited)}`}
    >
      <Icon /> {formatWait(waited)}
    </span>
  );
}
