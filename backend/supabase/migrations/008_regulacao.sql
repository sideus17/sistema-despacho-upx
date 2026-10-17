-- 008_regulacao.sql
-- Regulação e auditoria (etapa 6): o chamado passa por "aguardando regulação" antes do despacho, pode ser
-- encerrado sem viatura (orientação por telefone) ou cancelado com motivo, e cada ação fica registrada com
-- quem fez, quando e o que mudou. "PENDENTE" continua sendo "aguardando despacho".
-- Rodar uma vez no Supabase: SQL Editor → New query → colar → Run. Pode rodar de novo sem erro.
-- Só acrescenta: os chamados antigos ficam sem autor e o backend anterior continua funcionando.
-- Atenção: rodar a 005 de novo volta a lista antiga de status; nesse caso, rode esta de novo.

-- Quem fez cada passo (cópia nos chamados para os indicadores saírem de uma consulta só).
-- Sem chave estrangeira nos autores de propósito: o histórico continua se a conta for apagada e a
-- demonstração usa pessoas fictícias.
alter table public.calls
  add column if not exists initial_priority text,
  add column if not exists created_by uuid,
  add column if not exists regulated_at timestamptz,
  add column if not exists regulated_by uuid,
  add column if not exists dispatched_by uuid,
  add column if not exists driver_id uuid,
  add column if not exists close_reason text,
  add column if not exists close_note text;

alter table public.calls
  drop constraint if exists calls_status_check,
  drop constraint if exists calls_initial_priority_check,
  drop constraint if exists calls_close_reason_check,
  drop constraint if exists calls_close_note_check;

alter table public.calls
  add constraint calls_status_check check (
    status in ('AGUARDANDO_REGULACAO', 'PENDENTE', 'EM_ATENDIMENTO', 'FINALIZADO', 'ORIENTADO', 'CANCELADO')
  ),
  add constraint calls_initial_priority_check check (
    initial_priority is null or initial_priority in ('EMERGENCIA', 'URGENTE', 'PRIORITARIO', 'NAO_URGENTE')
  ),
  add constraint calls_close_reason_check check (
    close_reason is null or close_reason in ('TROTE', 'REPETIDO', 'ENGANO', 'DESISTENCIA', 'OUTRO')
  ),
  add constraint calls_close_note_check check (close_note is null or char_length(close_note) <= 500);

-- Filas da central (regulação, despacho e em atendimento)
create index if not exists calls_open_idx on public.calls (status)
  where status in ('AGUARDANDO_REGULACAO', 'PENDENTE', 'EM_ATENDIMENTO');

-- Auditoria: uma linha por ação de uma pessoa no chamado. As etapas do GPS ficam nos horários do chamado.
create table if not exists public.call_events (
  id bigint generated always as identity primary key,
  call_id text not null references public.calls (id) on delete cascade,
  at timestamptz not null default now(),
  action text not null check (action in ('ABERTURA', 'REGULACAO', 'DESPACHO', 'HOSPITAL', 'FINALIZACAO')),
  actor_id uuid,
  actor_name text not null,
  actor_role text not null check (actor_role in ('OPERADOR', 'MOTORISTA')),
  data jsonb not null default '{}'::jsonb
);

create index if not exists call_events_call_idx on public.call_events (call_id, at);

-- Como as outras tabelas: só o backend (service_role) lê e grava
alter table public.call_events enable row level security;

-- A API do Supabase passa a ver a tabela e as colunas novas na hora
notify pgrst, 'reload schema';
