import type { CSSProperties } from 'react';
import { CallOutcome, CallPriority, CallStatus, CloseReason, EmergencyCall } from '../types';
import { EmergencyIcon, IconComponent, InfoIcon, ScheduleIcon, WarningIcon } from '../ui/icons';

// Classificação de risco em 4 cores (Regulação Médica das Urgências, Ministério da Saúde): a única fonte
// das cores fortes do sistema. `color` pinta o selo e o pino; `onColor` é o texto sobre ela (o amarelo pede
// texto escuro); `edge` é a pulseira, a borda e o gráfico, com 3:1 sobre a superfície de cada tema.
// Cada cor tem o seu ícone (o Azul, "pode esperar", é o relógio), para a cor não ser o único sinal.
export type RiskKey = 'red' | 'yellow' | 'green' | 'blue';
export const PRIORITY_META: Record<CallPriority, {
  key: RiskKey;
  name: string;
  label: string;
  color: string;
  onColor: string;
  edge: { day: string; night: string };
  icon: IconComponent;
  order: number;
}> = {
  [CallPriority.EMERGENCIA]: { key: 'red', name: 'Vermelho', label: 'Emergência', color: '#dc2626', onColor: '#ffffff', edge: { day: '#dc2626', night: '#ef4444' }, icon: EmergencyIcon, order: 0 },
  [CallPriority.URGENTE]: { key: 'yellow', name: 'Amarelo', label: 'Urgência', color: '#eab308', onColor: '#422006', edge: { day: '#a87c00', night: '#eab308' }, icon: WarningIcon, order: 1 },
  [CallPriority.PRIORITARIO]: { key: 'green', name: 'Verde', label: 'Pouco urgente', color: '#15803d', onColor: '#ffffff', edge: { day: '#15803d', night: '#22c55e' }, icon: InfoIcon, order: 2 },
  [CallPriority.NAO_URGENTE]: { key: 'blue', name: 'Azul', label: 'Não urgente', color: '#2563eb', onColor: '#ffffff', edge: { day: '#2563eb', night: '#3b82f6' }, icon: ScheduleIcon, order: 3 }
};

// Variáveis do CSS da cor de um chamado (--risk, --risk-on e --risk-edge), para a pulseira e os selos.
// Elas apontam para --risk-<cor>-*, que theme/riskTokens.ts cria a partir de PRIORITY_META.
export function riskVars(priority: CallPriority): CSSProperties {
  const key = PRIORITY_META[priority]?.key ?? 'red';
  return {
    '--risk': `var(--risk-${key})`,
    '--risk-on': `var(--risk-${key}-on)`,
    '--risk-edge': `var(--risk-${key}-edge)`
  } as CSSProperties;
}

export const CALL_STATUS_LABEL: Record<CallStatus, string> = {
  [CallStatus.AGUARDANDO_REGULACAO]: 'Aguardando regulação',
  [CallStatus.PENDENTE]: 'Aguardando despacho',
  [CallStatus.EM_ATENDIMENTO]: 'Em atendimento',
  [CallStatus.FINALIZADO]: 'Finalizado',
  [CallStatus.ORIENTADO]: 'Orientado por telefone',
  [CallStatus.CANCELADO]: 'Cancelado'
};

export const CLOSE_REASON_LABEL: Record<CloseReason, string> = {
  [CloseReason.TROTE]: 'Trote',
  [CloseReason.REPETIDO]: 'Chamado repetido',
  [CloseReason.ENGANO]: 'Ligação por engano',
  [CloseReason.DESISTENCIA]: 'Desistência',
  [CloseReason.OUTRO]: 'Outro motivo'
};

export const OUTCOME_LABEL: Record<CallOutcome, string> = {
  [CallOutcome.TRANSPORTADO]: 'Levado ao hospital',
  [CallOutcome.ATENDIDO_NO_LOCAL]: 'Atendido no local',
  [CallOutcome.RECUSA]: 'Recusou atendimento',
  [CallOutcome.OBITO]: 'Óbito',
  [CallOutcome.NAO_LOCALIZADO]: 'Não localizado'
};

// Com a chegada ao hospital registrada, o servidor já sabe que foi transporte; sem ela, pergunta
export const needsOutcome = (call: EmergencyCall) => !call.times?.atHospital;

// Etapa do atendimento, pelos horários (o GPS da viatura marca; ninguém precisa tocar em nada)
export type CallStage = 'DESPACHADA' | 'A_CAMINHO' | 'NO_LOCAL' | 'SAIU_DO_LOCAL' | 'TRANSPORTANDO' | 'NO_HOSPITAL' | 'FINALIZADA';

