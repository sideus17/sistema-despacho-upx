import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Ambulance, Hospital } from '../../types';
import { getIndicators } from '../../services/api';
import { indicators } from '../../test/management';
import Indicators from './Indicators';

vi.mock('../../services/api', async importOriginal => ({
  ...(await importOriginal<typeof import('../../services/api')>()),
  getIndicators: vi.fn()
}));

const SCOPE = { from: '2026-09-17T03:00:00.000Z', to: '2026-10-16T15:00:00.000Z', demo: true };
const AMBULANCES = [{ id: 'amb-3', code: 'USB-02' } as Ambulance];
const HOSPITALS = [{ id: 'hosp-santa-casa', shortName: 'Santa Casa' } as Hospital];

beforeEach(() => {
  vi.mocked(getIndicators).mockReset();
  vi.mocked(getIndicators).mockResolvedValue(indicators());
});

describe('indicadores', () => {
  it('com chamados regulados, a fila aparece em regulação e espera pela viatura; orientados no total', async () => {
    const base = indicators();
    vi.mocked(getIndicators).mockResolvedValue(indicators({
      byStatus: { ...base.byStatus, ORIENTADO: 5 },
      stages: { ...base.stages, regulation: { n: 120, median: 75, p90: 200 }, dispatchWait: { n: 110, median: 180, p90: 420 } }
    }));
    render(<Indicators scope={SCOPE} ambulances={AMBULANCES} hospitals={HOSPITALS} />);
    expect(await screen.findByRole('group', { name: 'Chamados' })).toHaveTextContent('5 orientados');
    const card = screen.getByRole('region', { name: 'Tempo de cada etapa' });
    expect(card).toHaveTextContent('Regulação');
    expect(card).toHaveTextContent('Espera pela viatura');
    expect(card).not.toHaveTextContent('Espera na fila');
  });

  it('números do período: chamados, tempo-resposta, meta e espera na fila', async () => {
    render(<Indicators scope={SCOPE} ambulances={AMBULANCES} hospitals={HOSPITALS} />);
    const tile = async (name: string) => screen.findByRole('group', { name });
    expect(await tile('Chamados')).toHaveTextContent('140');
    expect(await tile('Tempo-resposta (mediana)')).toHaveTextContent('18,2 min');
    expect(await tile('Dentro da meta')).toHaveTextContent('76%');
    expect(await tile('Espera na fila (mediana)')).toHaveTextContent('6,5 min');
    expect(getIndicators).toHaveBeenCalledWith(SCOPE, expect.any(AbortSignal));
  });

  it('tempo-resposta de cada cor com a meta; cor sem chegada avisa', async () => {
    render(<Indicators scope={SCOPE} ambulances={AMBULANCES} hospitals={HOSPITALS} />);
    const list = await screen.findByRole('list', { name: 'Tempo-resposta por cor' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Vermelho');
    expect(rows[0]).toHaveTextContent('11,9 min · 31% na meta');
    expect(rows[3]).toHaveTextContent('Sem chegadas · meta 60 min');
  });

  it('viatura e hospital pelo nome; aviso dos atendimentos sem chegada', async () => {
    render(<Indicators scope={SCOPE} ambulances={AMBULANCES} hospitals={HOSPITALS} />);
    expect(await screen.findByText('USB-02')).toBeInTheDocument();
    expect(screen.getByText('Santa Casa')).toBeInTheDocument();
    expect(screen.getAllByRole('note').map(note => note.textContent).join(' ')).toContain('8 atendimentos finalizados não têm a chegada');
  });

  it('cada gráfico tem a versão em tabela', async () => {
    const user = userEvent.setup();
    render(<Indicators scope={SCOPE} ambulances={AMBULANCES} hospitals={HOSPITALS} />);
    const card = await screen.findByRole('region', { name: 'Chamados por hora do dia' });
    await user.click(within(card).getByRole('button', { name: 'Tabela' }));
    const table = within(card).getByRole('table');
    expect(within(table).getByRole('row', { name: /18h às 19h 11/ })).toBeInTheDocument();
  });

  it('coluna com a dica ao focar pelo teclado; o maior valor fica escrito', async () => {
    render(<Indicators scope={SCOPE} ambulances={AMBULANCES} hospitals={HOSPITALS} />);
    const card = await screen.findByRole('region', { name: 'Chamados por hora do dia' });
    expect(within(card).getByRole('img', { name: 'Chamados por hora do dia' })).toHaveTextContent('11');
    expect(within(card).getByLabelText('18h às 19h: 11 chamados')).toBeInTheDocument();
  });

  it('período sem chamados sugere incluir a demonstração', async () => {
    vi.mocked(getIndicators).mockResolvedValue(indicators({ total: 0 }));
    render(<Indicators scope={{ ...SCOPE, demo: false }} ambulances={[]} hospitals={[]} />);
    expect(await screen.findByText('Nenhum chamado neste período.')).toBeInTheDocument();
    expect(screen.getByText(/Incluir demonstração/)).toBeInTheDocument();
  });

  it('erro com botão para tentar de novo', async () => {
    // Como chega do axios: a mensagem em português vem do servidor
    vi.mocked(getIndicators).mockRejectedValueOnce(Object.assign(new Error('Request failed'), { response: { data: { error: 'Servidor fora do ar' } } }));
    const user = userEvent.setup();
    render(<Indicators scope={SCOPE} ambulances={[]} hospitals={[]} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Servidor fora do ar');
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('group', { name: 'Chamados' })).toHaveTextContent('140');
  });
});
