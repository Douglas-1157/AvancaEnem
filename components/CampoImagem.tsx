'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

const TIPOS = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const ORIGINAL_MAX = 25; // MB aceitos na escolha; depois a imagem é reduzida

// Reduz fotos grandes no próprio aparelho (lado máximo 1800 px, JPEG): envia rápido e cabe no limite do servidor.
async function reduzir(f: File): Promise<File> {
  if (f.type === 'image/gif' || f.size < 700 * 1024) return f;
  try {
    const bmp = await createImageBitmap(f);
    const esc = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * esc); c.height = Math.round(bmp.height * esc);
    const g = c.getContext('2d'); if (!g) return f;
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height);
    const blob: Blob | null = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.86));
    if (!blob || blob.size >= f.size) return f;
    return new File([blob], f.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch { return f; }
}

// Campo de envio de imagem no padrão do site: área para soltar ou escolher, prévia e botão de remover.
// Em edição, `atual` mostra a imagem já salva; remover manda `remover_<name>=1` para a ação.
export function CampoImagem({ id, name, label, dica, atual, max = 4 }: { id: string; name: string; label: string; dica?: string; atual?: string | null; max?: number }) {
  const ref = useRef<HTMLInputElement>(null);
  const [prev, setPrev] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [removida, setRemovida] = useState(false);
  const [erro, setErro] = useState('');
  const [sobre, setSobre] = useState(false); const [carregando, setCarregando] = useState(false);
  const url = prev ?? (removida ? null : atual ?? null);

  // Limpa a prévia quando o formulário é reiniciado (depois de salvar).
  useEffect(() => {
    const form = ref.current?.form; if (!form) return;
    const limpar = () => { setPrev(old => { if (old) URL.revokeObjectURL(old); return null; }); setNome(''); setErro(''); setRemovida(false); };
    form.addEventListener('reset', limpar); return () => form.removeEventListener('reset', limpar);
  }, []);

  async function aceitar(orig: File | undefined) {
    if (!orig) return;
    const volta = () => { if (ref.current) ref.current.value = ''; };
    if (!TIPOS.includes(orig.type)) { setErro('Use uma imagem PNG, JPG, WEBP ou GIF.'); volta(); return; }
    if (orig.size > ORIGINAL_MAX * 1024 * 1024) { setErro(`Essa imagem tem ${(orig.size / 1048576).toFixed(0)} MB. Escolha uma menor que ${ORIGINAL_MAX} MB.`); volta(); return; }
    setErro(''); setCarregando(true);
    const f = await reduzir(orig);
    setCarregando(false);
    if (f.size > max * 1024 * 1024) { setErro(`Mesmo reduzida, a imagem tem ${(f.size / 1048576).toFixed(1)} MB (limite ${max} MB). Use uma imagem mais simples.`); volta(); return; }
    if (f !== orig && ref.current) { const dt = new DataTransfer(); dt.items.add(f); ref.current.files = dt.files; }
    setRemovida(false); setNome(f.name);
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
          <b>{carregando ? 'Preparando a imagem…' : 'Escolher imagem'}</b>
          <small>{carregando ? 'Reduzindo o tamanho para enviar mais rápido' : 'ou arraste e solte aqui'}</small>
        </button>
      )}
      <small className="sub">{dica ?? `PNG, JPG, WEBP ou GIF. Fotos grandes são reduzidas automaticamente.`}</small>
      {erro && <small className="erro" role="alert">{erro}</small>}
    </div>
  );
}
