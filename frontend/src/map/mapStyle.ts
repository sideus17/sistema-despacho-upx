import type { StyleSpecification } from 'maplibre-gl';

export type MapTheme = 'day' | 'night';

// Base: estilo Liberty do OpenFreeMap (tiles no formato OpenMapTiles, grátis e com uso comercial liberado).
// Para ter SLA no futuro basta apontar para MapTiler ou tiles próprios: os nomes das camadas são os mesmos.
export const BASE_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

export const ROUTE_COLORS: Record<MapTheme, { line: string; casing: string }> = {
  day: { line: '#1d8cf8', casing: '#0d47a1' },
  night: { line: '#4fc3f7', casing: '#01579b' }
};

// Caminhos alternativos: cinza-azulado por baixo da rota escolhida, como no Waze
export const ALT_ROUTE_COLORS: Record<MapTheme, { line: string; casing: string }> = {
  day: { line: '#a3b5c9', casing: '#6b7f96' },
  night: { line: '#5b6b80', casing: '#2f3a48' }
};

type RoadKind = 'motorway' | 'primary' | 'secondary' | 'minor';

interface Palette {
  background: string;
  residential: string;
  park: string;
  wood: string;
  water: string;
  hospitalArea: string;
  otherArea: string;
  building: string;
  buildingOutline: string;
  rail: string;
  boundary: string;
  aeroway: string;
  roads: Record<RoadKind, { fill: string; casing: string }>;
  label: string;
  areaLabel: string;
  roadLabel: string;
  waterLabel: string;
  halo: string;
  poiHealth: string;
  poiSafety: string;
  oneWayOpacity: number;
}

// Inspirado no Waze: fundo claro e quente, ruas brancas largas, vias principais em amarelo/laranja
const DAY: Palette = {
  background: '#eeebe5',
  residential: 'rgba(0, 0, 0, 0)',
  park: '#cdebbd',
  wood: 'rgba(186, 224, 165, 0.6)',
  water: '#a6d3f2',
  hospitalArea: '#fbe1e1',
  otherArea: '#ebe8d9',
  building: '#e4dfd5',
  buildingOutline: '#d6cfc2',
  rail: '#c4c0b8',
  boundary: '#a9a49b',
  aeroway: '#e6e3dc',
  roads: {
    minor: { fill: '#ffffff', casing: '#cfc8bb' },
    secondary: { fill: '#fff3c4', casing: '#e2c77a' },
    primary: { fill: '#ffe17a', casing: '#d9ab3a' },
    motorway: { fill: '#ffc247', casing: '#d48a1c' }
  },
  label: '#2e3238',
  areaLabel: '#7d838c',
  roadLabel: '#3a3f47',
  waterLabel: '#3f6ea8',
  halo: '#ffffff',
  poiHealth: '#d32f2f',
  poiSafety: '#37474f',
  oneWayOpacity: 0.8
};

// Azul-acinzentado escuro: não ofusca o motorista à noite
const NIGHT: Palette = {
  background: '#1c2531',
  residential: 'rgba(0, 0, 0, 0)',
  park: '#1f3529',
  wood: 'rgba(31, 58, 44, 0.6)',
  water: '#13304b',
  hospitalArea: '#3b2531',
  otherArea: '#222c38',
  building: '#27313f',
  buildingOutline: '#303c4c',
  rail: '#3e4a5a',
  boundary: '#5a6678',
  aeroway: '#28323f',
  roads: {
    minor: { fill: '#3a4656', casing: '#161d27' },
    secondary: { fill: '#4b586b', casing: '#161d27' },
    primary: { fill: '#8a7646', casing: '#2a2414' },
    motorway: { fill: '#b0843e', casing: '#33240f' }
  },
  label: '#d5dce6',
  areaLabel: '#7f8a99',
  roadLabel: '#c3ccd8',
  waterLabel: '#7fa8d6',
  halo: '#1c2531',
  poiHealth: '#ff8a80',
  poiSafety: '#b0bec5',
  oneWayOpacity: 0.4
};

const PALETTES: Record<MapTheme, Palette> = { day: DAY, night: NIGHT };

// Fundo enquanto o mapa carrega, para não piscar branco à noite
export const MAP_BACKGROUND: Record<MapTheme, string> = { day: DAY.background, night: NIGHT.background };

// Ruas mais largas que no Liberty, como no Waze
const ROAD_WIDTH_FACTOR = 1.25;

// Ruído para quem dirige: relevo, calçadões, prédios 3D, comércio e pontos de ônibus
const HIDDEN = /^(natural_earth|road_area_pattern|building-3d|poi_r7|poi_r20|poi_transit)$|path_pedestrian/;

// Nomes em português quando o OpenStreetMap tiver, senão o nome local
const NAME = ['coalesce', ['get', 'name:pt'], ['get', 'name']];

// Só o que importa para o atendimento continua no mapa
const EMERGENCY_POI_CLASSES = ['hospital', 'doctors', 'police', 'fire_station'];

type Layer = {
  id: string;
  type: string;
  minzoom?: number;
  filter?: unknown;
  layout?: Record<string, unknown>;
  paint?: Record<string, unknown>;
};

function roadKind(id: string): RoadKind | null {
  if (id.includes('motorway')) return 'motorway';
  if (id.includes('trunk_primary') || /_link(_casing)?$/.test(id)) return 'primary';
  if (id.includes('secondary_tertiary')) return 'secondary';
  if (/minor|street|service_track/.test(id)) return 'minor';
  return null;
}

