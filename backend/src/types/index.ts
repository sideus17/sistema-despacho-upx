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

export enum CallPriority {
  EMERGENCIA = 'EMERGENCIA',
  URGENTE = 'URGENTE',
  PRIORITARIO = 'PRIORITARIO'
}

export enum CallStatus {
  PENDENTE = 'PENDENTE',
  EM_ATENDIMENTO = 'EM_ATENDIMENTO',
  FINALIZADO = 'FINALIZADO',
  CANCELADO = 'CANCELADO'
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
  driver: { id: string; name: string; avatar: string | null; avatarColor: string | null; phone?: string } | null;
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
  waypoints: Coordinates[]; // pontos da própria rota perto dos desvios (o link do Google Maps passa por eles)
  engine: RouteEngine;
  incidentsOnRoute: RouteIncident[]; // a rota atravessa (aviso, risco aceito ou bloqueio sem alternativa)
  avoided: RouteIncident[]; // a rota desviou
  warnings: string[];
  alternatives?: RouteInfo[]; // outros caminhos, só quando pedidos
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
  distanceScore: number;
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
  totalAmbulances: number;
  availableAmbulances: number;
  pendingCalls: number;
  activeIncidents: number;
  averageResponseTime?: number;
}


