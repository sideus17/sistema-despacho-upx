import { useEffect, useState } from 'react';
import type { StyleSpecification } from 'maplibre-gl';
import { BASE_STYLE_URL, loadMapStyle, MapTheme } from './mapStyle';

// Estilo SAMU do tema pedido; null enquanto carrega. Se falhar, cai no estilo original do OpenFreeMap.
export function useMapStyle(theme: MapTheme): StyleSpecification | string | null {
  const [style, setStyle] = useState<StyleSpecification | string | null>(null);

  useEffect(() => {
    let active = true;
    loadMapStyle(theme)
      .then(next => active && setStyle(next))
      .catch(() => active && setStyle(BASE_STYLE_URL));
    return () => {
      active = false;
    };
  }, [theme]);

  return style;
}
