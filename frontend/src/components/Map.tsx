import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Ambulance,
  EmergencyCall,
  Base,
  WeatherEvent,
  AmbulanceStatus,
  CallPriority,
  WeatherEventType,
  RiskLevel,
  Coordinates
} from '../types';

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icons
const createAmbulanceIcon = (status: AmbulanceStatus) => {
  const color = status === AmbulanceStatus.DISPONIVEL ? '#22c55e' : 
                status === AmbulanceStatus.EM_ATENDIMENTO ? '#f59e0b' : '#ef4444';
  
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
      <span style="color: white; font-size: 16px;">🚑</span>
    </div>`,
    className: 'custom-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

const createCallIcon = (priority: CallPriority) => {
  const color = priority === CallPriority.EMERGENCIA ? '#dc2626' :
                priority === CallPriority.URGENTE ? '#f59e0b' : '#3b82f6';
  
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); animation: pulse 2s infinite;">
      <span style="color: white; font-size: 18px; font-weight: bold;">!</span>
    </div>`,
    className: 'custom-icon',
    iconSize: [35, 35],
    iconAnchor: [17.5, 17.5]
  });
};

const createBaseIcon = () => {
  return L.divIcon({
    html: `<div style="background-color: #3b82f6; width: 32px; height: 32px; border-radius: 4px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
      <span style="color: white; font-size: 16px;">🏥</span>
    </div>`,
    className: 'custom-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const createWeatherIcon = (type: WeatherEventType) => {
  const emoji = type === WeatherEventType.ALAGAMENTO ? '🌊' :
                type === WeatherEventType.QUEDA_ARVORE ? '🌳' :
                type === WeatherEventType.VENTOS_FORTES ? '💨' : '⚠️';
  
  return L.divIcon({
    html: `<div style="background-color: #fbbf24; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
      <span style="font-size: 14px;">${emoji}</span>
    </div>`,
    className: 'custom-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
};

// Component to fit bounds when data changes
function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  
  return null;
}

interface MapProps {
  ambulances: Ambulance[];
  calls: EmergencyCall[];
  bases: Base[];
  weatherEvents: WeatherEvent[];
  selectedCall?: EmergencyCall | null;
  routeGeometry?: Coordinates[] | null;
  onCallSelect?: (call: EmergencyCall) => void;
}

export default function Map({
  ambulances,
  calls,
  bases,
  weatherEvents,
  selectedCall,
  routeGeometry,
  onCallSelect
}: MapProps) {
  const mapRef = useRef<L.Map>(null);

  // Calculate bounds to fit all markers
  const bounds = useRef<L.LatLngBounds | null>(null);
  
  useEffect(() => {
    const allPoints: [number, number][] = [];
    
    ambulances.forEach(amb => allPoints.push([amb.location.lat, amb.location.lng]));
    calls.forEach(call => allPoints.push([call.location.lat, call.location.lng]));
    bases.forEach(base => allPoints.push([base.location.lat, base.location.lng]));
    
    if (allPoints.length > 0) {
      bounds.current = L.latLngBounds(allPoints);
    }
  }, [ambulances, calls, bases]);

  // Sorocaba center coordinates
  const center: [number, number] = [-23.5015, -47.4526];

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {bounds.current && <FitBounds bounds={bounds.current} />}

        {/* Ambulances */}
        {ambulances.map(ambulance => (
          <Marker
            key={ambulance.id}
            position={[ambulance.location.lat, ambulance.location.lng]}
            icon={createAmbulanceIcon(ambulance.status)}
          >
            <Popup>
              <div style={{ minWidth: '200px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold' }}>
                  {ambulance.code}
                </h3>
                <p style={{ margin: '4px 0', fontSize: '14px' }}>
                  <strong>Tipo:</strong> {ambulance.type}
                </p>
                <p style={{ margin: '4px 0', fontSize: '14px' }}>
                  <strong>Status:</strong>{' '}
                  <span style={{
                    color: ambulance.status === AmbulanceStatus.DISPONIVEL ? '#22c55e' :
                           ambulance.status === AmbulanceStatus.EM_ATENDIMENTO ? '#f59e0b' : '#ef4444'
                  }}>
                    {ambulance.status}
                  </span>
                </p>
                <p style={{ margin: '4px 0', fontSize: '14px' }}>
                  <strong>Motorista:</strong> {ambulance.crew.driver}
                </p>
                <p style={{ margin: '4px 0', fontSize: '14px' }}>
                  <strong>Médico:</strong> {ambulance.crew.medic}
                </p>
                {ambulance.crew.nurse && (
                  <p style={{ margin: '4px 0', fontSize: '14px' }}>
                    <strong>Enfermeiro:</strong> {ambulance.crew.nurse}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Emergency Calls */}
        {calls.map(call => (
          <Marker
            key={call.id}
            position={[call.location.lat, call.location.lng]}
            icon={createCallIcon(call.priority)}
            opacity={selectedCall?.id === call.id ? 1 : 0.9}
            zIndexOffset={selectedCall?.id === call.id ? 1000 : 0}
            eventHandlers={{
              click: () => onCallSelect && onCallSelect(call)
            }}
          >
            <Popup>
              <div style={{ minWidth: '250px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold' }}>
                  Chamado de Emergência
                </h3>
                <p style={{ margin: '4px 0', fontSize: '14px' }}>
                  <strong>Prioridade:</strong>{' '}
                  <span style={{
                    color: call.priority === CallPriority.EMERGENCIA ? '#dc2626' :
                           call.priority === CallPriority.URGENTE ? '#f59e0b' : '#3b82f6',
                    fontWeight: 'bold'
                  }}>
                    {call.priority}
                  </span>
                </p>
                <p style={{ margin: '4px 0', fontSize: '14px' }}>
                  <strong>Endereço:</strong> {call.address}
                </p>
                <p style={{ margin: '4px 0', fontSize: '14px' }}>
                  <strong>Descrição:</strong> {call.description}
                </p>
                <p style={{ margin: '4px 0', fontSize: '14px' }}>
                  <strong>Sintomas:</strong> {call.patientInfo.symptoms}
                </p>
                {call.patientInfo.age && (
                  <p style={{ margin: '4px 0', fontSize: '14px' }}>
                    <strong>Idade:</strong> {call.patientInfo.age} anos
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Bases */}
        {bases.map(base => (
          <Marker
            key={base.id}
            position={[base.location.lat, base.location.lng]}
            icon={createBaseIcon()}
          >
            <Popup>
              <div style={{ minWidth: '200px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold' }}>
                  {base.name}
                </h3>
                <p style={{ margin: '4px 0', fontSize: '14px' }}>
                  <strong>Endereço:</strong> {base.address}
                </p>
                <p style={{ margin: '4px 0', fontSize: '14px' }}>
                  <strong>Capacidade:</strong> {base.capacity} ambulâncias
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Weather Events */}
        {weatherEvents.map(event => (
          <div key={event.id}>
            <Circle
              center={[event.location.lat, event.location.lng]}
              radius={event.radius}
              pathOptions={{
                color: event.riskLevel === RiskLevel.CRITICO ? '#dc2626' :
                       event.riskLevel === RiskLevel.ALTO ? '#f59e0b' :
                       event.riskLevel === RiskLevel.MEDIO ? '#fbbf24' : '#3b82f6',
                fillOpacity: 0.2
              }}
            />
            <Marker
              position={[event.location.lat, event.location.lng]}
              icon={createWeatherIcon(event.type)}
            >
              <Popup>
                <div style={{ minWidth: '200px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold' }}>
                    Evento Climático
                  </h3>
                  <p style={{ margin: '4px 0', fontSize: '14px' }}>
                    <strong>Tipo:</strong> {event.type.replace('_', ' ')}
                  </p>
                  <p style={{ margin: '4px 0', fontSize: '14px' }}>
                    <strong>Risco:</strong>{' '}
                    <span style={{
                      color: event.riskLevel === RiskLevel.CRITICO ? '#dc2626' :
                             event.riskLevel === RiskLevel.ALTO ? '#f59e0b' :
                             event.riskLevel === RiskLevel.MEDIO ? '#fbbf24' : '#3b82f6',
                      fontWeight: 'bold'
                    }}>
                      {event.riskLevel}
                    </span>
                  </p>
                  <p style={{ margin: '4px 0', fontSize: '14px' }}>
                    <strong>Descrição:</strong> {event.description}
                  </p>
                  <p style={{ margin: '4px 0', fontSize: '14px' }}>
                    <strong>Raio:</strong> {event.radius}m
                  </p>
                </div>
              </Popup>
            </Marker>
          </div>
        ))}

        {/* Route Polyline */}
        {routeGeometry && routeGeometry.length > 0 && (
          <Polyline
            positions={routeGeometry.map(coord => [coord.lat, coord.lng])}
            pathOptions={{
              color: '#3b82f6',
              weight: 4,
              opacity: 0.7
            }}
          />
        )}
      </MapContainer>

      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        backgroundColor: 'white',
        padding: '12px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        zIndex: 1000,
        fontSize: '12px'
      }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>Legenda</h4>
        <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0' }}>
          <span style={{ marginRight: '8px' }}>🚑</span>
          <span>Ambulância</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0' }}>
          <span style={{ marginRight: '8px' }}>!</span>
          <span>Chamado</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0' }}>
          <span style={{ marginRight: '8px' }}>🏥</span>
          <span>Base</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0' }}>
          <span style={{ marginRight: '8px' }}>⚠️</span>
          <span>Evento Climático</span>
        </div>
        {routeGeometry && routeGeometry.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0' }}>
            <span style={{ marginRight: '8px', color: '#3b82f6', fontWeight: 'bold' }}>━</span>
            <span>Rota recomendada</span>
          </div>
        )}
      </div>
    </div>
  );
}


