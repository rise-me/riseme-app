// FICHA POR OFERTA (Bruno 27/11/2026: "complexidade atrás de complexidade"; "parece o melhor desenho"). Cada oferta que o
// bot atende tem UM arquivo aqui com tudo o que é só dela. A cada resposta o bot lê só a ficha da oferta da aluna, não a de
// todos os países (antes uma polonesa perguntando de compra lia também Índia e Holanda).
//
// ENTRAR com oferta nova: criar ofertas/<sigla>.ts e pôr na lista FICHAS (a ordem é a do texto no prompt).
// TIRAR uma oferta: apagar o arquivo e a linha da lista. O bloco de conhecimento, o DDI e o nome no cartão somem juntos.
//   Ficam fora da ficha, de propósito, os TEXTOS FIXOS por idioma (não confundem o bot, são tabela): acesso/apoio/reenvio em
//   lib/whatsapp-access.ts, reembolso em reembolsos.ts, prazo em responder.ts (PRAZO), lembrete em lib/lembrete-24h.ts,
//   casos em scripts/testar-agente.ts. Só saem quando nenhuma aluna com conta naquele idioma puder mais escrever.
// O que NÃO é de uma oferta (Hotmart/espanhol, regras gerais da Stripe, app) continua em conhecimento.ts.
import type { FichaOferta } from './tipos'
import { ficha as clPl } from './cl-pl'
import { ficha as clIn } from './cl-in'
import { ficha as clHi } from './cl-hi'
import { ficha as clNl } from './cl-nl'

export type { FichaOferta } from './tipos'
export const FICHAS: FichaOferta[] = [clPl, clIn, clHi, clNl]

// CHAVE. Desligada = o bot lê TODAS as fichas em toda resposta (prompt idêntico ao de antes da mudança, conferido letra a
// letra em 27/11/2026). Ligada = só as fichas da conversa. Liga-se aqui, com o ok do Bruno depois da bateria no servidor;
// BOT_FICHA_POR_OFERTA=on|off na Vercel vence este padrão sem deploy (para desligar na hora).
const LIGADA_POR_PADRAO = false
export function fichaPorOfertaLigada(): boolean {
  return (process.env.BOT_FICHA_POR_OFERTA ?? (LIGADA_POR_PADRAO ? 'on' : 'off')).toLowerCase() === 'on'
}

export const MARCA_ACESSO = '[[OFERTAS:acesso]]'
export const MARCA_DINHEIRO = '[[OFERTAS:dinheiro]]'

/** Troca as duas marcas pelo texto das fichas dadas, na ordem de FICHAS. Texto igual (Índia en/hi no dinheiro) sai uma vez. */
export function aplicarFichas(texto: string, fichas: FichaOferta[]): string {
  const sel = FICHAS.filter((f) => fichas.includes(f))
  const unicos = (campo: 'acesso' | 'dinheiro') => [...new Set(sel.map((f) => f[campo]))].join('')
  return texto.split(MARCA_ACESSO).join(unicos('acesso')).split(MARCA_DINHEIRO).join(unicos('dinheiro'))
}

/**
 * Fichas que entram no prompt desta conversa. Soma todas as pistas (não escolhe uma): idioma da conta, oferta no cartão,
 * DDI do número, idioma padrão do canal (e-mail) e sinais no que ela escreveu (escrita, moeda, meio de pagamento).
 * Sem conta e sem nenhuma pista: TODAS, como era antes ("na dúvida inclui"). Com conta e sem pista (aluna da Hotmart em
 * espanhol): nenhuma, que é o ganho.
 */
export function fichasDaConversa(e: { temPerfil: boolean; idioma?: string; cartao?: string; phone?: string; idiomaPadrao?: string; textos?: string }): FichaOferta[] {
  const tel = (e.phone ?? '').includes('@') ? '' : (e.phone ?? '').replace(/\D/g, '')
  const achou = FICHAS.filter((f) =>
    (e.temPerfil && f.idioma === e.idioma) ||
    (!e.temPerfil && Boolean(e.idiomaPadrao) && f.idioma === e.idiomaPadrao) ||
    Object.keys(f.noCartao).some((c) => (e.cartao ?? '').includes(c)) ||
    (Boolean(tel) && f.ddis.some((d) => tel.startsWith(d))) ||
    f.sinais.test(e.textos ?? ''))
  const comJunto = FICHAS.filter((f) => achou.includes(f) || achou.some((a) => a.junto.includes(f.sigla)))
  return comJunto.length || e.temPerfil ? comJunto : FICHAS
}

/** Nome legível de cada código de oferta da Stripe, para o cartão da aluna. */
export const NOME_NO_CARTAO: Record<string, string> = Object.assign({}, ...FICHAS.map((f) => f.noCartao))

/** DDI → idioma das ofertas com ficha, na ordem de FICHAS (DDI repetido: vale a primeira, ex.: +91 → en). */
export const DDI_DAS_FICHAS: [string, string][] = FICHAS.flatMap((f) => f.ddis.map((d): [string, string] => [d, f.idioma])).filter(([d], k, l) => l.findIndex(([x]) => x === d) === k)
