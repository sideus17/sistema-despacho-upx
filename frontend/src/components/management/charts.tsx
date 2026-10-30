import { CSSProperties, ReactNode, RefObject, useLayoutEffect, useRef, useState } from 'react';
import { formatCount, formatMinutes, niceMax } from './format';
import styles from './charts.module.css';

// Peças dos gráficos da gestão, em SVG e HTML próprios (sem biblioteca): cartão com a versão em
// tabela, número em destaque, colunas com dica ao passar o mouse e barras horizontais.
// Na primeira vez as barras crescem do zero, uma depois da outra (--i); depois, numa troca de período,
// vão do valor antigo ao novo (a entrada não se repete)

// Ordem da barra para o escalonamento da entrada (até 8 passos de 40 ms)
const step = (index: number) => ({ '--i': Math.min(index, 8) }) as CSSProperties;

// Largura do elemento, acompanhando o redimensionamento (sem medida, como nos testes, vale a reserva)
function useElementWidth<T extends HTMLElement>(fallback: number): [RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    setWidth(element.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width || fallback];
}

export interface TableData {
  head: string[];
  rows: Array<Array<ReactNode>>;
}

// Cartão de um gráfico; "Tabela" mostra os mesmos números sem depender da cor nem do mouse
export function ChartCard({ title, subtitle, table, wide, children }: {
  title: string;
  subtitle?: string;
  table?: TableData;
  wide?: boolean;
  children: ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <section className={`${styles.card} ${wide ? styles.wide : ''}`} aria-label={title}>
      <header className={styles.cardHeader}>
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {table && (
          <button type="button" className={styles.tableToggle} aria-pressed={showTable} onClick={() => setShowTable(value => !value)}>
            {showTable ? 'Gráfico' : 'Tabela'}
          </button>
        )}
      </header>
      {showTable && table ? <TableView {...table} /> : children}
    </section>
  );
}

