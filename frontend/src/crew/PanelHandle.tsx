import { useRef, useState } from 'react';
import styles from './PanelHandle.module.css';

const KEY = 'samu:painel-recolhido';
// Arraste mínimo (px) para contar como "descer" ou "subir" o painel, e não como toque
const DRAG_THRESHOLD = 24;

// Painel recolhido ou aberto, lembrado no aparelho; sem escolha salva, vale o padrão (deitado: recolhido)
export function usePanelCollapsed(fallback: boolean): [boolean, (collapsed: boolean) => void] {
  const [saved, setSaved] = useState<boolean | null>(() => {
    try {
      const value = localStorage.getItem(KEY);
      return value === null ? null : value === '1';
    } catch {
      return null;
    }
  });

  const save = (collapsed: boolean) => {
    setSaved(collapsed);
    try {
      localStorage.setItem(KEY, collapsed ? '1' : '0');
    } catch {
      // Sem armazenamento: vale só nesta tela
    }
  };

  return [saved ?? fallback, save];
}

interface PanelHandleProps {
  collapsed: boolean;
  onChange: (collapsed: boolean) => void;
  label: string; // "painel da navegação"
}

/**
 * Alça no topo do painel: tocar alterna, arrastar para baixo recolhe e para cima abre.
 * Também funciona pelo teclado (é um botão).
 */
export function PanelHandle({ collapsed, onChange, label }: PanelHandleProps) {
  const startY = useRef<number | null>(null);
  const dragged = useRef(false);

  return (
    <button
      type="button"
      className={styles.handle}
      aria-expanded={!collapsed}
      aria-label={collapsed ? `Mostrar ${label}` : `Recolher ${label}`}
      onPointerDown={event => {
        startY.current = event.clientY;
        dragged.current = false;
      }}
      onPointerUp={event => {
        if (startY.current === null) return;
        const dy = event.clientY - startY.current;
        startY.current = null;
        if (Math.abs(dy) >= DRAG_THRESHOLD) {
          dragged.current = true;
          onChange(dy > 0);
        }
      }}
      onClick={() => {
        // O arraste já decidiu; o clique que vem junto não desfaz
        if (dragged.current) {
          dragged.current = false;
          return;
        }
        onChange(!collapsed);
      }}
    >
      <span className={styles.grabber} />
    </button>
  );
}
