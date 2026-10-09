-- 001_auth_turnos.sql
-- Perfis (motorista/operador), vínculo motorista ↔ viatura e RLS.
-- Rodar uma vez no Supabase: SQL Editor → New query → colar → Run.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('MOTORISTA', 'OPERADOR')),
  created_at timestamptz not null default now()
);

-- Motorista em turno na viatura (no máximo uma viatura por motorista) e última posição enviada pelo app
alter table public.ambulances
  add column if not exists driver_id uuid unique references public.profiles (id) on delete set null,
  add column if not exists location_updated_at timestamptz;

-- Os dados só são acessados pelo backend (service_role ignora RLS).
-- Com RLS ligado e sem políticas, a anon key usada no login do frontend não lê nem altera as tabelas.
alter table public.profiles enable row level security;
alter table public.ambulances enable row level security;
alter table public.calls enable row level security;
alter table public.bases enable row level security;
alter table public.weather_events enable row level security;
