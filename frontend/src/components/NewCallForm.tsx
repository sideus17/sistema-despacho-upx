import { useEffect, useMemo, useRef, useState } from 'react';
import { Ambulance, CallPriority, Coordinates, EmergencyCall, RecentCallMatch } from '../types';
import { createCall, getErrorMessage, getRecentCalls, getTimeAgo, reversePlace } from '../services/api';
import { CALL_STATUS_LABEL, PRIORITY_META } from '../utils/calls';
import { formatPhone, isValidPhone, onlyDigits } from '../utils/documents';
import { suggestPriority } from '../utils/triage';
import { LocationIcon, WarningIcon } from '../ui/icons';
import AddressSearch, { PlaceValue, SearchAction } from './AddressSearch';
import RiskClassification from './RiskClassification';
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
  onDirtyChange?: (dirty: boolean) => void; // há algo digitado (a aba mostra o rascunho)
  // Aviso de chamado repetido: viatura de cada um e "Ver no mapa"
  ambulances?: Ambulance[];
  onShowCall?: (call: EmergencyCall) => void;
}

const REPEAT_CHECK_DELAY_MS = 300;

function repeatReason({ reasons, distance }: RecentCallMatch): string {
  if (reasons.length === 2) return 'Mesmo telefone e mesmo local';
  if (reasons[0] === 'telefone') return 'Mesmo telefone';
  return distance ? `Mesmo local (a ${distance} m)` : 'Mesmo local';
}

const MAP_POINT = 'Ponto marcado no mapa';

// Texto gravado no chamado: nome e bairro/cidade da sugestão; ponto sem nome leva as coordenadas
function addressOf(place: PlaceValue): string {
  if (place.label === MAP_POINT) return `${MAP_POINT} (${place.location.lat.toFixed(5)}, ${place.location.lng.toFixed(5)})`;
  return [place.label, place.detail].filter(Boolean).join(' - ');
}

