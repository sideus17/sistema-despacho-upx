import { Coordinates, IncidentType } from '../../types';
import { createIncident, CreateIncidentResult, isServerUnreachable } from '../../services/api';

// Relatos feitos sem sinal: ficam no aparelho e saem quando a conexão voltar
const QUEUE_KEY = 'samu:ocorrencias-pendentes';

interface PendingReport {
  clientId: string; // o servidor ignora o reenvio do mesmo relato
  type: IncidentType;
  lat: number;
  lng: number;
  reportedAt: string; // vale a hora do relato, não a do envio
}

function read(): PendingReport[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function write(reports: PendingReport[]) {
  try {
    if (reports.length) localStorage.setItem(QUEUE_KEY, JSON.stringify(reports));
    else localStorage.removeItem(QUEUE_KEY);
  } catch {
    // Sem armazenamento: o relato sem sinal se perde
  }
}

// crypto.randomUUID só existe em HTTPS/localhost (no celular pelo IP da rede, não)
const newId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export type ReportOutcome = { status: 'sent'; result: CreateIncidentResult } | { status: 'queued' };

// Envia na hora; sem sinal (ou servidor fora), guarda para reenviar. Recusa do servidor vira erro
export async function submitReport(type: IncidentType, position: Coordinates): Promise<ReportOutcome> {
  const report: PendingReport = { clientId: newId(), type, lat: position.lat, lng: position.lng, reportedAt: new Date().toISOString() };
  try {
    return { status: 'sent', result: await createIncident(report) };
  } catch (error) {
    if (!isServerUnreachable(error)) throw error;
    write([...read(), report]);
    return { status: 'queued' };
  }
}

let flushing: Promise<number> | null = null;

// Reenvia a fila na ordem; devolve quantos relatos saíram (quem pega um envio já em andamento recebe 0)
export function flushReports(): Promise<number> {
  if (flushing) return flushing.then(() => 0);
  flushing = (async () => {
    let sent = 0;
    for (const report of read()) {
      try {
        await createIncident(report);
        sent++;
      } catch (error) {
        if (isServerUnreachable(error)) break; // continua sem sinal: tenta depois
        // Recusado (antigo demais, limite por minuto): descarta
      }
      write(read().filter(pending => pending.clientId !== report.clientId));
    }
    return sent;
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

export const pendingReports = () => read().length;

// Sair da conta descarta o que não foi enviado
export const clearReports = () => write([]);
