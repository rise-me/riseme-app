// PROMPT POR ASSUNTO (q7 do mapa do WhatsApp; Bruno 05/11/2026: "pode ir"). Até aqui toda resposta carregava ~35 mil
// tokens de regras + materiais, a maioria sem relação com a pergunta ("regra demais vai bugar mais ainda", 19/10).
// Agora: (1) um classificador barato (Haiku) + sinais fixos dizem de que ASSUNTOS a conversa trata; (2) o prompt leva
// a base (voz, transferência, cartão) + só as seções desses assuntos; os MATERIAIS entram só em dúvida de conteúdo.
// Regra do Bruno: "na dúvida inclui" — classificador sem certeza, erro ou assunto 'outro' = prompt inteiro, como antes.
// Desligar: AGENTE_POR_ASSUNTO=off na Vercel (volta ao prompt inteiro sem deploy).
// As seções NÃO foram movidas: continuam em responder.ts (SYSTEM) e conhecimento.ts; este módulo só as fatia pelos
// títulos. Título novo sem mapa aqui = vai na BASE (entra sempre), que é o lado seguro.
import Anthropic from '@anthropic-ai/sdk'
import type { MensagemConversa } from './responder'
import { SINAL_DINHEIRO } from './dinheiro'

export const ASSUNTOS = ['acesso', 'dinheiro', 'tecnico', 'conteudo', 'treino', 'venda', 'depoimento'] as const
export type Assunto = (typeof ASSUNTOS)[number]
export const TODOS: ReadonlySet<Assunto> = new Set(ASSUNTOS)

export function porAssuntoLigado(): boolean {
  return (process.env.AGENTE_POR_ASSUNTO ?? 'on').toLowerCase() !== 'off'
}

