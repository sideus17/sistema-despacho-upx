import { KeyboardEvent, ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Coordinates } from '../types';
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
}

// Atalhos no topo da lista: "Minha localização", "Escolher no mapa"
export interface SearchAction {
  id: string;
  label: string;
  kind: 'eu' | 'mapa';
  run: () => void;
}

interface AddressSearchProps {
  label: string; // nome do campo para leitores de tela ("Ponto de partida")
  placeholder: string;
  marker: ReactNode; // bolinha da partida ou pino do destino
  value: PlaceValue | null;
  onChange: (value: PlaceValue | null) => void;
  localPlaces?: PlaceValue[]; // viaturas e bases, filtradas aqui mesmo
  actions?: SearchAction[];
}

type Option = { id: string; place: PlaceValue } | { id: string; action: SearchAction };

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
 * Campo de endereço com autocompletar (combobox): viaturas e bases na hora, endereços do Photon
 * depois de 300 ms parado. Setas escolhem, Enter confirma, Esc fecha a lista.
 */
export default function AddressSearch({ label, placeholder, marker, value, onChange, localPlaces = [], actions = [] }: AddressSearchProps) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(value?.label ?? '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [remote, setRemote] = useState<PlaceValue[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  // Valor trocado por fora (inverter, ponto escolhido no mapa): o texto acompanha
  useEffect(() => setQuery(value?.label ?? ''), [value]);

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
          setRemote(places.map(place => ({ ...place, kind: 'endereco' as const })));
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
    const found = remote.map((place, index) => ({ id: `${listId}-remote-${index}`, place }));
    return searching ? [...local, ...found, ...actionOptions] : [...actionOptions, ...local];
  }, [actions, localPlaces, remote, searching, typed, listId]);

  useEffect(() => setActive(-1), [options]);

  const choose = (option: Option) => {
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
    onChange(null);
    setOpen(true);
    inputRef.current?.focus();
  };

  const showList = open && (options.length > 0 || status !== 'idle' || (searching && typed.length >= MIN_REMOTE_LENGTH));

  return (
    <div className={styles.field}>
      <span className={styles.marker} aria-hidden>{marker}</span>
      <input
        ref={inputRef}
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
            const place = 'place' in option ? option.place : null;
            const kind = place?.kind ?? ('action' in option ? option.action.kind : 'endereco');
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
                  {place?.detail && <small>{place.detail}</small>}
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
