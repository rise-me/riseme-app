// Link e textos da indicação de amigas (Bruno, 19/10/2026) — DADOS DO CASO num arquivo só, usado pelo app
// (cartão no Início), pelo agente do WhatsApp e pelo webhook da Hotmart. Por enquanto só CL-ES (Hotmart, espanhol).
// Método e evidência: docs/indicacao.md.

const CHECKOUT_ES = 'https://pay.hotmart.com/H101419289G?off=j3m3v9m3&checkoutMode=10&hideBillet=1&hideMultipleCards=1'
export const LINK_INDICACAO = `${CHECKOUT_ES}&src=indicacao` // genérico (quando não se sabe quem indicou)

// src por aluna: a Hotmart devolve no webhook (data.purchase.origin.src) e o dash grava como veio (sem "|").
export const PREFIXO_SRC = 'ind-'
export function linkIndicacao(userId: string): string {
  return `${CHECKOUT_ES}&src=${PREFIXO_SRC}${userId}`
}
export function indicadoraDoSrc(src: string | null | undefined): string | null {
  const m = src?.match(/^ind-([0-9a-f-]{36})$/i)
  return m ? m[1].toLowerCase() : null
}

export const COPY_ES = {
  titulo: 'Invita a una amiga 💛',
  texto: 'Gana 1 mes del *Pase Completo* con todos los desafíos por cada amiga que compre con tu link. Y ella se lleva de regalo una dieta personalizada.',
  botao: 'Compartir por WhatsApp',
  mensagem: (link: string) =>
    `Amiga, estoy haciendo este reto de entrenamientos en casa y me está encantando 💪 ¿Lo hacemos juntas? Con mi link te llevas de regalo una dieta personalizada 👉 ${link}`,
}
