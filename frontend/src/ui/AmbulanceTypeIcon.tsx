import { AmbulanceType } from '../types';
import { AmbulanceIcon, IconComponent, MotorcycleIcon, VanIcon } from './icons';

const ICON: Record<AmbulanceType, IconComponent> = {
  [AmbulanceType.USA]: AmbulanceIcon,
  [AmbulanceType.USB]: VanIcon,
  [AmbulanceType.MOTOLANCIA]: MotorcycleIcon
};

export function AmbulanceTypeIcon({ type }: { type: AmbulanceType }) {
  const Icon = ICON[type] ?? AmbulanceIcon;
  return <Icon />;
}
