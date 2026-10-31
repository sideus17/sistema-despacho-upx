import type { LineString, MultiPolygon, Polygon } from 'geojson';

// Enums
export enum AmbulanceType {
  USA = 'USA',
  USB = 'USB',
  MOTOLANCIA = 'MOTOLANCIA'
}

export enum AmbulanceStatus {
  DISPONIVEL = 'DISPONIVEL',
  EM_ATENDIMENTO = 'EM_ATENDIMENTO',
  INDISPONIVEL = 'INDISPONIVEL'
}

// Classificação de risco em 4 cores: vermelho, amarelo, verde e azul (ver PRIORITY_META)
export enum CallPriority {
  EMERGENCIA = 'EMERGENCIA',
  URGENTE = 'URGENTE',
  PRIORITARIO = 'PRIORITARIO',
  NAO_URGENTE = 'NAO_URGENTE'
}

// Registro → regulação → despacho → atendimento. PENDENTE é "aguardando despacho" (já regulado).
export enum CallStatus {
  AGUARDANDO_REGULACAO = 'AGUARDANDO_REGULACAO',
  PENDENTE = 'PENDENTE',
  EM_ATENDIMENTO = 'EM_ATENDIMENTO',
  FINALIZADO = 'FINALIZADO', // atendido por uma viatura
  ORIENTADO = 'ORIENTADO', // encerrado na regulação, com orientação por telefone
  CANCELADO = 'CANCELADO'
}

// O que a regulação decidiu
export enum RegulationDecision {
  DESPACHAR = 'DESPACHAR',
  ORIENTACAO = 'ORIENTACAO',
  CANCELAR = 'CANCELAR'
}

// Ações de pessoas registradas na auditoria do chamado
export enum CallEventAction {
  ABERTURA = 'ABERTURA',
  REGULACAO = 'REGULACAO',
  DESPACHO = 'DESPACHO',
  HOSPITAL = 'HOSPITAL',
  FINALIZACAO = 'FINALIZACAO',
  CIENTE = 'CIENTE' // a equipe viu o despacho
}

// Por que o chamado foi cancelado
export enum CloseReason {
  TROTE = 'TROTE',
  REPETIDO = 'REPETIDO',
  ENGANO = 'ENGANO',
  DESISTENCIA = 'DESISTENCIA',
  OUTRO = 'OUTRO'
}

// Como o atendimento terminou (com chegada ao hospital, o servidor marca TRANSPORTADO)
export enum CallOutcome {
  TRANSPORTADO = 'TRANSPORTADO',
  ATENDIDO_NO_LOCAL = 'ATENDIDO_NO_LOCAL',
  RECUSA = 'RECUSA',
  OBITO = 'OBITO',
  NAO_LOCALIZADO = 'NAO_LOCALIZADO'
}

export enum IncidentType {
  ALAGAMENTO = 'ALAGAMENTO',
  QUEDA_ARVORE = 'QUEDA_ARVORE',
  VIA_BLOQUEADA = 'VIA_BLOQUEADA',
  ACIDENTE = 'ACIDENTE',
  VENTOS_FORTES = 'VENTOS_FORTES',
  CHUVA_FORTE = 'CHUVA_FORTE',
  ALERTA_OFICIAL = 'ALERTA_OFICIAL',
  OBRAS = 'OBRAS',
  CONGESTIONAMENTO = 'CONGESTIONAMENTO',
  PERIGO_NA_VIA = 'PERIGO_NA_VIA',
  VEICULO_PARADO = 'VEICULO_PARADO',
  SEMAFORO_QUEBRADO = 'SEMAFORO_QUEBRADO'
}

export enum IncidentSource {
  CENTRAL = 'CENTRAL',
  EQUIPE = 'EQUIPE',
  CEMADEN = 'CEMADEN',
  DEFESA_CIVIL = 'DEFESA_CIVIL',
  TOMTOM = 'TOMTOM' // trânsito ao vivo
}

// O que a ocorrência faz com a rota
export enum IncidentEffect {
  BLOQUEIO = 'BLOQUEIO',
  RISCO = 'RISCO',
  AVISO = 'AVISO'
}

export enum IncidentVote {
  SIM = 'SIM',
  NAO = 'NAO',
  PASSOU = 'PASSOU'
}

export enum UserRole {
  MOTORISTA = 'MOTORISTA',
  OPERADOR = 'OPERADOR'
}

export type AvatarColor = 'azul' | 'verde' | 'vermelho' | 'laranja' | 'roxo' | 'turquesa' | 'rosa' | 'grafite';
// Dados que contas antigas ainda não preencheram
export type ProfileField = 'cpf' | 'phone';

