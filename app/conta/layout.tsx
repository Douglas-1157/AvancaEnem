import { exigirPerfil } from '@/lib/sessao';
import { menuDe } from '@/lib/menus';
import { Shell } from '@/components/Shell';

// "Minha conta" é igual para aluno, professor e gestão; só muda o menu em volta.
export default async function ContaLayout({ children }: { children: React.ReactNode }) {
  const { perfil } = await exigirPerfil();
  const { menu, extra } = menuDe(perfil.papel);
  const papel = perfil.papel === 'aluno' ? 'Aluno' : perfil.papel === 'gestao' ? 'Gestão' : 'Professor';
  return <Shell menu={menu} extra={extra} nome={perfil.nome} papel={papel}>{children}</Shell>;
}
