import { PRIORITIES_BY_SEVERITY, PRIORITY_META } from '../utils/calls';

// As 4 cores da classificação viram variáveis do CSS a partir de PRIORITY_META (a única fonte):
// --risk-<cor> (preenchimento), --risk-<cor>-on (texto sobre ele) e --risk-<cor>-edge (pulseira, borda e
// gráfico, que muda com o tema). Assim o CSS, os gráficos e o mapa de calor não guardam cópias das cores.
export function riskTokensCss(): string {
  const day: string[] = [];
  const night: string[] = [];
  for (const priority of PRIORITIES_BY_SEVERITY) {
    const { key, color, onColor, edge } = PRIORITY_META[priority];
    day.push(`--risk-${key}: ${color};`, `--risk-${key}-on: ${onColor};`, `--risk-${key}-edge: ${edge.day};`);
    night.push(`--risk-${key}-edge: ${edge.night};`);
  }
  return `:root { ${day.join(' ')} }\n:root[data-theme='night'] { ${night.join(' ')} }`;
}

export function installRiskTokens() {
  if (document.getElementById('risk-tokens')) return;
  const style = document.createElement('style');
  style.id = 'risk-tokens';
  style.textContent = riskTokensCss();
  document.head.appendChild(style);
}
