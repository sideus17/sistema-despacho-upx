import { KeyboardEvent, ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Coordinates, FillSuggestion } from '../types';
import { searchPlaces } from '../services/api';
import { normalizeText } from '../utils/routes';
import { AmbulanceIcon, BasePinIcon, CloseIcon, LocationIcon, MyLocationIcon, PinDropIcon } from '../ui/icons';
import styles from './AddressSearch.module.css';

export type PlaceKind = 'endereco' | 'viatura' | 'base' | 'eu' | 'mapa';

export interface PlaceValue {
  label: string;
  detail?: string;
  location: Coordinates;
  kind: PlaceKind;
  approximate?: boolean; // ponto da rua, não do número digitado
}

// Atalhos no topo da lista: "Minha localização", "Escolher no mapa"
export interface SearchAction {
  id: string;
  label: string;
  kind: 'eu' | 'mapa';
  run: () => void;
}

interface AddressSearchProps {
  id?: string; // para um <label htmlFor> visível
  label: string; // nome do campo para leitores de tela ("Ponto de partida")
  placeholder: string;
  marker?: ReactNode; // bolinha da partida ou pino do destino
  value: PlaceValue | null;
  onChange: (value: PlaceValue | null) => void;
  onTextChange?: (text: string) => void; // texto digitado, para quem aceita endereço sem sugestão
  localPlaces?: PlaceValue[]; // viaturas e bases, filtradas aqui mesmo
  actions?: SearchAction[];
}

type Option = { id: string; place: PlaceValue } | { id: string; action: SearchAction } | { id: string; fill: FillSuggestion };

const DEBOUNCE_MS = 300;
const MIN_REMOTE_LENGTH = 3;
const MAX_LOCAL = 4;

const KIND_ICON: Record<PlaceKind, ReactNode> = {
  endereco: <LocationIcon />,
  viatura: <AmbulanceIcon />,
  base: <BasePinIcon />,
  eu: <MyLocationIcon />,
  mapa: <PinDropIcon />
};

/**
 * Campo de endereço com autocompletar (combobox): viaturas e bases na hora, endereços depois de
 * 300 ms parado (um CEP sugere a rua para completar com o número). Setas escolhem, Enter confirma,
 * Esc fecha a lista.
 */
