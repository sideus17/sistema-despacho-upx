import { Ambulance, AmbulanceStatus } from '../types';
import { getTimeAgo } from '../services/api';
import { AmbulanceTypeIcon } from '../ui/AmbulanceTypeIcon';
import { LocationIcon, PersonIcon } from '../ui/icons';
import styles from './Fleet.module.css';

const STATUS_LABEL: Record<AmbulanceStatus, string> = {
  [AmbulanceStatus.DISPONIVEL]: 'Disponível',
  [AmbulanceStatus.EM_ATENDIMENTO]: 'Em atendimento',
  [AmbulanceStatus.INDISPONIVEL]: 'Indisponível'
};

// Em turno primeiro (disponíveis no topo); sem motorista por último
function fleetOrder(a: Ambulance): number {
  if (!a.driver) return 3;
  if (a.status === AmbulanceStatus.DISPONIVEL) return 0;
  if (a.status === AmbulanceStatus.EM_ATENDIMENTO) return 1;
  return 2;
}

export default function Fleet({ ambulances }: { ambulances: Ambulance[] }) {
  const sorted = [...ambulances].sort((a, b) => fleetOrder(a) - fleetOrder(b) || a.code.localeCompare(b.code));
  const onShift = ambulances.filter(a => a.driver).length;

  return (
    <div className={styles.container}>
      <p className={styles.summary}>
        <strong>{onShift}</strong> de {ambulances.length} viaturas com motorista em turno
      </p>

      <ul className={styles.list}>
        {sorted.map(ambulance => {
          const status = ambulance.driver ? ambulance.status : 'SEM_MOTORISTA';
          return (
            <li key={ambulance.id} className={`${styles.item} ${!ambulance.driver ? styles.itemOff : ''}`}>
              <div className={styles.header}>
                <span className={styles.code}><AmbulanceTypeIcon type={ambulance.type} /> {ambulance.code} <small>{ambulance.type}</small></span>
                <span className={`${styles.pill} ${styles[`pill_${status}`]}`}>
                  {ambulance.driver ? STATUS_LABEL[ambulance.status] : 'Fora de serviço'}
                </span>
              </div>
              <p className={styles.driver}>
                {ambulance.driver ? <><PersonIcon /> {ambulance.driver.name}</> : 'Sem motorista em turno'}
              </p>
              {ambulance.driver && (
                <p className={styles.meta}>
                  <LocationIcon /> {ambulance.locationUpdatedAt ? `posição atualizada ${getTimeAgo(ambulance.locationUpdatedAt)}` : 'posição da base (sem GPS ainda)'}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
