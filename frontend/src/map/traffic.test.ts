import { describe, expect, it, vi } from 'vitest';
import type { StyleSpecification } from 'maplibre-gl';
import { trafficTileUrl, withAuthRequest } from '../services/api';
import { TRAFFIC_LAYER, TRAFFIC_SOURCE, withTrafficLayer } from './traffic';

vi.mock('../lib/supabase', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'token-da-sessao' } } }) } }
}));

const style = (ids: string[]): StyleSpecification => ({
  version: 8,
  sources: {},
  layers: ids.map(id => ({ id, type: 'background' }))
});

describe('camada de trânsito', () => {
  it('entra antes dos nomes das ruas, acima das vias', () => {
    const result = withTrafficLayer(style(['road_primary', 'bridge_primary', 'waterway_line_label', 'label_city']), 'day', 1);
    expect(result.layers.map(layer => layer.id)).toEqual(['road_primary', 'bridge_primary', TRAFFIC_LAYER, 'waterway_line_label', 'label_city']);
    expect(result.sources[TRAFFIC_SOURCE]).toMatchObject({ type: 'vector', maxzoom: 16 });
  });

  it('sem a camada de referência, vai por último', () => {
    const result = withTrafficLayer(style(['road_primary']), 'night', 1);
    expect(result.layers.map(layer => layer.id)).toEqual(['road_primary', TRAFFIC_LAYER]);
  });

  it('os blocos mudam de endereço a cada versão, para o mapa pedir de novo', () => {
    expect(trafficTileUrl(1)).toMatch(/\/traffic\/flow\/\{z\}\/\{x\}\/\{y\}\.pbf\?v=1$/);
    expect(trafficTileUrl(2)).not.toBe(trafficTileUrl(1));
  });

  it('o token vai só nos pedidos para a nossa API, nunca para o servidor do mapa', async () => {
    const tile = trafficTileUrl(1).replace('{z}/{x}/{y}', '14/6032/9292');
    expect(await withAuthRequest(tile)).toEqual({ url: tile, headers: { Authorization: 'Bearer token-da-sessao' } });
    const basemap = 'https://tiles.openfreemap.org/planet/1/14/6032/9292.pbf';
    expect(await withAuthRequest(basemap)).toEqual({ url: basemap });
  });
});
