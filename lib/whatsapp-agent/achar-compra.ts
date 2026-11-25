// ACHAR A COMPRA de quem escreve quando o endereço não bate com nenhuma conta (Bruno, 25/11/2026: "você tem que conseguir
// achar a compra… por que não está encontrando essas compras?").
// Caso de origem: aluna PL digitou o domínio errado no checkout (…@gmail.com no lugar de …@o2.pl). O acesso foi para um
// endereço que não é dela; ela escreveu 9 e-mails do endereço certo em 7 dias, disse o e-mail 3 vezes, mandou o comprovante,
// e o sistema só procurava e-mail IGUAL: 9 respostas "vamos verificar" e um pedido de reembolso que ninguém atendeu.
// Aqui a busca usa tudo o que ela já deu, nesta ordem: código pi_ citado · e-mail PARECIDO com o dela ou com os que citou ·
// telefone citado · nome do remetente. Só devolve quando sobra UMA conta. Nunca lança.
import { admin } from './conversa'

export type ComoAchou = 'pi-citado' | 'email-parecido' | 'telefone-citado' | 'nome'
export interface CompraAchada {
  userId: string
  emailConta: string // e-mail gravado na conta (o do checkout)
  como: ComoAchou
  pista: string // o que bateu (para o bot explicar e para o log)
  nuncaEntrou: boolean
  /** e-mail DELA que é parecido com o da conta (só em 'email-parecido') */
  emailDela?: string
}

const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g
const DIAS_NOME = 60

/** Distância de edição (Levenshtein). Textos curtos: sem atalho. */
export function distancia(a: string, b: string): number {
  if (a === b) return 0
  const linha = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diag = linha[0]
    linha[0] = i
    for (let j = 1; j <= b.length; j++) {
      const acima = linha[j]
      linha[j] = Math.min(linha[j] + 1, linha[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = acima
    }
  }
  return linha[b.length]
}

/** Sem acento, minúsculo, palavras em ordem alfabética ("Żółć Anna" = "anna zolc"). */
export function nomeNormal(n: string): string {
  return n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/gi, 'l').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((p) => p.length >= 2).sort().join(' ')
}

/**
 * O mesmo e-mail digitado diferente? Mesmo nome com outro domínio (gmail.com × o2.pl, gmail.con), ou mesmo domínio com
 * 1–2 letras trocadas no nome. `forte` = dá para confiar sem outra prova (nome comprido); curto pede o nome da pessoa batendo.
 */
export function emailParecido(a: string, b: string): { parecido: boolean; forte: boolean } {
  const nao = { parecido: false, forte: false }
  const [la, da] = a.toLowerCase().trim().split('@')
  const [lb, db] = b.toLowerCase().trim().split('@')
  if (!la || !lb || !da || !db || (la === lb && da === db)) return nao
  if (la === lb) return la.length >= 5 ? { parecido: true, forte: la.length >= 10 } : nao
  if (da !== db) return nao
  const d = distancia(la, lb)
  const teto = Math.min(la.length, lb.length) >= 10 ? 2 : 1
  return Math.min(la.length, lb.length) >= 6 && d <= teto ? { parecido: true, forte: Math.min(la.length, lb.length) >= 10 } : nao
}

/** Telefones citados no texto: sequência de 9 a 13 dígitos (número de conta, com 26, fica de fora). */
export function telefonesCitados(texto: string): string[] {
  const achados = texto.match(/\+?\d[\d\s().-]{6,22}\d/g) ?? []
  return [...new Set(achados.map((t) => t.replace(/\D/g, '')).filter((d) => d.length >= 9 && d.length <= 13))]
}

async function conta(userId: string): Promise<{ email: string; nuncaEntrou: boolean } | null> {
  const { data } = await admin().auth.admin.getUserById(userId)
  const email = data.user?.email?.toLowerCase()
  return email ? { email, nuncaEntrou: !data.user?.last_sign_in_at } : null
}

