import { ManagementScope, PeopleIndicators } from '../../types';
import { getPeople } from '../../services/api';
import { BarList, ChartCard, medianOf } from './charts';
import { Failure } from './Indicators';
import { formatCount, formatMinutes, plural } from './format';
import { useLoad } from './useLoad';
import indicatorStyles from './Indicators.module.css';
import chartStyles from './charts.module.css';
import { Spinner } from '../../ui/Spinner';
import styles from './People.module.css';

// Por pessoa: o que cada atendente registrou, regulou e despachou, e os atendimentos de cada motorista

export default function People({ scope }: { scope: ManagementScope }) {
  const { data, error, loading, retry } = useLoad(signal => getPeople(scope, signal), JSON.stringify(scope));

  if (!data) {
    return error ? <Failure message={error} onRetry={retry} /> : <div className="loading"><Spinner size={40} /></div>;
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

type Stats = { median: number | null; n: number };

// Tempo bem acima do resto da equipe: 50% acima da mediana do grupo (com pelo menos 3 pessoas para comparar)
const SLOW_FACTOR = 1.5;

function slowLimit(all: Stats[]): number | null {
  const values = all.filter(stats => stats.n > 0 && stats.median !== null).map(stats => stats.median as number).sort((a, b) => a - b);
  if (values.length < 3) return null;
  const middle = Math.floor(values.length / 2);
  const groupMedian = values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
  return groupMedian * SLOW_FACTOR;
}

const isSlow = (stats: Stats, limit: number | null) => limit !== null && stats.n > 0 && stats.median !== null && stats.median > limit;

function TimeCell({ stats, limit }: { stats: Stats; limit: number | null }) {
  const slow = isSlow(stats, limit);
  return (
    <td className={slow ? styles.slow : undefined} title={slow ? 'Bem acima do resto da equipe' : undefined}>
      {slow && '↑ '}{median(stats)}
    </td>
  );
}

const SLOW_NOTE = '↑ tempo 50% acima da mediana da equipe';

// Abaixo disso, a mediana da pessoa diz pouco: a barra fica apagada
const FEW_CASES = 5;

// Ranking de um tempo (mediana por pessoa), do mais rápido ao mais lento, com a mediana da equipe marcada
function TimeRanking({ people, title, label }: { people: Array<{ id: string; name: string; stats: Stats }>; title: string; label: string }) {
  const ranked = people.filter(person => person.stats.n > 0 && person.stats.median !== null).sort((a, b) => a.stats.median! - b.stats.median!);
  if (ranked.length < 2) return null;
  const team = medianOf(ranked.map(person => person.stats.median!))!;
  return (
    <div className={styles.ranking}>
      <h4 className={styles.rankingTitle}>{title}</h4>
      <BarList
        label={label}
        reference={{ value: team, label: `Mediana da equipe: ${formatMinutes(team)}` }}
        items={ranked.map(person => ({
          key: person.id,
          label: person.name,
          value: person.stats.median!,
          valueText: formatMinutes(person.stats.median),
          detail: person.stats.n < FEW_CASES ? `poucos casos (${person.stats.n})` : plural(person.stats.n, 'caso', 'casos'),
          muted: person.stats.n < FEW_CASES
        }))}
      />
    </div>
  );
}

function PeopleView({ data }: { data: PeopleIndicators }) {
  const limits = {
    regulation: slowLimit(data.attendants.map(person => person.regulation)),
    dispatch: slowLimit(data.attendants.map(person => person.dispatch)),
    departure: slowLimit(data.drivers.map(person => person.departure)),
    arrival: slowLimit(data.drivers.map(person => person.arrival))
  };
  const slowAttendant = data.attendants.some(person => isSlow(person.regulation, limits.regulation) || isSlow(person.dispatch, limits.dispatch));
  const slowDriver = data.drivers.some(person => isSlow(person.departure, limits.departure) || isSlow(person.arrival, limits.arrival));
  return (
    <div className={indicatorStyles.grid}>
      <ChartCard wide title="Atendentes" subtitle="Registro, regulação e despacho; tempos pela mediana">
        <TimeRanking
          title="Tempo de regulação, da abertura à cor final"
          label="Tempo de regulação por atendente"
          people={data.attendants.map(person => ({ id: person.id, name: person.name, stats: person.regulation }))}
        />
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
                  <TimeCell stats={person.regulation} limit={limits.regulation} />
                  <TimeCell stats={person.dispatch} limit={limits.dispatch} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {slowAttendant && <p className={indicatorStyles.muted}>{SLOW_NOTE}</p>}
      </ChartCard>

      <ChartCard wide title="Motoristas" subtitle="Atendimentos e tempos depois do despacho (mediana)">
        {data.drivers.length === 0 ? (
          <p className={indicatorStyles.muted}>Nenhum atendimento com motorista registrado no período.</p>
        ) : (
          <>
            <TimeRanking
              title="Chegada ao local, do despacho à chegada"
              label="Tempo até o local por motorista"
              people={data.drivers.map(person => ({ id: person.id, name: person.name, stats: person.arrival }))}
            />
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
                      <TimeCell stats={person.departure} limit={limits.departure} />
                      <TimeCell stats={person.arrival} limit={limits.arrival} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {slowDriver && <p className={indicatorStyles.muted}>{SLOW_NOTE}</p>}
      </ChartCard>
    </div>
  );
}
