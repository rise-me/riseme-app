import { NextRequest, NextResponse } from 'next/server'
import { autorizado, avisarResultado } from '@/lib/whatsapp-agent/lancador'

// POST /api/lancador/resultado — resumo final do lançador ("subiram 7, 1 reprovado na criação") para o responsável.
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  if (!autorizado(request.headers.get('authorization'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const corpo = (await request.json().catch(() => null)) as { id?: string; texto?: string } | null
  if (!corpo?.id || !corpo.texto?.trim()) return NextResponse.json({ error: 'informe id e texto' }, { status: 400 })
  const ok = await avisarResultado(String(corpo.id), corpo.texto)
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'não consegui mandar ao WhatsApp do responsável' }, { status: 502 })
}
