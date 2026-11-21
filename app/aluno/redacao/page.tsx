import Link from 'next/link';
import { exigirPerfil } from '@/lib/sessao';
import { Icon } from '@/components/Icon';
import { fmtPrazo } from '@/components/ui';
import { Cab } from '@/components/Painel';

export const dynamic = 'force-dynamic';
const ROTULO: Record<string, [string, string]> = { rascunho: ['Rascunho', 'wip'], enviada: ['Aguardando correção', 'warn'], corrigida: ['Corrigida', 'ok'] };

export default async function Redacao() {
  const { perfil, db } = await exigirPerfil('aluno');
  const [{ data: temas }, { data: reds }] = await Promise.all([
    db.from('redacao_temas').select('id,titulo,prazo').order('created_at', { ascending: false }),
    db.from('redacoes').select('tema_id,status,nota').eq('aluno_id', perfil.id),
  ]);
  const por = new Map((reds ?? []).map(r => [r.tema_id, r]));
  const med = (reds ?? []).filter(r => r.status === 'corrigida');
  const media = med.length ? Math.round(med.reduce((a, r) => a + (r.nota ?? 0), 0) / med.length) : null;
  return (
    <>
      <Cab titulo="Redação" sub="Escreva sobre os temas propostos. O professor corrige com as 5 competências do ENEM e deixa comentários."
        info={[['Temas liberados', temas?.length ?? 0], ['Enviadas', (reds ?? []).filter(r => r.status !== 'rascunho').length], ['Corrigidas', med.length], ['Média', media === null ? '—' : media]]} />
      <div className="cols">
        <div><h2 className="h2 sec">Temas</h2>
          {temas?.length ? <div className="cg">{temas.map(t => { const r = por.get(t.id); const [rot, tom] = r ? ROTULO[r.status] : ['Não iniciada', '']; return (
            <div key={t.id} className="sc"><div className="sc-top"><span className="sc-i"><Icon n="file" s={20} /></span><span className={`pill ${tom}`}>{rot}{r?.status === 'corrigida' ? ` · ${r.nota}` : ''}</span></div>
              <b>{t.titulo}</b><span className="sc-m">{t.prazo ? `Prazo: ${fmtPrazo(t.prazo)}` : 'Sem prazo'}</span>
              <Link className={`btn${!r ? ' pri' : ''}`} href={`/aluno/redacao/${t.id}`}>{!r ? 'Escrever' : r.status === 'rascunho' ? 'Continuar' : 'Abrir'}</Link></div>); })}</div>
            : <div className="card"><div className="empty">Nenhum tema liberado para a sua turma ainda.</div></div>}</div>
        <div className="stack">
          <div className="card"><h2 className="h2">Suas notas</h2>
            {med.length ? <div className="list" style={{ marginTop: 6 }}>{med.map(r => <div key={r.tema_id} className="li"><div className="tx">{temas?.find(t => t.id === r.tema_id)?.titulo}</div><b className="mono">{r.nota}</b></div>)}</div> : <div className="empty" style={{ marginTop: 8 }}>Suas redações corrigidas aparecem aqui.</div>}</div>
          <div className="note">Cada competência vale de 0 a 200 pontos, total de 0 a 1000.</div>
        </div>
      </div>
    </>
  );
}
