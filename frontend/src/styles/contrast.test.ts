import { describe, expect, it } from 'vitest';
import { PRIORITIES_BY_SEVERITY, PRIORITY_META } from '../utils/calls';
import { riskTokensCss } from '../theme/riskTokens';
import css from './index.css?raw';

// Contraste dos tokens nos dois temas (WCAG): texto ≥ 4,5:1; pulseira, borda e anel de foco ≥ 3:1

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf('}', start));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));
}

const DAY = block(':root');
const TOKENS = { day: DAY, night: { ...DAY, ...block(":root[data-theme='night']") } };
type Theme = keyof typeof TOKENS;

function color(theme: Theme, token: string): string {
  let value = TOKENS[theme][token];
  for (let ref = value?.match(/^var\((--[\w-]+)\)$/); ref; ref = value.match(/^var\((--[\w-]+)\)$/)) value = TOKENS[theme][ref[1]];
  if (!/^#[0-9a-f]{6}$/i.test(value ?? '')) throw new Error(`${token} (${theme}) não é uma cor: ${value}`);
  return value;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT_PAIRS: Array<[string, string[]]> = [
  // --alarm-surface: o corpo do alarme do despacho (abaixo da faixa da cor)
  ['--color-text', ['--color-surface', '--color-surface-muted', '--color-surface-hover', '--color-background', '--alarm-surface']],
  ['--color-text-soft', ['--color-surface', '--color-surface-muted', '--color-surface-hover', '--alarm-surface']],
  ['--color-text-muted', ['--color-surface', '--color-surface-muted', '--alarm-surface']],
  ['--color-primary-text', ['--color-surface', '--color-surface-muted']],
  ['--color-on-primary', ['--color-primary', '--color-primary-hover']],
  ['--color-on-action', ['--color-action']],
  // Secundário da equipe (só texto à noite)
  ['--color-secondary-text', ['--color-surface', '--color-background']],
  ['--color-danger-text', ['--color-surface', '--color-surface-muted', '--tint-error-bg', '--tint-error-bg-strong']],
  ['--tint-neutral-text', ['--tint-neutral-bg', '--tint-neutral-bg-strong']],
  // Selo "Fora de serviço" da Frota
  ['--color-text-soft', ['--color-border']]
];

describe('contraste das cores', () => {
  for (const theme of ['day', 'night'] as Theme[]) {
    it(`texto legível sobre cada fundo (${theme === 'day' ? 'claro' : 'escuro'})`, () => {
      for (const [text, backgrounds] of TEXT_PAIRS) {
        for (const background of backgrounds) {
          const ratio = contrast(color(theme, text), color(theme, background));
          expect(ratio, `${text} sobre ${background}`).toBeGreaterThanOrEqual(4.5);
        }
      }
      // Topo escuro com texto branco nos dois temas
      expect(contrast('#ffffff', color(theme, '--color-header'))).toBeGreaterThanOrEqual(4.5);
      // Anel de foco do teclado
      expect(contrast(color(theme, '--color-focus'), color(theme, '--color-surface'))).toBeGreaterThanOrEqual(3);
      // À noite o botão cheio da equipe é grafite: o contorno é o que o separa da superfície
      if (theme === 'night') {
        for (const background of ['--color-surface', '--color-background']) {
          expect(contrast(color(theme, '--color-action-border'), color(theme, background)), `contorno sobre ${background}`).toBeGreaterThanOrEqual(3);
        }
      }
    });

    it(`pulseira de cada cor aparece sobre a superfície (${theme === 'day' ? 'claro' : 'escuro'})`, () => {
      for (const priority of PRIORITIES_BY_SEVERITY) {
        const { name, edge } = PRIORITY_META[priority];
        for (const background of ['--color-surface', '--color-surface-muted']) {
          expect(contrast(edge[theme], color(theme, background)), `${name} sobre ${background}`).toBeGreaterThanOrEqual(3);
        }
      }
    });
  }

  it('texto do selo legível sobre cada cor', () => {
    for (const priority of PRIORITIES_BY_SEVERITY) {
      const { name, color: fill, onColor } = PRIORITY_META[priority];
      expect(contrast(onColor, fill), name).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('as variáveis do CSS das 4 cores saem de PRIORITY_META', () => {
    const tokens = riskTokensCss();
    for (const priority of PRIORITIES_BY_SEVERITY) {
      const { key, color: fill, edge } = PRIORITY_META[priority];
      expect(tokens).toContain(`--risk-${key}: ${fill};`);
      expect(tokens).toContain(`--risk-${key}-edge: ${edge.day};`);
      expect(tokens).toContain(`--risk-${key}-edge: ${edge.night};`);
    }
  });
});
