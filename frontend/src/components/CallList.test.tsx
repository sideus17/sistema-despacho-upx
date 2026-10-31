import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Ambulance, CallOutcome, CallPriority, CallStatus, EmergencyCall, Hospital } from '../types';
import CallList from './CallList';
import { optionTexts, pickOption } from '../test/pickOption';

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
  render(<CallList calls={[call]} ambulances={AMBULANCES} onFocus={vi.fn()} onRegulate={vi.fn()} onDispatch={vi.fn()} onFinish={onFinish} />);
  return onFinish;
}

describe('resumo da espera longa no topo da fila', () => {
  const waiting = (): EmergencyCall => ({ ...active(), id: 'call-velho', status: CallStatus.AGUARDANDO_REGULACAO, ambulance_id: undefined, timestamp: new Date(Date.now() - 10 * 60_000).toISOString() });

  it('com o cartão do pior chamado à vista, o resumo sai (não repete o cartão); fora da tela, volta; a pílula diz a meta', () => {
    let report: (visible: boolean) => void = () => {};
    class FakeObserver {
      constructor(callback: IntersectionObserverCallback) {
        report = visible => callback([{ isIntersecting: visible, target: document.querySelector('[data-call-id="call-velho"]')! } as unknown as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      }
      observe() {}
      disconnect() {}
    }
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    render(<CallList calls={[waiting()]} ambulances={AMBULANCES} onFocus={vi.fn()} onRegulate={vi.fn()} onDispatch={vi.fn()} onFinish={vi.fn()} />);
    expect(screen.getByRole('img', { name: /acima da meta de 3 min/ })).toHaveTextContent('· meta 3 min');

    act(() => report(false));
    expect(screen.getByRole('status')).toHaveTextContent('Amarelo aguardando regulação há 10 min');
    act(() => report(true));
    expect(screen.queryByText(/aguardando regulação há 10 min/)).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});

describe('GPS da viatura no cartão', () => {
  it('com o GPS parado, a etapa avisa que pode estar velha', () => {
    const stale = [{ id: 'amb-1', code: 'USA-01', driver: { id: 'm1', name: 'Motorista' }, locationUpdatedAt: new Date(Date.now() - 20 * 60_000).toISOString() } as Ambulance];
    const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString();
    render(
      <CallList
        calls={[active({ times: { dispatched: tenMinutesAgo, onScene: tenMinutesAgo } })]}
        ambulances={stale}
        onFocus={vi.fn()}
        onRegulate={vi.fn()}
        onDispatch={vi.fn()}
        onFinish={vi.fn()}
      />
    );
    expect(screen.getByText(/GPS sem atualizar há 20 min/).parentElement).toHaveTextContent('No local · há 10 min · GPS sem atualizar há 20 min');
  });
});

describe('filtros pelo teclado', () => {
  it('teclas 1 a 4 trocam o filtro, menos dentro de um campo', async () => {
    const user = userEvent.setup();
    render(<CallList calls={[active()]} ambulances={[]} onFocus={vi.fn()} onRegulate={vi.fn()} onDispatch={vi.fn()} onFinish={vi.fn()} />);
    await user.keyboard('4');
    expect(screen.getByRole('button', { name: /^Em atendimento/ })).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard('2');
    expect(screen.getByRole('button', { name: /^Regulação/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^Todos/ })).toHaveAttribute('aria-keyshortcuts', '1');
  });
});

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
        onRegulate={vi.fn()}
        onDispatch={vi.fn()}
        onFinish={vi.fn()}
      />
    );
    expect(screen.getByText('No local · há 10 min')).toBeInTheDocument();
    expect(screen.getByText(/^Despacho \d{2}:\d{2} · Local \d{2}:\d{2}$/)).toBeInTheDocument();
  });

  it('hospital de destino: lista do mais perto ao mais longe; a troca só vale no "Salvar destino"', async () => {
    const user = userEvent.setup();
    const onHospitalChange = vi.fn();
    render(
      <CallList
        calls={[active()]}
        ambulances={AMBULANCES}
        onFocus={vi.fn()}
        onRegulate={vi.fn()}
        onDispatch={vi.fn()}
        onFinish={vi.fn()}
        hospitals={HOSPITALS}
        onHospitalChange={onHospitalChange}
      />
    );
    expect(await optionTexts(user, /Hospital de destino/)).toEqual([
      'Sem escolha (a equipe decide)', 'Perto · 1,1 km', 'Longe · 11,1 km'
    ]);
    // Escolher na lista não salva nem avisa a equipe
    await pickOption(user, /Hospital de destino/, 'Longe · 11,1 km');
    await pickOption(user, /Hospital de destino/, 'Perto · 1,1 km');
    expect(onHospitalChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Salvar destino' }));
    expect(onHospitalChange).toHaveBeenCalledTimes(1);
    expect(onHospitalChange).toHaveBeenCalledWith(expect.objectContaining({ id: 'call-1' }), 'hosp-perto');
  });

  it('hospital de destino: "Desfazer" e Esc voltam ao que estava salvo', async () => {
    const user = userEvent.setup();
    const onHospitalChange = vi.fn();
    render(
      <CallList
        calls={[active()]}
        ambulances={AMBULANCES}
        onFocus={vi.fn()}
        onRegulate={vi.fn()}
        onDispatch={vi.fn()}
        onFinish={vi.fn()}
        hospitals={HOSPITALS}
        onHospitalChange={onHospitalChange}
      />
    );
    const trigger = () => screen.getByRole('button', { name: /Hospital de destino/ });
    await pickOption(user, /Hospital de destino/, 'Perto · 1,1 km');
    await user.click(screen.getByRole('button', { name: 'Desfazer' }));
    expect(trigger()).toHaveTextContent('Sem escolha (a equipe decide)');

    await pickOption(user, /Hospital de destino/, 'Longe · 11,1 km');
    trigger().focus();
    await user.keyboard('{Escape}');
    expect(trigger()).toHaveTextContent('Sem escolha (a equipe decide)');
    expect(screen.queryByRole('button', { name: 'Salvar destino' })).not.toBeInTheDocument();
    expect(onHospitalChange).not.toHaveBeenCalled();
  });

  it('transportando mostra o destino; depois da chegada, o hospital fica fixo', () => {
    const { rerender } = render(
      <CallList
        calls={[active({ times: { leftScene: new Date().toISOString() }, hospitalId: 'hosp-perto' })]}
        ambulances={AMBULANCES}
        onFocus={vi.fn()}
        onRegulate={vi.fn()}
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
        onRegulate={vi.fn()}
        onDispatch={vi.fn()}
        onFinish={vi.fn()}
        hospitals={HOSPITALS}
      />
    );
    expect(screen.queryByRole('button', { name: /Hospital de destino/ })).not.toBeInTheDocument();
    expect(screen.getByText(/chegou às/)).toHaveTextContent('Hospital: Perto');
  });
});

