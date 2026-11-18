'use client';
import { useRef, useState } from 'react';
import { Icon } from './Icon';

const TIPOS = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

// Campo de envio de imagem no padrão do site: área para soltar ou escolher, prévia e botão de remover.
// Em edição, `atual` mostra a imagem já salva; remover manda `remover_<name>=1` para a ação.
export function CampoImagem({ id, name, label, dica, atual, max = 4 }: { id: string; name: string; label: string; dica?: string; atual?: string | null; max?: number }) {
  const ref = useRef<HTMLInputElement>(null);
  const [prev, setPrev] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [removida, setRemovida] = useState(false);
  const [erro, setErro] = useState('');
  const [sobre, setSobre] = useState(false);
  const url = prev ?? (removida ? null : atual ?? null);

  function aceitar(f: File | undefined) {
    if (!f) return;
    if (!TIPOS.includes(f.type)) { setErro('Use uma imagem PNG, JPG, WEBP ou GIF.'); if (ref.current) ref.current.value = ''; return; }
    if (f.size > max * 1024 * 1024) { setErro(`Essa imagem tem ${(f.size / 1048576).toFixed(1)} MB. O limite é ${max} MB.`); if (ref.current) ref.current.value = ''; return; }
    setErro(''); setRemovida(false); setNome(f.name);
    setPrev(old => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(f); });
  }
  function soltar(e: React.DragEvent) {
    e.preventDefault(); setSobre(false);
    const f = e.dataTransfer.files?.[0]; if (!f || !ref.current) return;
    const dt = new DataTransfer(); dt.items.add(f); ref.current.files = dt.files; aceitar(f);
  }
  function remover() {
    if (ref.current) ref.current.value = '';
    setPrev(old => { if (old) URL.revokeObjectURL(old); return null; });
    setNome(''); setErro(''); if (atual) setRemovida(true);
  }
  return (
    <div className="field full">
      <label htmlFor={id}>{label}</label>
      <input ref={ref} id={id} name={name} type="file" accept={TIPOS.join(',')} className="sr" onChange={e => aceitar(e.target.files?.[0])} />
      {removida && <input type="hidden" name={`remover_${name}`} value="1" />}
      {url ? (
        <div className="img-ok">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Prévia da imagem" />
          <div className="img-ac">
            <b className="trunc">{nome || 'Imagem atual'}</b>
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="btn sm" onClick={() => ref.current?.click()}><Icon n="file" s={14} /> Trocar</button>
              <button type="button" className="btn sm ghost" onClick={remover}>Remover</button>
            </div>
          </div>
        </div>
      ) : (
        <button type="button" className={`drop${sobre ? ' over' : ''}`} onClick={() => ref.current?.click()}
          onDragOver={e => { e.preventDefault(); setSobre(true); }} onDragLeave={() => setSobre(false)} onDrop={soltar}>
          <span className="drop-i"><Icon n="plus" s={20} /></span>
          <b>Escolher imagem</b>
          <small>ou arraste e solte aqui</small>
        </button>
      )}
      <small className="sub">{dica ?? `PNG, JPG, WEBP ou GIF, até ${max} MB.`}</small>
      {erro && <small className="erro" role="alert">{erro}</small>}
    </div>
  );
}