export default function NewCallForm({
  onCallCreated,
  picking = false,
  onPickOnMap,
  onCancelPick,
  onDraftChange,
  onDirtyChange,
  ambulances = [],
  onShowCall
}: NewCallFormProps) {
  const [phone, setPhone] = useState('');
  const [phoneBlurred, setPhoneBlurred] = useState(false);
  const [repeats, setRepeats] = useState<RecentCallMatch[]>([]);
  const [age, setAge] = useState('');
  // Vazio = não informado (fica em branco no chamado): nada vem marcado por padrão
  const [gender, setGender] = useState('');
  // Local escolhido (sugestão ou mapa) ou só o texto digitado, que o servidor procura
  const [place, setPlace] = useState<PlaceValue | null>(null);
  const [addressText, setAddressText] = useState('');
  const [addressKey, setAddressKey] = useState(0);
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [signals, setSignals] = useState<string[]>([]);
  // Cor escolhida no registro; sem escolha, vale a sugerida pelos sinais (a final sai na regulação)
  const [chosen, setChosen] = useState<CallPriority | null>(null);
  const [loading, setLoading] = useState(false);
  // Campos que faltaram ao tentar abrir: o erro aparece junto do campo, não num aviso que some
  const [errors, setErrors] = useState<{ address?: boolean; description?: boolean; priority?: boolean }>({});
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();

  const suggested = suggestPriority(signals);
  const priority = chosen ?? suggested;

  const phoneDigits = onlyDigits(phone);
  const phoneOk = isValidPhone(phoneDigits);
  const phoneInvalid = phoneDigits.length > 0 && !phoneOk && (phoneBlurred || phoneDigits.length >= 11);

  // Mesmo telefone ou mesmo local nas últimas 2 h: avisa, sem impedir o chamado novo
  const repeatPhone = phoneOk ? phoneDigits : undefined;
  const repeatLocation = place?.location;
  useEffect(() => {
    setRepeats([]);
    if (!repeatPhone && !repeatLocation) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      getRecentCalls({ phone: repeatPhone, location: repeatLocation }, controller.signal)
        .then(setRepeats)
        .catch(() => {
          // Sem a checagem o chamado abre do mesmo jeito
        });
    }, REPEAT_CHECK_DELAY_MS);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [repeatPhone, repeatLocation?.lat, repeatLocation?.lng]);

  // Pino de prévia no mapa; ao sair do formulário, some junto com a escolha no mapa
  useEffect(() => onDraftChange?.(place?.location ?? null), [place]);

  // Algo digitado ou marcado: a central mostra que há um chamado em preenchimento
  const dirty = !!(phone || age || gender || place || addressText.trim() || reference || description || signals.length || chosen);
  useEffect(() => onDirtyChange?.(dirty), [dirty]);

  // Preencheu o que faltava: o erro some
  useEffect(() => setErrors(current => (current.address ? { ...current, address: false } : current)), [place, addressText]);
  useEffect(() => setErrors(current => (current.description ? { ...current, description: false } : current)), [description]);
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

    if (phoneDigits && !phoneOk) {
      setPhoneBlurred(true);
      document.getElementById('call-phone')?.focus();
      return;
    }
    const missing = { address: !place && !addressText.trim(), description: !description.trim(), priority: !priority };
    if (missing.address || missing.description || missing.priority) {
      setErrors(missing);
      // O cursor vai para o primeiro campo que falta
      const first = missing.address
        ? document.getElementById('call-address')
        : missing.description
          ? document.getElementById('call-description')
          : formRef.current?.querySelector<HTMLElement>('[role="radio"]');
      first?.focus();
      return;
    }
    if (!priority) return;

    try {
      setLoading(true);

      const newCall = await createCall({
        age: age ? Number(age) : undefined,
        gender,
        address: place ? addressOf(place) : addressText.trim(),
        location: place?.location,
        reference: reference.trim() || undefined,
        callerPhone: phoneDigits || undefined,
        description,
        priority,
        triage: signals.length > 0 ? { signals, suggested } : undefined
      });

      toast('Chamado registrado. Aguardando regulação.', 'success');

      setPhone('');
      setPhoneBlurred(false);
      setAge('');
      setGender('');
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
      <h2 className={styles.title}>Novo chamado</h2>

      <p className={styles.intro}>
        Registre o chamado enquanto fala com quem ligou. No endereço, escolha uma sugestão (rua e número, local ou CEP) ou marque no mapa.
      </p>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        // Ctrl+Enter (ou Cmd+Enter) abre o chamado de qualquer campo, inclusive da descrição
        onKeyDown={event => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            formRef.current?.requestSubmit();
          }
        }}
        className={styles.form}
        noValidate
      >
        <div>
          <label className={styles.label} htmlFor="call-phone">Telefone de quem ligou <span className={styles.optional}>(opcional)</span></label>
          <input
            id="call-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="off"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            onBlur={() => setPhoneBlurred(true)}
            placeholder="(15) 99999-9999"
            aria-invalid={phoneInvalid}
            aria-describedby={phoneInvalid ? 'call-phone-error' : undefined}
            className={styles.input}
          />
          {phoneInvalid && <p id="call-phone-error" className={styles.fieldError}>Telefone incompleto ou inválido.</p>}
        </div>

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
            invalid={errors.address}
            describedBy={errors.address ? 'call-address-error' : undefined}
          />
          {errors.address && <p id="call-address-error" className={styles.fieldError}>Informe o endereço ou marque no mapa.</p>}
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

        {repeats.length > 0 && (
          <div className={styles.repeat} role="status">
            <p className={styles.repeatTitle}><WarningIcon /> Possível chamado repetido</p>
            <ul className={styles.repeatList}>
              {repeats.map(match => {
                const ambulance = ambulances.find(item => item.id === match.call.ambulance_id);
                return (
                  <li key={match.call.id}>
                    <div className={styles.repeatText}>
                      <strong>{repeatReason(match)} · {getTimeAgo(match.call.timestamp)}</strong>
                      <span>{match.call.address}</span>
                      <span>
                        {PRIORITY_META[match.call.priority]?.name ?? match.call.priority} · {CALL_STATUS_LABEL[match.call.status] ?? match.call.status}
                        {ambulance ? ` · ${ambulance.code}` : ''}
                      </span>
                    </div>
                    {onShowCall && (
                      <button type="button" className={styles.repeatShow} onClick={() => onShowCall(match.call)}>Ver no mapa</button>
                    )}
                  </li>
                );
              })}
            </ul>
            <small>Confira antes de abrir outro. O aviso não impede abrir o chamado.</small>
          </div>
        )}

        <div>
          <label className={styles.label} htmlFor="call-description">O que aconteceu</label>
          <textarea
            id="call-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva o que está acontecendo com o paciente…"
            rows={3}
            className={styles.input}
            aria-invalid={errors.description}
            aria-describedby={errors.description ? 'call-description-error' : undefined}
          />
          {errors.description && <p id="call-description-error" className={styles.fieldError}>Descreva o que aconteceu.</p>}
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
              <option value="">Não informado</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
              <option value="OUTRO">Outro</option>
            </select>
          </div>
        </div>

        <RiskClassification
          signals={signals}
          onToggleSignal={toggleSignal}
          value={priority}
          onChange={color => {
            setChosen(color);
            setErrors(current => ({ ...current, priority: false }));
          }}
          suggested={suggested}
          footnote="Cor sugerida no registro; a final é definida na regulação."
        />
        {errors.priority && !priority && <p className={styles.fieldError} role="alert">Escolha a cor da classificação de risco.</p>}

        <button type="submit" disabled={loading} className={styles.submit}>
          {loading ? 'Criando chamado…' : 'Abrir chamado'}
        </button>
      </form>
    </div>
  );
}
