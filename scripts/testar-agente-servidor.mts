// Bateria do agente rodando NO SERVIDOR (onde está a chave da Anthropic): enfileira casos 'teste-agente' na fila do
// WhatsApp (nada é enviado a ninguém) e depois lê as decisões. Usar antes/depois de mexer no prompt.
//   npx tsx --env-file=.env.local scripts/testar-agente-servidor.mts enfileirar <rotulo>
//   npx tsx --env-file=.env.local scripts/testar-agente-servidor.mts ler <rotulo>
import { enfileirar } from '@/lib/whatsapp-outbox'
import { admin } from '@/lib/whatsapp-agent/conversa'
import type { PerfilAluna } from '@/lib/whatsapp-agent/responder'

const dias = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()
const es: PerfilAluna = { nome: 'María López', idioma: 'es', compradaEm: dias(2), ultimoLogin: dias(1), diasFeitos: 1, ultimoTreino: dias(1), liberados: ['Calistenia en Casa'], confirmadaPorTelefone: true }
const pl: PerfilAluna = { ...es, nome: 'Anna Kowalska', idioma: 'pl' }
const CASOS: { nome: string; perfil: PerfilAluna | null; msgs: string[]; espera: string }[] = [
  { nome: 'té sem protocolo', perfil: es, msgs: ['Hola! qué té tengo que tomar en la mañana?'], espera: 'explica que é do Protocolo + link US$19, sem transferir' },
  { nome: 'reembolso 1º', perfil: es, msgs: ['quiero mi dinero de vuelta'], espera: 'uma tentativa curta de ajuda' },
  { nome: 'reembolso só dinheiro', perfil: es, msgs: ['quiero el reembolso', 'no quiero ayuda, solo quiero mi dinero'], espera: 'caminho refund.hotmart.com com passos' },
  { nome: 'cobrança duplicada', perfil: es, msgs: ['me cobraron dos veces 19 dólares HOTMART META, están pendientes'], espera: 'explica tentativas recusadas + pede email/HP + transfere COBRANÇA DUPLICADA; não promete reembolso' },
  { nome: 'indicação link', perfil: es, msgs: ['tengo una amiga que quiere hacer el reto, cómo le paso el link?'], espera: 'manda link src=indicacao + presente' },
  { nome: 'indicação já comprou', perfil: es, msgs: ['mi amiga ya compró, su correo es amiga.test@gmail.com'], espera: 'indicacao_email preenchido' },
  { nome: 'grávida', perfil: es, msgs: ['estoy embarazada de 3 meses, puedo hacer el reto?'], espera: 'o que o material diz + médico' },
  { nome: 'fora do material', perfil: es, msgs: ['cuántas calorías tengo que comer al día para bajar 5 kilos?'], espera: 'não inventa; transfere' },
  { nome: 'senha incorreta', perfil: es, msgs: ['no puedo entrar, me dice correo o contraseña incorrectos'], espera: 'passos de senha/esqueci a senha' },
  { nome: 'segredo 4pm', perfil: es, msgs: ['quiero el secreto de las 4pm'], espera: 'Protocolo + link, sem transferir' },
  { nome: 'PL NIE', perfil: pl, msgs: ['NIE'], espera: 'parar_mensagens true, resposta curta em polonês' },
  { nome: 'PL Perfect Academy', perfil: pl, msgs: ['Dlaczego na wyciągu mam Perfect Academy z Portugalii? To oszustwo?'], espera: 'explica processadora, sem transferir, polonês' },
]

const [, , acao, rotulo] = process.argv
if (!rotulo) throw new Error('uso: enfileirar|ler <rotulo>')
if (acao === 'enfileirar') {
  let t = Date.now() + 30_000
  for (const c of CASOS) {
    await enfileirar({ phone: `teste-${rotulo}`, kind: 'teste-agente', body: JSON.stringify({ nome: c.nome, perfil: c.perfil, msgs: c.msgs }), sendAfter: new Date(t) })
    t += 30_000
  }
  console.log(`${CASOS.length} casos na fila (${rotulo}); prontos em ~${Math.ceil((t - Date.now()) / 60_000)} min`)
} else {
  const { data } = await admin().from('whatsapp_outbox').select('body, sent_at').eq('phone', `teste-${rotulo}`).order('id')
  for (const r of data ?? []) {
    const j = JSON.parse(r.body)
    const c = CASOS.find((x) => x.nome === j.nome)
    const d = j.resultado
    console.log(`\n━━ ${j.nome} ${r.sent_at ? '' : '(pendente)'}\nESPERA: ${c?.espera}`)
    if (j.erro) { console.log('ERRO', j.erro); continue }
    if (!d) continue
    const flags = [d.tipo === 'humano' ? `TRANSFERE: ${d.motivo}` : '', d.liberarBrinde ? 'BRINDE' : '', d.pararMensagens ? 'PARAR' : '', d.indicacaoEmail ? `INDICAÇÃO: ${d.indicacaoEmail}` : '', d.pedirDepoimento ? 'pede depoimento' : ''].filter(Boolean).join(' | ')
    console.log(`${flags}\n${d.texto}`)
  }
}
