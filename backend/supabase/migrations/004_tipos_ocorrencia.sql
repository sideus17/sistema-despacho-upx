-- 004_tipos_ocorrencia.sql
-- Novos tipos de relato das equipes (como no Waze): obras, congestionamento, perigo na pista,
-- veículo parado e semáforo quebrado.
-- Rodar uma vez no Supabase: SQL Editor → New query → colar → Run. Pode rodar de novo sem erro.
-- Atenção: rodar a 002 de novo volta a lista antiga de tipos; nesse caso, rode esta em seguida.

alter table public.incidents drop constraint if exists incidents_type_check;

alter table public.incidents
  add constraint incidents_type_check check (type in (
    'ALAGAMENTO', 'QUEDA_ARVORE', 'VIA_BLOQUEADA', 'ACIDENTE', 'VENTOS_FORTES', 'CHUVA_FORTE', 'ALERTA_OFICIAL',
    'OBRAS', 'CONGESTIONAMENTO', 'PERIGO_NA_VIA', 'VEICULO_PARADO', 'SEMAFORO_QUEBRADO'
  ));

-- A API do Supabase passa a aceitar os tipos novos na hora
notify pgrst, 'reload schema';
