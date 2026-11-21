import Link from 'next/link';
import { POR_PAGINA, qs } from '@/lib/consulta';

type Params = Record<string, string | undefined | null>;

// Busca por nome (e, se quiser, filtro de turma). Usa GET: o endereço guarda a busca e dá para compartilhar.
export function Busca({ base, params = {}, q, turma, turmas, semTurma = false, placeholder = 'Buscar por nome' }: {
  base: string; params?: Params; q?: string; turma?: string; turmas?: { id: string; nome: string }[]; semTurma?: boolean; placeholder?: string;
}) {
  const ativo = !!(q || (turma && turmas));
  const limpar = base + qs(params);
  return (
    <form method="get" action={base} className="busca" role="search">
      {Object.entries(params).map(([k, v]) => v ? <input key={k} type="hidden" name={k} value={v} /> : null)}
      <input name="q" className="inp" defaultValue={q ?? ''} placeholder={placeholder} aria-label={placeholder} maxLength={80} />
      {turmas && (
        <select name="turma" className="inp" defaultValue={turma ?? ''} aria-label="Filtrar por turma">
          <option value="">Todas as turmas</option>
          {semTurma && <option value="sem">Sem turma</option>}
          {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
      )}
      <button className="btn" type="submit">Filtrar</button>
      {ativo && <Link className="btn ghost" href={limpar}>Limpar</Link>}
    </form>
  );
}

export function Paginacao({ pagina, total, base, params = {}, por = POR_PAGINA }: { pagina: number; total: number; base: string; params?: Params; por?: number }) {
  const paginas = Math.max(1, Math.ceil(total / por));
  if (total <= por) return null;
  const href = (n: number) => base + qs({ ...params, p: n > 1 ? String(n) : undefined });
  return (
    <nav className="pager" aria-label="Páginas">
      {pagina > 1 ? <Link className="btn sm" href={href(pagina - 1)}>← Anterior</Link> : <span className="btn sm" aria-disabled="true" style={{ opacity: .4 }}>← Anterior</span>}
      <span className="sub" style={{ fontSize: 13 }}>Página {Math.min(pagina, paginas)} de {paginas} · {total} resultados</span>
      {pagina < paginas ? <Link className="btn sm" href={href(pagina + 1)}>Próxima →</Link> : <span className="btn sm" aria-disabled="true" style={{ opacity: .4 }}>Próxima →</span>}
    </nav>
  );
}
