import Link from 'next/link';
import { exigirPerfil } from '@/lib/sessao';
import { turmasVisiveis } from '@/lib/escopo';
import { riscoDe } from '@/lib/risco';
import { Av, Pb, fmtMin, saudacao, primeiroNome } from '@/components/ui';
import { Boas, Sugs, Atalhos } from '@/components/Painel';

export const dynamic = 'force-dynamic';

export default async function PainelTurmas({ searchParams }: { searchParams: Promise<{ turma?: string; f?: string }> }) {
  const sp = await searchParams;
  const { perfil, db } = await exigirPerfil();
  const [{ data: turmas }, { data: alunos }, { count: nRed }, { count: nDuv }, { count: nItens }, { count: nQ }] = await Promise.all([
    turmasVisiveis(db, perfil),
    db.from('painel_alunos').select('*'),
    db.from('redacoes').select('id', { count: 'exact', head: true }).eq('status', 'enviada'),
    db.from('duvidas').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
    db.from('itens').select('id', { count: 'exact', head: true }).eq('publicado', true),
    db.from('questoes').select('id', { count: 'exact', head: true }),
  ]);
  const todos = (alunos ?? []).map(a => ({ ...a, r: riscoDe(a.ultimo_estudo, a.min_semana, a.meta_semanal_min) }));
  const lista = todos.filter(a => !sp.turma || a.turma_id === sp.turma);
  const ordem: Record<string, number> = { bad: 0, warn: 1, ok: 2 };
  lista.sort((a, b) => ordem[a.r.nivel] - ordem[b.r.nivel] || a.nome.localeCompare(b.nome));
  const vis = lista.filter(a => !sp.f || a.r.nivel === sp.f);
  const med = lista.length ? Math.round(lista.reduce((s, a) => s + a.min_semana, 0) / lista.length) : 0;
  const cont = (n: string) => lista.filter(a => a.r.nivel === n).length;
  const q = (o: Record<string, string>) => '?' + new URLSearchParams({ ...(sp.turma ? { turma: sp.turma } : {}), ...o }).toString();
  const nr = nRed ?? 0, nd = nDuv ?? 0;
  return (
    <>
      <Boas nome={perfil.nome} saudacao={saudacao()} titulo={`${primeiroNome(perfil.nome)}, veja quem precisa de você`}
        chips={<><span className="pill">{turmas?.length ?? 0} turma{(turmas?.length ?? 0) === 1 ? '' : 's'}</span><span className={`pill ${nr + nd ? 'warn' : 'ok'}`}>{nr + nd ? `${nr + nd} pendência${nr + nd > 1 ? 's' : ''}` : 'Nada pendente'}</span></>}
        info={[['Alunos ativos', lista.length], ['Estudo médio na semana', fmtMin(med)], ['Em risco', cont('bad')], ['Pendências', nr + nd]]} />
      <Sugs titulo="Precisa da sua atenção" itens={[
        { href: '/professor/redacoes', cls: 's1', ic: 'file', rot: 'Redações', tit: nr ? `${nr} para corrigir` : 'Nenhuma para corrigir', meta: 'Corrija por competência' },
        { href: '/professor/duvidas', cls: 's2', ic: 'chat', rot: 'Dúvidas', tit: nd ? `${nd} sem resposta` : 'Sem dúvidas abertas', meta: 'Responda direto da fila' },
        { href: q({ f: 'bad' }), cls: 's3', ic: 'users', rot: 'Alunos em risco', tit: cont('bad') ? `${cont('bad')} aluno${cont('bad') > 1 ? 's' : ''} sem estudar` : 'Todos no ritmo', meta: 'Veja quem parou de estudar' },
      ]} />
      <Atalhos titulo="Suas ferramentas" itens={[
        { href: '/professor/conteudo', ic: 'folder', t: 'Conteúdo', d: `${nItens ?? 0} publicado${nItens === 1 ? '' : 's'}` },
        { href: '/professor/banco', ic: 'bank', t: 'Questões', d: `${nQ ?? 0} no banco` },
        { href: '/professor/redacoes', ic: 'file', t: 'Redações', d: 'Corrigir e comentar', n: nr },
        { href: '/professor/duvidas', ic: 'chat', t: 'Dúvidas', d: 'Responder alunos', n: nd },
      ]} />
      <div className="cols">
        <div className="stack">
          <div className="card">
            <div className="row sb"><h2 className="h2">Alunos</h2><span className="sub" style={{ fontSize: 13 }}>{vis.length} de {lista.length}</span></div>
            <div className="tabs" role="tablist" style={{ marginTop: 10 }}><Link className={!sp.turma ? 'on' : ''} href="/professor">Todas as turmas</Link>{turmas?.map(t => <Link key={t.id} className={sp.turma === t.id ? 'on' : ''} href={`?turma=${t.id}`}>{t.nome}</Link>)}</div>
            <div className="tabs" role="tablist" style={{ marginTop: 8 }}>{[['', 'Todos', lista.length], ['bad', 'Em risco', cont('bad')], ['warn', 'Atenção', cont('warn')], ['ok', 'No ritmo', cont('ok')]].map(([k, l, n]) => <Link key={k as string} className={(sp.f ?? '') === k ? 'on' : ''} href={k ? q({ f: k as string }) : q({})}>{l} · {n}</Link>)}</div>
            <div className="list" style={{ marginTop: 6 }}>{vis.length ? vis.map(a => (
              <Link key={a.id} href={`/professor/aluno/${a.id}`} className="li"><Av nome={a.nome} sm /><div className="tx"><b>{a.nome}</b><small>{a.r.motivo} · {fmtMin(a.min_semana)} na semana{a.media != null ? ` · média ${a.media}` : ''}</small></div>
                <div style={{ width: 90 }}><Pb p={(a.min_semana / a.meta_semanal_min) * 100} cls={a.r.nivel === 'ok' ? 'ok' : ''} /></div><span className={`pill ${a.r.nivel}`}>{a.r.rotulo}</span></Link>))
              : <div className="empty">Nenhum aluno por aqui.</div>}</div>
          </div>
        </div>
        <div className="stack">
          <div className="card">
            <h2 className="h2">Ritmo da turma</h2>
            {lista.length === 0 ? <div className="empty">Sem alunos para mostrar.</div> : (
              <div style={{ marginTop: 10 }}>{([['ok', 'No ritmo'], ['warn', 'Atenção'], ['bad', 'Em risco']] as const).map(([k, l]) => (
                <div key={k} className="perf"><span>{l}</span><Pb p={(cont(k) / lista.length) * 100} cls={k === 'ok' ? 'ok' : ''} /><span className={`pill ${k}`}>{cont(k)}</span></div>))}</div>
            )}
            <p className="sub" style={{ marginTop: 12, fontSize: 13 }}>Em risco = 7 dias ou mais sem estudar. Atenção = 3 dias ou mais, ou pouco estudo na semana.</p>
          </div>
          <div className="card">
            <h2 className="h2">Adesão por turma</h2>
            <div className="list" style={{ marginTop: 6 }}>{turmas?.length ? turmas.map(t => {
              const l = todos.filter(a => a.turma_id === t.id), p = l.length ? Math.round((l.filter(a => a.min_semana >= a.meta_semanal_min / 2).length / l.length) * 100) : 0;
              return <div key={t.id} className="li" style={{ padding: '10px 0' }}><div className="tx"><b>{t.nome}</b><small>{l.length} alunos</small><Pb p={p} /></div><b className="num">{p}%</b></div>;
            }) : <div className="empty">Nenhuma turma vinculada a você. Peça à gestão para vincular.</div>}</div>
            <p className="sub" style={{ marginTop: 8, fontSize: 13 }}>Alunos que bateram ao menos metade da meta semanal.</p>
          </div>
        </div>
      </div>
    </>
  );
}
