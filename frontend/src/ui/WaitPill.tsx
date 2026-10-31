import { CallPriority } from '../types';
import { Queue, formatWait, formatWaitShort, queueWait, waitLevel, waitSpoken } from '../utils/calls';
import { AlarmIcon, TimerIcon } from './icons';

// Espera na fila; a longa escala por contorno e inversão, sem as cores da classificação.
// Crítica: maior, com contorno grosso e a meta ao lado (diz o quanto passou, sem cor de risco)
const LEVEL_CLASS = {
  normal: 'border border-transparent px-2 py-0.5 text-[13px] text-text-muted',
  atencao: 'border border-text-soft px-2 py-0.5 text-[13px] text-text',
  critico: 'border-2 border-primary px-2 py-px text-[15px] text-primary-text'
};

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
      className={`inline-flex items-center gap-1 rounded-full font-bold whitespace-nowrap tabular-nums ${LEVEL_CLASS[level]}`}
      data-level={level}
      role="img"
      title={regulation ? 'Esperando a regulação' : 'Esperando a viatura'}
      aria-label={`${regulation ? 'Aguardando regulação' : 'Aguardando despacho'} há ${waitSpoken(waited)}${level === 'critico' ? `, acima da meta de ${target}` : ''}`}
    >
      <Icon /> {formatWait(waited)}
      {level === 'critico' && <span className="text-[13px] font-medium">· meta {target}</span>}
    </span>
  );
}
