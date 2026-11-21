import Link from 'next/link';
import { exigirPerfil } from '@/lib/sessao';
import { riscoDe } from '@/lib/risco';
import { Pb, fmtMin, saudacao, primeiroNome } from '@/components/ui';
import { Boas, Sugs, Atalhos } from '@/components/Painel';

export const dynamic = 'force-dynamic';

export default async function Escola() {
  const { perfil, db } = await exigirPerfil('gestao');
  const [{ data: turmas }, { data: alunos }, { count: pend }, { count: prof }, { count: nRed }, { count: nDuv }] = await Promise.all([
    db.from('turmas').select('id,nome,turno').order('nome'),
    db.from('painel_alunos').select('*'),
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('papel', 'professor').eq('status', 'ativo'),
    db.from('redacoes').select('id', { count: 'exact', head: true }).eq('status', 'enviada'),
    db.from('duvidas').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
  ]);
  const com = (alunos ?? []).map(a => ({ ...a, r: riscoDe(a.ultimo_estudo, a.min_semana, a.meta_semanal_min) }));
  const med = com.length ? Math.round(com.reduce((s, a) => s + a.min_semana, 0) / com.length) : 0;
  const risco = com.filter(a => a.r.nivel === 'bad').length;
  const ativos = com.filter(a => a.r.nivel === 'ok').length;
  const adesao = com.length ? Math.round((com.filter(a => a.min_semana >= a.meta_semanal_min / 2).length / com.length) * 100) : 0;
  const np = pend ?? 0, nr = nRed ?? 0, nd = nDuv ?? 0;
  return (
    <>
      <Boas nome={perfil.nome} saudacao={saudacao()} titulo={`${primeiroNome(perfil.nome)}, visão geral da escola`}
        chips={<><span className="pill">{turmas?.length ?? 0} turma{(turmas?.length ?? 0) === 1 ? '' : 's'}</span><span className={`pill ${np ? 'warn' : 'ok'}`}>{np ? `${np} cadastro${np > 1 ? 's' : ''} pendente${np > 1 ? 's' : ''}` : 'Cadastros em dia'}</span></>}
        info={[['Alunos ativos', com.length], ['Professores', prof ?? 0], ['Estudo médio na semana', fmtMin(med)], ['Em risco', risco]]} />
      <Sugs titulo="Para resolver agora" itens={[
        { href: '/gestao/cadastros', cls: 's1', ic: 'school', rot: 'Cadastros', tit: np ? `${np} esperando aprovação` : 'Nenhum cadastro pendente', meta: 'Aprove alunos e professores' },
        { href: '/gestao/turmas?aba=acomp', cls: 's2', ic: 'users', rot: 'Acompanhamento', tit: risco ? `${risco} aluno${risco > 1 ? 's' : ''} em risco` : 'Todos os alunos no ritmo', meta: 'Veja quem parou de estudar' },
        { href: '/professor/redacoes', cls: 's3', ic: 'file', rot: 'Correções', tit: nr + nd ? `${nr} redaç${nr === 1 ? 'ão' : 'ões'} e ${nd} dúvida${nd === 1 ? '' : 's'}` : 'Sem pendências de professores', meta: 'Fila da equipe pedagógica' },
      ]} />
      <Atalhos titulo="Gerenciar" itens={[
        { href: '/gestao/cadastros', ic: 'school', t: 'Cadastros', d: 'Alunos e professores', n: np },
        { href: '/gestao/turmas', ic: 'users', t: 'Turmas', d: 'Alunos, turmas e equipe' },
        { href: '/professor/conteudo', ic: 'folder', t: 'Conteúdo', d: 'Aulas e apostilas' },
        { href: '/professor/banco', ic: 'bank', t: 'Questões', d: 'Banco de questões' },
        { href: '/professor/redacoes', ic: 'file', t: 'Redações', d: 'Correções', n: nr },
        { href: '/professor/duvidas', ic: 'chat', t: 'Dúvidas', d: 'Perguntas dos alunos', n: nd },
      ]} />
      <div className="cols">
        <div className="stack">
          <div className="card"><h2 className="h2">Adesão por turma</h2><p className="sub" style={{ fontSize: 13 }}>Alunos que bateram ao menos metade da meta semanal.</p>
            <div className="list" style={{ marginTop: 6 }}>{turmas?.length ? turmas.map(t => {
              const l = com.filter(a => a.turma_id === t.id); const p = l.length ? Math.round((l.filter(a => a.min_semana >= a.meta_semanal_min / 2).length / l.length) * 100) : 0;
              return <div key={t.id} className="li" style={{ padding: '12px 0' }}><div className="tx"><b>{t.nome}{t.turno ? ` · ${t.turno}` : ''}</b><small>{l.length} alunos</small><Pb p={p} /></div><b className="num">{p}%</b></div>;
            }) : <div className="empty">Crie a primeira turma em “Turmas”.</div>}</div></div>
        </div>
        <div className="stack">
          <div className="card">
            <div className="row sb"><h2 className="h2">Saúde da escola</h2><span className="pill wip">{adesao}% de adesão</span></div>
            {com.length === 0 ? <div className="vz"><b>Sem alunos ainda</b><small>Aprove cadastros ou importe uma planilha de alunos para ver os números aqui.</small><Link href="/gestao/cadastros" className="btn sm">Ir para cadastros</Link></div> : (
              <div style={{ marginTop: 10 }}>{([['ok', 'No ritmo', ativos], ['warn', 'Atenção', com.length - ativos - risco], ['bad', 'Em risco', risco]] as const).map(([k, l, n]) => (
                <div key={k} className="perf"><span>{l}</span><Pb p={(n / com.length) * 100} cls={k === 'ok' ? 'ok' : ''} /><span className={`pill ${k}`}>{n}</span></div>))}</div>
            )}
          </div>
          <div className="card foco-c"><h2 className="h2">Acompanhar turmas</h2><p className="sub" style={{ margin: '6px 0 12px' }}>Veja alunos em risco e o desempenho de cada um.</p><Link className="btn block" href="/gestao/turmas?aba=acomp">Abrir acompanhamento</Link></div>
        </div>
      </div>
    </>
  );
}
