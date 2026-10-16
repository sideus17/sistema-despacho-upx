import { ReactNode, RefObject, useLayoutEffect, useRef, useState } from 'react';
import { formatCount, formatMinutes, niceMax } from './format';
import styles from './charts.module.css';

// Peças dos gráficos da gestão, em SVG e HTML próprios (sem biblioteca): cartão com a versão em
// tabela, número em destaque, colunas com dica ao passar o mouse e barras horizontais.

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

// Barras horizontais de uma série só, com o valor escrito na ponta
export function BarList({ items, label }: { items: BarItem[]; label: string }) {
  const max = Math.max(1, ...items.map(item => item.value));
  return (
    <ul className={styles.bars} aria-label={label}>
      {items.map(item => (
        <li key={item.key} className={styles.barRow}>
          <span className={styles.barLabel}>{item.label}</span>
          <span className={styles.barTrack}>
            {item.value > 0 && (
              <span className={`${styles.bar} ${item.muted ? styles.barMuted : ''}`} style={{ width: `${(item.value / max) * 100}%` }} />
            )}
          </span>
          <span className={styles.barValue}>
            <strong>{item.valueText}</strong>
            {item.detail && <small>{item.detail}</small>}
          </span>
        </li>
      ))}
    </ul>
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
        {items.map(item => (
          <li key={item.key} className={styles.rangeRow}>
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
