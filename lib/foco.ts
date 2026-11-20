'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { registrarFoco } from '@/lib/acoes/aluno';

// Estado do cronômetro de foco, compartilhado entre telas (fica no navegador, sobrevive a trocar de página e a recarregar).
export type EstadoFoco = { dur: number; fim: number | null; left: number; msg: string };
const KEY = 'foco-estado';
const padrao: EstadoFoco = { dur: 25, fim: null, left: 25 * 60, msg: '' };
let cache: EstadoFoco = padrao; let lido = false; let registrando = false;
const ouvintes = new Set<() => void>();

function ler() {
  lido = true;
  try { const j = localStorage.getItem(KEY); if (j) cache = { ...padrao, ...JSON.parse(j) }; } catch { /* ignore */ }
}
function gravar(n: Partial<EstadoFoco>) {
  cache = { ...cache, ...n };
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* ignore */ }
  ouvintes.forEach(f => f());
}
function assinar(f: () => void) {
  ouvintes.add(f);
  const st = (e: StorageEvent) => { if (e.key === KEY) { lido = false; f(); } };
  window.addEventListener('storage', st);
  return () => { ouvintes.delete(f); window.removeEventListener('storage', st); };
}
const foto = () => { if (!lido) ler(); return cache; };
const fotoServidor = () => padrao;

export const restante = (s: EstadoFoco) => (s.fim ? Math.max(0, Math.round((s.fim - Date.now()) / 1000)) : s.left);
export const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export function useFoco() {
  const s = useSyncExternalStore(assinar, foto, fotoServidor);
  const [, tick] = useState(0);
  useEffect(() => { if (!s.fim) return; const t = setInterval(() => tick(x => x + 1), 500); return () => clearInterval(t); }, [s.fim]);
  const left = restante(s);
  const gasto = (s.dur * 60 - left) / 60;
  return {
    ...s, left, gasto, rodando: !!s.fim, emAndamento: !!s.fim || left < s.dur * 60,
    alternar: () => { if (cache.fim) gravar({ left: restante(cache), fim: null }); else gravar({ fim: Date.now() + cache.left * 1000, msg: '' }); },
    trocar: (m: number) => gravar({ dur: m, left: m * 60, fim: null, msg: '' }),
    reiniciar: () => gravar({ fim: null, left: cache.dur * 60 }),
    concluir: async (min: number): Promise<boolean> => {
      if (registrando) return false;
      const m = Math.floor(min);
      if (m < 1) { gravar({ fim: null, msg: 'Estude pelo menos 1 minuto para registrar.' }); return false; }
      registrando = true;
      try {
        const x = await registrarFoco(m);
        gravar({ fim: null, left: cache.dur * 60, msg: x.ok ? `${m} min somados à sua meta da semana.` : x.erro ?? 'Não foi possível registrar.' });
        return !!x.ok;
      } finally { registrando = false; }
    },
  };
}
