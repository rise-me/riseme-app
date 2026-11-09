// WhatsApp do suporte (Iza) — +55 31 98379-2759. Fonte única: Centro de ajuda, página de reembolso e quem mais precisar.
export const SUPPORT_WHATSAPP = '5531983792759'

export const linkWhatsAppSuporte = (texto: string) => `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(texto)}`
