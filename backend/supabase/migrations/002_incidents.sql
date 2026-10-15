-- 002_incidents.sql
-- Ocorrências na rota: marcadas pela central, relatadas pelas equipes ou vindas de fontes oficiais.
-- Substitui weather_events (as linhas antigas são mantidas e, vencidas, deixam de contar como ativas).
-- Rodar uma vez no Supabase: SQL Editor → New query → colar → Run. Pode rodar de novo sem erro.

-- 1. weather_events vira incidents
do $$
begin
  if to_regclass('public.incidents') is null and to_regclass('public.weather_events') is not null then
    alter table public.weather_events rename to incidents;
  end if;

  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'incidents' and column_name = 'start_time') then
    alter table public.incidents rename column start_time to created_at;
  end if;

  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'incidents' and column_name = 'estimated_end_time') then
    alter table public.incidents rename column estimated_end_time to expires_at;
  end if;
end $$;

-- O nível de risco dá lugar ao efeito na rota (bloqueio, risco ou aviso)
alter table public.incidents drop column if exists risk_level;

alter table public.incidents
  alter column id set default gen_random_uuid()::text,
  alter column description drop not null,
  alter column created_at set not null,
  add column if not exists source text not null default 'CENTRAL',
  add column if not exists effect text not null default 'RISCO',
  add column if not exists status text not null default 'ATIVA',
  add column if not exists created_by uuid references public.profiles (id) on delete set null,
  add column if not exists ambulance_id text references public.ambulances (id) on delete set null,
  -- Relato feito sem sinal: o app reenvia com o mesmo id e o servidor não duplica
  add column if not exists client_id text,
  -- Identificador na fonte oficial (setor do SGB, alerta da Defesa Civil)
  add column if not exists external_id text,
  -- Contorno da área para exibir no mapa; na rota vale sempre o círculo (lat, lng, radius)
  add column if not exists geometry jsonb,
  add column if not exists last_confirmed_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists closed_by uuid references public.profiles (id) on delete set null,
  add column if not exists close_reason text,
  add column if not exists updated_at timestamptz not null default now();

-- Regras de valores (as antigas, se houver, são trocadas por estas)
do $$
declare c record;
begin
  for c in select conname from pg_constraint where conrelid = 'public.incidents'::regclass and contype = 'c' loop
    execute format('alter table public.incidents drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.incidents
  add constraint incidents_type_check check (type in (
    'ALAGAMENTO', 'QUEDA_ARVORE', 'VIA_BLOQUEADA', 'ACIDENTE', 'VENTOS_FORTES', 'CHUVA_FORTE', 'ALERTA_OFICIAL'
  )),
  add constraint incidents_source_check check (source in ('CENTRAL', 'EQUIPE', 'CEMADEN', 'DEFESA_CIVIL')),
  add constraint incidents_effect_check check (effect in ('BLOQUEIO', 'RISCO', 'AVISO')),
  add constraint incidents_status_check check (status in ('ATIVA', 'ENCERRADA')),
  add constraint incidents_radius_check check (radius between 0 and 20000);

create unique index if not exists incidents_source_external_id_key on public.incidents (source, external_id);
create unique index if not exists incidents_created_by_client_id_key on public.incidents (created_by, client_id);
create index if not exists incidents_active_idx on public.incidents (expires_at) where status = 'ATIVA';

-- 2. Confirmações das equipes ("Ainda está lá?") e passagens pelo local
create table if not exists public.incident_votes (
  incident_id text not null references public.incidents (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  ambulance_id text references public.ambulances (id) on delete set null,
  vote text not null check (vote in ('SIM', 'NAO', 'PASSOU')),
  voted_at timestamptz not null default now(),
  primary key (incident_id, user_id)
);

-- Acesso só pelo backend (service_role), como nas outras tabelas
alter table public.incidents enable row level security;
alter table public.incident_votes enable row level security;

-- A API do Supabase passa a enxergar as tabelas e colunas novas na hora
notify pgrst, 'reload schema';
