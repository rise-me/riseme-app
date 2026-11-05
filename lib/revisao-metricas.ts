// Medidor semanal do atendimento (Bruno, 05/11/2026, proposta q6 do mapa do WhatsApp): 5 grupos de números para a
// revisão de segunda — qualidade da resposta, desfecho das conversas, velocidade, dinheiro e custo. O "desfecho"
// (fechada bem / fechada mal / em aberto / reaberta) é a nota da semana; os outros explicam o porquê.
// Fontes: whatsapp_messages, whatsapp_outbox (kinds 'verificador' e 'uso-llm'), whatsapp_consultas, whatsapp_comandos.
import Anthropic from '@anthropic-ai/sdk'
import { admin } from './whatsapp-agent/conversa'

type Autor = 'student' | 'agent' | 'human' | 'system'
interface Msg { phone: string; author: Autor; body: string; at: string }

const POSITIVO = /\b(gracias|muchas gracias|mil gracias|perfecto|listo|genial|excelente|ya pude|ya entr[eé]|lo logr[eé]|funcion[oó]|dzi[eę]kuj[eę]|dzięki|super|grazie|teşekkür|thank)/i
const NEGATIVO = /reembols|devoluci|devuelv|estaf|fraud|robo|denunc|p[eé]sim|horrible|muy mal|no sirve|no funciona|sigue sin|todav[ií]a no|otra vez|ya (te |les )?(dije|escrib)|zwrot|oszust|nie dzia|^\s*no\W*$|^\s*stop\W*$/i

export interface MetricasSemana {
  janela: { desde: string; ate: string }
  qualidade: { respostas: number; corrigidas: number; corrigidasPor100: number; porProblema: Record<string, number>; respostasDobroDaPergunta: number; pctDobro: number }
  desfecho: { conversas: number; fechadasBem: number; fechadasMal: number; emAberto: number; reabertas: number; pctBem: number; classificadasPorIA: number }
  velocidade: { consultas: number; horasMediana: number | null; acima24h: number; pendentesAgora: number; semRespostaDoBot12h: number }
  dinheiro: { registrados: number; aprovados: number; recusados: number; erros: number; horasAteAprovar: number | null; passaramDo15: number }
  custo: { chamadas: number; totalUsd: number; porRespostaUsd: number | null; cacheLido: number; entradaSemCache: number }
}

const mediana = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : null)
const r1 = (x: number) => Math.round(x * 10) / 10

async function todas<T>(q: (from: number, to: number) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const out: T[] = []
  for (let f = 0; ; f += 1000) {
    const { data } = await q(f, f + 999)
    out.push(...(data ?? []))
    if ((data ?? []).length < 1000) break
  }
  return out
}

let _client: Anthropic | null = null
const anthropic = () => (_client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }))

/** Fim de conversa que as regras fixas não decidem: Haiku diz se fechou bem, mal ou ficou em aberto. */
async function classificarFim(ultimas: Msg[]): Promise<'bem' | 'mal' | 'aberto'> {
  const texto = ultimas.map((m) => `${m.author === 'student' ? 'ALUNA' : 'NÓS'}: ${m.body.slice(0, 300)}`).join('\n')
  try {
    const res = await anthropic().beta.messages.create({
      model: 'claude-haiku-5-5',
      max_tokens: 200,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: { type: 'object', properties: { desfecho: { type: 'string', enum: ['bem', 'mal', 'aberto'] } }, required: ['desfecho'], additionalProperties: false } } },
      system: 'Fim de uma conversa de suporte por WhatsApp. Responda como terminou para a aluna: "bem" = a questão dela foi resolvida ou ela ficou satisfeita; "mal" = ela saiu insatisfeita, irritada, sem solução ou pedindo dinheiro de volta; "aberto" = ela ainda espera algo (pergunta sem resposta, "vou ver", promessa pendente).',
      messages: [{ role: 'user', content: texto }],
    })
    const b = res.content.find((x) => x.type === 'text')
    return b && b.type === 'text' ? (JSON.parse(b.text).desfecho as 'bem' | 'mal' | 'aberto') : 'aberto'
  } catch {
    return 'aberto'
  }
}

