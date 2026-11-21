'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// O menu (layout) é montado antes da página marcar os avisos como vistos e não é refeito ao navegar.
// Este componente pede uma atualização única para a bolinha do menu sumir.
export function AtualizarAvisos() {
  const router = useRouter();
  const feito = useRef(false);
  useEffect(() => { if (!feito.current) { feito.current = true; router.refresh(); } }, [router]);
  return null;
}
