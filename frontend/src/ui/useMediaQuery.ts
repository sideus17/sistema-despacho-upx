import { useEffect, useState } from 'react';

// Celular deitado: a altura fica pequena e o mapa precisa ir para o lado
export const LANDSCAPE_PHONE = '(orientation: landscape) and (max-height: 540px)';

// Acompanha uma media query do CSS (ex.: girar o celular)
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);

  return matches;
}
