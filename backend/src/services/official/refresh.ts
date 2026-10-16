import { cemadenConfigured } from './cemadenApi';
import { refreshCemaden } from './cemaden';
import { refreshDefesaCivil } from './defesaCivil';
import { refreshTomTom, tomtomConfigured } from './tomtom';

const MINUTE = 60_000;
const BACKOFF = 15 * MINUTE; // fonte com erro espera antes de tentar de novo

export interface OfficialSourceStatus {
  id: 'cemaden' | 'defesaCivil' | 'tomtom';
  name: string;
  enabled: boolean;
  lastAttempt: string | null;
  lastSuccess: string | null;
  lastError: string | null;
  summary: string | null;
}

interface Source {
  status: OfficialSourceStatus;
  interval: number;
  enabled: () => boolean;
  run: () => Promise<string>;
  running: boolean;
  nextRun: number;
}

const newStatus = (id: OfficialSourceStatus['id'], name: string): OfficialSourceStatus => ({
  id, name, enabled: true, lastAttempt: null, lastSuccess: null, lastError: null, summary: null
});

const sources: Source[] = [
  {
    status: newStatus('cemaden', 'CEMADEN (chuva) + SGB (áreas de inundação)'),
    interval: 5 * MINUTE,
    enabled: cemadenConfigured,
    run: async () => {
      const result = await refreshCemaden();
      return `${result.stations} estações com leitura recente; ${result.triggered.length} áreas com alagamento provável`;
    },
    running: false,
    nextRun: 0
  },
  {
    // ~15 MB por leitura: não vale ler toda hora
    status: newStatus('defesaCivil', 'Defesa Civil (alertas oficiais)'),
    interval: 15 * MINUTE,
    enabled: () => true,
    run: async () => {
      const result = await refreshDefesaCivil();
      return `${result.alerts} alertas no país; ${result.active} valendo para Sorocaba`;
    },
    running: false,
    nextRun: 0
  },
  {
    // Trânsito: interdições, acidentes e congestionamentos fortes (288 leituras por dia)
    status: newStatus('tomtom', 'TomTom (trânsito)'),
    interval: 5 * MINUTE,
    enabled: tomtomConfigured,
    run: async () => {
      const result = await refreshTomTom();
      return `${result.kept} incidentes de trânsito em Sorocaba (de ${result.total} informados)`;
    },
    running: false,
    nextRun: 0
  }
];

const enabled = () => process.env.OFFICIAL_SOURCES_ENABLED !== 'false';

/**
 * Atualiza as fontes oficiais em segundo plano, quando o sistema está em uso
 * (o servidor gratuito dorme: não há rotina agendada). Nunca atrasa quem chamou.
 */
export function triggerOfficialRefresh(): void {
  if (!enabled()) return;
  const now = Date.now();

  for (const source of sources) {
    source.status.enabled = source.enabled();
    if (!source.status.enabled || source.running || now < source.nextRun) continue;

    source.running = true;
    source.status.lastAttempt = new Date(now).toISOString();
    source
      .run()
      .then(summary => {
        source.status.lastSuccess = new Date().toISOString();
        source.status.lastError = null;
        source.status.summary = summary;
        source.nextRun = Date.now() + source.interval;
      })
      .catch(error => {
        source.status.lastError = error instanceof Error ? error.message : String(error);
        source.nextRun = Date.now() + BACKOFF;
        console.warn(`Fonte oficial ${source.status.id} falhou:`, source.status.lastError);
      })
      .finally(() => {
        source.running = false;
      });
  }
}

export function officialStatus(): { enabled: boolean; sources: OfficialSourceStatus[] } {
  return {
    enabled: enabled(),
    sources: sources.map(source => ({ ...source.status, enabled: enabled() && source.enabled() }))
  };
}
