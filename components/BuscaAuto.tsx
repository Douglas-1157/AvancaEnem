'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { qs } from '@/lib/consulta';

type Params = Record<string, string | undefined | null>;

// Busca por nome (e, se quiser, filtro de turma) que atualiza a lista sozinha enquanto a pessoa digita.
export function Busca({ base, params = {}, q: qInicial, turma: turmaInicial, turmas, semTurma = false, placeholder = 'Buscar por nome' }: {
  base: string; params?: Params; q?: string; turma?: string; turmas?: { id: string; nome: string }[]; semTurma?: boolean; placeholder?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(qInicial ?? '');
  const [turma, setTurma] = useState(turmaInicial ?? '');
  const primeira = useRef(true);
  const ir = () => router.replace(base + qs({ ...params, q: q.trim() || undefined, ...(turmas ? { turma: turma || undefined } : {}) }), { scroll: false });
  // Espera a pessoa parar de digitar por um instante antes de buscar.
  useEffect(() => {
    if (primeira.current) { primeira.current = false; return; }
    const t = setTimeout(ir, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, turma]);
  const enviar = (e: FormEvent) => { e.preventDefault(); ir(); };
  return (
    <form onSubmit={enviar} className="busca" role="search">
      <input name="q" className="inp" value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder} aria-label={placeholder} maxLength={80} autoComplete="off" />
      {turmas && (
        <select name="turma" className="inp" value={turma} onChange={e => setTurma(e.target.value)} aria-label="Filtrar por turma">
          <option value="">Todas as turmas</option>
          {semTurma && <option value="sem">Sem turma</option>}
          {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
      )}
      {(q || (turmas && turma)) && <button type="button" className="btn ghost" onClick={() => { setQ(''); setTurma(''); }}>Limpar</button>}
    </form>
  );
}
