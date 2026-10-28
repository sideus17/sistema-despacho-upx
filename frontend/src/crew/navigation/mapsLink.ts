import { Coordinates } from '../../types';

const format = (c: Coordinates) => `${c.lat.toFixed(6)},${c.lng.toFixed(6)}`;

// O Waze não aceita pontos de passagem por link: ele leva ao destino pelo caminho dele
export function wazeUrl(destination: Coordinates): string {
  return `https://waze.com/ul?ll=${format(destination)}&navigate=yes`;
}
