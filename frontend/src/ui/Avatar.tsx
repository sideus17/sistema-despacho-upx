import { CSSProperties } from 'react';
import styles from './Avatar.module.css';

// Cores escuras o bastante para as iniciais em branco (contraste ≥ 4,5:1)
export const AVATAR_COLORS = {
  azul: '#1a73e8',
  verde: '#188038',
  vermelho: '#c5221f',
  laranja: '#b45309',
  roxo: '#8430ce',
  turquesa: '#007b83',
  rosa: '#c2185b',
  grafite: '#5f6368'
} as const;

export type AvatarColor = keyof typeof AVATAR_COLORS;
const COLOR_KEYS = Object.keys(AVATAR_COLORS) as AvatarColor[];

// Primeira letra do primeiro e do último nome
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}

// Sem cor escolhida, a cor sai do id: a mesma pessoa tem sempre a mesma cor
function colorFromSeed(seed: string): AvatarColor {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return COLOR_KEYS[Math.abs(hash) % COLOR_KEYS.length];
}

interface AvatarProps {
  name: string;
  seed: string;
  color?: AvatarColor | null;
  size?: number;
  className?: string;
}

export function Avatar({ name, seed, color, size = 32, className = '' }: AvatarProps) {
  const background = AVATAR_COLORS[color ?? colorFromSeed(seed)];
  return (
    <span
      className={`${styles.avatar} ${className}`}
      style={{ '--avatar-size': `${size}px`, background } as CSSProperties}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
