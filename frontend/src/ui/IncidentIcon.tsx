import { IncidentType } from '../types';
import {
  CarCrashIcon,
  FloodIcon,
  HeavyRainIcon,
  IconComponent,
  OfficialAlertIcon,
  RoadBlockIcon,
  TreeIcon,
  WarningIcon,
  WindIcon
} from './icons';

const ICON: Record<IncidentType, IconComponent> = {
  [IncidentType.ALAGAMENTO]: FloodIcon,
  [IncidentType.QUEDA_ARVORE]: TreeIcon,
  [IncidentType.VIA_BLOQUEADA]: RoadBlockIcon,
  [IncidentType.ACIDENTE]: CarCrashIcon,
  [IncidentType.VENTOS_FORTES]: WindIcon,
  [IncidentType.CHUVA_FORTE]: HeavyRainIcon,
  [IncidentType.ALERTA_OFICIAL]: OfficialAlertIcon
};

export function IncidentIcon({ type }: { type: IncidentType }) {
  const Icon = ICON[type] ?? WarningIcon;
  return <Icon />;
}