export async function metricasDaSemana(desde: Date, ate: Date, msgs: Msg[]): Promise<MetricasSemana> {
  const db = admin()
  const dIso = desde.toISOString(), aIso = ate.toISOString()

  // ── Qualidade
  const verif = await todas<{ body: string }>((f, t) => db.from('whatsapp_outbox').select('body').eq('kind', 'verificador').gte('created_at', dIso).lt('created_at', aIso).range(f, t))
  const porProblema: Record<string, number> = {}
  let corrigidas = 0
  for (const v of verif) {
    try {
      const b = JSON.parse(v.body) as { corrigida: boolean; problemas: string[] }
      if (b.corrigida) corrigidas++
      for (const p of b.problemas ?? []) porProblema[p] = (porProblema[p] ?? 0) + 1
    } catch { /* linha inválida */ }
  }
  const respostas = msgs.filter((m) => m.author === 'agent').length
  // pares aluna→bot: resposta com mais que o dobro da pergunta (fora perguntas longas, que pedem resposta longa)
  const porFone = new Map<string, Msg[]>()
  for (const m of msgs) porFone.set(m.phone, [...(porFone.get(m.phone) ?? []), m])
  let pares = 0, dobro = 0
  for (const l of porFone.values()) {
    for (let i = 0; i < l.length - 1; i++) {
      if (l[i].author !== 'student' || l[i + 1].author !== 'agent') continue
      pares++
      if (l[i].body.length <= 80 && l[i + 1].body.length > Math.max(220, l[i].body.length * 2)) dobro++
    }
  }

  // ── Desfecho (por conversa com aluna + bot na janela)
  const consultas = await todas<{ id: number; phone: string; status: string; created_at: string; answered_at: string | null }>((f, t) => db.from('whatsapp_consultas').select('id, phone, status, created_at, answered_at').gte('created_at', dIso).lt('created_at', aIso).range(f, t))
  const { data: pendentesAgora } = await db.from('whatsapp_consultas').select('id, phone').eq('status', 'pendente')
  const pendPorFone = new Set((pendentesAgora ?? []).map((c) => c.phone))
  let bem = 0, mal = 0, aberto = 0, reabertas = 0, porIA = 0, semResposta12h = 0
  const indefinidas: { phone: string; ultimas: Msg[] }[] = []
  const agora = ate.getTime()
  for (const [phone, l] of porFone) {
    if (!l.some((m) => m.author === 'student') || !l.some((m) => m.author === 'agent')) continue
    const falas = l.filter((m) => m.author !== 'system')
    const ultima = falas[falas.length - 1]
    const ultimaDela = [...falas].reverse().find((m) => m.author === 'student')
    // reaberta: duas "rodadas" com mais de 3 dias entre a última nossa e a próxima dela
    for (let i = 1; i < falas.length; i++) if (falas[i].author === 'student' && falas[i - 1].author !== 'student' && new Date(falas[i].at).getTime() - new Date(falas[i - 1].at).getTime() > 3 * 86_400_000) { reabertas++; break }
    if (ultima.author === 'student' && agora - new Date(ultima.at).getTime() > 12 * 3_600_000) { semResposta12h++; aberto++; continue }
    if (pendPorFone.has(phone)) { aberto++; continue }
    if (ultimaDela && NEGATIVO.test(ultimaDela.body)) { mal++; continue }
    if (ultimaDela && POSITIVO.test(ultimaDela.body) && ultima.author !== 'student') { bem++; continue }
    indefinidas.push({ phone, ultimas: falas.slice(-4) })
  }
  // as indefinidas vão pra IA barata, em paralelo, até um teto (custo: centavos)
  const lote = indefinidas.slice(0, 120)
  for (let i = 0; i < lote.length; i += 8) {
    const rs = await Promise.all(lote.slice(i, i + 8).map((c) => classificarFim(c.ultimas)))
    for (const r of rs) { porIA++; if (r === 'bem') bem++; else if (r === 'mal') mal++; else aberto++ }
  }
  aberto += indefinidas.length - lote.length // o que passou do teto conta como aberto (não medido)
  const conversas = bem + mal + aberto

  // ── Velocidade
  const horas = consultas.filter((c) => c.answered_at && c.status === 'respondida').map((c) => (new Date(c.answered_at!).getTime() - new Date(c.created_at).getTime()) / 3600_000)
  const acima24h = consultas.filter((c) => { const fim = c.answered_at ? new Date(c.answered_at).getTime() : agora; return fim - new Date(c.created_at).getTime() > 24 * 3600_000 }).length

  // ── Dinheiro (comandos de reembolso criados na janela)
  const reemb = await todas<{ status: string; created_at: string; decided_at: string | null; params: { compradaEm?: string } }>((f, t) => db.from('whatsapp_comandos').select('status, created_at, decided_at, params').eq('acao', 'reembolsar').gte('created_at', dIso).lt('created_at', aIso).range(f, t))
  const aprovados = reemb.filter((c) => c.status === 'executado')
  const hAprov = aprovados.filter((c) => c.decided_at).map((c) => (new Date(c.decided_at!).getTime() - new Date(c.created_at).getTime()) / 3600_000)
  const passaramDo15 = reemb.filter((c) => c.params?.compradaEm && c.status === 'aguardando' && (agora - new Date(c.params.compradaEm).getTime()) / 86_400_000 > 15).length

  // ── Custo
  const uso = await todas<{ body: string }>((f, t) => db.from('whatsapp_outbox').select('body').eq('kind', 'uso-llm').gte('created_at', dIso).lt('created_at', aIso).range(f, t))
  let totalUsd = 0, cacheLido = 0, entrada = 0
  for (const u of uso) {
    try { const b = JSON.parse(u.body) as { custo_usd: number; cache_lido: number; entrada: number }; totalUsd += b.custo_usd || 0; cacheLido += b.cache_lido || 0; entrada += b.entrada || 0 } catch { /* linha inválida */ }
  }

  return {
    janela: { desde: dIso, ate: aIso },
    qualidade: { respostas, corrigidas, corrigidasPor100: respostas ? r1((corrigidas / respostas) * 100) : 0, porProblema, respostasDobroDaPergunta: dobro, pctDobro: pares ? Math.round((dobro / pares) * 100) : 0 },
    desfecho: { conversas, fechadasBem: bem, fechadasMal: mal, emAberto: aberto, reabertas, pctBem: conversas ? Math.round((bem / conversas) * 100) : 0, classificadasPorIA: porIA },
    velocidade: { consultas: consultas.length, horasMediana: mediana(horas) === null ? null : r1(mediana(horas)!), acima24h, pendentesAgora: pendentesAgora?.length ?? 0, semRespostaDoBot12h: semResposta12h },
    dinheiro: { registrados: reemb.length, aprovados: aprovados.length, recusados: reemb.filter((c) => c.status === 'cancelado').length, erros: reemb.filter((c) => c.status === 'erro').length, horasAteAprovar: mediana(hAprov) === null ? null : r1(mediana(hAprov)!), passaramDo15 },
    custo: { chamadas: uso.length, totalUsd: Math.round(totalUsd * 100) / 100, porRespostaUsd: uso.length ? Math.round((totalUsd / uso.length) * 10000) / 10000 : null, cacheLido, entradaSemCache: entrada },
  }
}

