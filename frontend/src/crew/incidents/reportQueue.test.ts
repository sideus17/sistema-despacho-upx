import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IncidentType } from '../../types';
import { createIncident } from '../../services/api';
import { clearReports, flushReports, pendingReports, submitReport } from './reportQueue';

// Sem sinal = erro marcado como "offline"; qualquer outro erro é recusa do servidor
vi.mock('../../services/api', () => ({
  createIncident: vi.fn(),
  isServerUnreachable: (error: unknown) => (error as { offline?: boolean })?.offline === true
}));

const send = vi.mocked(createIncident);
const OFFLINE = { offline: true };
const HERE = { lat: -23.5, lng: -47.45 };

beforeEach(() => {
  send.mockReset();
});

describe('relatos da equipe sem sinal', () => {
  it('com sinal, envia na hora e não guarda nada', async () => {
    send.mockResolvedValueOnce({ incident: null } as never);
    const outcome = await submitReport(IncidentType.ALAGAMENTO, HERE);
    expect(outcome.status).toBe('sent');
    expect(pendingReports()).toBe(0);
  });

  it('sem sinal, guarda no aparelho e reenvia na ordem quando o sinal volta', async () => {
    send.mockRejectedValue(OFFLINE);
    await submitReport(IncidentType.ALAGAMENTO, HERE);
    await submitReport(IncidentType.QUEDA_ARVORE, HERE);
    expect(pendingReports()).toBe(2);

    send.mockReset();
    send.mockResolvedValue({ incident: null } as never);
    expect(await flushReports()).toBe(2);
    expect(send.mock.calls.map(([report]) => report.type)).toEqual([IncidentType.ALAGAMENTO, IncidentType.QUEDA_ARVORE]);
    expect(pendingReports()).toBe(0);
  });

  it('o reenvio usa o mesmo id, para o servidor não duplicar', async () => {
    send.mockRejectedValueOnce(OFFLINE);
    await submitReport(IncidentType.VIA_BLOQUEADA, HERE);
    const firstTry = send.mock.calls[0][0];

    send.mockResolvedValueOnce({ incident: null } as never);
    await flushReports();
    expect(send.mock.calls[1][0].clientId).toBe(firstTry.clientId);
    expect(send.mock.calls[1][0].reportedAt).toBe(firstTry.reportedAt);
  });

  it('se o sinal cair no meio do reenvio, o resto espera', async () => {
    send.mockRejectedValue(OFFLINE);
    await submitReport(IncidentType.ALAGAMENTO, HERE);
    await submitReport(IncidentType.ACIDENTE, HERE);

    send.mockReset();
    send.mockResolvedValueOnce({ incident: null } as never).mockRejectedValueOnce(OFFLINE);
    expect(await flushReports()).toBe(1);
    expect(pendingReports()).toBe(1);
  });

  it('relato recusado pelo servidor é descartado (não fica tentando para sempre)', async () => {
    send.mockRejectedValueOnce(OFFLINE);
    await submitReport(IncidentType.ALAGAMENTO, HERE);

    send.mockRejectedValueOnce(new Error('antigo demais'));
    expect(await flushReports()).toBe(0);
    expect(pendingReports()).toBe(0);
  });

  it('recusa na hora do relato vira erro para a tela', async () => {
    send.mockRejectedValueOnce(new Error('limite por minuto'));
    await expect(submitReport(IncidentType.ALAGAMENTO, HERE)).rejects.toThrow('limite por minuto');
    expect(pendingReports()).toBe(0);
  });

  it('sair da conta descarta o que não foi enviado', async () => {
    send.mockRejectedValueOnce(OFFLINE);
    await submitReport(IncidentType.ALAGAMENTO, HERE);
    clearReports();
    expect(pendingReports()).toBe(0);
  });
});
