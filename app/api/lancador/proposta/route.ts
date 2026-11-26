import { NextRequest, NextResponse } from 'next/server'
import { autorizado, receberProposta } from '@/lib/whatsapp-agent/lancador'

// POST /api/lancador/proposta — o lançador manda a lista de anúncios da noite; ela vai ao WhatsApp do responsável e fica
// aberta para a resposta dele por 3 h. Contrato: docs/HANDOFF-LANCADOR-WHATSAPP.md. Protegida por LANCADOR_SECRET.
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  if (!autorizado(request.headers.get('authorization'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const corpo = (await request.json().catch(() => null)) as { id?: string; texto?: string; itens?: { n: number; oferta?: string; nome: string; conta?: string; orcamento?: string }[] } | null
  if (!corpo) return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  const r = await receberProposta({ id: String(corpo.id ?? ''), texto: String(corpo.texto ?? ''), itens: corpo.itens ?? [] })
  return r.ok ? NextResponse.json({ ok: true, id: corpo.id, status: 'aguardando' }) : NextResponse.json({ error: r.erro }, { status: r.erro.startsWith('informe') || r.erro.startsWith('números') ? 400 : 502 })
}
