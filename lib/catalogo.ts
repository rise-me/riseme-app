// CATÁLOGO = DADO (Bruno, 05/11/2026, item 5 do plano do mapa do WhatsApp): produto → ofertas com código, preço, moeda,
// país, link e status. Fonte única para o ATENDIMENTO, que só INFORMA (preço normal + link oficial), nunca negocia nem
// dá desconto. Pedido de desconto, pagamento recusado ou "quero comprar" é caso do FLUXO DE VENDA (etapa seguinte).
// Montado em 05/11 da API da Hotmart (vendas por oferta), do config.js da CL-ES (testes de preço), do dash e do código
// (recuperacao.ts, pase.ts, conhecimento.ts). O Bruno valida; o que está com "?" ele preenche. Ao ligar/desligar um teste
// de preço, atualizar aqui E em recuperacao.ts/config.js (dívida: ainda são três lugares).
// A VERSÃO PARA VALIDAR está em docs/catalogo-ofertas.md (gerada por scripts/catalogo-md.ts a partir daqui).

export type StatusOferta = 'vigente' | 'teste' | 'recuperacao' | 'order-bump' | 'upsell' | 'descontinuada'

export interface Oferta {
  codigo: string
  preco: string // como a aluna vê no funil (a Hotmart cobra em moeda local pelo câmbio do dia)
  status: StatusOferta
  paises?: string[] // vazio = todos
  link?: string // link oficial completo (com os parâmetros do funil); sem link = não se vende avulso
  nota?: string
  ate?: string // teste: data prevista de leitura
}

export interface Produto {
  id: string // id no app (user_challenges.challenge_id) ou nome interno
  nome: string // como a aluna chama
  hotmartId?: number
  plataforma: 'hotmart' | 'perfectpay' | 'app'
  idioma: string
  tipo: 'desafio' | 'material' | 'assinatura' | 'bump'
  garantiaDias: number
  oQueE: string // 1 frase para o bot
  ofertas: Oferta[]
  funil?: string // página de venda (quem ainda NÃO comprou vai para cá, nunca para o checkout: preserva os testes de preço)
  suporteVende: boolean // o atendimento pode mandar o link de preço normal quando ELA pede
  meiosPagamento?: string
}

const CHECKOUT_CL_ES = 'https://pay.hotmart.com/H101419289G'
const PARAMS_CL_ES = '&checkoutMode=10&hideBillet=1&hideMultipleCards=1' // os mesmos do atalho hotm.io/checkout-calistenia-es-sem-boleto
const link = (base: string, off: string, params = PARAMS_CL_ES) => `${base}?off=${off}${params}`

