import Link from 'next/link';
import { exigirPerfil } from '@/lib/sessao';
import { carregarTrilhas, fila, semanaAtual, iconeTipo } from '@/lib/trilha';
import { Icon } from '@/components/Icon';
import { Pb, Pill, fmtMin, fmtPrazo, saudacao, primeiroNome } from '@/components/ui';
import { LinhaItem, hrefItem, tituloItem } from '@/components/Linha';
import { iniciais } from '@/lib/tipos';

export const dynamic = 'force-dynamic';

const rotina = [
  { href: '/aluno/trilhas', n: 'route', t: 'Trilhas', d: 'Aulas e apostilas' },
  { href: '/aluno/simulados', n: 'exam', t: 'Simulados', d: 'Treine e some nota' },
  { href: '/aluno/redacao', n: 'file', t: 'Redação', d: 'Escreva e receba correção' },
  { href: '/aluno/duvidas', n: 'chat', t: 'Dúvidas', d: 'Pergunte ao professor' },
  { href: '/aluno/biblioteca', n: 'book', t: 'Biblioteca', d: 'Materiais da escola' },
  { href: '/aluno/foco', n: 'timer', t: 'Bloco de foco', d: 'Cronômetro de estudo' },
];

export default async function Hoje() {
  const { perfil, db } = await exigirPerfil('aluno');
  const [{ disciplinas }, { data: sess }, { data: tent }, { data: reds }, { data: turma }, { count: duvAbertas }] = await Promise.all([
    carregarTrilhas(db, perfil),
    db.from('sessoes_estudo').select('minutos,feito_em').eq('aluno_id', perfil.id).gte('feito_em', new Date(Date.now() - 8 * 86400000).toISOString()),
    db.from('tentativas').select('nota,simulados(disciplina_id)').eq('aluno_id', perfil.id).eq('treino', false).not('finalizada_em', 'is', null),
    db.from('redacoes').select('id,tema_id,status,nota,redacao_temas(titulo)').eq('aluno_id', perfil.id).eq('status', 'corrigida').order('corrigida_em', { ascending: false }).limit(1),
    perfil.turma_id ? db.from('turmas').select('nome').eq('id', perfil.turma_id).single() : Promise.resolve({ data: null }),
    db.from('duvidas').select('id', { count: 'exact', head: true }).eq('aluno_id', perfil.id).eq('status', 'respondida').is('visto_em', null),
  ]);
  const q = fila(disciplinas);
  const cur = q.find(x => x.pct && !x.concluido) ?? q[0];
  const simPend = q.find(x => x.tipo === 'sim');
  const sem = semanaAtual(sess ?? []);
  const meta = perfil.meta_semanal_min, pc = Math.min(100, Math.round((sem.total / meta) * 100));
  const hojeMin = sem.dias[sem.hoje] ?? 0;
  const grupos: [string, typeof q][] = [
    ['Para hoje', q.filter(x => !x.prazo || ['hoje', 'atrasada'].includes(fmtPrazo(x.prazo)))],
    ['Próximos dias', q.filter(x => x.prazo && !['hoje', 'atrasada'].includes(fmtPrazo(x.prazo)))],
  ];
  const dn = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const porDisc = new Map<string, number[]>();
  for (const t of (tent ?? []) as any[]) { const k = t.simulados?.disciplina_id; if (k) porDisc.set(k, [...(porDisc.get(k) ?? []), t.nota]); }
  const media = (id: string) => { const n = porDisc.get(id); return n ? Math.round(n.reduce((a, b) => a + b, 0) / n.length / 10) : null; };
  const desempenho = disciplinas.filter(d => porDisc.has(d.id)).map(d => [d.nome, media(d.id)!] as const);
  const nivel = (p: number) => (p >= 75 ? ['Forte', 'ok'] : p >= 60 ? ['Médio', 'wip'] : ['Revisar', 'warn']);
  const todos = disciplinas.flatMap(d => d.itens);
  const feitos = todos.filter(i => i.concluido).length;
  const geral = todos.length ? Math.round((feitos / todos.length) * 100) : 0;
  const atrasadas = q.filter(x => x.prazo && fmtPrazo(x.prazo) === 'atrasada').length;
  const mediaGeral = desempenho.length ? Math.round(desempenho.reduce((a, b) => a + b[1], 0) / desempenho.length) : null;
  const red = reds?.[0] as any;
  const cores = ['c1', 'c5', 'c3', 'c4', 'c2'];

  return (
    <>
      {!perfil.turma_id && <div className="note">Você ainda não está em uma turma, por isso as trilhas, os simulados e as redações da sua turma não aparecem. Peça à gestão da escola para te incluir em uma; assim que isso acontecer, tudo é liberado aqui.</div>}

      <section className="wel">
        <div className="wel-id">
          <span className="wel-av">{iniciais(perfil.nome)}</span>
          <div>
            <p className="eyebrow">{saudacao()}</p>
            <h1 className="h1">{primeiroNome(perfil.nome)}, bons estudos!</h1>
            <div className="chips2">
              {turma?.nome && <span className="pill">{turma.nome}</span>}
              <span className={`pill ${atrasadas ? 'warn' : 'ok'}`}>{atrasadas ? `${atrasadas} atrasada${atrasadas > 1 ? 's' : ''}` : 'Em dia'}</span>
              <span className="pill wip">Meta {fmtMin(meta)} por semana</span>
            </div>
          </div>
          {cur && <Link href={hrefItem(cur)} className="btn pri lg wel-cta"><Icon n={iconeTipo[cur.tipo]} s={16} /> {cur.pct ? 'Continuar' : 'Começar'}</Link>}
        </div>
        <div className="info4">
          <div><small>Hoje</small><b>{fmtMin(hojeMin)}</b></div>
          <div><small>Esta semana</small><b>{fmtMin(sem.total)}</b></div>
          <div><small>Etapas feitas</small><b>{feitos}<em> de {todos.length}</em></b></div>
          <div><small>Média simulados</small><b>{mediaGeral === null ? '—' : `${mediaGeral}%`}</b></div>
        </div>
        <div className="wel-pb"><div className="row sb"><span>Progresso geral nas trilhas</span><b>{geral}%</b></div><Pb p={geral} /></div>
      </section>

      <section>
        <h2 className="h2 sec">Especialmente para você</h2>
        <div className="sugs">
          <Link href={cur ? hrefItem(cur) : '/aluno/biblioteca'} className="sug s1">
            <span className="sug-ic"><Icon n={cur ? iconeTipo[cur.tipo] : 'book'} s={20} /></span>
            <small>{cur ? (cur.pct ? 'Continue de onde parou' : 'Seu próximo passo') : 'Tudo em dia'}</small>
            <b>{cur ? tituloItem(cur) : 'Revise uma aula na biblioteca'}</b>
            <span className="sug-m">{cur ? `${cur.disciplina} · ${cur.minutos} min${cur.pct ? ` · ${cur.pct}%` : ''}` : 'Nada pendente por enquanto'}</span>
          </Link>
          <Link href={simPend ? hrefItem(simPend) : '/aluno/simulados'} className="sug s2">
            <span className="sug-ic"><Icon n="exam" s={20} /></span>
            <small>{simPend ? 'Simulado liberado' : 'Treino livre'}</small>
            <b>{simPend ? simPend.titulo : 'Treine com um simulado'}</b>
            <span className="sug-m">{simPend ? `${simPend.disciplina} · ${simPend.minutos} min` : 'Veja os simulados da sua turma'}</span>
          </Link>
          <Link href={red ? `/aluno/redacao/${red.tema_id}` : '/aluno/redacao'} className="sug s3">
            <span className="sug-ic"><Icon n="file" s={20} /></span>
            <small>{red ? 'Redação corrigida' : 'Redação'}</small>
            <b>{red ? red.redacao_temas?.titulo : 'Escreva sua próxima redação'}</b>
            <span className="sug-m">{red ? `Nota ${red.nota} · ver correção` : 'Escolha um tema e envie para correção'}</span>
          </Link>
        </div>
      </section>

      <section>
        <h2 className="h2 sec">Sua rotina de estudos</h2>
        <div className="rot">
          {rotina.map((r, i) => (
            <Link key={r.href} href={r.href} className={`rt r${i % 6}`}>
              <span className="rt-ic"><Icon n={r.n} s={22} />{r.t === 'Dúvidas' && duvAbertas ? <i className="rt-b">{duvAbertas}</i> : null}</span>
              <b>{r.t}</b><small>{r.d}</small>
            </Link>
          ))}
        </div>
      </section>

      <div className="cols">
        <div className="stack">
          <div className="card">
            <div className="row sb"><h2 className="h2">Minhas disciplinas</h2><Link href="/aluno/trilhas" className="lnk">Ver trilhas</Link></div>
            {disciplinas.length === 0 && <div className="empty">Ainda não há disciplinas liberadas para a sua turma.</div>}
            <div className="dl">
              {disciplinas.map((d, i) => {
                const f = d.itens.filter(x => x.concluido).length, p = d.itens.length ? Math.round((f / d.itens.length) * 100) : 0, m = media(d.id), prox = d.itens.find(x => x.estado === 'now');
                return (
                  <Link key={d.id} href="/aluno/trilhas" className="dr">
                    <span className={`dl-av ${cores[i % 5]}`}>{d.nome[0]}</span>
                    <div className="dr-t"><b>{d.nome}</b><small>{prox ? `Próxima: ${prox.titulo}` : f === d.itens.length ? 'Disciplina concluída' : d.area}</small></div>
                    <div className="dr-s"><span><b>{f}/{d.itens.length}</b><small>etapas</small></span><span><b>{m === null ? '—' : `${m}%`}</b><small>média</small></span></div>
                    <div className="dr-p"><Pb p={p} cls={p >= 100 ? 'ok' : ''} /><small>{p}%</small></div>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="card">
            <h2 className="h2">Sua fila de estudo</h2>
            {q.length === 0 && <div className="empty">Nada na fila por enquanto.</div>}
            {grupos.filter(g => g[1].length).map(g => (
              <div key={g[0]}><div className="gl">{g[0]}</div><div className="list">{g[1].map(x => <LinhaItem key={x.id} it={x} disc={disciplinas.find(d => d.id === x.disciplina_id)!} />)}</div></div>
            ))}
          </div>
        </div>
        <div className="stack">
          <div className="card">
            <div className="row sb"><h2 className="h2">Desempenho</h2><span className="sub" style={{ fontSize: 13 }}>nos simulados</span></div>
            {desempenho.length === 0 ? (
              <div className="vz"><span className="vz-ic"><Icon n="exam" s={26} /></span><b>Sem dados ainda</b><small>Faça seu primeiro simulado e veja aqui como você está em cada disciplina.</small><Link href="/aluno/simulados" className="btn sm">Ver simulados</Link></div>
            ) : (
              <div style={{ marginTop: 8 }}>{desempenho.map(([n, p]) => { const l = nivel(p); return <div key={n} className="perf"><span>{n}</span><Pb p={p} cls={l[1] === 'ok' ? 'ok' : ''} /><span className={`pill ${l[1]}`}>{l[0]}</span></div>; })}</div>
            )}
          </div>
          <div className="card">
            <div className="row sb"><h2 className="h2">Sua semana</h2><Pill tone={pc >= 100 ? 'ok' : 'wip'}>{pc}% da meta</Pill></div>
            <div style={{ margin: '14px 0 8px' }} className="row sb"><b style={{ fontSize: 22, fontWeight: 600 }}>{fmtMin(sem.total)}</b><span className="sub">{pc >= 100 ? 'Meta batida!' : `faltam ${fmtMin(Math.max(0, meta - sem.total))}`}</span></div>
            <Pb p={pc} cls={pc >= 100 ? 'ok' : ''} />
            <div className="week">
              {sem.dias.map((m, i) => { const n = Math.min(4, Math.ceil(m / 15)); return (
                <div key={i} className={`wd${i === sem.hoje ? ' today' : ''}`}><div className="st" title={`${m} min`}>{[3, 2, 1, 0].map(k => <i key={k} className={k < n ? 'on' : ''} />)}</div><small>{dn[i]}</small></div>
              ); })}
            </div>
            <p className="sub" style={{ marginTop: 14, fontSize: 13 }}>Cada ponto vale 15 min. A meta é da semana: perder um dia não zera nada.</p>
          </div>
          <div className="card foco-c"><h2 className="h2">Bloco de foco</h2><p className="sub" style={{ margin: '6px 0 14px' }}>Estude sem distração e some tempo na sua meta.</p>
            <Link href="/aluno/foco" className="btn block"><Icon n="timer" s={16} /> Iniciar cronômetro</Link></div>
        </div>
      </div>
    </>
  );
}