describe('filas da central', () => {
  const opened = (id: string, minutesAgo: number, overrides: Partial<EmergencyCall> = {}) =>
    active({
      id,
      status: CallStatus.AGUARDANDO_REGULACAO,
      ambulance_id: undefined,
      address: `Rua ${id}, 1`,
      timestamp: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
      ...overrides
    });

  function renderQueues(calls: EmergencyCall[]) {
    const onRegulate = vi.fn();
    const onDispatch = vi.fn();
    render(<CallList calls={calls} ambulances={AMBULANCES} onFocus={vi.fn()} onRegulate={onRegulate} onDispatch={onDispatch} onFinish={vi.fn()} />);
    return { onRegulate, onDispatch };
  }

  it('"Todos" separa regulação, despacho e em atendimento, nessa ordem', () => {
    renderQueues([active({ id: 'ativo' }), opened('despacho', 6, { status: CallStatus.PENDENTE }), opened('novo', 1)]);
    const titles = screen.getAllByRole('heading', { level: 2 }).map(heading => heading.textContent);
    expect(titles).toEqual(['Aguardando regulação 1', 'Aguardando despacho 1', 'Em atendimento 1']);
    expect(screen.getByRole('button', { name: 'Regulação 1' })).toBeInTheDocument();
  });

  it('chamado novo tem cor sugerida e botão Regular; o regulado, Despachar e Reclassificar', async () => {
    const user = userEvent.setup();
    const { onRegulate, onDispatch } = renderQueues([
      opened('novo', 1),
      opened('regulado', 6, { status: CallStatus.PENDENTE, times: { regulated: new Date().toISOString() } })
    ]);
    expect(screen.getByText('sugerida')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Regular' }));
    expect(onRegulate).toHaveBeenCalledWith(expect.objectContaining({ id: 'novo' }));
    await user.click(screen.getByRole('button', { name: 'Despachar' }));
    expect(onDispatch).toHaveBeenCalledWith(expect.objectContaining({ id: 'regulado' }));
    await user.click(screen.getByRole('button', { name: 'Reclassificar' }));
    expect(onRegulate).toHaveBeenCalledWith(expect.objectContaining({ id: 'regulado' }));
  });

  it('cronômetro de cada fila: regulação desde a abertura, despacho desde a regulação', () => {
    renderQueues([
      opened('novo', 2),
      opened('regulado', 30, { status: CallStatus.PENDENTE, times: { regulated: new Date(Date.now() - 60_000).toISOString() } })
    ]);
    // Regulação: 2 min já é atenção; despacho: 1 min desde a regulação (não os 30 desde a abertura)
    expect(screen.getByLabelText(/^Aguardando regulação há 2 min( \d s)?$/)).toHaveAttribute('data-level', 'atencao');
    expect(screen.getByLabelText(/^Aguardando despacho há 1 min( \d s)?$/)).toHaveAttribute('data-level', 'normal');
  });

  it('filtro sem chamados avisa', async () => {
    const user = userEvent.setup();
    renderQueues([opened('novo', 1)]);
    await user.click(screen.getByRole('button', { name: 'Despacho 0' }));
    expect(screen.getByText('Nenhum chamado aguardando despacho')).toBeInTheDocument();
  });
});
