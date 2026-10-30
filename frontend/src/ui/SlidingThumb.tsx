import { useLayoutEffect, useRef, useState } from 'react';

type Variant = 'raised' | 'ink' | 'line';

/**
 * Indicador que desliza até a opção escolhida de um grupo (abas, filtros, períodos): o mesmo movimento
 * na plataforma toda. Fica dentro do grupo (que leva a classe global `slide-group`) e acompanha o filho
 * marcado com aria-selected, aria-checked ou aria-pressed. `watch`: o valor escolhido (mede de novo quando muda).
 */
export function SlidingThumb({ watch, variant }: { watch: unknown; variant: Variant }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    const group = ref.current?.parentElement;
    if (!group) return;
    const measure = () => {
      const chosen = group.querySelector<HTMLElement>(
        ':scope > [aria-selected="true"], :scope > [aria-checked="true"], :scope > [aria-pressed="true"]'
      );
      setBox(chosen && chosen.offsetWidth > 0
        ? { x: chosen.offsetLeft, y: chosen.offsetTop, w: chosen.offsetWidth, h: chosen.offsetHeight }
        : null);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(group);
    return () => observer.disconnect();
  }, [watch]);

  const line = variant === 'line';
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={`slide-thumb slide-thumb-${variant}`}
      style={box
        ? { width: box.w, height: line ? 3 : box.h, transform: `translate(${box.x}px, ${line ? box.y + box.h - 3 : box.y}px)` }
        : { display: 'none' }}
    />
  );
}
