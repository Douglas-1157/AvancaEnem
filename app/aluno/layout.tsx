import { exigirPerfil } from '@/lib/sessao';
import { menuDe } from '@/lib/menus';
import { supabaseServer } from '@/lib/supabase/server';
import { Shell } from '@/components/Shell';

export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  // RLS já limita as dúvidas ao próprio aluno: a contagem roda junto com o carregamento do perfil.
  const [{ perfil }, { count }] = await Promise.all([
    exigirPerfil('aluno'),
    (await supabaseServer()).from('duvidas').select('id', { count: 'exact', head: true }).eq('status', 'respondida').is('visto_em', null),
  ]);
  const { menu, extra } = menuDe('aluno', { duvidas: count ?? 0, redacoes: 0, cadastros: 0 });
  return <Shell menu={menu} extra={extra} nome={perfil.nome} papel="Aluno">{children}</Shell>;
}
