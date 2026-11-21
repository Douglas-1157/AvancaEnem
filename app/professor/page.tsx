import { exigirPerfil } from '@/lib/sessao';
import { turmasVisiveis } from '@/lib/escopo';
import { fmtMin, saudacao, primeiroNome } from '@/components/ui';
import { Acompanhar, resumo } from '@/components/Acompanhar';
import { qs } from '@/lib/consulta';
import { Boas, Sugs, Atalhos } from '@/components/Painel';

export const dynamic = 'force-dynamic';

export default async function PainelTurmas({ searchParams }: { searchParams: Promise<{ turma?: string; f?: string; q?: string; p?: string }> }) {
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
  const { lista, med, cont } = resumo(alunos, sp.turma);
  const nr = nRed ?? 0, nd = nDuv ?? 0;
  return (
    <>
      <Boas nome={perfil.nome} saudacao={saudacao()} titulo={`${primeiroNome(perfil.nome)}, veja quem precisa de você`}
        chips={<><span className="pill">{turmas?.length ?? 0} turma{(turmas?.length ?? 0) === 1 ? '' : 's'}</span><span className={`pill ${nr + nd ? 'warn' : 'ok'}`}>{nr + nd ? `${nr + nd} pendência${nr + nd > 1 ? 's' : ''}` : 'Nada pendente'}</span></>}
        info={[['Alunos ativos', lista.length], ['Estudo médio na semana', fmtMin(med)], ['Em risco', cont('bad')], ['Pendências', nr + nd]]} />
      <Sugs titulo="Precisa da sua atenção" itens={[
        { href: '/professor/redacoes', cls: 's1', ic: 'file', rot: 'Redações', tit: nr ? `${nr} para corrigir` : 'Nenhuma para corrigir', meta: 'Corrija por competência' },
        { href: '/professor/duvidas', cls: 's2', ic: 'chat', rot: 'Dúvidas', tit: nd ? `${nd} sem resposta` : 'Sem dúvidas abertas', meta: 'Responda direto da fila' },
        { href: qs({ turma: sp.turma, f: 'bad' }), cls: 's3', ic: 'users', rot: 'Alunos em risco', tit: cont('bad') ? `${cont('bad')} aluno${cont('bad') > 1 ? 's' : ''} sem estudar` : 'Todos no ritmo', meta: 'Veja quem parou de estudar' },
      ]} />
      <Atalhos titulo="Suas ferramentas" itens={[
        { href: '/professor/conteudo', ic: 'folder', t: 'Conteúdo', d: `${nItens ?? 0} publicado${nItens === 1 ? '' : 's'}` },
        { href: '/professor/banco', ic: 'bank', t: 'Questões', d: `${nQ ?? 0} no banco` },
        { href: '/professor/redacoes', ic: 'file', t: 'Redações', d: 'Corrigir e comentar', n: nr },
        { href: '/professor/duvidas', ic: 'chat', t: 'Dúvidas', d: 'Responder alunos', n: nd },
      ]} />
      <Acompanhar alunos={alunos} turmas={turmas} sp={sp} base="/professor" />
    </>
  );
}
