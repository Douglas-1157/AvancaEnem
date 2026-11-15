import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { confirmarLink } from '@/lib/acoes/senha';

export const dynamic = 'force-dynamic';

// Destino do link do e-mail de recuperação de senha: um clique confirma e leva à criação da nova senha.
export default async function Confirmar({ searchParams }: { searchParams: Promise<{ token_hash?: string }> }) {
  const { token_hash } = await searchParams;
  return (
    <div className="login full-bleed"><div className="lform">
      <div className="row"><Logo /><div><b style={{ fontWeight: 600 }}>Avança ENEM</b><div className="sub" style={{ fontSize: 13 }}>Plataforma de estudos</div></div></div>
      <h1 className="h1">Criar nova senha</h1>
      {token_hash ? (
        <form action={confirmarLink} className="form">
          <input type="hidden" name="token_hash" value={token_hash} />
          <p className="sub">Toque em continuar para escolher sua nova senha.</p>
          <div className="full row"><button className="btn pri" type="submit">Continuar</button></div>
        </form>
      ) : (
        <>
          <p className="erro" role="alert">Link inválido. Peça um novo em “Esqueci a senha”.</p>
          <Link href="/recuperar" className="btn pri" style={{ alignSelf: 'flex-start' }}>Pedir novo link</Link>
        </>
      )}
    </div></div>
  );
}