export interface Me {
  id: string;
  fullName: string;
  role: UserRole;
  // Vêm do servidor; o perfil salvo no aparelho pode ser de antes deles (ou sem o CPF, que não fica salvo)
  email?: string | null;
  cpf?: string | null;
  phone?: string | null;
  avatarPhoto?: string | null;
  avatarColor?: AvatarColor | null;
  theme?: 'auto' | 'day' | 'night';
  missing?: ProfileField[];
}

// Interfaces
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Ambulance {
  id: string;
  code: string;
  type: AmbulanceType;
  status: AmbulanceStatus;
  location: Coordinates;
  baseId: string;
  crew: {
    driver: string;
    medic: string;
    nurse?: string;
  };
  // Motorista em turno; o celular só vem para a central
  driver: { id: string; name: string; avatarPhoto?: string | null; avatarColor?: AvatarColor | null; phone?: string } | null;
  locationUpdatedAt: string | null;
}

export interface EmergencyCall {
  id: string;
  location: Coordinates;
  address: string;
  priority: CallPriority;
  status: CallStatus;
  ambulanceId?: string;
  ambulance_id?: string;
  description: string;
  patientInfo: {
    age?: number;
    gender?: string;
    symptoms: string;
  };
  timestamp: string;
  callerPhone?: string; // só a central recebe
  reference?: string; // ponto de referência
  triage?: CallTriage;
  times?: CallTimes; // horários do atendimento (só os que já aconteceram)
  hospitalId?: string; // hospital de destino (escolhido ou onde a viatura chegou)
  outcome?: CallOutcome;
  initialPriority?: CallPriority; // cor sugerida no registro (priority é a da regulação)
  closeReason?: CloseReason; // só nos cancelados
  closeNote?: string; // orientação dada ou detalhe do cancelamento
  demo?: true; // histórico de demonstração (só aparece na gestão)
}

// Etapas do atendimento: despacho e fim pelas ações; as do meio, pelo GPS da viatura
export interface CallTimes {
  regulated?: string; // primeira regulação
  dispatched?: string;
  crewSeen?: string; // a equipe tocou "Ciente" no despacho
  enRoute?: string; // viatura saiu
  onScene?: string; // chegou ao local
  leftScene?: string; // saiu do local
  atHospital?: string;
  finished?: string;
}

export interface Hospital {
  id: string;
  name: string;
  shortName: string;
  kind: 'HOSPITAL' | 'PRONTO_SOCORRO';
  address: string;
  location: Coordinates;
  notes?: string;
}

// Sinais de alerta marcados e a cor que eles sugeriram (a escolhida é a priority)
export interface CallTriage {
  signals: string[];
  suggested: CallPriority | null;
}

export interface Base {
  id: string;
  name: string;
  location: Coordinates;
  address: string;
  capacity: number;
}

export interface Incident {
  id: string;
  type: IncidentType;
  source: IncidentSource;
  effect: IncidentEffect;
  location: Coordinates;
  radius: number; // metros
  description: string | null;
  createdAt: string;
  expiresAt: string | null; // null: até a central encerrar
  lastConfirmedAt: string | null;
  createdBy: { id: string; name: string } | null;
  ambulance: { id: string; code: string } | null;
  geometry: Polygon | MultiPolygon | LineString | null; // contorno da área (fontes oficiais) ou trecho de rua (TomTom), só para exibir
  votes: { yes: number; no: number };
  myVote: IncidentVote | null;
}

// Ocorrência no caminho de uma rota (ou evitada por ela)
export interface RouteIncident {
  id: string;
  type: IncidentType;
  source: IncidentSource;
  effect: IncidentEffect;
  location: Coordinates;
  radius: number;
  ambulance: { id: string; code: string } | null;
  distanceAlong?: number; // metros do início da rota até a área (só nas que a rota atravessa)
}

export type RouteEngine = 'valhalla' | 'osrm' | 'linha-reta';

export interface RouteInfo {
  distance: number;
  duration: number;
  geometry: Coordinates[];
  steps: RouteStep[];
  engine: RouteEngine;
  incidentsOnRoute: RouteIncident[];
  avoided: RouteIncident[];
  warnings: string[];
  alternatives?: RouteInfo[]; // outros caminhos, só quando pedidos
  trafficDelay?: number; // segundos a mais por causa do trânsito (TomTom)
  durationSource?: 'TRANSITO' | 'ESTIMATIVA'; // tempo com o trânsito de agora ou a estimativa do Valhalla
}

// Trecho da rota com limite de velocidade conhecido (metros desde o início da rota)
export interface SpeedLimitSegment {
  from: number;
  to: number;
  kmh: number;
}

// Sugestão da busca de endereço (Photon e TomTom, pelo backend)
export interface PlaceSuggestion {
  label: string;
  detail: string;
  location: Coordinates;
  approximate?: boolean; // o número digitado não foi achado: o ponto é o da rua
}

// Chamado das últimas 2 h parecido com o que está sendo aberto (aviso de repetido)
export interface RecentCallMatch {
  call: EmergencyCall;
  reasons: Array<'telefone' | 'local'>;
  distance: number | null; // metros até o local escolhido
}

