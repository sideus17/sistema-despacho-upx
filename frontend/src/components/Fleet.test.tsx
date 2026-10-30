import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Ambulance, AmbulanceStatus, AmbulanceType } from '../types';
import Fleet from './Fleet';

const ambulance = {
  id: 'amb-1',
  code: 'USA-01',
  type: AmbulanceType.USA,
  status: AmbulanceStatus.DISPONIVEL,
  location: { lat: -23.5, lng: -47.45 },
  driver: { id: 'm1', name: 'Motorista' }
} as Ambulance;

describe('Frota', () => {
  it('"Ver no mapa" pede o mapa da viatura', async () => {
    const onFocus = vi.fn();
    render(<Fleet ambulances={[ambulance]} onFocus={onFocus} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ver USA-01 no mapa' }));
    expect(onFocus).toHaveBeenCalledWith(ambulance);
  });
});
