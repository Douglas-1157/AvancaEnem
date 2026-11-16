import Link from 'next/link';
import { exigirPerfil } from '@/lib/sessao';
import { carregarTrilhas } from '@/lib/trilha';
import { Icon } from '@/components/Icon';
import { LinhaItem } from '@/components/Linha';
import { Cab } from '@/components/Painel';

export const dynamic = 'force-dynamic';
const ABAS = [['aulas', 'Aulas e apostilas'], ['cursos', 'Cursos gratuitos'], ['repertorio', 'Conhecimento de mundo']] as const;

export default async function Biblioteca({ searchParams }: { searchParams: Promise<{ aba?: string; d?: string; c?: string }> }) {
  const sp = await searchParams; const aba = ABAS.find(a => a[0] === sp.aba)?.[0] ?? 'aulas';
  const { perfil, db } = await exigirPerfil('aluno');
  const { disciplinas } = await carregarTrilhas(db, perfil);
  const { data: recursos } = await db.from('recursos').select('*').eq('tipo', aba === 'cursos' ? 'curso' : 'repertorio').order('categoria').order('titulo');
  const cats = [...new Set((recursos ?? []).map(r => r.categoria))];
  const q = (o: Record<string, string>) => '?' + new URLSearchParams({ aba, ...o }).toString();
  const disc = disciplinas.filter(d => !sp.d || d.nome === sp.d);
  const rec = (recursos ?? []).filter(r => !sp.c || r.categoria === sp.c);
  return (
    <>
      <Cab titulo="Biblioteca" sub="Aulas, apostilas, cursos gratuitos e repertório para a redação."
        info={[['Aulas e apostilas', disciplinas.flatMap(d => d.itens.filter(i => i.tipo !== 'sim')).length], [aba === 'cursos' ? 'Cursos gratuitos' : aba === 'repertorio' ? 'Itens de repertório' : 'Disciplinas', aba === 'aulas' ? disciplinas.length : (recursos ?? []).length]]} />
      <div className="tabs" role="tablist">{ABAS.map(a => <Link key={a[0]} role="tab" className={aba === a[0] ? 'on' : ''} href={`?aba=${a[0]}`}>{a[1]}</Link>)}</div>
      {aba === 'aulas' ? (
        <>
          <div className="chips"><Link className={`chip${!sp.d ? ' on' : ''}`} href="?aba=aulas">Todas</Link>{disciplinas.map(d => <Link key={d.id} className={`chip${sp.d === d.nome ? ' on' : ''}`} href={q({ d: d.nome })}>{d.nome}</Link>)}</div>
          <div className="card">{disc.some(d => d.itens.some(i => i.tipo !== 'sim'))
            ? <div className="list">{disc.flatMap(d => d.itens.filter(i => i.tipo !== 'sim').map(i => <LinhaItem key={i.id} it={i} disc={d} quieto />))}</div>
            : <div className="empty">Nenhuma aula publicada para a sua turma ainda.</div>}</div>
        </>
      ) : (
        <>
          {cats.length > 1 && <div className="chips"><Link className={`chip${!sp.c ? ' on' : ''}`} href={`?aba=${aba}`}>Todas</Link>{cats.map(c => <Link key={c} className={`chip${sp.c === c ? ' on' : ''}`} href={q({ c })}>{c}</Link>)}</div>}
          {rec.length ? <div className="cg">{rec.map(r => (
            <div key={r.id} className="sc"><div className="sc-top"><span className="sc-i"><Icon n="globe" s={20} /></span><span className="pill">{r.categoria}</span></div>
              <b>{r.titulo}</b><span className="sc-m">{[r.carga, r.descricao].filter(Boolean).join(' · ') || 'Indicado pela equipe'}</span>
              <a className="btn pri" href={r.url} target="_blank" rel="noreferrer">Acessar <Icon n="arrow" s={14} /></a></div>))}</div>
            : <div className="card"><div className="empty">A equipe ainda não indicou itens aqui.</div></div>}
        </>
      )}
    </>
  );
}
