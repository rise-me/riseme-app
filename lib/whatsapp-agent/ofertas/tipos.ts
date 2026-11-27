export interface FichaOferta {
  /** Sigla da oferta, como no funil e no dash. */
  sigla: string
  /** País/mercado, para gente ler (mapa do WhatsApp, lista). */
  pais: string
  /** Idioma da conta que esta oferta cria (user_metadata.locale). */
  idioma: string
  preco: string
  pagamento: string
  /** Códigos de oferta que aparecem no cartão da aluna (metadata.oferta do link da Stripe) → nome legível para o bot. */
  noCartao: Record<string, string>
  /** DDIs em que esta oferta é candidata (aluna sem conta, ou escrevendo de outro número). */
  ddis: string[]
  /** Sinais no que ELA escreveu (escrita, moeda, meio de pagamento) que apontam para esta oferta. */
  sinais: RegExp
  /** Fichas que precisam vir junto porque o texto desta se apoia nelas. */
  junto: string[]
  /** O que o bot lê sobre produto, compra e acesso (entra na seção "Acesso" do conhecimento). */
  acesso: string
  /** O que o bot lê sobre prazo de reembolso por meio de pagamento (entra na seção "Dinheiro"). */
  dinheiro: string
}
