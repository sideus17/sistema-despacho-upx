-- seed.sql
-- Dados do banco local, recriados a cada npm run db:reset. Nada aqui vai para a produção.

-- Bases e viaturas de Sorocaba (copiadas do projeto hospedado), todas livres e sem motorista
insert into public.bases (id, name, lat, lng, address, capacity) values
  ('base-1', 'Base SAMU Central', -23.5015, -47.4526, 'Av. Comendador Pereira Inácio, 950 - Jardim Vergueiro, Sorocaba/SP', 8),
  ('base-2', 'Base SAMU Zona Norte', -23.4889, -47.4419, 'Rua Manoel Lopes, 234 - Vila Hortência, Sorocaba/SP', 6);

insert into public.ambulances (id, code, type, status, lat, lng, base_id, crew_driver, crew_medic, crew_nurse) values
  ('amb-1', 'USA-01', 'USA', 'DISPONIVEL', -23.5015, -47.4526, 'base-1', 'Carlos Silva', 'Dr. Ana Paula', 'Enf. Maria Santos'),
  ('amb-2', 'USB-01', 'USB', 'DISPONIVEL', -23.470748, -47.429614, 'base-1', 'João Pedro', 'Téc. Roberto Lima', null),
  ('amb-3', 'USB-02', 'USB', 'DISPONIVEL', -23.5105, -47.4683, 'base-2', 'Paulo Souza', 'Téc. Fernanda Costa', null),
  ('amb-4', 'MOTO-01', 'MOTOLANCIA', 'DISPONIVEL', -23.4967, -47.4581, 'base-2', 'Ricardo Alves', 'Téc. Lucas Martins', null);

-- Usuários de teste, já com o app autenticador (TOTP) cadastrado. Senha: samu-local
-- O segredo do TOTP é fixo: cadastre uma vez no app autenticador e ele vale depois de cada reset.
--   operador@samu.local   QEXMSYXBWYAJ6H4IYEFVDR7LPT2QHC5E
--   motorista@samu.local  KG7MTCZNIKS3IYLEUCXYYOIJ3S2M5TSC
-- CPF e celular são fictícios (só os dígitos verificadores batem).
create temporary table test_users (
  id uuid, email text, full_name text, role text, cpf text, phone text, totp_secret text
);

insert into test_users values
  ('c6727385-d17e-4c22-8019-c2c2fadaf06d', 'operador@samu.local', 'Operador de Teste', 'OPERADOR',
   '52998224725', '15991110001', 'QEXMSYXBWYAJ6H4IYEFVDR7LPT2QHC5E'),
  ('b3c16b3d-3099-498a-8c3b-d8ff46bf8aea', 'motorista@samu.local', 'Motorista de Teste', 'MOTORISTA',
   '39053344705', '15991110002', 'KG7MTCZNIKS3IYLEUCXYYOIJ3S2M5TSC');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  -- O Auth não aceita nulo nestes campos de texto
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
select
  '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
  extensions.crypt('samu-local', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}', jsonb_build_object('full_name', full_name), now(), now(),
  '', '', '', '', '', '', '', ''
from test_users;

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select id::text, id, jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), 'email', now(), now(), now()
from test_users;

insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, secret, created_at, updated_at)
select gen_random_uuid(), id, 'SAMU Despacho', 'totp', 'verified', totp_secret, now(), now()
from test_users;

insert into public.profiles (id, full_name, role, cpf, phone)
select id, full_name, role, cpf, phone
from test_users;

drop table test_users;
