/**
 * Confere o Supabase local (npm run db:start) de ponta a ponta. Roda no GitHub Actions (banco.yml):
 * - as chaves dos .env.example batem com as do banco local;
 * - viaturas, bases e usuários do seed estão lá, e o RLS barra a anon key;
 * - os usuários do seed entram com senha + código do app autenticador (TOTP);
 * - com o backend apontando para o banco local, o perfil carrega e um cadastro novo é gravado nele;
 * - um chamado passa por registro, regulação, despacho e fim, e a auditoria guarda quem fez cada passo.
 * Uso: API_URL, ANON_KEY e SERVICE_ROLE_KEY do `supabase status -o env` e o backend em BACKEND_URL.
 * Por fim imprime as tabelas como a API REST as descreve, para comparar com o projeto hospedado.
 */
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SupabaseClient, createClient } from '@supabase/supabase-js';

const API_URL = required('API_URL');
const ANON_KEY = required('ANON_KEY');
const SERVICE_ROLE_KEY = required('SERVICE_ROLE_KEY');
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3001/api';
const ROOT = join(__dirname, '../..');

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Defina ${name} (saída de supabase status -o env)`);
  return value;
}

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FALHOU: ${message}`);
  console.log(`ok - ${message}`);
}

function envFile(path: string): Record<string, string> {
  const entries = readFileSync(join(ROOT, path), 'utf8')
    .split(/\r?\n/) // CRLF no Windows (core.autocrlf)
    .map(line => line.match(/^([A-Z_]+)=(.*)$/))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map(match => [match[1], match[2]]);
  return Object.fromEntries(entries);
}

