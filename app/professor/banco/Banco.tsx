'use client';
import { useState } from 'react';
import { Form, type Estado } from '@/components/Form';
import { Bloco } from '@/components/Painel';
import { CampoImagem } from '@/components/CampoImagem';
import { Acao } from '@/components/Form';

type A = (p: Estado, f: FormData) => Promise<Estado>;
type D = { id: string; nome: string; area: string }; type C = { id: string; area: string; codigo: string; nome: string }; type T = { id: string; nome: string };
type Q = { id: string; enunciado: string; disciplina_id: string; n: number; comp: string | null; competencia_id: string | null; alternativas: string[]; correta: number; comentario: string | null; imagem_url: string | null; comentario_imagem_url: string | null; arquivada: boolean };

export function Banco({ disciplinas, competencias, turmas, modulos, questoes, criarQuestao, editarQuestao, arquivarQuestao, criarSimulado, padrao }: { padrao?: string;
  disciplinas: D[]; competencias: C[]; turmas: T[]; modulos: { id: string; nome: string; disciplina_id: string }[]; questoes: Q[]; criarQuestao: A; editarQuestao: A; arquivarQuestao: (id: string, arquivada: boolean) => Promise<void>; criarSimulado: A;
}) {
  const [sel, setSel] = useState<string[]>([]); const [tq, setTq] = useState('2');
  const [aba, setAba] = useState<'banco' | 'nova' | 'simulado'>('banco'); const [fd, setFd] = useState(''); const [edit, setEdit] = useState<Q | null>(null); const [arq, setArq] = useState(false);
  const [d, setD] = useState(disciplinas.find(x => x.id === padrao)?.id ?? disciplinas[0]?.id ?? '');
  const area = disciplinas.find(x => x.id === d)?.area;
  const ativas = questoes.filter(q => !q.arquivada);
  const lista = questoes.filter(q => (!fd || q.disciplina_id === fd) && (arq || !q.arquivada));
  return (
    <>
      <div className="tabs" role="tablist">{([['banco', 'Banco'], ['nova', 'Nova questão'], ['simulado', 'Montar simulado']] as const).map(([k, l]) => <button key={k} role="tab" className={aba === k && !edit ? 'on' : ''} onClick={() => { setAba(k); setEdit(null); }}>{l}</button>)}{edit && <button role="tab" className="on">Editar questão</button>}</div>
      {aba === 'banco' && !edit && (
        <div className="card">
          <div className="row" style={{ marginBottom: 10 }}><label className="sr" htmlFor="filtro">Disciplina</label><select id="filtro" className="inp" style={{ maxWidth: 260 }} value={fd} onChange={e => setFd(e.target.value)}><option value="">Todas as disciplinas</option>{disciplinas.map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}</select><label className="chip" style={{ cursor: 'pointer' }}><input type="checkbox" checked={arq} onChange={e => setArq(e.target.checked)} style={{ marginRight: 6 }} />Mostrar arquivadas</label><span className="sub">{lista.length} questões</span></div>
          <div className="list">{lista.length ? lista.map(q => <div key={q.id} className="li" style={q.arquivada ? { opacity: .6 } : undefined}><div className="tx"><b className="trunc" style={{ display: 'block' }}>{q.enunciado}</b><small>{disciplinas.find(x => x.id === q.disciplina_id)?.nome}{q.comp ? ` · comp. ${q.comp}` : ''} · {q.n} alternativas{q.imagem_url ? ' · com imagem' : ''}</small></div>
            {q.arquivada && <span className="pill">Arquivada</span>}
            <button type="button" className="btn sm" onClick={() => setEdit(q)}>Editar</button>
            <Acao className="btn sm ghost" confirmar={q.arquivada ? undefined : 'Arquivar esta questão? Ela sai do banco e da montagem de simulados, mas continua nos simulados já publicados.'} action={arquivarQuestao.bind(null, q.id, !q.arquivada) as any}>{q.arquivada ? 'Restaurar' : 'Arquivar'}</Acao></div>) : <div className="empty">Nenhuma questão ainda.</div>}</div>
        </div>
      )}
      {aba === 'nova' && !edit && (
        <Bloco ic="plus" titulo="Nova questão" sub="Enunciado, alternativas e o comentário que o aluno vê depois da entrega.">
          <FormQuestao action={criarQuestao} botao="Salvar no banco" disciplinas={disciplinas} competencias={competencias} padrao={d} />
        </Bloco>
      )}
      {edit && (
        <Bloco ic="file" titulo="Editar questão" sub="As mudanças valem também nos simulados que já usam esta questão.">
          <FormQuestao key={edit.id} action={editarQuestao} botao="Salvar alterações" disciplinas={disciplinas} competencias={competencias} padrao={edit.disciplina_id} q={edit} />
          <div className="row" style={{ marginTop: 10 }}><button className="btn" type="button" onClick={() => setEdit(null)}>Voltar ao banco</button></div>
        </Bloco>
      )}
      {aba === 'simulado' && !edit && (
        <Bloco ic="exam" titulo="Montar simulado" sub="Escolha as questões e o tempo de cada uma. O total é calculado sozinho.">
          <Form action={criarSimulado} botao="Publicar simulado">
            <div className="field full"><label htmlFor="st">Título</label><input id="st" name="titulo" className="inp" required /></div>
            <div className="field"><label htmlFor="sd">Disciplina</label><select id="sd" name="disciplina_id" className="inp" value={d} onChange={e => setD(e.target.value)}><option value="">Geral (várias)</option>{disciplinas.map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}</select></div>
            <div className="field"><label htmlFor="sm">Tempo por questão (min)</label><input id="sm" name="tempo_questao" type="number" min={0.5} step={0.5} value={tq} onChange={e => setTq(e.target.value)} className="inp" />
              <small className="sub">{sel.length ? `Total: ${Math.min(300, Math.max(5, Math.ceil((Number(tq) || 0) * sel.length)))} min para ${sel.length} questão(ões).` : 'O total é calculado: tempo por questão × número de questões escolhidas.'}</small></div>
            <div className="field"><label htmlFor="smo">Encaixar na trilha (opcional)</label><select id="smo" name="modulo_id" className="inp" defaultValue=""><option value="">Fora da trilha</option>{modulos.filter(m => m.disciplina_id === d).map(m => <option key={m.id} value={m.id}>Fim de “{m.nome}”</option>)}</select></div>
            <div className="field"><label htmlFor="sp">Prazo (opcional)</label><input id="sp" name="prazo" type="date" className="inp" /></div>
            <div className="field full"><span className="sub" style={{ fontSize: 13, fontWeight: 500 }}>Turmas</span><div className="chips">{turmas.map(t => <label key={t.id} className="chip" style={{ cursor: 'pointer' }}><input type="checkbox" name="turmas" value={t.id} defaultChecked style={{ marginRight: 6 }} />{t.nome}</label>)}</div></div>
            <div className="field full"><span className="sub" style={{ fontSize: 13, fontWeight: 500 }}>Questões ({ativas.filter(q => !d || q.disciplina_id === d).length} da disciplina escolhida)</span>
              <div className="list" style={{ maxHeight: 320, overflow: 'auto', border: '1px solid var(--line)', borderRadius: 10, padding: '0 12px' }}>
                {ativas.filter(q => !d || q.disciplina_id === d).map(q => <label key={q.id} className="li" style={{ cursor: 'pointer' }}><input type="checkbox" name="questoes" value={q.id} checked={sel.includes(q.id)} onChange={e => setSel(e.target.checked ? [...sel, q.id] : sel.filter(x => x !== q.id))} /><div className="tx"><b className="trunc" style={{ display: 'block' }}>{q.enunciado}</b><small>{q.comp ? `comp. ${q.comp}` : 'sem competência'}</small></div></label>)}
              </div></div>
          </Form></Bloco>
      )}
    </>
  );
}

