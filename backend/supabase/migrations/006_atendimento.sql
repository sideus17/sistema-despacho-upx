-- 006_atendimento.sql
-- Atendimento (etapa 4): horários de cada etapa (detectadas pelo GPS da viatura), hospital de destino
-- e desfecho. A viatura continua ligada ao chamado depois de finalizar (histórico).
-- Rodar uma vez no Supabase: SQL Editor → New query → colar → Run. Pode rodar de novo sem erro.
-- Só acrescenta: os chamados antigos ficam com os horários vazios.

-- Hospitais e prontos-socorros que recebem pacientes do SAMU em Sorocaba
create table if not exists public.hospitals (
  id text primary key,
  name text not null,
  short_name text not null,
  kind text not null check (kind in ('HOSPITAL', 'PRONTO_SOCORRO')),
  address text not null,
  lat double precision not null,
  lng double precision not null,
  notes text,
  active boolean not null default true
);

-- Como as outras tabelas: só o backend (service_role) lê e grava
alter table public.hospitals enable row level security;

-- Posições conferidas no mapa (TomTom e OpenStreetMap)
insert into public.hospitals (id, name, short_name, kind, address, lat, lng) values
  ('hosp-chs', 'Conjunto Hospitalar de Sorocaba', 'Conjunto Hospitalar', 'HOSPITAL',
   'Av. Comendador Pereira Inácio, 564 - Vila Lucy, Sorocaba/SP', -23.510985, -47.456791),
  ('hosp-regional', 'Hospital Regional de Sorocaba Dr. Adib Domingos Jatene', 'Hospital Regional', 'HOSPITAL',
   'Av. Dr. José Bella Netto - Parque Reserva Fazenda Imperial, Sorocaba/SP', -23.526805, -47.519075),
  ('hosp-santa-casa', 'Santa Casa de Misericórdia de Sorocaba', 'Santa Casa', 'HOSPITAL',
   'Av. São Paulo, 750 - Árvore Grande, Sorocaba/SP', -23.499675, -47.444440),
  ('hosp-santa-lucinda', 'Hospital Santa Lucinda', 'Santa Lucinda', 'HOSPITAL',
   'Rua Cláudio Manoel da Costa, 57 - Vila Boa Vista, Sorocaba/SP', -23.509397, -47.456018),
  ('hosp-unimed', 'Hospital Unimed Sorocaba Dr. Miguel Soeiro', 'Hospital Unimed', 'HOSPITAL',
   'Rua Antônia Dias Petri, 135 - Jardim Nova Manchester, Sorocaba/SP', -23.533220, -47.495345),
  ('ps-uph-norte', 'Unidade Pré-Hospitalar Zona Norte', 'UPH Zona Norte', 'PRONTO_SOCORRO',
   'Av. Itavuvu, 19 - Vila Diego, Sorocaba/SP', -23.483483, -47.472295),
  ('ps-uph-oeste', 'Unidade Pré-Hospitalar Zona Oeste', 'UPH Zona Oeste', 'PRONTO_SOCORRO',
   'Av. General Carneiro, 1670 - Cerrado, Sorocaba/SP', -23.506689, -47.483748),
  ('ps-upa-eden', 'UPA Éden Dr. Fernando Biazzi', 'UPA Éden', 'PRONTO_SOCORRO',
   'Rua Miguel José Gimenes, 75 - Jardim Porto Belo, Sorocaba/SP', -23.429184, -47.415699)
on conflict (id) do update set
  name = excluded.name,
  short_name = excluded.short_name,
  kind = excluded.kind,
  address = excluded.address,
  lat = excluded.lat,
  lng = excluded.lng;

-- Horários do atendimento. Despacho e fim são gravados pelas rotas; as etapas do meio, pelo GPS.
alter table public.calls
  add column if not exists dispatched_at timestamptz,
  add column if not exists dispatch_lat double precision,
  add column if not exists dispatch_lng double precision,
  add column if not exists en_route_at timestamptz,
  add column if not exists on_scene_at timestamptz,
  add column if not exists left_scene_at timestamptz,
  add column if not exists hospital_arrival_at timestamptz,
  add column if not exists finished_at timestamptz,
  add column if not exists hospital_id text,
  add column if not exists outcome text;

alter table public.calls
  drop constraint if exists calls_hospital_id_fkey,
  drop constraint if exists calls_outcome_check;

alter table public.calls
  add constraint calls_hospital_id_fkey foreign key (hospital_id) references public.hospitals (id) on delete set null,
  add constraint calls_outcome_check check (
    outcome is null or outcome in ('TRANSPORTADO', 'ATENDIDO_NO_LOCAL', 'RECUSA', 'OBITO', 'NAO_LOCALIZADO')
  );

-- Chamado ativo de cada viatura (a cada posição recebida) e histórico por viatura
create index if not exists calls_ambulance_status_idx on public.calls (ambulance_id, status) where ambulance_id is not null;

-- A API do Supabase passa a ver a tabela e as colunas novas na hora
notify pgrst, 'reload schema';
