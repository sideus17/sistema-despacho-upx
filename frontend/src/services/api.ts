import axios from 'axios';
import type { RequestTransformFunction } from 'maplibre-gl';
import {
  Ambulance,
  AmbulanceStatus,
  EmergencyCall,
  Base,
  Incident,
  IncidentType,
  OfficialSourceStatus,
  PlaceSuggestion,
  SpeedLimitSegment,
  DispatchRecommendation,
  RouteInfo,
  Stats,
  ApiResponse,
  Coordinates,
  Me,
  AvatarIcon,
  AvatarColor,
  UserRole
} from '../types';
import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://sistema-despacho-upx-xq9r.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Aumentado para 30 segundos (OSRM pode demorar)
  headers: {
    'Content-Type': 'application/json'
  }
});

// Toda chamada leva o token da sessão (o backend exige login com MFA)
api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Endereço absoluto da API: os blocos do mapa são pedidos por um worker, que não resolve "/api"
const API_ORIGIN_URL = new URL(API_BASE_URL, window.location.origin).href.replace(/\/$/, '');

// Blocos do trânsito ao vivo (o backend busca no TomTom); a versão muda para o mapa pedir de novo
export function trafficTileUrl(version: number): string {
  return `${API_ORIGIN_URL}/traffic/flow/{z}/{x}/{y}.pbf?v=${version}`;
}

// O MapLibre não passa pelo axios: os pedidos dele para a nossa API levam o token aqui
export const withAuthRequest: RequestTransformFunction = async url => {
  if (!url.startsWith(API_ORIGIN_URL)) return { url };
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { url, headers: { Authorization: `Bearer ${token}` } } : { url };
};

// Sessão expirada ou inválida: volta para a tela de login
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) supabase.auth.signOut();
    return Promise.reject(error);
  }
);

// ============================================
// AUTH E TURNO
// ============================================

export interface SignupRequest {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  cpf: string;
  phone: string;
  inviteCode?: string;
}

export async function signUp(request: SignupRequest): Promise<void> {
  await api.post('/auth/signup', request);
}

export async function getMe(): Promise<Me> {
  const response = await api.get<ApiResponse<Me>>('/me');
  return response.data.data!;
}

// Só os campos enviados mudam
export interface ProfilePatch {
  fullName?: string;
  cpf?: string;
  phone?: string;
  avatar?: AvatarIcon | null;
  avatarColor?: AvatarColor | null;
  theme?: 'auto' | 'day' | 'night';
}

export async function updateMe(patch: ProfilePatch): Promise<Me> {
  const response = await api.patch<ApiResponse<Me>>('/me', patch);
  return response.data.data!;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.post('/me/password', { currentPassword, newPassword });
}

// A posição do celular vira a da viatura (o motorista está ao lado dela no início do plantão)
export async function startShift(ambulanceId: string, location?: Coordinates): Promise<void> {
  await api.post('/shifts/start', { ambulanceId, location });
}

export async function endShift(): Promise<void> {
  await api.post('/shifts/end');
}

// ============================================
// AMBULANCES
// ============================================

export async function getAmbulances(): Promise<Ambulance[]> {
  const response = await api.get<ApiResponse<Ambulance[]>>('/ambulances');
  return response.data.data || [];
}

export async function getAvailableAmbulances(): Promise<Ambulance[]> {
  const response = await api.get<ApiResponse<Ambulance[]>>('/ambulances/available');
  return response.data.data || [];
}

export async function getAmbulanceById(id: string): Promise<Ambulance | null> {
  try {
    const response = await api.get<ApiResponse<Ambulance>>(`/ambulances/${id}`);
    return response.data.data || null;
  } catch (error) {
    return null;
  }
}

// ============================================
// CALLS
// ============================================

export async function getCalls(): Promise<EmergencyCall[]> {
  const response = await api.get<ApiResponse<EmergencyCall[]>>('/calls');
  return response.data.data || [];
}

export async function getPendingCalls(): Promise<EmergencyCall[]> {
  const response = await api.get<ApiResponse<EmergencyCall[]>>('/calls/pending');
  return response.data.data || [];
}

export async function getCallById(id: string): Promise<EmergencyCall | null> {
  try {
    const response = await api.get<ApiResponse<EmergencyCall>>(`/calls/${id}`);
    return response.data.data || null;
  } catch (error) {
    return null;
  }
}

export interface CreateCallRequest {
  age?: number;
  gender: string;
  address: string;
  description: string;
  priority: string;
}

export async function createCall(call: CreateCallRequest): Promise<EmergencyCall> {
  const response = await api.post<ApiResponse<EmergencyCall>>('/calls', call);
  return response.data.data!;
}

// ============================================
// BASES
// ============================================

export async function getBases(): Promise<Base[]> {
  const response = await api.get<ApiResponse<Base[]>>('/bases');
  return response.data.data || [];
}

export async function getBaseById(id: string): Promise<Base | null> {
  try {
    const response = await api.get<ApiResponse<Base>>(`/bases/${id}`);
    return response.data.data || null;
  } catch (error) {
    return null;
  }
}

// ============================================
// OCORRÊNCIAS
// ============================================

export async function getIncidents(): Promise<Incident[]> {
  const response = await api.get<ApiResponse<Incident[]>>('/incidents');
  return response.data.data || [];
}

