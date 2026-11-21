-- Tempo de estudo pelo tempo realmente gasto (e não pela duração cadastrada).
-- 1) Aula/apostila: ao concluir, o app envia os segundos em que a pessoa ficou na tela; o banco soma
--    esse tempo (limitado à duração cadastrada do item). Menos de 30 s não soma nada.
-- 2) Simulado: ao finalizar, soma o tempo entre iniciar e finalizar (limitado ao tempo do simulado).

drop function if exists registrar_progresso(uuid, smallint);
create or replace function registrar_progresso(p_item uuid, p_pct smallint, p_segundos int default null) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); mins int; ja timestamptz; seg int; cred int;
begin
  if papel_atual() is distinct from 'aluno' then raise exception 'Apenas alunos registram progresso.'; end if;
  if not exists (select 1 from itens i join item_turmas it on it.item_id = i.id
                 where i.id = p_item and i.publicado and i.tipo <> 'sim' and it.turma_id = turma_atual()) then
    raise exception 'Item não disponível.';
  end if;
  if not item_liberado(uid, p_item) then raise exception 'Etapa ainda bloqueada.'; end if;
  select concluido_em into ja from progresso where aluno_id = uid and item_id = p_item;
  insert into progresso (aluno_id, item_id, pct, concluido_em)
  values (uid, p_item, least(100, greatest(0, p_pct)), case when p_pct >= 100 then now() end)
  on conflict (aluno_id, item_id) do update
    set pct = greatest(progresso.pct, excluded.pct),
        concluido_em = coalesce(progresso.concluido_em, excluded.concluido_em),
        atualizado_em = now();
  if p_pct >= 100 and ja is null then
    select minutos into mins from itens where id = p_item;
    seg := greatest(0, least(coalesce(p_segundos, 0), 36000));
    cred := least(coalesce(mins, 10), 600, ceil(seg / 60.0)::int);
    if seg >= 30 and cred >= 1 then
      insert into sessoes_estudo (aluno_id, minutos, origem) values (uid, cred, 'conteudo');
    end if;
  end if;
end $$;
revoke all on function registrar_progresso(uuid, smallint, int) from public, anon;
grant execute on function registrar_progresso(uuid, smallint, int) to authenticated;

create or replace function finalizar_tentativa(p_tentativa uuid) returns int
language plpgsql security definer set search_path = public as $$
declare t tentativas; v_nota numeric; v_ac int; v_tot int; it uuid; v_lim int; v_seg numeric; v_min int;
begin
  select * into t from tentativas where id = p_tentativa and aluno_id = auth.uid();
  if t.id is null then raise exception 'Tentativa não encontrada.'; end if;
  if t.finalizada_em is not null then return t.nota; end if;

  with q as (
    select sq.questao_id, coalesce(c.id, '00000000-0000-0000-0000-000000000000'::uuid) as cid,
           coalesce(c.peso, 1) as peso, (r.marcada is not distinct from qq.correta) as acertou
    from simulado_questoes sq join questoes qq on qq.id = sq.questao_id
    left join competencias c on c.id = qq.competencia_id
    left join respostas r on r.tentativa_id = t.id and r.questao_id = sq.questao_id
    where sq.simulado_id = t.simulado_id),
  g as (select cid, max(peso) as peso, count(*) as tot, count(*) filter (where acertou) as ac from q group by cid)
  select (select sum(peso * ac::numeric / tot) / nullif(sum(peso),0) from g) * 1000,
         (select coalesce(sum(ac),0) from g), (select coalesce(sum(tot),0) from g)
    into v_nota, v_ac, v_tot;

  update tentativas set finalizada_em = now(), nota = round(coalesce(v_nota,0)), acertos = v_ac, total = v_tot
   where id = t.id;

  if not t.treino then
    select i.id into it from itens i where i.simulado_id = t.simulado_id and i.publicado limit 1;
    if it is not null then
      insert into progresso (aluno_id, item_id, pct, concluido_em) values (t.aluno_id, it, 100, now())
      on conflict (aluno_id, item_id) do update set pct = 100, concluido_em = coalesce(progresso.concluido_em, now()), atualizado_em = now();
    end if;
  end if;

  -- tempo de estudo = tempo gasto no simulado (oficial ou treino), no máximo o tempo do simulado
  select s.minutos into v_lim from simulados s where s.id = t.simulado_id;
  v_seg := extract(epoch from (now() - t.iniciada_em));
  v_min := least(coalesce(v_lim, 600), 600, ceil(v_seg / 60.0)::int);
  if v_seg >= 30 and v_min >= 1 then
    insert into sessoes_estudo (aluno_id, minutos, origem) values (t.aluno_id, v_min, 'simulado');
  end if;
  return round(coalesce(v_nota,0))::int;
end $$;
