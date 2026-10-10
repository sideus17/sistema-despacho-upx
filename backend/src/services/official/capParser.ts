import { Coordinates } from '../../types';

// Leitura de um alerta CAP 1.2 (<entry> do feed da Defesa Civil) e se ele vale para Sorocaba
const SOROCABA_IBGE = '3552205';
export const SOROCABA_CENTER: Coordinates = { lat: -23.5015, lng: -47.4526 };
// Centro e arredores (~6 km): polígono que pega só parte da cidade também vale
const SOROCABA_POINTS: Coordinates[] = [
  SOROCABA_CENTER,
  { lat: -23.447, lng: -47.4526 },
  { lat: -23.556, lng: -47.4526 },
  { lat: -23.5015, lng: -47.393 },
  { lat: -23.5015, lng: -47.512 }
];

export interface CapAlert {
  identifier: string;
  sent: string;
  status: string;
  msgType: string;
  references: string[]; // identificadores dos alertas que este atualiza ou cancela
  event: string;
  headline: string;
  expires: string | null;
  coversSorocaba: boolean;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decode = (text: string) =>
  text.replace(/&(#x?[0-9a-f]+|\w+);/gi, (match, entity: string) => {
    if (entity[0] === '#') return String.fromCodePoint(parseInt(entity.slice(entity[1] === 'x' ? 2 : 1), entity[1] === 'x' ? 16 : 10));
    return ENTITIES[entity] ?? match;
  });

const tag = (xml: string, name: string) => {
  const match = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return match ? decode(match[1].trim()) : null;
};
const tags = (xml: string, name: string) =>
  [...xml.matchAll(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'g'))].map(match => decode(match[1].trim()));

/**
 * O polígono CAP ("lat,lon lat,lon ...") cobre algum ponto de Sorocaba?
 * Percorre o texto direto, sem montar a lista de vértices: há alertas com dezenas de milhares deles.
 */
function polygonCovers(polygon: string): boolean {
  const inside = SOROCABA_POINTS.map(() => false);
  const edge = (aLat: number, aLng: number, bLat: number, bLng: number) => {
    SOROCABA_POINTS.forEach((point, i) => {
      if (aLat > point.lat !== bLat > point.lat && point.lng < ((bLng - aLng) * (point.lat - aLat)) / (bLat - aLat) + aLng) {
        inside[i] = !inside[i];
      }
    });
  };

  const pair = /(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g;
  let first: [number, number] | null = null;
  let previous: [number, number] | null = null;
  let match: RegExpExecArray | null;
  while ((match = pair.exec(polygon))) {
    const current: [number, number] = [Number(match[1]), Number(match[2])];
    if (previous) edge(previous[0], previous[1], current[0], current[1]);
    else first = current;
    previous = current;
  }
  if (first && previous) edge(previous[0], previous[1], first[0], first[1]);
  return inside.some(Boolean);
}

export function parseEntry(xml: string): CapAlert | null {
  const identifier = tag(xml, 'identifier');
  if (!identifier) return null;

  const geocodes = [...xml.matchAll(/<valueName>\s*IBGE\s*<\/valueName>\s*<value>\s*(\d+)\s*<\/value>/g)].map(match => match[1]);
  // Código IBGE com 7 dígitos ou o antigo, de 6 (sem o dígito verificador)
  const byCode = geocodes.some(code => code === SOROCABA_IBGE || (code.length === 6 && SOROCABA_IBGE.startsWith(code)));
  const byPolygon = !byCode && [...xml.matchAll(/<polygon>([\s\S]*?)<\/polygon>/g)].some(match => polygonCovers(match[1]));

  return {
    identifier,
    sent: tag(xml, 'sent') ?? new Date().toISOString(),
    status: tag(xml, 'status') ?? '',
    msgType: tag(xml, 'msgType') ?? '',
    // "remetente,identificador,envio" separados por espaço
    references: (tag(xml, 'references') ?? '').split(/\s+/).filter(Boolean).map(ref => ref.split(',')[1]).filter(Boolean),
    event: tag(xml, 'event') ?? 'Alerta',
    headline: tag(xml, 'headline') ?? '',
    expires: tag(xml, 'expires'),
    coversSorocaba: byCode || byPolygon
  };
}
