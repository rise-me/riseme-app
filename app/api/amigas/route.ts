// Página de vendas do produto das afiliadas (Hotmart 8926725): repassa na hora para o checkout, levando os parâmetros que a
// Hotmart acrescenta (código da afiliada, src, etc.). Por que existe: lib/afiliadas.ts (CHECKOUT_AFILIADAS_ES).
import { CHECKOUT_AFILIADAS_ES } from '@/lib/afiliadas'

export function GET(request: Request) {
  const destino = new URL(CHECKOUT_AFILIADAS_ES)
  new URL(request.url).searchParams.forEach((valor, chave) => {
    if (chave !== 'off') destino.searchParams.set(chave, valor) // a oferta é sempre a do produto das afiliadas
  })
  return Response.redirect(destino.toString(), 302)
}
