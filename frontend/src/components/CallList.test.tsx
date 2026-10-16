import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Ambulance, CallOutcome, CallPriority, CallStatus, EmergencyCall } from '../types';
import CallList from './CallList';

const active = (overrides: Partial<EmergencyCall> = {}): EmergencyCall => ({
  id: 'call-1',
  priority: CallPriority.URGENTE,
  status: CallStatus.EM_ATENDIMENTO,
  ambulance_id: 'amb-1',
  timestamp: new Date(Date.now() - 20 * 60_000).toISOString(),
  location: { lat: -23.5, lng: -47.45 },
  address: 'Rua da Penha, 890',
  description: 'Queda',
  patientInfo: { symptoms: 'Queda' },
  ...overrides
});

const AMBULANCES = [{ id: 'amb-1', code: 'USA-01' } as Ambulance];

function renderList(call: EmergencyCall) {
  const onFinish = vi.fn(async () => {});
  render(<CallList calls={[call]} ambulances={AMBULANCES} onFocus={vi.fn()} onDispatch={vi.fn()} onFinish={onFinish} />);
  return onFinish;
}

describe('finalizar atendimento na central', () => {
  it('sem chegada ao hospital, pergunta como terminou; a escolha finaliza', async () => {
    const user = userEvent.setup();
    const onFinish = renderList(active());
    await user.click(screen.getByRole('button', { name: 'Finalizar atendimento' }));
    expect(screen.getByRole('group', { name: 'Como terminou o atendimento?' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Atendido no local' }));
    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ id: 'call-1' }), CallOutcome.ATENDIDO_NO_LOCAL);
  });

  it('com chegada ao hospital, só confirma (o servidor marca o transporte)', async () => {
    const user = userEvent.setup();
    const onFinish = renderList(active({ times: { dispatched: '2026-10-16T10:00:00Z', atHospital: '2026-10-16T10:30:00Z' } }));
    await user.click(screen.getByRole('button', { name: 'Finalizar atendimento' }));
    expect(screen.queryByRole('group', { name: 'Como terminou o atendimento?' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ id: 'call-1' }), undefined);
  });

  it('cancelar volta ao botão', async () => {
    const user = userEvent.setup();
    const onFinish = renderList(active());
    await user.click(screen.getByRole('button', { name: 'Finalizar atendimento' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('button', { name: 'Finalizar atendimento' })).toBeInTheDocument();
    expect(onFinish).not.toHaveBeenCalled();
  });
});
