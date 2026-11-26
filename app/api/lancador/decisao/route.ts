import { NextRequest, NextResponse } from 'next/server'
import { autorizado, decisaoDa } from '@/lib/whatsapp-agent/lancador'

// GET /api/lancador/decisao?id=AAAA-MM-DD — o lançador lê o que o responsável decidiu sobre a lista da noite.
// {"status":"aguardando"|"decidido","decisao":{subir,fora,segurar_tudo,observacoes,duvida}|null,"atualizado":"<iso>"}
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (!autorizado(request.headers.get('authorization'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = request.nextUrl.searchParams.get('id') ?? ''
  if (!id) return NextResponse.json({ error: 'informe id' }, { status: 400 })
  const d = await decisaoDa(id)
  return d ? NextResponse.json(d) : NextResponse.json({ error: 'proposta não encontrada' }, { status: 404 })
}
