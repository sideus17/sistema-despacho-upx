import { CallPriority } from '../types';
import { PRIORITY_META } from '../utils/calls';

export function PriorityLabel({ priority }: { priority: CallPriority }) {
  const meta = PRIORITY_META[priority];
  if (!meta) return <>{priority}</>;
  const Icon = meta.icon;
  return (
    <>
      <Icon /> {meta.label}
    </>
  );
}