// Código TOTP de 6 dígitos (RFC 6238), igual ao do app autenticador
function totp(secret: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const char of secret) bits += alphabet.indexOf(char).toString(2).padStart(5, '0');
  const key = Buffer.from(bits.match(/.{8}/g)!.map(byte => parseInt(byte, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const hmac = createHmac('sha1', key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  return String((hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}

async function signInWithMfa(email: string, secret: string) {
  const client = createClient(API_URL, ANON_KEY, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password: 'samu-local' });
  if (error) throw new Error(`${email}: ${error.message}`);
  const { data: factors } = await client.auth.mfa.listFactors();
  const factor = factors?.totp.find(f => f.status === 'verified');
  check(factor, `${email} tem o app autenticador cadastrado`);
  const { error: mfaError } = await client.auth.mfa.challengeAndVerify({ factorId: factor.id, code: totp(secret) });
  if (mfaError) throw new Error(`${email}: ${mfaError.message}`);
  const { data: aal } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  check(aal?.currentLevel === 'aal2', `${email} entra com senha + código do autenticador`);
  const { data } = await client.auth.getSession();
  return data.session!.access_token;
}

async function backend(path: string, init: RequestInit & { token?: string } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  const response = await fetch(`${BACKEND_URL}${path}`, { ...init, headers });
  return { status: response.status, body: await response.json() };
}

async function main() {
  // As chaves documentadas são as que o banco local usa
  const backendEnv = envFile('backend/.env.example');
  const frontendEnv = envFile('frontend/.env.example');
  check(backendEnv.SUPABASE_URL === API_URL, 'backend/.env.example aponta para o banco local');
  check(backendEnv.SUPABASE_SERVICE_ROLE_KEY === SERVICE_ROLE_KEY, 'service_role do backend/.env.example confere');
  check(backendEnv.SUPABASE_ANON_KEY === ANON_KEY, 'anon key do backend/.env.example confere');
  check(frontendEnv.VITE_SUPABASE_ANON_KEY === ANON_KEY, 'anon key do frontend/.env.example confere');

  // Seed
  const admin = createClient(API_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  for (const [table, expected] of [['bases', 2], ['ambulances', 4], ['profiles', 2], ['hospitals', 8]] as const) {
    const { count, error } = await admin.from(table).select('*', { count: 'exact', head: true });
    if (error) throw error;
    check(count === expected, `${table}: ${expected} linhas do seed`);
  }

  // RLS ligado e sem políticas: a anon key não lê nada
  const anon = createClient(API_URL, ANON_KEY, { auth: { persistSession: false } });
  for (const table of ['bases', 'ambulances', 'calls', 'call_events', 'incidents', 'incident_votes', 'profiles', 'hospitals']) {
    const { data, error } = await anon.from(table).select('*').limit(1);
    if (error) throw error;
    check(data.length === 0, `${table}: anon key não lê (RLS)`);
  }

  // Login dos usuários do seed, com os segredos documentados no seed.sql
  const seed = readFileSync(join(__dirname, '../supabase/seed.sql'), 'utf8');
  const secrets = Object.fromEntries([...seed.matchAll(/--\s+(\S+@samu\.local)\s+([A-Z2-7]{32})/g)].map(m => [m[1], m[2]]));
  const operatorToken = await signInWithMfa('operador@samu.local', secrets['operador@samu.local']);
  const driverToken = await signInWithMfa('motorista@samu.local', secrets['motorista@samu.local']);

  // Backend com o banco local: perfil, viaturas e cadastro
  const me = await backend('/me', { token: operatorToken });
  check(me.status === 200 && me.body.data.role === 'OPERADOR' && me.body.data.missing.length === 0, 'backend carrega o perfil completo do operador');
  const driverMe = await backend('/me', { token: driverToken });
  check(driverMe.status === 200 && driverMe.body.data.missing.length === 0, 'backend carrega o perfil completo do motorista (sem CNH)');
  const ambulances = await backend('/ambulances', { token: operatorToken });
  check(ambulances.status === 200 && ambulances.body.data.length === 4, 'backend lista as 4 viaturas');
  const hospitals = await backend('/hospitals', { token: driverToken });
  check(hospitals.status === 200 && hospitals.body.data.length === 8, 'backend lista os 8 hospitais da migração 006');

  const signup = await backend('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Cadastro do CI',
      email: 'cadastro-ci@samu.local',
      password: 'cadastro-ci-123',
      role: 'MOTORISTA',
      cpf: '111.444.777-35',
      phone: '(15) 99111-0003'
    })
  });
  check(signup.status === 201, `cadastro pelo backend (${signup.status} ${signup.body.error ?? ''})`);
  const { data: created } = await admin.from('profiles').select('full_name').eq('id', signup.body.data.id).single();
  check(created?.full_name === 'Cadastro do CI', 'o cadastro novo foi gravado no banco local');

  await checkCallFlow(admin, operatorToken, driverToken);

  // Para comparar com o projeto hospedado (mesmo formato da conferência feita lá)
  const response = await fetch(`${API_URL}/rest/v1/`, {
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`, Accept: 'application/openapi+json' }
  });
  const openapi = await response.json();
  console.log('\n--- Tabelas pela API REST ---');
  for (const [table, definition] of Object.entries<any>(openapi.definitions)) {
    console.log(`## ${table} (required: ${(definition.required ?? []).join(',')})`);
    for (const [column, property] of Object.entries<any>(definition.properties)) {
      const extra = property.default !== undefined ? ` default=${JSON.stringify(property.default)}` : '';
      const note = property.description ? ` — ${property.description.replace(/\n/g, ' ')}` : '';
      console.log(`  ${column}: ${property.format}${extra}${note}`);
    }
  }
}

// Registro → regulação → despacho → fim, com a auditoria de cada passo (etapa 6)
async function checkCallFlow(admin: SupabaseClient<any, 'public', any>, operatorToken: string, driverToken: string) {
  const post = (path: string, token: string, body: unknown) => backend(path, { method: 'POST', token, body: JSON.stringify(body) });
  const newCall = (description: string) =>
    post('/calls', operatorToken, {
      address: 'Rua da Penha, 120 - Centro, Sorocaba/SP',
      location: { lat: -23.5007, lng: -47.4573 },
      description,
      priority: 'URGENTE',
      triage: { signals: ['DOR_PEITO'], suggested: 'EMERGENCIA' }
    });
  const callIds: string[] = [];

  try {
    const created = await newCall('Chamado do CI: dor no peito');
    check(created.status === 201 && created.body.data.status === 'AGUARDANDO_REGULACAO', 'chamado novo espera a regulação');
    const callId: string = created.body.data.id;
    callIds.push(callId);

    const crewQueue = await backend('/calls/pending', { token: driverToken });
    check(!crewQueue.body.data.some((call: { id: string }) => call.id === callId), 'a equipe não vê o chamado antes da regulação');
    const early = await post('/dispatch/analyze', operatorToken, { callId });
    check(early.status === 409, 'não dá para despachar antes de regular');

    const regulated = await post(`/calls/${callId}/regulate`, operatorToken, { decision: 'DESPACHAR', priority: 'EMERGENCIA' });
    check(
      regulated.status === 200 && regulated.body.data.status === 'PENDENTE' && regulated.body.data.priority === 'EMERGENCIA' &&
        regulated.body.data.initialPriority === 'URGENTE' && regulated.body.data.times?.regulated,
      `regulação muda a cor e manda para o despacho (${regulated.status} ${regulated.body.error ?? ''})`
    );

    const shift = await post('/shifts/start', driverToken, { ambulanceId: 'amb-1' });
    check(shift.status === 200, 'motorista assume a USA-01');
    const dispatched = await post('/dispatch/execute', operatorToken, { callId, ambulanceId: 'amb-1' });
    check(dispatched.status === 200, `despacho da USA-01 (${dispatched.status} ${dispatched.body.error ?? ''})`);
    const finished = await post('/dispatch/finish', driverToken, { callId, outcome: 'ATENDIDO_NO_LOCAL' });
    check(finished.status === 200, 'motorista finaliza o atendimento');

    const { data: row } = await admin.from('calls').select('created_by, regulated_by, dispatched_by, driver_id').eq('id', callId).single();
    const operatorId = 'c6727385-d17e-4c22-8019-c2c2fadaf06d';
    const driverId = 'b3c16b3d-3099-498a-8c3b-d8ff46bf8aea';
    check(
      row?.created_by === operatorId && row.regulated_by === operatorId && row.dispatched_by === operatorId && row.driver_id === driverId,
      'o chamado guarda quem abriu, regulou, despachou e o motorista'
    );

    const events = await backend(`/calls/${callId}/events`, { token: operatorToken });
    const actions = (events.body.data ?? []).map((event: { action: string; actor: { name: string } }) => `${event.action}:${event.actor.name}`);
    check(
      JSON.stringify(actions) === JSON.stringify([
        'ABERTURA:Operador de Teste',
        'REGULACAO:Operador de Teste',
        'DESPACHO:Operador de Teste',
        'FINALIZACAO:Motorista de Teste'
      ]),
      `auditoria com quem fez cada passo (${actions.join(', ')})`
    );
    const dispatch = events.body.data[2];
    check(dispatch.data.ambulanceCode === 'USA-01' && dispatch.data.driverName === 'Motorista de Teste', 'o despacho registra a viatura e o motorista');
    check((await backend(`/calls/${callId}/events`, { token: driverToken })).status === 403, 'a equipe não lê a auditoria');

    const prank = await newCall('Chamado do CI: trote');
    const prankId: string = prank.body.data.id;
    callIds.push(prankId);
    const cancelled = await post(`/calls/${prankId}/regulate`, operatorToken, { decision: 'CANCELAR', reason: 'TROTE' });
    check(cancelled.status === 200 && cancelled.body.data.status === 'CANCELADO' && cancelled.body.data.closeReason === 'TROTE', 'cancelamento por trote');
    const again = await post(`/calls/${prankId}/regulate`, operatorToken, { decision: 'DESPACHAR', priority: 'URGENTE' });
    check(again.status === 409, 'chamado encerrado não volta para a fila');
  } finally {
    await backend('/shifts/end', { method: 'POST', token: driverToken });
    if (callIds.length) await admin.from('calls').delete().in('id', callIds);
    await admin.from('ambulances').update({ status: 'DISPONIVEL' }).eq('id', 'amb-1');
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
