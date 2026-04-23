import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['pt-BR', 'es', 'en'],
  defaultLocale: 'pt-BR',
  localePrefix: 'as-needed', // pt-BR (default) sem prefixo na URL
})