export const STAGE_META: Record<CallStage, { label: string }> = {
  DESPACHADA: { label: 'Despachada' },
  A_CAMINHO: { label: 'A caminho' },
  NO_LOCAL: { label: 'No local' },
  SAIU_DO_LOCAL: { label: 'Saiu do local' },
  TRANSPORTANDO: { label: 'Transportando' },
  NO_HOSPITAL: { label: 'No hospital' },
  FINALIZADA: { label: 'Finalizada' }
};

// Etapa atual e desde quando (null: chamado ainda não despachado)
export function callStage(call: EmergencyCall): { stage: CallStage; since: string } | null {
  const times = call.times ?? {};
  if (times.finished) return { stage: 'FINALIZADA', since: times.finished };
  if (times.atHospital) return { stage: 'NO_HOSPITAL', since: times.atHospital };
  if (times.leftScene) return { stage: call.hospitalId ? 'TRANSPORTANDO' : 'SAIU_DO_LOCAL', since: times.leftScene };
  if (times.onScene) return { stage: 'NO_LOCAL', since: times.onScene };
  if (times.enRoute) return { stage: 'A_CAMINHO', since: times.enRoute };
  if (times.dispatched) return { stage: 'DESPACHADA', since: times.dispatched };
  // Despachado antes da migração 006 (sem horário): conta da abertura
  return call.status === CallStatus.EM_ATENDIMENTO ? { stage: 'DESPACHADA', since: call.timestamp } : null;
}

// Linha do tempo: só as etapas que aconteceram, na ordem
const TIMELINE: Array<[keyof NonNullable<EmergencyCall['times']>, string]> = [
  ['dispatched', 'Despacho'],
  ['crewSeen', 'Ciente'],
  ['enRoute', 'Saída'],
  ['onScene', 'Local'],
  ['leftScene', 'Saída do local'],
  ['atHospital', 'Hospital'],
  ['finished', 'Fim']
];

// Confirmação da equipe ("Ciente" no app): sem ela depois de 1 min, a central deve ligar para a viatura
export const CREW_ACK_WAIT_MS = 60_000;

export type CrewAck = { seen: true; at: string } | { seen: false; late: boolean };

export function crewAck(call: EmergencyCall, now: number): CrewAck | null {
  if (call.status !== CallStatus.EM_ATENDIMENTO || !call.times?.dispatched) return null;
  if (call.times.crewSeen) return { seen: true, at: call.times.crewSeen };
  return { seen: false, late: now - Date.parse(call.times.dispatched) >= CREW_ACK_WAIT_MS };
}

export const formatClock = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export function timeline(call: EmergencyCall): Array<{ label: string; time: string }> {
  return TIMELINE.flatMap(([key, label]) => (call.times?.[key] ? [{ label, time: formatClock(call.times[key]!) }] : []));
}

