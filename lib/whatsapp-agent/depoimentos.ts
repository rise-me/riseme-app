// Pedido de depoimento (comentário em anúncio/post) logo depois de um onboarding que deu certo.
// DADOS DO CASO ficam aqui: os links e o texto do convite. Trocar link = editar LINKS e publicar.
//
// Regras (Bruno, 12/10/2026):
// - Com BRINDE: 1 cardápio personalizado extra no app (a vitalícia tem só 2). Vale para quem comentar,
//   seja qual for a opinião — nunca "elogie e ganhe". Ela manda o print do comentário, o agente confere
//   a imagem e o sistema libera (lib/diet/quota.ts → darCardapioBonus, 1x por conta). Decisão do Bruno.
// - Dá a DIREÇÃO do que comentar (v1: "que tu acceso llegó bien"; v2: a dúvida de antes e como foi), nunca texto pronto:
//   comentário idêntico em série parece comprado.
// - Os links variam: ora um anúncio, ora um post fixo do Instagram. Vários links no mesmo idioma
//   são alternados entre as alunas.
// - Uma vez por aluna; só quando o agente marca que a conversa terminou bem (ver responder.ts).
//
// LINKS vazio para o idioma (e sem '*') = recurso desligado para aquele idioma.

// Duas versões do convite (Bruno, 17/10/2026):
// - v1 "o acesso chegou bem" — gera VOLUME de comentários (34 prints em 380 convites, 9%, 12–16/10).
//   Usar em ANÚNCIO NOVO, que ainda tem poucos comentários.
// - v2 "que medo você tinha e como foi quando chegou" — gera comentário que QUEBRA OBJEÇÃO ("será golpe?",
//   "chega mesmo?"). Usar nos anúncios principais, que já têm muitos comentários.
// Cada link diz qual versão usa. Anúncio novo dando lucro → entra aqui com 'v1'.
type Versao = 'v1' | 'v2'
export const LINKS: Record<string, { url: string; versao: Versao }[]> = {
  // '*' vale para qualquer idioma sem lista própria (ex.: post-manifesto em inglês no Instagram).
  // '*': [{ url: 'https://www.instagram.com/p/XXXXXXXX/', versao: 'v1' }],
  // CL-ES — V42, a campeã (post que roda na BidCap). Facebook e Instagram alternados.
  // CL-ES — post FIXADO "quiénes somos" do @riseme_app (carrossel; card 2 em espanhol), pedido do Bruno 19/10/2026:
  // todas as compradoras ES vão para ele ATÉ o post chegar a 100 comentários (vitrine do perfil). v2 com o texto aprovado
  // (Bruno, 19/10: "pode falar anúncio, não tem problema" — todas chegam pelo anúncio). Comentário é do post
  // inteiro, o card só muda o que ela lê.
  // Ao chegar a 100: voltar a lista de anúncios abaixo (comentada).
  es: [{ url: 'https://www.instagram.com/p/DerPwaqlg_U/?img_index=2', versao: 'v2' }],
  // Lista dos anúncios (até 19/10/2026) — voltar quando o post fixado tiver 100 comentários:
  // es: [
  //   { url: 'https://www.facebook.com/365563009981105/posts/122203707488483220', versao: 'v2' },
  //   { url: 'https://www.instagram.com/p/DeIs5uJAIfW/', versao: 'v2' },
  //   // Anúncios novos com performance (Bruno, 17/10/2026) — v1 até juntarem comentários.
  //   { url: 'https://www.facebook.com/365563009981105/posts/122204794946483220', versao: 'v1' }, // V91
  //   { url: 'https://www.instagram.com/p/DeieiRigCK7/', versao: 'v1' }, // V93
  // ],
  // CL-PL — AD07_H2-H1_CL_PL, o melhor anúncio da CL-PL (CA 2 - LATAM). Facebook e Instagram alternados.
  pl: [
    { url: 'https://www.facebook.com/365563009981105/posts/122203962470483220', versao: 'v2' },
    { url: 'https://www.instagram.com/p/DeN89o7glF-/', versao: 'v2' },
  ],
}

