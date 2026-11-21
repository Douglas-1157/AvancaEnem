import Link from 'next/link';
import { exigirPerfil } from '@/lib/sessao';
import { Av } from '@/components/ui';
import { Cab } from '@/components/Painel';
import { Acao } from '@/components/Form';
import { Busca, Paginacao } from '@/components/Filtros';
import { turmasVisiveis } from '@/lib/escopo';
import { POR_PAGINA, likeSeguro, pag, qs } from '@/lib/consulta';
import { apagarSalva, responderDuvida } from '@/lib/acoes/equipe';
import { Resposta } from './Resposta';

export const dynamic = 'force-dynamic';

export default async function Duvidas({ searchParams }: { searchParams: Promise<{ aba?: string; id?: string; q?: string; turma?: string; p?: string }> }) {
  const sp = await searchParams; const aba = sp.aba === 'resp' ? 'respondida' : 'pendente';
  const abaUrl = aba === 'respondida' ? 'resp' : 'pend';
  const busca = (sp.q ?? '').trim().slice(0, 80);
  const pagina = pag(sp.p), de = (pagina - 1) * POR_PAGINA;
  const { perfil, db } = await exigirPerfil();
  const { data: turmas } = await turmasVisiveis(db, perfil);
  const turma = (turmas ?? []).some(t => t.id === sp.turma) ? sp.turma : undefined;
  let consulta = db.from('duvidas').select('*,profiles!duvidas_aluno_id_fkey!inner(nome,turma_id)', { count: 'exact' }).eq('status', aba);
  if (busca) consulta = consulta.ilike('profiles.nome', `%${likeSeguro(busca)}%`);
  if (turma) consulta = consulta.eq('profiles.turma_id', turma);
  const [{ data: lista, count: nLista }, { data: salvas }] = await Promise.all([
    consulta.order('created_at', { ascending: aba === 'pendente' }).range(de, de + POR_PAGINA - 1),
    db.from('respostas_salvas').select('id,texto').eq('professor_id', perfil.id),
  ]);
  const [{ count: nPend }, { count: nResp }] = await Promise.all([
    db.from('duvidas').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
    db.from('duvidas').select('id', { count: 'exact', head: true }).eq('status', 'respondida'),
  ]);
  const sel = (lista ?? []).find((d: any) => d.id === sp.id) ?? lista?.[0];
  const filtros = { aba: abaUrl === 'resp' ? 'resp' : undefined, turma };
  return (
    <>
      <Cab titulo="Dúvidas" sub="Responda os alunos. Respostas que você repete podem ser salvas."
        info={[['Sem resposta', nPend ?? 0], ['Respondidas', nResp ?? 0], ['Respostas salvas', salvas?.length ?? 0]]} />
      <div className="tabs" role="tablist"><Link scroll={false} className={aba === 'pendente' ? 'on' : ''} href="?">Pendentes</Link><Link scroll={false} className={aba === 'respondida' ? 'on' : ''} href="?aba=resp">Respondidas</Link></div>
      <Busca base="/professor/duvidas" params={{ aba: filtros.aba }} q={busca} turma={turma} turmas={turmas ?? undefined} placeholder="Buscar dúvidas por aluno" />
      <div className="cols">
        <div className="card"><div className="list">{lista?.length ? lista.map((d: any) => (
          <Link scroll={false} key={d.id} href={qs({ aba: abaUrl, id: d.id, q: busca || undefined, turma, p: pagina > 1 ? String(pagina) : undefined })} className="li" style={sel?.id === d.id ? { background: 'var(--accent-soft)' } : undefined}>
            <Av nome={d.profiles?.nome ?? '?'} sm /><div className="tx"><b>{d.profiles?.nome}</b><small>{d.contexto ?? 'Sem vínculo'}</small><small className="trunc">{d.mensagem}</small></div></Link>)) : <div className="empty">{busca || turma ? 'Nenhuma dúvida com esse filtro.' : aba === 'pendente' ? 'Nenhuma dúvida pendente. 🎉' : 'Nenhuma resposta ainda.'}</div>}</div>
          <Paginacao pagina={pagina} total={nLista ?? 0} base="/professor/duvidas" params={{ aba: filtros.aba, turma, q: busca || undefined }} /></div>
        {sel && (
          <div className="card" key={sel.id}>
            <div className="row sb"><b>{(sel as any).profiles?.nome}</b><span className="sub" style={{ fontSize: 13 }}>{new Date(sel.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
            <p className="sub" style={{ fontSize: 13, margin: '4px 0 10px' }}>{sel.contexto ?? 'Sem vínculo'}</p>
            <p style={{ whiteSpace: 'pre-wrap' }}>{sel.mensagem}</p>
            {sel.status === 'respondida' ? <p className="note" style={{ marginTop: 14, whiteSpace: 'pre-wrap' }}><b>Sua resposta:</b> {sel.resposta}</p>
              : <Resposta id={sel.id} action={responderDuvida} salvas={salvas ?? []} />}
            {sel.status === 'pendente' && salvas?.length ? <div style={{ marginTop: 10 }}>{salvas.map(s => <span key={s.id} style={{ display: 'none' }} />)}</div> : null}
          </div>
        )}
      </div>
      {salvas?.length ? <div className="card"><h2 className="h2" style={{ marginBottom: 6 }}>Respostas salvas</h2><div className="list">{salvas.map(s => <div key={s.id} className="li"><div className="tx">{s.texto}</div><Acao className="btn sm ghost" action={apagarSalva.bind(null, s.id) as any}>Remover</Acao></div>)}</div></div> : null}
    </>
  );
}
