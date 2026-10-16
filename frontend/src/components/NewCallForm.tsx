import { CSSProperties, useEffect, useMemo, useState } from 'react';
import { CallPriority, Coordinates, EmergencyCall } from '../types';
import { createCall, getErrorMessage, reversePlace } from '../services/api';
import { PRIORITIES_BY_SEVERITY, PRIORITY_META } from '../utils/calls';
import { TRIAGE_SIGNALS, suggestPriority } from '../utils/triage';
import { LocationIcon } from '../ui/icons';
import AddressSearch, { PlaceValue, SearchAction } from './AddressSearch';
import { useToast } from './Toast';
import styles from './NewCallForm.module.css';

interface NewCallFormProps {
  onCallCreated: (call: EmergencyCall) => void;
  // "Escolher no mapa": o mapa da central avisa o ponto clicado
  picking?: boolean;
  onPickOnMap?: (onPick: (location: Coordinates) => void) => void;
  onCancelPick?: () => void;
  // Local escolhido, para o pino de prévia no mapa
  onDraftChange?: (location: Coordinates | null) => void;
}

const MAP_POINT = 'Ponto marcado no mapa';

// Texto gravado no chamado: nome e bairro/cidade da sugestão; ponto sem nome leva as coordenadas
function addressOf(place: PlaceValue): string {
  if (place.label === MAP_POINT) return `${MAP_POINT} (${place.location.lat.toFixed(5)}, ${place.location.lng.toFixed(5)})`;
  return [place.label, place.detail].filter(Boolean).join(' - ');
}

// Sinais agrupados pela cor que sugerem (o azul não tem sinal: é escolha do operador)
const SIGNAL_GROUPS = PRIORITIES_BY_SEVERITY
  .map(priority => ({ priority, signals: TRIAGE_SIGNALS.filter(signal => signal.priority === priority) }))
  .filter(group => group.signals.length > 0);

