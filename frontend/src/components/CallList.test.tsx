import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Ambulance, CallOutcome, CallPriority, CallStatus, EmergencyCall, Hospital } from '../types';
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

describe('atendimento na central', () => {
  const HOSPITALS: Hospital[] = [
    { id: 'hosp-longe', name: 'Hospital Longe', shortName: 'Longe', kind: 'HOSPITAL', address: '', location: { lat: -23.6, lng: -47.45 } },
    { id: 'hosp-perto', name: 'Hospital Perto', shortName: 'Perto', kind: 'HOSPITAL', address: '', location: { lat: -23.51, lng: -47.45 } }
  ];

  it('mostra a etapa marcada pelo GPS e os horários', () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString();
    render(
      <CallList
        calls={[active({ times: { dispatched: tenMinutesAgo, onScene: tenMinutesAgo } })]}
        ambulances={AMBULANCES}
        onFocus={vi.fn()}
        onDispatch={vi.fn()}
        onFinish={vi.fn()}
      />
    );
    expect(screen.getByText('No local · há 10 min')).toBeInTheDocument();
    expect(screen.getByText(/^Despacho \d{2}:\d{2} · Local \d{2}:\d{2}$/)).toBeInTheDocument();
  });

  it('hospital de destino: lista do mais perto ao mais longe; escolher avisa o App', async () => {
    const user = userEvent.setup();
    const onHospitalChange = vi.fn();
    render(
      <CallList
        calls={[active()]}
        ambulances={AMBULANCES}
        onFocus={vi.fn()}
        onDispatch={vi.fn()}
        onFinish={vi.fn()}
        hospitals={HOSPITALS}
        onHospitalChange={onHospitalChange}
      />
    );
    const select = screen.getByRole('combobox', { name: 'Hospital de destino' });
    expect([...select.querySelectorAll('option')].map(option => option.textContent)).toEqual([
      'Sem escolha (a equipe decide)', 'Perto · 1,1 km', 'Longe · 11,1 km'
    ]);
    await user.selectOptions(select, 'hosp-perto');
    expect(onHospitalChange).toHaveBeenCalledWith(expect.objectContaining({ id: 'call-1' }), 'hosp-perto');
  });

  it('transportando mostra o destino; depois da chegada, o hospital fica fixo', () => {
    const { rerender } = render(
      <CallList
        calls={[active({ times: { leftScene: new Date().toISOString() }, hospitalId: 'hosp-perto' })]}
        ambulances={AMBULANCES}
        onFocus={vi.fn()}
        onDispatch={vi.fn()}
        onFinish={vi.fn()}
        hospitals={HOSPITALS}
      />
    );
    expect(screen.getByText(/^Transportando → Perto/)).toBeInTheDocument();

    rerender(
      <CallList
        calls={[active({ times: { atHospital: '2026-10-16T10:40:00Z' }, hospitalId: 'hosp-perto' })]}
        ambulances={AMBULANCES}
        onFocus={vi.fn()}
        onDispatch={vi.fn()}
        onFinish={vi.fn()}
        hospitals={HOSPITALS}
      />
    );
    expect(screen.queryByRole('combobox', { name: 'Hospital de destino' })).not.toBeInTheDocument();
    expect(screen.getByText(/chegou às/)).toHaveTextContent('Hospital: Perto');
  });
});
