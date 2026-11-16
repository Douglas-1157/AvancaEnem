import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { iniciais } from '@/lib/tipos';

// Blocos do painel (usados na tela inicial do professor e da gestão)
export function Boas({ nome, saudacao, titulo, chips, info, acao }: {
  nome: string; saudacao: string; titulo: string; chips: ReactNode; info: [string, ReactNode][]; acao?: ReactNode;
}) {
  return (
    <section className="wel">
      <div className="wel-id">
        <span className="wel-av">{iniciais(nome)}</span>
        <div><p className="eyebrow">{saudacao}</p><h1 className="h1">{titulo}</h1><div className="chips2">{chips}</div></div>
        {acao}
      </div>
      <div className="info4">{info.map(([l, v]) => <div key={l}><small>{l}</small><b>{v}</b></div>)}</div>
    </section>
  );
}
export type SugItem = { href: string; cls: 's1' | 's2' | 's3'; ic: string; rot: string; tit: string; meta: string };
export const Sugs = ({ itens, titulo }: { itens: SugItem[]; titulo: string }) => (
  <section><h2 className="h2 sec">{titulo}</h2>
    <div className="sugs">{itens.map(s => (
      <Link key={s.href + s.rot} href={s.href} className={`sug ${s.cls}`}>
        <span className="sug-ic"><Icon n={s.ic} s={20} /></span><small>{s.rot}</small><b>{s.tit}</b><span className="sug-m">{s.meta}</span>
      </Link>))}</div></section>
);
export type Atalho = { href: string; ic: string; t: string; d: string; n?: number };
export const Atalhos = ({ itens, titulo }: { itens: Atalho[]; titulo: string }) => (
  <section><h2 className="h2 sec">{titulo}</h2>
    <div className={`rot${itens.length === 4 ? " rot4" : ""}`}>{itens.map((r, i) => (
      <Link key={r.href + r.t} href={r.href} className={`rt r${i % 6}`}>
        <span className="rt-ic"><Icon n={r.ic} s={22} />{r.n ? <i className="rt-b">{r.n}</i> : null}</span><b>{r.t}</b><small>{r.d}</small>
      </Link>))}</div></section>
);

// Cabeçalho de página: título, subtítulo, números em destaque e uma ação opcional
export function Cab({ titulo, sub, info, acao }: { titulo: string; sub?: string; info?: [string, ReactNode][]; acao?: ReactNode }) {
  return (
    <section className="cab">
      <div className="cab-t"><div><h1 className="h1">{titulo}</h1>{sub && <p className="sub">{sub}</p>}</div>{acao}</div>
      {info && info.length > 0 && <div className="info4">{info.map(([l, v]) => <div key={l}><small>{l}</small><b>{v}</b></div>)}</div>}
    </section>
  );
}

// Bloco de formulário/seção com ícone e título
export function Bloco({ ic, titulo, sub, children, className = '' }: { ic: string; titulo: string; sub?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`card bloco ${className}`}>
      <div className="fh"><span className="fh-i"><Icon n={ic} s={20} /></span><div><h2 className="h2">{titulo}</h2>{sub && <p className="sub">{sub}</p>}</div></div>
      {children}
    </div>
  );
}
