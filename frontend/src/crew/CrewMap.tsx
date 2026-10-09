import { useEffect, useRef, useState } from 'react';
import { Map as MapGL, Marker, NavigationControl, MapRef } from '@vis.gl/react-maplibre';
import '../map/maplibre';
import { Ambulance, EmergencyCall, Coordinates } from '../types';
import { useMapStyle } from '../map/useMapStyle';
import { MAP_BACKGROUND } from '../map/mapStyle';
import { useMapTheme } from '../map/useMapTheme';
import { RouteLayer } from '../map/RouteLayer';
import { boundsOf, toLngLat } from '../map/geojson';
import { AmbulanceMarker, CallMarker } from '../map/Markers';

interface CrewMapProps {
  ambulance: Ambulance;
  call?: EmergencyCall;
  route?: Coordinates[];
}

export default function CrewMap({ ambulance, call, route }: CrewMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [loaded, setLoaded] = useState(false);
  const { theme } = useMapTheme();
  const mapStyle = useMapStyle(theme);

  const points: Coordinates[] = route && route.length > 1
    ? route
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
      attributionControl={{ compact: true }}
      onLoad={event => {
        event.target.touchZoomRotate.disableRotation();
        setLoaded(true);
      }}
    >
      <NavigationControl position="top-left" showCompass={false} />

      {route && route.length > 1 && <RouteLayer line={route} theme={theme} />}

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
