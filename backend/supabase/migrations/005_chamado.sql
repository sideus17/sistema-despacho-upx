-- 005_chamado.sql
-- Chamado mais completo (etapa 3): telefone de quem ligou, ponto de referência, sinais de alerta da triagem
-- e a classificação de risco em 4 cores (NAO_URGENTE = azul, casos só de orientação).
-- Rodar uma vez no Supabase: SQL Editor → New query → colar → Run. Pode rodar de novo sem erro.
-- Só acrescenta: as colunas novas podem ficar vazias e os chamados antigos continuam válidos.

alter table public.calls
  add column if not exists caller_phone text,
  add column if not exists reference_point text,
  add column if not exists triage jsonb;

alter table public.calls
  drop constraint if exists calls_priority_check,
  drop constraint if exists calls_status_check,
  drop constraint if exists calls_caller_phone_check,
  drop constraint if exists calls_reference_point_check;

alter table public.calls
  add constraint calls_priority_check check (priority in ('EMERGENCIA', 'URGENTE', 'PRIORITARIO', 'NAO_URGENTE')),
  add constraint calls_status_check check (status in ('PENDENTE', 'EM_ATENDIMENTO', 'FINALIZADO', 'CANCELADO')),
  add constraint calls_caller_phone_check check (caller_phone is null or caller_phone ~ '^[0-9]{10,11}$'),
  add constraint calls_reference_point_check check (reference_point is null or char_length(reference_point) <= 200);

-- Fila (mais antigos primeiro) e aviso de chamado repetido (mesmo telefone nas últimas horas)
create index if not exists calls_timestamp_idx on public.calls ("timestamp" desc);
create index if not exists calls_caller_phone_idx on public.calls (caller_phone) where caller_phone is not null;

-- A API do Supabase passa a ver as colunas novas na hora
notify pgrst, 'reload schema';