async function fechar(userId: string, como: ComoAchou, pista: string, emailDela?: string): Promise<CompraAchada | null> {
  const c = await conta(userId)
  return c ? { userId, emailConta: c.email, como, pista, nuncaEntrou: c.nuncaEntrou, emailDela } : null
}

export async function acharCompra(p: { de?: string | null; nome?: string | null; textos: string[] }): Promise<CompraAchada | null> {
  try {
    const db = admin()
    const tudo = p.textos.join('\n')
    const nomeDela = p.nome ? nomeNormal(p.nome) : ''
    const nomeBate = (n?: string | null) => Boolean(nomeDela && nomeDela.includes(' ') && n && nomeNormal(n) === nomeDela)

    // 1) Código da compra citado (a mensagem pronta do botão Zwrot do app traz o pi_; o recibo também).
    for (const pi of new Set(tudo.match(/pi_[A-Za-z0-9]{10,}/g) ?? [])) {
      const { data } = await db.from('stripe_vendas').select('user_id').eq('payment_intent', pi).not('user_id', 'is', null).limit(1)
      if (data?.[0]?.user_id) return fechar(data[0].user_id as string, 'pi-citado', pi)
    }

    // 2) E-mail parecido: o endereço de onde escreve e os que citou.
    const meus = [...new Set([p.de ?? '', ...(tudo.match(EMAIL) ?? [])].map((e) => e.toLowerCase().trim()).filter((e) => e.includes('@') && !/@riseme\.app$/.test(e)))]
    for (const meu of meus) {
      const [local, dominio] = meu.split('@')
      if (!local || local.length < 5) continue
      const cols = 'id, email, name'
      const [mesmoNome, mesmoInicio, mesmoFim] = await Promise.all([
        db.from('users').select(cols).ilike('email', `${local}@%`).limit(20),
        db.from('users').select(cols).ilike('email', `${local.slice(0, 4)}%@${dominio}`).order('created_at', { ascending: false }).limit(300),
        db.from('users').select(cols).ilike('email', `%${local.slice(-4)}@${dominio}`).order('created_at', { ascending: false }).limit(300),
      ])
      const candidatos = new Map<string, { id: string; email: string; name: string | null; forte: boolean }>()
      for (const u of [...(mesmoNome.data ?? []), ...(mesmoInicio.data ?? []), ...(mesmoFim.data ?? [])]) {
        const email = String(u.email ?? '').toLowerCase()
        const r = emailParecido(meu, email)
        if (r.parecido) candidatos.set(u.id as string, { id: u.id as string, email, name: (u.name as string | null) ?? null, forte: r.forte })
      }
      // Nome de e-mail curto e comum ("kasia@") existe em mais de uma pessoa: só vale com o nome dela batendo.
      const validos = [...candidatos.values()].filter((c) => c.forte || nomeBate(c.name))
      if (validos.length === 1) return fechar(validos[0].id, 'email-parecido', `${meu} ~ ${validos[0].email}`, meu)
      if (validos.length > 1) {
        const peloNome = validos.filter((c) => nomeBate(c.name))
        if (peloNome.length === 1) return fechar(peloNome[0].id, 'email-parecido', `${meu} ~ ${peloNome[0].email}`, meu)
      }
    }

    // 3) Telefone citado (o do checkout): últimos 9 dígitos, na conta ou na venda.
    for (const fone of telefonesCitados(tudo)) {
      const fim = fone.slice(-9)
      const [u, v] = await Promise.all([
        db.from('users').select('id').ilike('phone', `%${fim}`).limit(3),
        db.from('stripe_vendas').select('user_id').ilike('phone', `%${fim}`).not('user_id', 'is', null).limit(6),
      ])
      const ids = [...new Set([...(u.data ?? []).map((x) => x.id as string), ...(v.data ?? []).map((x) => x.user_id as string)])]
      if (ids.length === 1) return fechar(ids[0], 'telefone-citado', `final ${fone.slice(-4)}`)
    }

    // 4) Nome do remetente (nome + sobrenome) igual ao da compra, compra recente, UMA só.
    if (nomeDela.includes(' ')) {
      const primeiro = (p.nome ?? '').trim().split(/\s+/)[0]
      const desde = new Date(Date.now() - DIAS_NOME * 86_400_000).toISOString()
      const palavras = [...new Set((p.nome ?? '').trim().split(/\s+/).filter((w) => w.length >= 3))].slice(0, 2)
      const buscas = await Promise.all(palavras.flatMap((w) => [
        db.from('stripe_vendas').select('user_id, nome').ilike('nome', `%${w}%`).gte('created_at', desde).not('user_id', 'is', null).limit(300),
        db.from('users').select('id, name').ilike('name', `%${w}%`).gte('created_at', desde).limit(300),
      ]))
      const ids = new Set<string>()
      for (const b of buscas) for (const r of (b.data ?? []) as { user_id?: string; id?: string; nome?: string | null; name?: string | null }[]) {
        if (nomeBate(r.nome ?? r.name)) ids.add((r.user_id ?? r.id) as string)
      }
      if (ids.size === 1) return fechar([...ids][0], 'nome', primeiro)
    }
    return null
  } catch (err) {
    console.error('[achar-compra] falhou:', err)
    return null
  }
}

