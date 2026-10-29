import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AmbulanceStatus, CallPriority, IncidentEffect, IncidentSource, IncidentType, Incident, RouteInfo } from '../types';
import { Candidate, rankScores, scoreCandidate, timeScore } from './dispatchScore';

const CALL = { lat: -23.5, lng: -47.45 };
const candidate = (id: string, overrides: Partial<Candidate> = {}): Candidate => ({
  id, code: id.toUpperCase(), type: 'USB', status: AmbulanceStatus.DISPONIVEL, location: { lat: -23.51, lng: -47.45 }, ...overrides
});
const route = (duration: number, overrides: Partial<RouteInfo> = {}): RouteInfo => ({
  distance: 2000, duration, geometry: [], steps: [], engine: 'valhalla',
  incidentsOnRoute: [], avoided: [], warnings: [], durationSource: 'TRANSITO', ...overrides
});

test('tempo de chegada: tudo até 3 min, nada a partir de 25 min', () => {
  assert.equal(timeScore(120), 100);
  assert.equal(timeScore(180), 100);
  assert.equal(timeScore(14 * 60), 50);
  assert.equal(timeScore(25 * 60), 0);
  assert.equal(timeScore(40 * 60), 0);
});

test('com rota, vale o tempo com trânsito, não a distância em linha reta', () => {
  // A mais perto em linha reta está presa no trânsito
  const near = scoreCandidate(candidate('near'), CALL, CallPriority.URGENTE, [], route(20 * 60));
  const far = scoreCandidate(candidate('far', { location: { lat: -23.53, lng: -47.45 } }), CALL, CallPriority.URGENTE, [], route(6 * 60));
  assert.ok(far.totalScore > near.totalScore);
  assert.equal(far.arrivalSeconds, 360);
  assert.match(far.explanation, /^FAR \(USB\) chega em ~6 min com o trânsito de agora e está disponível\. É o tipo ideal/);
  assert.equal(far.route?.duration, 360);
});

test('sem rota (ocupada ou motor fora do ar): estimativa a 40 km/h, dita sem jargão', () => {
  const busy = scoreCandidate(candidate('busy', { status: AmbulanceStatus.EM_ATENDIMENTO }), CALL, CallPriority.URGENTE, []);
  // ~1,1 km a 40 km/h ≈ 100 s
  assert.ok(busy.arrivalSeconds > 90 && busy.arrivalSeconds < 110);
  assert.equal(busy.availabilityScore, 30);
  assert.equal('route' in busy, false);
  assert.match(busy.explanation, /^BUSY \(USB\) está a 1,1 km do chamado \(~1 min, estimativa sem rota\), mas está em atendimento\./);
  // A rota em linha reta (nenhum motor respondeu) também é só estimativa
  const fallback = scoreCandidate(candidate('x'), CALL, CallPriority.URGENTE, [], route(5000, { engine: 'linha-reta' }));
  assert.equal(fallback.arrivalSeconds, busy.arrivalSeconds);
});

test('a análise põe as livres na frente, mesmo com nota menor', () => {
  // A ocupada está colada no chamado (nota alta), mas não pode ser despachada
  const busy = scoreCandidate(candidate('busy', { status: AmbulanceStatus.EM_ATENDIMENTO, location: CALL }), CALL, CallPriority.URGENTE, []);
  const free = scoreCandidate(candidate('free'), CALL, CallPriority.URGENTE, [], route(20 * 60));
  assert.ok(busy.totalScore > free.totalScore);
  const ranked = rankScores([
    { status: AmbulanceStatus.EM_ATENDIMENTO, score: busy },
    { status: AmbulanceStatus.DISPONIVEL, score: free }
  ]);
  assert.deepEqual(ranked.map(item => item.score.ambulanceId), ['free', 'busy']);
});

test('o tipo aparece pelo nome: Motolância, não MOTOLANCIA', () => {
  const moto = scoreCandidate(candidate('moto-01', { type: 'MOTOLANCIA' }), CALL, CallPriority.URGENTE, [], route(240));
  assert.match(moto.explanation, /^MOTO-01 \(Motolância\) chega em ~4 min/);
});

test('tipo, disponibilidade e ocorrência perto entram na nota', () => {
  const incident: Incident = {
    id: 'i1', type: IncidentType.ALAGAMENTO, source: IncidentSource.EQUIPE, effect: IncidentEffect.RISCO,
    location: { lat: -23.5005, lng: -47.45 }, radius: 100, description: null, createdAt: '', expiresAt: null,
    lastConfirmedAt: null, createdBy: null, ambulance: null, geometry: null, votes: { yes: 0, no: 0 }, myVote: null
  };
  const score = scoreCandidate(candidate('usa', { type: 'USA' }), CALL, CallPriority.EMERGENCIA, [incident], route(120));
  assert.deepEqual(
    [score.timeScore, score.availabilityScore, score.typeScore, score.incidentPenalty, score.totalScore],
    [100, 100, 100, -10, 89]
  );
});
