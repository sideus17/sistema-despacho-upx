import { CallPriority, EmergencyCall } from '../types';
import { EmergencyIcon, IconComponent, InfoIcon, WarningIcon } from '../ui/icons';

export const PRIORITY_META: Record<CallPriority, { label: string; color: string; icon: IconComponent; order: number }> = {
  [CallPriority.EMERGENCIA]: { label: 'Emergência', color: '#dc2626', icon: EmergencyIcon, order: 0 },
  [CallPriority.URGENTE]: { label: 'Urgente', color: '#f59e0b', icon: WarningIcon, order: 1 },
  [CallPriority.PRIORITARIO]: { label: 'Prioritário', color: '#3b82f6', icon: InfoIcon, order: 2 }
};

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
