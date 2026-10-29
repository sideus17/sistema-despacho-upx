import { CallPriority } from '../types';
import { Queue, formatWait, formatWaitShort, queueWait, waitLevel, waitSpoken } from '../utils/calls';
import { AlarmIcon, TimerIcon } from './icons';
import styles from './WaitPill.module.css';

// Cronômetro da espera na fila (fila, regulação e análise do despacho): o mesmo formato em todo lugar
// A meta depende da cor: o Vermelho fica crítico bem antes do Azul
export function WaitPill({ waited, queue, priority }: { waited: number; queue: Queue; priority: CallPriority }) {
  const regulation = queue === 'regulacao';
  const level = waitLevel(waited, queue, priority);
  const target = formatWaitShort(queueWait(queue, priority).critical);
  // Espera crítica: contorno grosso e o ícone de alarme (uma placa cheia se confundiria com o botão "Regular")
  const Icon = level === 'critico' ? AlarmIcon : TimerIcon;
  return (
    <span
      className={`${styles.wait} ${styles[`wait_${level}`]}`}
      role="img"
      title={regulation ? 'Esperando a regulação' : 'Esperando a viatura'}
      aria-label={`${regulation ? 'Aguardando regulação' : 'Aguardando despacho'} há ${waitSpoken(waited)}${level === 'critico' ? `, acima da meta de ${target}` : ''}`}
    >
      <Icon /> {formatWait(waited)}
      {level === 'critico' && <span className={styles.target}>· meta {target}</span>}
    </span>
  );
}
