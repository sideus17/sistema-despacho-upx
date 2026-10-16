import { CallPriority, EmergencyCall } from '../types';
import { EmergencyIcon, IconComponent, InfoIcon, WarningIcon } from '../ui/icons';

// Classificação de risco em 4 cores (Regulação Médica das Urgências, Ministério da Saúde).
// `color` pinta o selo, o pino e a borda; `onColor` é o texto sobre ela (o amarelo pede texto escuro).
export const PRIORITY_META: Record<CallPriority, { name: string; label: string; color: string; onColor: string; icon: IconComponent; order: number }> = {
  [CallPriority.EMERGENCIA]: { name: 'Vermelho', label: 'Emergência', color: '#dc2626', onColor: '#ffffff', icon: EmergencyIcon, order: 0 },
  [CallPriority.URGENTE]: { name: 'Amarelo', label: 'Urgência', color: '#eab308', onColor: '#422006', icon: WarningIcon, order: 1 },
  [CallPriority.PRIORITARIO]: { name: 'Verde', label: 'Pouco urgente', color: '#16a34a', onColor: '#ffffff', icon: InfoIcon, order: 2 },
  [CallPriority.NAO_URGENTE]: { name: 'Azul', label: 'Não urgente', color: '#2563eb', onColor: '#ffffff', icon: InfoIcon, order: 3 }
};

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
