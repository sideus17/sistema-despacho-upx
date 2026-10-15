-- 000_base.sql
-- Tabelas originais (bases, viaturas, chamados e eventos de clima), como estavam antes da 001.
-- Só para o banco local (npm run db:start): no projeto hospedado elas foram criadas pelo painel
-- e já existem. NÃO rodar no SQL Editor da produção.
-- Colunas, tipos, obrigatoriedade e valores padrão conferidos com o projeto hospedado.

create table if not exists public.bases (
  id text primary key,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  address text not null,
  capacity integer not null
);

create table if not exists public.ambulances (
  id text primary key,
  code text not null,
  type text not null,
  status text not null,
  lat double precision not null,
  lng double precision not null,
  base_id text not null,
  crew_driver text not null,
  crew_medic text not null,
  crew_nurse text
);

create table if not exists public.calls (
  id text primary key,
  lat double precision not null,
  lng double precision not null,
  address text not null,
  priority text not null,
  status text not null,
  description text not null,
  patient_age integer,
  patient_gender text,
  patient_symptoms text,
  "timestamp" timestamptz default now(),
  ambulance_id text
);

-- Vira public.incidents na 002
create table if not exists public.weather_events (
  id text primary key,
  type text not null,
  lat double precision not null,
  lng double precision not null,
  radius integer not null,
  description text not null,
  start_time timestamptz default now(),
  estimated_end_time timestamptz,
  risk_level text
);
