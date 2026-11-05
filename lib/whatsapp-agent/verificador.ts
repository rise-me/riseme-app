// Verificador antes de enviar (Bruno, 05/11/2026, proposta q1 do mapa do WhatsApp): o bot escreve, e ANTES de a mensagem
// sair alguém confere contra a "voz do atendimento". Dois passos: checagens fixas (baratas, sem IA) e um editor com IA
// barata (Haiku) que só corta e reescreve — nunca acrescenta informação. Se tudo passa, a mensagem sai igual.
// Cada correção fica registrada (whatsapp_outbox kind 'verificador') para a revisão semanal contar por tipo.
// Motivo: em 05/10–04/11 a resposta mediana tinha 8× o tamanho da mensagem dela, 277 mensagens curtas viraram parágrafos
// e 24% das respostas abriam com "Hola" apesar da regra "saudação só 1×/dia".
import Anthropic from '@anthropic-ai/sdk'
import type { MensagemConversa } from './responder'

const MODELO_EDITOR = 'claude-haiku-5-5'
let _client: Anthropic | null = null
const cliente = () => (_client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }))

export const VOZ = `VOZ DO ATENDIMENTO RISEME (régua de toda resposta):
1. Responde ao que ela disse, e só isso. Mensagem curta dela = resposta curta (1–2 frases). Nunca reabrir o assunto anterior.
2. Tamanho: no máximo o dobro da mensagem dela. Exceção: dúvida de conteúdo (receita, chá, treino, uso do app), em blocos curtos, no máximo 4.
3. "Gracias", "ok", "listo", "buen día", "si": uma linha de volta, ou só um 💛. Nada de explicar coisas.
4. Saudação ("Hola, Fulana") só na primeira mensagem do dia. Depois, direto ao assunto.
5. Não apresenta o produto a quem já comprou (ela sabe o que é), a menos que ELA pergunte: se perguntar o que inclui, como funciona ou sobre outros produtos, responde.
6. Nunca "sector responsable" / "setor responsável" como muleta: dizer o que vai acontecer e quando.
7. Uma pergunta por vez: se precisa de duas informações (ex.: e-mail e número da transação), pede a primeira; a segunda vem na próxima mensagem.
8. Emoji é bem-vindo quando deixa a conversa humana e carinhosa (😊 🥰 💛 🙌): 1 ou 2 por mensagem, no fim da frase (nunca no meio dela), nunca em toda linha e nunca em assunto de dinheiro ou reclamação. Negrito só para o que ela precisa achar (botão, aba).
9. Só o idioma dela. Nenhuma palavra em português numa resposta em espanhol, polonês, tcheco, italiano, turco ou inglês.
10. Quando não sabe: diz em uma frase e encaminha com prazo. Não inventa, não enrola.
11. Quebra de linha: blocos de 1–2 frases separados por linha em branco. Nunca um bloco só de texto corrido com mais de 2 frases; lista de passos, um por linha.`

// Palavras em português que já vazaram em respostas de outros idiomas (revisões de 31/10 e 05/11).
const PT_VAZADO = /\b(chás?|aba|atendimiento|convite|cardápio|senha|aplicativo|você|obrigad[ao]|também|então|já está|está com|não)\b/i
const SAUDACAO = /^\s*[¡!]?\s*(hola|buen[oa]s?\s*(d[ií]as?|tardes|noches)|cześć|dzień dobry|ahoj|ciao|merhaba|hi|hello)\b/i
const CURTA = /^\s*(gracias|muchas gracias|ok|okay|listo|vale|s[ií]|si|perfecto|buen[oa]s?\s*(d[ií]as?|tardes|noches)|hola|dzięki|dziękuję|ok[ae]y|grazie|teşekkürler|thanks?|thank you)\W*$/i

export interface Verificacao { texto: string; corrigida: boolean; problemas: string[] }

function hojeBRT(iso: string): string {
  return new Date(new Date(iso).getTime() - 3 * 3_600_000).toISOString().slice(0, 10)
}

