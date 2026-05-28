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
  CONCLUIDO = 'CONCLUIDO',
  CANCELADO = 'CANCELADO'
}

export enum WeatherEventType {
  ALAGAMENTO = 'ALAGAMENTO',
  QUEDA_ARVORE = 'QUEDA_ARVORE',
  VENTOS_FORTES = 'VENTOS_FORTES',
  ACIDENTE = 'ACIDENTE'
}

export enum RiskLevel {
  BAIXO = 'BAIXO',
  MEDIO = 'MEDIO',
  ALTO = 'ALTO',
  CRITICO = 'CRITICO'
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
}

export interface EmergencyCall {
  id: string;
  location: Coordinates;
  address: string;
  priority: CallPriority;
  status: CallStatus;
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

export interface WeatherEvent {
  id: string;
  type: WeatherEventType;
  location: Coordinates;
  radius: number;
  riskLevel: RiskLevel;
  description: string;
  startTime: string;
  estimatedEndTime?: string;
}

export interface RouteInfo {
  distance: number;
  duration: number;
  geometry: Coordinates[];
  instructions: RouteInstruction[];
  riskLevel: RiskLevel;
  weatherEvents: WeatherEvent[];
}

export interface RouteInstruction {
  text: string;
  distance: number;
  duration: number;
}

export interface DispatchScore {
  ambulanceId: string;
  totalScore: number;
  distanceScore: number;
  availabilityScore: number;
  typeScore: number;
  weatherPenalty: number;
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

export interface Stats {
  totalAmbulances: number;
  availableAmbulances: number;
  pendingCalls: number;
  activeWeatherEvents: number;
}


