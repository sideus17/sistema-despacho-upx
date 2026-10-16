import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Ambulance, AmbulanceStatus, AmbulanceType, Base, RouteInfo } from '../types';
import { renderWithAuth } from '../test/renderWithAuth';
import { calculateRoute } from '../services/api';
import RoutePlanner from './RoutePlanner';
import { useRoutePlanner } from './useRoutePlanner';

vi.mock('../services/api', async original => ({
  ...(await original<typeof import('../services/api')>()),
  calculateRoute: vi.fn(),
  searchPlaces: vi.fn(async () => [])
}));

const AMBULANCE = {
  id: 'amb-1',
  code: 'USA-01',
  type: AmbulanceType.USA,
  status: AmbulanceStatus.DISPONIVEL,
  location: { lat: -23.5015, lng: -47.4526 },
  driver: null
} as unknown as Ambulance;
const BASE: Base = { id: 'base-2', name: 'Base SAMU Zona Norte', location: { lat: -23.4889, lng: -47.4419 }, address: 'Rua Manoel Lopes, 234', capacity: 6 };

const route = (duration: number, street: string): RouteInfo => ({
  distance: duration * 10,
  duration,
  geometry: [],
  steps: [{ type: 'depart', name: street, distance: 500, duration, location: { lat: 0, lng: 0 } }],
  waypoints: [],
  engine: 'valhalla',
  incidentsOnRoute: [],
  avoided: [],
  warnings: []
});

function Planner() {
  const planner = useRoutePlanner();
  return <RoutePlanner planner={planner} ambulances={[AMBULANCE]} bases={[BASE]} onPickOnMap={vi.fn()} />;
}

const choose = async (user: ReturnType<typeof userEvent.setup>, field: string, option: RegExp) => {
  await user.click(screen.getByRole('combobox', { name: field }));
  await user.click(screen.getByRole('option', { name: option }));
};

describe('painel de rotas da central', () => {
  it('com partida e destino mostra as rotas, marca a mais rápida e inverte', async () => {
    vi.mocked(calculateRoute).mockResolvedValue({ ...route(960, 'Avenida São Paulo'), alternatives: [route(840, 'Rua XV'), route(1140, 'Avenida Ipanema')] });
    renderWithAuth(<Planner />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Rotas' }));
    await choose(user, 'Ponto de partida', /USA-01/);
    await choose(user, 'Destino', /Base SAMU Zona Norte/);

    expect(calculateRoute).toHaveBeenLastCalledWith(AMBULANCE.location, BASE.location, { alternatives: true });
    const options = await screen.findAllByRole('button', { pressed: false });
    expect(options.map(option => option.textContent)).toEqual(['14min8.4 km · via Rua XV Mais rápida', '19min11.4 km · via Avenida Ipanema']);
    expect(screen.getByRole('button', { pressed: true })).toHaveTextContent('16min9.6 km · via Avenida São Paulo');

    await user.click(options[0]);
    expect(screen.getByRole('button', { pressed: true })).toHaveTextContent('via Rua XV');

    await user.click(screen.getByRole('button', { name: 'Inverter partida e destino' }));
    await waitFor(() => expect(calculateRoute).toHaveBeenLastCalledWith(BASE.location, AMBULANCE.location, { alternatives: true }));
    expect(screen.getByRole('combobox', { name: 'Ponto de partida' })).toHaveValue('Base SAMU Zona Norte');
  });

  it('fechar o painel volta ao botão "Rotas"', async () => {
    renderWithAuth(<Planner />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Rotas' }));
    await user.click(screen.getByRole('button', { name: 'Fechar rotas' }));
    expect(screen.getByRole('button', { name: 'Rotas' })).toBeInTheDocument();
  });
});