/** Tabela HTML das métricas (vai no e-mail da revisão). */
export function htmlMetricas(m: MetricasSemana, ant?: MetricasSemana | null): string {
  const d = (a: number, b?: number | null) => (b == null ? '' : ` <span style="color:#777">(${a > b ? '+' : ''}${Math.round((a - b) * 10) / 10} vs. anterior)</span>`)
  const tr = (k: string, v: string) => `<tr><td style="padding:2px 10px 2px 0">${k}</td><td><b>${v}</b></td></tr>`
  const probs = Object.entries(m.qualidade.porProblema).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).join(' · ') || '—'
  return `<h2>Nota da semana: ${m.desfecho.pctBem}% das conversas fecharam bem</h2>
<table style="border-collapse:collapse;font-size:14px">
<tr><td colspan="2" style="padding-top:8px"><b>Desfecho</b> (${m.desfecho.conversas} conversas; ${m.desfecho.classificadasPorIA} decididas por IA)</td></tr>
${tr('Fechadas bem', `${m.desfecho.fechadasBem}${d(m.desfecho.fechadasBem, ant?.desfecho.fechadasBem)}`)}
${tr('Fechadas mal', `${m.desfecho.fechadasMal}${d(m.desfecho.fechadasMal, ant?.desfecho.fechadasMal)}`)}
${tr('Em aberto', `${m.desfecho.emAberto}${d(m.desfecho.emAberto, ant?.desfecho.emAberto)}`)}
${tr('Reabertas (voltou com problema depois de 3+ dias)', String(m.desfecho.reabertas))}
<tr><td colspan="2" style="padding-top:8px"><b>Qualidade da resposta</b></td></tr>
${tr('Respostas do bot', String(m.qualidade.respostas))}
${tr('Corrigidas pelo verificador', `${m.qualidade.corrigidas} (${m.qualidade.corrigidasPor100} por 100)`)}
${tr('Motivos mais comuns', probs)}
${tr('Resposta com mais que o dobro de uma pergunta curta', `${m.qualidade.respostasDobroDaPergunta} (${m.qualidade.pctDobro}% dos pares)`)}
<tr><td colspan="2" style="padding-top:8px"><b>Velocidade</b></td></tr>
${tr('Transferidas ao responsável', String(m.velocidade.consultas))}
${tr('Tempo até a resposta humana (mediana)', `${m.velocidade.horasMediana ?? '—'} h${d(m.velocidade.horasMediana ?? 0, ant?.velocidade.horasMediana)}`)}
${tr('Passaram de 24 h', String(m.velocidade.acima24h))}
${tr('Consultas pendentes agora', String(m.velocidade.pendentesAgora))}
${tr('Aluna sem resposta do bot há 12 h+', String(m.velocidade.semRespostaDoBot12h))}
<tr><td colspan="2" style="padding-top:8px"><b>Dinheiro</b></td></tr>
${tr('Reembolsos registrados · aprovados · recusados · erro', `${m.dinheiro.registrados} · ${m.dinheiro.aprovados} · ${m.dinheiro.recusados} · ${m.dinheiro.erros}`)}
${tr('Tempo até a aprovação (mediana)', `${m.dinheiro.horasAteAprovar ?? '—'} h`)}
${tr('Passaram do dia 15 sem decisão', `${m.dinheiro.passaramDo15}${m.dinheiro.passaramDo15 ? ' ⚠️' : ''}`)}
<tr><td colspan="2" style="padding-top:8px"><b>Custo do bot</b></td></tr>
${tr('Chamadas · total · por resposta', `${m.custo.chamadas} · US$ ${m.custo.totalUsd} · US$ ${m.custo.porRespostaUsd ?? '—'}`)}
${tr('Tokens lidos do cache × sem cache', `${m.custo.cacheLido.toLocaleString('pt-BR')} × ${m.custo.entradaSemCache.toLocaleString('pt-BR')}`)}
</table>`
}
