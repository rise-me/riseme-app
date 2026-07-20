// Materiais em PDF exibidos na aba Extras como páginas-imagem.
// Padrão espelha lib/mock-challenges.ts: metadados aqui, títulos/descrições no i18n (bonusData).
//
// Cada material tem um PDF por idioma (o design do Bruno, convertido em páginas .webp).
// `pages` diz em quais locales o material existe e quantas páginas cada um tem — a lista
// só mostra o material nos idiomas presentes aqui (fallback: oculto no locale sem PDF).
// Arquivos no Supabase Storage (bucket privado 'bonuses'):
//   bonuses/{id}/{locale}/page-01.webp … page-NN.webp  +  bonuses/{id}/{locale}/original.pdf
// Pra publicar um material novo: scripts/publish-material.py (converte + sobe + diz o pages).
//
// `access` decide quem vê:
//   'bonus'    → brinde da compra: liberado pra quem tem qualquer desafio/assinatura
//   'purchase' → produto vendido à parte (upsell): só pra quem comprou ESTE id.
//                O id tem que bater com o valor no mapa do webhook da plataforma
//                (ex.: PERFECTPAY_CHALLENGE_MAP="CODIGO:protocolo-metabolico:tr"),
//                que grava o id em user_challenges — a mesma tabela dos desafios.
// A nomenclatura "bonus" no código e no bucket é histórica (a aba nasceu só com brindes).

export interface MockBonus {
  id: string
  emoji: string
  is_free?: boolean
  pages: Record<string, number>
  access?: 'bonus' | 'purchase' // default: 'bonus'
}

export const mockBonuses: MockBonus[] = [
  // ES de propósito NÃO tem linha-suporte: a Central de Ajuda já leva ao WhatsApp
  // (decisão Bruno 2026-07-14). rastreador-progresso ES entra quando o PDF chegar.
  { id: 'linha-suporte', emoji: '💬', pages: { tr: 3 } },
  { id: 'falsos-saudaveis', emoji: '🎭', pages: { tr: 7, es: 7 } },
  { id: 'anti-inchaco', emoji: '💧', pages: { tr: 11, es: 11 } },
  { id: 'vinagre-maca', emoji: '🍎', pages: { tr: 7, es: 9 } },
  { id: 'tres-botoes', emoji: '🔑', pages: { tr: 8, es: 8 } },
  { id: 'frutas-inocentes', emoji: '🍇', pages: { tr: 6, es: 6 } },
  { id: 'depois-28-dias', emoji: '🎯', pages: { tr: 7, es: 7 } },
  { id: 'rastreador-progresso', emoji: '📊', pages: { tr: 7 } },
  // Upsell vendido na Perfect Pay (ebook do sistema de chás de 28 dias)
  { id: 'protocolo-metabolico', emoji: '🍵', access: 'purchase', pages: { tr: 31, es: 31 } },
]

export function getMockBonusById(id: string): MockBonus | undefined {
  return mockBonuses.find((b) => b.id === id)
}

export function bonusHasLocale(bonus: MockBonus, locale: string): boolean {
  return (bonus.pages[locale] ?? 0) > 0
}

// Caminhos no bucket privado 'bonuses'
export function bonusPagePath(id: string, locale: string, page: number): string {
  return `${id}/${locale}/page-${String(page).padStart(2, '0')}.webp`
}
export function bonusOriginalPath(id: string, locale: string): string {
  return `${id}/${locale}/original.pdf`
}
