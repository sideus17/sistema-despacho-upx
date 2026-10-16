import { AmbulanceType, CallOutcome, CallPriority, CallStatus, Coordinates, Hospital } from '../types';
import { CallRow } from './calls';
import { distanceMeters } from './geo';
import { dayOf } from './indicators';

// Histórico de demonstração para a gestão (npm run demo:gerar): chamados dos últimos dias com horários,
// viatura, hospital e desfecho coerentes. Determinístico pela semente. Sem Supabase: dá para testar.

export interface DemoAmbulance {
  id: string;
  type: AmbulanceType;
  location: Coordinates; // base da viatura (ela volta para lá depois de cada atendimento)
}

export interface DemoOptions {
  count: number;
  days: number;
  now: number;
  seed: number;
  ambulances: DemoAmbulance[];
  hospitals: Hospital[];
}

export type DemoRow = CallRow & { demo: true };

// Centros dos bairros pelo Nominatim (OpenStreetMap), conferidos em 2026-10-16; o peso segue o tamanho
// da região (a Zona Norte é a mais populosa)
export const DEMO_NEIGHBORHOODS: Array<{ name: string; lat: number; lng: number; weight: number }> = [
  { name: 'Centro', lat: -23.50023, lng: -47.45781, weight: 3 },
  { name: 'Vila Hortência', lat: -23.50634, lng: -47.44035, weight: 1 },
  { name: 'Jardim Vergueiro', lat: -23.50689, lng: -47.46142, weight: 1 },
  { name: 'Vila Barcelona', lat: -23.51845, lng: -47.44022, weight: 2 },
  { name: 'Vila Haro', lat: -23.50065, lng: -47.43297, weight: 1 },
  { name: 'Além Ponte', lat: -23.49629, lng: -47.43871, weight: 1 },
  { name: 'Jardim Gonçalves', lat: -23.49174, lng: -47.42784, weight: 1 },
  { name: 'Lageado', lat: -23.51599, lng: -47.45877, weight: 1 },
  { name: 'Vila Carvalho', lat: -23.48887, lng: -47.466, weight: 1 },
  { name: 'Jardim Santa Rosália', lat: -23.48715, lng: -47.44606, weight: 1 },
  { name: 'Jardim Saira', lat: -23.48018, lng: -47.43458, weight: 1 },
  { name: 'Jardim Maria do Carmo', lat: -23.4747, lng: -47.44663, weight: 1 },
  { name: 'Jardim Brasilândia', lat: -23.47418, lng: -47.4605, weight: 2 },
  { name: 'Vila Fiori', lat: -23.47734, lng: -47.46552, weight: 1 },
  { name: 'Vila Angélica', lat: -23.47879, lng: -47.47923, weight: 1 },
  { name: 'Vila Helena', lat: -23.47291, lng: -47.49548, weight: 1 },
  { name: 'Parque das Laranjeiras', lat: -23.45326, lng: -47.47347, weight: 2 },
  { name: 'Jardim Maria Eugênia', lat: -23.45652, lng: -47.49148, weight: 2 },
  { name: 'Jardim São Guilherme', lat: -23.44858, lng: -47.48868, weight: 2 },
  { name: 'Parque Vitória Régia', lat: -23.4308, lng: -47.46201, weight: 3 },
  { name: 'Parque São Bento', lat: -23.43199, lng: -47.5062, weight: 2 },
  { name: 'Habiteto', lat: -23.42079, lng: -47.48586, weight: 2 },
  { name: 'Éden', lat: -23.42195, lng: -47.41114, weight: 2 },
  { name: 'Cajuru do Sul', lat: -23.4159, lng: -47.38935, weight: 1 },
  { name: 'Aparecidinha', lat: -23.44082, lng: -47.37329, weight: 1 },
  { name: 'Jardim Zulmira', lat: -23.49895, lng: -47.47993, weight: 1 },
  { name: 'Jardim Nova Esperança', lat: -23.49303, lng: -47.49206, weight: 1 },
  { name: 'Jardim Simus', lat: -23.50281, lng: -47.49433, weight: 1 },
  { name: 'Jardim Itanguá', lat: -23.50672, lng: -47.50142, weight: 1 },
  { name: 'Jardim Ipiranga', lat: -23.49915, lng: -47.50992, weight: 2 },
  { name: 'Wanel Ville', lat: -23.47955, lng: -47.50915, weight: 2 },
  { name: 'Júlio de Mesquita Filho', lat: -23.50386, lng: -47.51644, weight: 2 },
  { name: 'Jardim Europa', lat: -23.51822, lng: -47.48405, weight: 1 },
  { name: 'Parque Campolim', lat: -23.53258, lng: -47.46874, weight: 1 }
];

