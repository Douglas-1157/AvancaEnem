import Link from 'next/link';
import { POR_PAGINA, qs } from '@/lib/consulta';

type Params = Record<string, string | undefined | null>;

export { Busca } from './BuscaAuto';

export function Paginacao({ pagina, total, base, params = {}, por = POR_PAGINA }: { pagina: number; total: number; base: string; params?: Params; por?: number }) {
  const paginas = Math.max(1, Math.ceil(total / por));
  if (total <= por) return null;
  const href = (n: number) => base + qs({ ...params, p: n > 1 ? String(n) : undefined });
  return (
    <nav className="pager" aria-label="Páginas">
      {pagina > 1 ? <Link className="btn sm seta" href={href(pagina - 1)} aria-label="Página anterior">‹</Link> : <span className="btn sm seta" aria-disabled="true" style={{ opacity: .35 }}>‹</span>}
      <span className="sub" style={{ fontSize: 13 }}>{Math.min(pagina, paginas)} de {paginas} · {total} no total</span>
      {pagina < paginas ? <Link className="btn sm seta" href={href(pagina + 1)} aria-label="Próxima página">›</Link> : <span className="btn sm seta" aria-disabled="true" style={{ opacity: .35 }}>›</span>}
    </nav>
  );
}
