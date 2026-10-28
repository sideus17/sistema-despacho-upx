import { useState } from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithAuth } from '../test/renderWithAuth';
import { searchPlaces } from '../services/api';
import AddressSearch, { PlaceValue } from './AddressSearch';

vi.mock('../services/api', async original => ({
  ...(await original<typeof import('../services/api')>()),
  searchPlaces: vi.fn()
}));

const HOSPITAL = { label: 'Hospital Regional de Sorocaba', detail: 'Vila Boa Vista, Sorocaba', location: { lat: -23.509, lng: -47.458 } };

function Field({ onChange, onPick }: { onChange?: (value: PlaceValue | null) => void; onPick?: () => void }) {
  const [value, setValue] = useState<PlaceValue | null>(null);
  return (
    <AddressSearch
      label="Destino"
      placeholder="Escolha o destino"
      value={value}
      onChange={next => { setValue(next); onChange?.(next); }}
      actions={[{ id: 'mapa', label: 'Escolher no mapa', kind: 'mapa', run: () => onPick?.() }]}
    />
  );
}

describe('campo de endereço com autocompletar', () => {
  it('ao focar mostra o atalho de escolher no mapa', async () => {
    renderWithAuth(<Field />);
    await userEvent.setup().click(screen.getByRole('combobox', { name: 'Destino' }));
    const options = screen.getAllByRole('option').map(option => option.textContent);
    expect(options).toEqual(['Escolher no mapa']);
  });

  it('busca endereços depois de parar de digitar', async () => {
    vi.mocked(searchPlaces).mockResolvedValue([HOSPITAL]);
    renderWithAuth(<Field />);
    const user = userEvent.setup();
    await user.type(screen.getByRole('combobox', { name: 'Destino' }), 'rua');

    await waitFor(() => expect(searchPlaces).toHaveBeenCalledWith('rua', expect.any(AbortSignal)));
    expect(await screen.findByRole('option', { name: /Hospital Regional/ })).toBeInTheDocument();
  });

  it('setas e Enter escolhem um endereço; o texto vira o nome do lugar', async () => {
    vi.mocked(searchPlaces).mockResolvedValue([HOSPITAL]);
    const onChange = vi.fn();
    renderWithAuth(<Field onChange={onChange} />);
    const user = userEvent.setup();
    const input = screen.getByRole('combobox', { name: 'Destino' });
    await user.type(input, 'hospital');
    await screen.findByRole('option', { name: /Hospital Regional/ });

    await user.keyboard('{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenLastCalledWith({ ...HOSPITAL, kind: 'endereco' });
    expect(input).toHaveValue('Hospital Regional de Sorocaba');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('Esc fecha a lista e "Escolher no mapa" chama o atalho', async () => {
    const onPick = vi.fn();
    renderWithAuth(<Field onPick={onPick} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox', { name: 'Destino' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    await user.keyboard('{ArrowDown}');
    await user.click(screen.getByRole('option', { name: 'Escolher no mapa' }));
    expect(onPick).toHaveBeenCalled();
  });

  it('CEP sugere a rua: escolher só completa o texto e deixa digitar o número', async () => {
    vi.mocked(searchPlaces).mockResolvedValue([{ label: 'Rua da Penha', detail: 'Centro, Sorocaba · CEP 18010-003', fill: 'Rua da Penha, ' }]);
    const onChange = vi.fn();
    renderWithAuth(<Field onChange={onChange} />);
    const user = userEvent.setup();
    const input = screen.getByRole('combobox', { name: 'Destino' });
    await user.type(input, '18010-003');
    await user.click(await screen.findByRole('option', { name: /Rua da Penha/ }));

    expect(input).toHaveValue('Rua da Penha, ');
    expect(input).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
    await user.type(input, '890');
    expect(input).toHaveValue('Rua da Penha, 890');
  });

  it('voltar a digitar num endereço escolhido mantém o texto', async () => {
    vi.mocked(searchPlaces).mockResolvedValue([HOSPITAL]);
    renderWithAuth(<Field />);
    const user = userEvent.setup();
    const input = screen.getByRole('combobox', { name: 'Destino' });
    await user.type(input, 'hospital');
    await user.click(await screen.findByRole('option', { name: /Hospital Regional/ }));
    await user.type(input, ' x');
    expect(input).toHaveValue('Hospital Regional de Sorocaba x');
  });

  it('busca fora do ar avisa e deixa escolher no mapa', async () => {
    vi.mocked(searchPlaces).mockRejectedValue(new Error('fora'));
    renderWithAuth(<Field />);
    await userEvent.setup().type(screen.getByRole('combobox', { name: 'Destino' }), 'rua xyz');
    expect(await screen.findByText(/A busca não respondeu/)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Escolher no mapa' })).toBeInTheDocument();
  });
});
