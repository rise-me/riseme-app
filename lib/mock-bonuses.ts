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

// nl (CL-NL, 11/11/2026): contagens PROVISÓRIAS = pl (os PDFs nl saem do pl, VSL-fonte da oferta). O bloco de bônus
// fecha o número real com scripts/publish-material.py, que tem de rodar ANTES do deploy: sem as páginas no bucket, a
// aba Extras em /nl abre o material com imagens quebradas. Protocolo (upsell) fica sem nl: a CL-NL vende só o front.
export const mockBonuses: MockBonus[] = [
  // ES de propósito NÃO tem linha-suporte: a Central de Ajuda já leva ao WhatsApp
  // (decisão Bruno 2026-07-14). rastreador-progresso ES entra quando o PDF chegar.
  // EN = inglês GLOBAL (Bruno 26/11: no app sempre global; o indiano fica no funil da CL-IN). Fonte: CL-IN/bonus/en-global.
  { id: 'linha-suporte', emoji: '💬', pages: { en: 3, tr: 3, pl: 3, cs: 3, it: 3, nl: 3 } },
  { id: 'falsos-saudaveis', emoji: '🎭', pages: { en: 7, tr: 7, es: 7, pl: 7, cs: 7, it: 7, nl: 7 } },
  { id: 'anti-inchaco', emoji: '💧', pages: { en: 11, tr: 11, es: 11, pl: 11, cs: 11, it: 11, nl: 11 } },
  { id: 'vinagre-maca', emoji: '🍎', pages: { en: 7, tr: 7, es: 9, pl: 7, cs: 7, it: 7, nl: 7 } },
  { id: 'tres-botoes', emoji: '🔑', pages: { en: 8, tr: 8, es: 8, pl: 8, cs: 8, it: 8, nl: 8 } },
  { id: 'frutas-inocentes', emoji: '🍇', pages: { en: 6, tr: 6, es: 6, pl: 6, cs: 6, it: 6, nl: 6 } },
  { id: 'depois-28-dias', emoji: '🎯', pages: { en: 7, tr: 7, es: 7, pl: 7, cs: 7, it: 7, nl: 7 } },
  { id: 'rastreador-progresso', emoji: '📊', pages: { en: 7, tr: 7, pl: 7, cs: 7, it: 7, nl: 7 } },
  // Upsell vendido na Perfect Pay (ebook do sistema de chás de 28 dias)
  { id: 'protocolo-metabolico', emoji: '🍵', access: 'purchase', pages: { en: 31, tr: 31, es: 31, pl: 31, cs: 31, it: 31 } },
]

export function getMockBonusById(id: string): MockBonus | undefined {
  return mockBonuses.find((b) => b.id === id)
}

export function bonusHasLocale(bonus: MockBonus, locale: string): boolean {
  return (bonus.pages[locale] ?? 0) > 0
}

// Idioma em que o material vai ser mostrado: o do app, ou espanhol quando não existe nele.
// Sem isso, aluna hispânica com o celular em inglês via Extras VAZIO — até o Protocolo que comprou
// (caso Araceli, 15/10/2026). null = não existe nem em espanhol.
export function bonusLocale(bonus: MockBonus, locale: string): string | null {
  if (bonusHasLocale(bonus, locale)) return locale
  return bonusHasLocale(bonus, 'es') ? 'es' : null
}

// Caminhos no bucket privado 'bonuses'
export function bonusPagePath(id: string, locale: string, page: number): string {
  return `${id}/${locale}/page-${String(page).padStart(2, '0')}.webp`
}
export function bonusOriginalPath(id: string, locale: string): string {
  return `${id}/${locale}/original.pdf`
}
