-- 007_gestao.sql
-- Gestão (etapa 5): marca os chamados do histórico de demonstração (npm run demo:gerar), que a tela de
-- gestão pode incluir ou não e que ficam fora do aviso de chamado repetido. Índice para o histórico.
-- Rodar uma vez no Supabase: SQL Editor → New query → colar → Run. Pode rodar de novo sem erro.
-- Só acrescenta: os chamados que já existem são reais (demo = false).

alter table public.calls
  add column if not exists demo boolean not null default false;

-- Histórico e indicadores: período (mais novos primeiro), com ou sem a demonstração
create index if not exists calls_demo_timestamp_idx on public.calls (demo, "timestamp" desc);

-- A API do Supabase passa a ver a coluna nova na hora
notify pgrst, 'reload schema';
