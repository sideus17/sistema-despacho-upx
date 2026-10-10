import type { MultiPolygon, Polygon } from 'geojson';

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
  ALERTA_OFICIAL = 'ALERTA_OFICIAL'
}

export enum IncidentSource {
  CENTRAL = 'CENTRAL',
  EQUIPE = 'EQUIPE',
  CEMADEN = 'CEMADEN',
  DEFESA_CIVIL = 'DEFESA_CIVIL'
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

export enum RiskLevel {
  BAIXO = 'BAIXO',
  MEDIO = 'MEDIO',
  ALTO = 'ALTO',
  CRITICO = 'CRITICO'
}

export enum UserRole {
  MOTORISTA = 'MOTORISTA',
  OPERADOR = 'OPERADOR'
}

export interface Me {
  id: string;
  fullName: string;
  role: UserRole;
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
  driver: { id: string; name: string } | null;
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
  geometry: Polygon | MultiPolygon | null; // contorno da área (fontes oficiais), só para exibir
  votes: { yes: number; no: number };
  myVote: IncidentVote | null;
}

export interface WeatherEvent {
  id: string;
  type: IncidentType;
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
  steps: RouteStep[];
  waypoints: Coordinates[];
  riskLevel: RiskLevel;
  weatherEvents: WeatherEvent[];
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
}


