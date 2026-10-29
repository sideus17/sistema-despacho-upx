import styles from './Spinner.module.css';

// Carregando: anel girando. A animação mora no próprio módulo, porque o CSS Modules renomeia os
// keyframes de cada arquivo e o "spin" de um não alcança o outro (por isso 4 spinners ficavam parados).
export function Spinner({ size = 36, label = 'Carregando', className = '' }: { size?: number; label?: string; className?: string }) {
  return <span className={`${styles.spinner} ${className}`} style={{ width: size, height: size }} role="status" aria-label={label} />;
}
