import { useEffect, useState } from 'react';
import { Incident, IncidentSource, OfficialSourceStatus } from '../types';
import { getOfficialStatus, getTimeAgo } from '../services/api';
import { EFFECT_META, effectVars, expiryLabel, incidentTypeLabel, sortIncidents, sourceLabel } from '../map/incidents';
import { IncidentIcon } from '../ui/IncidentIcon';
import { CheckCircleIcon, LocationIcon, OfficialAlertIcon } from '../ui/icons';
import { styles } from './Incidents.styles';

const formatRadius = (meters: number) => (meters >= 1000 ? `${meters / 1000} km` : `${meters} m`);
const OFFICIAL_STATUS_INTERVAL = 60_000;
const clockTime = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

// Quando o servidor leu cada fonte oficial e se deu erro
function OfficialSources() {
  const [sources, setSources] = useState<OfficialSourceStatus[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => getOfficialStatus()
      .then(status => { if (!cancelled) setSources(status.enabled ? status.sources : []); })
      .catch(() => { /* sem status: a lista continua funcionando */ });
    load();
    const timer = window.setInterval(load, OFFICIAL_STATUS_INTERVAL);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  if (!sources) return null;
  return (
    <section className={styles.sources} aria-label="Fontes oficiais">
      <h3>Fontes oficiais</h3>
      {sources.length === 0 && <p>Desligadas neste servidor.</p>}
      {sources.map(source => (
        <p key={source.id} className={source.lastError ? styles.sourceError : undefined}>
          <strong>{source.name}</strong>
          {!source.enabled
            ? ' — sem credenciais configuradas'
            : source.lastError
              ? ` — sem resposta${source.lastSuccess ? ` desde ${clockTime(source.lastSuccess)}` : ''}; nova tentativa em até 15 min`
              : source.lastSuccess
                ? ` — lida às ${clockTime(source.lastSuccess)}: ${source.summary}`
                : ' — lendo…'}
        </p>
      ))}
    </section>
  );
}

interface IncidentsProps {
  incidents: Incident[];
  onFocus: (incident: Incident) => void;
}

function IncidentItem({ incident, onFocus }: { incident: Incident; onFocus: (incident: Incident) => void }) {
  const meta = EFFECT_META[incident.effect];
  // O TomTom informa um trecho de rua: o raio interno (só para a rota) não diz nada aqui
  const showRadius = incident.radius > 0 && incident.source !== IncidentSource.TOMTOM;

  return (
    <li className={styles.item} style={effectVars(incident.effect)}>
      <div className={styles.itemHeader}>
        <span className={styles.itemIcon}><IncidentIcon type={incident.type} /></span>
        <div className={styles.itemTitle}>
          <h3>{incidentTypeLabel(incident.type)}</h3>
          <p>{sourceLabel(incident)} · {getTimeAgo(incident.createdAt)}</p>
        </div>
        <span className={styles.effect}>{meta.label}</span>
      </div>

      {incident.description && <p className={styles.description}>{incident.description}</p>}

      <p className={styles.meta}>
        {expiryLabel(incident)}
        {showRadius && ` · raio ${formatRadius(incident.radius)}`}
        {incident.votes.yes > 0 && ` · ${incident.votes.yes === 1 ? '1 confirmação' : `${incident.votes.yes} confirmações`}`}
      </p>
      {incident.votes.no > 0 && (
        <p className={styles.warning}>
          {incident.votes.no === 1 ? '1 equipe disse' : `${incident.votes.no} equipes disseram`} que não está mais lá
        </p>
      )}

      <div className={styles.actions}>
        <button className={styles.secondary} onClick={() => onFocus(incident)}><LocationIcon /> Ver no mapa</button>
      </div>
    </li>
  );
}

// A central acompanha: quem marca, confirma e tira do mapa são as equipes, as fontes oficiais e o vencimento
export default function Incidents({ incidents, onFocus }: IncidentsProps) {
  // Alerta oficial sem área (vale para a cidade toda) aparece como faixa, fora da lista
  const officialAlerts = incidents.filter(i => i.source === IncidentSource.DEFESA_CIVIL && i.radius === 0 && !i.geometry);
  // Trânsito do TomTom: muitos e mudando a cada minuto; ficam num grupo à parte, recolhido
  const traffic = sortIncidents(incidents.filter(i => i.source === IncidentSource.TOMTOM));
  const listed = sortIncidents(incidents.filter(i => !officialAlerts.includes(i) && i.source !== IncidentSource.TOMTOM));

  return (
    <div className={styles.container}>
      {officialAlerts.map(alert => (
        <div key={alert.id} className={styles.official} role="status">
          <OfficialAlertIcon />
          <div>
            <strong>{sourceLabel(alert)}</strong> · {expiryLabel(alert)}
            {alert.description && <p>{alert.description}</p>}
          </div>
        </div>
      ))}

      <p className={styles.hint}>Relatadas pelas equipes e pelas fontes oficiais. As equipes confirmam e tiram do mapa.</p>

      {listed.length === 0 ? (
        <p className={styles.empty}><CheckCircleIcon /> Nenhuma ocorrência ativa</p>
      ) : (
        <ul className={styles.list}>
          {listed.map(incident => <IncidentItem key={incident.id} incident={incident} onFocus={onFocus} />)}
        </ul>
      )}

      {traffic.length > 0 && (
        <details className={styles.traffic}>
          <summary>Trânsito ao vivo · {traffic.length}</summary>
          <p className={styles.hint}>Interdições, acidentes e congestionamentos fortes. Saem sozinhos quando somem do trânsito ao vivo.</p>
          <ul className={styles.list}>
            {traffic.map(incident => <IncidentItem key={incident.id} incident={incident} onFocus={onFocus} />)}
          </ul>
        </details>
      )}

      <OfficialSources />
    </div>
  );
}
