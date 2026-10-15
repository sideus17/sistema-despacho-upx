import { IncidentEffect, RouteInfo } from '../types';
import { EFFECT_META, incidentName } from '../map/incidents';
import { formatDistance } from '../services/api';
import { DetourIcon, InfoIcon, WarningIcon } from '../ui/icons';
import styles from './RouteNotes.module.css';

// O que a rota fez com as ocorrências: desvios, o que ainda está no caminho e avisos do cálculo
export default function RouteNotes({ route }: { route: RouteInfo }) {
  const crossing = route.incidentsOnRoute.filter(incident => incident.effect !== IncidentEffect.AVISO);
  const notices = route.incidentsOnRoute.filter(incident => incident.effect === IncidentEffect.AVISO);

  if (!route.avoided.length && !route.incidentsOnRoute.length && !route.warnings.length) return null;

  return (
    <div className={styles.notes}>
      {route.avoided.length > 0 && (
        <p className={styles.detour}>
          <DetourIcon /> Rota desviada para evitar: {route.avoided.map(incidentName).join(', ')}.
        </p>
      )}
      {crossing.map(incident => (
        <p key={incident.id} className={styles.warning}>
          <WarningIcon /> Passa por {incidentName(incident)}
          {incident.distanceAlong !== undefined && ` a ${formatDistance(incident.distanceAlong)}`}
          {' · '}{EFFECT_META[incident.effect].label.toLowerCase()}
        </p>
      ))}
      {notices.length > 0 && (
        <p className={styles.notice}>
          <InfoIcon /> Aviso no caminho: {notices.map(incidentName).join(', ')}.
        </p>
      )}
      {route.warnings.map(warning => (
        <p key={warning} className={styles.warning}><WarningIcon /> {warning}</p>
      ))}
    </div>
  );
}
