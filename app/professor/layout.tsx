import { redirect } from 'next/navigation';
import { exigirPerfil } from '@/lib/sessao';
import { menuDe } from '@/lib/menus';
import { Shell } from '@/components/Shell';
import { rotuloDoPapel } from '@/lib/rotulo';

// Professores e a gestão usam estas telas de ensino.
export default async function ProfessorLayout({ children }: { children: React.ReactNode }) {
  const { perfil, db } = await exigirPerfil();
  if (perfil.papel === 'aluno') redirect('/aluno');
  const cont = async (t: string, f: (q: any) => any) => (await f(db.from(t).select('id', { count: 'exact', head: true }))).count ?? 0;
  const [duvidas, redacoes, cadastros, rotulo] = await Promise.all([
    cont('duvidas', q => q.eq('status', 'pendente')),
    cont('redacoes', q => q.eq('status', 'enviada')),
    perfil.papel === 'gestao' ? cont('profiles', q => q.eq('status', 'pendente')) : Promise.resolve(0),
    rotuloDoPapel(db, perfil),
  ]);
  const { menu, extra } = menuDe(perfil.papel, { duvidas, redacoes, cadastros });
  return <Shell menu={menu} extra={extra} nome={perfil.nome} papel={rotulo}>{children}</Shell>;
}
