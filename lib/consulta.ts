// Ajudantes para listas grandes: busca, página e endereço com filtros.
export const POR_PAGINA = 10;
// Escapa os curingas do LIKE para o texto digitado valer ao pé da letra.
export const likeSeguro = (s: string) => s.replace(/[\\%_]/g, m => '\\' + m);
// Monta "?a=1&b=2" ignorando o que estiver vazio.
export const qs = (o: Record<string, string | undefined | null>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? '?' + s : '?';
};
export const pag = (p?: string) => Math.min(10000, Math.max(1, Math.floor(Number(p)) || 1));
export const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// Se a pessoa repetir um parâmetro no endereço (?q=a&q=b), o Next entrega uma lista; aqui fica só o primeiro valor.
export const normalizarSP = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])) as T;
