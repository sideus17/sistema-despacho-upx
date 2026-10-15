-- 003_perfil.sql
-- Perfil completo: CPF, celular, CNH (motoristas), figura do avatar e tema.
-- Rodar uma vez no Supabase: SQL Editor → New query → colar → Run. Pode rodar de novo sem erro.

alter table public.profiles
  -- Só os dígitos
  add column if not exists cpf text,
  add column if not exists phone text,
  add column if not exists cnh_number text,
  add column if not exists cnh_category text,
  add column if not exists cnh_expires_on date,
  -- Figura e cor da bolinha do usuário (sem figura: iniciais)
  add column if not exists avatar text,
  add column if not exists avatar_color text,
  -- Tema escolhido (vale em qualquer aparelho)
  add column if not exists theme text not null default 'auto',
  add column if not exists updated_at timestamptz not null default now();

-- Regras de valores (recriadas a cada execução)
alter table public.profiles
  drop constraint if exists profiles_cpf_check,
  drop constraint if exists profiles_phone_check,
  drop constraint if exists profiles_cnh_number_check,
  drop constraint if exists profiles_cnh_category_check,
  drop constraint if exists profiles_avatar_check,
  drop constraint if exists profiles_avatar_color_check,
  drop constraint if exists profiles_theme_check;

alter table public.profiles
  add constraint profiles_cpf_check check (cpf ~ '^[0-9]{11}$'),
  add constraint profiles_phone_check check (phone ~ '^[1-9]{2}9[0-9]{8}$'),
  add constraint profiles_cnh_number_check check (cnh_number ~ '^[0-9]{11}$'),
  add constraint profiles_cnh_category_check check (cnh_category in ('A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE')),
  add constraint profiles_avatar_check check (avatar in ('medico', 'medica', 'enfermagem', 'socorrista', 'homem', 'mulher', 'pessoa')),
  add constraint profiles_avatar_color_check check (avatar_color in ('azul', 'verde', 'vermelho', 'laranja', 'roxo', 'turquesa', 'rosa', 'grafite')),
  add constraint profiles_theme_check check (theme in ('auto', 'day', 'night'));

-- Um CPF e uma CNH por conta (contas antigas, sem os dados, ficam com null e não conflitam)
create unique index if not exists profiles_cpf_key on public.profiles (cpf);
create unique index if not exists profiles_cnh_number_key on public.profiles (cnh_number);

-- O RLS continua ligado e sem políticas: só o backend (service_role) lê CPF, celular e CNH

-- A API do Supabase passa a enxergar as colunas novas na hora
notify pgrst, 'reload schema';
