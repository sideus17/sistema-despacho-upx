import { useEffect, useMemo, useState } from 'react';
import { Ambulance, Base, Hospital, ManagementScope } from '../../types';
import { BarChartIcon, HeatMapIcon, HistoryIcon, RefreshIcon } from '../../ui/icons';
import HeatMap from './HeatMap';
import History from './History';
import Indicators from './Indicators';
import { PERIODS, PeriodKey, periodRange } from './format';
import styles from './ManagementPage.module.css';

// Gestão da central: indicadores, mapa de calor e histórico do período escolhido, em tela cheia
// (a operação continua por trás)

type ManagementTab = 'indicadores' | 'calor' | 'historico';

const TABS: Array<{ key: ManagementTab; label: string; Icon: typeof BarChartIcon }> = [
  { key: 'indicadores', label: 'Indicadores', Icon: BarChartIcon },
  { key: 'calor', label: 'Mapa de calor', Icon: HeatMapIcon },
  { key: 'historico', label: 'Histórico', Icon: HistoryIcon }
];

interface Preferences {
  tab: ManagementTab;
  period: PeriodKey;
  demo: boolean;
}

// Aba, período e a chave da demonstração ficam lembrados no aparelho
const PREFERENCES_KEY = 'samu-gestao';
const DEFAULTS: Preferences = { tab: 'indicadores', period: '30d', demo: true };

function loadPreferences(): Preferences {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? '{}') as Partial<Preferences>;
    return {
      tab: TABS.some(tab => tab.key === saved.tab) ? saved.tab! : DEFAULTS.tab,
      period: PERIODS.some(period => period.key === saved.period) ? saved.period! : DEFAULTS.period,
      demo: typeof saved.demo === 'boolean' ? saved.demo : DEFAULTS.demo
    };
  } catch {
    return DEFAULTS;
  }
}

const dayMonth = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
const clock = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export default function ManagementPage({ ambulances, hospitals, bases }: {
  ambulances: Ambulance[];
  hospitals: Hospital[];
  bases: Base[];
}) {
  const [preferences, setPreferences] = useState(loadPreferences);
  // "Até agora" vale do momento em que o período foi escolhido ou atualizado
  const [now, setNow] = useState(() => Date.now());
  const update = (patch: Partial<Preferences>) => setPreferences(current => ({ ...current, ...patch }));

  useEffect(() => {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    } catch {
      // Sem armazenamento (aba anônima): só não lembra
    }
  }, [preferences]);

  const scope: ManagementScope = useMemo(
    () => ({ ...periodRange(preferences.period, now), demo: preferences.demo }),
    [preferences.period, preferences.demo, now]
  );
  const rangeLabel = preferences.period === 'hoje'
    ? `Hoje, até ${clock(scope.to)}`
    : `${dayMonth(scope.from)} a ${dayMonth(scope.to)}, até ${clock(scope.to)}`;

  return (
    <main className={styles.page} aria-label="Gestão">
      <div className={styles.toolbar}>
        <div className={styles.toolbarInner}>
          <div className={styles.title}>
            <h2>Gestão</h2>
            <span>{rangeLabel}</span>
          </div>

          <div className={styles.filters}>
            <div className={styles.segmented} role="radiogroup" aria-label="Período">
              {PERIODS.map(period => (
                <button
                  key={period.key}
                  type="button"
                  role="radio"
                  aria-checked={preferences.period === period.key}
                  onClick={() => {
                    update({ period: period.key });
                    setNow(Date.now());
                  }}
                >
                  {period.label}
                </button>
              ))}
            </div>
            <label className={styles.toggle}>
              <input type="checkbox" checked={preferences.demo} onChange={event => update({ demo: event.target.checked })} />
              Incluir demonstração
            </label>
            <button type="button" className={styles.refresh} onClick={() => setNow(Date.now())}>
              <RefreshIcon /> Atualizar
            </button>
          </div>

          <div className={styles.tabs} role="tablist" aria-label="Seções da gestão">
            {TABS.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                id={`gestao-tab-${key}`}
                aria-selected={preferences.tab === key}
                aria-controls="gestao-painel"
                onClick={() => update({ tab: key })}
              >
                <Icon /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        id="gestao-painel"
        role="tabpanel"
        aria-labelledby={`gestao-tab-${preferences.tab}`}
        className={`${styles.content} ${preferences.tab === 'calor' ? styles.contentMap : ''}`}
      >
        {preferences.tab === 'calor' ? (
          <HeatMap scope={scope} hospitals={hospitals} bases={bases} />
        ) : (
          <div className={styles.contentInner}>
            {preferences.tab === 'indicadores' && <Indicators scope={scope} ambulances={ambulances} hospitals={hospitals} />}
            {preferences.tab === 'historico' && <History scope={scope} ambulances={ambulances} hospitals={hospitals} />}
          </div>
        )}
      </div>
    </main>
  );
}
