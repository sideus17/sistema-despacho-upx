import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Ambulance, AmbulanceStatus, AmbulanceType, CallPriority, CallStatus, DispatchRecommendation, DispatchScore, EmergencyCall } from '../types';
import DispatchAnalysis from './DispatchAnalysis';

const CALL: EmergencyCall = {
  id: 'call-1',
  priority: CallPriority.URGENTE,
  status: CallStatus.PENDENTE,
  timestamp: new Date().toISOString(),
  location: { lat: -23.5, lng: -47.45 },
  address: 'Rua da Penha, 120',
  description: 'Queda da própria altura',
  patientInfo: { age: 70, gender: '', symptoms: '' }
};

const ambulance = (id: string, code: string, status: AmbulanceStatus, type = AmbulanceType.USB): Ambulance => ({
  id, code, type, status, location: { lat: -23.51, lng: -47.45 }, baseId: 'base-1',
  crew: { driver: '', medic: '' }, driver: { id: `motorista-${id}`, name: `Motorista ${code}` }, locationUpdatedAt: null
});

const score = (ambulanceId: string, totalScore: number): DispatchScore => ({
  ambulanceId, totalScore, timeScore: 0, arrivalSeconds: 300, availabilityScore: 0, typeScore: 0, incidentPenalty: 0,
  explanation: `${ambulanceId} explicação`
});

function renderAnalysis(recommendations: DispatchScore[], ambulances: Ambulance[], extra: { calls?: EmergencyCall[] } = {}) {
  const onBack = vi.fn();
  const recommendation: DispatchRecommendation = { callId: CALL.id, recommendations, timestamp: new Date().toISOString() };
  render(
    <DispatchAnalysis
      call={CALL}
      recommendation={recommendation}
      ambulances={ambulances}
      calls={extra.calls}
      onExecuteDispatch={vi.fn(async () => {})}
      onBack={onBack}
      onRetry={vi.fn()}
      onSelectRoute={vi.fn()}
    />
  );
  return { onBack };
}

describe('análise do despacho', () => {
  it('"Recomendada" é a melhor viatura livre, nunca uma ocupada', () => {
    renderAnalysis(
      [score('amb-livre', 60), score('amb-ocupada', 90)],
      [ambulance('amb-livre', 'USB-02', AmbulanceStatus.DISPONIVEL), ambulance('amb-ocupada', 'USA-01', AmbulanceStatus.EM_ATENDIMENTO, AmbulanceType.USA)]
    );
    expect(screen.getByRole('button', { name: 'Ver USB-02 (recomendada)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Despachar USB-02' })).toBeInTheDocument();
    // A ocupada aparece só para informar, sem botão
    expect(screen.queryByRole('button', { name: /USA-01/ })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Em atendimento' })).toHaveTextContent('USA-01');
  });

  it('sem viatura livre: diz que o chamado continua na fila e volta para ela', async () => {
    const user = userEvent.setup();
    const busyCall: EmergencyCall = {
      ...CALL, id: 'call-2', status: CallStatus.EM_ATENDIMENTO, ambulance_id: 'amb-ocupada',
      times: { dispatched: new Date(Date.now() - 5 * 60_000).toISOString() }
    };
    const { onBack } = renderAnalysis(
      [score('amb-ocupada', 90)],
      [ambulance('amb-ocupada', 'MOTO-01', AmbulanceStatus.EM_ATENDIMENTO, AmbulanceType.MOTOLANCIA)],
      { calls: [busyCall] }
    );
    expect(screen.getByText('Nenhuma viatura livre agora.')).toBeInTheDocument();
    expect(screen.queryByText(/Recomendada/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Despachar/ })).not.toBeInTheDocument();
    // A ocupada mostra o tipo pelo nome e a etapa em que está
    expect(screen.getByRole('region', { name: 'Em atendimento' })).toHaveTextContent('MOTO-01Motolância · Despachada há 5 min');

    await user.click(screen.getByRole('button', { name: 'Voltar à fila' }));
    expect(onBack).toHaveBeenCalled();
  });

  it('sem viatura em turno: avisa e não desenha opções', () => {
    renderAnalysis([], []);
    expect(screen.getByText('Nenhuma viatura com motorista em turno agora.')).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma viatura livre agora.')).not.toBeInTheDocument();
  });
});
