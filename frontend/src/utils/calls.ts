import type { CSSProperties } from 'react';
import { CallOutcome, CallPriority, CallStatus, CloseReason, EmergencyCall } from '../types';
import { EmergencyIcon, IconComponent, InfoIcon, WarningIcon } from '../ui/icons';

// Classificação de risco em 4 cores (Regulação Médica das Urgências, Ministério da Saúde): a única fonte
// das cores fortes do sistema. `color` pinta o selo e o pino; `onColor` é o texto sobre ela (o amarelo pede
// texto escuro); `edge` é a pulseira, a borda e o gráfico, com 3:1 sobre a superfície de cada tema.
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
  [CallPriority.NAO_URGENTE]: { key: 'blue', name: 'Azul', label: 'Não urgente', color: '#2563eb', onColor: '#ffffff', edge: { day: '#2563eb', night: '#3b82f6' }, icon: InfoIcon, order: 3 }
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

// Espera: regulação amarela com 1 min e vermelha com 3 min; despacho amarelo com 2 min e vermelho com 5 min
export const QUEUE_WAIT: Record<Queue, { warning: number; critical: number }> = {
  regulacao: { warning: 60_000, critical: 3 * 60_000 },
  despacho: { warning: 2 * 60_000, critical: 5 * 60_000 }
};
export type WaitLevel = 'normal' | 'atencao' | 'critico';

export function waitLevel(ms: number, queue: Queue = 'despacho'): WaitLevel {
  if (ms >= QUEUE_WAIT[queue].critical) return 'critico';
  if (ms >= QUEUE_WAIT[queue].warning) return 'atencao';
  return 'normal';
}

// "04:07"; passando de 1 h, "1:02:09"
export function formatWait(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}
