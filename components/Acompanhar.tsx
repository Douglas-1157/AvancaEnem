import Link from 'next/link';
import { riscoDe } from '@/lib/risco';
import { Av, Pb, fmtMin } from '@/components/ui';
import { Busca, Paginacao } from '@/components/Filtros';
import { POR_PAGINA, pag, qs, semAcento } from '@/lib/consulta';

export type SPAcomp = { turma?: string; f?: string; q?: string; p?: string };

// Números do painel a partir da view painel_alunos (usado também na tela inicial do professor).
export function resumo(alunos: any[] | null, turma?: string) {
  const todos = (alunos ?? []).map(a => ({ ...a, r: riscoDe(a.ultimo_estudo, a.min_semana, a.meta_semanal_min) }));
  const lista = todos.filter(a => !turma || a.turma_id === turma);
  const ordem: Record<string, number> = { bad: 0, warn: 1, ok: 2 };
  lista.sort((a, b) => ordem[a.r.nivel] - ordem[b.r.nivel] || a.nome.localeCompare(b.nome));
  const med = lista.length ? Math.round(lista.reduce((s, a) => s + a.min_semana, 0) / lista.length) : 0;
  const cont = (n: string) => lista.filter(a => a.r.nivel === n).length;
  return { todos, lista, med, cont };
}

// Lista de alunos com risco, busca por nome e páginas, mais o ritmo e a adesão por turma.
// `base` é a página onde ele aparece; `extra` são parâmetros fixos do endereço (ex.: a aba).
export function Acompanhar({ alunos, turmas, sp, base, extra = {} }: {
  alunos: any[] | null; turmas: { id: string; nome: string }[] | null; sp: SPAcomp; base: string; extra?: Record<string, string>;
}) {
  const { todos, lista, cont } = resumo(alunos, sp.turma);
  const busca = (sp.q ?? '').trim();
  const filtrada = lista.filter(a => (!sp.f || a.r.nivel === sp.f) && (!busca || semAcento(a.nome).includes(semAcento(busca))));
  const pagina = pag(sp.p);
  const vis = filtrada.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const link = (o: Record<string, string | undefined>) => base + qs({ ...extra, turma: sp.turma, f: sp.f, q: sp.q, ...o });
  const params = { ...extra, turma: sp.turma, f: sp.f };
  return (
    <div className="cols">
      <div className="stack">
        <div className="card">
          <div className="row sb"><h2 className="h2">Alunos</h2><span className="sub" style={{ fontSize: 13 }}>{filtrada.length} de {lista.length}</span></div>
          <Busca base={base} params={params} q={busca} />
          <div className="tabs" role="tablist"><Link scroll={false} className={!sp.turma ? 'on' : ''} href={link({ turma: undefined, p: undefined })}>Todas as turmas</Link>{turmas?.map(t => <Link scroll={false} key={t.id} className={sp.turma === t.id ? 'on' : ''} href={link({ turma: t.id, p: undefined })}>{t.nome}</Link>)}</div>
          <div className="tabs" role="tablist" style={{ marginTop: 8 }}>{[['', 'Todos', lista.length], ['bad', 'Em risco', cont('bad')], ['warn', 'Atenção', cont('warn')], ['ok', 'No ritmo', cont('ok')]].map(([k, l, n]) => <Link scroll={false} key={k as string} className={(sp.f ?? '') === k ? 'on' : ''} href={link({ f: (k as string) || undefined, p: undefined })}>{l} · {n}</Link>)}</div>
          <div className="list" style={{ marginTop: 6 }}>{vis.length ? vis.map(a => (
            <Link key={a.id} href={`/professor/aluno/${a.id}`} className="li"><Av nome={a.nome} sm /><div className="tx"><b>{a.nome}</b><small>{a.r.motivo} · {fmtMin(a.min_semana)} na semana{a.media != null ? ` · média ${a.media}` : ''}</small></div>
              <div style={{ width: 90 }}><Pb p={(a.min_semana / a.meta_semanal_min) * 100} cls={a.r.nivel === 'ok' ? 'ok' : ''} /></div><span className={`pill ${a.r.nivel}`}>{a.r.rotulo}</span></Link>))
            : <div className="empty">Nenhum aluno por aqui.</div>}</div>
          <Paginacao pagina={pagina} total={filtrada.length} base={base} params={{ ...params, q: busca || undefined }} />
        </div>
      </div>
      <div className="stack">
        <div className="card">
          <h2 className="h2">Ritmo da turma</h2>
          {lista.length === 0 ? <div className="empty">Sem alunos para mostrar.</div> : (
            <div style={{ marginTop: 10 }}>{([['ok', 'No ritmo'], ['warn', 'Atenção'], ['bad', 'Em risco']] as const).map(([k, l]) => (
              <div key={k} className="perf"><span>{l}</span><Pb p={(cont(k) / lista.length) * 100} cls={k === 'ok' ? 'ok' : ''} /><span className={`pill ${k}`}>{cont(k)}</span></div>))}</div>
          )}
          <p className="sub" style={{ marginTop: 12, fontSize: 13 }}>Em risco = 7 dias ou mais sem estudar. Atenção = 3 dias ou mais, ou pouco estudo na semana.</p>
        </div>
        <div className="card">
          <h2 className="h2">Adesão por turma</h2>
          <div className="list" style={{ marginTop: 6 }}>{turmas?.length ? turmas.map(t => {
            const l = todos.filter(a => a.turma_id === t.id), p = l.length ? Math.round((l.filter(a => a.min_semana >= a.meta_semanal_min / 2).length / l.length) * 100) : 0;
            return <div key={t.id} className="li" style={{ padding: '10px 0' }}><div className="tx"><b>{t.nome}</b><small>{l.length} alunos</small><Pb p={p} /></div><b className="num">{p}%</b></div>;
          }) : <div className="empty">Nenhuma turma vinculada a você. Peça à gestão para vincular.</div>}</div>
          <p className="sub" style={{ marginTop: 8, fontSize: 13 }}>Alunos que bateram ao menos metade da meta semanal.</p>
        </div>
      </div>
    </div>
  );
}
