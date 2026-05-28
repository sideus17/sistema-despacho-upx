import axios from 'axios';
import {
  Ambulance,
  EmergencyCall,
  Base,
  WeatherEvent,
  DispatchRecommendation,
  RouteInfo,
  Stats,
  ApiResponse,
  Coordinates
} from '../types';

const API_BASE_URL = 'https://sistema-despacho-upx.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Aumentado para 30 segundos (OSRM pode demorar)
  headers: {
    'Content-Type': 'application/json'
  }
});

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
// WEATHER EVENTS
// ============================================

export async function getWeatherEvents(): Promise<WeatherEvent[]> {
  const response = await api.get<ApiResponse<WeatherEvent[]>>('/weather/events');
  return response.data.data || [];
}

export async function getAllWeatherEvents(): Promise<WeatherEvent[]> {
  const response = await api.get<ApiResponse<WeatherEvent[]>>('/weather/events/all');
  return response.data.data || [];
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

export async function calculateRoute(from: Coordinates, to: Coordinates): Promise<RouteInfo> {
  const response = await api.post<ApiResponse<RouteInfo>>('/routes/calculate', {
    from,
    to
  });
  return response.data.data!;
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


