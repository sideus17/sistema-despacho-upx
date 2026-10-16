import { IncidentType } from '../types';
import {
  CarCrashIcon,
  ConstructionIcon,
  FloodIcon,
  HeavyRainIcon,
  IconComponent,
  OfficialAlertIcon,
  RoadBlockIcon,
  StalledVehicleIcon,
  TrafficJamIcon,
  TrafficLightIcon,
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
  [IncidentType.ALERTA_OFICIAL]: OfficialAlertIcon,
  [IncidentType.OBRAS]: ConstructionIcon,
  [IncidentType.CONGESTIONAMENTO]: TrafficJamIcon,
  [IncidentType.PERIGO_NA_VIA]: WarningIcon,
  [IncidentType.VEICULO_PARADO]: StalledVehicleIcon,
  [IncidentType.SEMAFORO_QUEBRADO]: TrafficLightIcon
};

export function IncidentIcon({ type }: { type: IncidentType }) {
  const Icon = ICON[type] ?? WarningIcon;
  return <Icon />;
}
