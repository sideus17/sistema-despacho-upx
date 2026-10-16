import axios from 'axios';
import { Coordinates } from '../types';
import { tomtomConfigured, tomtomUrl } from './official/tomtom';
import { tomtomBudget } from './official/tomtomBudget';

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

const SOROCABA_CENTER: Coordinates = {
  lat: -23.5015,
  lng: -47.4526
};

// Sorocaba e arredores (Votorantim, Itu, Salto de Pirapora): chamado fora disso não é da central
export const SERVICE_AREA = { west: -47.65, south: -23.65, east: -47.30, north: -23.35 };
const REGION_BBOX = `${SERVICE_AREA.west},${SERVICE_AREA.south},${SERVICE_AREA.east},${SERVICE_AREA.north}`;

export function insideServiceArea(point: Coordinates): boolean {
  return point.lat >= SERVICE_AREA.south && point.lat <= SERVICE_AREA.north &&
    point.lng >= SERVICE_AREA.west && point.lng <= SERVICE_AREA.east;
}

const USER_AGENT = 'samu-despacho-academico/1.0 (projeto academico)';

// Cache das buscas em andamento ou prontas; resposta com erro sai na hora para a próxima tentar de novo
function cached<T>(cache: Map<string, { expires: number; result: Promise<T> }>, key: string, ttl: number, max: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.result;

  const result = load();
  cache.delete(key);
  cache.set(key, { expires: Date.now() + ttl, result });
  result.catch(() => cache.delete(key));
  for (const [oldKey, old] of cache) {
    if (cache.size <= max && old.expires > Date.now()) break;
    cache.delete(oldKey);
  }
  return result;
}

/**
 * Endereço digitado → ponto, para o chamado aberto sem escolher sugestão nem marcar no mapa.
 * TomTom primeiro (acha o número da casa), depois Nominatim (rua). Sem resultado na região: null
 * (o chamado não pode ir para um ponto inventado).
 */
export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  const [best] = await tomtomGeocode(address).catch(() => []);
  if (best) return best.location;

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
          viewbox: REGION_BBOX,
          bounded: 1
        },
        headers: {
          'User-Agent': USER_AGENT
        },
        timeout: 8000
      }
    );

    const result = response.data?.[0];
    const point = result && { lat: Number(result.lat), lng: Number(result.lon) };
    if (point && insideServiceArea(point)) return point;
  } catch (error) {
    console.warn('Nominatim não respondeu:', error instanceof Error ? error.message : error);
  }
  return null;
}

// ============================================
// AUTOCOMPLETAR (Photon)
// ============================================
// O Nominatim público proíbe busca a cada letra; o Photon (komoot, também OpenStreetMap) foi feito para isso.

const photonUrl = () => process.env.PHOTON_URL || 'https://photon.komoot.io';
const MAX_SUGGESTIONS = 6;
const SEARCH_CACHE_TTL = 10 * 60_000;
const SEARCH_CACHE_MAX = 300;

export interface PlaceSuggestion {
  label: string; // "Hospital Regional de Sorocaba" ou "Rua Quinze de Novembro, 120"
  detail: string; // "Vila Boa Vista, Sorocaba"
  location: Coordinates;
  street?: boolean; // a rua inteira (sem número): o ponto é de algum trecho dela
  approximate?: boolean; // o número digitado não foi achado: o ponto é o da rua
}

// Sugestão que só completa o texto (rua do CEP): a pessoa ainda digita o número
export interface FillSuggestion {
  label: string; // "Rua da Penha"
  detail: string; // "Centro, Sorocaba · CEP 18010-003"
  fill: string; // "Rua da Penha, "
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
    suggestions.push({ label, detail, location: { lat, lng }, ...(isStreet && !p.housenumber && { street: true }) });
  }
  return suggestions.slice(0, MAX_SUGGESTIONS);
}

const photonCache = new Map<string, { expires: number; result: Promise<PlaceSuggestion[]> }>();

function photonSearch(query: string): Promise<PlaceSuggestion[]> {
  const q = expandAbbreviations(query);
  return cached(photonCache, q.toLowerCase(), SEARCH_CACHE_TTL, SEARCH_CACHE_MAX, () =>
    axios
      .get(`${photonUrl()}/api/`, {
        params: { q, lat: SOROCABA_CENTER.lat, lon: SOROCABA_CENTER.lng, bbox: REGION_BBOX, limit: MAX_SUGGESTIONS * 2 },
        headers: { 'User-Agent': USER_AGENT },
        timeout: 6000
      })
      .then(response => parsePhotonFeatures(response.data))
  );
}

// ============================================
// NÚMERO DA CASA (TomTom Geocode)
// ============================================
// O Photon só conhece a rua; o TomTom acha o número ("Rua Maylasky, 54" → o prédio)

const TOMTOM_MIN_SCORE = 0.7;
const TOMTOM_TYPES = new Set(['Point Address', 'Address Range', 'Street', 'Cross Street']);

// Número da casa: "Rua da Penha, 890" → 890, "Rua XV de Novembro 120" → 120; "Rua 7 de Setembro" não tem
export function houseNumberOf(query: string): string | null {
  const match = query.match(/,\s*(\d{1,5}[a-z]?)\b/i) ?? query.trim().match(/\s(\d{1,5}\s*[a-z]?)$/i);
  return match ? match[1].replace(/\s+/g, '').toUpperCase() : null;
}

export function hasHouseNumber(query: string): boolean {
  return houseNumberOf(query) !== null;
}

