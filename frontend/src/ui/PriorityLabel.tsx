import { CallPriority } from '../types';
import { PRIORITY_META } from '../utils/calls';

// Selo da classificação de risco, como a pulseira da triagem: "Amarelo · Urgência"
export function PriorityLabel({ priority }: { priority: CallPriority }) {
  const meta = PRIORITY_META[priority];
  if (!meta) return <>{priority}</>;
  const Icon = meta.icon;
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 leading-normal font-bold whitespace-nowrap" style={{ background: meta.color, color: meta.onColor }}>
      <Icon /> {meta.name} · {meta.label}
    </span>
  );
}
