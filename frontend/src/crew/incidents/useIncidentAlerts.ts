import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Coordinates, Incident, IncidentEffect, IncidentSource, RouteInfo } from '../../types';
import { incidentTypeLabel } from '../../map/incidents';
import { circleEntryAlong, cumulativeDistances, distance } from '../navigation/geo';
import { stillThereQuestion } from './StillTherePrompt';

const ALERT_AHEAD = 1500; // metros: só avisa do que está perto, no trecho que falta
const MAX_ROUTE_ALERTS = 3; // por trajeto: aviso demais vira ruído
const ALERT_SHOW_MS = 8000;
const PROMPT_DISTANCE = 150; // metros do centro (ou dentro da área, se for maior)
const MAX_PROMPTS = 3; // por trajeto
const PROMPT_INTERVAL_MS = 2 * 60_000;

export interface IncidentAlert {
  incident: Incident;
  distance: number | null; // metros até a área; null no alerta oficial
}

function spokenDistance(meters: number): string {
  if (meters < 100) return 'à frente';
  if (meters >= 1000) return `em ${(meters / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} quilômetros`;
  return `em ${Math.round(meters / 50) * 50} metros`;
}

interface Options {
  incidents: Incident[];
  route: RouteInfo;
  remaining: Coordinates[]; // trecho da rota que ainda falta
  position: Coordinates | null; // posição real da viatura
  meId: string;
  active: boolean; // navegando (com GPS e sem ter chegado)
  speak: (text: string) => void; // fala sem cortar a instrução de manobra
}

/**
 * Avisos de ocorrências durante a navegação:
 * - faixa + voz para o que está à frente na rota (até 1,5 km, no máximo 3 por trajeto);
 * - alerta oficial uma vez, no início;
 * - "Ainda está lá?" ao passar por ocorrência marcada por outra pessoa;
 * - bloqueio novo à frente, que a rota atual não conhece (a navegação recalcula).
 */
export function useIncidentAlerts({ incidents, route, remaining, position, meId, active, speak }: Options) {
  const [alert, setAlert] = useState<IncidentAlert | null>(null);
  const [prompt, setPrompt] = useState<Incident | null>(null);
  const alerted = useRef(new Set<string>());
  const prompted = useRef(new Set<string>());
  const officialShown = useRef(false);
  const lastPromptAt = useRef(0);
  const alertTimer = useRef<number>();

  const cumulative = useMemo(() => cumulativeDistances(remaining), [remaining]);

  // Ocorrências com área que o trecho restante atravessa, na ordem em que aparecem
  const ahead = useMemo(() => incidents
    .filter(incident => incident.radius > 0)
    .map(incident => ({ incident, along: circleEntryAlong(remaining, cumulative, incident.location, incident.radius) }))
    .filter((hit): hit is { incident: Incident; along: number } => hit.along !== null)
    .sort((a, b) => a.along - b.along), [incidents, remaining, cumulative]);

  // Bloqueio que a rota não levou em conta (novo, ou relato que acabou de virar bloqueio)
  const blockedAhead = useMemo(() => {
    const known = (id: string) =>
      route.avoided.some(incident => incident.id === id) ||
      route.incidentsOnRoute.some(incident => incident.id === id && incident.effect === IncidentEffect.BLOQUEIO);
    return ahead.find(hit => hit.incident.effect === IncidentEffect.BLOQUEIO && !known(hit.incident.id))?.incident ?? null;
  }, [ahead, route]);

  const show = useCallback((next: IncidentAlert) => {
    window.clearTimeout(alertTimer.current);
    setAlert(next);
    alertTimer.current = window.setTimeout(() => setAlert(null), ALERT_SHOW_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(alertTimer.current), []);

  // Faixa e voz
  useEffect(() => {
    if (!active) return;

    if (!officialShown.current) {
      officialShown.current = true;
      const official = incidents.find(incident => incident.source === IncidentSource.DEFESA_CIVIL);
      if (official) {
        show({ incident: official, distance: null });
        speak('Alerta da Defesa Civil em vigor para a cidade');
        return;
      }
    }

    if (alerted.current.size >= MAX_ROUTE_ALERTS) return;
    const next = ahead.find(hit =>
      hit.along <= ALERT_AHEAD &&
      !alerted.current.has(hit.incident.id) &&
      hit.incident.id !== blockedAhead?.id &&
      hit.incident.createdBy?.id !== meId // quem relatou já sabe
    );
    if (!next) return;

    alerted.current.add(next.incident.id);
    show({ incident: next.incident, distance: next.along });
    speak(`Atenção: ${incidentTypeLabel(next.incident.type).toLowerCase()} ${spokenDistance(next.along)}`);
  }, [active, ahead, incidents, blockedAhead, meId, show, speak]);

  // "Ainda está lá?"
  useEffect(() => {
    if (!active || !position || prompt) return;
    if (prompted.current.size >= MAX_PROMPTS || Date.now() - lastPromptAt.current < PROMPT_INTERVAL_MS) return;

    const candidate = incidents.find(incident =>
      incident.source !== IncidentSource.DEFESA_CIVIL &&
      incident.effect !== IncidentEffect.AVISO &&
      !incident.myVote &&
      incident.createdBy?.id !== meId &&
      !prompted.current.has(incident.id) &&
      distance(position, incident.location) <= Math.max(PROMPT_DISTANCE, incident.radius)
    );
    if (!candidate) return;

    prompted.current.add(candidate.id);
    lastPromptAt.current = Date.now();
    setPrompt(candidate);
    speak(stillThereQuestion(candidate));
  }, [active, position, incidents, prompt, meId, speak]);

  const closePrompt = useCallback(() => setPrompt(null), []);

  return { alert, prompt, closePrompt, blockedAhead };
}
