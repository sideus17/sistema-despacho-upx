import { TrafficJamIcon } from '../ui/icons';
import { setTrafficEnabled, useTrafficEnabled } from './traffic';

interface TrafficToggleProps {
  className: string;
  activeClassName: string;
}

// Liga e desliga o trânsito nos mapas (a escolha fica salva no aparelho)
export function TrafficToggle({ className, activeClassName }: TrafficToggleProps) {
  const enabled = useTrafficEnabled();
  return (
    <button
      className={`${className} ${enabled ? activeClassName : ''}`}
      onClick={() => setTrafficEnabled(!enabled)}
      aria-pressed={enabled}
      aria-label="Trânsito"
      title={enabled ? 'Esconder o trânsito' : 'Mostrar o trânsito'}
    >
      <TrafficJamIcon />
    </button>
  );
}
