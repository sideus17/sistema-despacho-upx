import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PanelHandle, usePanelCollapsed } from './PanelHandle';

function Panel({ fallback = false }: { fallback?: boolean }) {
  const [collapsed, setCollapsed] = usePanelCollapsed(fallback);
  return (
    <footer>
      <PanelHandle collapsed={collapsed} onChange={setCollapsed} label="painel" />
      {!collapsed && <button>Sair</button>}
    </footer>
  );
}

const handle = () => screen.getByRole('button', { name: /painel/ });

describe('painel que desce', () => {
  it('tocar na alça recolhe e abre, e a escolha fica salva no aparelho', async () => {
    const user = userEvent.setup();
    render(<Panel />);
    expect(handle()).toHaveAttribute('aria-expanded', 'true');

    await user.click(handle());
    expect(handle()).toHaveAccessibleName('Mostrar painel');
    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument();
    expect(localStorage.getItem('samu:painel-recolhido')).toBe('1');

    await user.click(handle());
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument();
    expect(localStorage.getItem('samu:painel-recolhido')).toBe('0');
  });

  it('arrastar para baixo recolhe e para cima abre; o clique que vem junto não desfaz', () => {
    render(<Panel />);
    fireEvent.pointerDown(handle(), { clientY: 100 });
    fireEvent.pointerUp(handle(), { clientY: 160 });
    fireEvent.click(handle());
    expect(handle()).toHaveAttribute('aria-expanded', 'false');

    fireEvent.pointerDown(handle(), { clientY: 160 });
    fireEvent.pointerUp(handle(), { clientY: 100 });
    fireEvent.click(handle());
    expect(handle()).toHaveAttribute('aria-expanded', 'true');
  });

  it('sem escolha salva vale o padrão (deitado começa recolhido); com escolha salva, vale a escolha', () => {
    const { unmount } = render(<Panel fallback />);
    expect(handle()).toHaveAttribute('aria-expanded', 'false');
    unmount();

    localStorage.setItem('samu:painel-recolhido', '0');
    render(<Panel fallback />);
    expect(handle()).toHaveAttribute('aria-expanded', 'true');
  });
});
