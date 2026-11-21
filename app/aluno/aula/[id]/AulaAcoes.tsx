'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { concluirItem, enviarDuvida } from '@/lib/acoes/aluno';
import { Icon } from '@/components/Icon';

export function AulaAcoes({ alunoId, itemId, tipo, concluido, titulo, proxima }: { alunoId: string; itemId: string; tipo: 'video' | 'pdf'; concluido: boolean; titulo: string; proxima: string | null }) {
  const [pend, start] = useTransition(); const [erro, setErro] = useState(''); const [duvida, setDuvida] = useState(false); const [txt, setTxt] = useState(''); const [env, setEnv] = useState(false);
  const router = useRouter();
  // Tempo real de estudo: conta os segundos na aula (vídeo: só com a tela visível; PDF: sempre, pois abre em outra aba).
  // Fica guardado no aparelho para somar se a pessoa sair e voltar; o banco limita ao tempo cadastrado do item.
  const chave = `aula:${alunoId}:${itemId}`; const seg = useRef(0);
  useEffect(() => {
    if (concluido) return;
    try { seg.current = Math.min(36000, Number(localStorage.getItem(chave)) || 0); } catch { /* sem armazenamento */ }
    let ultimo = Date.now();
    const salvar = () => { try { localStorage.setItem(chave, String(Math.round(seg.current))); } catch { /* ignore */ } };
    const t = setInterval(() => {
      const agora = Date.now(), delta = Math.min(agora - ultimo, 5000); ultimo = agora;
      if (tipo === 'pdf' || document.visibilityState === 'visible') { seg.current = Math.min(36000, seg.current + delta / 1000); }
    }, 1000);
    const volta = () => { ultimo = Date.now(); };
    document.addEventListener('visibilitychange', volta); window.addEventListener('pagehide', salvar);
    const g = setInterval(salvar, 10000);
    return () => { clearInterval(t); clearInterval(g); document.removeEventListener('visibilitychange', volta); window.removeEventListener('pagehide', salvar); salvar(); };
  }, [chave, concluido, tipo]);
  const concluir = () => start(async () => {
    const r = await concluirItem(itemId, Math.round(seg.current));
    if (!r.ok) setErro(r.erro ?? 'Erro'); else { try { localStorage.removeItem(chave); } catch { /* ignore */ } router.refresh(); }
  });
  const perguntar = () => start(async () => { const r = await enviarDuvida(txt, titulo, itemId); if (!r.ok) setErro(r.erro ?? 'Erro'); else { setEnv(true); setDuvida(false); setTxt(''); } });
  return (
    <>
      <div className="row">
        {concluido ? <><span className="pill ok"><Icon n="check" s={12} /> Concluída</span>{proxima && <Link href={proxima} className="btn pri lg">Próxima etapa <Icon n="arrow" s={16} /></Link>}</>
          : <button className="btn pri lg" onClick={concluir} disabled={pend}><Icon n="check" s={16} /> {tipo === 'pdf' ? 'Marcar como lida' : 'Marcar como assistida'}</button>}
        <button className="btn" onClick={() => setDuvida(!duvida)}><Icon n="chat" s={16} /> Tenho uma dúvida</button>
      </div>
      {env && <p className="okmsg">Dúvida enviada ao professor. Você vê a resposta na aba Dúvidas.</p>}
      {duvida && (
        <div className="card" style={{ display: 'grid', gap: 10 }}>
          <label className="sub" htmlFor="dv">Sua pergunta sobre “{titulo}”</label>
          <textarea id="dv" className="inp" value={txt} onChange={e => setTxt(e.target.value)} maxLength={2000} />
          <div className="row"><button className="btn pri" disabled={pend || txt.trim().length < 3} onClick={perguntar}>Enviar</button><button className="btn" onClick={() => setDuvida(false)}>Cancelar</button></div>
        </div>
      )}
      {erro && <p className="erro" role="alert">{erro}</p>}
    </>
  );
}
