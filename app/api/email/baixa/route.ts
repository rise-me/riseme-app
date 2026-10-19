import { NextRequest, NextResponse } from 'next/server'
import { assinaturaBaixa, registrarBaixa } from '@/lib/email-indicacao'

// GET /api/email/baixa?u=<id>&t=<assinatura> — descadastro do email de indicação (link no rodapé e List-Unsubscribe).
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const u = request.nextUrl.searchParams.get('u') ?? ''
  const t = request.nextUrl.searchParams.get('t') ?? ''
  const ok = /^[0-9a-f-]{36}$/i.test(u) && t === assinaturaBaixa(u)
  if (ok) await registrarBaixa(u)
  const msg = ok ? 'Listo, no te enviaremos más correos como este. 💛' : 'Enlace inválido.'
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:90vh;background:#f4f1ec;color:#1a1a1a"><p style="font-size:18px;text-align:center;padding:24px">${msg}</p></body>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: ok ? 200 : 400 },
  )
}
export const POST = GET // One-click unsubscribe (RFC 8058) manda POST
