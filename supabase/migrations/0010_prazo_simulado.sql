-- O tempo do simulado passa a valer também no servidor: respostas enviadas depois do prazo
-- (com 3 minutos de tolerância para fila de respostas feitas sem internet) são recusadas.
create or replace function responder_questao(p_tentativa uuid, p_questao uuid, p_marcada smallint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from tentativas t
      join simulados s on s.id = t.simulado_id
      join simulado_questoes sq on sq.simulado_id = t.simulado_id and sq.questao_id = p_questao
    where t.id = p_tentativa and t.aluno_id = auth.uid() and t.finalizada_em is null) then
    raise exception 'Tentativa inválida ou já finalizada.';
  end if;
  if exists (
    select 1 from tentativas t join simulados s on s.id = t.simulado_id
    where t.id = p_tentativa and now() > t.iniciada_em + make_interval(mins => s.minutos) + interval '3 minutes') then
    raise exception 'O tempo do simulado acabou. Entregue a prova para ver o resultado.';
  end if;
  insert into respostas (tentativa_id, questao_id, marcada) values (p_tentativa, p_questao, p_marcada)
  on conflict (tentativa_id, questao_id) do update set marcada = excluded.marcada;
end $$;
