import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['pt-BR', 'es', 'en'],
  defaultLocale: 'es',
  localePrefix: 'as-needed',
})