// "há 3 min" a partir do horário da etapa
export function elapsedLabel(since: string, now: number): string {
  const minutes = Math.max(0, Math.floor((now - Date.parse(since)) / 60_000));
  return minutes < 1 ? 'agora' : minutes < 60 ? `há ${minutes} min` : `há ${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

// Ordem do mais grave para o menos grave (vermelho, amarelo, verde, azul)
export const PRIORITIES_BY_SEVERITY = (Object.keys(PRIORITY_META) as CallPriority[]).sort(
  (a, b) => PRIORITY_META[a].order - PRIORITY_META[b].order
);

// Mais grave primeiro; dentro da mesma prioridade, quem espera há mais tempo
export function sortCallsByPriority(calls: EmergencyCall[]): EmergencyCall[] {
  return [...calls].sort((a, b) =>
    (PRIORITY_META[a.priority]?.order ?? 99) - (PRIORITY_META[b.priority]?.order ?? 99) ||
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

export function formatGender(gender?: string): string | null {
  if (gender === 'M') return 'Masculino';
  if (gender === 'F') return 'Feminino';
  if (gender) return 'Outro';
  return null;
}

// Filas da central: o chamado novo espera a regulação; o regulado, a viatura
export type Queue = 'regulacao' | 'despacho';

export function queueOf(call: EmergencyCall): Queue | null {
  if (call.status === CallStatus.AGUARDANDO_REGULACAO) return 'regulacao';
  if (call.status === CallStatus.PENDENTE) return 'despacho';
  return null;
}

// Desde quando espera na fila atual: a regulação conta da abertura; o despacho, da regulação
// (chamado de antes da regulação: da abertura)
export function waitingSince(call: EmergencyCall): string {
  return call.status === CallStatus.PENDENTE ? call.times?.regulated ?? call.timestamp : call.timestamp;
}

// Espera tolerada na fila, por cor (na regulação, a cor é a pré-classificação do atendente):
// o Vermelho fica crítico em 1 min na regulação e 2 min no despacho; o Azul, em 15 e 30 min
const MIN = 60_000;
export const QUEUE_WAIT: Record<Queue, Record<CallPriority, { warning: number; critical: number }>> = {
  regulacao: {
    [CallPriority.EMERGENCIA]: { warning: 0.5 * MIN, critical: MIN },
    [CallPriority.URGENTE]: { warning: MIN, critical: 3 * MIN },
    [CallPriority.PRIORITARIO]: { warning: 3 * MIN, critical: 10 * MIN },
    [CallPriority.NAO_URGENTE]: { warning: 5 * MIN, critical: 15 * MIN }
  },
  despacho: {
    [CallPriority.EMERGENCIA]: { warning: MIN, critical: 2 * MIN },
    [CallPriority.URGENTE]: { warning: 2 * MIN, critical: 5 * MIN },
    [CallPriority.PRIORITARIO]: { warning: 5 * MIN, critical: 15 * MIN },
    [CallPriority.NAO_URGENTE]: { warning: 10 * MIN, critical: 30 * MIN }
  }
};
export type WaitLevel = 'normal' | 'atencao' | 'critico';

// Sem cor conhecida, vale a do Amarelo
export function queueWait(queue: Queue, priority: CallPriority): { warning: number; critical: number } {
  return QUEUE_WAIT[queue][priority] ?? QUEUE_WAIT[queue][CallPriority.URGENTE];
}

export function waitLevel(ms: number, queue: Queue, priority: CallPriority): WaitLevel {
  const limits = queueWait(queue, priority);
  if (ms >= limits.critical) return 'critico';
  if (ms >= limits.warning) return 'atencao';
  return 'normal';
}

// Passou da meta da cor na fila em que está
export function isLate(call: EmergencyCall, now: number): boolean {
  const queue = queueOf(call);
  return !!queue && now - Date.parse(waitingSince(call)) >= queueWait(queue, call.priority).critical;
}

// "04:07"; passando de 1 h, "1:02:09"
// Espera na fila: abaixo de 1 h "4:07"; daí em diante "10 h 45 min" (com horas, "10:45:47" parecia horário)
export function formatWait(ms: number): string {
  const { hours, minutes, seconds } = splitWait(ms);
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours} h ${pad(minutes)} min` : `${minutes}:${pad(seconds)}`;
}

// Espera numa frase, sem os segundos: "30 s", "4 min", "12 h 28 min"
export function formatWaitShort(ms: number): string {
  const { hours, minutes, seconds } = splitWait(ms);
  if (hours > 0) return formatWait(ms);
  return minutes > 0 ? `${minutes} min` : `${seconds} s`;
}

// A mesma espera por extenso, para o leitor de tela: "4 min 7 s", "10 h 45 min"
export function waitSpoken(ms: number): string {
  const { hours, minutes, seconds } = splitWait(ms);
  if (hours > 0) return `${hours} h ${minutes} min`;
  if (minutes > 0) return seconds > 0 ? `${minutes} min ${seconds} s` : `${minutes} min`;
  return `${seconds} s`;
}

function splitWait(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return { hours: Math.floor(total / 3600), minutes: Math.floor((total % 3600) / 60), seconds: total % 60 };
}

// Resumo da espera longa no topo da fila, calculado a cada segundo (some sozinho quando a espera acaba).
// Diz a pior espera de verdade, não o limite: "Vermelho aguardando regulação há 12 h 28 min · e mais 1 acima da meta"
export function lateSummary(calls: EmergencyCall[], now: number): Array<{ text: string; callId: string }> {
  return (['regulacao', 'despacho'] as Queue[]).flatMap(queue => {
    const late = calls
      .filter(call => queueOf(call) === queue && isLate(call, now))
      .sort((a, b) => Date.parse(waitingSince(a)) - Date.parse(waitingSince(b)));
    if (late.length === 0) return [];
    const [worst] = late;
    const label = queue === 'regulacao' ? 'aguardando regulação' : 'aguardando despacho';
    const others = late.length > 1 ? ` · e mais ${late.length - 1} acima da meta` : '';
    return [{ text: `${PRIORITY_META[worst.priority].name} ${label} há ${formatWaitShort(now - Date.parse(waitingSince(worst)))}${others}`, callId: worst.id }];
  });
}
