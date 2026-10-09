import { WeatherEventType } from '../types';
import { CarCrashIcon, FloodIcon, IconComponent, TreeIcon, WarningIcon, WindIcon } from './icons';

const ICON: Record<WeatherEventType, IconComponent> = {
  [WeatherEventType.ALAGAMENTO]: FloodIcon,
  [WeatherEventType.QUEDA_ARVORE]: TreeIcon,
  [WeatherEventType.VENTOS_FORTES]: WindIcon,
  [WeatherEventType.ACIDENTE]: CarCrashIcon
};

export function WeatherEventIcon({ type }: { type: WeatherEventType }) {
  const Icon = ICON[type] ?? WarningIcon;
  return <Icon />;
}
