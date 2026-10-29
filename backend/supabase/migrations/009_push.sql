-- 009_push.sql
-- Aviso do despacho para a equipe: as inscrições de notificação (Web Push) de cada celular e o "Ciente" da
-- equipe no chamado, para a central saber que o despacho foi visto.
-- Rodar uma vez no Supabase: SQL Editor → New query → colar → Run. Pode rodar de novo sem erro.
-- Só acrescenta: o backend anterior continua funcionando (ele não lê nada daqui).

-- Uma linha por aparelho inscrito. O endpoint é o endereço do serviço de push do navegador; p256dh e auth
-- são as chaves com que a mensagem é cifrada para aquele aparelho.
create table if not exists public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  last_success_at timestamptz
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- Como as outras tabelas: só o backend (service_role) lê e grava
alter table public.push_subscriptions enable row level security;

-- Quando a equipe tocou "Ciente" no despacho
alter table public.calls
  add column if not exists crew_seen_at timestamptz;

-- Auditoria: o "Ciente" da equipe entra na linha do tempo do chamado
alter table public.call_events
  drop constraint if exists call_events_action_check;

alter table public.call_events
  add constraint call_events_action_check check (
    action in ('ABERTURA', 'REGULACAO', 'DESPACHO', 'HOSPITAL', 'FINALIZACAO', 'CIENTE')
  );

-- A API do Supabase passa a ver a tabela e a coluna novas na hora
notify pgrst, 'reload schema';
