// Programa de alunas afiliadas (piloto, Bruno 09/11/2026) — DADOS DO CASO num arquivo só (agente do WhatsApp,
// e o que mais precisar). Detalhe e decisões: docs/HANDOFF-AFILIADAS.md.
//
// Produto SEPARADO na Hotmart (só para afiliadas, mesmo desafio da Calistenia ES) para a venda de afiliada não se
// misturar com a de anúncio. A aluna se afilia sozinha (afiliação de 1 clique) pela página de recrutamento; a Hotmart
// rastreia, paga a comissão e desconta reembolso. A API da Hotmart NÃO cria afiliação: o caminho é sempre este link.
// Convive com a indicação com presente (lib/indicacao-link.ts): aquela dá Pase + dieta; esta, dinheiro.

export const PRODUTO_AFILIADAS_ES = 8926725 // "RiseMe™ - Desafío de 28 Días de Calistenia (Amigas)", US$ 14,90, oferta a6ybtkbv
export const LINK_AFILIACAO_ES = 'https://affiliate.hotmart.com/affiliate-recruiting/view/4565R108410711'
// Comissão (Bruno 11/11): base 40% pra poder premiar quem mais divulga com 50% "ou um pouco mais". Na Hotmart a base de 40%
// vale a partir de 14/11/2026 (redução leva 3 dias); até lá é 50%. Valores por venda = o que a Hotmart mostra no simulador.
export const COMISSAO_ES = { percentual: 40, porVendaUsd: '5,17' }
// Degraus: amigas que COMPRARAM no mesmo mês (mês do calendário, sem reembolso) → a comissão da afiliada sobe e FICA PARA SEMPRE.
// Quem aplica: à mão, na Hotmart (Programa de afiliados → Lista de afiliados → ⋮ → "Editar comissão"); a Hotmart paga sozinha.
// Conferência: todo dia 1º, vendas do mês anterior por afiliada (pendência no EM-ABERTO, linha do piloto de afiliadas).
export const DEGRAUS_AFILIADA_ES = [
  { amigasNoMes: 5, percentual: 50, porVendaUsd: '6,46' },
  { amigasNoMes: 15, percentual: 55, porVendaUsd: '7,10' },
] as const
export const LINK_GUIA_AFILIADA_ES = 'https://riseme.app/guias/afiliadas-es.pdf' // PDF passo a passo, 9 págs., prints reais (11/11; fonte materiais/guia-afiliada/es.html)

// "Página de vendas" do produto na Hotmart = https://riseme.app/api/amigas (app/api/amigas/route.ts), que só repassa a amiga
// para este checkout. Motivo (10/11): a Hotmart não aceita pay.hotmart.com como página externa e, sem página externa, o link da
// afiliada caía no marketplace da Hotmart (título "(Amigas)", "Ir al carrito", preço convertido, outros produtos nossos).
// A comissão não depende desta página: o go.hotmart.com da afiliada já marcou a amiga antes de chegar aqui.
export const CHECKOUT_AFILIADAS_ES = 'https://pay.hotmart.com/J108410690N?off=a6ybtkbv&checkoutMode=10'
