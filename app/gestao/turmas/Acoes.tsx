'use client';
import { useState } from 'react';
import { Form } from '@/components/Form';
import { excluirPessoa, moverAluno } from '@/lib/acoes/equipe';

type T = { id: string; nome: string };

// Mudar um aluno de turma exige escolher outra turma e confirmar, para evitar toque sem querer.
export function MoverAluno({ id, nome, turmaId, turmas }: { id: string; nome: string; turmaId: string | null; turmas: T[] }) {
  const [novo, setNovo] = useState(turmaId ?? '');
  const nomeDe = (t: string) => turmas.find(x => x.id === t)?.nome ?? 'sem turma';
  return (
    <Form action={moverAluno} className="rowd-f" botao="Confirmar mudança" pri={false} desabilitado={novo === (turmaId ?? '')}
      confirmar={() => `Mover ${nome} de ${nomeDe(turmaId ?? '')} para ${nomeDe(novo)}?`}>
      <input type="hidden" name="id" value={id} />
      <div className="field"><label htmlFor={`mv${id}`}>Mudar de turma</label>
        <select id={`mv${id}`} name="turma_id" className="inp" value={novo} onChange={e => setNovo(e.target.value)}>
          <option value="">Sem turma</option>{turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select></div>
    </Form>
  );
}

// Exclusão só sai com justificativa; ela fica registrada no histórico de exclusões.
export function ExcluirPessoa({ id, nome }: { id: string; nome: string }) {
  return (
    <Form action={excluirPessoa} className="rowd-f" botao="Excluir definitivamente" pri={false} perigo
      confirmar={() => `Excluir ${nome} de forma definitiva? O histórico dessa pessoa (progresso, redações, dúvidas) será apagado e não dá para desfazer.`}>
      <input type="hidden" name="id" value={id} />
      <div className="field"><label htmlFor={`ex${id}`}>Justificativa da exclusão (obrigatória)</label>
        <textarea id={`ex${id}`} name="motivo" className="inp" required minLength={5} maxLength={500} placeholder="Ex.: aluno transferido para outra escola" /></div>
    </Form>
  );
}
