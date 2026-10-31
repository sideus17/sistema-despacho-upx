// Carregando: anel girando. Com "reduzir movimento", gira devagar, sem sumir o sinal de que está carregando
export function Spinner({ size = 36, label = 'Carregando', className = '' }: { size?: number; label?: string; className?: string }) {
  return (
    <span
      className={`mx-auto block shrink-0 animate-spinner rounded-full border-4 border-border border-t-primary motion-reduce:[animation-duration:2.4s] ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label={label}
    />
  );
}
