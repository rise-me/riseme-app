// Pedido de depoimento (comentário em anúncio/post) logo depois de um onboarding que deu certo.
// DADOS DO CASO ficam aqui: os links e o texto do convite. Trocar link = editar LINKS e publicar.
//
// Regras (Bruno, 12/10/2026):
// - Com BRINDE: 1 cardápio personalizado extra no app (a vitalícia tem só 2). Vale para quem comentar,
//   seja qual for a opinião — nunca "elogie e ganhe". Ela manda o print do comentário, o agente confere
//   a imagem e o sistema libera (lib/diet/quota.ts → darCardapioBonus, 1x por conta). Decisão do Bruno.
// - Dá a DIREÇÃO do que comentar ("que tu acceso llegó bien"), nunca texto pronto para colar:
//   comentário idêntico em série parece comprado.
// - Os links variam: ora um anúncio, ora um post fixo do Instagram. Vários links no mesmo idioma
//   são alternados entre as alunas.
// - Uma vez por aluna; só quando o agente marca que a conversa terminou bem (ver responder.ts).
//
// LINKS vazio para o idioma (e sem '*') = recurso desligado para aquele idioma.

export const LINKS: Record<string, string[]> = {
  // '*' vale para qualquer idioma sem lista própria (ex.: post-manifesto em inglês no Instagram).
  // '*': ['https://www.instagram.com/p/XXXXXXXX/'],
  // CL-ES — V42, a campeã (post que roda na BidCap). Facebook e Instagram alternados.
  es: [
    'https://www.facebook.com/365563009981105/posts/122203707488483220',
    'https://www.instagram.com/p/DeIs5uJAIfW/',
  ],
  // CL-PL — AD07_H2-H1_CL_PL, o melhor anúncio da CL-PL (CA 2 - LATAM). Facebook e Instagram alternados.
  pl: [
    'https://www.facebook.com/365563009981105/posts/122203962470483220',
    'https://www.instagram.com/p/DeN89o7glF-/',
  ],
}

const CONVITE: Record<string, (link: string) => string> = {
  es: (link) =>
    [
      '¿Te puedo pedir un favor rapidito? 💛',
      '',
      'Si puedes, deja un comentario en esta publicación contando, con tus palabras, que tu acceso llegó bien y cómo fue tu compra. A otras mujeres que están con dudas les ayuda muchísimo leerlo.',
      '',
      `👉 ${link}`,
      '',
      '🎁 Como agradecimiento, mándame por aquí una captura de tu comentario y te regalo un *menú personalizado extra* en la app.',
    ].join('\n'),
  pl: (link) =>
    [
      'Mogę Cię prosić o małą przysługę? 💛',
      '',
      'Jeśli możesz, zostaw komentarz pod tym postem i napisz własnymi słowami, że dostęp dotarł bez problemu i jak przebiegł zakup. Innym kobietom, które się wahają, bardzo to pomaga.',
      '',
      `👉 ${link}`,
      '',
      '🎁 W podziękowaniu: wyślij mi tutaj zrzut ekranu swojego komentarza, a dostaniesz w aplikacji *dodatkowy spersonalizowany jadłospis*.',
    ].join('\n'),
  tr: (link) =>
    [
      'Senden küçük bir ricam olabilir mi? 💛',
      '',
      'Müsaitsen bu gönderinin altına kendi cümlelerinle erişiminin sorunsuz geldiğini ve satın alma sürecinin nasıl geçtiğini yazar mısın? Kararsız olan diğer kadınlara çok yardımcı oluyor.',
      '',
      `👉 ${link}`,
      '',
      '🎁 Teşekkür olarak: yorumunun ekran görüntüsünü buradan bana gönder, uygulamada sana *ekstra bir kişisel menü* hediye edeyim.',
    ].join('\n'),
  'pt-BR': (link) =>
    [
      'Posso te pedir um favor rapidinho? 💛',
      '',
      'Se puder, deixa um comentário nesta publicação contando, com as suas palavras, que seu acesso chegou certinho e como foi a compra. Ajuda muito outras mulheres que estão em dúvida.',
      '',
      `👉 ${link}`,
      '',
      '🎁 Como agradecimento, me manda aqui o print do seu comentário e eu te dou um *cardápio personalizado extra* no app.',
    ].join('\n'),
  en: (link) =>
    [
      'Can I ask you a quick favor? 💛',
      '',
      'If you can, leave a comment on this post saying, in your own words, that your access arrived fine and how your purchase went. It really helps other women who are unsure.',
      '',
      `👉 ${link}`,
      '',
      '🎁 As a thank-you, send me a screenshot of your comment here and I will give you an *extra personalized menu* in the app.',
    ].join('\n'),
}

/** Mensagem do pedido para esta aluna, ou null se não há link para o idioma dela. */
export function conviteDepoimento(idioma: string, phone: string): string | null {
  const links = LINKS[idioma]?.length ? LINKS[idioma] : (LINKS['*'] ?? [])
  if (!links.length) return null
  // Alterna os links de forma estável por aluna (mesma aluna → mesmo link).
  const n = [...phone.replace(/\D/g, '')].reduce((s, d) => s + Number(d), 0)
  return (CONVITE[idioma] ?? CONVITE.es)(links[n % links.length])
}