// Sugestão que só completa o texto (rua do CEP): a pessoa ainda digita o número
export interface FillSuggestion {
  label: string;
  detail: string;
  fill: string;
}

export interface RouteStep {
  type: string;
  modifier?: string;
  name: string;
  location: Coordinates;
  distance: number;
  duration: number;
  exit?: number;
}

export interface DispatchScore {
  ambulanceId: string;
  totalScore: number;
  timeScore: number; // tempo de chegada (rota com trânsito ou estimativa em linha reta)
  arrivalSeconds: number;
  availabilityScore: number;
  typeScore: number;
  incidentPenalty: number;
  route?: RouteInfo;
  explanation: string;
}

export interface DispatchRecommendation {
  callId: string;
  recommendations: DispatchScore[];
  timestamp: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface OfficialSourceStatus {
  id: 'cemaden' | 'defesaCivil' | 'tomtom';
  name: string;
  enabled: boolean;
  lastAttempt: string | null;
  lastSuccess: string | null;
  lastError: string | null;
  summary: string | null;
}

export interface Stats {
  pendingCalls: number; // aguardando despacho
  awaitingRegulation: number;
}

// O que a regulação manda para o servidor
export interface RegulationRequest {
  decision: RegulationDecision;
  priority?: CallPriority;
  hospitalId?: string | null;
  reason?: CloseReason;
  note?: string;
}

// ============================================
// GESTÃO (backend/src/services/indicators.ts)
// ============================================

// Tempos em segundos; sem nenhum chamado com os dois horários, a mediana é nula
export interface DurationStats {
  n: number;
  median: number | null;
  p90: number | null;
}

export interface ResponseStats extends DurationStats {
  withinTarget: number | null; // fração (0 a 1) que chegou dentro da meta da própria cor
}

export interface TargetStats extends ResponseStats {
  target: number; // segundos
}

// Regulação, espera pela viatura, fila inteira (abertura → despacho), saída, deslocamento, tempo-resposta,
// no local, transporte e total
export type AttendanceStage =
  | 'regulation'
  | 'dispatchWait'
  | 'queue'
  | 'departure'
  | 'travel'
  | 'response'
  | 'onScene'
  | 'transport'
  | 'total';

export interface Indicators {
  period: { from: string; to: string };
  includeDemo: boolean;
  targets: Record<CallPriority, number>; // minutos
  truncated: boolean;
  total: number;
  byStatus: Record<CallStatus, number>;
  byPriority: Record<CallPriority, number>;
  stages: Record<AttendanceStage, DurationStats>;
  response: { overall: ResponseStats; byPriority: Record<CallPriority, TargetStats> };
  byOutcome: Record<CallOutcome, number>;
  byHospital: Array<{ hospitalId: string; count: number; transportMedian: number | null }>;
  byAmbulance: Array<{ ambulanceId: string; count: number; responseMedian: number | null }>;
  byHour: number[];
  byDay: Array<{ date: string; count: number; responseMedian: number | null; withinTarget: number | null; queueMedian: number | null }>;
  quality: { finished: number; missingOnScene: number; missingOutcome: number };
}

export interface HistoryFilters {
  q?: string;
  priority?: CallPriority;
  status?: CallStatus;
  outcome?: CallOutcome;
  ambulance?: string;
  hospital?: string;
}

export interface HistoryPage {
  items: EmergencyCall[];
  total: number;
  page: number;
  pageSize: number;
}

// [lat, lng, cor] de cada chamado do período
export type HeatPoint = [number, number, CallPriority];

// Período da gestão: início e fim (ISO) e se os chamados de demonstração entram
export interface ManagementScope {
  from: string;
  to: string;
  demo: boolean;
}

// Uma ação de uma pessoa no chamado: quem, quando e o que mudou (só a central lê)
export interface CallEvent {
  id: number;
  at: string;
  action: CallEventAction;
  actor: { id: string | null; name: string; role: UserRole };
  data: Record<string, unknown>;
}

// Indicadores por pessoa (backend/src/services/people.ts)
export interface AttendantStats {
  id: string;
  name: string;
  demo: boolean;
  opened: number;
  regulated: number;
  dispatched: number;
  closedWithoutDispatch: number;
  reclassified: number;
  regulation: DurationStats; // abertura → regulação
  dispatch: DurationStats; // regulação → despacho
}

export interface DriverStats {
  id: string;
  name: string;
  demo: boolean;
  attended: number;
  departure: DurationStats; // despacho → saída
  arrival: DurationStats; // despacho → chegada ao local
}

export interface PeopleIndicators {
  period: { from: string; to: string };
  includeDemo: boolean;
  truncated: boolean;
  attendants: AttendantStats[];
  drivers: DriverStats[];
  unattributed: number; // chamados sem autor (de antes da regulação)
}
