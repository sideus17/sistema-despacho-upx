import { AvatarColor } from '../types';
import { avatarUrl } from '../lib/supabase';

// Cores escuras o bastante para as iniciais em branco (contraste ≥ 4,5:1)
export const AVATAR_COLORS: Record<AvatarColor, string> = {
  azul: '#1a73e8',
  verde: '#188038',
  vermelho: '#c5221f',
  laranja: '#b45309',
  roxo: '#8430ce',
  turquesa: '#007b83',
  rosa: '#c2185b',
  grafite: '#5f6368'
};

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
export function colorFromSeed(seed: string): AvatarColor {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return COLOR_KEYS[Math.abs(hash) % COLOR_KEYS.length];
}

interface AvatarProps {
  name: string;
  seed: string;
  // Foto enviada pela pessoa; sem ela, as iniciais na cor
  photo?: string | null;
  color?: AvatarColor | null;
  size?: number;
  // Ponto vermelho no canto (ex.: cadastro incompleto)
  badge?: boolean;
  className?: string;
}

export function Avatar({ name, seed, photo, color, size = 32, badge = false, className = '' }: AvatarProps) {
  const background = AVATAR_COLORS[color ?? colorFromSeed(seed)];
  const badgeSize = Math.max(8, size * 0.26);
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center rounded-full leading-none font-bold tracking-[0.02em] text-white select-none ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.42, background }}
      aria-hidden="true"
    >
      {/* Foto recortada no círculo; a cor de fundo aparece enquanto ela carrega */}
      {photo ? <img className="size-full rounded-full object-cover" src={avatarUrl(photo)} alt="" loading="lazy" /> : initials(name)}
      {badge && (
        <span className="absolute top-0 right-0 rounded-full border-2 border-white bg-text" style={{ width: badgeSize, height: badgeSize }} />
      )}
    </span>
  );
}