function TableView({ head, rows }: TableData) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>{head.map(cell => <th key={cell} scope="col">{cell}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>{row.map((cell, column) => <td key={column}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatTile({ label, value, detail }: { label: string; value: string; detail?: ReactNode }) {
  return (
    <div className={styles.tile} role="group" aria-label={label}>
      <span className={styles.tileLabel} aria-hidden="true">{label}</span>
      <strong className={styles.tileValue}>{value}</strong>
      {detail && <span className={styles.tileDetail}>{detail}</span>}
    </div>
  );
}

export interface Column {
  key: string;
  value: number;
  valueText: string; // "22 chamados"
  labelText: string; // "14h às 15h"
}

const MARGIN = { top: 20, right: 4, bottom: 24, left: 32 };

// Coluna com o topo arredondado (4 px) e a base reta, crescendo da linha do zero
function columnPath(x: number, top: number, width: number, height: number): string {
  const r = Math.min(4, width / 2, height);
  const bottom = top + height;
  return `M${x},${bottom}V${top + r}Q${x},${top} ${x + r},${top}H${x + width - r}Q${x + width},${top} ${x + width},${top + r}V${bottom}Z`;
}

/**
 * Colunas de uma série só (cor do acento), com a escala à esquerda, o maior valor escrito no topo e a
 * dica ao passar o mouse ou focar com o teclado (a coluna inteira é a área do toque).
 */
export function ColumnChart({ columns, tickLabel, label, height = 180 }: {
  columns: Column[];
  tickLabel: (index: number) => string | null;
  label: string;
  height?: number;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>(600);
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...columns.map(column => column.value)));
  const plotWidth = Math.max(10, width - MARGIN.left - MARGIN.right);
  const plotHeight = height - MARGIN.top - MARGIN.bottom;
  const band = plotWidth / Math.max(1, columns.length);
  const barWidth = Math.max(1, Math.min(24, band - 2));
  const y = (value: number) => MARGIN.top + plotHeight - (value / max) * plotHeight;
  const center = (index: number) => MARGIN.left + index * band + band / 2;
  const ticks = [0, max / 2, max].filter(Number.isInteger);
  const peak = columns.reduce((best, column, index) => (column.value > columns[best].value ? index : best), 0);
  const current = active === null ? null : columns[active];

  return (
    <div ref={ref} className={styles.columns}>
      <svg width={width} height={height} role="img" aria-label={label}>
        {ticks.map(tick => (
          <g key={tick}>
            <line className={styles.grid} x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)} />
            <text className={styles.axis} x={MARGIN.left - 6} y={y(tick)} dy="0.32em" textAnchor="end">{formatCount(tick)}</text>
          </g>
        ))}
        {columns.map((column, index) => {
          const barHeight = (column.value / max) * plotHeight;
          const tick = tickLabel(index);
          return (
            <g key={column.key}>
              {barHeight > 0 && (
                <path
                  className={styles.column}
                  style={step(Math.floor((index / Math.max(1, columns.length)) * 8))}
                  d={columnPath(center(index) - barWidth / 2, y(column.value), barWidth, barHeight)}
                  opacity={active !== null && active !== index ? 0.45 : 1}
                />
              )}
              {tick && <text className={styles.axis} x={center(index)} y={height - 6} textAnchor="middle">{tick}</text>}
              <rect
                className={styles.hit}
                x={MARGIN.left + index * band}
                y={MARGIN.top}
                width={band}
                height={plotHeight}
                tabIndex={0}
                aria-label={`${column.labelText}: ${column.valueText}`}
                onPointerEnter={() => setActive(index)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
              />
            </g>
          );
        })}
        {columns.length > 0 && columns[peak].value > 0 && (
          <text className={styles.peak} x={center(peak)} y={y(columns[peak].value) - 6} textAnchor="middle">
            {formatCount(columns[peak].value)}
          </text>
        )}
      </svg>
      {current && active !== null && (
        <div
          className={styles.tooltip}
          style={{ left: Math.min(Math.max(center(active), 70), width - 70), top: y(current.value) - 10 }}
          aria-hidden="true"
        >
          <strong>{current.valueText}</strong>
          <span>{current.labelText}</span>
        </div>
      )}
    </div>
  );
}

export interface BarItem {
  key: string;
  label: ReactNode;
  value: number;
  valueText: string;
  detail?: string;
  muted?: boolean; // "sem registro": cinza, fora do destaque
}

// Barras horizontais de uma série só, com o valor escrito na ponta; com `reference`, uma linha tracejada
// marca o valor de referência (ex.: a mediana da equipe) em todas as linhas
export function BarList({ items, label, reference }: {
  items: BarItem[];
  label: string;
  reference?: { value: number; label: string };
}) {
  const max = Math.max(1, reference?.value ?? 0, ...items.map(item => item.value));
  return (
    <>
      <ul className={styles.bars} aria-label={label}>
        {items.map((item, index) => (
          <li key={item.key} className={styles.barRow} style={step(index)}>
            <span className={styles.barLabel}>{item.label}</span>
            <span className={styles.barTrack}>
              {item.value > 0 && (
                <span className={`${styles.bar} ${item.muted ? styles.barMuted : ''}`} style={{ width: `${(item.value / max) * 100}%` }} />
              )}
              {reference && <span className={styles.barReference} style={{ left: `${(reference.value / max) * 100}%` }} />}
            </span>
            <span className={styles.barValue}>
              <strong>{item.valueText}</strong>
              {item.detail && <small>{item.detail}</small>}
            </span>
          </li>
        ))}
      </ul>
      {reference && (
        <p className={styles.referenceNote}><span className={styles.referenceKey} aria-hidden="true" /> {reference.label}</p>
      )}
    </>
  );
}

export interface RangeItem {
  key: string;
  label: ReactNode;
  median: number | null; // segundos
  p90: number | null;
  target?: number; // meta, em segundos
  color: string;
  summary: ReactNode;
}

// Topo da escala de tempo, em minutos: de 5 em 5 até 30, de 10 em 10 até 60 e de 30 em 30 depois
export function minutesScale(seconds: number): number {
  const minutes = Math.max(1, seconds / 60);
  const step = minutes <= 30 ? 5 : minutes <= 60 ? 10 : 30;
  return Math.ceil(minutes / step) * step;
}

/**
 * Mediana (barra) e percentil 90 (traço até o ponto) de cada linha na mesma escala, com a meta marcada.
 * A escala vai até o maior percentil 90 ou meta, arredondado.
 */
export function RangeList({ items, label }: { items: RangeItem[]; label: string }) {
  const largest = Math.max(0, ...items.flatMap(item => [item.median ?? 0, item.p90 ?? 0, item.target ?? 0]));
  const scale = minutesScale(largest) * 60;
  const at = (seconds: number) => `${Math.min(100, (seconds / scale) * 100)}%`;
  const hasTarget = items.some(item => item.target);

  return (
    <div className={styles.ranges}>
      <ul className={styles.rangeLegend} aria-hidden="true">
        <li><span className={styles.keyBar} /> Mediana</li>
        <li><span className={styles.keyWhisker} /> 9 em cada 10 até</li>
        {hasTarget && <li><span className={styles.keyTarget} /> Meta</li>}
      </ul>
      <ul className={styles.rangeRows} aria-label={label}>
        {items.map((item, index) => (
          <li key={item.key} className={styles.rangeRow} style={step(index)}>
            <span className={styles.rangeLabel}>{item.label}</span>
            <span className={styles.rangeTrack} style={{ color: item.color }}>
              {item.median !== null && <span className={styles.rangeBar} style={{ width: at(item.median) }} />}
              {item.median !== null && item.p90 !== null && item.p90 > item.median && (
                <span className={styles.rangeWhisker} style={{ left: at(item.median), width: `calc(${at(item.p90)} - ${at(item.median)})` }} />
              )}
              {item.p90 !== null && <span className={styles.rangeDot} style={{ left: at(item.p90) }} />}
              {item.target && <span className={styles.rangeTarget} style={{ left: at(item.target) }} title={`Meta: ${formatMinutes(item.target)}`} />}
            </span>
            <span className={styles.rangeSummary}>{item.summary}</span>
          </li>
        ))}
      </ul>
      <div className={styles.rangeAxis} aria-hidden="true">
        <span />
        <span className={styles.rangeTicks}>
          <span style={{ left: 0 }}>0</span>
          <span style={{ left: '50%' }}>{formatCount(scale / 120)} min</span>
          <span style={{ left: '100%' }}>{formatCount(scale / 60)} min</span>
        </span>
        <span />
      </div>
    </div>
  );
}

// Mediana de uma lista de números (null sem nenhum)
export function medianOf(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export interface BulletItem {
  key: string;
  label: ReactNode;
  value: number | null; // fração de 0 a 1
  color: string;
  summary: ReactNode;
}

// Faixas cinza do fundo (ruim, razoável, bom), como no gráfico de bala de Stephen Few
const BULLET_BANDS = [0.5, 0.8, 1];

/**
 * Gráfico de bala: a fração de cada linha (barra fina na cor da linha) sobre faixas cinza de 0 a 100%,
 * com a referência marcada em tinta (padrão: 90%, o "9 em cada 10" das metas de ambulância)
 */
export function BulletList({ items, label, reference = 0.9, referenceLabel = '9 em 10' }: {
  items: BulletItem[];
  label: string;
  reference?: number;
  referenceLabel?: string;
}) {
  return (
    <div className={styles.ranges}>
      <ul className={styles.rangeLegend} aria-hidden="true">
        <li><span className={styles.keyBar} /> Dentro da meta</li>
        <li><span className={styles.keyTarget} /> Referência: {referenceLabel} ({Math.round(reference * 100)}%)</li>
      </ul>
      <ul className={styles.rangeRows} aria-label={label}>
        {items.map((item, index) => (
          <li key={item.key} className={styles.rangeRow} style={step(index)}>
            <span className={styles.rangeLabel}>{item.label}</span>
            <span className={styles.bulletTrack} style={{ color: item.color }}>
              {BULLET_BANDS.map((band, bandIndex) => (
                <span
                  key={band}
                  className={styles.bulletBand}
                  style={{ left: `${(BULLET_BANDS[bandIndex - 1] ?? 0) * 100}%`, width: `${(band - (BULLET_BANDS[bandIndex - 1] ?? 0)) * 100}%` }}
                />
              ))}
              {item.value !== null && <span className={styles.bulletBar} style={{ width: `${Math.min(1, item.value) * 100}%` }} />}
              <span className={styles.rangeTarget} style={{ left: `${reference * 100}%` }} />
            </span>
            <span className={styles.rangeSummary}>{item.summary}</span>
          </li>
        ))}
      </ul>
      <div className={styles.rangeAxis} aria-hidden="true">
        <span />
        <span className={styles.rangeTicks}>
          <span style={{ left: 0 }}>0</span>
          <span style={{ left: '50%' }}>50%</span>
          <span style={{ left: '100%' }}>100%</span>
        </span>
        <span />
      </div>
    </div>
  );
}

// Regra do IHI para o gráfico de corrida: 6 ou mais pontos seguidos do mesmo lado da mediana
// (os pontos em cima da mediana não contam nem quebram a sequência) são um sinal, não acaso
export const SHIFT_RUN = 6;

export function shiftPoints(values: number[], median: number): Set<number> {
  const marked = new Set<number>();
  let run: number[] = [];
  let side = 0;
  values.forEach((value, index) => {
    const current = Math.sign(value - median);
    if (current === 0) return;
    if (current !== side) {
      if (run.length >= SHIFT_RUN) run.forEach(i => marked.add(i));
      run = [];
      side = current;
    }
    run.push(index);
  });
  if (run.length >= SHIFT_RUN) run.forEach(i => marked.add(i));
  return marked;
}

/**
 * Gráfico de corrida (run chart, padrão do IHI e do NHS): a série no tempo com a mediana tracejada;
 * as sequências de 6 ou mais pontos do mesmo lado da mediana ficam em tinta, com a nota embaixo
 */
export function RunChart({ points, tickLabel, label, unit, height = 180 }: {
  points: Column[];
  tickLabel: (index: number) => string | null;
  label: string;
  unit: string; // "/dia"
  height?: number;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>(600);
  const [active, setActive] = useState<number | null>(null);
  const values = points.map(point => point.value);
  const median = medianOf(values) ?? 0;
  const shifts = shiftPoints(values, median);
  const max = niceMax(Math.max(0, ...values));
  const plotWidth = Math.max(10, width - MARGIN.left - MARGIN.right);
  const plotHeight = height - MARGIN.top - MARGIN.bottom;
  const band = plotWidth / Math.max(1, points.length);
  const x = (index: number) => MARGIN.left + index * band + band / 2;
  const y = (value: number) => MARGIN.top + plotHeight - (value / max) * plotHeight;
  const ticks = [0, max / 2, max].filter(Number.isInteger);
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index)},${y(point.value)}`).join('');
  const current = active === null ? null : points[active];
  const medianText = formatCount(Math.round(median * 10) / 10);

  return (
    <div ref={ref} className={styles.columns}>
      <svg width={width} height={height} role="img" aria-label={`${label}; mediana ${medianText}${unit}`}>
        {ticks.map(tick => (
          <g key={tick}>
            <line className={styles.grid} x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)} />
            <text className={styles.axis} x={MARGIN.left - 6} y={y(tick)} dy="0.32em" textAnchor="end">{formatCount(tick)}</text>
          </g>
        ))}
        <line className={styles.medianLine} x1={MARGIN.left} x2={width - MARGIN.right} y1={y(median)} y2={y(median)} />
        <text className={styles.medianLabel} x={width - MARGIN.right} y={y(median) - 5} textAnchor="end">mediana {medianText}{unit}</text>
        {points.length > 1 && <path className={styles.runLine} d={line} pathLength={1} />}
        {points.map((point, index) => (
          <g key={point.key}>
            <circle
              className={`${styles.runDot} ${shifts.has(index) ? styles.runDotShift : ''}`}
              cx={x(index)}
              cy={y(point.value)}
              r={active === index ? 5 : 3.5}
            />
            {tickLabel(index) && <text className={styles.axis} x={x(index)} y={height - 6} textAnchor="middle">{tickLabel(index)}</text>}
            <rect
              className={styles.hit}
              x={MARGIN.left + index * band}
              y={MARGIN.top}
              width={band}
              height={plotHeight}
              tabIndex={0}
              aria-label={`${point.labelText}: ${point.valueText}`}
              onPointerEnter={() => setActive(index)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
            />
          </g>
        ))}
      </svg>
      {current && active !== null && (
        <div
          className={styles.tooltip}
          style={{ left: Math.min(Math.max(x(active), 70), width - 70), top: y(current.value) - 10 }}
          aria-hidden="true"
        >
          <strong>{current.valueText}</strong>
          <span>{current.labelText}</span>
        </div>
      )}
      {shifts.size > 0 && (
        <p className={styles.runNote}>
          <span className={styles.runNoteDot} aria-hidden="true" /> {SHIFT_RUN} ou mais dias seguidos do mesmo lado da mediana: mudança de
          padrão, não acaso.
        </p>
      )}
    </div>
  );
}
