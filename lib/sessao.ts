import { cache } from 'react';
import { redirect } from 'next/navigation';
import { supabaseServer } from './supabase/server';
import type { Papel, Perfil } from './tipos';

// Autenticação e perfil são buscados uma única vez por requisição (layout e página compartilham o resultado).
const carregar = cache(async () => {
  const db = await supabaseServer();
  // getClaims valida o token localmente (sem ida ao servidor de Auth) quando o projeto usa chaves assimétricas;
  // caso contrário o próprio SDK confirma com o Auth. Evita uma espera extra em cada troca de tela.
  const { data } = await db.auth.getClaims();
  const c = data?.claims as { sub?: string; app_metadata?: { trocar_senha?: boolean } } | undefined;
  let user: { id: string; app_metadata: { trocar_senha?: boolean } } | null = c?.sub ? { id: c.sub, app_metadata: { trocar_senha: !!c.app_metadata?.trocar_senha } } : null;
  // O token guarda uma cópia do app_metadata que pode estar velha (ex.: logo depois de criar a própria senha).
  // Enquanto a marca "trocar_senha" estiver ligada nele, confirma no servidor de Auth para não entrar em loop de redirecionamento.
  if (user?.app_metadata?.trocar_senha) {
    const { data: { user: fresco } } = await db.auth.getUser();
    user = fresco ? { id: fresco.id, app_metadata: { trocar_senha: !!fresco.app_metadata?.trocar_senha } } : null;
  }
  if (!user) return { db, user: null, perfil: null };
  const { data: perfil } = await db.from('profiles').select('*').eq('id', user.id).single<Perfil>();
  return { db, user, perfil };
});

// Retorna o perfil do usuário logado ou redireciona. Use em toda página privada.
export async function exigirPerfil(papel?: Papel): Promise<{ perfil: Perfil; db: Awaited<ReturnType<typeof supabaseServer>> }> {
  const { db, user, perfil } = await carregar();
  if (!user) redirect('/entrar');
  if (user.app_metadata?.trocar_senha) redirect('/trocar-senha');
  if (!perfil) redirect('/entrar');
  if (perfil.status !== 'ativo') redirect('/aguardando');
  if (papel && perfil.papel !== papel) redirect(`/${perfil.papel}`);
  return { perfil, db };
}
