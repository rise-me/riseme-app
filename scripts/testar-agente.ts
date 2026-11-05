// Bateria de perguntas REAIS de alunas contra o agente de WhatsApp (lib/whatsapp-agent).
// Rodar antes de publicar mudança no prompt/conhecimento/materiais e conferir as respostas.
// Gasta API (centavos). Uso: npx tsx --env-file=.env.local scripts/testar-agente.ts [filtro]
import { decidirResposta, type PerfilAluna } from '@/lib/whatsapp-agent/responder'

const base: PerfilAluna = {
  nome: 'María López', idioma: 'es', compradaEm: '2026-10-03T14:00:00Z', ultimoLogin: '2026-10-03T15:00:00Z',
  diasFeitos: 2, ultimoTreino: '2026-10-04T12:00:00Z', liberados: ['Calistenia en Casa'], confirmadaPorTelefone: true,
}
const comProtocolo = { ...base, liberados: ['Calistenia en Casa', 'Protocolo Metabólico'] }

// Bloco HOTMART de mentira, no formato de lib/hotmart-api.ts resumoHotmart (caso real Miriam #76, 19/10: 1 paga + 3 tentativas).
const D2 = new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10)
const D4 = new Date(Date.now() - 4 * 86_400_000).toISOString().slice(0, 10)
const HOTMART_DUPLA = `HOTMART (consultado agora pelo e-mail maria@example.com; é o que a Hotmart REALMENTE registra, use como fato):
- ${D2} (há 2 dias) · RiseMe™ - Desafío de 28 Días de Calistenia · 12.9 USD · CREDIT_CARD · APROVADA (paga) · transação HP2772692909
- ${D2} (há 2 dias) · Protocolo Metabólico · 19 USD · CREDIT_CARD · RECUSADA pelo banco (sem fundos) — não foi cobrada · transação HP2772700001
- ${D2} (há 2 dias) · Protocolo Metabólico · 19 USD · CREDIT_CARD · CANCELADA (não foi paga) · transação HP2772700002
- ${D2} (há 2 dias) · Protocolo Metabólico · 19 USD · CREDIT_CARD · CANCELADA (não foi paga) · transação HP2772700003
Resumo: 1 compra(s) PAGA(S) (RiseMe™ - Desafío de 28 Días de Calistenia); 3 tentativa(s) NÃO paga(s); 0 reembolsada(s); 0 reembolso(s) em análise.
Assinaturas: nenhuma.`
const HOTMART_PROTESTED = `HOTMART (consultado agora pelo e-mail maria@example.com; é o que a Hotmart REALMENTE registra, use como fato):
- ${D4} (há 4 dias) · RiseMe™ - Desafío de 28 Días de Calistenia · 12.9 USD · CREDIT_CARD · REEMBOLSO PEDIDO, em análise na Hotmart (aprova em até 7 dias) · transação HP0491658410
Resumo: 0 compra(s) PAGA(S); 0 tentativa(s) NÃO paga(s); 0 reembolsada(s); 1 reembolso(s) em análise.
Assinaturas: nenhuma.`

