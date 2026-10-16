// Uso diário do TomTom (plano gratuito: ~2.500 consultas e ~50.000 blocos por dia, zerando à meia-noite UTC)

export type TomTomUse = 'request' | 'tile';

// Tempo de rota é o primeiro a parar: os incidentes têm prioridade sobre as consultas que sobrarem
const LOW_PRIORITY_SHARE = 0.9;

export interface TomTomBudget {
  spend(kind: TomTomUse, lowPriority?: boolean): boolean;
  usage(): { requests: number; tiles: number; requestLimit: number; tileLimit: number };
}

export function createBudget(limits: () => Record<TomTomUse, number>, now: () => Date = () => new Date()): TomTomBudget {
  let day = '';
  const used: Record<TomTomUse, number> = { request: 0, tile: 0 };

  const roll = () => {
    const today = now().toISOString().slice(0, 10);
    if (today === day) return;
    day = today;
    used.request = 0;
    used.tile = 0;
  };

  return {
    // Conta um uso, se ainda couber no dia
    spend(kind, lowPriority = false) {
      roll();
      const limit = limits()[kind] * (lowPriority ? LOW_PRIORITY_SHARE : 1);
      if (used[kind] >= limit) return false;
      used[kind]++;
      return true;
    },
    usage() {
      roll();
      const { request, tile } = limits();
      return { requests: used.request, tiles: used.tile, requestLimit: request, tileLimit: tile };
    }
  };
}

export const tomtomBudget = createBudget(() => ({
  request: Number(process.env.TOMTOM_DAILY_LIMIT) || 2000,
  tile: Number(process.env.TOMTOM_TILE_DAILY_LIMIT) || 45000
}));

// "uso hoje: 120 de 2.000 consultas, 3.400 de 45.000 blocos"
export function tomtomUsageText(): string {
  const { requests, tiles, requestLimit, tileLimit } = tomtomBudget.usage();
  const n = (value: number) => value.toLocaleString('pt-BR');
  return `uso hoje: ${n(requests)} de ${n(requestLimit)} consultas, ${n(tiles)} de ${n(tileLimit)} blocos`;
}
