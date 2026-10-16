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

const USA: PlaceValue = { label: 'USA-01', detail: 'Viatura USA', location: { lat: -23.50, lng: -47.45 }, kind: 'viatura' };
const BASE: PlaceValue = { label: 'Base SAMU Central', detail: 'Av. Comendador', location: { lat: -23.51, lng: -47.46 }, kind: 'base' };
const HOSPITAL = { label: 'Hospital Regional de Sorocaba', detail: 'Vila Boa Vista, Sorocaba', location: { lat: -23.509, lng: -47.458 } };

function Field({ onChange, onPick }: { onChange?: (value: PlaceValue | null) => void; onPick?: () => void }) {
  const [value, setValue] = useState<PlaceValue | null>(null);
  return (
    <AddressSearch
      label="Destino"
      placeholder="Escolha o destino"
      marker={null}
      value={value}
      onChange={next => { setValue(next); onChange?.(next); }}
      localPlaces={[USA, BASE]}
      actions={[{ id: 'mapa', label: 'Escolher no mapa', kind: 'mapa', run: () => onPick?.() }]}
    />
  );
}

describe('campo de endereço com autocompletar', () => {
  it('ao focar mostra os atalhos, as viaturas e as bases', async () => {
    renderWithAuth(<Field />);
    await userEvent.setup().click(screen.getByRole('combobox', { name: 'Destino' }));
    const options = screen.getAllByRole('option').map(option => option.textContent);
    expect(options).toEqual(['Escolher no mapa', 'USA-01Viatura USA', 'Base SAMU CentralAv. Comendador']);
  });

  it('filtra viaturas na hora e busca endereços depois de parar de digitar', async () => {
    vi.mocked(searchPlaces).mockResolvedValue([HOSPITAL]);
    renderWithAuth(<Field />);
    const user = userEvent.setup();
    await user.type(screen.getByRole('combobox', { name: 'Destino' }), 'usa');

    expect(screen.getByRole('option', { name: /USA-01/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Base SAMU/ })).not.toBeInTheDocument();
    await waitFor(() => expect(searchPlaces).toHaveBeenCalledWith('usa', expect.any(AbortSignal)));
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

  it('busca fora do ar avisa e deixa escolher no mapa', async () => {
    vi.mocked(searchPlaces).mockRejectedValue(new Error('fora'));
    renderWithAuth(<Field />);
    await userEvent.setup().type(screen.getByRole('combobox', { name: 'Destino' }), 'rua xyz');
    expect(await screen.findByText(/A busca não respondeu/)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Escolher no mapa' })).toBeInTheDocument();
  });
});
