'use client';
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type Estado = { ok: boolean; msg: string; csv?: string; arquivo?: string };
export const vazio: Estado = { ok: false, msg: '' };

// Cartão de confirmação dentro do próprio site (no lugar da janela do navegador).
export function Confirmacao({ texto, perigo = false, rotulo = 'Confirmar', onOk, onCancel }: { texto: string; perigo?: boolean; rotulo?: string; onOk: () => void; onCancel: () => void }) {
  const cancelar = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelar.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', esc); return () => document.removeEventListener('keydown', esc);
  }, [onCancel]);
  return createPortal(
    <div className="confirma-b" onPointerDown={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="confirma" role="alertdialog" aria-modal="true" aria-describedby="confirma-txt">
        <p id="confirma-txt">{texto}</p>
        <div className="row">
          <button type="button" className="btn" ref={cancelar} onClick={onCancel}>Cancelar</button>
          <button type="button" className={`btn pri${perigo ? ' perigo-solido' : ''}`} onClick={onOk}>{rotulo}</button>
        </div>
      </div>
    </div>, document.body);
}

// Formulário ligado a uma Server Action, com mensagem de sucesso/erro embaixo.
export function Form({ action, children, className = 'form', botao = 'Salvar', pri = true, perigo = false, desabilitado = false, confirmar }: {
  action: (prev: Estado, fd: FormData) => Promise<Estado>; children: ReactNode; className?: string; botao?: string; pri?: boolean;
  perigo?: boolean; desabilitado?: boolean; confirmar?: (fd: FormData) => string | null;
}) {
  const [st, fn, pend] = useActionState(action, vazio);
  const ref = useRef<HTMLFormElement>(null);
  const [pergunta, setPergunta] = useState<{ texto: string; fd: FormData } | null>(null);
  // Envia sem o "reset automático" do React: se der erro, o que a pessoa digitou fica. Só limpa quando salva com sucesso.
  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    const texto = confirmar?.(fd); if (texto) { setPergunta({ texto, fd }); return; }
    startTransition(() => fn(fd));
  }
  useEffect(() => { if (st.ok && st.msg) ref.current?.reset(); }, [st]);
  function baixar() {
    if (!st.csv) return;
    const blob = new Blob(['﻿' + st.csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = st.arquivo ?? 'senhas.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  return (
    <form ref={ref} onSubmit={enviar} className={className}>
      {children}
      <div className="full row">
        <button className={`btn${pri ? ' pri' : ''}${perigo ? ' perigo' : ''}`} type="submit" disabled={pend || desabilitado}>{pend ? 'Aguarde…' : botao}</button>
        {st.msg && <span className={st.ok ? 'okmsg' : 'erro'} role={st.ok ? 'status' : 'alert'}>{st.msg}</span>}
        {st.csv && <button type="button" className="btn" onClick={baixar}>Baixar lista de senhas (CSV)</button>}
      </div>
      {pergunta && <Confirmacao texto={pergunta.texto} perigo={perigo} rotulo={botao} onCancel={() => setPergunta(null)} onOk={() => { const fd = pergunta.fd; setPergunta(null); startTransition(() => fn(fd)); }} />}
    </form>
  );
}

// Botão que dispara uma Server Action simples (aprovar, recusar, apagar...)
export function Acao({ action, children, className = 'btn sm', confirmar }: { action: () => Promise<Estado | void>; children: ReactNode; className?: string; confirmar?: string }) {
  const [st, fn, pend] = useActionState(async (): Promise<Estado> => (await action()) ?? vazio, vazio);
  const [pergunta, setPergunta] = useState(false);
  return (
    <form action={confirmar ? undefined : fn} onSubmit={confirmar ? (e => { e.preventDefault(); setPergunta(true); }) : undefined} style={{ display: 'inline' }}>
      <button className={className} type="submit" disabled={pend}>{children}</button>
      {st.msg && <small className={st.ok ? 'okmsg' : 'erro'} role="alert" style={{ display: 'block' }}>{st.msg}</small>}
      {pergunta && confirmar && <Confirmacao texto={confirmar} perigo rotulo="Confirmar" onCancel={() => setPergunta(false)} onOk={() => { setPergunta(false); startTransition(() => fn()); }} />}
    </form>
  );
}
