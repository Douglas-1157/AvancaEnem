import { exigirPerfil } from '@/lib/sessao';
import { turmasVisiveis } from '@/lib/escopo';
import { criarQuestao, editarQuestao, arquivarQuestao, criarSimulado } from '@/lib/acoes/equipe';
import Link from 'next/link';
import { Banco } from './Banco';
import { Cab } from '@/components/Painel';

export const dynamic = 'force-dynamic';

export default async function BancoPage() {
  const { db, perfil } = await exigirPerfil();
  const [{ data: disc }, { data: comps }, { data: qs }, { data: turmas }, { data: mods }, { data: sims }] = await Promise.all([
    db.from('disciplinas').select('id,nome,area').order('ordem'),
    db.from('competencias').select('id,area,codigo,nome').order('area').order('codigo'),
    db.from('questoes').select('id,enunciado,disciplina_id,competencia_id,alternativas,correta,comentario,imagem_url,comentario_imagem_url,arquivada,competencias(codigo)').order('created_at', { ascending: false }),
    turmasVisiveis(db, perfil),
    db.from('modulos').select('id,nome,disciplina_id').order('ordem'),
    db.from('simulados').select('id,titulo,minutos,simulado_questoes(count),simulado_turmas(turmas(nome))').order('created_at', { ascending: false }),
  ]);
  return (
    <>
      <Cab titulo="Banco de questões" sub="Cadastre questões com gabarito comentado e monte simulados para as turmas."
        info={[['Questões', (qs ?? []).filter((q: any) => !q.arquivada).length], ['Simulados publicados', sims?.length ?? 0], ['Disciplinas', disc?.length ?? 0], ['Turmas', turmas?.length ?? 0]]} />
      <Banco padrao={perfil.disciplina_id ?? undefined} disciplinas={disc ?? []} competencias={comps ?? []} turmas={turmas ?? []} modulos={mods ?? []}
        questoes={(qs ?? []).map((q: any) => ({ id: q.id, enunciado: q.enunciado, disciplina_id: q.disciplina_id, n: q.alternativas.length, comp: q.competencias?.codigo ?? null, competencia_id: q.competencia_id, alternativas: q.alternativas, correta: q.correta, comentario: q.comentario, imagem_url: q.imagem_url, comentario_imagem_url: q.comentario_imagem_url, arquivada: !!q.arquivada }))}
        criarQuestao={criarQuestao} editarQuestao={editarQuestao} arquivarQuestao={arquivarQuestao} criarSimulado={criarSimulado} />
      <div className="card"><h2 className="h2" style={{ marginBottom: 6 }}>Simulados publicados</h2>
        <div className="list">{sims?.length ? sims.map((s: any) => <div key={s.id} className="li"><div className="tx"><b>{s.titulo}</b><small>{s.simulado_questoes?.[0]?.count ?? 0} questões · {s.minutos} min · {(s.simulado_turmas ?? []).map((t: any) => t.turmas?.nome).join(', ')}</small></div><Link className="btn sm" href={`/professor/simulado/${s.id}`}>Pré-visualizar</Link></div>) : <div className="empty">Nenhum simulado ainda.</div>}</div></div>
    </>
  );
}
