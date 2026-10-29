import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { regulateCall } from '../services/api';
import { CallPriority, CallStatus, CloseReason, EmergencyCall, Hospital, RegulationDecision } from '../types';
import { renderWithAuth } from '../test/renderWithAuth';
import RegulationPanel from './RegulationPanel';

vi.mock('../services/api', async importOriginal => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  regulateCall: vi.fn()
}));

const CALL: EmergencyCall = {
  id: 'call-1',
  priority: CallPriority.URGENTE,
  initialPriority: CallPriority.URGENTE,
  status: CallStatus.AGUARDANDO_REGULACAO,
  timestamp: new Date().toISOString(),
  location: { lat: -23.5, lng: -47.45 },
  address: 'Rua da Penha, 120',
  reference: 'Portão azul',
  description: 'Dor no peito',
  patientInfo: { age: 64, gender: 'M', symptoms: 'Dor no peito' },
  callerPhone: '15991234567',
  triage: { signals: ['DOR_PEITO'], suggested: CallPriority.EMERGENCIA }
};

const HOSPITALS: Hospital[] = [
  { id: 'hosp-perto', name: 'Hospital Perto', shortName: 'Perto', kind: 'HOSPITAL', address: '', location: { lat: -23.51, lng: -47.45 } }
];

const color = (name: string) => screen.getByRole('radio', { name: new RegExp(`^${name}`) });

function renderPanel(call: EmergencyCall | null = CALL) {
  const onDone = vi.fn();
  const view = renderWithAuth(<RegulationPanel call={call} hospitals={HOSPITALS} onDone={onDone} onBack={vi.fn()} />);
  return { ...view, onDone };
}

beforeEach(() => {
  vi.mocked(regulateCall).mockReset();
  vi.mocked(regulateCall).mockImplementation(async (id, request) => ({ ...CALL, id, priority: request.priority ?? CALL.priority, status: CallStatus.PENDENTE }));
});

