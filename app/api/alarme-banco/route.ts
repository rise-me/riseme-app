import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/alarme-banco — cron da Vercel a cada 5 min (vercel.json). Caso real: 16/11/2026 o banco (Supabase, tamanho Nano)
// travou das 03h30 às 07h55 BRT e ninguém soube: 105 compradoras sem acesso, webhook da Stripe e fila do WhatsApp parados.
// Faz uma consulta mínima com limite de 8 s; se falhar, avisa por E-MAIL (Resend) o ALERTA_EMAIL. Não usa o banco para
// lembrar que já avisou (é o banco que caiu): avisa só nas rodadas de :00 e :30, então no máximo 2 e-mails por hora.

export const dynamic = 'force-dynamic'
export const maxDuration = 30

async function bancoResponde(): Promise<{ ok: boolean; detalhe: string; ms: number }> {
  const t = Date.now()
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const limite = new Promise<{ error: { message: string } }>((res) => setTimeout(() => res({ error: { message: 'sem resposta em 8 s' } }), 8000))
  const r = (await Promise.race([db.from('whatsapp_outbox').select('id').limit(1), limite])) as { error: { message: string } | null }
  return { ok: !r.error, detalhe: r.error?.message?.slice(0, 200) ?? '', ms: Date.now() - t }
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // 2 tentativas: um soluço isolado não vira alarme
  let r = await bancoResponde()
  if (!r.ok) r = await bancoResponde()
  if (r.ok) return NextResponse.json({ ok: true, ms: r.ms })
  console.error(`[alarme-banco] banco sem resposta: ${r.detalhe}`)
  const min = new Date().getMinutes()
  const apiKey = process.env.RESEND_API_KEY
  const para = (process.env.ALERTA_EMAIL ?? '').split(',').map((e) => e.trim()).filter(Boolean)
  if ((min < 5 || (min >= 30 && min < 35)) && apiKey && para.length) {
    const texto = [
      'O BANCO DO APP (Supabase) NÃO ESTÁ RESPONDENDO.',
      `Detalhe: ${r.detalhe}`,
      '',
      'Enquanto isso: compra nova da Stripe fica sem conta (a Stripe reenvia por 3 dias e a conferência recupera quando voltar),',
      'o bot do WhatsApp não responde e o login das alunas falha.',
      '',
      'O que fazer: painel do Supabase (entrar pelo GitHub) → projeto llguyuyuboeqxrvbzenz → ver CPU/memória em Settings → Infrastructure;',
      'se estiver travado, reiniciar o projeto ou subir o tamanho. Depois avise o chat do bot para conferir as vendas do período.',
      'Este aviso repete a cada 30 min enquanto o banco não responder.',
    ].join('\n')
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from: process.env.RESEND_FROM ?? 'RiseMe <acesso@riseme.app>', to: para, subject: '🚨 Banco do app RiseMe sem resposta', text: texto }),
    }).catch((err) => console.error('[alarme-banco] e-mail falhou:', err))
  }
  return NextResponse.json({ ok: false, detalhe: r.detalhe }, { status: 503 })
}
