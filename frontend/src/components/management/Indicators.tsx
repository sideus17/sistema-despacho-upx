import { Ambulance, AttendanceStage, CallOutcome, CallPriority, Hospital, Indicators as IndicatorData, ManagementScope } from '../../types';
import { getIndicators } from '../../services/api';
import { OUTCOME_LABEL, PRIORITIES_BY_SEVERITY, PRIORITY_META } from '../../utils/calls';
import { BarItem, BarList, ChartCard, Column, ColumnChart, RangeList, StatTile } from './charts';
import {
  PRIORITY_CHART_COLOR,
  STAGE_LABEL,
  formatCount,
  formatDay,
  formatMinutes,
  formatPercent,
  formatWeekday,
  plural
} from './format';
import { useLoad } from './useLoad';
import { Spinner } from '../../ui/Spinner';
import styles from './Indicators.module.css';

// Etapas do atendimento em ordem (o tempo-resposta soma as da abertura à chegada e tem cartão próprio).
// Com chamados regulados no período, a fila aparece dividida em regulação e espera pela viatura.
const AFTER_DISPATCH: AttendanceStage[] = ['departure', 'travel', 'onScene', 'transport'];
const stagesFor = (data: IndicatorData): AttendanceStage[] =>
  data.stages.regulation.n > 0 ? ['regulation', 'dispatchWait', ...AFTER_DISPATCH] : ['queue', ...AFTER_DISPATCH];
const OUTCOMES: CallOutcome[] = [
  CallOutcome.TRANSPORTADO,
  CallOutcome.ATENDIDO_NO_LOCAL,
  CallOutcome.RECUSA,
  CallOutcome.NAO_LOCALIZADO,
  CallOutcome.OBITO
];

// Bolinha da cor ao lado do nome: a cor nunca aparece sozinha
export function PriorityKey({ priority }: { priority: CallPriority }) {
  const meta = PRIORITY_META[priority];
  return (
    <span className={styles.priorityKey}>
      <span className={styles.dot} style={{ background: PRIORITY_CHART_COLOR[priority] }} />
      <span>
        <strong>{meta.name}</strong> <small>{meta.label}</small>
      </span>
    </span>
  );
}

const share = (count: number, total: number) => (total > 0 ? formatPercent(count / total) : '—');

export default function Indicators({ scope, ambulances, hospitals }: {
  scope: ManagementScope;
  ambulances: Ambulance[];
  hospitals: Hospital[];
}) {
  const { data, error, loading, retry } = useLoad(signal => getIndicators(scope, signal), JSON.stringify(scope));

  if (!data) {
    return error ? <Failure message={error} onRetry={retry} /> : <div className="loading"><Spinner size={40} /></div>;
  }

  return (
    <div className={`${styles.indicators} ${loading ? styles.refreshing : ''}`} aria-busy={loading}>
      {error && <Failure message={error} onRetry={retry} />}
      {data.total === 0 ? (
        <div className={styles.empty}>
          <strong>Nenhum chamado neste período.</strong>
          {!scope.demo && <span>Ligue "Incluir demonstração" para ver o histórico de exemplo.</span>}
        </div>
      ) : (
        <IndicatorView data={data} ambulances={ambulances} hospitals={hospitals} />
      )}
    </div>
  );
}

export function Failure({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className={styles.failure} role="alert">
      <span>{message}</span>
      <button type="button" onClick={onRetry}>Tentar de novo</button>
    </div>
  );
}

