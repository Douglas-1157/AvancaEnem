import Link from 'next/link';
import { notFound } from 'next/navigation';
import { exigirPerfil } from '@/lib/sessao';
import { Cab } from '@/components/Painel';

export const dynamic = 'force-dynamic';
const L = 'ABCDEF';

// Pré-visualização: o professor vê o simulado como o aluno veria. Nada é registrado.
export default async function PreVisualizar({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ gabarito?: string }> }) {
  const { id } = await params; const sp = await searchParams;
  const { db } = await exigirPerfil();
  const mostrar = sp.gabarito === '1';
  const [{ data: s }, { data: sq }] = await Promise.all([
    db.from('simulados').select('id,titulo,minutos').eq('id', id).maybeSingle(),
    db.from('simulado_questoes').select('ordem,questoes(id,enunciado,alternativas,correta,comentario,imagem_url,comentario_imagem_url,competencias(nome))').eq('simulado_id', id).order('ordem'),
  ]);
  if (!s) notFound();
  const qs = (sq ?? []).map((x: any) => x.questoes).filter(Boolean);
  return (
    <>
      <Cab titulo={s.titulo} sub="Pré-visualização: é assim que o aluno vê a prova. Nada é salvo."
        info={[['Questões', qs.length], ['Tempo total', `${s.minutos} min`], ['Por questão', qs.length ? `${(s.minutos / qs.length).toFixed(1).replace('.', ',')} min` : '—']]}
        acao={<div className="row"><Link scroll={false} className="btn" href={mostrar ? `/professor/simulado/${id}` : `/professor/simulado/${id}?gabarito=1`}>{mostrar ? 'Esconder gabarito' : 'Mostrar gabarito'}</Link><Link className="btn pri" href="/professor/banco">Voltar ao banco</Link></div>} />
      <div className="stack">
        {qs.map((q: any, i: number) => (
          <div key={q.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="row sb"><span className="sub num">Questão {i + 1} de {qs.length}</span>{q.competencias?.nome && <span className="pill">{q.competencias.nome}</span>}</div>
            <p style={{ fontSize: 17, textWrap: 'pretty', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{q.enunciado}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {q.imagem_url && <img className="qimg" src={q.imagem_url} alt="Imagem da questão" />}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(q.alternativas as string[]).map((o, k) => (
                <div key={k} className={`alt${mostrar && k === q.correta ? ' right' : ''}`}><span className="lt">{L[k]}</span><span>{o}{mostrar && k === q.correta && <b> (correta)</b>}</span></div>))}
            </div>
            {mostrar && (q.comentario || q.comentario_imagem_url) && (
              <div className="note">{q.comentario && <p><b>Por quê:</b> {q.comentario}</p>}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {q.comentario_imagem_url && <img className="qimg" src={q.comentario_imagem_url} alt="Imagem do comentário" />}</div>)}
          </div>
        ))}
        {!qs.length && <div className="card"><div className="empty">Este simulado ainda não tem questões.</div></div>}
      </div>
    </>
  );
}
