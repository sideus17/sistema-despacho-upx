import { CallOutcome, CallPriority, CallStatus, EmergencyCall } from '../types';
import { EmergencyIcon, IconComponent, InfoIcon, WarningIcon } from '../ui/icons';

// Classificação de risco em 4 cores (Regulação Médica das Urgências, Ministério da Saúde).
// `color` pinta o selo, o pino e a borda; `onColor` é o texto sobre ela (o amarelo pede texto escuro).
export const PRIORITY_META: Record<CallPriority, { name: string; label: string; color: string; onColor: string; icon: IconComponent; order: number }> = {
  [CallPriority.EMERGENCIA]: { name: 'Vermelho', label: 'Emergência', color: '#dc2626', onColor: '#ffffff', icon: EmergencyIcon, order: 0 },
  [CallPriority.URGENTE]: { name: 'Amarelo', label: 'Urgência', color: '#eab308', onColor: '#422006', icon: WarningIcon, order: 1 },
  [CallPriority.PRIORITARIO]: { name: 'Verde', label: 'Pouco urgente', color: '#16a34a', onColor: '#ffffff', icon: InfoIcon, order: 2 },
  [CallPriority.NAO_URGENTE]: { name: 'Azul', label: 'Não urgente', color: '#2563eb', onColor: '#ffffff', icon: InfoIcon, order: 3 }
};

export const CALL_STATUS_LABEL: Record<CallStatus, string> = {
  [CallStatus.PENDENTE]: 'Aguardando despacho',
  [CallStatus.EM_ATENDIMENTO]: 'Em atendimento',
  [CallStatus.FINALIZADO]: 'Finalizado',
  [CallStatus.CANCELADO]: 'Cancelado'
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

// Espera de um chamado pendente: amarelo a partir de 2 min, vermelho a partir de 5 min
export const WAIT_WARNING_MS = 2 * 60_000;
export const WAIT_CRITICAL_MS = 5 * 60_000;
export type WaitLevel = 'normal' | 'atencao' | 'critico';

export function waitLevel(ms: number): WaitLevel {
  if (ms >= WAIT_CRITICAL_MS) return 'critico';
  if (ms >= WAIT_WARNING_MS) return 'atencao';
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
