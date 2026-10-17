import { ManagementScope, PeopleIndicators } from '../../types';
import { getPeople } from '../../services/api';
import { ChartCard } from './charts';
import { Failure } from './Indicators';
import { formatCount, formatMinutes, plural } from './format';
import { useLoad } from './useLoad';
import indicatorStyles from './Indicators.module.css';
import chartStyles from './charts.module.css';
import styles from './People.module.css';

// Por pessoa: o que cada atendente registrou, regulou e despachou, e os atendimentos de cada motorista

export default function People({ scope }: { scope: ManagementScope }) {
  const { data, error, loading, retry } = useLoad(signal => getPeople(scope, signal), JSON.stringify(scope));

  if (!data) {
    return error ? <Failure message={error} onRetry={retry} /> : <div className="loading"><div className="spinner" /></div>;
  }

  const empty = data.attendants.length === 0 && data.drivers.length === 0;
  return (
    <div className={`${indicatorStyles.indicators} ${loading ? indicatorStyles.refreshing : ''}`} aria-busy={loading}>
      {error && <Failure message={error} onRetry={retry} />}
      {(data.unattributed > 0 || data.truncated) && (
        <div className={indicatorStyles.notice} role="note">
          {data.unattributed > 0 && (
            <p>
              {plural(data.unattributed, 'chamado do período é', 'chamados do período são')} de antes do registro de quem fez cada
              passo e {data.unattributed === 1 ? 'fica' : 'ficam'} fora dos números dos atendentes.
            </p>
          )}
          {data.truncated && <p>O período tem chamados demais: os números usam só os primeiros 50 000.</p>}
        </div>
      )}
      {empty ? (
        <div className={indicatorStyles.empty}>
          <strong>Ninguém registrou chamados neste período.</strong>
          {!scope.demo && <span>Ligue "Incluir demonstração" para ver a equipe de exemplo.</span>}
        </div>
      ) : (
        <PeopleView data={data} />
      )}
    </div>
  );
}

function Name({ name, demo }: { name: string; demo: boolean }) {
  return (
    <span className={styles.name}>
      {name}
      {demo && <span className={styles.demo}>Demonstração</span>}
    </span>
  );
}

// Mediana, com "—" quando ninguém tem os dois horários
const median = (stats: { median: number | null; n: number }) => (stats.n > 0 ? formatMinutes(stats.median) : '—');

function PeopleView({ data }: { data: PeopleIndicators }) {
  return (
    <div className={indicatorStyles.grid}>
      <ChartCard wide title="Atendentes" subtitle="Registro, regulação e despacho; tempos pela mediana">
        <div className={chartStyles.tableWrap}>
          <table className={`${chartStyles.table} ${styles.table}`}>
            <thead>
              <tr>
                <th scope="col">Atendente</th>
                <th scope="col">Registrou</th>
                <th scope="col">Regulou</th>
                <th scope="col">Despachou</th>
                <th scope="col" title="Orientação por telefone ou cancelamento">Sem viatura</th>
                <th scope="col" title="Regulados com a cor diferente da do registro">Mudou a cor</th>
                <th scope="col" title="Da abertura à regulação">Regulação</th>
                <th scope="col" title="Da regulação ao despacho">Espera pela viatura</th>
              </tr>
            </thead>
            <tbody>
              {data.attendants.map(person => (
                <tr key={person.id}>
                  <th scope="row"><Name name={person.name} demo={person.demo} /></th>
                  <td>{formatCount(person.opened)}</td>
                  <td>{formatCount(person.regulated)}</td>
                  <td>{formatCount(person.dispatched)}</td>
                  <td>{formatCount(person.closedWithoutDispatch)}</td>
                  <td>{formatCount(person.reclassified)}</td>
                  <td>{median(person.regulation)}</td>
                  <td>{median(person.dispatch)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <ChartCard wide title="Motoristas" subtitle="Atendimentos e tempos depois do despacho (mediana)">
        {data.drivers.length === 0 ? (
          <p className={indicatorStyles.muted}>Nenhum atendimento com motorista registrado no período.</p>
        ) : (
          <div className={chartStyles.tableWrap}>
            <table className={`${chartStyles.table} ${styles.table}`}>
              <thead>
                <tr>
                  <th scope="col">Motorista</th>
                  <th scope="col">Atendimentos</th>
                  <th scope="col" title="Do despacho à saída da viatura">Saída</th>
                  <th scope="col" title="Do despacho à chegada ao local">Chegada ao local</th>
                </tr>
              </thead>
              <tbody>
                {data.drivers.map(person => (
                  <tr key={person.id}>
                    <th scope="row"><Name name={person.name} demo={person.demo} /></th>
                    <td>{formatCount(person.attended)}</td>
                    <td>{median(person.departure)}</td>
                    <td>{median(person.arrival)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>
    </div>
  );
}