// v1 — guardada para anúncios novos (ver LINKS).
const CONVITE_V1: Record<string, (link: string) => string> = {
  es: (link) =>
    [
      '¿Te puedo pedir un favor rapidito? 💛',
      '',
      'Si puedes, deja un comentario en esta publicación contando, con tus palabras, que tu acceso llegó bien y cómo fue tu compra. A otras mujeres que están con dudas les ayuda muchísimo leerlo.',
      '',
      `👉 ${link}`,
      '',
      '❤️ Y si puedes, dale también "me gusta" a la publicación: eso ayuda a que otras mujeres también vean el post. 🥰',
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
      "❤️ A jeśli możesz, polub też ten post: dzięki temu inne kobiety też go zobaczą. 🥰",
      '',
      '🎁 W podziękowaniu: wyślij mi tutaj zrzut ekranu swojego komentarza, a dostaniesz w aplikacji *dodatkowy spersonalizowany jadłospis*.',
    ].join('\n'),
  cs: (link) =>
    [
      'Můžu tě poprosit o malou laskavost? 💛',
      '',
      'Jestli můžeš, napiš pod tento příspěvek komentář a vlastními slovy popiš, že ti přístup přišel bez problémů a jak proběhl nákup. Ostatním ženám, které váhají, to moc pomáhá.',
      '',
      `👉 ${link}`,
      '',
      "❤️ A jestli můžeš, dej příspěvku i „To se mi líbí“: pomůže to, aby ho viděly i další ženy. 🥰",
      '',
      '🎁 Jako poděkování mi sem pošli snímek obrazovky svého komentáře a dostaneš v aplikaci *jídelníček na míru navíc*.',
    ].join('\n'),
  tr: (link) =>
    [
      'Senden küçük bir ricam olabilir mi? 💛',
      '',
      'Müsaitsen bu gönderinin altına kendi cümlelerinle erişiminin sorunsuz geldiğini ve satın alma sürecinin nasıl geçtiğini yazar mısın? Kararsız olan diğer kadınlara çok yardımcı oluyor.',
      '',
      `👉 ${link}`,
      '',
      "❤️ Müsaitsen gönderiyi beğenir misin? Bu, başka kadınların da gönderiyi görmesine yardımcı oluyor. 🥰",
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
      '❤️ E se puder, dê também "curtir" na publicação: isso ajuda que outras mulheres também vejam o post. 🥰',
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
      "❤️ And if you can, also give the post a like: it helps other women see it too. 🥰",
      '',
      '🎁 As a thank-you, send me a screenshot of your comment here and I will give you an *extra personalized menu* in the app.',
    ].join('\n'),
}

