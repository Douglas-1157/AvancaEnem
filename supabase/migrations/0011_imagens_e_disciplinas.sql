-- 1) Artes e Educação Física viram duas disciplinas separadas.
--    O que já estava vinculado à disciplina antiga continua em "Artes".
update disciplinas set nome = 'Artes' where nome = 'Artes e Educação Física';
insert into disciplinas (nome, area, ordem) values ('Artes','linguagens',9), ('Educação Física','linguagens',10)
  on conflict (nome) do nothing;
update disciplinas set ordem = 11 where nome = 'Matemática';
update disciplinas set ordem = 12 where nome = 'Biologia';
update disciplinas set ordem = 13 where nome = 'Química';
update disciplinas set ordem = 14 where nome = 'Física';
update disciplinas set ordem = 15 where nome = 'Redação';

-- 2) Imagens nas questões (enunciado e comentário do gabarito).
alter table questoes add column if not exists imagem_url text;
alter table questoes add column if not exists comentario_imagem_url text;

-- Bucket público para leitura (as imagens têm nome aleatório); só a equipe envia.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('questoes','questoes', true, 5242880, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif'];

drop policy if exists questoes_ler on storage.objects;
create policy questoes_ler on storage.objects for select to authenticated using (bucket_id = 'questoes');
drop policy if exists questoes_enviar on storage.objects;
create policy questoes_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'questoes' and eh_equipe());
drop policy if exists questoes_apagar on storage.objects;
create policy questoes_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'questoes' and eh_equipe());

-- 3) As funções que entregam questões ao aluno passam a devolver as imagens.
drop function if exists questoes_da_tentativa(uuid);
create function questoes_da_tentativa(p_tentativa uuid)
returns table (questao_id uuid, ordem int, enunciado text, alternativas jsonb, competencia text, marcada smallint, imagem_url text)
language sql stable security definer set search_path = public as $$
  select q.id, sq.ordem, q.enunciado, q.alternativas, c.nome, r.marcada, q.imagem_url
  from tentativas t
  join simulado_questoes sq on sq.simulado_id = t.simulado_id
  join questoes q on q.id = sq.questao_id
  left join competencias c on c.id = q.competencia_id
  left join respostas r on r.tentativa_id = t.id and r.questao_id = q.id
  where t.id = p_tentativa and t.aluno_id = auth.uid() and t.finalizada_em is null
  order by sq.ordem
$$;
grant execute on function questoes_da_tentativa(uuid) to authenticated;

drop function if exists gabarito_da_tentativa(uuid);
create function gabarito_da_tentativa(p_tentativa uuid)
returns table (questao_id uuid, ordem int, enunciado text, alternativas jsonb, correta smallint, comentario text, marcada smallint, competencia text, imagem_url text, comentario_imagem_url text)
language sql stable security definer set search_path = public as $$
  select q.id, sq.ordem, q.enunciado, q.alternativas, q.correta, q.comentario, r.marcada, c.nome, q.imagem_url, q.comentario_imagem_url
  from tentativas t
  join simulado_questoes sq on sq.simulado_id = t.simulado_id
  join questoes q on q.id = sq.questao_id
  left join competencias c on c.id = q.competencia_id
  left join respostas r on r.tentativa_id = t.id and r.questao_id = q.id
  where t.id = p_tentativa and t.finalizada_em is not null
    and (t.aluno_id = auth.uid() or (eh_equipe() and pode_ver_aluno(t.aluno_id)))
  order by sq.ordem
$$;
grant execute on function gabarito_da_tentativa(uuid) to authenticated;
