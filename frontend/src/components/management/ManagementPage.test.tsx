import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ManagementScope } from '../../types';
import ManagementPage from './ManagementPage';

// As abas entram de mentira, mostrando o período que receberam (o vi.mock sobe para o topo do arquivo)
const { show } = vi.hoisted(() => ({
  show: (name: string) => ({ scope }: { scope: ManagementScope }) =>
    `${name}: ${scope.demo ? 'com' : 'sem'} demonstração, desde ${new Date(scope.from).toLocaleDateString('pt-BR')}`
}));
vi.mock('./Indicators', () => ({ default: show('Indicadores') }));
vi.mock('./History', () => ({ default: show('Histórico') }));
vi.mock('./HeatMap', () => ({ default: show('Mapa de calor') }));

const renderPage = () => render(<ManagementPage ambulances={[]} hospitals={[]} bases={[]} />);
const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toLocaleDateString('pt-BR');
};

describe('tela de gestão', () => {
  it('começa nos indicadores dos últimos 30 dias, com a demonstração', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: 'Indicadores' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(`Indicadores: com demonstração, desde ${daysAgo(29)}`)).toBeInTheDocument();
  });

  it('período, demonstração e aba valem para tudo e ficam lembrados', async () => {
    const user = userEvent.setup();
    const { unmount } = renderPage();
    await user.click(screen.getByRole('radio', { name: '7 dias' }));
    await user.click(screen.getByRole('checkbox', { name: 'Incluir demonstração' }));
    await user.click(screen.getByRole('tab', { name: 'Histórico' }));
    expect(screen.getByText(`Histórico: sem demonstração, desde ${daysAgo(6)}`)).toBeInTheDocument();

    unmount();
    renderPage();
    expect(screen.getByRole('tab', { name: 'Histórico' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('radio', { name: '7 dias' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('checkbox', { name: 'Incluir demonstração' })).not.toBeChecked();
  });

  it('mapa de calor ocupa a área toda', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('tab', { name: 'Mapa de calor' }));
    expect(screen.getByText(/^Mapa de calor: com demonstração/)).toBeInTheDocument();
  });
});
