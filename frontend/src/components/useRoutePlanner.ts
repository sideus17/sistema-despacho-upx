import { useEffect, useMemo, useState } from 'react';
import { RouteInfo } from '../types';
import { calculateRoute, getErrorMessage } from '../services/api';
import { routeOptions } from '../utils/routes';
import type { PlaceValue } from './AddressSearch';

const pointKey = (place: PlaceValue | null) => (place ? `${place.location.lat},${place.location.lng}` : '');

// Estado do painel "Instruções de direção": partida, destino e as rotas entre eles
export function useRoutePlanner() {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState<PlaceValue | null>(null);
  const [to, setTo] = useState<PlaceValue | null>(null);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Com os dois pontos, calcula a rota e as alternativas (de novo a cada troca de ponto)
  useEffect(() => {
    setRoute(null);
    setSelected(0);
    setError(null);
    if (!from || !to) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    calculateRoute(from.location, to.location, { alternatives: true })
      .then(result => { if (!cancelled) setRoute(result); })
      .catch(err => { if (!cancelled) setError(getErrorMessage(err, 'Não foi possível calcular as rotas.')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [pointKey(from), pointKey(to)]);

  const routes = useMemo(() => routeOptions(route), [route]);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  return { open, setOpen, from, setFrom, to, setTo, swap, routes, selected, setSelected, loading, error };
}

export type RoutePlannerState = ReturnType<typeof useRoutePlanner>;
