import Link from 'next/link';
import { exigirPerfil } from '@/lib/sessao';
import { Av } from '@/components/ui';
import { Acao, Form } from '@/components/Form';
import { alternarTrava, criarTurma, editarPessoa, editarTurma, excluirTurma } from '@/lib/acoes/equipe';
import { Cab, Bloco } from '@/components/Painel';
import { Busca, Paginacao } from '@/components/Filtros';
import { Acompanhar } from '@/components/Acompanhar';
import { POR_PAGINA, likeSeguro, pag, qs, normalizarSP } from '@/lib/consulta';
import { ExcluirPessoa, MoverAluno } from './Acoes';

export const dynamic = 'force-dynamic';

type SP = { aba?: string; turma?: string; q?: string; p?: string; f?: string };
const ABAS = [['alunos', 'Alunos'], ['turmas', 'Turmas'], ['equipe', 'Equipe'], ['acomp', 'Acompanhamento']] as const;
const BASE = '/gestao/turmas';

export default async function Turmas({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = normalizarSP(await searchParams);
  const aba = ABAS.find(a => a[0] === sp.aba)?.[0] ?? 'alunos';
  const { perfil, db } = await exigirPerfil('gestao');
  const [{ data: turmas }, { data: todosAl }, { count: nEquipe }] = await Promise.all([
    db.from('turmas').select('id,nome,turno,trava_progressiva').order('nome'),
    db.from('profiles').select('turma_id').eq('papel', 'aluno').eq('status', 'ativo').limit(5000),
    db.from('profiles').select('id', { count: 'exact', head: true }).in('papel', ['professor', 'gestao']).eq('status', 'ativo'),
  ]);
  const nPorTurma = new Map<string, number>(); let semTurma = 0;
  for (const a of todosAl ?? []) { if (a.turma_id) nPorTurma.set(a.turma_id, (nPorTurma.get(a.turma_id) ?? 0) + 1); else semTurma++; }
  const nAlunos = todosAl?.length ?? 0;
  const turmaOk = sp.turma === 'sem' || (turmas ?? []).some(t => t.id === sp.turma) ? sp.turma : undefined;
  const busca = (sp.q ?? '').trim().slice(0, 80);
  const pagina = pag(sp.p), de = (pagina - 1) * POR_PAGINA;
  const nomeTurma = new Map((turmas ?? []).map(t => [t.id, t.nome]));

  return (
    <>
      <Cab titulo="Turmas e alunos" sub="Alunos, turmas, equipe e acompanhamento em um só lugar."
        info={[['Alunos', nAlunos], ['Turmas', turmas?.length ?? 0], ['Sem turma', semTurma], ['Equipe', nEquipe ?? 0]]} />
      <div className="tabs" role="tablist">{ABAS.map(([k, l]) => <Link key={k} scroll={false} className={aba === k ? 'on' : ''} href={`?aba=${k}`}>{l}</Link>)}</div>

      {aba === 'alunos' && await (async () => {
        let q = db.from('profiles').select('id,nome,matricula,turma_id', { count: 'exact' }).eq('papel', 'aluno').eq('status', 'ativo');
        if (turmaOk === 'sem') q = q.is('turma_id', null); else if (turmaOk) q = q.eq('turma_id', turmaOk);
        if (busca) q = q.ilike('nome', `%${likeSeguro(busca)}%`);
        const [{ data: alunos, count }, { data: hist }] = await Promise.all([
          q.order('nome').range(de, de + POR_PAGINA - 1),
          db.from('exclusoes').select('id,pessoa_nome,papel,turma_nome,motivo,excluido_por_nome,created_at').order('created_at', { ascending: false }).limit(8),
        ]);
        const link = (t?: string) => `?${qs({ aba: 'alunos', turma: t, q: busca || undefined }).slice(1)}`;
        const params = { aba: 'alunos', turma: turmaOk };
        return (
          <>
            <div className="card">
              <div className="row sb"><h2 className="h2">Alunos</h2><span className="sub" style={{ fontSize: 13 }}>{count ?? 0} {turmaOk || busca ? 'encontrados' : 'ativos'}</span></div>
              <Busca base={BASE} params={params} q={busca} placeholder="Buscar aluno por nome" />
              <div className="tabs" role="tablist">
                <Link scroll={false} className={!turmaOk ? 'on' : ''} href={link()}>Todos · {nAlunos}</Link>
                {turmas?.map(t => <Link scroll={false} key={t.id} className={turmaOk === t.id ? 'on' : ''} href={link(t.id)}>{t.nome} · {nPorTurma.get(t.id) ?? 0}</Link>)}
                {(semTurma > 0 || turmaOk === 'sem') && <Link scroll={false} className={turmaOk === 'sem' ? 'on' : ''} href={link('sem')}>Sem turma · {semTurma}</Link>}
              </div>
              <div className="list" style={{ marginTop: 6 }}>{alunos?.length ? alunos.map(a => (
                <details key={a.id} className="rowd">
                  <summary className="li li-item"><Av nome={a.nome} sm /><div className="tx"><b>{a.nome}</b><small>{a.matricula ? `Matrícula ${a.matricula}` : 'Sem matrícula'}</small></div>
                    <span className={`pill ${a.turma_id ? 'wip' : 'warn'}`}>{a.turma_id ? nomeTurma.get(a.turma_id) : 'Sem turma'}</span><span className="btn sm">Gerenciar</span></summary>
                  <div className="rowd-b">
                    <MoverAluno id={a.id} nome={a.nome} turmaId={a.turma_id} turmas={turmas ?? []} />
                    <ExcluirPessoa id={a.id} nome={a.nome} />
                  </div>
                </details>)) : <div className="empty">{busca || turmaOk ? 'Nenhum aluno com esse filtro.' : 'Nenhum aluno ativo.'}</div>}</div>
              <Paginacao pagina={pagina} total={count ?? 0} base={BASE} params={{ ...params, q: busca || undefined }} />
            </div>
            <Historico hist={hist} />
          </>
        );
      })()}

      {aba === 'turmas' && (
        <div className="cols">
          <div className="stack">
            {turmas?.length ? <div className="tg">{turmas.map((t, i) => { const n = nPorTurma.get(t.id) ?? 0; return (
              <div key={t.id} className="tcard"><div className="tcard-h"><span className={`dl-av ${['c1', 'c5', 'c3', 'c4', 'c2'][i % 5]}`}>{t.nome[0]}</span><div><b>{t.nome}</b><small>{t.turno ?? 'Sem turno'} · {n} aluno{n === 1 ? '' : 's'}</small></div></div>
                <p>{t.trava_progressiva ? 'Trava ligada: o aluno libera uma etapa de cada vez.' : 'Trava desligada: o aluno estuda em qualquer ordem.'}</p>
                <div className="row" style={{ gap: 8 }}>
                  <Link className="btn sm pri" href={`?aba=alunos&turma=${t.id}`}>Ver alunos</Link>
                  <Acao action={alternarTrava.bind(null, t.id, !t.trava_progressiva) as any}>{t.trava_progressiva ? 'Desligar trava' : 'Ligar trava'}</Acao>
                  <Acao className="btn sm ghost" confirmar={`Excluir a turma ${t.nome}? Os ${n} aluno(s) ficam sem turma e as publicações dela (aulas, simulados e redações) deixam de valer.`} action={excluirTurma.bind(null, t.id) as any}>Excluir</Acao>
                </div>
                <details className="edit-t"><summary className="btn sm">Editar nome e turno</summary>
                  <Form action={editarTurma} botao="Salvar" pri={false}><input type="hidden" name="id" value={t.id} />
                    <div className="field"><label htmlFor={`en${t.id}`}>Nome</label><input id={`en${t.id}`} name="nome" className="inp" required defaultValue={t.nome} maxLength={60} /></div>
                    <div className="field"><label htmlFor={`et${t.id}`}>Turno</label><input id={`et${t.id}`} name="turno" className="inp" defaultValue={t.turno ?? ''} maxLength={30} /></div></Form></details></div>); })}</div>
              : <div className="empty">Nenhuma turma ainda. Crie a primeira ao lado.</div>}
          </div>
          <div className="stack">
            <Bloco ic="plus" titulo="Nova turma" sub="Dê um nome e, se quiser, o turno.">
              <Form action={criarTurma} botao="Criar turma"><div className="field"><label htmlFor="tn">Nome</label><input id="tn" name="nome" className="inp" required placeholder="3º A" /></div><div className="field"><label htmlFor="tu">Turno</label><input id="tu" name="turno" className="inp" placeholder="Manhã" /></div></Form></Bloco>
          </div>
        </div>
      )}

      {aba === 'equipe' && await (async () => {
        const papelOk = sp.f === 'gestao' || sp.f === 'professor' ? sp.f : undefined;
        let q = db.from('profiles').select('id,nome,papel,disciplina_id', { count: 'exact' }).in('papel', ['professor', 'gestao']).eq('status', 'ativo');
        if (papelOk) q = q.eq('papel', papelOk);
        if (busca) q = q.ilike('nome', `%${likeSeguro(busca)}%`);
        const [{ data: pessoas, count }, { data: discs }, { data: hist }] = await Promise.all([
          q.order('nome').range(de, de + POR_PAGINA - 1),
          db.from('disciplinas').select('id,nome').order('ordem'),
          db.from('exclusoes').select('id,pessoa_nome,papel,turma_nome,motivo,excluido_por_nome,created_at').order('created_at', { ascending: false }).limit(8),
        ]);
        const ids = (pessoas ?? []).map(p => p.id);
        const { data: vinc } = ids.length ? await db.from('professor_turmas').select('professor_id,turma_id').in('professor_id', ids) : { data: [] as { professor_id: string; turma_id: string }[] };
        const nomeDisc = new Map((discs ?? []).map((d: any) => [d.id, d.nome]));
        const params = { aba: 'equipe', f: papelOk };
        const lk = (f?: string) => `?${qs({ aba: 'equipe', f, q: busca || undefined }).slice(1)}`;
        return (
          <>
            <div className="card">
              <div className="row sb"><h2 className="h2">Equipe</h2><span className="sub" style={{ fontSize: 13 }}>{count ?? 0} pessoa{count === 1 ? '' : 's'}</span></div>
              <Busca base={BASE} params={params} q={busca} placeholder="Buscar por nome" />
              <div className="tabs" role="tablist"><Link scroll={false} className={!papelOk ? 'on' : ''} href={lk()}>Todos</Link><Link scroll={false} className={papelOk === 'professor' ? 'on' : ''} href={lk('professor')}>Professores</Link><Link scroll={false} className={papelOk === 'gestao' ? 'on' : ''} href={lk('gestao')}>Gestão</Link></div>
              <div className="list" style={{ marginTop: 6 }}>{pessoas?.length ? pessoas.map(p => {
                const minhas = (turmas ?? []).filter(t => (vinc ?? []).some(v => v.professor_id === p.id && v.turma_id === t.id));
                const eu = p.id === perfil.id;
                const disc = p.disciplina_id ? nomeDisc.get(p.disciplina_id) : null;
                return (
                  <details key={p.id} className="rowd">
                    <summary className="li li-item"><Av nome={p.nome} sm />
                      <div className="tx"><b>{p.nome}{eu ? ' (você)' : ''}</b><small>{p.papel === 'gestao' ? 'Gestão' : 'Professor'}{disc ? ` · ${disc}` : ''}{p.papel === 'professor' ? ` · ${minhas.length ? minhas.map(t => t.nome).join(', ') : 'nenhuma turma'}` : ''}</small></div>
                      <span className="btn sm">Gerenciar</span></summary>
                    <div className="rowd-b">
                      <Form action={editarPessoa} botao="Salvar alterações" pri={false}>
                        <input type="hidden" name="id" value={p.id} />
                        <div className="field"><label htmlFor={`pn${p.id}`}>Nome</label><input id={`pn${p.id}`} name="nome" className="inp" required defaultValue={p.nome} maxLength={120} /></div>
                        {eu ? <input type="hidden" name="papel" value={p.papel} /> : <div className="field"><label htmlFor={`pp${p.id}`}>Cargo</label><select id={`pp${p.id}`} name="papel" className="inp" defaultValue={p.papel}><option value="professor">Professor</option><option value="gestao">Gestão</option></select></div>}
                        <div className="field"><label htmlFor={`pd${p.id}`}>Disciplina que leciona</label><select id={`pd${p.id}`} name="disciplina_id" className="inp" defaultValue={p.disciplina_id ?? ''}><option value="">Não informada</option>{discs?.map((d: any) => <option key={d.id} value={d.id}>{d.nome}</option>)}</select></div>
                        {p.papel === 'professor' && <div className="field full"><span className="sub" style={{ fontSize: 13, fontWeight: 600 }}>Turmas em que leciona (sem nenhuma marcada, ele não vê turma alguma)</span><div className="chips">{turmas?.map(t => <label key={t.id} className="chip" style={{ cursor: 'pointer' }}><input type="checkbox" name="turmas" value={t.id} defaultChecked={minhas.some(m => m.id === t.id)} style={{ marginRight: 6 }} />{t.nome}</label>)}</div></div>}
                      </Form>
                      {eu ? <p className="sub" style={{ fontSize: 13 }}>Você não pode excluir a própria conta.</p> : <ExcluirPessoa id={p.id} nome={p.nome} />}
                    </div>
                  </details>);
              }) : <div className="empty">Ninguém encontrado.</div>}</div>
              <Paginacao pagina={pagina} total={count ?? 0} base={BASE} params={{ ...params, q: busca || undefined }} />
            </div>
            <Historico hist={hist} />
          </>
        );
      })()}

      {aba === 'acomp' && await (async () => {
        const { data: alunos } = await db.from('painel_alunos').select('*');
        return <Acompanhar alunos={alunos} turmas={turmas} sp={{ turma: turmaOk && turmaOk !== 'sem' ? turmaOk : undefined, f: sp.f, q: sp.q, p: sp.p }} base={BASE} extra={{ aba: 'acomp' }} />;
      })()}
    </>
  );
}

function Historico({ hist }: { hist: any[] | null }) {
  if (!hist?.length) return null;
  return (
    <details className="card hist"><summary><h2 className="h2" style={{ display: 'inline' }}>Histórico de exclusões</h2><span className="sub" style={{ fontSize: 13, marginLeft: 8 }}>últimas {hist.length}</span></summary>
      <div className="list" style={{ marginTop: 8 }}>{hist.map(h => (
        <div key={h.id} className="li"><div className="tx"><b>{h.pessoa_nome}</b><small>{h.papel === 'aluno' ? `Aluno${h.turma_nome ? ` · ${h.turma_nome}` : ''}` : h.papel === 'gestao' ? 'Gestão' : 'Professor'} · {new Date(h.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}{h.excluido_por_nome ? ` · por ${h.excluido_por_nome}` : ''}</small><small style={{ whiteSpace: 'pre-wrap' }}>Motivo: {h.motivo}</small></div></div>))}</div>
    </details>
  );
}
