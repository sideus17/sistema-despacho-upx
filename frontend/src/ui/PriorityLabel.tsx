import { CallPriority } from '../types';
import { PRIORITY_META } from '../utils/calls';
import styles from './PriorityLabel.module.css';

// Selo da classificação de risco, como a pulseira da triagem: "Amarelo · Urgência"
export function PriorityLabel({ priority }: { priority: CallPriority }) {
  const meta = PRIORITY_META[priority];
  if (!meta) return <>{priority}</>;
  const Icon = meta.icon;
  return (
    <span className={styles.badge} style={{ background: meta.color, color: meta.onColor }}>
      <Icon /> {meta.name} · {meta.label}
    </span>
  );
}