/** Checagens fixas: devolvem a lista de problemas (vazia = passou). */
export function checarFixo(texto: string, conversa: MensagemConversa[], agora: string): string[] {
  const problemas: string[] = []
  const dela = [...conversa].reverse().find((m) => m.autor === 'student')?.texto ?? ''
  const idioma = conversa.find((m) => m.autor === 'student')?.texto ?? ''
  const falouHoje = conversa.some((m) => m.autor !== 'student' && m.autor !== 'system' && hojeBRT(m.em) === hojeBRT(agora))
  if (falouHoje && SAUDACAO.test(texto)) problemas.push('saudacao_repetida')
  if (CURTA.test(dela.trim()) && texto.length > 160) problemas.push('resposta_longa_para_mensagem_social')
  else if (dela.length > 0 && dela.length <= 60 && texto.length > Math.max(400, dela.length * 6)) problemas.push('resposta_muito_maior_que_a_pergunta')
  if (texto.length > 900) problemas.push('acima_de_900_caracteres')
  if (/sector responsable|setor respons[aá]vel|dzia[łl] odpowiedzialn/i.test(texto)) problemas.push('sector_responsable')
  if (!/[ãçõ]|\bvocê\b|\bnão\b/.test(idioma) && PT_VAZADO.test(texto)) problemas.push('palavra_em_portugues')
  const emojis = (texto.match(/\p{Extended_Pictographic}/gu) ?? []).length
  if (emojis > 3) problemas.push('emojis_demais')
  if (texto.length > 300 && !/\n\s*\n/.test(texto)) problemas.push('bloco_sem_quebra_de_linha')
  if ((texto.match(/\?/g) ?? []).length > 2) problemas.push('perguntas_demais')
  if (/\b(riseme\.app|consumer\.hotmart\.com|refund\.hotmart\.com)\b/i.test(texto) && !/https?:\/\//.test(texto)) problemas.push('link_sem_https')
  return problemas
}

const FORMATO = {
  type: 'json_schema' as const,
  schema: {
    type: 'object',
    properties: { aprovada: { type: 'boolean' }, problemas: { type: 'array', items: { type: 'string' } }, texto_corrigido: { type: 'string' } },
    required: ['aprovada', 'problemas', 'texto_corrigido'],
    additionalProperties: false,
  },
}

/**
 * Confere a resposta do bot antes de enviar. Devolve o texto (corrigido ou igual). Nunca lança: em erro, devolve o original.
 * `permiteLongo` = a mensagem é uma resposta de conteúdo/dinheiro/reembolso em que blocos são esperados.
 */
export async function verificarResposta(p: { texto: string; conversa: MensagemConversa[]; agora: string; permiteLongo?: boolean }): Promise<Verificacao> {
  const original = p.texto.trim()
  if (!original) return { texto: original, corrigida: false, problemas: [] }
  const fixos = checarFixo(original, p.conversa, p.agora).filter((x) => !(p.permiteLongo && /longa|maior|900/.test(x)))
  const ultimas = p.conversa.slice(-8).map((m) => `${m.autor === 'student' ? 'ALUNA' : m.autor === 'system' ? 'SISTEMA' : 'NÓS'}: ${m.texto.slice(0, 400)}`).join('\n')
  try {
    const res = await cliente().beta.messages.create({
      model: MODELO_EDITOR,
      max_tokens: 1500,
      output_config: { effort: 'low', format: FORMATO },
      system:
        'Você é a editora final do atendimento de WhatsApp do RiseMe (app de treino para mulheres). Recebe a conversa e a RESPOSTA que o bot ' +
        'quer mandar, e confere contra a VOZ. Regras suas: (a) NUNCA acrescente informação, promessa, prazo, link ou fato que não esteja ' +
        'na resposta original; você só corta, encurta, reordena e corrige idioma/tom; (b) mantenha os links, números, valores e *negritos* ' +
        'que precisam ficar; (c) mantenha o idioma da resposta; (d) se a resposta já está boa, aprovada=true e texto_corrigido="" ; ' +
        '(e) se corrigir, texto_corrigido é a mensagem INTEIRA pronta para enviar, natural, como uma pessoa escreve no WhatsApp; ' +
        '(f) problemas = lista curta em português do que estava errado (ex.: "longa demais", "saudação repetida", "reabriu assunto", ' +
        '"explica o produto sem ela perguntar", "sector responsable", "palavra em português", "tom de robô", "duas perguntas", "bloco sem quebra de linha").\n\n' + VOZ,
      messages: [{ role: 'user', content: `Conversa (últimas mensagens):\n${ultimas}\n\nProblemas já detectados por checagem fixa: ${fixos.length ? fixos.join(', ') : 'nenhum'}${p.permiteLongo ? '\n(Esta resposta pode ser longa: é de conteúdo/dinheiro.)' : ''}\n\nRESPOSTA DO BOT:\n«${original}»` }],
    })
    const bloco = res.content.find((b) => b.type === 'text')
    if (!bloco || bloco.type !== 'text') return { texto: original, corrigida: false, problemas: fixos }
    const o = JSON.parse(bloco.text) as { aprovada: boolean; problemas: string[]; texto_corrigido: string }
    const novo = (o.texto_corrigido ?? '').trim()
    const problemas = [...new Set([...fixos, ...(o.problemas ?? [])])]
    // Só aceita a correção se for um texto real, no mesmo idioma de sempre e sem link novo.
    const linksAntes = (original.match(/https?:\/\/\S+/g) ?? []).sort().join(' ')
    const linksDepois = (novo.match(/https?:\/\/\S+/g) ?? []).sort().join(' ')
    if (o.aprovada || !novo || novo === original || novo.length < 2 || linksDepois !== linksAntes) return { texto: original, corrigida: false, problemas }
    return { texto: novo, corrigida: true, problemas }
  } catch (err) {
    console.error('[verificador] falhou, mandando original:', err)
    return { texto: original, corrigida: false, problemas: fixos }
  }
}

/** Registro para a revisão semanal (só quando corrigiu ou achou problema). */
export async function registrarVerificacao(phone: string, antes: string, v: Verificacao): Promise<void> {
  if (!v.corrigida && !v.problemas.length) return
  const { admin } = await import('./conversa')
  const agora = new Date().toISOString()
  await admin().from('whatsapp_outbox').insert({ phone: phone.replace(/\D/g, '') || 'sem-telefone', kind: 'verificador', body: JSON.stringify({ corrigida: v.corrigida, problemas: v.problemas, antes, depois: v.corrigida ? v.texto : null }), send_after: agora, sent_at: agora }).then(({ error }) => { if (error) console.error('[verificador] registro falhou:', error.message) })
}
