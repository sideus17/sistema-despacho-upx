/**
 * Gera src/data/cemaden-estacoes-sorocaba.json: estações do CEMADEN em Sorocaba com coordenadas.
 * Precisa de CEMADEN_EMAIL e CEMADEN_PASSWORD no .env.
 * Uso: npx tsx scripts/fetch-cemaden-stations.ts
 */
import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cemadenGet } from '../src/services/official/cemadenApi';

const SOROCABA_IBGE = 3552205;
const OUTPUT = join(__dirname, '../src/data/cemaden-estacoes-sorocaba.json');

async function main() {
  const data = await cemadenGet<any[]>('/PED/rest/pcds-cadastro/dados-cadastrais', { codibge: SOROCABA_IBGE });
  const stations = data
    .filter(station => typeof station.latitude === 'number' && typeof station.longitude === 'number')
    .map(station => ({
      code: station.codestacao,
      name: station.nome,
      kind: station.tipoestacao_descricao,
      lat: station.latitude,
      lng: station.longitude
    }))
    .sort((a, b) => a.code.localeCompare(b.code));

  writeFileSync(OUTPUT, JSON.stringify({ source: 'CEMADEN/MCTI', fetchedAt: new Date().toISOString(), stations }, null, 1) + '\n');
  console.log(`${stations.length} estações → ${OUTPUT}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
