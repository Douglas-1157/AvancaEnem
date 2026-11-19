import { exigirPerfil } from '@/lib/sessao';
import { Form } from '@/components/Form';
import { CampoSenha } from '@/components/CampoSenha';
import { Cab } from '@/components/Painel';
import { trocarEmailConta, trocarSenhaConta, salvarNomeConta } from '@/lib/acoes/senha';

export const dynamic = 'force-dynamic';

export default async function Conta() {
  const { perfil, db } = await exigirPerfil();
  const { data: { user } } = await db.auth.getUser();
  const email = user?.email ?? '';
  const pendente = (user as any)?.new_email as string | undefined;
  const papel = perfil.papel === 'aluno' ? 'Aluno' : perfil.papel === 'gestao' ? 'Gestão' : 'Professor';
  return (
    <>
      <Cab titulo="Minha conta" sub="Dados de acesso à plataforma." info={[['Nome', perfil.nome], ['Perfil', papel]]} />
      <div className="cols">
        <div className="stack">
          <div className="card">
            <h2 className="h2">Seu perfil</h2>
            <p className="sub" style={{ margin: '4px 0 12px' }}>O nome aparece para a escola na plataforma.</p>
            <Form action={salvarNomeConta} botao="Salvar nome">
              <div className="field full"><label htmlFor="nm">Nome completo</label><input id="nm" name="nome" className="inp" required minLength={3} maxLength={120} defaultValue={perfil.nome} autoComplete="name" /></div>
            </Form>
          </div>
          <div className="card">
            <h2 className="h2">E-mail de acesso</h2>
            <p className="sub" style={{ margin: '4px 0 12px' }}>Hoje você entra com <b>{email}</b>.{pendente ? <> Troca pendente para <b>{pendente}</b>: confirme pelo link que enviamos.</> : null}</p>
            <Form action={trocarEmailConta} botao="Pedir troca de e-mail">
              <div className="field full"><label htmlFor="ne">Novo e-mail</label><input id="ne" name="email" type="email" className="inp" required autoComplete="email" /></div>
              <div className="field full"><label htmlFor="se">Sua senha atual</label><CampoSenha id="se" name="atual" autoComplete="current-password" minLength={1} /></div>
            </Form>
          </div>
        </div>
        <div className="stack">
          <div className="card">
            <h2 className="h2">Trocar senha</h2>
            <p className="sub" style={{ margin: '4px 0 12px' }}>Use 8 ou mais caracteres. Se esqueceu a atual, saia e use “Esqueci a senha” na tela de login.</p>
            <Form action={trocarSenhaConta} botao="Salvar nova senha">
              <div className="field full"><label htmlFor="sa">Senha atual</label><CampoSenha id="sa" name="atual" autoComplete="current-password" minLength={1} /></div>
              <div className="field full"><label htmlFor="sn">Nova senha</label><CampoSenha id="sn" name="senha" autoComplete="new-password" /></div>
              <div className="field full"><label htmlFor="sc">Repita a nova senha</label><CampoSenha id="sc" name="conf" autoComplete="new-password" /></div>
            </Form>
          </div>
        </div>
      </div>
    </>
  );
}
