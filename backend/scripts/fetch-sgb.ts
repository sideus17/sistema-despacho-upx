/**
 * Gera src/data/sgb-setores-sorocaba.json: setores de risco do SGB/CPRM em Sorocaba sujeitos a
 * inundação, enchente ou enxurrada, com contorno, centro e raio (para cruzar com a chuva do CEMADEN).
 * Uso: npx tsx scripts/fetch-sgb.ts   (rodar de novo quando o SGB atualizar o mapeamento)
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { distanceMeters } from '../src/services/geo';

const SOROCABA_IBGE = '3552205';
const URL = 'https://geoportal.sgb.gov.br/server/rest/services/gestaoterritorial/risco/MapServer/0/query';
const FLOOD_TYPES = ['Inundação', 'Enchente', 'Enxurrada', 'Alagamento'];
const OUTPUT = join(__dirname, '../src/data/sgb-setores-sorocaba.json');

async function main() {
  const params = new URLSearchParams({ where: `cd_geocmu='${SOROCABA_IBGE}'`, outFields: '*', outSR: '4326', f: 'geojson' });
  const response = await fetch(`${URL}?${params}`);
  if (!response.ok) throw new Error(`SGB respondeu ${response.status}`);
  const data = await response.json();

  const sectors = data.features
    .map((feature: any) => {
      const p = feature.properties;
      const types: string[] = [1, 2, 3, 4, 5].map(i => p[`tipolo_g${i}`]).filter(Boolean);
      const ring: [number, number][] = feature.geometry.coordinates[0].map(([lng, lat]: number[]) => [
        Number(lng.toFixed(6)),
        Number(lat.toFixed(6))
      ]);
      const vertices = ring.slice(0, -1);
      const center = {
        lat: Number((vertices.reduce((sum, [, lat]) => sum + lat, 0) / vertices.length).toFixed(6)),
        lng: Number((vertices.reduce((sum, [lng]) => sum + lng, 0) / vertices.length).toFixed(6))
      };
      const radius = Math.ceil(Math.max(...vertices.map(([lng, lat]) => distanceMeters(center, { lat, lng }))));
      return {
        id: p.num_setor,
        local: (p.local ?? '').trim(),
        types: [...new Set(types)],
        risk: p.grau_risco,
        center,
        radius,
        geometry: { type: 'Polygon', coordinates: [ring] }
      };
    })
    .filter((sector: { types: string[] }) => sector.types.some(type => FLOOD_TYPES.includes(type)))
    .sort((a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id));

  writeFileSync(OUTPUT, JSON.stringify({ source: 'SGB/CPRM', fetchedAt: new Date().toISOString(), sectors }, null, 1) + '\n');
  console.log(`${data.features.length} setores em Sorocaba, ${sectors.length} de inundação/enxurrada → ${OUTPUT}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
