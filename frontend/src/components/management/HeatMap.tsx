import { useEffect, useRef, useState } from 'react';
import { Map as MapGL, MapRef, Marker, NavigationControl } from '@vis.gl/react-maplibre';
import '../../map/maplibre';
import { Base, CallPriority, Hospital, ManagementScope } from '../../types';
import { getHeatmap, withAuthRequest } from '../../services/api';
import { useMapStyle } from '../../map/useMapStyle';
import { MAP_LOCALE } from '../../map/locale';
import { DATA_ATTRIBUTION } from '../../map/attribution';
import { CallHeatLayer } from '../../map/CallHeatLayer';
import { HEAT_RAMP } from '../../map/heat';
import { boundsOf } from '../../map/geojson';
import { BaseMarker, HospitalMarker } from '../../map/Markers';
import { useTheme } from '../../theme/theme';
import { PRIORITIES_BY_SEVERITY, PRIORITY_META } from '../../utils/calls';
import { PRIORITY_CHART_COLOR, formatCount, plural } from './format';
import { useLoad } from './useLoad';
import styles from './HeatMap.module.css';

// Sorocaba
const INITIAL_VIEW = { longitude: -47.4526, latitude: -23.4815, zoom: 11.5 };

// Onde os chamados do período aconteceram: calor de longe, cada chamado com a sua cor de perto
export default function HeatMap({ scope, hospitals, bases }: { scope: ManagementScope; hospitals: Hospital[]; bases: Base[] }) {
  const { data, error, loading, retry } = useLoad(signal => getHeatmap(scope, signal), JSON.stringify(scope));
  const [priorities, setPriorities] = useState<CallPriority[]>(PRIORITIES_BY_SEVERITY);
  const { theme } = useTheme();
  const mapStyle = useMapStyle(theme);
  const mapRef = useRef<MapRef>(null);
  const [loaded, setLoaded] = useState(false);
  const fitted = useRef(false);
  const points = data?.points ?? [];
  const shown = points.filter(point => priorities.includes(point[2])).length;

  // Enquadra os chamados só na primeira carga, para não desfazer o zoom de quem está olhando
  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map || fitted.current || points.length === 0) return;
    map.fitBounds(boundsOf(points.map(([lat, lng]) => ({ lat, lng }))), { padding: 60, maxZoom: 14, duration: 0 });
    fitted.current = true;
  }, [loaded, points]);

  const toggle = (priority: CallPriority) =>
    setPriorities(current => (current.includes(priority) ? current.filter(item => item !== priority) : [...current, priority]));

  return (
    <div className={styles.wrapper}>
      {mapStyle ? (
        <MapGL
          ref={mapRef}
          locale={MAP_LOCALE}
          initialViewState={INITIAL_VIEW}
          mapStyle={mapStyle}
          style={{ width: '100%', height: '100%' }}
          dragRotate={false}
          pitchWithRotate={false}
          touchPitch={false}
          attributionControl={{ compact: true, customAttribution: DATA_ATTRIBUTION }}
          transformRequest={withAuthRequest}
          onLoad={event => {
            event.target.touchZoomRotate.disableRotation();
            // No celular os créditos abertos cobrem o mapa: começam recolhidos no "i"
            if (window.matchMedia('(max-width: 768px)').matches) {
              event.target.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
            }
            setLoaded(true);
          }}
        >
          <NavigationControl position="bottom-right" showCompass={false} />
          <CallHeatLayer points={points} priorities={priorities} theme={theme} />
          {hospitals.map(hospital => (
            <Marker key={hospital.id} longitude={hospital.location.lng} latitude={hospital.location.lat}>
              <span title={hospital.name}><HospitalMarker kind={hospital.kind} /></span>
            </Marker>
          ))}
          {bases.map(base => (
            <Marker key={base.id} longitude={base.location.lng} latitude={base.location.lat}>
              <span title={base.name}><BaseMarker /></span>
            </Marker>
          ))}
        </MapGL>
      ) : (
        <div className="map-loading" />
      )}

      <section className={`${styles.panel} ${loading ? styles.refreshing : ''}`} aria-label="Mapa de calor" aria-busy={loading}>
        <strong className={styles.count}>{data ? `${plural(shown, 'chamado', 'chamados')} no mapa` : 'Carregando…'}</strong>
        <div className={styles.filters} role="group" aria-label="Cores no mapa">
          {PRIORITIES_BY_SEVERITY.map(priority => (
            <button key={priority} type="button" aria-pressed={priorities.includes(priority)} onClick={() => toggle(priority)}>
              <span className={styles.dot} style={{ background: PRIORITY_CHART_COLOR[priority] }} />
              {PRIORITY_META[priority].name}
            </button>
          ))}
        </div>
        <div className={styles.scale} aria-hidden="true">
          <span>Menos</span>
          <span className={styles.ramp} style={{ background: `linear-gradient(to right, ${HEAT_RAMP[theme].slice(1).join(', ')})` }} />
          <span>Mais chamados</span>
        </div>
        <p className={styles.hint}>Aproxime o mapa para ver cada chamado com a sua cor.</p>
        {data?.truncated && <p className={styles.hint}>Mostrando os {formatCount(points.length)} mais recentes.</p>}
        {error && (
          <p className={styles.error} role="alert">
            {error} <button type="button" onClick={retry}>Tentar de novo</button>
          </p>
        )}
      </section>
    </div>
  );
}