const CASOS: { nome: string; perfil: PerfilAluna | null; msg: string; hotmart?: string }[] = [
  { nome: 'plano 3 dias / merienda (real)', perfil: base, msg: 'Hola, soy alumna de RiseMe 💛 Necesito ayuda con el plan de 3 días para deshinchar...  En todo el día se come solo lo que dice ahí? Por ejemplo, desayuno yogurt con chia, almuerzo pollo con ensalada y cena vegetales? No hay merienda?' },
  { nome: 'qual chá (TEM protocolo)', perfil: comProtocolo, msg: 'Hola! qué té tengo que tomar en la mañana?' },
  { nome: 'qual chá (NÃO tem protocolo)', perfil: base, msg: 'Hola! qué té tengo que tomar en la mañana?' },
  { nome: 'truco del hielo', perfil: base, msg: 'cómo se hace el truco del hielo? cuánto vinagre?' },
  { nome: 'grávida', perfil: base, msg: 'estoy embarazada de 3 meses, puedo hacer el plan antihinchazón?' },
  { nome: 'fora do material', perfil: base, msg: 'cuántas calorías tengo que comer al día para bajar 5 kilos?' },
  { nome: 'reembolso', perfil: base, msg: 'quiero mi dinero de vuelta' },
  { nome: 'PL chá (tem protocolo)', perfil: { ...comProtocolo, idioma: 'pl', nome: 'Anna Kowalska' }, msg: 'Dzień dobry, jaką herbatę mam pić rano i ile razy dziennie?' },
  // Casos reais de 30/10/2026 (revisão do atendimento): cada correção vira teste.
  { nome: 'conta criada pelo convite (compra antiga, sem cobrança nova)', perfil: { ...base, nome: 'Cira', compradaEm: '2026-10-05T11:50:00Z', compraAntiga: true, ultimoLogin: null, diasFeitos: 0 }, msg: 'Hola, no he comprado nada hoy, me llegó un correo de compra y acceso. ¿Me cobraron?' },
  { nome: 'insatisfeita: sugestão sem reembolso de cara', perfil: base, msg: 'Muy mal su app, los videos no tienen calentamiento ni estiramiento y soy principiante de más de 40 años.' },
  { nome: 'link do app completo com https (WhatsApp só clica assim)', perfil: base, msg: 'Hola, ¿cómo entro mañana a la aplicación? ¿Cuál es la dirección?' },
  { nome: 'treinar em jejum (sem regra fixa)', perfil: base, msg: '¿Puedo hacer el entrenamiento en ayunas?' },
  // q3/q5 (05/11/2026): mensagem curta → 1 linha; botão do app → resposta pronta + 1 pergunta.
  { nome: 'q3 gracias de despedida = 1 linha', perfil: base, msg: 'muchas gracias por todo, buenas noches' },
  { nome: 'q3 hola sozinha', perfil: base, msg: 'Hola' },
  { nome: 'q5 botão problemas técnicos', perfil: base, msg: 'Hola, soy alumna de RiseMe 💛 Necesito ayuda con: Problemas técnicos' },
  { nome: 'q5 botão facturación', perfil: base, msg: 'Hola, soy alumna de RiseMe 💛 Necesito ayuda con: Preguntas sobre facturación' },
  // Bloco HOTMART (04/11/2026): o agente responde com o que a Hotmart registra, sem pedir e-mail nem transferir.
  { nome: 'HOTMART: cobrança dupla = 1 paga + tentativas (responde na hora)', perfil: base, hotmart: HOTMART_DUPLA, msg: 'Me cobraron 4 veces!! veo 4 cargos de hotmart en mi tarjeta, esto es una estafa' },
  { nome: 'HOTMART: reembolso em análise (não pede de novo)', perfil: base, hotmart: HOTMART_PROTESTED, msg: 'pedí el reembolso y todavía no me llega el dinero, qué pasó?' },
  { nome: 'HOTMART ausente: sem bloco pede e-mail e transfere', perfil: base, msg: 'Me cobraron dos veces 19 dólares' },
  // 05/11: 2º pedido de reembolso com compra paga há 2 dias → reembolso_transacoes preenchido, sem link, sem transferir.
  { nome: 'HOTMART: 2º pedido de reembolso = registra (reembolso_transacoes)', perfil: base, hotmart: HOTMART_DUPLA, msg: 'Ya te dije que no quiero ayuda, solo quiero mi dinero de vuelta. Es la segunda vez que lo pido.' },
]

async function main() {
  const filtro = process.argv[2]
  for (const c of CASOS.filter((c) => !filtro || c.nome.includes(filtro))) {
  const t = Date.now()
  const d = await decidirResposta({
    perfil: c.perfil,
    conversa: [{ autor: 'student', texto: c.msg, em: '2026-10-05T12:00:00Z' }],
    agora: '2026-10-05T12:00:10Z',
    hotmart: c.hotmart,
  })
  console.log(`\n━━━ ${c.nome} (${((Date.now() - t) / 1000).toFixed(1)}s) ${d.tipo === 'humano' ? '→ TRANSFERE: ' + d.motivo : ''}${d.tipo === 'responder' && d.reembolsoTransacoes?.length ? ' → REEMBOLSO ' + d.reembolsoTransacoes.join(',') : ''}\nALUNA: ${c.msg}\n\n${d.texto}`)
}
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
