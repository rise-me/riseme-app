// Bateria de perguntas REAIS de alunas contra o agente de WhatsApp (lib/whatsapp-agent).
// Rodar antes de publicar mudança no prompt/conhecimento/materiais e conferir as respostas.
// Gasta API (centavos). Uso: npx tsx --env-file=.env.local scripts/testar-agente.ts [filtro]
import { decidirResposta, type PerfilAluna } from '@/lib/whatsapp-agent/responder'

const base: PerfilAluna = {
  nome: 'María López', idioma: 'es', compradaEm: '2026-10-03T14:00:00Z', ultimoLogin: '2026-10-03T15:00:00Z',
  diasFeitos: 2, ultimoTreino: '2026-10-04T12:00:00Z', liberados: ['Calistenia en Casa'], confirmadaPorTelefone: true,
}
const comProtocolo = { ...base, liberados: ['Calistenia en Casa', 'Protocolo Metabólico'] }

const CASOS: { nome: string; perfil: PerfilAluna | null; msg: string }[] = [
  { nome: 'plano 3 dias / merienda (real)', perfil: base, msg: 'Hola, soy alumna de RiseMe 💛 Necesito ayuda con el plan de 3 días para deshinchar...  En todo el día se come solo lo que dice ahí? Por ejemplo, desayuno yogurt con chia, almuerzo pollo con ensalada y cena vegetales? No hay merienda?' },
  { nome: 'qual chá (TEM protocolo)', perfil: comProtocolo, msg: 'Hola! qué té tengo que tomar en la mañana?' },
  { nome: 'qual chá (NÃO tem protocolo)', perfil: base, msg: 'Hola! qué té tengo que tomar en la mañana?' },
  { nome: 'truco del hielo', perfil: base, msg: 'cómo se hace el truco del hielo? cuánto vinagre?' },
  { nome: 'grávida', perfil: base, msg: 'estoy embarazada de 3 meses, puedo hacer el plan antihinchazón?' },
  { nome: 'fora do material', perfil: base, msg: 'cuántas calorías tengo que comer al día para bajar 5 kilos?' },
  { nome: 'reembolso', perfil: base, msg: 'quiero mi dinero de vuelta' },
  { nome: 'PL chá (tem protocolo)', perfil: { ...comProtocolo, idioma: 'pl', nome: 'Anna Kowalska' }, msg: 'Dzień dobry, jaką herbatę mam pić rano i ile razy dziennie?' },
]

async function main() {
  const filtro = process.argv[2]
  for (const c of CASOS.filter((c) => !filtro || c.nome.includes(filtro))) {
  const t = Date.now()
  const d = await decidirResposta({
    perfil: c.perfil,
    conversa: [{ autor: 'student', texto: c.msg, em: '2026-10-05T12:00:00Z' }],
    agora: '2026-10-05T12:00:10Z',
  })
  console.log(`\n━━━ ${c.nome} (${((Date.now() - t) / 1000).toFixed(1)}s) ${d.tipo === 'humano' ? '→ TRANSFERE: ' + d.motivo : ''}\nALUNA: ${c.msg}\n\n${d.texto}`)
}
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
