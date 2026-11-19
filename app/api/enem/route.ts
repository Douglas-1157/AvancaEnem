import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BASE = 'https://download.inep.gov.br/enem/provas_e_gabaritos/';
const PAGINA_OFICIAL = 'https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos';
// Caderno padrão (azul) de cada dia. Se o Inep mudar o código em algum ano, tenta os alternativos.
const CADERNOS: Record<string, string[]> = { '1': ['CD1', 'CD2'], '2': ['CD7', 'CD5', 'CD6'] };

// Baixa a prova ou o gabarito oficial do Inep já como arquivo (o navegador não consegue forçar download de outro site).
// Só aceita ano/dia/tipo da lista: o endereço nunca vem pronto do usuário.
export async function GET(req: NextRequest) {
  const db = await supabaseServer();
  const { data } = await db.auth.getClaims();
  if (!data?.claims?.sub) return new NextResponse('Entre na plataforma para baixar.', { status: 401 });

  const q = req.nextUrl.searchParams;
  const ano = Number(q.get('ano')), dia = q.get('dia') ?? '', tipo = q.get('tipo') ?? '';
  if (!Number.isInteger(ano) || ano < 2020 || ano > 2025 || !(dia in CADERNOS) || !['prova', 'gabarito'].includes(tipo))
    return new NextResponse('Pedido inválido.', { status: 400 });

  for (const cd of CADERNOS[dia]) {
    const url = `${BASE}${ano}_${tipo === 'prova' ? 'PV' : 'GB'}_impresso_D${dia}_${cd}.pdf`;
    try {
      const r = await fetch(url, { redirect: 'follow', cache: 'no-store' });
      if (r.ok && r.body && !(r.headers.get('content-type') ?? '').includes('html')) {
        const h: Record<string, string> = {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="ENEM-${ano}-${tipo}-dia${dia}.pdf"`,
          'Cache-Control': 'private, max-age=3600',
        };
        const len = r.headers.get('content-length'); if (len) h['Content-Length'] = len;
        return new Response(r.body, { headers: h });
      }
      await r.body?.cancel();
    } catch { /* tenta o próximo */ }
  }
  // Não achou o arquivo: leva a pessoa para a página oficial, onde ela escolhe o caderno.
  return NextResponse.redirect(PAGINA_OFICIAL);
}
