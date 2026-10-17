import { CallEvent, CallEventAction, CallOutcome, CallPriority, CallStatus, CallTimes, CloseReason, EmergencyCall, Hospital, RegulationDecision, UserRole } from '../types';
import { CLOSE_REASON_LABEL, OUTCOME_LABEL, PRIORITY_META } from './calls';

// Linha do tempo do chamado na gestão: as ações das pessoas (auditoria) e as etapas marcadas pelo GPS

export interface TimelineEntry {
  key: string;
  time: string;
  label: string;
  who?: string; // "Ana Souza · atendente" ou "GPS da viatura"
  detail?: string; // o que mudou: "Amarelo → Vermelho", "USA-01 · motorista João"...
  since: number | null; // segundos desde a abertura
}

export const ROLE_NAME: Record<UserRole, string> = {
  [UserRole.OPERADOR]: 'atendente',
  [UserRole.MOTORISTA]: 'motorista'
};

const GPS = 'GPS da viatura';

// Etapas que só o GPS marca (registro, regulação, despacho e fim vêm das ações, quando há)
const GPS_STEPS: Array<[keyof CallTimes, string]> = [
  ['enRoute', 'Saída da viatura'],
  ['onScene', 'Chegada ao local'],
  ['leftScene', 'Saída do local'],
  ['atHospital', 'Chegada ao hospital']
];

// Sem a ação registrada (chamado de antes da auditoria), o horário vem do próprio chamado
const ACTION_STEPS: Array<[keyof CallTimes, CallEventAction, string]> = [
  ['regulated', CallEventAction.REGULACAO, 'Regulação'],
  ['dispatched', CallEventAction.DESPACHO, 'Despacho'],
  ['finished', CallEventAction.FINALIZACAO, 'Fim do atendimento']
];

const colorName = (priority: unknown) => PRIORITY_META[priority as CallPriority]?.name ?? String(priority);

type Changes = Partial<Record<'status' | 'priority' | 'hospitalId', [string | null, string | null]>>;

function describe(event: CallEvent, hospitals: Hospital[]): { label: string; detail?: string } {
  const data = event.data as {
    priority?: string;
    decision?: RegulationDecision;
    changes?: Changes;
    reason?: CloseReason;
    note?: string;
    ambulanceCode?: string;
    driverName?: string | null;
    outcome?: CallOutcome;
  };
  const hospitalName = (id: string | null | undefined) => (id ? hospitals.find(item => item.id === id)?.shortName ?? id : 'sem escolha');
  const changes = data.changes ?? {};

  switch (event.action) {
    case CallEventAction.ABERTURA:
      return { label: 'Abertura do chamado', detail: data.priority ? `Cor sugerida: ${colorName(data.priority)}` : undefined };
    case CallEventAction.REGULACAO: {
      if (data.decision === RegulationDecision.CANCELAR) {
        return { label: 'Cancelamento', detail: [data.reason && CLOSE_REASON_LABEL[data.reason], data.note].filter(Boolean).join(' · ') };
      }
      if (data.decision === RegulationDecision.ORIENTACAO) return { label: 'Orientação por telefone', detail: data.note };
      const parts = [
        changes.priority ? `${colorName(changes.priority[0])} → ${colorName(changes.priority[1])}` : null,
        changes.hospitalId ? `Destino: ${hospitalName(changes.hospitalId[1])}` : null
      ].filter(Boolean);
      // Já estava aguardando despacho: só mudou a cor ou o destino
      const label = changes.status ? 'Regulação' : 'Reclassificação';
      return { label, detail: parts.length > 0 ? parts.join(' · ') : changes.status ? 'Cor confirmada' : undefined };
    }
    case CallEventAction.DESPACHO:
      return { label: 'Despacho', detail: [data.ambulanceCode, data.driverName && `motorista ${data.driverName}`].filter(Boolean).join(' · ') };
    case CallEventAction.HOSPITAL:
      return { label: 'Hospital de destino', detail: changes.hospitalId ? hospitalName(changes.hospitalId[1]) : undefined };
    case CallEventAction.FINALIZACAO:
      return { label: 'Fim do atendimento', detail: data.outcome ? OUTCOME_LABEL[data.outcome] : undefined };
  }
}

const secondsSince = (from: string, to: string) => Math.max(0, (Date.parse(to) - Date.parse(from)) / 1000);

export function callTimeline(call: EmergencyCall, events: CallEvent[], hospitals: Hospital[] = []): TimelineEntry[] {
  const since = (time: string) => secondsSince(call.timestamp, time);
  const done = new Set(events.map(event => event.action));
  const entries: TimelineEntry[] = events.map(event => ({
    key: `evento-${event.id}`,
    time: event.at,
    ...describe(event, hospitals),
    who: `${event.actor.name} · ${ROLE_NAME[event.actor.role] ?? event.actor.role}`,
    since: event.action === CallEventAction.ABERTURA ? null : since(event.at)
  }));

  if (!done.has(CallEventAction.ABERTURA)) entries.push({ key: 'abertura', time: call.timestamp, label: 'Abertura do chamado', since: null });
  for (const [key, action, label] of ACTION_STEPS) {
    const time = call.times?.[key];
    if (time && !done.has(action)) {
      // Encerrado na regulação: o fim é o próprio encerramento
      const closedAtRegulation = key === 'finished' && (call.status === CallStatus.ORIENTADO || call.status === CallStatus.CANCELADO);
      if (!closedAtRegulation) entries.push({ key, time, label, since: since(time) });
    }
  }
  for (const [key, label] of GPS_STEPS) {
    const time = call.times?.[key];
    if (time) entries.push({ key, time, label, who: GPS, since: since(time) });
  }

  // Ordem dos horários; no mesmo instante, a ordem em que foram montados
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => Date.parse(a.entry.time) - Date.parse(b.entry.time) || a.index - b.index)
    .map(({ entry }) => entry);
}
