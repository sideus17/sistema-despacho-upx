import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setCallHospital } from '../services/api';
import { Hospital } from '../types';
import { renderWithAuth } from '../test/renderWithAuth';
import HospitalSheet from './HospitalSheet';

vi.mock('../services/api', async importOriginal => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  setCallHospital: vi.fn(async () => {})
}));

const hospital = (id: string, shortName: string, lat: number, kind: Hospital['kind'] = 'HOSPITAL'): Hospital => ({
  id, name: shortName, shortName, kind, address: '', location: { lat, lng: -47.45 }
});
const HOSPITALS = [hospital('longe', 'Regional', -23.55), hospital('perto', 'UPH Zona Oeste', -23.505, 'PRONTO_SOCORRO')];

describe('hospital de destino no app da equipe', () => {
  it('lista do mais perto para o mais longe e marca o escolhido', () => {
    renderWithAuth(
      <HospitalSheet callId="call-1" hospitals={HOSPITALS} current="longe" from={{ lat: -23.5, lng: -47.45 }} onClose={vi.fn()} onChosen={vi.fn()} />
    );
    const options = screen.getAllByRole('button').filter(button => button.hasAttribute('aria-pressed'));
    expect(options.map(option => option.textContent)).toEqual(['HUPH Zona OestePronto-socorro · 0,6 km', 'HRegionalHospital · 5,6 km']);
    expect(screen.getByRole('button', { name: /Regional/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('escolher grava, avisa e fecha', async () => {
    const onChosen = vi.fn();
    const onClose = vi.fn();
    renderWithAuth(
      <HospitalSheet callId="call-1" hospitals={HOSPITALS} from={{ lat: -23.5, lng: -47.45 }} onClose={onClose} onChosen={onChosen} />
    );
    await userEvent.setup().click(screen.getByRole('button', { name: /UPH Zona Oeste/ }));
    expect(setCallHospital).toHaveBeenCalledWith('call-1', 'perto');
    expect(onChosen).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
