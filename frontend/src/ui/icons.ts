// Ícones da interface com nomes pelo significado, para trocar a família num lugar só.
// Material Symbols (Apache 2.0) na interface e Healthicons (CC0) nos marcadores do mapa.
// O unplugin-icons embute no build só os usados: nada é baixado em execução (funciona offline).
import type { ComponentType, SVGProps } from 'react';

export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

// Viaturas e funções
export { default as AmbulanceIcon } from '~icons/material-symbols/ambulance-rounded';
export { default as VanIcon } from '~icons/material-symbols/airport-shuttle-rounded';
export { default as MotorcycleIcon } from '~icons/material-symbols/two-wheeler-rounded';
export { default as HeadsetIcon } from '~icons/material-symbols/headset-mic-rounded';
export { default as PersonIcon } from '~icons/material-symbols/person-rounded';

// Navegação da central
export { default as CallIcon } from '~icons/material-symbols/call-rounded';
export { default as AddIcon } from '~icons/material-symbols/add-rounded';
export { default as AnalyticsIcon } from '~icons/material-symbols/analytics-rounded';
export { default as WarningIcon } from '~icons/material-symbols/warning-rounded';
export { default as BackIcon } from '~icons/material-symbols/arrow-back-rounded';
export { default as CloseIcon } from '~icons/material-symbols/close-rounded';

// Detalhes de chamados e rotas
export { default as LocationIcon } from '~icons/material-symbols/location-on-rounded';
export { default as DistanceIcon } from '~icons/material-symbols/straighten-rounded';
export { default as TimerIcon } from '~icons/material-symbols/timer-rounded';
export { default as ScheduleIcon } from '~icons/material-symbols/schedule-rounded';
export { default as TrafficIcon } from '~icons/material-symbols/traffic-rounded';
export { default as DetourIcon } from '~icons/material-symbols/alt-route-rounded';
export { default as StarIcon } from '~icons/material-symbols/star-rounded';
export { default as CheckCircleIcon } from '~icons/material-symbols/check-circle-rounded';
export { default as BellIcon } from '~icons/material-symbols/notifications-active-rounded';

// Prioridades
export { default as EmergencyIcon } from '~icons/material-symbols/e911-emergency-rounded';
export { default as InfoIcon } from '~icons/material-symbols/info-rounded';

// Ocorrências na rota
export { default as FloodIcon } from '~icons/material-symbols/flood-rounded';
export { default as TreeIcon } from '~icons/material-symbols/forest-rounded';
export { default as RoadBlockIcon } from '~icons/material-symbols/remove-road-rounded';
export { default as WindIcon } from '~icons/material-symbols/air-rounded';
export { default as HeavyRainIcon } from '~icons/material-symbols/rainy-heavy-rounded';
export { default as CarCrashIcon } from '~icons/material-symbols/car-crash-rounded';
export { default as OfficialAlertIcon } from '~icons/material-symbols/campaign-rounded';
export { default as AddLocationIcon } from '~icons/material-symbols/add-location-alt-rounded';

// Marcadores do mapa (Healthicons) e legenda
export { default as AmbulanceMarkerIcon } from '~icons/healthicons/ambulance';
export { default as HospitalIcon } from '~icons/healthicons/hospital';
export { default as ExpandMoreIcon } from '~icons/material-symbols/expand-more-rounded';
export { default as ExpandLessIcon } from '~icons/material-symbols/expand-less-rounded';
export { default as AutoThemeIcon } from '~icons/material-symbols/brightness-auto-rounded';
export { default as DayIcon } from '~icons/material-symbols/light-mode-rounded';
export { default as NightIcon } from '~icons/material-symbols/dark-mode-rounded';

// Navegação do motorista
export { default as NavigateIcon } from '~icons/material-symbols/navigation-rounded';
export { default as MyLocationIcon } from '~icons/material-symbols/my-location-rounded';
export { default as VolumeOnIcon } from '~icons/material-symbols/volume-up-rounded';
export { default as VolumeOffIcon } from '~icons/material-symbols/volume-off-rounded';
export { default as ArrivalIcon } from '~icons/material-symbols/sports-score-rounded';