function IndicatorView({ data, ambulances, hospitals }: { data: IndicatorData; ambulances: Ambulance[]; hospitals: Hospital[] }) {
  const { stages, response, quality } = data;
  const stageKeys = stagesFor(data);
  const finished = data.byStatus.FINALIZADO;
  const responseItems = PRIORITIES_BY_SEVERITY.map(priority => {
    const stats = response.byPriority[priority];
    return { priority, stats, target: data.targets[priority] };
  });

  const hourColumns: Column[] = data.byHour.map((count, hour) => ({
    key: String(hour),
    value: count,
    valueText: plural(count, 'chamado', 'chamados'),
    labelText: `${hour}h às ${(hour + 1) % 24}h`
  }));
  const dayColumns: Column[] = data.byDay.map(day => ({
    key: day.date,
    value: day.count,
    valueText: plural(day.count, 'chamado', 'chamados'),
    labelText: formatWeekday(day.date)
  }));
  const dayStep = Math.max(1, Math.ceil(dayColumns.length / 7));

  const outcomeItems: BarItem[] = OUTCOMES.map((outcome): BarItem => ({
    key: outcome,
    label: OUTCOME_LABEL[outcome],
    value: data.byOutcome[outcome],
    valueText: formatCount(data.byOutcome[outcome]),
    detail: share(data.byOutcome[outcome], finished)
  }))
    .sort((a, b) => b.value - a.value)
    .concat(quality.missingOutcome > 0
      ? [{ key: 'sem', label: 'Sem registro', value: quality.missingOutcome, valueText: formatCount(quality.missingOutcome), detail: share(quality.missingOutcome, finished), muted: true }]
      : []);

  const hospitalName = (id: string) => hospitals.find(hospital => hospital.id === id)?.shortName ?? id;
  const ambulanceCode = (id: string) => ambulances.find(ambulance => ambulance.id === id)?.code ?? id;

  return (
    <>
      {(quality.missingOnScene > 0 || data.truncated) && (
        <div className={styles.notice} role="note">
          {quality.missingOnScene > 0 && (
            <p>
              {plural(quality.missingOnScene, 'atendimento finalizado não tem', 'atendimentos finalizados não têm')} a chegada ao
              local registrada (GPS desligado ou chamado de antes do registro das etapas) e fica fora dos tempos de chegada.
            </p>
          )}
          {data.truncated && <p>O período tem chamados demais: os números usam só os primeiros 50 000.</p>}
        </div>
      )}

      <div className={styles.tiles}>
        <StatTile
          label="Chamados"
          value={formatCount(data.total)}
          detail={[
            plural(finished, 'finalizado', 'finalizados'),
            ...(data.byStatus.ORIENTADO > 0 ? [plural(data.byStatus.ORIENTADO, 'orientado', 'orientados')] : []),
            plural(data.byStatus.CANCELADO, 'cancelado', 'cancelados')
          ].join(' · ')}
        />
        <StatTile
          label="Tempo-resposta (mediana)"
          value={formatMinutes(stages.response.median)}
          detail={stages.response.n > 0 ? `9 em cada 10 em até ${formatMinutes(stages.response.p90)}` : 'Sem chegadas registradas'}
        />
        <StatTile
          label="Dentro da meta"
          value={formatPercent(response.overall.withinTarget)}
          detail={`de ${plural(stages.response.n, 'chegada', 'chegadas')}, pela meta de cada cor`}
        />
        <StatTile
          label="Espera na fila (mediana)"
          value={formatMinutes(stages.queue.median)}
          detail={stages.queue.n > 0 ? `9 em cada 10 em até ${formatMinutes(stages.queue.p90)}` : 'Sem despachos'}
        />
      </div>

      <div className={styles.grid}>
        <ChartCard
          wide
          title="Tempo-resposta por cor"
          subtitle="Da abertura do chamado à chegada da viatura ao local, comparado com a meta da cor"
          table={{
            head: ['Cor', 'Mediana', '9 em 10 até', 'Na meta', 'Meta', 'Chegadas'],
            rows: responseItems.map(({ priority, stats, target }) => [
              PRIORITY_META[priority].name,
              formatMinutes(stats.median),
              formatMinutes(stats.p90),
              formatPercent(stats.withinTarget),
              `${target} min`,
              formatCount(stats.n)
            ])
          }}
        >
          <RangeList
            label="Tempo-resposta por cor"
            items={responseItems.map(({ priority, stats, target }) => ({
              key: priority,
              label: <PriorityKey priority={priority} />,
              median: stats.median,
              p90: stats.p90,
              target: target * 60,
              color: PRIORITY_CHART_COLOR[priority],
              summary: stats.n > 0 ? (
                <>
                  <strong>{formatMinutes(stats.median)} · {formatPercent(stats.withinTarget)} na meta</strong>
                  <small className={styles.muted}>meta {target} min · {plural(stats.n, 'chegada', 'chegadas')}</small>
                </>
              ) : (
                <small className={styles.muted}>Sem chegadas · meta {target} min</small>
              )
            }))}
          />
        </ChartCard>

        <ChartCard
          title="Tempo de cada etapa"
          subtitle={`Total, da abertura ao fim: ${formatMinutes(stages.total.median)} (mediana)`}
          table={{
            head: ['Etapa', 'Mediana', '9 em 10 até', 'Chamados'],
            rows: [...stageKeys, ...(stageKeys.includes('queue') ? [] : ['queue' as const]), 'total' as const].map(stage => [
              STAGE_LABEL[stage].label,
              formatMinutes(stages[stage].median),
              formatMinutes(stages[stage].p90),
              formatCount(stages[stage].n)
            ])
          }}
        >
          <RangeList
            label="Tempo de cada etapa"
            items={stageKeys.map(stage => ({
              key: stage,
              label: (
                <span className={styles.stageLabel}>
                  {STAGE_LABEL[stage].label}
                  <small className={styles.muted}>{STAGE_LABEL[stage].hint}</small>
                </span>
              ),
              median: stages[stage].median,
              p90: stages[stage].p90,
              color: 'var(--chart-accent)',
              summary: stages[stage].n > 0 ? (
                <>
                  <strong>{formatMinutes(stages[stage].median)}</strong>
                  <small className={styles.muted}>até {formatMinutes(stages[stage].p90)} · {formatCount(stages[stage].n)}</small>
                </>
              ) : (
                <small className={styles.muted}>Sem dados</small>
              )
            }))}
          />
        </ChartCard>

        <ChartCard
          title="Chamados por cor"
          subtitle="Cor final, definida na regulação"
          table={{
            head: ['Cor', 'Chamados', '%'],
            rows: PRIORITIES_BY_SEVERITY.map(priority => [
              PRIORITY_META[priority].name,
              formatCount(data.byPriority[priority]),
              share(data.byPriority[priority], data.total)
            ])
          }}
        >
          <div className={styles.share} role="img" aria-label="Proporção dos chamados por cor">
            {PRIORITIES_BY_SEVERITY.filter(priority => data.byPriority[priority] > 0).map(priority => (
              <span key={priority} style={{ flexGrow: data.byPriority[priority], background: PRIORITY_CHART_COLOR[priority] }} />
            ))}
          </div>
          <ul className={styles.shareLegend}>
            {PRIORITIES_BY_SEVERITY.map(priority => (
              <li key={priority}>
                <PriorityKey priority={priority} />
                <span className={styles.shareValue}>
                  <strong>{formatCount(data.byPriority[priority])}</strong>
                  <small className={styles.muted}>{share(data.byPriority[priority], data.total)}</small>
                </span>
              </li>
            ))}
          </ul>
        </ChartCard>

        <ChartCard
          wide
          title="Chamados por hora do dia"
          subtitle="Horário de Sorocaba, somando todos os dias do período"
          table={{ head: ['Hora', 'Chamados'], rows: hourColumns.map(column => [column.labelText, formatCount(column.value)]) }}
        >
          <ColumnChart columns={hourColumns} label="Chamados por hora do dia" tickLabel={hour => (hour % 3 === 0 ? `${hour}h` : null)} />
        </ChartCard>

        {dayColumns.length > 1 && (
          <ChartCard
            wide
            title="Chamados por dia"
            table={{ head: ['Dia', 'Chamados'], rows: dayColumns.map(column => [column.labelText, formatCount(column.value)]) }}
          >
            <ColumnChart
              columns={dayColumns}
              label="Chamados por dia"
              tickLabel={index => (index % dayStep === 0 ? formatDay(data.byDay[index].date) : null)}
            />
          </ChartCard>
        )}

        <ChartCard
          title="Desfechos"
          subtitle={`Dos ${plural(finished, 'atendimento finalizado', 'atendimentos finalizados')}`}
          table={{ head: ['Desfecho', 'Atendimentos', '%'], rows: outcomeItems.map(item => [item.label, item.valueText, item.detail]) }}
        >
          <BarList label="Desfechos" items={outcomeItems} />
        </ChartCard>

        <ChartCard
          title="Hospitais de destino"
          subtitle="Transportes e tempo mediano do local ao hospital"
          table={{
            head: ['Hospital', 'Transportes', 'Transporte (mediana)'],
            rows: data.byHospital.map(item => [hospitalName(item.hospitalId), formatCount(item.count), formatMinutes(item.transportMedian)])
          }}
        >
          {data.byHospital.length > 0 ? (
            <BarList
              label="Hospitais de destino"
              items={data.byHospital.map(item => ({
                key: item.hospitalId,
                label: hospitalName(item.hospitalId),
                value: item.count,
                valueText: formatCount(item.count),
                detail: formatMinutes(item.transportMedian)
              }))}
            />
          ) : (
            <p className={styles.muted}>Nenhum transporte no período.</p>
          )}
        </ChartCard>

        <ChartCard
          title="Viaturas"
          subtitle="Atendimentos e tempo-resposta mediano"
          table={{
            head: ['Viatura', 'Atendimentos', 'Tempo-resposta (mediana)'],
            rows: data.byAmbulance.map(item => [ambulanceCode(item.ambulanceId), formatCount(item.count), formatMinutes(item.responseMedian)])
          }}
        >
          {data.byAmbulance.length > 0 ? (
            <BarList
              label="Viaturas"
              items={data.byAmbulance.map(item => ({
                key: item.ambulanceId,
                label: ambulanceCode(item.ambulanceId),
                value: item.count,
                valueText: formatCount(item.count),
                detail: formatMinutes(item.responseMedian)
              }))}
            />
          ) : (
            <p className={styles.muted}>Nenhum despacho no período.</p>
          )}
        </ChartCard>
      </div>
    </>
  );
}
