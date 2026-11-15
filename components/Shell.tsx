'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import { Logo } from './Logo';
import { supabaseBrowser } from '@/lib/supabase/client';
import { iniciais } from '@/lib/tipos';
import { useFoco, mmss } from '@/lib/foco';

export type ItemMenu = { href: string; label: string; icon: string; badge?: number; mobile?: boolean; exato?: boolean };

export function alternarTema() {
  const r = document.documentElement;
  const escuro = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  r.dataset.theme = escuro ? 'light' : 'dark';
  try { localStorage.setItem('tema', r.dataset.theme); } catch { /* ignore */ }
}

// Cronômetro de foco no canto superior: aparece em qualquer tela do aluno enquanto estiver em andamento.
function FocoTopo() {
  const f = useFoco(); const r = useRouter();
  const fim = f.rodando && f.left === 0;
  useEffect(() => { if (fim) f.concluir(f.dur).then(ok => { if (ok) r.refresh(); }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [fim]);
  useEffect(() => {
    if (!f.rodando) return;
    const antes = document.title; document.title = `${mmss(f.left)} · Foco`;
    return () => { document.title = antes; };
  }, [f.rodando, f.left]);
  if (!f.emAndamento) return null;
  return (
    <Link href="/aluno/foco" className={`foco-top${f.rodando ? ' run' : ''}`} title="Cronômetro de foco" aria-label={`Cronômetro de foco: ${mmss(f.left)}`}>
      <Icon n="timer" s={16} /><b>{mmss(f.left)}</b>
    </Link>
  );
}

export function Shell({ menu, extra, nome, papel, children }: { menu: ItemMenu[]; extra?: ItemMenu[]; nome: string; papel: string; children: ReactNode }) {
  const path = usePathname(); const router = useRouter(); const [aberto, setAberto] = useState(false);
  useEffect(() => { setAberto(false); }, [path]);
  const ativo = (m: ItemMenu) => (m.exato ? path === m.href : path === m.href || path.startsWith(m.href + '/'));
  const sair = async () => { await supabaseBrowser().auth.signOut(); router.replace('/entrar'); router.refresh(); };
  const prova = path.startsWith('/aluno/prova');
  const mobile = menu.filter(m => m.mobile !== false).slice(0, 5);
  if (prova) return <div className="app focus"><main className="main">{children}</main></div>;
  return (
    <div className="app">
      <aside className="side" aria-label="Menu principal">
        <div className="brand" title="Avança ENEM"><Logo /><div><b>Avança ENEM</b><small>{papel}</small></div></div>
        <nav>
          {menu.map(m => (
            <Link key={m.href} href={m.href} title={m.label} className={`nv${ativo(m) ? ' on' : ''}`} aria-current={ativo(m) ? 'page' : undefined}>
              <Icon n={m.icon} /><span>{m.label}</span>{m.badge ? <span className="badge">{m.badge}</span> : null}
            </Link>
          ))}
        </nav>
        <span className="sp" />
        <button className="nv" onClick={alternarTema} title="Alternar tema"><Icon n="sun" /><span>Tema</span></button>
        <button className="nv" onClick={sair} title="Sair"><Icon n="out" /><span>Sair</span></button>
      </aside>
      <main className="main">
        <div className="top">
          <Logo size={32} className="only-m" />
          <span className="sp" />
          {path.startsWith('/aluno') && <FocoTopo />}
          <span className="who-top"><b>{nome}</b><small>{papel}</small></span>
          <button className="av" onClick={() => setAberto(!aberto)} aria-label="Menu da conta" aria-expanded={aberto}>{iniciais(nome)}</button>
          {aberto && (
            <div className="menu">
              <div className="who"><b>{nome}</b><small>{papel}</small></div>
              {(extra ?? []).map(m => <Link key={m.href} href={m.href} className="nv"><Icon n={m.icon} /><span>{m.label}</span></Link>)}
              <button className="nv" onClick={alternarTema}><Icon n="sun" /><span>Alternar tema claro e escuro</span></button>
              <button className="nv" onClick={sair}><Icon n="out" /><span>Sair</span></button>
            </div>
          )}
        </div>
        <div className="page">{children}</div>
      </main>
      <nav className="bnav" aria-label="Menu principal">
        {mobile.map(m => (
          <Link key={m.href} href={m.href} className={ativo(m) ? 'on' : ''} aria-current={ativo(m) ? 'page' : undefined}>
            <Icon n={m.icon} s={22} /><span>{m.label}</span>{m.badge ? <span className="badge">{m.badge}</span> : null}
          </Link>
        ))}
      </nav>
    </div>
  );
}