export const CATALOGO: Produto[] = [
  {
    id: '1',
    nome: 'Calistenia en Casa (Desafío de 28 Días de Calistenia)',
    hotmartId: 6087092,
    plataforma: 'hotmart',
    idioma: 'es',
    tipo: 'desafio',
    garantiaDias: 15,
    oQueE: '28 dias de treino com o peso do corpo, um vídeo por dia no app, pagamento único e acesso vitalício.',
    funil: 'https://calistenia.riseme.fitness',
    suporteVende: true,
    meiosPagamento: 'cartão, PayPal, Mercado Pago, PSE, Nequi, Yape e outros meios locais da Hotmart (o boleto fica escondido no link oficial)',
    ofertas: [
      { codigo: 'j3m3v9m3', preco: 'US$ 12,90', status: 'vigente', link: link(CHECKOUT_CL_ES, 'j3m3v9m3'), nota: 'preço normal do funil para todos os países fora dos testes abaixo' },
      { codigo: 'yrn1s1q7', preco: 'US$ 19,90', status: 'vigente', paises: ['US', 'PR'], link: link(CHECKOUT_CL_ES, 'yrn1s1q7'), nota: 'EUA e Porto Rico desde 03/11 (T19 venceu); é o A do T30' },
      { codigo: '0kk0z0if', preco: 'US$ 24,90', status: 'teste', paises: ['US', 'PR'], link: link(CHECKOUT_CL_ES, '0kk0z0if'), nota: 'T30 (24,90 × 19,90), metade de EUA/PR', ate: '2026-11-14' },
      { codigo: '39kagsh5', preco: 'US$ 14,90', status: 'teste', paises: ['CO', 'MX'], link: link(CHECKOUT_CL_ES, '39kagsh5'), nota: 'T25 Colômbia (desde 29/10) e T31 México (desde 03/11), metade vê 12,90', ate: '2026-11-10' },
      { codigo: '(RECUPERACAO_OFERTA)', preco: 'US$ 12,90', status: 'recuperacao', nota: 'mesmo produto e preço, código próprio só para o dash separar venda recuperada; o código mora na env da Vercel (não lido aqui) — Bruno confirma' },
    ],
  },
  {
    id: '2',
    nome: 'Pilates en la Pared 2.0',
    hotmartId: 4784921,
    plataforma: 'hotmart',
    idioma: 'es',
    tipo: 'desafio',
    garantiaDias: 30,
    oQueE: '28 dias de pilates na parede, um vídeo por dia no app, pagamento único e acesso vitalício. Vende-se avulso (Bruno, 05/11).',
    suporteVende: true,
    ofertas: [
      { codigo: '?', preco: 'US$ 12,90 (há oferta de 14,90)', status: 'vigente', nota: 'oferta avulsa existe na Hotmart (produto 4784921, várias ofertas); CÓDIGO E LINK a receber do Bruno — até lá o bot transfere o pedido com motivo "VENDA — link do Pilates avulso" (?)' },
      { codigo: 'dtl4s1cf', preco: 'US$ 7,90', status: 'order-bump', nota: 'order bump no checkout da Calistenia (preço só ali)' },
    ],
  },
  {
    id: 'protocolo-metabolico',
    nome: 'Protocolo Metabólico 28D',
    hotmartId: 7319586,
    plataforma: 'hotmart',
    idioma: 'es',
    tipo: 'material',
    garantiaDias: 15,
    oQueE: 'Sistema de chás de 28 dias (um por semana, somado ao anterior), em PDF na aba Extras → Tus productos; complementa o desafio.',
    suporteVende: true,
    ofertas: [
      { codigo: 'ad7ti2nf', preco: 'US$ 19', status: 'vigente', link: 'https://pay.hotmart.com/N104738863H?off=ad7ti2nf&checkoutMode=10', nota: 'preço de aluna (o mesmo do upsell); comprar com o MESMO e-mail do desafio' },
    ],
  },
  {
    id: 'pase-completo',
    nome: 'Pase Completo (todos los desafíos)',
    hotmartId: 5734184,
    plataforma: 'hotmart',
    idioma: 'es',
    tipo: 'assinatura',
    garantiaDias: 30,
    oQueE: 'Assinatura que abre todos os desafios do app (Calistenia, Pilates, Yoga Facial, Yoga en la Silla, Cuerpo Sexy de Verano, Preparto, Posparto e os próximos).',
    suporteVende: true,
    ofertas: [
      { codigo: 'v4lltj3v', preco: '7 dias grátis, depois US$ 27 por ano', status: 'vigente', link: 'https://pay.hotmart.com/K100401831L?off=v4lltj3v&checkoutMode=10', nota: 'cobra no dia 8; cancelar antes = nada cobrado; é a oferta do upsell 2 e do convite do suporte' },
      { codigo: 'gm2lcusd', preco: '7 dias grátis, depois US$ 27 por ano', status: 'vigente', nota: 'variante do trial (aparece em vendas de 2026); mesmo plano; sem link no suporte' },
      { codigo: 'peuqcm4o', preco: 'mensal (valor: Bruno confirma ?)', status: 'descontinuada', nota: 'HOTMART_OFFER_MONTHLY: existe e tem assinantes antigos; o bot não oferece (Bruno 05/11)' },
      { codigo: '4wnszk9x', preco: 'anual (valor: Bruno confirma ?)', status: 'descontinuada', nota: 'HOTMART_OFFER_ANNUAL: existe e tem assinantes antigos; o bot não oferece (Bruno 05/11)' },
    ],
  },
  {
    id: 'riseme-fit',
    nome: 'RiseMe FIT – Dieta Flexible personalizada',
    hotmartId: 6714348,
    plataforma: 'hotmart',
    idioma: 'es',
    tipo: 'bump',
    garantiaDias: 30,
    oQueE: 'Order bump antigo (assinatura mensal de US$ 1,99); ainda cobra ~18 assinantes. Não se vende mais.',
    suporteVende: false,
    ofertas: [{ codigo: 'cn6j44ww', preco: 'US$ 1,99/mês', status: 'descontinuada', nota: 'cancelar pelo app (Más → Gestionar suscripción) ou transferir' }],
  },
  {
    id: 'desafios-so-no-pase',
    nome: 'Yoga Facial · Yoga en la Silla · Cuerpo Sexy de Verano · Preparto · Posparto',
    plataforma: 'app',
    idioma: 'es',
    tipo: 'desafio',
    garantiaDias: 0,
    oQueE: 'Desafios do app sem venda avulsa: entram pelo Pase Completo (ou como presente do depoimento).',
    suporteVende: false,
    ofertas: [],
  },
  {
    id: '9',
    nome: 'Plan de Bienestar Íntimo (KGF-ES)',
    hotmartId: 8806587,
    plataforma: 'hotmart',
    idioma: 'es',
    tipo: 'desafio',
    garantiaDias: 30,
    oQueE: 'Saúde sexual feminina (exercícios de Kegel) no app; oferta em criação, ainda sem criativos nem venda (Bruno 05/11). Não oferecer.',
    suporteVende: false,
    ofertas: [{ codigo: '?', preco: '?', status: 'descontinuada', nota: 'em criação; preencher quando lançar' }],
  },
  {
    id: '1-pl',
    nome: '28-dniowe Wyzwanie Kalisteniczne (CL-PL)',
    plataforma: 'perfectpay',
    idioma: 'pl',
    tipo: 'desafio',
    garantiaDias: 30,
    oQueE: 'A Calistenia em polonês, vendida pela Perfect Pay (fatura "Perfect Academy"/Portugal).',
    suporteVende: false,
    meiosPagamento: 'cartão (banco polonês recusa ~metade), PayPal, Apple Pay, Google Pay; sem BLIK',
    ofertas: [{ codigo: 'PPPBFHGM', preco: '67 zł', status: 'vigente', link: 'https://go.centerpag.com/PPU38CQGNRM', nota: 'produto PPPBFHGM; reembolso manual no painel da Perfect Pay' }],
  },
  {
    id: '1-cz',
    nome: 'Kalistenická výzva 28 dní (CL-CZ)',
    hotmartId: 8735819,
    plataforma: 'hotmart',
    idioma: 'cs',
    tipo: 'desafio',
    garantiaDias: 30,
    oQueE: 'A MESMA Calistenia, em tcheco (variação de idioma, não é outro produto): quem já tem a Calistenia não precisa; nunca oferecer a aluna.',
    suporteVende: false,
    ofertas: [{ codigo: '?', preco: '17 €', status: 'vigente', nota: 'link do funil kalistenika-cz a preencher (?)' }],
  },
  {
    id: '1-it',
    nome: 'Sfida di Calistenia 28 giorni (CL-IT)',
    hotmartId: 8805538,
    plataforma: 'hotmart',
    idioma: 'it',
    tipo: 'desafio',
    garantiaDias: 30,
    oQueE: 'A MESMA Calistenia, em italiano (variação de idioma, não é outro produto): quem já tem a Calistenia não precisa; nunca oferecer a aluna.',
    suporteVende: false,
    ofertas: [{ codigo: '?', preco: '17 €', status: 'vigente', nota: 'link do funil calistenia-it a preencher (?)' }],
  },
  {
    id: '1-ro',
    nome: 'Provocarea de Calistenie (CL-RO)',
    hotmartId: 8870102,
    plataforma: 'hotmart',
    idioma: 'ro',
    tipo: 'desafio',
    garantiaDias: 30,
    oQueE: 'A MESMA Calistenia, em romeno (variação de idioma, não é outro produto): quem já tem a Calistenia não precisa; nunca oferecer a aluna.',
    suporteVende: false,
    ofertas: [{ codigo: '?', preco: '?', status: 'vigente', nota: 'a preencher (?)' }],
  },
]

