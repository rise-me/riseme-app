// Bônus em PDF entregues junto com a compra, exibidos na aba Bônus como páginas-imagem.
// Padrão espelha lib/mock-challenges.ts: metadados aqui, títulos/descrições no i18n (bonusData).
//
// Cada bônus tem um PDF por idioma (o design do Bruno, convertido em páginas .webp).
// `pages` diz em quais locales o bônus existe e quantas páginas cada um tem — a lista
// só mostra o bônus nos idiomas presentes aqui (fallback: oculto no locale sem PDF).
// Arquivos no Supabase Storage (bucket privado 'bonuses'):
//   bonuses/{id}/{locale}/page-01.webp … page-NN.webp  +  bonuses/{id}/{locale}/original.pdf

export interface MockBonus {
  id: string
  emoji: string
  is_free?: boolean
  pages: Record<string, number>
}

export const mockBonuses: MockBonus[] = [
  { id: 'linha-suporte', emoji: '💬', pages: { tr: 3 } },
  { id: 'falsos-saudaveis', emoji: '🎭', pages: { tr: 7 } },
  { id: 'anti-inchaco', emoji: '💧', pages: { tr: 11 } },
  { id: 'vinagre-maca', emoji: '🍎', pages: { tr: 7 } },
  { id: 'tres-botoes', emoji: '🔑', pages: { tr: 8 } },
  { id: 'frutas-inocentes', emoji: '🍇', pages: { tr: 6 } },
  { id: 'depois-28-dias', emoji: '🎯', pages: { tr: 7 } },
  { id: 'rastreador-progresso', emoji: '📊', pages: { tr: 7 } },
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
