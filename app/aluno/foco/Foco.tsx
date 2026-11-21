'use client';
import { useRouter } from 'next/navigation';
import { useFoco, mmss } from '@/lib/foco';

export function Foco() {
  const f = useFoco(); const r = useRouter();
  const concluir = async (min: number) => { if (await f.concluir(min)) r.refresh(); };
  return (
    <div className="card">
      <div className="row sb"><span className="pill wip">Bloco de foco</span>
        <div className="tabs">{[15, 25, 50].map(m => <button key={m} className={f.dur === m ? 'on' : ''} onClick={() => f.trocar(m)} disabled={f.rodando}>{m} min</button>)}</div></div>
      <div className={`ptime${f.rodando ? ' run' : ''}`} style={{ marginTop: 16 }} role="timer" aria-live="off">{mmss(f.left)}</div>
      <div style={{ margin: '4px 0 18px' }}><div className="pb"><i style={{ width: `${Math.round(((f.dur * 60 - f.left) / (f.dur * 60)) * 100)}%` }} /></div></div>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn pri lg" onClick={f.alternar}>{f.rodando ? 'Pausar' : f.left < f.dur * 60 ? 'Continuar' : 'Iniciar'}</button>
        <button className="btn" onClick={f.reiniciar}>Reiniciar</button>
        <button className="btn" onClick={() => concluir(f.gasto)}>Concluir agora</button>
      </div>
      <p className="sub" style={{ marginTop: 14, fontSize: 13, textAlign: 'center' }}>O cronômetro continua correndo se você trocar de tela. Ele aparece no canto superior direito.</p>
      {f.msg && <p className="note" style={{ marginTop: 14 }} role="status">{f.msg}</p>}
    </div>
  );
}
