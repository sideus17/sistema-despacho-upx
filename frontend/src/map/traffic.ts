import { useEffect, useState } from 'react';
import type { ExpressionSpecification, LineLayerSpecification, StyleSpecification, VectorSourceSpecification } from 'maplibre-gl';
import { trafficTileUrl } from '../services/api';
import type { MapTheme } from './mapStyle';

// Trânsito ao vivo do TomTom: linhas de lentidão nas ruas, sempre ligadas, como no Waze

export const TRAFFIC_SOURCE = 'traffic';
export const TRAFFIC_LAYER = 'traffic-flow';
// Acima das ruas, pontes e prédios e abaixo dos nomes (as ocorrências e a rota ficam por cima de tudo)
export const TRAFFIC_BEFORE = 'waterway_line_label';
export const TRAFFIC_REFRESH_MS = 2 * 60_000;

// traffic_level = velocidade atual ÷ velocidade livre; a via livre não é desenhada
const FREE_FLOW = 0.75;
export const TRAFFIC_COLORS: Record<MapTheme, { slow: string; heavy: string; stopped: string }> = {
  day: { slow: '#f5b800', heavy: '#f97316', stopped: '#b91c1c' },
  night: { slow: '#facc15', heavy: '#fb923c', stopped: '#ef4444' }
};

export function trafficSource(version: number): VectorSourceSpecification {
  return { type: 'vector', tiles: [trafficTileUrl(version)], minzoom: 10, maxzoom: 16 };
}

export function trafficLayer(theme: MapTheme): LineLayerSpecification {
  const colors = TRAFFIC_COLORS[theme];
  // Mão única do trecho: a linha vai para o lado da pista, para os dois sentidos não se sobreporem
  const oneSide: ExpressionSpecification = ['==', ['get', 'traffic_road_coverage'], 'one_side'];
  return {
    id: TRAFFIC_LAYER,
    type: 'line',
    source: TRAFFIC_SOURCE,
    'source-layer': 'Traffic flow',
    filter: ['<', ['get', 'traffic_level'], FREE_FLOW],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': ['step', ['get', 'traffic_level'], colors.stopped, 0.25, colors.heavy, 0.5, colors.slow],
      'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.5, 13, 3, 16, 6, 18, 9],
      'line-offset': ['interpolate', ['linear'], ['zoom'], 12, ['case', oneSide, 1, 0], 16, ['case', oneSide, 3, 0], 18, ['case', oneSide, 5, 0]],
      'line-opacity': 0.9
    }
  };
}

// Para o estilo montado à mão (navegação): fonte e camada no lugar certo da pilha
export function withTrafficLayer(style: StyleSpecification, theme: MapTheme, version: number): StyleSpecification {
  const layers = [...style.layers];
  const index = layers.findIndex(layer => layer.id === TRAFFIC_BEFORE);
  layers.splice(index === -1 ? layers.length : index, 0, trafficLayer(theme));
  return { ...style, sources: { ...style.sources, [TRAFFIC_SOURCE]: trafficSource(version) }, layers };
}

// Versão dos blocos: muda a cada 2 min, e o mapa pede tudo de novo
export function useTrafficVersion(): number {
  const [version, setVersion] = useState(() => Math.floor(Date.now() / TRAFFIC_REFRESH_MS));
  useEffect(() => {
    const timer = window.setInterval(() => setVersion(Math.floor(Date.now() / TRAFFIC_REFRESH_MS)), 15_000);
    return () => window.clearInterval(timer);
  }, []);
  return version;
}
