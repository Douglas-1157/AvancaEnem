-- A foto de perfil foi retirada do sistema (menos dados pessoais e menos peso no banco).
-- Só precisa rodar quem já tinha rodado a versão antiga do 0012. Quem nunca rodou aquela versão pode ignorar.
drop policy if exists avatares_ler on storage.objects;
drop policy if exists avatares_enviar on storage.objects;
drop policy if exists avatares_apagar on storage.objects;
alter table profiles drop column if exists avatar_url;
-- Depois: no painel do Supabase, Storage > bucket "avatares" > Delete bucket (o SQL não permite apagar bucket).
