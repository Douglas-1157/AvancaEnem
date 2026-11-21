import Link from 'next/link';
import { exigirPerfil } from '@/lib/sessao';
import { Av } from '@/components/ui';
import { Acao, Form } from '@/components/Form';
import { criarProfessor, decidirCadastro, importarAlunos, redefinirSenhaUsuario } from '@/lib/acoes/equipe';
import { Cab, Bloco } from '@/components/Painel';
import { likeSeguro } from '@/lib/consulta';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ABAS = [['aguardando', 'Aguardando'], ['professor', 'Cadastrar professor'], ['importar', 'Importar alunos'], ['senha', 'Redefinir senha']] as const;

export default async function Cadastros({ searchParams }: { searchParams: Promise<{ aba?: string; q?: string }> }) {
  const sp = await searchParams;
  const aba = ABAS.find(a => a[0] === sp.aba)?.[0] ?? 'aguardando';
  const busca = (sp.q ?? '').trim().slice(0, 80);
  const { db } = await exigirPerfil('gestao');
  const [{ data: pend }, { data: recusados }, { data: discs }, { count: nAlunos }, { count: nProf }] = await Promise.all([
    db.from('profiles').select('id,nome,matricula,created_at,turmas!profiles_turma_id_fkey(nome)').eq('status', 'pendente').order('created_at').limit(100),
    db.from('profiles').select('id,nome,turmas!profiles_turma_id_fkey(nome)').eq('status', 'recusado').order('created_at', { ascending: false }).limit(10),
    aba === 'professor' ? db.from('disciplinas').select('id,nome').order('ordem') : Promise.resolve({ data: null }),
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('papel', 'aluno').eq('status', 'ativo'),
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('papel', 'professor').eq('status', 'ativo'),
  ]);
  const achados = aba === 'senha' && busca
    ? (await db.from('profiles').select('id,nome,papel,turmas!profiles_turma_id_fkey(nome)').eq('status', 'ativo').ilike('nome', `%${likeSeguro(busca)}%`).order('nome').limit(8)).data
    : null;
  return (
    <>
      <Cab titulo="Cadastros" sub="Aprove os alunos que pediram acesso, cadastre professores, importe planilhas e ajude quem perdeu a senha."
        info={[['Aguardando', pend?.length ?? 0], ['Alunos ativos', nAlunos ?? 0], ['Professores', nProf ?? 0], ['Recusados', recusados?.length ?? 0]]} />
      <div className="tabs" role="tablist">{ABAS.map(([k, l]) => <Link key={k} scroll={false} className={aba === k ? 'on' : ''} href={`?aba=${k}`}>{l}{k === 'aguardando' && pend?.length ? ` · ${pend.length}` : ''}</Link>)}</div>

      {aba === 'aguardando' && (
        <div className="stack">
          <div className="card"><h2 className="h2" style={{ marginBottom: 6 }}>Aguardando confirmação</h2>
            <div className="list">{pend?.length ? pend.map((p: any) => (
              <div key={p.id} className="li li-item"><Av nome={p.nome} sm /><div className="tx"><b>{p.nome}</b><small>{p.turmas?.nome ?? 'Sem turma'}{p.matricula ? ` · matrícula ${p.matricula}` : ''}</small></div>
                <div className="li-acoes"><Acao className="btn sm pri" action={decidirCadastro.bind(null, p.id, true) as any}>Aprovar</Acao>
                <Acao action={decidirCadastro.bind(null, p.id, false) as any}>Recusar</Acao></div></div>)) : <div className="empty">Nenhum cadastro pendente.</div>}</div></div>
          {recusados?.length ? <div className="card"><h2 className="h2" style={{ marginBottom: 6 }}>Recusados recentemente</h2><div className="list">{recusados.map((p: any) => <div key={p.id} className="li li-item"><div className="tx"><b>{p.nome}</b><small>{p.turmas?.nome ?? 'Sem turma'}</small></div><div className="li-acoes"><Acao action={decidirCadastro.bind(null, p.id, true) as any}>Aprovar</Acao></div></div>)}</div></div> : null}
        </div>
      )}

      {aba === 'professor' && (
        <Bloco ic="users" titulo="Cadastrar professor" sub="Defina uma senha provisória e repasse à pessoa. Ela pode trocar depois. Para mudar disciplina, turmas ou cargo depois, use Turmas e alunos › Equipe.">
          <Form action={criarProfessor} botao="Criar conta">
            <div className="field full"><label htmlFor="pn">Nome completo</label><input id="pn" name="nome" className="inp" required /></div>
            <div className="field full"><label htmlFor="pe">E-mail</label><input id="pe" name="email" type="email" className="inp" required /></div>
            <div className="field full"><label htmlFor="pd">Disciplina que leciona</label><select id="pd" name="disciplina_id" className="inp" defaultValue=""><option value="">Não informar</option>{discs?.map((d: any) => <option key={d.id} value={d.id}>{d.nome}</option>)}</select></div>
            <div className="field full"><label htmlFor="ps">Senha provisória (8+ caracteres)</label><input id="ps" name="senha" type="text" minLength={8} className="inp" required autoComplete="off" /></div>
            <label className="full sub" style={{ fontSize: 14 }}><input type="checkbox" name="gestao" style={{ marginRight: 8 }} />Também é da gestão da escola</label>
          </Form></Bloco>
      )}

      {aba === 'importar' && (
        <Bloco ic="file" titulo="Importar alunos por planilha" sub={<>No Excel ou Google Planilhas, deixe as colunas <b>nome, email, matricula, turma</b> (matrícula e turma são opcionais; a turma precisa já existir) e salve como CSV. Todos entram já aprovados. Cada aluno recebe uma senha provisória diferente: ao terminar, baixe a lista (nome, e-mail e senha) e entregue a cada um. No primeiro acesso ele cria a própria senha.</>}>
          <Form action={importarAlunos} botao="Importar">
            <div className="field full"><label htmlFor="ia">Arquivo CSV</label><input id="ia" name="arquivo" type="file" accept=".csv,text/csv" className="inp" required /></div>
          </Form></Bloco>
      )}

      {aba === 'senha' && (
        <Bloco ic="lock" titulo="Redefinir senha de alguém" sub="Para quem perdeu o acesso. Procure a pessoa pelo nome, defina uma senha provisória e passe a ela: ao entrar, ela cria a própria senha.">
          <form method="get" className="busca" role="search">
            <input type="hidden" name="aba" value="senha" />
            <input name="q" className="inp" defaultValue={busca} placeholder="Nome de quem perdeu a senha" aria-label="Nome da pessoa" maxLength={80} />
            <button className="btn" type="submit">Procurar</button>
          </form>
          {!busca ? <div className="note">Digite o nome (ou parte dele) para encontrar a pessoa.</div>
            : achados?.length ? <div className="list">{achados.map((x: any) => (
              <details key={x.id} className="rowd">
                <summary className="li li-item"><Av nome={x.nome} sm /><div className="tx"><b>{x.nome}</b><small>{x.papel === 'aluno' ? 'Aluno' : x.papel === 'professor' ? 'Professor' : 'Gestão'}{x.turmas?.nome ? ` · ${x.turmas.nome}` : ''}</small></div><span className="btn sm">Nova senha</span></summary>
                <div className="rowd-b">
                  <Form action={redefinirSenhaUsuario} botao="Redefinir senha" className="rowd-f">
                    <input type="hidden" name="usuario" value={x.id} />
                    <div className="field"><label htmlFor={`rs${x.id}`}>Senha provisória (8+ caracteres)</label><input id={`rs${x.id}`} name="senha" type="text" minLength={8} className="inp" required autoComplete="off" /></div>
                  </Form>
                </div>
              </details>))}</div>
              : <div className="empty">Ninguém encontrado com esse nome.</div>}
        </Bloco>
      )}
    </>
  );
}
