import { distanceMeters } from '../geo';
import sgb from '../../data/sgb-setores-sorocaba.json';
import cemaden from '../../data/cemaden-estacoes-sorocaba.json';

const HOUR = 3600_000;

// Chuva que, perto de um setor de inundação do SGB, vira "alagamento provável" (ajustável no .env)
const rain1h = () => Number(process.env.CEMADEN_RAIN_1H_MM) || 30;
const rain3h = () => Number(process.env.CEMADEN_RAIN_3H_MM) || 50;
// Setores de Itapemirim e Cauane ficam a ~5,1 km da estação mais próxima (Cerrado)
const stationDistance = () => Number(process.env.CEMADEN_STATION_DISTANCE_M) || 6000;
const STALE_READING = 3 * HOUR; // leitura mais velha que isso não vale

export type Sector = (typeof sgb.sectors)[number];

// Chuva acumulada de uma estação (API do PED)
export interface Reading {
  codestacao: string;
  acc1hr: number | null;
  acc3hr: number | null;
  datahora: string; // UTC, sem fuso
}

export interface SectorAlert {
  sector: Sector;
  description: string;
}

export function recentStations(readings: Reading[], now: number) {
  return cemaden.stations.flatMap(station => {
    const reading = readings.find(r => r.codestacao === station.code);
    const at = reading ? Date.parse(reading.datahora.endsWith('Z') ? reading.datahora : `${reading.datahora}Z`) : NaN;
    if (!reading || !Number.isFinite(at) || now - at > STALE_READING) return [];
    return [{ ...station, acc1h: reading.acc1hr ?? 0, acc3h: reading.acc3hr ?? 0 }];
  });
}

// Setores de inundação com chuva forte numa estação próxima (a mais intensa em relação ao limite)
export function heavyRainSectors(readings: Reading[], now: number): SectorAlert[] {
  const stations = recentStations(readings, now);
  const intensity = (station: { acc1h: number; acc3h: number }) => station.acc1h / rain1h() + station.acc3h / rain3h();

  return sgb.sectors.flatMap(sector => {
    const heavy = stations
      .filter(station => distanceMeters(station, sector.center) <= stationDistance())
      .filter(station => station.acc1h >= rain1h() || station.acc3h >= rain3h())
      .sort((a, b) => intensity(b) - intensity(a))[0];
    if (!heavy) return [];

    const amount = heavy.acc1h >= rain1h() ? `${Math.round(heavy.acc1h)} mm em 1 h` : `${Math.round(heavy.acc3h)} mm em 3 h`;
    return [{
      sector,
      description: `Chuva forte (${amount} na estação ${heavy.name}) perto de área de inundação: ${sector.local}. Fonte: CEMADEN/MCTI e SGB/CPRM.`
    }];
  });
}
