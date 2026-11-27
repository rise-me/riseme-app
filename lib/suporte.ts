// WhatsApp do suporte (Iza) — +55 31 98379-2759. Fonte única: Centro de ajuda, página de reembolso e quem mais precisar.
export const SUPPORT_WHATSAPP = '5531983792759'

export const linkWhatsAppSuporte = (texto: string) => `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(texto)}`

// 14/11/2026 — WhatsApp do suporte restrito pela Meta (Bruno: "deixar claro que o WhatsApp não está funcionando e que a
// gente responde tudo por e-mail"). Enquanto true, páginas e e-mails mandam a aluna para o E-MAIL do suporte (o bot
// responde lá: lib/email-suporte.ts). WhatsApp voltou → false (quem muda é o dono do bot, com o ok do Bruno).
// 15/11/2026 ~16h35 BRT: restrição caiu, Z-API reconectada, 1º clique real no botão conferido → false.
export const WHATSAPP_FORA_DO_AR = false
// en = help@ (Bruno 25/11, CL-IN). Qualquer endereço @riseme.app chega ao bot (conferido: acesso@ e noreply@ já receberam).
export const EMAIL_SUPORTE: Record<string, string> = { pl: 'pomoc@riseme.app', es: 'ayuda@riseme.app', en: 'help@riseme.app', nl: 'help@riseme.app', hi: 'help@riseme.app' } // nl: 'help' também é holandês
export const emailSuporte = (idioma?: string | null) => EMAIL_SUPORTE[idioma ?? ''] ?? 'ayuda@riseme.app'
export const linkEmailSuporte = (idioma: string | null | undefined, assunto: string) => `mailto:${emailSuporte(idioma)}?subject=${encodeURIComponent(assunto)}`
