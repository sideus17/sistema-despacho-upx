import { RouteStep } from '../../types';
import type { IconComponent } from '../../ui/icons';
import TurnLeft from '~icons/material-symbols/turn-left-rounded';
import TurnRight from '~icons/material-symbols/turn-right-rounded';
import TurnSlightLeft from '~icons/material-symbols/turn-slight-left-rounded';
import TurnSlightRight from '~icons/material-symbols/turn-slight-right-rounded';
import TurnSharpLeft from '~icons/material-symbols/turn-sharp-left-rounded';
import TurnSharpRight from '~icons/material-symbols/turn-sharp-right-rounded';
import Straight from '~icons/material-symbols/straight-rounded';
import UTurnLeft from '~icons/material-symbols/u-turn-left-rounded';
import RoundaboutLeft from '~icons/material-symbols/roundabout-left-rounded';
import RoundaboutRight from '~icons/material-symbols/roundabout-right-rounded';
import ForkLeft from '~icons/material-symbols/fork-left-rounded';
import ForkRight from '~icons/material-symbols/fork-right-rounded';
import RampLeft from '~icons/material-symbols/ramp-left-rounded';
import RampRight from '~icons/material-symbols/ramp-right-rounded';
import Merge from '~icons/material-symbols/merge-rounded';
import Arrival from '~icons/material-symbols/sports-score-rounded';

const DIRECTION: Record<string, string> = {
  left: 'à esquerda',
  right: 'à direita',
  'slight left': 'levemente à esquerda',
  'slight right': 'levemente à direita',
  'sharp left': 'acentuadamente à esquerda',
  'sharp right': 'acentuadamente à direita',
  straight: 'em frente',
  uturn: 'o retorno'
};

// Mesmas setas do Google Maps, escolhidas pelo modifier do OSRM
const ICON: Record<string, IconComponent> = {
  left: TurnLeft,
  right: TurnRight,
  'slight left': TurnSlightLeft,
  'slight right': TurnSlightRight,
  'sharp left': TurnSharpLeft,
  'sharp right': TurnSharpRight,
  straight: Straight,
  // No Brasil o retorno é feito pela esquerda
  uturn: UTurnLeft
};

const ROUNDABOUT_TYPES = ['roundabout', 'rotary', 'roundabout turn', 'exit roundabout', 'exit rotary'];

// "na Rua X", "no Viaduto Y": o artigo depende do tipo de logradouro
const MASCULINE = /^(viaduto|largo|túnel|tunel|acesso|anel|contorno|elevado|corredor|parque|retorno|trevo|beco|caminho|complexo|passeio)\b/i;

function withArticle(name: string, feminine: string, masculine: string): string {
  if (!name) return '';
  return MASCULINE.test(name) ? ` ${masculine} ${name}` : ` ${feminine} ${name}`;
}

const onStreet = (name: string) => withArticle(name, 'na', 'no');
const alongStreet = (name: string) => withArticle(name, 'pela', 'pelo');
const toStreet = (name: string) => withArticle(name, 'para a', 'para o');

export function maneuverIcon(step: RouteStep): IconComponent {
  const modifier = step.modifier ?? 'straight';
  const left = modifier.includes('left');

  if (step.type === 'arrive') return Arrival;
  if (ROUNDABOUT_TYPES.includes(step.type)) return left ? RoundaboutLeft : RoundaboutRight;
  if (step.type === 'merge') return Merge;
  if (step.type === 'on ramp' || step.type === 'off ramp') {
    if (modifier === 'straight') return Straight;
    return left ? RampLeft : RampRight;
  }
  if (step.type === 'fork') {
    if (modifier === 'straight') return Straight;
    return left ? ForkLeft : ForkRight;
  }
  return ICON[modifier] ?? Straight;
}

// Tipos em que o modificador "uturn" não muda a frase (saída de rotatória, partida, chegada)
const UTURN_KEEPS_TEXT = new Set(['depart', 'arrive', 'roundabout', 'rotary', 'exit roundabout', 'exit rotary', 'merge']);

export function maneuverText(step: RouteStep): string {
  const direction = DIRECTION[step.modifier ?? ''] ?? '';

  // Retorno é sempre "Faça o retorno", seja qual for o tipo (antes saía "Mantenha-se o retorno")
  if (step.modifier === 'uturn' && !UTURN_KEEPS_TEXT.has(step.type)) return `Faça o retorno${onStreet(step.name)}`;

  switch (step.type) {
    case 'depart':
      return `Siga${alongStreet(step.name)}`;
    case 'arrive':
      return 'Você chegou ao destino';
    case 'roundabout':
    case 'rotary':
      return step.exit
        ? `Na rotatória, pegue a ${step.exit}ª saída${toStreet(step.name)}`
        : `Entre na rotatória${toStreet(step.name)}`;
    case 'roundabout turn':
      return direction ? `Na rotatória, vire ${direction}` : 'Siga pela rotatória';
    case 'exit roundabout':
    case 'exit rotary':
      return `Saia da rotatória${onStreet(step.name)}`;
    case 'merge':
      return `Entre${onStreet(step.name)}`;
    case 'on ramp':
      return `Pegue o acesso ${direction}${onStreet(step.name)}`.replace('  ', ' ');
    case 'off ramp':
      return `Pegue a saída ${direction}${onStreet(step.name)}`.replace('  ', ' ');
    case 'fork':
    case 'new name':
    case 'continue':
      if (!direction || step.modifier === 'straight') return `Continue${alongStreet(step.name)}`;
      return `Mantenha-se ${direction}${onStreet(step.name)}`;
    default:
      // turn, end of road, notification...
      if (step.modifier === 'straight') return `Siga em frente${onStreet(step.name)}`;
      if (!direction) return `Siga${alongStreet(step.name)}`;
      return `Vire ${direction}${onStreet(step.name)}`;
  }
}

// Distância curta e arredondada, como nos apps de navegação
export function formatNavDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`;
  if (meters >= 100) return `${Math.round(meters / 50) * 50} m`;
  return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
}

// Versão falada: "Em 250 metros, vire à direita na Rua X"
export function spokenInstruction(step: RouteStep, meters: number): string {
  const text = maneuverText(step);
  if (meters < 60) return text;
  const amount = meters >= 1000
    ? `${(meters / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} quilômetros`
    : `${Math.round(meters / 50) * 50} metros`;
  return `Em ${amount}, ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
}