const COMO: Record<ComoAchou, string> = { 'pi-citado': 'pelo código da compra que ela citou', 'email-parecido': 'pelo e-mail parecido', 'telefone-citado': 'pelo telefone que ela citou', nome: 'pelo nome dela, igual ao da compra' }

/** O que o bot precisa saber sobre a compra achada (entra no topo do cartão da aluna). */
export function notaCompraAchada(a: CompraAchada, p: { de: string; corrigido: boolean; emailAntigo: string }): string {
  if (p.corrigido) {
    return `COMPRA ACHADA PELO SISTEMA (fato; NÃO peça confirmação nem dado nenhum): ela escreve de ${p.de}. No checkout o e-mail ficou gravado como ${p.emailAntigo} (digitado diferente), por isso o e-mail de acesso foi para um endereço que não é dela e a conta NUNCA ENTROU: ela pagou e ficou sem acesso por erro de digitação que o nosso sistema deveria ter visto. O sistema JÁ CORRIGIU o e-mail da conta: o login dela agora é ${p.de}.
O que fazer AGORA, numa resposta só: peça desculpas pela demora em 1 frase, explique em 1 frase o que houve (o e-mail da compra ficou com ${p.emailAntigo.split('@')[1]} no lugar de ${p.de.split('@')[1]}) e:
  (a) se ela NÃO pediu o dinheiro de volta nesta conversa → "reenviar_acesso" = true (o e-mail de acesso sai agora para ${p.de}; diga isso);
  (b) se ela JÁ pediu o dinheiro de volta nesta conversa → "reembolso_transacoes" = o pi_ da compra do cartão abaixo, sem perguntar motivo e sem oferecer nada (ela esperou por erro nosso; conta como decisão clara).
  (c) se o cartão abaixo JÁ mostra REEMBOLSO desta compra → não devolva de novo: diga que o reembolso já foi feito (data e prazo do cartão). O acesso continua dela, de presente: se ela quiser entrar, "reenviar_acesso" = true.
PROIBIDO: pedir de novo e-mail, comprovante ou telefone; dizer "vamos verificar", "przekazuję do zespołu", "sprawdzamy"; transferir.`
  }
  return `COMPRA ACHADA PELO SISTEMA ${COMO[a.como]} (${a.pista}): ela escreve de ${p.de} e a conta dela está com o e-mail ${a.emailConta}${a.nuncaEntrou ? ' (a conta NUNCA ENTROU)' : ''}. NÃO peça mais dados e NÃO diga "vamos verificar": a compra é a do cartão abaixo.
  · Acesso: "reenviar_acesso" = true manda o e-mail de acesso para ${a.emailConta}; diga o endereço. Se ela disser que esse endereço está errado ou não é dela, "novo_email" = ${p.de} (o sistema corrige e manda o acesso para lá).
  · Dinheiro de volta: regra COMPRA DA STRIPE, com o pi_ do cartão.`
}