export default function AddressSearch({
  id,
  label,
  placeholder,
  marker,
  value,
  onChange,
  onTextChange,
  localPlaces = [],
  actions = []
}: AddressSearchProps) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQueryState] = useState(value?.label ?? '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [remote, setRemote] = useState<Array<PlaceValue | FillSuggestion>>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const setQuery = (text: string) => {
    setQueryState(text);
    onTextChange?.(text);
  };

  // Valor trocado por fora (inverter, ponto escolhido no mapa): o texto acompanha. Valor apagado
  // porque a pessoa voltou a digitar: o que ela digitou fica
  const lastLabel = useRef(value?.label);
  useEffect(() => {
    if (value) setQuery(value.label);
    else if (query === lastLabel.current) setQuery('');
    lastLabel.current = value?.label;
  }, [value]);

  const typed = normalizeText(query);
  const searching = open && !!query && query !== value?.label;

  // Endereços do Photon, só depois que a pessoa para de digitar
  useEffect(() => {
    setRemote([]);
    if (!searching || typed.length < MIN_REMOTE_LENGTH) {
      setStatus('idle');
      return;
    }
    const controller = new AbortController();
    setStatus('loading');
    const timer = window.setTimeout(() => {
      searchPlaces(query, controller.signal)
        .then(places => {
          setRemote(places.map(place => ('fill' in place ? place : { ...place, kind: 'endereco' as const })));
          setStatus('idle');
        })
        .catch(() => {
          if (!controller.signal.aborted) setStatus('error');
        });
    }, DEBOUNCE_MS);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [typed, searching]);

  const options = useMemo<Option[]>(() => {
    const actionOptions = actions.map(action => ({ id: `${listId}-${action.id}`, action }));
    const local = (searching ? localPlaces.filter(place => normalizeText(`${place.label} ${place.detail ?? ''}`).includes(typed)) : localPlaces)
      .slice(0, searching ? MAX_LOCAL : localPlaces.length)
      .map((place, index) => ({ id: `${listId}-local-${index}`, place }));
    const found = remote.map((item, index) => ('fill' in item ? { id: `${listId}-remote-${index}`, fill: item } : { id: `${listId}-remote-${index}`, place: item }));
    return searching ? [...local, ...found, ...actionOptions] : [...actionOptions, ...local];
  }, [actions, localPlaces, remote, searching, typed, listId]);

  useEffect(() => setActive(-1), [options]);

  const choose = (option: Option) => {
    if ('fill' in option) {
      // Rua do CEP: o texto fica "Rua da Penha, " e o cursor continua no campo para o número
      setQuery(option.fill.fill);
      inputRef.current?.focus();
      return;
    }
    setOpen(false);
    if ('action' in option) {
      option.action.run();
      return;
    }
    onChange(option.place);
    setQuery(option.place.label);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      if (!options.length) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive(current => (current + step + options.length) % options.length);
    } else if (event.key === 'Enter') {
      const option = options[active] ?? (searching ? options[0] : undefined);
      if (open && option) {
        event.preventDefault();
        choose(option);
      }
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
    }
  };

  const clear = () => {
    setQuery('');
    if (value) onChange(null);
    setOpen(true);
    inputRef.current?.focus();
  };

  const showList = open && (options.length > 0 || status !== 'idle' || (searching && typed.length >= MIN_REMOTE_LENGTH));

  return (
    <div className={`${styles.field} ${marker ? '' : styles.bare}`}>
      {marker && <span className={styles.marker} aria-hidden>{marker}</span>}
      <input
        ref={inputRef}
        id={id}
        className={styles.input}
        role="combobox"
        aria-label={label}
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={active >= 0 ? options[active]?.id : undefined}
        placeholder={placeholder}
        value={query}
        onChange={event => {
          setQuery(event.target.value);
          setOpen(true);
          if (value) onChange(null);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        autoComplete="off"
        spellCheck={false}
      />
      {query && (
        <button type="button" className={styles.clear} onClick={clear} aria-label={`Limpar ${label.toLowerCase()}`}>
          <CloseIcon />
        </button>
      )}

      {showList && (
        <ul id={listId} className={styles.list} role="listbox" aria-label={label}>
          {options.map((option, index) => {
            const place = 'place' in option ? option.place : 'fill' in option ? option.fill : null;
            const kind = 'place' in option ? option.place.kind : 'action' in option ? option.action.kind : 'endereco';
            const detail = [place?.detail, 'place' in option && option.place.approximate ? 'ponto aproximado' : null].filter(Boolean).join(' · ');
            return (
              <li
                key={option.id}
                id={option.id}
                role="option"
                aria-selected={index === active}
                className={`${styles.option} ${index === active ? styles.active : ''}`}
                // Sem isso o campo perde o foco (e fecha a lista) antes do clique valer
                onMouseDown={event => event.preventDefault()}
                onClick={() => choose(option)}
              >
                <span className={styles.optionIcon}>{KIND_ICON[kind]}</span>
                <span className={styles.optionText}>
                  <strong>{place ? place.label : 'action' in option ? option.action.label : ''}</strong>
                  {detail && <small>{detail}</small>}
                </span>
              </li>
            );
          })}
          {status === 'loading' && <li className={styles.status} role="presentation">Buscando endereços…</li>}
          {status === 'error' && <li className={styles.status} role="presentation">A busca não respondeu. Tente de novo ou escolha no mapa.</li>}
          {status === 'idle' && searching && typed.length >= MIN_REMOTE_LENGTH && remote.length === 0 && (
            <li className={styles.status} role="presentation">Nenhum endereço encontrado na região.</li>
          )}
        </ul>
      )}
    </div>
  );
}