const SPREAD_METERS = 400;

// Chamados por hora do dia em Sorocaba (pouco de madrugada, picos de manhã e no começo da noite)
const HOUR_WEIGHTS = [2, 1.5, 1.2, 1, 1, 1.3, 2, 3, 4, 5, 5.5, 5.5, 5, 4.8, 5, 5, 5, 5.5, 6, 6, 5.5, 4.5, 3.5, 2.8];
const WEEKDAY_ACCEPT = 0.87; // fim de semana tem ~15% mais chamados
// Sorocaba está em UTC−3 o ano todo (sem horário de verão desde 2019)
const UTC_OFFSET_HOURS = 3;
// Chamados terminam antes de agora: nenhum fica "em andamento" na fila
const LATEST_BEFORE_NOW_MS = 6 * 60 * 60_000;
const DAY_MS = 24 * 60 * 60_000;

const PRIORITY_WEIGHTS: Array<[CallPriority, number]> = [
  [CallPriority.EMERGENCIA, 15],
  [CallPriority.URGENTE, 35],
  [CallPriority.PRIORITARIO, 35],
  [CallPriority.NAO_URGENTE, 15]
];

// Sinais da triagem de cada cor e descrições de exemplo (o azul é só orientação, sem sinal)
const SIGNALS: Record<CallPriority, Array<{ code: string | null; descriptions: string[] }>> = {
  [CallPriority.EMERGENCIA]: [
    { code: 'NAO_RESPIRA', descriptions: ['Muita dificuldade para respirar, lábios roxos', 'Engasgou durante o almoço e não consegue respirar'] },
    { code: 'INCONSCIENTE', descriptions: ['Encontrado caído na calçada, não responde', 'Idoso não responde aos chamados da família'] },
    { code: 'SANGRAMENTO_GRAVE', descriptions: ['Corte profundo no braço, sangrando muito', 'Ferimento na perna com sangramento que não para'] },
    { code: 'DOR_PEITO', descriptions: ['Dor forte no peito há 30 minutos, suando frio', 'Dor no peito que vai para o braço esquerdo'] },
    { code: 'AVC', descriptions: ['Boca torta e fala enrolada de repente', 'Fraqueza no lado direito do corpo desde cedo'] },
    { code: 'CONVULSAO', descriptions: ['Convulsionando agora, tem epilepsia', 'Criança com convulsão e febre alta'] }
  ],
  [CallPriority.URGENTE]: [
    { code: 'FALTA_AR', descriptions: ['Asmática com falta de ar, a bombinha não resolveu', 'Cansaço e falta de ar ao deitar'] },
    { code: 'TRAUMA', descriptions: ['Queda de moto na avenida, consciente', 'Atropelamento, vítima consciente com dor na perna', 'Caiu da escada, dor no quadril'] },
    { code: 'PARTO', descriptions: ['Gestante de 39 semanas com contrações de 5 em 5 minutos', 'Bolsa rompeu, primeiro filho'] },
    { code: 'DESMAIO', descriptions: ['Desmaiou no ponto de ônibus, já acordou', 'Desmaio no trabalho, está confusa'] },
    { code: 'DOR_INTENSA', descriptions: ['Dor abdominal intensa há 3 horas', 'Cólica renal muito forte'] }
  ],
  [CallPriority.PRIORITARIO]: [
    { code: 'FEBRE', descriptions: ['Febre de 39 °C há 2 dias', 'Febre e dor no corpo desde ontem'] },
    { code: 'VOMITO', descriptions: ['Vômitos desde a noite passada, fraca', 'Diarreia e vômitos, idosa acamada'] },
    { code: 'FERIMENTO_LEVE', descriptions: ['Corte pequeno na mão, sangramento controlado', 'Escoriações depois de cair de bicicleta'] },
    { code: 'DOR_LEVE', descriptions: ['Dor nas costas que piorou hoje', 'Dor de cabeça que não passa com remédio'] }
  ],
  [CallPriority.NAO_URGENTE]: [
    { code: null, descriptions: ['Pressão alta, pede orientação', 'Dúvida sobre a dose do remédio', 'Glicemia um pouco alta, sem outros sintomas', 'Tontura leve ao levantar'] }
  ]
};

