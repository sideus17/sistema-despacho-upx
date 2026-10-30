import { useEffect, useState } from 'react';
import { Ambulance, CallOutcome, CallPriority, CallStatus, EmergencyCall, HistoryFilters, Hospital, ManagementScope } from '../../types';
import { getHistory } from '../../services/api';
import { CALL_STATUS_LABEL, OUTCOME_LABEL, PRIORITIES_BY_SEVERITY, PRIORITY_META } from '../../utils/calls';
import { useMediaQuery } from '../../ui/useMediaQuery';
import { Select } from '../../ui/Select';
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from '../../ui/icons';
import { CallDetail, callDurations, openedAt, resultLabel } from './CallDetail';
import { PRIORITY_CHART_COLOR, formatCount, formatMinutes } from './format';
import { useLoad } from './useLoad';
import styles from './History.module.css';

const PAGE_SIZE = 25;
const SEARCH_DELAY_MS = 350;

// Histórico do período: busca, filtros, páginas e o detalhe de cada chamado
export default function History({ scope, ambulances, hospitals }: { scope: ManagementScope; ambulances: Ambulance[]; hospitals: Hospital[] }) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<HistoryFilters>({});
  // A página vale para estes filtros e este período; mudou um deles, volta para a primeira
  const filterKey = JSON.stringify([scope, filters]);
  const [paging, setPaging] = useState({ key: filterKey, page: 1 });
  const page = paging.key === filterKey ? paging.page : 1;
  const setPage = (next: number) => setPaging({ key: filterKey, page: next });
  const [selected, setSelected] = useState<EmergencyCall | null>(null);
  const compact = useMediaQuery('(max-width: 900px)');

  // A busca espera a pessoa parar de digitar
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters(current => (current.q === (search.trim() || undefined) ? current : { ...current, q: search.trim() || undefined }));
    }, SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  const { data, error, loading, retry } = useLoad(
    signal => getHistory(scope, filters, page, signal),
    JSON.stringify([filterKey, page])
  );

  const setFilter = <K extends keyof HistoryFilters>(key: K, value: string) =>
    setFilters(current => ({ ...current, [key]: value || undefined }));
  const active = Object.values(filters).some(Boolean);
  const ambulanceCode = (id?: string) => ambulances.find(ambulance => ambulance.id === id)?.code ?? id ?? '—';
  const hospitalName = (id?: string) => hospitals.find(hospital => hospital.id === id)?.shortName ?? id ?? '—';
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(total, page * PAGE_SIZE);

  return (
    <div className={styles.history}>
      <div className={styles.filters} role="search">
        <label className={styles.search}>
          <SearchIcon aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Endereço, descrição ou telefone"
            aria-label="Buscar no histórico"
          />
        </label>
        <Select
          hideLabel
          label="Cor"
          size="compact"
          className={styles.filter}
          value={filters.priority ?? ''}
          onChange={value => setFilter('priority', value as CallPriority)}
          options={[
            { value: '', label: 'Todas as cores' },
            ...PRIORITIES_BY_SEVERITY.map(priority => ({ value: priority, label: `${PRIORITY_META[priority].name} · ${PRIORITY_META[priority].label}` }))
          ]}
        />
        <Select
          hideLabel
          label="Status"
          size="compact"
          className={styles.filter}
          value={filters.status ?? ''}
          onChange={value => setFilter('status', value as CallStatus)}
          options={[{ value: '', label: 'Todos os status' }, ...Object.values(CallStatus).map(status => ({ value: status, label: CALL_STATUS_LABEL[status] }))]}
        />
        <Select
          hideLabel
          label="Desfecho"
          size="compact"
          className={styles.filter}
          value={filters.outcome ?? ''}
          onChange={value => setFilter('outcome', value as CallOutcome)}
          options={[{ value: '', label: 'Todos os desfechos' }, ...Object.values(CallOutcome).map(outcome => ({ value: outcome, label: OUTCOME_LABEL[outcome] }))]}
        />
        <Select
          hideLabel
          label="Viatura"
          size="compact"
          className={styles.filter}
          value={filters.ambulance ?? ''}
          onChange={value => setFilter('ambulance', value)}
          options={[{ value: '', label: 'Todas as viaturas' }, ...ambulances.map(ambulance => ({ value: ambulance.id, label: ambulance.code }))]}
        />
        <Select
          hideLabel
          label="Hospital"
          size="compact"
          className={styles.filter}
          value={filters.hospital ?? ''}
          onChange={value => setFilter('hospital', value)}
          options={[{ value: '', label: 'Todos os hospitais' }, ...hospitals.map(hospital => ({ value: hospital.id, label: hospital.shortName }))]}
        />
        {(active || search) && (
          <button
            type="button"
            className={styles.clear}
            onClick={() => {
              setSearch('');
              setFilters({});
            }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div className={styles.summary}>
        <span aria-live="polite">
          {data ? (total === 0 ? 'Nenhum chamado' : `${formatCount(first)}–${formatCount(last)} de ${formatCount(total)} chamados`) : 'Carregando…'}
        </span>
        <div className={styles.pager}>
          <button type="button" aria-label="Página anterior" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>
            <ChevronLeftIcon />
          </button>
          <span>{page} de {pages}</span>
          <button type="button" aria-label="Próxima página" disabled={page >= pages || loading} onClick={() => setPage(page + 1)}>
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.failure} role="alert">
          <span>{error}</span>
          <button type="button" onClick={retry}>Tentar de novo</button>
        </div>
      )}

      <div className={`${styles.results} ${loading && data ? styles.refreshing : ''}`} aria-busy={loading}>
        {data && data.items.length === 0 && !loading && (
          <p className={styles.empty}>{active || search ? 'Nenhum chamado com esses filtros.' : 'Nenhum chamado neste período.'}</p>
        )}
        {data && data.items.length > 0 && (compact ? (
          <ul className={styles.cards} aria-label="Chamados">
            {data.items.map(call => {
              const { response } = callDurations(call);
              return (
                <li key={call.id}>
                  <button type="button" className={styles.card} onClick={() => setSelected(call)}>
                    <span className={styles.cardTop}>
                      <PriorityDot priority={call.priority} />
                      <span>{openedAt(call.timestamp)}</span>
                      {call.demo && <span className={styles.demo}>Demonstração</span>}
                    </span>
                    <strong>{call.address}</strong>
                    <span className={styles.cardDescription}>{call.description}</span>
                    <span className={styles.cardMeta}>
                      {resultLabel(call)} · {ambulanceCode(call.ambulance_id)} · resposta {formatMinutes(response)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Abertura</th>
                  <th scope="col">Cor</th>
                  <th scope="col">Endereço</th>
                  <th scope="col">Viatura</th>
                  <th scope="col">Hospital</th>
                  <th scope="col">Desfecho</th>
                  <th scope="col" className={styles.number}>Resposta</th>
                  <th scope="col" className={styles.number}>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map(call => {
                  const { response, total: duration } = callDurations(call);
                  return (
                    <tr key={call.id} className={selected?.id === call.id ? styles.selectedRow : undefined} onClick={() => setSelected(call)}>
                      <td className={styles.nowrap}>{openedAt(call.timestamp)}</td>
                      <td><PriorityDot priority={call.priority} /></td>
                      <td className={styles.addressCell}>
                        <button type="button" className={styles.rowButton} onClick={() => setSelected(call)}>
                          {call.address}
                        </button>
                        <span className={styles.rowDescription}>
                          {call.demo && <span className={styles.demo}>Demonstração</span>} {call.description}
                        </span>
                      </td>
                      <td className={styles.nowrap}>{call.ambulance_id ? ambulanceCode(call.ambulance_id) : '—'}</td>
                      <td>{call.hospitalId ? hospitalName(call.hospitalId) : '—'}</td>
                      <td>{resultLabel(call)}</td>
                      <td className={styles.number}>{formatMinutes(response)}</td>
                      <td className={styles.number}>{formatMinutes(duration)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {selected && (
        <CallDetail
          call={selected}
          ambulanceCode={ambulanceCode(selected.ambulance_id)}
          hospital={hospitals.find(hospital => hospital.id === selected.hospitalId)}
          hospitals={hospitals}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function PriorityDot({ priority }: { priority: CallPriority }) {
  return (
    <span className={styles.priority}>
      <span className={styles.dot} style={{ background: PRIORITY_CHART_COLOR[priority] }} />
      {PRIORITY_META[priority]?.name ?? priority}
    </span>
  );
}