// ─── Mapa título → assuntos (prefixo do título, sem acento sensível). Sem entrada = base. ──────────────────────────────
const MAPA_SYSTEM: [RegExp, Assunto[]][] = [
  [/^PEDIDO DE REEMBOLSO/, ['dinheiro']],
  [/^ACESSO — VOCÊ MESMA RESOLVE|^REENVIAR ACESSO|^CORRIGIR E-MAIL|^CONTA CRIADA AGORA|^E-MAIL SEM COMPRA/, ['acesso']],
  [/^BLOCO "HOTMART"/, ['dinheiro', 'acesso', 'venda']],
  [/^RECUPERAÇÃO DE COMPRA/, ['dinheiro', 'venda']],
  [/^BRINDE DO DEPOIMENTO|^CONVITE DE DEPOIMENTO HOTMART|^PROVA SOCIAL/, ['depoimento']],
  [/^INDICAÇÃO/, ['venda', 'depoimento']],
]
const MAPA_CONHECIMENTO: [RegExp, Assunto[]][] = [
  [/^## Acesso/, ['acesso']],
  [/^## Dentro do app/, ['acesso', 'tecnico', 'treino', 'conteudo']],
  [/^## PROBLEMAS TÉCNICOS/, ['tecnico']],
  [/^## "Paguei e está bloqueado"/, ['acesso', 'dinheiro']],
  [/^## CATÁLOGO/, ['venda']],
  [/^## Vendas que você faz/, ['venda', 'conteudo']], // dúvida de conteúdo que ela NÃO tem (chás sem Protocolo) vira link, não transferência
  [/^## Dinheiro/, ['dinheiro']],
]

interface Secao { titulo: string; corpo: string; assuntos: Assunto[] | null } // null = base

const TITULO_SYSTEM = /^(?=[A-ZÁÉÍÓÚÇ])[A-ZÁÉÍÓÚÇ][^a-záéíóúç\n]{4,80}?(?:\(|:)/
function fatiar(texto: string, titulo: RegExp, mapa: [RegExp, Assunto[]][]): Secao[] {
  const out: Secao[] = []
  let atual: Secao = { titulo: '(intro)', corpo: '', assuntos: null }
  for (const linha of texto.split('\n')) {
    if (titulo.test(linha)) {
      out.push(atual)
      atual = { titulo: linha, corpo: '', assuntos: mapa.find(([re]) => re.test(linha))?.[1] ?? null }
    }
    atual.corpo += linha + '\n'
  }
  out.push(atual)
  return out
}

let cache: { secoes: Secao[]; base: string } | null = null
/** Fatia SYSTEM (que já contém o CONHECIMENTO no fim) uma vez por processo. */
function fatias(system: string) {
  if (cache) return cache
  const [regras, conhecimento = ''] = system.split('# CONHECIMENTO')
  const secoes = [...fatiar(regras, TITULO_SYSTEM, MAPA_SYSTEM), ...fatiar('# CONHECIMENTO' + conhecimento, /^## /, MAPA_CONHECIMENTO)]
  cache = { secoes, base: secoes.filter((s) => !s.assuntos).map((s) => s.corpo).join('') }
  return cache
}

/** Blocos do system para a chamada: base + seções dos assuntos escolhidos, na ordem original (cache bate por combinação). */
export function montarSystem(system: string, assuntos: ReadonlySet<Assunto>): { base: string; extra: string } {
  if (assuntos.size >= ASSUNTOS.length) return { base: system, extra: '' } // tudo: o prompt inteiro, como antes
  const f = fatias(system)
  const extra = f.secoes.filter((s) => s.assuntos?.some((a) => assuntos.has(a))).map((s) => s.corpo).join('')
  return { base: f.base, extra }
}

export function titulosDasSecoes(system: string): string[] {
  return fatias(system).secoes.map((s) => `${s.assuntos ? s.assuntos.join('+') : 'BASE'} · ${Math.round(s.corpo.length / 3.6)} tok · ${s.titulo.slice(0, 50)}`)
}

// ─── Sinais fixos (baratos, sem IA) ─────────────────────────────────────────────────────────────────────────────────────
const SINAIS: [Assunto, RegExp][] = [
  ['acesso', /contrase|senha|acceso|acess|entrar|login|iniciar sesi|correo|e-?mail|clave|hasło|logowa|password|no (puedo|logro) entrar|link|enlace|código/i],
  ['tecnico', /v[ií]deo|pantalla|carga|no abre|no funciona|error|bug|sonido|audio|negra|blanco|app no|aplicaci[oó]n|navegador|safari|chrome|iphone|android|instal/i],
  ['conteudo', /\bt[eé]s?\b|infusi|receta|men[uú]|plan\b|desayun|almuerz|cena\b|vinagre|hielo|fruta|protocolo|pdf|bono|bonus|extras|ayuno|comida|alimentac|calor[ií]a|herbat|dieta|diet\b/i],
  ['treino', /ejercicio|rutina|entren|d[ií]a \d|repetic|descans|calentam|estiram|dolor|lesi[oó]n|rodilla|espalda|embaraz|lactan|edad|a[ñn]os|principiante|nivel|progres|serie|ćwicz|trening/i],
  ['venda', /precio|cu[aá]nto (cuesta|vale|sale)|comprar|compra\b|descuento|cup[oó]n|oferta|pase completo|pilates|yoga|amiga|hermana|regal|indicar|recomend|link de (compra|pago)|pagar/i],
  ['depoimento', /testimon|comentario|coment[eé]|captura|print|foto|\[IMAGEM|\[VÍDEO|v[ií]deo de|resultado|antes y despu/i],
]

function sinaisFixos(conversa: MensagemConversa[]): Set<Assunto> {
  const ultimas = conversa.filter((m) => m.autor === 'student').slice(-3).map((m) => m.texto).join('\n')
  const s = new Set<Assunto>()
  if (SINAL_DINHEIRO.test(ultimas)) s.add('dinheiro')
  for (const [a, re] of SINAIS) if (re.test(ultimas)) s.add(a)
  return s
}

// ─── Classificador (Haiku, barato) ──────────────────────────────────────────────────────────────────────────────────────
const MODELO = 'claude-haiku-5-5'
let _client: Anthropic | null = null
const cliente = () => (_client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }))

const FORMATO = {
  type: 'json_schema' as const,
  schema: {
    type: 'object',
    properties: {
      assuntos: { type: 'array', items: { type: 'string', enum: [...ASSUNTOS, 'social', 'outro'] } },
      certeza: { type: 'string', enum: ['alta', 'media', 'baixa'] },
    },
    required: ['assuntos', 'certeza'],
    additionalProperties: false,
  },
}

const DESCRICAO = `acesso = entrar no app, senha, e-mail da conta, link de acesso, "não recebi", conta/compra não encontrada.
dinheiro = cobrança, reembolso, cancelar, valor cobrado, duplicidade, golpe, assinatura cobrada, fatura.
tecnico = vídeo não carrega/corta/sem som, tela em branco, erro, app travando, instalação, progresso não registra.
conteudo = o que está nos materiais: chás, receitas, plano anti-inchaço, vinagre, frutas, cardápio/menú, Protocolo, bônus, jejum, comida.
treino = como treinar: exercícios, dia X, repetições, descanso, aquecimento, dor/lesão, gravidez, idade, nível, aulas, TV.
venda = preço, comprar outro produto (Pilates, Pase, Protocolo), desconto, link de compra, amiga/parente quer comprar, indicação.
depoimento = ela manda print/foto/vídeo de resultado ou comentário, presente do depoimento, grupo/comunidade, brinde do cardápio.
social = só saudação/agradecimento/ok/emoji, sem pergunta.
outro = não se encaixa ou não dá para saber.`

/**
 * Assuntos da conversa (últimas mensagens dela). União dos sinais fixos com o classificador. "Na dúvida inclui": erro,
 * certeza baixa, 'outro' ou nada reconhecido → TODOS (prompt inteiro). 'social' sozinho → base.
 */
export async function classificarAssuntos(conversa: MensagemConversa[]): Promise<{ assuntos: Set<Assunto>; certeza: string; fonte: string }> {
  const fixos = sinaisFixos(conversa)
  const ultimas = conversa.slice(-6).map((m) => `${m.autor === 'student' ? 'ALUNA' : m.autor === 'system' ? 'SISTEMA' : 'NÓS'}: ${m.texto.slice(0, 300)}`).join('\n')
  try {
    const res = await cliente().beta.messages.create({
      model: MODELO,
      max_tokens: 200,
      output_config: { effort: 'low', format: FORMATO },
      system: `Você classifica a ÚLTIMA mensagem da aluna (com o contexto das anteriores) do suporte de WhatsApp do RiseMe (app de treino para mulheres) em assuntos. Pode marcar mais de um. Se a mensagem continua um assunto anterior, mantenha esse assunto.\n\nAssuntos:\n${DESCRICAO}`,
      messages: [{ role: 'user', content: `Conversa:\n${ultimas}\n\nResponda com os assuntos da última mensagem da aluna.` }],
    })
    const bloco = res.content.find((b) => b.type === 'text')
    const o = bloco && bloco.type === 'text' ? (JSON.parse(bloco.text) as { assuntos: string[]; certeza: string }) : { assuntos: ['outro'], certeza: 'baixa' }
    const ia = new Set(o.assuntos.filter((a): a is Assunto => (ASSUNTOS as readonly string[]).includes(a)))
    const social = o.assuntos.includes('social') && ia.size === 0
    if (o.assuntos.includes('outro') || o.certeza === 'baixa') return { assuntos: new Set(TODOS), certeza: o.certeza, fonte: 'duvida' }
    const uniao = new Set<Assunto>([...fixos, ...ia])
    if (!uniao.size && !social) return { assuntos: new Set(TODOS), certeza: o.certeza, fonte: 'vazio' }
    return { assuntos: uniao, certeza: o.certeza, fonte: social && !uniao.size ? 'social' : 'ia+sinais' }
  } catch (err) {
    console.error('[assuntos] classificador falhou, prompt inteiro:', err)
    return { assuntos: new Set(TODOS), certeza: 'erro', fonte: 'erro' }
  }
}
