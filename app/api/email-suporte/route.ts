import { NextRequest, NextResponse, after } from 'next/server'
import { processarEmailRecebido } from '@/lib/email-suporte'

// POST /api/email-suporte — aviso do Resend quando chega e-mail em qualquer endereço @riseme.app (evento email.received).
// O aviso só traz o id: o e-mail é buscado de volta no Resend com a nossa chave (lib/email-suporte.ts), e é isso que prova
// que o aviso é verdadeiro (id inventado não existe lá). Responde na hora e processa depois (o bot leva alguns segundos).
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(req: NextRequest) {
  const ev = (await req.json().catch(() => null)) as { type?: string; data?: { email_id?: string } } | null
  const id = ev?.data?.email_id
  if (ev?.type !== 'email.received' || !id || !/^[\w-]{8,80}$/.test(id)) return NextResponse.json({ ok: true, ignorado: true })
  after(async () => {
    const r = await processarEmailRecebido(id).catch((err) => `falhou: ${String(err).slice(0, 200)}`)
    console.log(`[email-suporte] ${r}`)
  })
  return NextResponse.json({ ok: true })
}