// v2 — base em português (pt-BR), aprovada pelo Bruno em 17/10/2026; os outros idiomas são transcriados dela.
// O presente vem primeiro e o print é só a confirmação (pedido dele: não soar como troca).
const CONVITE_V2: Record<string, (link: string) => string> = {
  'pt-BR': (link) =>
    [
      'Posso te pedir um favorzinho? 💛',
      '',
      'Muitas mulheres veem nosso anúncio e ficam pensando: "será que é confiável?", "será que chega mesmo?". A sua experiência ajuda muito quem está nessa dúvida.',
      '',
      'Se puder, deixe um comentário nesta publicação contando, com as suas palavras:',
      '• que dúvida ou medo você tinha antes de comprar',
      '• como foi quando o seu acesso chegou',
      '',
      `👉 ${link}`,
      '',
      '❤️ E se puder, dê também "curtir" na publicação: isso ajuda que outras mulheres também vejam o post. 🥰',
      '',
      '🎁 Como agradecimento, vou liberar um *cardápio personalizado extra* no seu app, totalmente grátis. É só me mandar aqui um print do seu comentário para eu confirmar.',
    ].join('\n'),
  es: (link) =>
    [
      '¿Te puedo pedir un favor rapidito? 💛',
      '',
      'Muchas mujeres ven nuestro anuncio y piensan: "¿será confiable?", "¿me llegará de verdad?". Tu experiencia les ayuda muchísimo a las que están con esa duda.',
      '',
      'Si puedes, deja un comentario en esta publicación contando, con tus palabras:',
      '• qué duda o miedo tenías antes de comprar',
      '• cómo fue cuando te llegó tu acceso',
      '',
      `👉 ${link}`,
      '',
      '❤️ Y si puedes, dale también "me gusta" a la publicación: eso ayuda a que otras mujeres también vean el post. 🥰',
      '',
      '🎁 Como agradecimiento, te voy a liberar un *menú personalizado extra* en tu app, totalmente gratis. Solo mándame por aquí una captura de tu comentario para confirmarlo.',
    ].join('\n'),
  pl: (link) =>
    [
      'Mogę Cię prosić o małą przysługę? 💛',
      '',
      'Wiele kobiet widzi naszą reklamę i zastanawia się: „czy to na pewno uczciwe?”, „czy dostęp naprawdę dotrze?”. Twoje doświadczenie bardzo pomaga tym, które mają takie wątpliwości.',
      '',
      'Jeśli możesz, zostaw komentarz pod tym postem i napisz własnymi słowami:',
      '• jakie miałaś wątpliwości albo obawy przed zakupem',
      '• jak było, kiedy dotarł Twój dostęp',
      '',
      `👉 ${link}`,
      '',
      "❤️ A jeśli możesz, polub też ten post: dzięki temu inne kobiety też go zobaczą. 🥰",
      '',
      '🎁 W podziękowaniu odblokuję Ci w aplikacji *dodatkowy spersonalizowany jadłospis*, całkowicie za darmo. Wyślij mi tylko tutaj zrzut ekranu komentarza, żebym mogła to potwierdzić.',
    ].join('\n'),
  cs: (link) =>
    [
      'Můžu tě poprosit o malou laskavost? 💛',
      '',
      'Spousta žen vidí naši reklamu a přemýšlí: „Je to spolehlivé?“, „Opravdu mi přístup přijde?“. Tvoje zkušenost moc pomáhá těm, které tohle řeší.',
      '',
      'Jestli můžeš, napiš pod tento příspěvek komentář a vlastními slovy popiš:',
      '• jakou jsi měla před nákupem pochybnost nebo obavu',
      '• jaké to bylo, když ti přišel přístup',
      '',
      `👉 ${link}`,
      '',
      "❤️ A jestli můžeš, dej příspěvku i „To se mi líbí“: pomůže to, aby ho viděly i další ženy. 🥰",
      '',
      '🎁 Jako poděkování ti v aplikaci odemknu *jídelníček na míru navíc*, úplně zdarma. Stačí mi sem poslat snímek obrazovky komentáře, abych to mohla potvrdit.',
    ].join('\n'),
  tr: (link) =>
    [
      'Senden küçük bir ricam olabilir mi? 💛',
      '',
      'Birçok kadın reklamımızı görünce "Güvenilir mi?", "Erişim gerçekten gelecek mi?" diye düşünüyor. Senin deneyimin bu tereddüdü yaşayanlara çok yardımcı oluyor.',
      '',
      'Müsaitsen bu gönderinin altına kendi cümlelerinle yazar mısın:',
      '• satın almadan önce ne tür bir tereddüdün ya da endişen vardı',
      '• erişimin geldiğinde nasıl hissettin',
      '',
      `👉 ${link}`,
      '',
      "❤️ Müsaitsen gönderiyi beğenir misin? Bu, başka kadınların da gönderiyi görmesine yardımcı oluyor. 🥰",
      '',
      '🎁 Teşekkür olarak uygulamada sana tamamen ücretsiz *ekstra bir kişisel menü* açacağım. Onaylamam için yorumunun ekran görüntüsünü buradan göndermen yeterli.',
    ].join('\n'),
  en: (link) =>
    [
      'Can I ask you a quick favor? 💛',
      '',
      'Many women see our ad and wonder: "is this legit?", "will I really get access?". Your experience really helps the ones who feel that way.',
      '',
      'If you can, leave a comment on this post telling, in your own words:',
      '• what doubt or fear you had before buying',
      '• what it was like when your access arrived',
      '',
      `👉 ${link}`,
      '',
      "❤️ And if you can, also give the post a like: it helps other women see it too. 🥰",
      '',
      '🎁 As a thank-you, I will unlock an *extra personalized menu* in your app, completely free. Just send me a screenshot of your comment here so I can confirm it.',
    ].join('\n'),
}

/** Mensagem do pedido para esta aluna, ou null se não há link para o idioma dela. */
export function conviteDepoimento(idioma: string, phone: string): string | null {
  const links = LINKS[idioma]?.length ? LINKS[idioma] : (LINKS['*'] ?? [])
  if (!links.length) return null
  // Alterna os links de forma estável por aluna (mesma aluna → mesmo link).
  const n = [...phone.replace(/\D/g, '')].reduce((s, d) => s + Number(d), 0)
  const { url, versao } = links[n % links.length]
  const textos = versao === 'v2' ? CONVITE_V2 : CONVITE_V1
  return (textos[idioma] ?? textos.es)(url)
}