// Resultados do TomTom → sugestões na região, só as de boa confiança
export function parseTomTomGeocode(data: any): PlaceSuggestion[] {
  const suggestions: PlaceSuggestion[] = [];
  for (const result of data?.results ?? []) {
    const address = result.address ?? {};
    const location = { lat: Number(result.position?.lat), lng: Number(result.position?.lon) };
    if (!TOMTOM_TYPES.has(result.type) || !address.streetName) continue;
    if (!(Number(result.matchConfidence?.score) >= TOMTOM_MIN_SCORE)) continue;
    if (!Number.isFinite(location.lat) || !Number.isFinite(location.lng) || !insideServiceArea(location)) continue;

    const label = [address.streetName, address.streetNumber].filter(Boolean).join(', ');
    const detail = [address.municipalitySubdivision, address.municipality].filter(Boolean).join(', ');
    if (suggestions.some(item => item.label === label && item.detail === detail)) continue;
    suggestions.push({ label, detail, location, ...(!address.streetNumber && { street: true }) });
  }
  return suggestions;
}

const tomtomCache = new Map<string, { expires: number; result: Promise<PlaceSuggestion[]> }>();

export function tomtomGeocode(query: string): Promise<PlaceSuggestion[]> {
  if (!tomtomConfigured()) return Promise.resolve([]);
  const q = expandAbbreviations(query);
  return cached(tomtomCache, q.toLowerCase(), SEARCH_CACHE_TTL, SEARCH_CACHE_MAX, async () => {
    // Consulta de baixa prioridade: os incidentes de trânsito vêm antes no limite do dia
    if (!tomtomBudget.spend('request', true)) return [];
    try {
      const response = await axios.get(`${tomtomUrl()}/search/2/geocode/${encodeURIComponent(q)}.json`, {
        params: {
          key: process.env.TOMTOM_API_KEY,
          countrySet: 'BR',
          lat: SOROCABA_CENTER.lat,
          lon: SOROCABA_CENTER.lng,
          radius: 30000,
          limit: 3,
          language: 'pt-BR'
        },
        timeout: 5000
      });
      return parseTomTomGeocode(response.data);
    } catch (error) {
      // A mensagem do axios teria a URL com a chave
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      throw new Error(status ? `TomTom respondeu ${status}` : 'TomTom não respondeu');
    }
  });
}

// ============================================
// CEP (ViaCEP)
// ============================================
// O ViaCEP dá rua e bairro, sem ponto: a sugestão completa o texto e a pessoa digita o número

const CEP_CACHE_TTL = 24 * 60 * 60_000;

// "18010-003", "18010003" → "18010003"; o resto não é CEP
export function normalizeCep(query: string): string | null {
  const match = query.trim().match(/^(\d{5})-?(\d{3})$/);
  return match ? match[1] + match[2] : null;
}

export function parseViaCep(data: any): FillSuggestion | null {
  const street = typeof data?.logradouro === 'string' ? data.logradouro.trim() : '';
  // CEP inexistente ({ erro: "true" }) ou geral da cidade (sem rua): não há o que completar
  if (data?.erro || !street) return null;
  const place = [data.bairro, data.localidade].filter(Boolean).join(', ');
  return { label: street, detail: [place, `CEP ${data.cep}`].filter(Boolean).join(' · '), fill: `${street}, ` };
}

const cepCache = new Map<string, { expires: number; result: Promise<FillSuggestion | null> }>();

function lookupCep(cep: string): Promise<FillSuggestion | null> {
  return cached(cepCache, cep, CEP_CACHE_TTL, SEARCH_CACHE_MAX, () =>
    axios
      .get(`https://viacep.com.br/ws/${cep}/json/`, { headers: { 'User-Agent': USER_AGENT }, timeout: 5000 })
      .then(response => parseViaCep(response.data))
  );
}

/**
 * Autocompletar: CEP → a rua para completar; com número → o ponto exato do TomTom primeiro;
 * o resto (locais, ruas, bairros) vem do Photon.
 */
export async function searchPlaces(query: string): Promise<Array<PlaceSuggestion | FillSuggestion>> {
  const cep = normalizeCep(query);
  if (cep) {
    const street = await lookupCep(cep);
    return street ? [street] : [];
  }

  const number = houseNumberOf(query);
  if (!number) return photonSearch(query);

  const [exact, photon] = await Promise.allSettled([tomtomGeocode(query), photonSearch(query)]);
  // As duas fora do ar: o erro do Photon vira o "a busca não respondeu"
  if (exact.status === 'rejected' && photon.status === 'rejected') throw photon.reason;
  const found = [
    ...(exact.status === 'fulfilled' ? exact.value : []),
    ...(photon.status === 'fulfilled' ? photon.value : [])
  ];
  return withHouseNumber(found, query, number).slice(0, MAX_SUGGESTIONS);
}

const plain = (text: string) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const STREET_TYPE = /^(rua|avenida|alameda|travessa|praca|rodovia|estrada|largo|viela)\s+/;

/**
 * Busca com número: a rua digitada, achada sem aquele número, fica com o número e marcada como ponto
 * aproximado (o chamado não pode perder o número); a mesma sugestão repetida sai, valendo a primeira.
 */
export function withHouseNumber(places: PlaceSuggestion[], query: string, number: string): PlaceSuggestion[] {
  const typed = plain(expandAbbreviations(query));
  const seen = new Set<string>();
  const result: PlaceSuggestion[] = [];
  for (const { street, ...place } of places) {
    // Só a rua que a pessoa digitou ganha o número (uma rua parecida, não)
    const sameStreet = street && typed.includes(plain(place.label).replace(STREET_TYPE, ''));
    const item = sameStreet ? { ...place, label: `${place.label}, ${number}`, approximate: true } : place;
    const key = `${item.label}|${item.detail}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  // O ponto exato vem antes do aproximado
  return result.sort((a, b) => Number(!!a.approximate) - Number(!!b.approximate));
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
