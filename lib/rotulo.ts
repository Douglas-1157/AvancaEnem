import type { Perfil } from './tipos';

// Texto do cargo mostrado no menu e no topo: "Gestão", "Professor · Química" etc. Igual em todas as telas.
export async function rotuloDoPapel(db: any, perfil: Perfil): Promise<string> {
  if (perfil.papel === 'aluno') return 'Aluno';
  const base = perfil.papel === 'gestao' ? 'Gestão' : 'Professor';
  if (!perfil.disciplina_id) return base;
  const { data } = await db.from('disciplinas').select('nome').eq('id', perfil.disciplina_id).maybeSingle();
  return data?.nome ? `${base} · ${data.nome}` : base;
}