export default function NewCallForm({ onCallCreated, picking = false, onPickOnMap, onCancelPick, onDraftChange }: NewCallFormProps) {
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('M');
  // Local escolhido (sugestão ou mapa) ou só o texto digitado, que o servidor procura
  const [place, setPlace] = useState<PlaceValue | null>(null);
  const [addressText, setAddressText] = useState('');
  const [addressKey, setAddressKey] = useState(0);
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [signals, setSignals] = useState<string[]>([]);
  // Cor escolhida pelo operador; sem escolha, vale a sugerida pelos sinais
  const [chosen, setChosen] = useState<CallPriority | null>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const suggested = suggestPriority(signals);
  const priority = chosen ?? suggested;
  const milder = !!(priority && suggested && PRIORITY_META[priority].order > PRIORITY_META[suggested].order);

  // Pino de prévia no mapa; ao sair do formulário, some junto com a escolha no mapa
  useEffect(() => onDraftChange?.(place?.location ?? null), [place]);
  useEffect(() => () => {
    onDraftChange?.(null);
    onCancelPick?.();
  }, []);

  const mapAction = useMemo<SearchAction[]>(() => (onPickOnMap
    ? [{
        id: 'mapa',
        label: 'Escolher no mapa',
        kind: 'mapa',
        run: () => onPickOnMap(async location => {
          const point: PlaceValue = { label: MAP_POINT, location, kind: 'mapa' };
          setPlace(point);
          try {
            const found = await reversePlace(location);
            if (found) setPlace(current => (current?.location === location ? { ...point, label: found.label, detail: found.detail } : current));
          } catch {
            // Sem nome: fica o ponto com as coordenadas
          }
        })
      }]
    : []), [onPickOnMap]);

  const toggleSignal = (code: string) =>
    setSignals(current => (current.includes(code) ? current.filter(item => item !== code) : [...current, code]));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if ((!place && !addressText.trim()) || !description.trim()) {
      toast('Preencha o endereço e o que aconteceu.', 'error');
      return;
    }
    if (!priority) {
      toast('Escolha a classificação de risco.', 'error');
      return;
    }

    try {
      setLoading(true);

      const newCall = await createCall({
        age: age ? Number(age) : undefined,
        gender,
        address: place ? addressOf(place) : addressText.trim(),
        location: place?.location,
        reference: reference.trim() || undefined,
        description,
        priority,
        triage: signals.length > 0 ? { signals, suggested } : undefined
      });

      toast('Chamado criado. Analisando despacho…', 'success');

      setAge('');
      setGender('M');
      setPlace(null);
      setAddressText('');
      setAddressKey(key => key + 1);
      setReference('');
      setDescription('');
      setSignals([]);
      setChosen(null);

      onCallCreated(newCall);
    } catch (error: any) {
      toast(getErrorMessage(error, 'Erro ao criar chamado.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Novo Chamado</h2>

      <p className={styles.intro}>
        Registre o chamado enquanto fala com quem ligou. No endereço, escolha uma sugestão (rua e número, local ou CEP) ou marque no mapa.
      </p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.address}>
          <label className={styles.label} htmlFor="call-address">Endereço</label>
          <AddressSearch
            key={addressKey}
            id="call-address"
            label="Endereço"
            placeholder="Rua e número, local ou CEP"
            value={place}
            onChange={setPlace}
            onTextChange={setAddressText}
            actions={mapAction}
          />
          {picking ? (
            <p className={styles.placeHint}>Clique no mapa para marcar o local do chamado.</p>
          ) : place?.approximate ? (
            <p className={`${styles.placeHint} ${styles.placeApproximate}`}>
              <LocationIcon /> Ponto aproximado: achamos a rua, não o número. Confira o pino ou use “Escolher no mapa”.
            </p>
          ) : place ? (
            <p className={styles.placeHint}><LocationIcon /> {place.kind === 'mapa' ? 'Marcado no mapa' : 'Local confirmado'}{place.detail ? ` · ${place.detail}` : ''}</p>
          ) : addressText.trim().length >= 3 ? (
            <p className={styles.placeHint}>Sem sugestão escolhida: o endereço será procurado ao abrir o chamado.</p>
          ) : null}
        </div>

        <div>
          <label className={styles.label} htmlFor="call-reference">Ponto de referência <span className={styles.optional}>(opcional)</span></label>
          <input
            id="call-reference"
            type="text"
            maxLength={200}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Ex: em frente à padaria, portão azul"
            className={styles.input}
          />
        </div>

        <div>
          <label className={styles.label} htmlFor="call-description">O que aconteceu</label>
          <textarea
            id="call-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva o que está acontecendo com o paciente..."
            rows={4}
            className={styles.input}
          />
        </div>

        <div className={styles.row}>
          <div>
            <label className={styles.label} htmlFor="call-age">Idade</label>
            <input
              id="call-age"
              type="number"
              inputMode="numeric"
              min="0"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Ex: 65"
              className={styles.input}
            />
          </div>

          <div>
            <label className={styles.label} htmlFor="call-gender">Sexo</label>
            <select id="call-gender" value={gender} onChange={(e) => setGender(e.target.value)} className={styles.input}>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
              <option value="OUTRO">Outro / Não informado</option>
            </select>
          </div>
        </div>

        <fieldset className={styles.triage}>
          <legend className={styles.label}>Classificação de risco</legend>
          <p className={styles.hint}>Marque os sinais de alerta que quem ligou relatar.</p>

          {SIGNAL_GROUPS.map(group => (
            <div
              key={group.priority}
              className={styles.signalGroup}
              style={{ '--risk-color': PRIORITY_META[group.priority].color, '--risk-on-color': PRIORITY_META[group.priority].onColor } as CSSProperties}
            >
              <span className={styles.groupName}>{PRIORITY_META[group.priority].name}</span>
              <div className={styles.chips}>
                {group.signals.map(signal => (
                  <button
                    key={signal.code}
                    type="button"
                    className={styles.chip}
                    aria-pressed={signals.includes(signal.code)}
                    onClick={() => toggleSignal(signal.code)}
                  >
                    {signal.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <p className={styles.suggestion} role="status">
            {suggested ? <>Sugerida pelos sinais: <strong>{PRIORITY_META[suggested].name}</strong></> : 'Sem sinais marcados: escolha a cor.'}
          </p>

          <div className={styles.colors} role="radiogroup" aria-label="Classificação de risco">
            {PRIORITIES_BY_SEVERITY.map(option => {
              const meta = PRIORITY_META[option];
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={priority === option}
                  className={styles.color}
                  style={{ '--risk-color': meta.color, '--risk-on-color': meta.onColor } as CSSProperties}
                  onClick={() => setChosen(option)}
                >
                  <strong>{meta.name}</strong>
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </div>

          {milder && <p className={styles.warning}>A cor escolhida é menos grave que a sugerida pelos sinais.</p>}
          <small className={styles.hint}>Classificação inicial — a final é do médico regulador.</small>
        </fieldset>

        <button type="submit" disabled={loading} className={styles.submit}>
          {loading ? 'Criando chamado...' : 'Abrir Chamado'}
        </button>
      </form>
    </div>
  );
}
