import { Ambulance, AmbulanceStatus } from '../types';
import { getTimeAgo } from '../services/api';
import { AmbulanceTypeIcon } from '../ui/AmbulanceTypeIcon';
import { CallIcon, LocationIcon, LocationOffIcon } from '../ui/icons';
import { Avatar } from '../ui/Avatar';
import { formatPhone } from '../utils/documents';
import { AMBULANCE_STATUS_LABEL, AMBULANCE_TYPE_LABEL, staleLocationText } from '../utils/ambulances';
import styles from './Fleet.module.css';

// Em turno primeiro (disponíveis no topo); sem motorista por último
function fleetOrder(a: Ambulance): number {
  if (!a.driver) return 3;
  if (a.status === AmbulanceStatus.DISPONIVEL) return 0;
  if (a.status === AmbulanceStatus.EM_ATENDIMENTO) return 1;
  return 2;
}

// "Ver no mapa" leva o mapa até a viatura e abre o popup dela
export default function Fleet({ ambulances, onFocus }: { ambulances: Ambulance[]; onFocus?: (ambulance: Ambulance) => void }) {
  const sorted = [...ambulances].sort((a, b) => fleetOrder(a) - fleetOrder(b) || a.code.localeCompare(b.code));
  const onShift = ambulances.filter(a => a.driver).length;
  const now = Date.now();

  return (
    <div className={styles.container}>
      <p className={styles.summary}>
        <strong>{onShift}</strong> de {ambulances.length} viaturas com motorista em turno
      </p>

      <ul className={styles.list}>
        {sorted.map(ambulance => {
          const status = ambulance.driver ? ambulance.status : 'SEM_MOTORISTA';
          const stale = staleLocationText(ambulance, now);
          return (
            <li key={ambulance.id} className={`${styles.item} ${!ambulance.driver ? styles.itemOff : ''}`}>
              <div className={styles.header}>
                <span className={styles.code}><AmbulanceTypeIcon type={ambulance.type} /> {ambulance.code} <small>{AMBULANCE_TYPE_LABEL[ambulance.type] ?? ambulance.type}</small></span>
                <span className={`${styles.pill} ${styles[`pill_${status}`]}`}>
                  {ambulance.driver ? AMBULANCE_STATUS_LABEL[ambulance.status] : 'Fora de serviço'}
                </span>
              </div>
              {ambulance.driver && (
                <div className={styles.driverRow}>
                  <p className={styles.driver}>
                    <Avatar
                      name={ambulance.driver.name}
                      seed={ambulance.driver.id}
                      photo={ambulance.driver.avatarPhoto}
                      color={ambulance.driver.avatarColor}
                      size={24}
                    />
                    {ambulance.driver.name}
                  </p>
                  {ambulance.driver.phone && (
                    <a className={styles.phone} href={`tel:+55${ambulance.driver.phone}`} aria-label={`Ligar para ${ambulance.driver.name}`}>
                      <CallIcon /> {formatPhone(ambulance.driver.phone)}
                    </a>
                  )}
                </div>
              )}
              {/* Sem motorista, o "Fora de serviço" do selo já diz tudo */}
              {ambulance.driver && (stale ? (
                <p className={`${styles.meta} ${styles.metaStale}`}><LocationOffIcon /> {stale}</p>
              ) : (
                <p className={styles.meta}>
                  <LocationIcon /> {ambulance.locationUpdatedAt ? `posição atualizada ${getTimeAgo(ambulance.locationUpdatedAt)}` : 'posição da base (sem GPS ainda)'}
                </p>
              ))}
              {onFocus && (
                <button type="button" className={styles.locate} onClick={() => onFocus(ambulance)} aria-label={`Ver ${ambulance.code} no mapa`}>
                  <LocationIcon /> Ver no mapa
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
