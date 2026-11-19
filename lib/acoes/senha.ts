'use server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { supabaseServer } from '../supabase/server';
import { supabaseAdmin } from '../supabase/admin';
import type { Estado } from '@/components/Form';

// Pede o e-mail de recuperação. A resposta é sempre a mesma, exista o e-mail ou não.
export async function recuperarSenha(_: Estado, fd: FormData): Promise<Estado> {
  const email = String(fd.get('email') ?? '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, msg: 'Informe um e-mail válido.' };
  const h = await headers();
  const origem = process.env.NEXT_PUBLIC_SITE_URL || `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('x-forwarded-host') ?? h.get('host')}`;
  const db = await supabaseServer();
  const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: `${origem}/auth/callback?next=/redefinir` });
  if (error && /rate|limit|seconds/i.test(error.message)) return { ok: false, msg: 'Muitos pedidos seguidos. Espere alguns minutos e tente de novo.' };
  return { ok: true, msg: 'Se esse e-mail tiver cadastro, enviamos um link para criar uma nova senha. Confira também o spam.' };
}

export async function redefinirSenha(_: Estado, fd: FormData): Promise<Estado> {
  const senha = String(fd.get('senha') ?? ''), conf = String(fd.get('conf') ?? '');
  if (senha.length < 8) return { ok: false, msg: 'A senha precisa ter 8 ou mais caracteres.' };
  if (senha !== conf) return { ok: false, msg: 'As duas senhas não são iguais.' };
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, msg: 'O link expirou. Peça um novo em "Esqueci a senha".' };
  const { error } = await db.auth.updateUser({ password: senha });
  if (error) return { ok: false, msg: error.message.includes('different') ? 'Escolha uma senha diferente da atual.' : 'Não foi possível trocar a senha. Tente de novo.' };
  if (user.app_metadata?.trocar_senha) {
    await supabaseAdmin().auth.admin.updateUserById(user.id, { app_metadata: { trocar_senha: false } });
    await db.auth.refreshSession(); // novo token já sem a marca de senha provisória
  }
  redirect('/painel');
}

// Confirma o link de recuperação enviado por e-mail. Usa o token do próprio link (não depende do navegador
// em que o pedido foi feito) e só roda quando a pessoa clica no botão, o que evita que o antivírus/leitor
// de e-mail "gaste" o link antes dela.
export async function confirmarLink(fd: FormData): Promise<void> {
  const token_hash = String(fd.get('token_hash') ?? '');
  if (!token_hash) redirect('/recuperar?erro=1');
  const db = await supabaseServer();
  const { error } = await db.auth.verifyOtp({ token_hash, type: 'recovery' });
  if (error) redirect('/recuperar?erro=1');
  redirect('/redefinir');
}

// ---------- Minha conta (qualquer perfil logado) ----------
async function origemSite() {
  const h = await headers();
  return process.env.NEXT_PUBLIC_SITE_URL || `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('x-forwarded-host') ?? h.get('host')}`;
}

// Confere a senha atual antes de mexer em e-mail ou senha (evita que alguém com o celular desbloqueado troque o acesso).
async function conferirSenhaAtual(db: Awaited<ReturnType<typeof supabaseServer>>, email: string, atual: string) {
  if (!atual) return false;
  const { error } = await db.auth.signInWithPassword({ email, password: atual });
  return !error;
}

export async function trocarSenhaConta(_: Estado, fd: FormData): Promise<Estado> {
  const atual = String(fd.get('atual') ?? ''), nova = String(fd.get('senha') ?? ''), conf = String(fd.get('conf') ?? '');
  if (nova.length < 8) return { ok: false, msg: 'A nova senha precisa ter 8 ou mais caracteres.' };
  if (nova !== conf) return { ok: false, msg: 'As duas senhas novas não são iguais.' };
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user?.email) return { ok: false, msg: 'Sua sessão expirou. Entre de novo.' };
  if (!(await conferirSenhaAtual(db, user.email, atual))) return { ok: false, msg: 'A senha atual está incorreta.' };
  if (atual === nova) return { ok: false, msg: 'Escolha uma senha diferente da atual.' };
  const { error } = await db.auth.updateUser({ password: nova });
  if (error) return { ok: false, msg: error.message.includes('different') ? 'Escolha uma senha diferente da atual.' : 'Não foi possível trocar a senha. Tente de novo.' };
  return { ok: true, msg: 'Senha alterada com sucesso.' };
}

export async function trocarEmailConta(_: Estado, fd: FormData): Promise<Estado> {
  const atual = String(fd.get('atual') ?? ''), novo = String(fd.get('email') ?? '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(novo)) return { ok: false, msg: 'Informe um e-mail válido.' };
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user?.email) return { ok: false, msg: 'Sua sessão expirou. Entre de novo.' };
  if (novo === user.email.toLowerCase()) return { ok: false, msg: 'Esse já é o seu e-mail atual.' };
  if (!(await conferirSenhaAtual(db, user.email, atual))) return { ok: false, msg: 'A senha atual está incorreta.' };
  const { error } = await db.auth.updateUser({ email: novo }, { emailRedirectTo: `${await origemSite()}/auth/callback?next=/conta` });
  if (error) {
    if (/registered|exists|already/i.test(error.message)) return { ok: false, msg: 'Esse e-mail já está em uso por outra conta.' };
    if (/rate|limit|seconds/i.test(error.message)) return { ok: false, msg: 'Muitos pedidos seguidos. Espere alguns minutos e tente de novo.' };
    return { ok: false, msg: 'Não foi possível pedir a troca de e-mail. Tente de novo.' };
  }
  return { ok: true, msg: `Enviamos um link de confirmação para ${novo}. O e-mail só muda depois que você clicar nele. Se o link também chegar no e-mail antigo, confirme nos dois.` };
}

export async function salvarNomeConta(_: Estado, fd: FormData): Promise<Estado> {
  const nome = String(fd.get('nome') ?? '').trim().replace(/\s+/g, ' ');
  if (nome.length < 3) return { ok: false, msg: 'Escreva o nome completo (3+ letras).' };
  if (nome.length > 120) return { ok: false, msg: 'O nome está muito longo.' };
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, msg: 'Sua sessão expirou. Entre de novo.' };
  const { error } = await db.from('profiles').update({ nome }).eq('id', user.id);
  if (error) return { ok: false, msg: 'Não foi possível salvar o nome.' };
  revalidatePath('/', 'layout');
  return { ok: true, msg: 'Nome atualizado.' };
}
