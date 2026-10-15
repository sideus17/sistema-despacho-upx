import { describe, expect, it } from 'vitest';
import { RouteStep } from '../../types';
import { bearing, circleEntryAlong, cumulativeDistances, distance, pointAlong, projectOnLine, remainingLine } from './geo';
import { formatNavDistance, maneuverText, spokenInstruction } from './instructions';

// Rota em L: ~1 km para leste e depois ~1 km para o norte
const LINE = [
  { lat: -23.5, lng: -47.46 },
  { lat: -23.5, lng: -47.45021 },
  { lat: -23.491, lng: -47.45021 }
];
const CUMULATIVE = cumulativeDistances(LINE);

describe('geometria da navegação', () => {
  it('distância e rumo', () => {
    expect(distance(LINE[0], LINE[1])).toBeCloseTo(CUMULATIVE[1], 6);
    expect(Math.round(distance(LINE[1], LINE[2]))).toBe(1001);
    expect(Math.round(bearing(LINE[0], LINE[1]))).toBe(90);
    expect(Math.round(bearing(LINE[1], LINE[2]))).toBe(0);
  });

  it('projeta a posição do carro na rota', () => {
    // 30 m ao sul da metade do primeiro trecho
    const projection = projectOnLine(LINE, CUMULATIVE, { lat: -23.50027, lng: -47.455105 });
    expect(projection.segmentIndex).toBe(0);
    expect(projection.distanceFromLine).toBeGreaterThan(25);
    expect(projection.distanceFromLine).toBeLessThan(35);
    expect(projection.distanceAlong).toBeCloseTo(CUMULATIVE[1] / 2, -1);
    expect(remainingLine(LINE, projection)).toHaveLength(3);
  });

  it('não volta para um trecho já percorrido', () => {
    const projection = projectOnLine(LINE, CUMULATIVE, LINE[0], 1);
    expect(projection.segmentIndex).toBe(1);
  });

  it('ponto a tantos metros do início', () => {
    const { point, segmentIndex } = pointAlong(LINE, CUMULATIVE, CUMULATIVE[1] + 500);
    expect(segmentIndex).toBe(1);
    expect(distance(point, LINE[1])).toBeCloseTo(500, -1);
    expect(pointAlong(LINE, CUMULATIVE, 99999).point).toEqual(LINE[2]);
  });

  it('onde a rota entra numa ocorrência', () => {
    const center = { lat: -23.495, lng: -47.45021 }; // no meio do segundo trecho
    const entry = circleEntryAlong(LINE, CUMULATIVE, center, 100);
    expect(entry).not.toBeNull();
    expect(entry!).toBeCloseTo(CUMULATIVE[1] + distance(LINE[1], center) - 100, -1);
    expect(circleEntryAlong(LINE, CUMULATIVE, { lat: -23.49, lng: -47.47 }, 100)).toBeNull();
  });
});

const step = (type: string, modifier: string | undefined, name: string, exit?: number): RouteStep => ({
  type,
  modifier,
  name,
  exit,
  location: { lat: 0, lng: 0 },
  distance: 0,
  duration: 0
});

describe('instruções em português', () => {
  it('artigo pelo tipo de logradouro', () => {
    expect(maneuverText(step('turn', 'right', 'Rua da Penha'))).toBe('Vire à direita na Rua da Penha');
    expect(maneuverText(step('turn', 'left', 'Viaduto Jardim'))).toBe('Vire à esquerda no Viaduto Jardim');
    expect(maneuverText(step('depart', undefined, 'Avenida São Paulo'))).toBe('Siga pela Avenida São Paulo');
  });

  it('rotatória, retorno e chegada', () => {
    expect(maneuverText(step('roundabout', 'right', 'Rua X', 2))).toBe('Na rotatória, pegue a 2ª saída para a Rua X');
    expect(maneuverText(step('turn', 'uturn', 'Rua X'))).toBe('Faça o retorno na Rua X');
    expect(maneuverText(step('arrive', undefined, ''))).toBe('Você chegou ao destino');
  });

  it('distância arredondada e versão falada', () => {
    expect(formatNavDistance(37)).toBe('40 m');
    expect(formatNavDistance(260)).toBe('250 m');
    expect(formatNavDistance(1530)).toBe('1,5 km');
    expect(spokenInstruction(step('turn', 'right', 'Rua X'), 260)).toBe('Em 250 metros, vire à direita na Rua X');
    expect(spokenInstruction(step('turn', 'right', 'Rua X'), 40)).toBe('Vire à direita na Rua X');
  });
});
