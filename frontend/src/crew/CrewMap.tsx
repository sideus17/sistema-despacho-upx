import { useEffect, useRef, useState } from 'react';
import { Map as MapGL, Marker, NavigationControl, MapRef } from '@vis.gl/react-maplibre';
import '../map/maplibre';
import { Ambulance, EmergencyCall, Coordinates, Incident } from '../types';
import { useMapStyle } from '../map/useMapStyle';
import { DATA_ATTRIBUTION } from '../map/attribution';
import { MAP_BACKGROUND } from '../map/mapStyle';
import { useTheme } from '../theme/theme';
import { RouteLayer } from '../map/RouteLayer';
import { ROUTE_OPTIONS_LAYER, RouteOptionsLayer } from '../map/RouteOptionsLayer';
import { IncidentLayer } from '../map/IncidentLayer';
import { boundsOf, toLngLat } from '../map/geojson';
import { AmbulanceMarker, CallMarker } from '../map/Markers';

interface CrewMapProps {
  ambulance: Ambulance;
  call?: EmergencyCall;
  routes?: Coordinates[][]; // principal e alternativas
  selectedRoute?: number;
  onSelectRoute?: (index: number) => void;
  incidents?: Incident[];
}

export default function CrewMap({ ambulance, call, routes = [], selectedRoute = 0, onSelectRoute, incidents = [] }: CrewMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [loaded, setLoaded] = useState(false);
  const { theme } = useTheme();
  const mapStyle = useMapStyle(theme);

  const lines = routes.filter(line => line.length > 1);
  const points: Coordinates[] = lines.length > 0
    ? lines.flat()
    : call
      ? [ambulance.location, call.location]
      : [ambulance.location];
  const pointsKey = points.map(p => `${p.lat},${p.lng}`).join(';');

  // Reenquadra só quando os pontos mudam de fato (o polling não mexe no zoom)
  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    if (points.length === 1) map.jumpTo({ center: toLngLat(points[0]), zoom: 15 });
    else map.fitBounds(boundsOf(points), { padding: 32, duration: 0 });
  }, [pointsKey, loaded]);

  if (!mapStyle) return <div style={{ height: '100%', background: MAP_BACKGROUND[theme] }} />;

  return (
    <MapGL
      ref={mapRef}
      initialViewState={{ longitude: ambulance.location.lng, latitude: ambulance.location.lat, zoom: 14 }}
      mapStyle={mapStyle}
      style={{ width: '100%', height: '100%' }}
      // Prévia: norte para cima, sem girar nem inclinar
      dragRotate={false}
      pitchWithRotate={false}
      touchPitch={false}
      attributionControl={{ compact: true, customAttribution: DATA_ATTRIBUTION }}
      // Toque numa rota cinza: ela passa a ser a escolhida
      interactiveLayerIds={lines.length > 1 ? [ROUTE_OPTIONS_LAYER] : undefined}
      onClick={event => {
        const index = event.features?.[0]?.properties?.index;
        if (typeof index === 'number') onSelectRoute?.(index);
      }}
      onLoad={event => {
        event.target.touchZoomRotate.disableRotation();
        // Mapa pequeno: os créditos começam recolhidos no "i" (um toque abre)
        event.target.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
        setLoaded(true);
      }}
    >
      <NavigationControl position="top-left" showCompass={false} />

      <IncidentLayer incidents={incidents} />

      {lines.length > 1 ? (
        <RouteOptionsLayer routes={lines} selected={selectedRoute} theme={theme} />
      ) : (
        lines.length === 1 && <RouteLayer line={lines[0]} theme={theme} />
      )}

      <Marker longitude={ambulance.location.lng} latitude={ambulance.location.lat}>
        <AmbulanceMarker status={ambulance.status} />
      </Marker>

      {call && (
        <Marker longitude={call.location.lng} latitude={call.location.lat} anchor="bottom">
          <CallMarker priority={call.priority} />
        </Marker>
      )}
    </MapGL>
  );
}