// Formulário de questão, usado para criar e para editar.
function FormQuestao({ action, botao, disciplinas, competencias, padrao, q }: { action: A; botao: string; disciplinas: D[]; competencias: C[]; padrao: string; q?: Q }) {
  const [d, setD] = useState(padrao);
  const area = disciplinas.find(x => x.id === d)?.area;
  return (
    <Form action={action} botao={botao}>
      {q && <input type="hidden" name="id" value={q.id} />}
      <div className="field"><label htmlFor="qd">Disciplina</label><select id="qd" name="disciplina_id" className="inp" value={d} onChange={e => setD(e.target.value)}>{disciplinas.map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}</select></div>
      <div className="field"><label htmlFor="qc">Competência</label><select id="qc" name="competencia_id" className="inp" defaultValue={q?.competencia_id ?? ''}><option value="">Nenhuma</option>{competencias.filter(c => c.area === area).map(c => <option key={c.id} value={c.id}>{c.codigo} · {c.nome}</option>)}</select><input name="competencia_nova" className="inp" placeholder="ou escreva outra competência" maxLength={80} style={{ marginTop: 6 }} /></div>
      <div className="field full"><label htmlFor="qe">Enunciado</label><textarea id="qe" name="enunciado" className="inp" required defaultValue={q?.enunciado} /></div>
      <CampoImagem id="qi" name="imagem" label="Imagem do enunciado (opcional)" atual={q?.imagem_url} dica="Gráfico, figura, mapa, charge ou tabela. PNG, JPG, WEBP ou GIF, até 4 MB." />
      {[0, 1, 2, 3, 4].map(i => <div key={i} className="field full"><label htmlFor={`a${i}`}>Alternativa {'ABCDE'[i]}{i > 1 ? ' (opcional)' : ''}</label><div className="row" style={{ flexWrap: 'nowrap' }}><input id={`a${i}`} name={`alt${i}`} className="inp" required={i < 2} defaultValue={q?.alternativas?.[i] ?? ''} /><label className="chip" style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}><input type="radio" name="correta" value={i} required defaultChecked={q ? q.correta === i : false} style={{ marginRight: 6 }} />correta</label></div></div>)}
      <div className="field full"><label htmlFor="qj">Comentário do gabarito (aparece depois da entrega)</label><textarea id="qj" name="comentario" className="inp" defaultValue={q?.comentario ?? ''} /></div>
      <CampoImagem id="qji" name="comentario_imagem" label="Imagem no comentário do gabarito (opcional)" atual={q?.comentario_imagem_url} dica="Resolução desenhada, esquema ou passo a passo." />
    </Form>
  );
}