function scaleWidth(value: unknown, factor: number): unknown {
  if (typeof value === 'number') return value * factor;
  // ['interpolate', tipo, ['zoom'], zoom1, largura1, zoom2, largura2, ...]
  if (Array.isArray(value) && value[0] === 'interpolate') {
    return value.map((item, index) => (index >= 4 && index % 2 === 0 ? scaleWidth(item, factor) : item));
  }
  return value;
}

function restyle(layer: Layer, p: Palette): Layer | null {
  const { id } = layer;
  if (HIDDEN.test(id)) return null;

  const paint = { ...layer.paint };
  const layout = { ...layer.layout };
  const fill = (color: string) => (paint['fill-color'] = color);
  const line = (color: string) => (paint['line-color'] = color);

  if (id === 'poi_r1') {
    return {
      ...layer,
      id: 'poi_emergencia',
      minzoom: 14,
      filter: [
        'all',
        ['match', ['geometry-type'], ['MultiPoint', 'Point'], true, false],
        ['match', ['get', 'class'], EMERGENCY_POI_CLASSES, true, false]
      ],
      layout: {
        ...layout,
        'icon-image': ['get', 'class'],
        'text-field': NAME,
        'text-font': ['Noto Sans Bold'],
        'text-size': 12,
        'text-optional': true,
        'symbol-sort-key': ['get', 'rank']
      },
      paint: {
        'text-color': ['match', ['get', 'class'], ['hospital', 'doctors'], p.poiHealth, p.poiSafety],
        'text-halo-color': p.halo,
        'text-halo-width': 1.5
      }
    };
  }

  const kind = layer.type === 'line' ? roadKind(id) : null;

  if (id === 'background') paint['background-color'] = p.background;
  else if (id === 'landuse_residential') fill(p.residential);
  else if (id === 'park' || id === 'landcover_grass') fill(p.park);
  else if (id === 'park_outline') line(p.park);
  else if (id === 'landcover_wood') fill(p.wood);
  else if (id === 'water') fill(p.water);
  else if (id.startsWith('waterway_') && layer.type === 'line') line(p.water);
  else if (id === 'landuse_hospital') fill(p.hospitalArea);
  else if (/^landuse_|^landcover_(sand|ice|wetland)$/.test(id)) fill(p.otherArea);
  else if (id === 'aeroway_fill') fill(p.aeroway);
  else if (id.startsWith('aeroway_')) line(p.aeroway);
  else if (id === 'building') {
    // Prédios só de perto: na visão da cidade o mapa fica limpo, como no Waze
    fill(p.building);
    paint['fill-outline-color'] = p.buildingOutline;
    return { ...layer, minzoom: 15, paint };
  } else if (id.includes('rail')) line(p.rail);
  else if (id.startsWith('boundary_')) line(p.boundary);
  else if (kind) {
    line(id.endsWith('_casing') ? p.roads[kind].casing : p.roads[kind].fill);
    paint['line-width'] = scaleWidth(paint['line-width'], ROAD_WIDTH_FACTOR);
  } else if (id === 'road_one_way_arrow' || id === 'road_one_way_arrow_opposite') {
    paint['icon-opacity'] = p.oneWayOpacity;
  }

  if (layer.type === 'symbol' && layout['text-field']) {
    // Escudos de rodovia mostram o número (ref); o resto mostra o nome
    if (JSON.stringify(layout['text-field']).includes('name')) layout['text-field'] = NAME;
    paint['text-halo-color'] = p.halo;

    if (id.startsWith('highway-name')) {
      paint['text-color'] = p.roadLabel;
      paint['text-halo-width'] = 2;
      layout['text-font'] = ['Noto Sans Bold'];
      layout['text-size'] = ['interpolate', ['linear'], ['zoom'], 13, 12, 16, 15, 19, 18];
    } else if (id.startsWith('water')) {
      paint['text-color'] = p.waterLabel;
    } else if (id === 'label_other') {
      // Bairros mais discretos que ruas e cidades
      paint['text-color'] = p.areaLabel;
    } else if (id.startsWith('label_') || id === 'airport') {
      paint['text-color'] = p.label;
      if (id === 'label_city' || id === 'label_town') layout['text-font'] = ['Noto Sans Bold'];
    }
  }

  return { ...layer, layout, paint };
}

function samuStyle(base: StyleSpecification, theme: MapTheme): StyleSpecification {
  const palette = PALETTES[theme];
  const layers = (structuredClone(base.layers) as unknown as Layer[])
    .map(layer => restyle(layer, palette))
    .filter((layer): layer is Layer => layer !== null);

  return { ...structuredClone(base), name: `SAMU ${theme === 'day' ? 'Dia' : 'Noite'}`, layers } as StyleSpecification;
}

let baseStyle: Promise<StyleSpecification> | null = null;

function fetchBaseStyle(): Promise<StyleSpecification> {
  baseStyle ??= fetch(BASE_STYLE_URL)
    .then(response => {
      if (!response.ok) throw new Error(`Estilo do mapa indisponível (${response.status})`);
      return response.json() as Promise<StyleSpecification>;
    })
    .catch(error => {
      // Deixa tentar de novo na próxima vez (ex.: voltou o sinal)
      baseStyle = null;
      throw error;
    });
  return baseStyle;
}

export async function loadMapStyle(theme: MapTheme): Promise<StyleSpecification> {
  return samuStyle(await fetchBaseStyle(), theme);
}
