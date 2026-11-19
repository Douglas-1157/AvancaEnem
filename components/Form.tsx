'use client';
import { startTransition, useActionState, useEffect, useRef, type FormEvent, type ReactNode } from 'react';

export type Estado = { ok: boolean; msg: string; csv?: string; arquivo?: string };
export const vazio: Estado = { ok: false, msg: '' };

// Formulário ligado a uma Server Action, com mensagem de sucesso/erro embaixo.
export function Form({ action, children, className = 'form', botao = 'Salvar', pri = true }: {
  action: (prev: Estado, fd: FormData) => Promise<Estado>; children: ReactNode; className?: string; botao?: string; pri?: boolean;
}) {
  const [st, fn, pend] = useActionState(action, vazio);
  const ref = useRef<HTMLFormElement>(null);
  // Envia sem o "reset automático" do React: se der erro, o que a pessoa digitou fica. Só limpa quando salva com sucesso.
  function enviar(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => fn(fd)); }
  useEffect(() => { if (st.ok && st.msg) ref.current?.reset(); }, [st]);
  function baixar() {
    if (!st.csv) return;
    const blob = new Blob(['\uFEFF' + st.csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = st.arquivo ?? 'senhas.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  return (
    <form ref={ref} onSubmit={enviar} className={className}>
      {children}
      <div className="full row">
        <button className={`btn${pri ? ' pri' : ''}`} type="submit" disabled={pend}>{pend ? 'Aguarde…' : botao}</button>
        {st.msg && <span className={st.ok ? 'okmsg' : 'erro'} role={st.ok ? 'status' : 'alert'}>{st.msg}</span>}
        {st.csv && <button type="button" className="btn" onClick={baixar}>Baixar lista de senhas (CSV)</button>}
      </div>
    </form>
  );
}

// Botão que dispara uma Server Action simples (aprovar, recusar, apagar...)
export function Acao({ action, children, className = 'btn sm', confirmar }: { action: () => Promise<Estado | void>; children: ReactNode; className?: string; confirmar?: string }) {
  const [st, fn, pend] = useActionState(async (): Promise<Estado> => { if (confirmar && !window.confirm(confirmar)) return vazio; return (await action()) ?? vazio; }, vazio);
  return <form action={fn} style={{ display: 'inline' }}><button className={className} type="submit" disabled={pend}>{children}</button>{st.msg && <small className={st.ok ? 'okmsg' : 'erro'} role="alert" style={{ display: 'block' }}>{st.msg}</small>}</form>;
}
