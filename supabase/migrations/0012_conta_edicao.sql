-- Arquivar questões, foto de perfil.
alter table questoes add column if not exists arquivada boolean not null default false;
alter table profiles add column if not exists avatar_url text;

-- Fotos de perfil: bucket público, cada pessoa só mexe na própria pasta (nome da pasta = id do usuário).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares','avatares', true, 2097152, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/png','image/jpeg','image/webp'];

drop policy if exists avatares_ler on storage.objects;
create policy avatares_ler on storage.objects for select to authenticated using (bucket_id = 'avatares');
drop policy if exists avatares_enviar on storage.objects;
create policy avatares_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists avatares_apagar on storage.objects;
create policy avatares_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);