describe('regulação do chamado', () => {
  it('mostra o chamado e os sinais marcados, só para leitura', () => {
    renderPanel();
    expect(screen.getByText('Rua da Penha, 120')).toBeInTheDocument();
    expect(screen.getByText('Dor forte no peito')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Febre' })).not.toBeInTheDocument();
    expect(screen.getByText(/Sugerida pelos sinais/)).toHaveTextContent('Vermelho');
    // Começa na cor do registro
    expect(color('Amarelo')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('A cor escolhida é menos grave que a sugerida pelos sinais.')).toBeInTheDocument();
  });

  it('o selo e a pulseira seguem a cor escolhida, com a cor do registro ao lado', async () => {
    const user = userEvent.setup();
    renderPanel();
    expect(screen.queryByText(/^Registrado:/)).not.toBeInTheDocument();
    await user.click(color('Verde'));
    expect(screen.getByText('Verde · Pouco urgente')).toBeInTheDocument();
    expect(screen.queryByText('Amarelo · Urgência')).not.toBeInTheDocument();
    expect(screen.getByText(/^Registrado:/)).toHaveTextContent('Registrado: Amarelo → Final: Verde');
  });

  it('sem sinal marcado no registro, diz isso numa linha só', () => {
    renderPanel({ ...CALL, triage: { signals: [], suggested: null } });
    expect(screen.getByText('Nenhum sinal de alerta marcado no registro.')).toBeInTheDocument();
    expect(screen.queryByText(/Sem sinais marcados/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sugerida pelos sinais/)).not.toBeInTheDocument();
  });

  it('enviar viatura manda a cor final e o hospital', async () => {
    const user = userEvent.setup();
    const { onDone } = renderPanel();
    await user.click(color('Vermelho'));
    await user.selectOptions(screen.getByRole('combobox', { name: /Hospital de destino/ }), 'hosp-perto');
    await user.click(screen.getByRole('button', { name: 'Enviar viatura' }));

    expect(regulateCall).toHaveBeenCalledWith('call-1', {
      decision: RegulationDecision.DESPACHAR,
      priority: CallPriority.EMERGENCIA,
      hospitalId: 'hosp-perto'
    });
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ status: CallStatus.PENDENTE }), RegulationDecision.DESPACHAR);
  });

  it('orientação por telefone pede o que foi orientado', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(color('Azul'));
    await user.click(screen.getByRole('button', { name: 'Orientação por telefone' }));
    const close = screen.getByRole('button', { name: 'Encerrar com orientação' });
    expect(close).toBeDisabled();

    await user.type(screen.getByLabelText('Orientação dada por telefone'), 'Procurar a UBS amanhã');
    await user.click(close);
    expect(regulateCall).toHaveBeenCalledWith('call-1', {
      decision: RegulationDecision.ORIENTACAO,
      priority: CallPriority.NAO_URGENTE,
      note: 'Procurar a UBS amanhã'
    });
  });

  it('Vermelho ou Amarelo encerrado com orientação pede confirmação; "Enviar viatura" volta ao passo principal', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole('button', { name: 'Orientação por telefone' }));
    await user.type(screen.getByLabelText('Orientação dada por telefone'), 'Procurar a UPA');
    await user.click(screen.getByRole('button', { name: 'Encerrar com orientação' }));
    expect(regulateCall).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Amarelo · Urgência sem viatura. Encerrar mesmo assim?');

    await user.click(screen.getByRole('button', { name: 'Enviar viatura' }));
    expect(screen.getByRole('button', { name: 'Enviar viatura' })).toHaveFocus();
    expect(regulateCall).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Orientação por telefone' }));
    await user.click(screen.getByRole('button', { name: 'Encerrar com orientação' }));
    await user.click(screen.getByRole('button', { name: 'Sim, encerrar sem viatura' }));
    expect(regulateCall).toHaveBeenCalledWith('call-1', {
      decision: RegulationDecision.ORIENTACAO,
      priority: CallPriority.URGENTE,
      note: 'Procurar a UPA'
    });
  });

  it('cancelar exige o motivo; "outro motivo" exige a explicação', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole('button', { name: 'Cancelar chamado' }));
    const cancel = screen.getByRole('button', { name: 'Cancelar chamado' });
    expect(cancel).toBeDisabled();
    // Para cancelar a cor não importa: a escolha sai da tela
    expect(screen.queryByRole('radiogroup', { name: 'Cor final' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Outro motivo' }));
    expect(cancel).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: 'Trote' }));
    await user.click(cancel);
    expect(regulateCall).toHaveBeenCalledWith('call-1', {
      decision: RegulationDecision.CANCELAR,
      priority: CallPriority.URGENTE,
      reason: CloseReason.TROTE
    });
  });

  it('chamado que já espera viatura: o botão salva a reclassificação', () => {
    renderPanel({ ...CALL, status: CallStatus.PENDENTE, times: { regulated: new Date().toISOString() } });
    expect(screen.getByRole('heading', { name: 'Reclassificar chamado' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar regulação' })).toBeInTheDocument();
  });

  it('se outra pessoa mexeu no chamado, avisa em vez de regular', () => {
    const { rerender } = renderPanel();
    rerender(<RegulationPanel call={{ ...CALL, status: CallStatus.EM_ATENDIMENTO }} hospitals={HOSPITALS} onDone={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText(/Este chamado mudou enquanto você regulava/)).toHaveTextContent('agora está em atendimento');
    expect(screen.queryByRole('button', { name: 'Enviar viatura' })).not.toBeInTheDocument();
  });

  it('chamado que saiu das filas', () => {
    renderPanel(null);
    expect(screen.getByText(/não está mais nas filas/)).toBeInTheDocument();
  });

  it('erro do servidor aparece e o painel continua', async () => {
    const user = userEvent.setup();
    vi.mocked(regulateCall).mockRejectedValue({ response: { data: { error: 'O chamado mudou enquanto você regulava.' } } });
    const { onDone } = renderPanel();
    await user.click(screen.getByRole('button', { name: 'Enviar viatura' }));
    expect(await screen.findByText('O chamado mudou enquanto você regulava.')).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Enviar viatura' })).toBeEnabled();
  });
});
