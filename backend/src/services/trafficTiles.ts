import axios from 'axios';
import { tomtomConfigured, tomtomUrl } from './official/tomtom';

// Blocos vetoriais de fluxo do TomTom, servidos pelo backend: a chave não vai para o navegador

export const TRAFFIC_MIN_ZOOM = 10;
export const TRAFFIC_MAX_ZOOM = 16; // acima disso o MapLibre amplia o bloco do zoom 16

// Região de Sorocaba e vizinhas (oeste, sul, leste, norte): o proxy não serve o resto do mundo
const REGION = { west: -47.75, south: -23.75, east: -47.15, north: -23.25 };

const TILE_TTL = 2 * 60_000; // o TomTom renova o fluxo a cada minuto
const TILE_CACHE_MAX = 1500;

const lngToTileX = (lng: number, z: number) => Math.floor(((lng + 180) / 360) * 2 ** z);
const latToTileY = (lat: number, z: number) => {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z);
};

// Bloco dentro da faixa de zoom e encostando na região de Sorocaba
export function trafficTileAllowed(z: number, x: number, y: number): boolean {
  if (![z, x, y].every(Number.isInteger) || z < TRAFFIC_MIN_ZOOM || z > TRAFFIC_MAX_ZOOM) return false;
  return (
    x >= lngToTileX(REGION.west, z) && x <= lngToTileX(REGION.east, z) &&
    y >= latToTileY(REGION.north, z) && y <= latToTileY(REGION.south, z)
  );
}

const cache = new Map<string, { expires: number; tile: Promise<Buffer | null> }>();

async function fetchTile(z: number, x: number, y: number): Promise<Buffer | null> {
  try {
    const response = await axios.get(`${tomtomUrl()}/traffic/map/4/tile/flow/relative/${z}/${x}/${y}.pbf`, {
      params: { key: process.env.TOMTOM_API_KEY },
      responseType: 'arraybuffer',
      timeout: 8000
    });
    return Buffer.from(response.data);
  } catch {
    // Sem o bloco o mapa só fica sem trânsito naquele pedaço (a mensagem do erro teria a chave)
    return null;
  }
}

// Bloco do cache (compartilhado por todos os usuários) ou do TomTom; null quando não há
export function trafficTile(z: number, x: number, y: number): Promise<Buffer | null> {
  if (!tomtomConfigured()) return Promise.resolve(null);
  const key = `${z}/${x}/${y}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.tile;

  const tile = fetchTile(z, x, y);
  cache.delete(key);
  cache.set(key, { expires: Date.now() + TILE_TTL, tile });
  // Falha não fica guardada: o próximo pedido tenta de novo
  tile.then(result => { if (!result) cache.delete(key); });
  for (const [oldKey, old] of cache) {
    if (cache.size <= TILE_CACHE_MAX && old.expires > Date.now()) break;
    cache.delete(oldKey);
  }
  return tile;
}