const REFERENCES = [
  'Em frente à padaria', 'Próximo ao mercado', 'Ao lado da escola estadual', 'Perto do ponto de ônibus',
  'Portão azul', 'Esquina com a farmácia', 'Fundos da igreja', 'Condomínio, bloco B'
];

// Viatura de cada cor: a avançada (USA) para o vermelho; a motolância não transporta paciente
const TYPE_WEIGHTS: Record<CallPriority, Array<[AmbulanceType, number]>> = {
  [CallPriority.EMERGENCIA]: [[AmbulanceType.USA, 70], [AmbulanceType.USB, 20], [AmbulanceType.MOTOLANCIA, 10]],
  [CallPriority.URGENTE]: [[AmbulanceType.USB, 70], [AmbulanceType.USA, 15], [AmbulanceType.MOTOLANCIA, 15]],
  [CallPriority.PRIORITARIO]: [[AmbulanceType.USB, 65], [AmbulanceType.MOTOLANCIA, 30], [AmbulanceType.USA, 5]],
  [CallPriority.NAO_URGENTE]: [[AmbulanceType.USB, 55], [AmbulanceType.MOTOLANCIA, 45]]
};

// Mediana (segundos) de cada tempo por cor
const QUEUE_MEDIAN: Record<CallPriority, number> = { EMERGENCIA: 90, URGENTE: 240, PRIORITARIO: 420, NAO_URGENTE: 600 };
const SCENE_MEDIAN: Record<CallPriority, number> = { EMERGENCIA: 1200, URGENTE: 1000, PRIORITARIO: 900, NAO_URGENTE: 720 };
const TRANSPORT_CHANCE: Record<CallPriority, number> = { EMERGENCIA: 0.8, URGENTE: 0.55, PRIORITARIO: 0.25, NAO_URGENTE: 0.05 };
const ROAD_FACTOR = 1.35; // a rua é mais longa que a linha reta
const SPEED = { EMERGENCIA: 11, OUTRAS: 9 }; // m/s (~40 e ~32 km/h na cidade)
const MOTO_SPEEDUP = 1.25;
const CANCEL_CHANCE = 0.03;
const NO_GPS_CHANCE = 0.04; // celular sem GPS: sem as etapas do meio
const BACK_TO_BASE_S = 10 * 60;

// Gerador pseudoaleatório com semente (mulberry32)
function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;

const pick = <T>(rng: Rng, items: T[]) => items[Math.floor(rng() * items.length)];

function weighted<T>(rng: Rng, items: Array<[T, number]>): T {
  const total = items.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rng() * total;
  for (const [item, weight] of items) {
    roll -= weight;
    if (roll < 0) return item;
  }
  return items[items.length - 1][0];
}

// Log-normal pela mediana: a maioria perto dela, alguns bem mais longos
function lognormal(rng: Rng, median: number, sigma: number): number {
  const z = Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
  return median * Math.exp(sigma * z);
}

function scatter(rng: Rng, center: Coordinates): Coordinates {
  const radius = SPREAD_METERS * Math.sqrt(rng());
  const angle = 2 * Math.PI * rng();
  const round = (value: number) => Math.round(value * 1e6) / 1e6;
  return {
    lat: round(center.lat + (radius * Math.cos(angle)) / 111_320),
    lng: round(center.lng + (radius * Math.sin(angle)) / (111_320 * Math.cos((center.lat * Math.PI) / 180)))
  };
}

