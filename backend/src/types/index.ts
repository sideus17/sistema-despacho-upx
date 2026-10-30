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

// Classificação de risco em 4 cores (Regulação Médica das Urgências, Ministério da Saúde)
export enum CallPriority {
  EMERGENCIA = 'EMERGENCIA', // vermelho: prioridade absoluta
  URGENTE = 'URGENTE', // amarelo: prioridade moderada
  PRIORITARIO = 'PRIORITARIO', // verde: prioridade baixa
  NAO_URGENTE = 'NAO_URGENTE' // azul: prioridade mínima (orientação)
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

// Por que o chamado foi cancelado
export enum CloseReason {
  TROTE = 'TROTE',
  REPETIDO = 'REPETIDO', // outro chamado já cuida da mesma vítima
  ENGANO = 'ENGANO',
  DESISTENCIA = 'DESISTENCIA',
  OUTRO = 'OUTRO'
}

// Ações de pessoas registradas na auditoria do chamado
export enum CallEventAction {
  ABERTURA = 'ABERTURA',
  REGULACAO = 'REGULACAO',
  DESPACHO = 'DESPACHO',
  HOSPITAL = 'HOSPITAL',
  FINALIZACAO = 'FINALIZACAO',
  CIENTE = 'CIENTE' // a equipe viu o despacho (migração 009)
}

// Como o atendimento terminou (com chegada ao hospital, é sempre TRANSPORTADO)
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
  TOMTOM = 'TOMTOM' // trânsito; só na memória, nunca no banco
}

// O que a ocorrência faz com a rota
export enum IncidentEffect {
  BLOQUEIO = 'BLOQUEIO', // a rota desvia
  RISCO = 'RISCO', // a rota evita se houver alternativa razoável
  AVISO = 'AVISO' // só informa
}

export enum IncidentVote {
  SIM = 'SIM', // ainda está lá
  NAO = 'NAO', // não está mais lá
  PASSOU = 'PASSOU' // viatura passou pelo local normalmente
}

export enum UserRole {
  MOTORISTA = 'MOTORISTA',
  OPERADOR = 'OPERADOR'
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
  // Motorista em turno (login no app); o celular só vai para a central
  driver: { id: string; name: string; avatarPhoto: string | null; avatarColor: string | null; phone?: string } | null;
  locationUpdatedAt: string | null;
}

export interface EmergencyCall {
  id: string;
  location: Coordinates;
  address: string;
  priority: CallPriority;
  status: CallStatus;
  ambulance_id?: string;
  description: string;
  patientInfo: {
    age?: number;
    gender?: string;
    symptoms: string;
  };
  timestamp: string;
  callerPhone?: string; // só para a central
  reference?: string; // ponto de referência ("em frente à padaria")
  triage?: CallTriage;
  times?: CallTimes; // horários do atendimento (só os que já aconteceram)
  hospitalId?: string; // hospital de destino (escolhido ou onde a viatura chegou)
  outcome?: CallOutcome;
  initialPriority?: CallPriority; // cor sugerida no registro (priority é a da regulação)
  closeReason?: CloseReason; // só nos cancelados
  closeNote?: string; // orientação dada ou detalhe do cancelamento
  demo?: true; // histórico de demonstração (npm run demo:gerar)
}

// Etapas do atendimento: despacho e fim pelas rotas; as do meio, pelo GPS da viatura
export interface CallTimes {
  regulated?: string; // primeira regulação
  dispatched?: string;
  crewSeen?: string; // a equipe tocou "Ciente" no despacho
  enRoute?: string; // viatura saiu
  onScene?: string; // chegou ao local
  leftScene?: string; // saiu do local (transportando, se há hospital)
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

// Sinais de alerta marcados na triagem e a cor que eles sugeriram (a escolhida é a priority)
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
  ambulance: { id: string; code: string } | null; // viatura que relatou
  geometry: unknown | null; // polígono GeoJSON (ou o trecho, no TomTom), só para exibir
  votes: { yes: number; no: number }; // "não está lá" contados desde a última confirmação
  myVote: IncidentVote | null;
}

// Ocorrência no caminho de uma rota (ou evitada por ela)
export interface RouteIncident {
  id: string;
  type: IncidentType;
  source: IncidentSource;
  effect: IncidentEffect;
  location: Coordinates;
  radius: number; // metros
  ambulance: { id: string; code: string } | null; // viatura que relatou
  distanceAlong?: number; // metros do início da rota até a área (só nas que a rota atravessa)
}

export type RouteEngine = 'valhalla' | 'osrm' | 'linha-reta';

export interface RouteInfo {
  distance: number; // meters
  duration: number; // seconds
  geometry: Coordinates[];
  steps: RouteStep[];
  engine: RouteEngine;
  incidentsOnRoute: RouteIncident[]; // a rota atravessa (aviso, risco aceito ou bloqueio sem alternativa)
  avoided: RouteIncident[]; // a rota desviou
  warnings: string[];
  alternatives?: RouteInfo[]; // outros caminhos, só quando pedidos
  trafficDelay?: number; // segundos a mais por causa do trânsito (TomTom)
  durationSource?: 'TRANSITO' | 'ESTIMATIVA'; // tempo com o trânsito de agora ou a estimativa do Valhalla
}

// Manobra no formato do OSRM; o texto em português é montado no app
export interface RouteStep {
  type: string; // turn, roundabout, arrive...
  modifier?: string; // left, right, slight left, straight...
  name: string; // rua após a manobra
  location: Coordinates; // ponto da manobra
  distance: number; // meters até a próxima manobra
  duration: number; // seconds
  exit?: number; // saída da rotatória
}

export interface DispatchScore {
  ambulanceId: string;
  totalScore: number;
  timeScore: number; // tempo de chegada (rota com trânsito ou estimativa)
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

export interface DispatchExecution {
  callId: string;
  ambulanceId: string;
  route: RouteInfo;
  estimatedArrival: string;
  timestamp: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface Stats {
  pendingCalls: number; // aguardando despacho
  awaitingRegulation: number;
}

// Uma ação de uma pessoa no chamado: quem, quando e o que mudou
export interface CallEvent {
  id: number;
  at: string;
  action: CallEventAction;
  actor: { id: string | null; name: string; role: UserRole };
  data: Record<string, unknown>;
}
