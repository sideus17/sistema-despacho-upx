-- 010_foto_perfil.sql
-- Foto do perfil: a figura do avatar (médico, enfermagem...) dá lugar a uma foto enviada pela própria pessoa.
-- Sem foto, o avatar continua com as iniciais na cor escolhida.
-- Rodar uma vez no Supabase: SQL Editor → New query → colar → Run. Pode rodar de novo sem erro.
-- Só acrescenta: a coluna antiga avatar fica no banco, sem uso.

alter table public.profiles add column if not exists avatar_photo text;

-- O perfil guarda só o caminho no bucket (<id>/<arquivo>.webp); o app monta o endereço público.
-- Bucket público: a foto aparece no menu da conta, no mapa e na Frota sem pedir login a cada imagem.
-- O app recorta e envia em WebP de 256 px (poucos KB); o limite de 1 MB é só uma trava.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Cada pessoa só lista, grava, troca e apaga na própria pasta (avatars/<id da pessoa>/...). A leitura da
-- imagem pelo endereço público não passa por aqui; o select é o que o Storage exige para trocar e apagar.
drop policy if exists "avatars: ver a propria pasta" on storage.objects;
create policy "avatars: ver a propria pasta" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars: enviar na propria pasta" on storage.objects;
create policy "avatars: enviar na propria pasta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars: trocar na propria pasta" on storage.objects;
create policy "avatars: trocar na propria pasta" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars: apagar da propria pasta" on storage.objects;
create policy "avatars: apagar da propria pasta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
