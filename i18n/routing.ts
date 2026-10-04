import { defineRouting } from 'next-intl/routing'

// Fonte ÚNICA dos idiomas do app — proxy, seletor de idioma, /auth/confirm e
// admin leem daqui. Idioma novo = adicionar aqui + messages/<locale>.json; o
// TypeScript aponta o resto que precisa de texto (email e WhatsApp de acesso,
// rótulos do cardápio, admin), porque essas tabelas são Record<AppLocale, …>.
export const routing = defineRouting({
  locales: ['pt-BR', 'es', 'en', 'tr', 'pl'],
  defaultLocale: 'es',
  localePrefix: 'as-needed',
})

export type AppLocale = (typeof routing.locales)[number]
