import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/admin-server'

// POST /api/stripe/fim-funil {session_id} — a página final do funil (Stripe) chama quando a aluna TERMINA o funil
// (Bruno 13/11/2026: alunas escreviam "não recebi nada" dentro dos 15 min de atraso do acesso, e quem demora na VSL do
// upsell recebia o WhatsApp no meio dela). Antecipa pra agora as mensagens 'acesso' e 'apoio' dessa venda que ainda
// estão na fila. Não cria mensagem nova. Os 15 min continuam valendo pra quem fecha a página no meio.
// Sem segredo de propósito: o session_id (cs_…) só aparece pra quem pagou, e o pior uso de fora é a mensagem sair mais cedo.

export const dynamic = 'force-dynamic'
export const maxDuration = 20

const cabecalhos = {
  'Access-Control-Allow-Origin': 'https://kalistenika.riseme.fitness',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cabecalhos })
}

export async function POST(request: NextRequest) {
  // O funil manda por navigator.sendBeacon com text/plain (sem preflight): lê o corpo cru e faz o parse aqui.
  let sessao = ''
  try {
    sessao = String((JSON.parse(await request.text()) as { session_id?: string }).session_id ?? '').trim()
  } catch {
    return new NextResponse(null, { status: 400, headers: cabecalhos })
  }
  if (!/^cs_(live|test)_[A-Za-z0-9]+$/.test(sessao)) return new NextResponse(null, { status: 400, headers: cabecalhos })

  // Só vale pra venda paga já registrada pelo webhook (a tabela só tem sessão paga). O obrigado pode abrir antes de o
  // webhook gravar: espera até ~8 s. Se não aparecer, fica o atraso normal de 15 min.
  const db = createServiceClient()
  let venda: { wa_outbox_id: number | null } | null = null
  for (let i = 0; i < 5 && !venda?.wa_outbox_id; i++) {
    if (i) await new Promise((r) => setTimeout(r, 2000))
    venda = (await db.from('stripe_vendas').select('wa_outbox_id').eq('session_id', sessao).maybeSingle()).data
  }
  if (venda?.wa_outbox_id) {
    // Idempotente: só puxa pra AGORA o que ainda não saiu e estava marcado pra depois. Nunca cria mensagem.
    const agora = new Date()
    const depois = new Date(agora.getTime() + 45_000) // 'apoio' 45 s depois do acesso, como na sequência normal
    await db.from('whatsapp_outbox').update({ send_after: agora.toISOString() })
      .eq('id', venda.wa_outbox_id).eq('kind', 'acesso').is('sent_at', null).gt('send_after', agora.toISOString())
    await db.from('whatsapp_outbox').update({ send_after: depois.toISOString() })
      .eq('depends_on', venda.wa_outbox_id).eq('kind', 'apoio').is('sent_at', null).gt('send_after', depois.toISOString())
    // Aviso do produto extra (Protokół; kind 'aviso-extra:<sessão do upsell>', do dono do bot) nasceu preso ao horário
    // antigo do acesso + 3 min: acompanha a antecipação e sai 3 min depois do acesso.
    const aviso = new Date(agora.getTime() + 3 * 60_000)
    await db.from('whatsapp_outbox').update({ send_after: aviso.toISOString() })
      .eq('depends_on', venda.wa_outbox_id).like('kind', 'aviso-extra:%').is('sent_at', null).gt('send_after', aviso.toISOString())
  }
  // Não devolve dado nenhum (o beacon nem lê a resposta).
  return new NextResponse(null, { status: 204, headers: cabecalhos })
}
