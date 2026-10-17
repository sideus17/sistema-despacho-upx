/**
 * Histórico de demonstração para a tela de gestão (chamados com demo = true, migração 007).
 * Grava no banco do backend/.env (o mesmo que o servidor usa: confira a linha "Banco:" antes).
 *   npm run demo:gerar -- --quantidade 300 --dias 60 [--semente 17] [--substituir]
 *   npm run demo:apagar
 * Os chamados reais nunca são tocados: tudo filtra por demo = true.
 */
import { databaseLabel, supabase } from '../src/config/supabase';
import { listHospitals } from '../src/services/attendanceService';
import { DemoAmbulance, generateDemoHistory } from '../src/services/demoHistory';

const BATCH = 500;

function option(name: string, fallback: number): number {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = Number(process.argv[index + 1]);
  if (!Number.isInteger(value) || value < 1) throw new Error(`--${name} precisa ser um número inteiro positivo`);
  return value;
}

async function countDemo(): Promise<number> {
  const { count, error } = await supabase.from('calls').select('id', { count: 'exact', head: true }).eq('demo', true);
  if (error) throw new Error(`${error.message} (a migração 007 já rodou?)`);
  return count ?? 0;
}

async function remove() {
  const before = await countDemo();
  const { error } = await supabase.from('calls').delete().eq('demo', true);
  if (error) throw new Error(error.message);
  console.log(`${before} chamados de demonstração apagados.`);
}

async function generate() {
  const count = option('quantidade', 300);
  const days = option('dias', 60);
  const seed = option('semente', 17);
  if (count > 20_000 || days > 365) throw new Error('Até 20 000 chamados e 365 dias');

  const existing = await countDemo();
  if (existing > 0) {
    if (!process.argv.includes('--substituir')) {
      throw new Error(`Já há ${existing} chamados de demonstração. Use --substituir ou rode npm run demo:apagar antes.`);
    }
    await remove();
  }

  // As viaturas saem da própria base
  const [{ data: ambulances, error: ambError }, { data: bases, error: baseError }, hospitals] = await Promise.all([
    supabase.from('ambulances').select('id, type, base_id, lat, lng'),
    supabase.from('bases').select('id, lat, lng'),
    listHospitals()
  ]);
  if (ambError || baseError) throw new Error((ambError ?? baseError)!.message);
  const fleet: DemoAmbulance[] = (ambulances ?? []).map(ambulance => {
    const base = bases?.find(item => item.id === ambulance.base_id);
    return { id: ambulance.id, type: ambulance.type, location: base ? { lat: base.lat, lng: base.lng } : { lat: ambulance.lat, lng: ambulance.lng } };
  });
  if (fleet.length === 0 || hospitals.length === 0) throw new Error('Sem viaturas ou hospitais no banco');

  const rows = generateDemoHistory({ count, days, now: Date.now(), seed, ambulances: fleet, hospitals });
  for (let start = 0; start < rows.length; start += BATCH) {
    const { error } = await supabase.from('calls').insert(rows.slice(start, start + BATCH));
    if (error) throw new Error(error.message);
  }
  console.log(`${rows.length} chamados de demonstração gravados (${days} dias, ${fleet.length} viaturas, ${hospitals.length} hospitais).`);
}

async function main() {
  const command = process.argv[2];
  console.log(`Banco: ${databaseLabel()}`);
  if (command === 'gerar') await generate();
  else if (command === 'apagar') await remove();
  else throw new Error('Use: gerar ou apagar');
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
