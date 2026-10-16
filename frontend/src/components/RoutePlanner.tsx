import { useMemo, useState } from 'react';
import { Ambulance, Base } from '../types';
import { formatDistance, formatDuration } from '../services/api';
import { fastestIndex, routeVia } from '../utils/routes';
import { useToast } from './Toast';
import AddressSearch, { PlaceValue, SearchAction } from './AddressSearch';
import RouteNotes from './RouteNotes';
import type { RoutePlannerState } from './useRoutePlanner';
import { BoltIcon, CloseIcon, DirectionsIcon, ExpandLessIcon, ExpandMoreIcon, LocationIcon, SwapVertIcon } from '../ui/icons';
import styles from './RoutePlanner.module.css';

export type PlannerField = 'from' | 'to';

interface RoutePlannerProps {
  planner: RoutePlannerState;
  ambulances: Ambulance[];
  bases: Base[];
  onPickOnMap: (field: PlannerField) => void;
}

// Bolinha azul da partida, como no Waze
const OriginDot = () => <span className={styles.originDot} />;

/**
 * Painel "Instruções de direção" sobre o mapa da central: partida e destino com autocompletar
 * (viaturas, bases, endereços, minha localização ou um ponto no mapa) e até 3 rotas para comparar.
 */
export default function RoutePlanner({ planner, ambulances, bases, onPickOnMap }: RoutePlannerProps) {
  const toast = useToast();
  // Recolhido: só uma faixa com o destino e o tempo, para o mapa aparecer (no celular ele ocupa meia tela)
  const [collapsed, setCollapsed] = useState(false);
  const { from, to, routes, selected, loading, error } = planner;
  const fastest = fastestIndex(routes);

  const localPlaces = useMemo<PlaceValue[]>(() => [
    ...ambulances.map(ambulance => ({
      label: ambulance.code,
      detail: `Viatura ${ambulance.type}${ambulance.driver ? ` · ${ambulance.driver.name}` : ''}`,
      location: ambulance.location,
      kind: 'viatura' as const
    })),
    ...bases.map(base => ({ label: base.name, detail: base.address, location: base.location, kind: 'base' as const }))
  ], [ambulances, bases]);

  const actionsFor = (field: PlannerField): SearchAction[] => {
    const set = field === 'from' ? planner.setFrom : planner.setTo;
    return [
      {
        id: 'eu',
        label: 'Minha localização',
        kind: 'eu',
        run: () => {
          if (!navigator.geolocation) return toast('Este navegador não informa a localização.', 'error');
          navigator.geolocation.getCurrentPosition(
            position => set({
              label: 'Minha localização',
              location: { lat: position.coords.latitude, lng: position.coords.longitude },
              kind: 'eu'
            }),
            () => toast('Não foi possível obter sua localização. Confira a permissão do navegador.', 'error'),
            { enableHighAccuracy: true, timeout: 10000 }
          );
        }
      },
      { id: 'mapa', label: 'Escolher no mapa', kind: 'mapa', run: () => onPickOnMap(field) }
    ];
  };

  if (!planner.open) {
    return (
      <button className={styles.openButton} onClick={() => planner.setOpen(true)}>
        <DirectionsIcon /> Rotas
      </button>
    );
  }

  const chosen = routes[selected];
  const summary = to && chosen ? `${to.label} · ${formatDuration(chosen.duration)}` : 'Instruções de direção';

  return (
    <section className={styles.panel} aria-label="Instruções de direção">
      <header className={styles.header}>
        <h2 className={collapsed ? styles.summary : undefined}>{collapsed ? summary : 'Instruções de direção'}</h2>
        <button
          className={styles.iconButton}
          onClick={() => setCollapsed(value => !value)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Mostrar rotas' : 'Recolher rotas'}
        >
          {collapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
        </button>
        <button className={styles.iconButton} onClick={() => planner.setOpen(false)} aria-label="Fechar rotas">
          <CloseIcon />
        </button>
      </header>

      {!collapsed && (
        <>
          <div className={styles.fields}>
            <div className={styles.inputs}>
              <AddressSearch
                label="Ponto de partida"
                placeholder="Escolha o ponto de partida"
                marker={<OriginDot />}
                value={from}
                onChange={planner.setFrom}
                localPlaces={localPlaces}
                actions={actionsFor('from')}
              />
              <span className={styles.connector} aria-hidden />
              <AddressSearch
                label="Destino"
                placeholder="Escolha o destino"
                marker={<span className={styles.destination}><LocationIcon /></span>}
                value={to}
                onChange={planner.setTo}
                localPlaces={localPlaces}
                actions={actionsFor('to')}
              />
            </div>
            <button className={styles.iconButton} onClick={planner.swap} aria-label="Inverter partida e destino" title="Inverter">
              <SwapVertIcon />
            </button>
          </div>

          {(loading || error || routes.length > 0) && (
            <div className={styles.results} aria-live="polite">
              {loading && <p className={styles.status}>Calculando rotas…</p>}
              {error && <p className={`${styles.status} ${styles.error}`}>{error}</p>}
              {routes.map((route, index) => {
                const via = routeVia(route);
                const isSelected = index === selected;
                return (
                  <div key={index} className={`${styles.option} ${isSelected ? styles.selected : ''}`}>
                    <button className={styles.optionButton} onClick={() => planner.setSelected(index)} aria-pressed={isSelected}>
                      <span className={styles.optionTime}>{formatDuration(route.duration)}</span>
                      <span className={styles.optionInfo}>
                        {formatDistance(route.distance)}
                        {via && <> · via {via}</>}
                      </span>
                      {index === fastest && routes.length > 1 && <span className={styles.badge}><BoltIcon /> Mais rápida</span>}
                    </button>
                    {isSelected && <RouteNotes route={route} />}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