// Abertura do chamado: dia dos últimos `days` (fim de semana pesa mais) e hora pelo movimento do dia
function openingTime(rng: Rng, days: number, now: number): number {
  const latest = now - LATEST_BEFORE_NOW_MS;
  for (;;) {
    const instant = latest - rng() * (days * DAY_MS - LATEST_BEFORE_NOW_MS);
    const [year, month, date] = dayOf(new Date(instant).toISOString()).split('-').map(Number);
    const weekday = new Date(Date.UTC(year, month - 1, date)).getUTCDay();
    if (weekday !== 0 && weekday !== 6 && rng() > WEEKDAY_ACCEPT) continue;
    const hour = weighted(rng, HOUR_WEIGHTS.map((weight, index): [number, number] => [index, weight]));
    const time = Date.UTC(year, month - 1, date, hour + UTC_OFFSET_HOURS, 0, Math.floor(rng() * 3600));
    if (time <= latest && time >= now - days * DAY_MS) return time;
  }
}

function phone(rng: Rng): string {
  const digits = (count: number) => Array.from({ length: count }, () => Math.floor(rng() * 10)).join('');
  return rng() < 0.8 ? `159${6 + Math.floor(rng() * 4)}${digits(7)}` : `153${digits(7)}`;
}

function travelSeconds(rng: Rng, from: Coordinates, to: Coordinates, speed: number): number {
  return Math.max(60, ((distanceMeters(from, to) * ROAD_FACTOR) / speed) * lognormal(rng, 1, 0.25));
}

// Hospital de cada caso: vermelho vai para hospital; azul, para pronto-socorro; às vezes o 2º mais perto
function chooseHospital(rng: Rng, priority: CallPriority, point: Coordinates, hospitals: Hospital[]): Hospital {
  const kind = priority === CallPriority.EMERGENCIA ? 'HOSPITAL' : priority === CallPriority.NAO_URGENTE ? 'PRONTO_SOCORRO' : null;
  const options = hospitals.filter(hospital => !kind || hospital.kind === kind);
  const sorted = (options.length > 0 ? options : hospitals)
    .map(hospital => ({ hospital, distance: distanceMeters(point, hospital.location) }))
    .sort((a, b) => a.distance - b.distance);
  return (rng() < 0.8 || sorted.length === 1 ? sorted[0] : sorted[1]).hospital;
}

function noTransportOutcome(rng: Rng, priority: CallPriority): CallOutcome {
  return weighted(rng, priority === CallPriority.EMERGENCIA
    ? [[CallOutcome.ATENDIDO_NO_LOCAL, 45], [CallOutcome.OBITO, 30], [CallOutcome.RECUSA, 15], [CallOutcome.NAO_LOCALIZADO, 10]]
    : [[CallOutcome.ATENDIDO_NO_LOCAL, 75], [CallOutcome.RECUSA, 15], [CallOutcome.NAO_LOCALIZADO, 10]]);
}

function patient(rng: Rng, signal: string | null): { age: number; gender: 'M' | 'F' } {
  if (signal === 'PARTO') return { age: 18 + Math.floor(rng() * 22), gender: 'F' };
  const age = weighted<[number, number]>(rng, [[[1, 12], 10], [[13, 29], 20], [[30, 59], 35], [[60, 95], 35]]);
  return { age: age[0] + Math.floor(rng() * (age[1] - age[0] + 1)), gender: rng() < 0.5 ? 'M' : 'F' };
}

/**
 * Chamados em ordem de abertura. Cada viatura atende um por vez: ocupada, o chamado vai para outra
 * (ou espera mais na fila). ~3% são cancelados antes do despacho; ~4% ficam sem as etapas do GPS.
 */
