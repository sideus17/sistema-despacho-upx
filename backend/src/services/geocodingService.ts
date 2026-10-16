import axios from 'axios';
import { Coordinates } from '../types';

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

const SOROCABA_CENTER: Coordinates = {
  lat: -23.5015,
  lng: -47.4526
};

const demoAddressCoordinates: Array<{ keywords: string[]; coordinates: Coordinates }> = [
  {
    keywords: ['general carneiro'],
    coordinates: { lat: -23.5089, lng: -47.4578 }
  },
  {
    keywords: ['rua aparecida', 'vila hortencia', 'vila hortência'],
    coordinates: { lat: -23.4923, lng: -47.4512 }
  },
  {
    keywords: ['rua da penha', 'jardim vergueiro'],
    coordinates: { lat: -23.5134, lng: -47.4721 }
  },
  {
    keywords: ['campolim'],
    coordinates: { lat: -23.5366, lng: -47.4637 }
  },
  {
    keywords: ['iguatemi esplanada'],
    coordinates: { lat: -23.5362, lng: -47.4646 }
  },
  {
    keywords: ['pao de acucar', 'pão de açúcar', 'avenida sao paulo', 'avenida são paulo'],
    coordinates: { lat: -23.4965, lng: -47.4276 }
  }
];

function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getDemoCoordinate(address: string): Coordinates {
  const normalized = normalizeAddress(address);
  const match = demoAddressCoordinates.find(item =>
    item.keywords.some(keyword => normalized.includes(normalizeAddress(keyword)))
  );

  if (match) {
    return match.coordinates;
  }

  // Fallback determinístico perto do centro de Sorocaba para ambientes sem internet.
  // Assim, a demonstração acadêmica continua funcionando mesmo quando o Nominatim não responde.
  const hash = normalized.split('').reduce((total, char) => total + char.charCodeAt(0), 0);
  const latOffset = ((hash % 80) - 40) / 10000;
  const lngOffset = (((hash * 7) % 80) - 40) / 10000;

  return {
    lat: Number((SOROCABA_CENTER.lat + latOffset).toFixed(6)),
    lng: Number((SOROCABA_CENTER.lng + lngOffset).toFixed(6))
  };
}

export async function geocodeAddress(address: string): Promise<Coordinates> {
  const fullAddress = address.toLowerCase().includes('sorocaba')
    ? address
    : `${address}, Sorocaba, SP, Brasil`;

  try {
    const response = await axios.get<NominatimResult[]>(
      'https://nominatim.openstreetmap.org/search',
      {
        params: {
          q: fullAddress,
          format: 'json',
          limit: 1,
          addressdetails: 1
        },
        headers: {
          'User-Agent': 'sistema-samu-academico/1.0'
        },
        timeout: 8000
      }
    );

    if (response.data && response.data.length > 0) {
      const result = response.data[0];

      return {
        lat: Number(result.lat),
        lng: Number(result.lon)
      };
    }
  } catch (error) {
    console.warn('Nominatim indisponível. Usando coordenada mockada para demonstração.', error);
  }

  return getDemoCoordinate(address);
}

// ============================================
// AUTOCOMPLETAR (Photon)
// ============================================
// O Nominatim público proíbe busca a cada letra; o Photon (komoot, também OpenStreetMap) foi feito para isso.

const photonUrl = () => process.env.PHOTON_URL || 'https://photon.komoot.io';
// Sorocaba e arredores (Votorantim, Itu, Salto de Pirapora): minLon, minLat, maxLon, maxLat
const REGION_BBOX = '-47.65,-23.65,-47.30,-23.35';
const MAX_SUGGESTIONS = 6;
const SEARCH_CACHE_TTL = 10 * 60_000;
const SEARCH_CACHE_MAX = 300;
const USER_AGENT = 'samu-despacho-academico/1.0 (projeto academico)';

export interface PlaceSuggestion {
  label: string; // "Hospital Regional de Sorocaba" ou "Rua Quinze de Novembro, 120"
  detail: string; // "Vila Boa Vista, Sorocaba"
  location: Coordinates;
}

const ABBREVIATIONS: Record<string, string> = {
  av: 'avenida',
  r: 'rua',
  al: 'alameda',
  pc: 'praça',
  pca: 'praça',
  'pç': 'praça',
  rod: 'rodovia',
  estr: 'estrada',
  trav: 'travessa',
  dr: 'doutor',
  prof: 'professor',
  pres: 'presidente',
  sta: 'santa',
  sto: 'santo'
};

// "av sao paulo" → "avenida sao paulo": o Photon acha bem mais com a palavra inteira
export function expandAbbreviations(query: string): string {
  return query
    .trim()
    .split(/\s+/)
    .map(word => ABBREVIATIONS[word.toLowerCase().replace(/\.$/, '')] ?? word)
    .join(' ');
}

// Resposta do Photon (GeoJSON) → sugestões curtas, sem repetidas
export function parsePhotonFeatures(data: any): PlaceSuggestion[] {
  const seen = new Set<string>();
  const suggestions: PlaceSuggestion[] = [];

  for (const feature of data?.features ?? []) {
    const p = feature.properties ?? {};
    const [lng, lat] = feature.geometry?.coordinates ?? [];
    if (typeof lat !== 'number' || typeof lng !== 'number') continue;

    const street = [p.street, p.housenumber].filter(Boolean).join(', ');
    const isStreet = p.osm_key === 'highway' || p.type === 'street';
    const label = p.name || street || p.district || p.city;
    if (!label) continue;

    const detail = [isStreet || label === street ? null : street, p.district, p.city ?? p.county]
      .filter((part, index, all) => part && part !== label && all.indexOf(part) === index)
      .join(', ');

    const key = `${label}|${detail}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push({ label, detail, location: { lat, lng } });
  }
  return suggestions.slice(0, MAX_SUGGESTIONS);
}

const searchCache = new Map<string, { expires: number; result: Promise<PlaceSuggestion[]> }>();

export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  const q = expandAbbreviations(query);
  const key = q.toLowerCase();
  const cached = searchCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.result;

  const result = axios
    .get(`${photonUrl()}/api/`, {
      params: { q, lat: SOROCABA_CENTER.lat, lon: SOROCABA_CENTER.lng, bbox: REGION_BBOX, limit: MAX_SUGGESTIONS * 2 },
      headers: { 'User-Agent': USER_AGENT },
      timeout: 6000
    })
    .then(response => parsePhotonFeatures(response.data));

  searchCache.set(key, { expires: Date.now() + SEARCH_CACHE_TTL, result });
  result.catch(() => searchCache.delete(key));
  for (const [oldKey, old] of searchCache) {
    if (searchCache.size <= SEARCH_CACHE_MAX && old.expires > Date.now()) break;
    searchCache.delete(oldKey);
  }
  return result;
}

export async function reversePlace(point: Coordinates): Promise<PlaceSuggestion | null> {
  const response = await axios.get(`${photonUrl()}/reverse`, {
    params: { lat: point.lat, lon: point.lng, limit: 1 },
    headers: { 'User-Agent': USER_AGENT },
    timeout: 6000
  });
  const [place] = parsePhotonFeatures(response.data);
  // O nome é do lugar mais próximo; o ponto continua sendo o que foi clicado
  return place ? { ...place, location: point } : null;
}