export interface CreateIncidentRequest {
  type: IncidentType;
  lat: number;
  lng: number;
  description?: string;
  clientId?: string; // relato da equipe guardado sem sinal
  reportedAt?: string;
}

// created: entrou agora; merged: confirmou uma ocorrência que já existia ali
export interface CreateIncidentResult {
  incident: Incident;
  created: boolean;
  merged: boolean;
}

export async function createIncident(request: CreateIncidentRequest): Promise<CreateIncidentResult> {
  const response = await api.post<ApiResponse<CreateIncidentResult>>('/incidents', request);
  return response.data.data!;
}

export async function voteIncident(id: string, vote: 'SIM' | 'NAO'): Promise<{ incident: Incident | null; closed: boolean }> {
  const response = await api.post<ApiResponse<{ incident: Incident | null; closed: boolean }>>(`/incidents/${id}/vote`, { vote });
  return response.data.data!;
}

// Última leitura do CEMADEN e da Defesa Civil (feita pelo servidor quando o sistema está em uso)
export async function getOfficialStatus(): Promise<{ enabled: boolean; sources: OfficialSourceStatus[] }> {
  const response = await api.get<ApiResponse<{ enabled: boolean; sources: OfficialSourceStatus[] }>>('/official/status');
  return response.data.data!;
}

// ============================================
// DISPATCH
// ============================================

export async function analyzeDispatch(callId: string): Promise<DispatchRecommendation> {
  try {
    const response = await api.post<ApiResponse<DispatchRecommendation>>('/dispatch/analyze', {
      callId
    });
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Erro ao analisar despacho');
    }
    
    return response.data.data;
  } catch (error: any) {
    console.error('Error in analyzeDispatch:', error);
    if (error.response) {
      throw new Error(error.response.data?.error || 'Erro ao analisar despacho');
    }
    throw new Error('Erro de conexão com o servidor. Verifique se o backend está rodando.');
  }
}

export async function executeDispatch(callId: string, ambulanceId: string): Promise<any> {
  const response = await api.post<ApiResponse<any>>('/dispatch/execute', {
    callId,
    ambulanceId
  });
  return response.data.data!;
}

// ============================================
// ROUTES
// ============================================

// `alternatives`: traz também até 2 caminhos diferentes em `route.alternatives`
export async function calculateRoute(
  from: Coordinates,
  to: Coordinates,
  options: { alternatives?: boolean } = {}
): Promise<RouteInfo> {
  const response = await api.post<ApiResponse<RouteInfo>>('/routes/calculate', {
    from,
    to,
    ...(options.alternatives ? { alternatives: true } : {})
  });
  return response.data.data!;
}

// Limites de velocidade ao longo da rota (placa na navegação); sem dado, a placa não aparece
export async function getSpeedLimits(geometry: Coordinates[]): Promise<SpeedLimitSegment[]> {
  const response = await api.post<ApiResponse<SpeedLimitSegment[]>>('/routes/limits', { geometry });
  return response.data.data ?? [];
}

// Autocompletar de endereços e locais da região de Sorocaba
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  const response = await api.get<ApiResponse<PlaceSuggestion[]>>('/geocode/search', { params: { q: query }, signal });
  return response.data.data ?? [];
}

// Nome do lugar mais próximo de um ponto (escolhido no mapa)
export async function reversePlace(point: Coordinates): Promise<PlaceSuggestion | null> {
  const response = await api.get<ApiResponse<PlaceSuggestion | null>>('/geocode/reverse', { params: point });
  return response.data.data ?? null;
}

// ============================================
// STATS
// ============================================

export async function getStats(): Promise<Stats> {
  const response = await api.get<ApiResponse<Stats>>('/stats');
  return response.data.data!;
}

// ============================================
// HEALTH CHECK
// ============================================

export async function healthCheck(): Promise<boolean> {
  try {
    const response = await api.get('/health');
    return response.data.success === true;
  } catch (error) {
    return false;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}min`;
  }
  return `${minutes}min`;
}

export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getTimeAgo(timestamp: string): string {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'agora';
  if (diffMins === 1) return '1 minuto atrás';
  if (diffMins < 60) return `${diffMins} minutos atrás`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return '1 hora atrás';
  if (diffHours < 24) return `${diffHours} horas atrás`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '1 dia atrás';
  return `${diffDays} dias atrás`;
}

export async function finishDispatch(callId: string): Promise<any> {
  const response = await api.post<ApiResponse<any>>('/dispatch/finish', { callId });
  return response.data.data;
}

export async function updateAmbulanceStatus(ambulanceId: string, status: AmbulanceStatus): Promise<void> {
  await api.patch(`/ambulances/${ambulanceId}/status`, { status });
}

// A velocidade (m/s) deixa o servidor saber se a viatura passou normalmente por uma ocorrência relatada
export async function updateAmbulanceLocation(ambulanceId: string, location: Coordinates, speed?: number | null): Promise<void> {
  await api.patch(`/ambulances/${ambulanceId}/location`, { ...location, speed: speed ?? null });
}

// Sem sinal, tempo esgotado ou servidor fora do ar: o problema não é a conta do usuário
export function isServerUnreachable(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  return !error.response || error.response.status >= 500;
}

export function getErrorMessage(error: any, fallback: string): string {
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.code === 'ERR_NETWORK' || error?.code === 'ECONNABORTED') {
    return 'Sem conexão com o servidor. Tente novamente.';
  }
  return error?.message || fallback;
}