export function generateDemoHistory(options: DemoOptions): DemoRow[] {
  const rng = random(options.seed);
  const iso = (time: number) => new Date(Math.round(time)).toISOString();
  const openings = Array.from({ length: options.count }, () => openingTime(rng, options.days, options.now)).sort((a, b) => a - b);
  const busyUntil = new Map(options.ambulances.map(ambulance => [ambulance.id, 0]));
  const rows: DemoRow[] = [];

  openings.forEach((opened, index) => {
    const priority = weighted(rng, PRIORITY_WEIGHTS);
    const place = weighted(rng, DEMO_NEIGHBORHOODS.map((item): [typeof item, number] => [item, item.weight]));
    const location = scatter(rng, place);
    const signal = pick(rng, SIGNALS[priority]);
    const extra = rng() < 0.2 ? pick(rng, SIGNALS[priority]).code : null;
    const signals = [...new Set([signal.code, extra].filter((code): code is string => !!code))];
    const who = patient(rng, signal.code);
    const description = pick(rng, signal.descriptions);

    const row: DemoRow = {
      id: `demo-${opened.toString(36)}-${index}`,
      demo: true,
      lat: location.lat,
      lng: location.lng,
      address: `${place.name}, Sorocaba/SP`,
      priority,
      status: CallStatus.FINALIZADO,
      description,
      patient_age: who.age,
      patient_gender: who.gender,
      patient_symptoms: description,
      timestamp: iso(opened),
      triage: signals.length > 0 ? { signals, suggested: priority } : null,
      caller_phone: rng() < 0.85 ? phone(rng) : null,
      reference_point: rng() < 0.3 ? pick(rng, REFERENCES) : null
    };

    if (rng() < CANCEL_CHANCE || options.ambulances.length === 0) {
      rows.push({ ...row, status: CallStatus.CANCELADO });
      return;
    }

    // Viatura: o tipo da cor, livre e mais perto; senão qualquer livre; senão a que se libera primeiro
    let dispatched = opened + Math.max(20, lognormal(rng, QUEUE_MEDIAN[priority], 0.55)) * 1000;
    const type = weighted(rng, TYPE_WEIGHTS[priority]);
    const byDistance = [...options.ambulances].sort(
      (a, b) => distanceMeters(a.location, location) - distanceMeters(b.location, location)
    );
    const free = byDistance.filter(ambulance => busyUntil.get(ambulance.id)! <= dispatched);
    const ambulance =
      free.find(item => item.type === type) ??
      free[0] ??
      [...options.ambulances].sort((a, b) => busyUntil.get(a.id)! - busyUntil.get(b.id)!)[0];
    dispatched = Math.max(dispatched, busyUntil.get(ambulance.id)! + 60_000);

    const moto = ambulance.type === AmbulanceType.MOTOLANCIA;
    const speed = (priority === CallPriority.EMERGENCIA ? SPEED.EMERGENCIA : SPEED.OUTRAS) * (moto ? MOTO_SPEEDUP : 1);
    const enRoute = dispatched + Math.max(15, lognormal(rng, 60, 0.4)) * 1000;
    const onScene = enRoute + travelSeconds(rng, ambulance.location, location, speed) * 1000;
    const base = { ...row, ambulance_id: ambulance.id, dispatched_at: iso(dispatched), dispatch_lat: ambulance.location.lat, dispatch_lng: ambulance.location.lng };

    let finished: number;
    if (rng() < NO_GPS_CHANCE) {
      finished = onScene + lognormal(rng, SCENE_MEDIAN[priority], 0.35) * 1000;
      rows.push({ ...base, finished_at: iso(finished), outcome: CallOutcome.ATENDIDO_NO_LOCAL });
    } else if (!moto && rng() < TRANSPORT_CHANCE[priority]) {
      const hospital = chooseHospital(rng, priority, location, options.hospitals);
      const leftScene = onScene + lognormal(rng, SCENE_MEDIAN[priority], 0.35) * 1000;
      const atHospital = leftScene + travelSeconds(rng, location, hospital.location, speed) * 1000;
      finished = atHospital + lognormal(rng, 900, 0.35) * 1000;
      rows.push({
        ...base,
        en_route_at: iso(enRoute),
        on_scene_at: iso(onScene),
        left_scene_at: iso(leftScene),
        hospital_arrival_at: iso(atHospital),
        finished_at: iso(finished),
        hospital_id: hospital.id,
        outcome: CallOutcome.TRANSPORTADO
      });
    } else {
      const outcome = noTransportOutcome(rng, priority);
      const scene = outcome === CallOutcome.NAO_LOCALIZADO ? 300 : outcome === CallOutcome.OBITO ? 2400 : SCENE_MEDIAN[priority];
      finished = onScene + lognormal(rng, scene, 0.3) * 1000;
      rows.push({ ...base, en_route_at: iso(enRoute), on_scene_at: iso(onScene), finished_at: iso(finished), outcome });
    }
    busyUntil.set(ambulance.id, finished + BACK_TO_BASE_S * 1000);
  });

  // Uma fila muito longa poderia empurrar o fim para depois de agora
  return rows.filter(row => !row.finished_at || Date.parse(row.finished_at) <= options.now);
}
