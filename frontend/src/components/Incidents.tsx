import { CSSProperties, useState } from 'react';
import { Coordinates, Incident, IncidentEffect, IncidentSource, IncidentType } from '../types';
import { CreateIncidentRequest, getTimeAgo } from '../services/api';
import {
  CENTRAL_DEFAULTS,
  CENTRAL_TYPES,
  EFFECT_META,
  INCIDENT_LABEL,
  expiryLabel,
  sortIncidents,
  sourceLabel
} from '../map/incidents';
import { IncidentIcon } from '../ui/IncidentIcon';
import { AddIcon, AddLocationIcon, CheckCircleIcon, CloseIcon, LocationIcon, OfficialAlertIcon } from '../ui/icons';
import styles from './Incidents.module.css';

// Área sendo marcada no mapa (o mapa desenha a prévia)
export interface IncidentDraft {
  location: Coordinates | null;
  radius: number; // metros
}

const RADIUS_OPTIONS = [100, 200, 500, 1000];
const DURATION_OPTIONS: { label: string; minutes: number | null }[] = [
  { label: '1 h', minutes: 60 },
  { label: '2 h', minutes: 120 },
  { label: '6 h', minutes: 360 },
  { label: 'Até encerrar', minutes: null }
];
const EFFECTS = [IncidentEffect.BLOQUEIO, IncidentEffect.RISCO, IncidentEffect.AVISO];
// Relato de equipe destes tipos vira bloqueio quando confirmado
const CONFIRMABLE = new Set([IncidentType.ALAGAMENTO, IncidentType.VIA_BLOQUEADA]);

const formatRadius = (meters: number) => (meters >= 1000 ? `${meters / 1000} km` : `${meters} m`);

interface IncidentsProps {
  incidents: Incident[];
  draft: IncidentDraft | null;
  onDraftChange: (draft: IncidentDraft | null) => void;
  onCreate: (request: CreateIncidentRequest) => Promise<boolean>;
  onClose: (incident: Incident) => Promise<void>;
  onConfirm: (incident: Incident) => Promise<void>;
  onFocus: (incident: Incident) => void;
}

