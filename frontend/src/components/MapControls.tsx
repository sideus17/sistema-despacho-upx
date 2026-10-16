import { useRef } from 'react';
import { GeolocateControl, useMap } from '@vis.gl/react-maplibre';
import type { GeolocateControlInstance } from '@vis.gl/react-maplibre';
import { useToast } from './Toast';
import { AddIcon, MyLocationIcon, RemoveIcon } from '../ui/icons';
import { TrafficToggle } from '../map/TrafficToggle';
import styles from './MapControls.module.css';

/**
 * Botões redondos no canto inferior direito, como no Waze: trânsito, minha localização e zoom.
 * O ponto azul e o círculo de precisão são os do GeolocateControl do MapLibre (sem o botão dele).
 */
export function MapControls() {
  const { current: map } = useMap();
  const geolocate = useRef<GeolocateControlInstance>(null);
  const toast = useToast();

  return (
    <>
      <GeolocateControl
        ref={geolocate}
        position="bottom-right"
        style={{ display: 'none' }}
        showAccuracyCircle
        positionOptions={{ enableHighAccuracy: true, timeout: 10000 }}
        onError={() => toast('Não foi possível obter sua localização. Confira a permissão do navegador.', 'error')}
      />
      <div className={styles.controls}>
        <TrafficToggle className={styles.button} activeClassName={styles.active} />
        <button className={styles.button} onClick={() => geolocate.current?.trigger()} aria-label="Minha localização" title="Minha localização">
          <MyLocationIcon />
        </button>
        <div className={styles.zoom} role="group" aria-label="Zoom">
          <button className={styles.button} onClick={() => map?.zoomIn()} aria-label="Aproximar" title="Aproximar">
            <AddIcon />
          </button>
          <button className={styles.button} onClick={() => map?.zoomOut()} aria-label="Afastar" title="Afastar">
            <RemoveIcon />
          </button>
        </div>
      </div>
    </>
  );
}