const rotuloStatus: Record<StatusOferta, string> = {
  vigente: 'VIGENTE', teste: 'TESTE DE PREÇO (metade das visitantes do país)', recuperacao: 'recuperação (só o sistema manda)', 'order-bump': 'order bump (só no checkout)', upsell: 'upsell', descontinuada: 'DESCONTINUADA (não oferecer)',
}

/**
 * Bloco para o CONHECIMENTO do agente de atendimento: o que cada produto é, preço normal e link oficial. O bot informa;
 * não negocia. Entram só produtos do idioma e os que o suporte pode vender (os outros aparecem como "não se vende avulso").
 */
export function blocoCatalogo(idioma = 'es'): string {
  const linhas: string[] = []
  for (const p of CATALOGO.filter((p) => p.idioma === idioma)) {
    const vend = p.ofertas.filter((o) => o.link && (o.status === 'vigente' || o.status === 'teste'))
    linhas.push(`- ${p.nome}: ${p.oQueE}${p.garantiaDias ? ` Garantia Hotmart: ${p.garantiaDias} dias.` : ''}`)
    const semLink = p.ofertas.filter((o) => !o.link && o.status === 'vigente')
    if (p.suporteVende && !vend.length && semLink.length) {
      linhas.push(`  Vende-se avulso por ${semLink[0].preco}, mas o LINK ainda não está cadastrado aqui: diga o preço e transfira com motivo "VENDA — link do ${p.nome}" (a equipe manda o link).`)
      continue
    }
    if (!p.suporteVende || !vend.length) {
      linhas.push(`  Não se vende por aqui${p.ofertas[0]?.status === 'order-bump' ? ' (só como order bump no checkout da Calistenia, ' + p.ofertas[0].preco + ')' : ''}: se ela quiser, diga o que é e que hoje entra pelo Pase Completo${p.tipo === 'bump' || p.ofertas[0]?.status === 'descontinuada' ? '; se já paga, cancela pelo app' : ''}.`)
      continue
    }
    for (const o of vend) {
      const onde = o.paises?.length ? ` (${o.paises.join('/')})` : ''
      linhas.push(`  Preço normal${onde}: ${o.preco} · ${rotuloStatus[o.status]}${o.nota ? ` · ${o.nota}` : ''}`)
      linhas.push(`  Link oficial${onde} (copie exato, sozinho na linha): ${o.link}`)
    }
    if (p.funil) linhas.push(`  Quem ainda NÃO comprou este produto (amiga, parente, ela mesma antes da compra) recebe a PÁGINA, não o checkout: ${p.funil}`)
    if (p.meiosPagamento) linhas.push(`  Meios de pagamento: ${p.meiosPagamento}.`)
  }
  return linhas.join('\n')
}

/** Link de preço normal de um produto para a aluna (pelo país, quando há oferta vigente só para ele). */
export function linkNormal(produtoId: string, pais?: string | null): string | null {
  const p = CATALOGO.find((x) => x.id === produtoId)
  if (!p) return null
  const vigentes = p.ofertas.filter((o) => o.status === 'vigente' && o.link)
  const doPais = pais ? vigentes.find((o) => o.paises?.includes(pais.toUpperCase())) : undefined
  return (doPais ?? vigentes.find((o) => !o.paises?.length))?.link ?? null
}