export default function Incidents({ incidents, draft, onDraftChange, onCreate, onClose, onConfirm, onFocus }: IncidentsProps) {
  const [type, setType] = useState<IncidentType | null>(null);
  const [effect, setEffect] = useState<IncidentEffect>(IncidentEffect.BLOQUEIO);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(120);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmingCloseId, setConfirmingCloseId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Alerta oficial sem área (vale para a cidade toda) aparece como faixa, fora da lista
  const officialAlerts = incidents.filter(i => i.source === IncidentSource.DEFESA_CIVIL && i.radius === 0 && !i.geometry);
  const listed = sortIncidents(incidents.filter(i => !officialAlerts.includes(i)));

  const startDraft = () => {
    setType(null);
    setNote('');
    onDraftChange({ location: null, radius: 200 });
  };

  const cancelDraft = () => onDraftChange(null);

  const chooseType = (next: IncidentType) => {
    const defaults = CENTRAL_DEFAULTS[next]!;
    setType(next);
    setEffect(defaults.effect);
    setDurationMinutes(defaults.durationMinutes);
    if (draft) onDraftChange({ ...draft, radius: defaults.radius });
  };

  const submit = async () => {
    if (!draft?.location || !type) return;
    setSaving(true);
    try {
      const created = await onCreate({
        type,
        lat: draft.location.lat,
        lng: draft.location.lng,
        radius: draft.radius,
        effect,
        durationMinutes,
        description: note.trim() || undefined
      });
      if (created) onDraftChange(null);
    } finally {
      setSaving(false);
    }
  };

  const run = async (incident: Incident, action: (incident: Incident) => Promise<void>) => {
    setBusyId(incident.id);
    try {
      await action(incident);
    } finally {
      setBusyId(null);
      setConfirmingCloseId(null);
    }
  };

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

      {draft ? (
        <section className={styles.form} aria-label="Nova ocorrência">
          <header className={styles.formHeader}>
            <h2>Nova ocorrência</h2>
            <button className={styles.iconButton} onClick={cancelDraft} aria-label="Cancelar"><CloseIcon /></button>
          </header>

          <p className={`${styles.pick} ${draft.location ? styles.pickDone : ''}`}>
            {draft.location
              ? <><CheckCircleIcon /> Local marcado. Toque de novo no mapa para mudar.</>
              : <><AddLocationIcon /> Toque no mapa para marcar o local.</>}
          </p>

          <fieldset className={styles.field}>
            <legend>Tipo</legend>
            <div className={styles.types}>
              {CENTRAL_TYPES.map(option => (
                <button
                  key={option}
                  type="button"
                  className={`${styles.typeChip} ${type === option ? styles.selected : ''}`}
                  aria-pressed={type === option}
                  onClick={() => chooseType(option)}
                >
                  <IncidentIcon type={option} /> {INCIDENT_LABEL[option]}
                </button>
              ))}
            </div>
          </fieldset>

          {type && (
            <>
              <fieldset className={styles.field}>
                <legend>Na rota</legend>
                <div className={styles.chips}>
                  {EFFECTS.map(option => (
                    <button
                      key={option}
                      type="button"
                      className={`${styles.chip} ${effect === option ? styles.selected : ''}`}
                      style={{ '--chip-color': EFFECT_META[option].color } as CSSProperties}
                      aria-pressed={effect === option}
                      onClick={() => setEffect(option)}
                    >
                      {EFFECT_META[option].label}
                    </button>
                  ))}
                </div>
                <p className={styles.hint}>{EFFECT_META[effect].hint}</p>
              </fieldset>

              <fieldset className={styles.field}>
                <legend>Raio</legend>
                <div className={styles.chips}>
                  {RADIUS_OPTIONS.map(option => (
                    <button
                      key={option}
                      type="button"
                      className={`${styles.chip} ${draft.radius === option ? styles.selected : ''}`}
                      aria-pressed={draft.radius === option}
                      onClick={() => onDraftChange({ ...draft, radius: option })}
                    >
                      {formatRadius(option)}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className={styles.field}>
                <legend>Duração</legend>
                <div className={styles.chips}>
                  {DURATION_OPTIONS.map(option => (
                    <button
                      key={option.label}
                      type="button"
                      className={`${styles.chip} ${durationMinutes === option.minutes ? styles.selected : ''}`}
                      aria-pressed={durationMinutes === option.minutes}
                      onClick={() => setDurationMinutes(option.minutes)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className={styles.field}>
                <span className={styles.label}>Observação (opcional)</span>
                <textarea
                  className={styles.note}
                  rows={2}
                  maxLength={280}
                  placeholder="Ex.: água acima do meio-fio na altura do nº 500"
                  value={note}
                  onChange={event => setNote(event.target.value)}
                />
              </label>
            </>
          )}

          <div className={styles.formActions}>
            <button className={styles.primary} disabled={!draft.location || !type || saving} onClick={submit}>
              {saving ? 'Salvando…' : 'Criar ocorrência'}
            </button>
            <button className={styles.secondary} disabled={saving} onClick={cancelDraft}>Cancelar</button>
          </div>
        </section>
      ) : (
        <button className={styles.newButton} onClick={startDraft}><AddIcon /> Nova ocorrência</button>
      )}

      {listed.length === 0 ? (
        <p className={styles.empty}><CheckCircleIcon /> Nenhuma ocorrência ativa</p>
      ) : (
        <ul className={styles.list}>
          {listed.map(incident => {
            const meta = EFFECT_META[incident.effect];
            const busy = busyId === incident.id;
            const confirmable =
              incident.source === IncidentSource.EQUIPE &&
              incident.effect === IncidentEffect.RISCO &&
              CONFIRMABLE.has(incident.type);

            return (
              <li key={incident.id} className={styles.item} style={{ '--effect-color': meta.color } as CSSProperties}>
                <div className={styles.itemHeader}>
                  <span className={styles.itemIcon}><IncidentIcon type={incident.type} /></span>
                  <div className={styles.itemTitle}>
                    <h3>{INCIDENT_LABEL[incident.type] ?? incident.type}</h3>
                    <p>{sourceLabel(incident)} · {getTimeAgo(incident.createdAt)}</p>
                  </div>
                  <span className={styles.effect}>{meta.label}</span>
                </div>

                {incident.description && <p className={styles.description}>{incident.description}</p>}

                <p className={styles.meta}>
                  {expiryLabel(incident)}
                  {incident.radius > 0 && ` · raio ${formatRadius(incident.radius)}`}
                  {incident.votes.yes > 0 && ` · ${incident.votes.yes === 1 ? '1 confirmação' : `${incident.votes.yes} confirmações`}`}
                </p>
                {incident.votes.no > 0 && (
                  <p className={styles.warning}>
                    {incident.votes.no === 1 ? '1 equipe disse' : `${incident.votes.no} equipes disseram`} que não está mais lá
                  </p>
                )}

                <div className={styles.actions}>
                  {confirmingCloseId === incident.id ? (
                    <>
                      <button className={styles.danger} disabled={busy} onClick={() => run(incident, onClose)}>
                        {busy ? 'Encerrando…' : 'Confirmar encerramento'}
                      </button>
                      <button className={styles.secondary} disabled={busy} onClick={() => setConfirmingCloseId(null)}>
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button className={styles.secondary} onClick={() => onFocus(incident)}><LocationIcon /> Ver no mapa</button>
                      {confirmable && (
                        <button className={styles.confirm} disabled={busy} onClick={() => run(incident, onConfirm)}>
                          Confirmar bloqueio
                        </button>
                      )}
                      <button className={styles.secondary} disabled={busy} onClick={() => setConfirmingCloseId(incident.id)}>
                        Encerrar
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
