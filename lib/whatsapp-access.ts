// Entrega do acesso por WhatsApp na compra — escolhe o canal pela env
// WHATSAPP_PROVIDER:
//   "zapi"  → envia direto pela Z-API, com o texto abaixo (no idioma da oferta)
//   vazio / "voxuy" → fluxo antigo: Voxuy dispara a mensagem montada lá (lib/voxuy.ts)
// A chave existe pra voltar à Voxuy em minutos se o número tiver problema na Z-API
// (trocar a env + redeploy), sem mexer em código. Best-effort como antes: a criação
// da conta NUNCA depende disso — o email (lib/email.ts) sai sempre, em paralelo.
//
// SEQUÊNCIA (herdada da Voxuy, texto que rodava desde o início — 04/10/2026):
//   1) ACESSO, ~15 min após a compra (fim da VSL do upsell): email + senha + link de um
//      toque + como entrar outro dia + instalar o app
//   2) APOIO, ~45 s depois da 1ª: "se ainda não conseguiu, me escreve" (sem a playlist do
//      YouTube desde 16/10/2026 — ela tirava a aluna do app; virou plano B do agente)
// A 3ª mensagem da Voxuy (grupo de WhatsApp das alunas) foi REMOVIDA de propósito:
// grupo com 150–200 entradas/dia virou moderação/spam; dúvida agora é no privado (agente).

import type { AppLocale } from '@/i18n/routing'
import { sendVoxuyAccess } from '@/lib/voxuy'
import { isZapiConfigured, toZapiPhone } from '@/lib/zapi'
import { enfileirar, jaEscreveu, ESPERA_PEDIDO } from '@/lib/whatsapp-outbox'
import { conviteDepoimento } from '@/lib/whatsapp-agent/depoimentos'

type AccessCopy = (p: { email: string; code: string; link: string; homeUrl: string }) => string
type SupportCopy = (p: { playlist?: string }) => string

// Atraso do acesso: tempo da VSL do upsell (~15 min). Ajustável sem deploy de código.
const ATRASO_ACESSO_MIN = Number(process.env.WHATSAPP_ACCESS_DELAY_MIN ?? 15)
const ESPERA_DEPOIMENTO_MS = 30 * 60_000 // "aproveitar que a pessoa está quente" (Bruno, 14/10)
const CONVITE_PARA_TODAS = true

const COPY: Record<AppLocale, AccessCopy> = {
  es: ({ email, code, link, homeUrl }) =>
    [
      '¡Bienvenida al Desafío de Calistenia RiseMe™️! 🎉',
      '',
      '¡Felicitaciones por esta excelente decisión! Estoy segura de que esta experiencia será transformadora para ti. 😍',
      '',
      'Tu acceso a la aplicación está listo — aquí está tu información 👇',
      '',
      `📧 Correo electrónico: ${email}`,
      `🔑 Contraseña: ${code}`,
      '',
      'Guarda esta contraseña — ingresarás a la aplicación con ella. 🔒',
      '',
      `Toca aquí para entrar ahora: 👉 ${link}`,
      '',
      '(Cuando toques, la aplicación se abrirá automáticamente, ni siquiera necesitas escribir la contraseña — ¡tu desafío ya está listo!) 💪',
      '',
      '⚠️ Si la pantalla se abre en blanco o vuelve al inicio, ábrelo fuera de WhatsApp: en iPhone con Safari, en Android con Chrome.',
      '',
      '📌 ¿Cómo ingresar otro día?',
      `👉 Ve a ${homeUrl}, inicia sesión con tu correo electrónico y la contraseña anterior.`,
      'Si lo deseas, puedes cambiar tu contraseña por una que elijas dentro de la aplicación.',
      '¿Olvidaste tu contraseña? Usa el enlace "¿Olvidaste tu contraseña?" en la pantalla de inicio de sesión.',
      '',
      '📱 Opcional: descarga la aplicación en tu teléfono',
      'RiseMe™️ funciona como una verdadera aplicación en tu teléfono 👇',
      '',
      `📲 iPhone: abre ${homeUrl} en SAFARI → botón compartir → "Añadir a la pantalla de inicio" → "Añadir"`,
      '⚠️ La opción correcta es "Añadir a la pantalla de inicio" (NO "Añadir a favoritos")',
      '',
      `📲 Android: abre ${homeUrl} en CHROME → menú de tres puntos → "Instalar aplicación" → "Instalar"`,
      '',
      '✅ El icono de RiseMe aparecerá en tu pantalla de inicio. ¿No lo ves? Desliza hacia las últimas pantallas de tu teléfono — a veces queda al final. 😉',
      '',
      '¡De esta manera tendrás acceso a tu desafío con un solo toque! 🚀',
      '(Si no puedes hacerlo, no hay problema: la aplicación funciona perfectamente desde el navegador también.)',
      '',
      'Si necesitas ayuda, no dudes en escribirme. Estoy aquí para que tengas la mejor experiencia. 😄 ❤️',
    ].join('\n'),
  tr: ({ email, code, link, homeUrl }) =>
    [
      'RiseMe™️ Kalistenik Meydan Okumasına hoş geldin! 🎉',
      '',
      'Bu harika karar için tebrikler! Bu deneyimin senin için dönüştürücü olacağından eminim. 😍',
      '',
      'Uygulamaya erişimin hazır — bilgilerin burada 👇',
      '',
      `📧 E-posta: ${email}`,
      `🔑 Şifre: ${code}`,
      '',
      'Bu şifreyi sakla — uygulamaya onunla gireceksin. 🔒',
      '',
      `Hemen girmek için buraya dokun: 👉 ${link}`,
      '',
      '(Dokunduğunda uygulama kendiliğinden açılır, şifreyi yazmana bile gerek yok — meydan okuman hazır!) 💪',
      '',
      '📌 Başka bir gün nasıl girersin?',
      `👉 ${homeUrl} adresine git, e-postan ve yukarıdaki şifreyle giriş yap.`,
      'İstersen uygulamanın içinden şifreni kendi seçtiğin bir şifreyle değiştirebilirsin.',
      'Şifreni mi unuttun? Giriş ekranındaki "Şifreni mi unuttun?" bağlantısını kullan.',
      '',
      '📱 İsteğe bağlı: uygulamayı telefonuna indir',
      'RiseMe™️ telefonunda gerçek bir uygulama gibi çalışır 👇',
      '',
      `📲 iPhone: ${homeUrl} adresini SAFARI'de aç → paylaş düğmesi → "Ana Ekrana Ekle" → "Ekle"`,
      '⚠️ Doğru seçenek "Ana Ekrana Ekle" (Favorilere Ekle DEĞİL)',
      '',
      `📲 Android: ${homeUrl} adresini CHROME'da aç → üç nokta menüsü → "Uygulamayı yükle" → "Yükle"`,
      '',
      '✅ RiseMe simgesi ana ekranında görünecek. Göremiyor musun? Telefonunun son ekranlarına kaydır — bazen en sonda kalır. 😉',
      '',
      'Böylece meydan okumana tek dokunuşla ulaşırsın! 🚀',
      '(Yapamazsan sorun değil: uygulama tarayıcıdan da sorunsuz çalışır.)',
      '',
      'Yardıma ihtiyacın olursa bana yazmaktan çekinme. En iyi deneyimi yaşaman için buradayım. 😄 ❤️',
    ].join('\n'),
  pl: ({ email, code, link, homeUrl }) =>
    [
      'Witaj w wyzwaniu RiseMe™️ – Kalistenika w domu! 🎉',
      '',
      'Gratuluję świetnej decyzji! Jestem pewna, że te 28 dni wiele w Tobie zmieni. 😍',
      '',
      'Twój dostęp do aplikacji jest gotowy — oto Twoje dane 👇',
      '',
      `📧 E-mail: ${email}`,
      `🔑 Hasło: ${code}`,
      '',
      'Zachowaj to hasło — to nim będziesz się logować do aplikacji. 🔒',
      '',
      `Kliknij tutaj, żeby wejść od razu: 👉 ${link}`,
      '',
      '(Po kliknięciu aplikacja otworzy się sama i nie musisz nawet wpisywać hasła — Twoje wyzwanie już czeka!) 💪',
      '',
      '📌 Jak zalogować się następnym razem?',
      `👉 Wejdź na ${homeUrl} i zaloguj się swoim e-mailem oraz hasłem podanym wyżej.`,
      'Jeśli chcesz, w aplikacji możesz zmienić je na własne hasło.',
      'Nie pamiętasz hasła? Kliknij „Nie pamiętasz hasła?” na ekranie logowania.',
      '',
      '📱 Opcjonalnie: dodaj aplikację do telefonu',
      'RiseMe™️ działa na telefonie jak prawdziwa aplikacja 👇',
      '',
      `📲 iPhone: otwórz ${homeUrl} w SAFARI → przycisk „Udostępnij” (kwadrat ze strzałką) → „Do ekranu początkowego” → „Dodaj”`,
      '⚠️ Właściwa opcja to „Do ekranu początkowego” (NIE „Dodaj do ulubionych”)',
      '',
      `📲 Android: otwórz ${homeUrl} w CHROME → menu ⋮ → „Zainstaluj aplikację” (lub „Dodaj do ekranu głównego”) → „Zainstaluj”`,
      '',
      '✅ Ikona RiseMe pojawi się na ekranie głównym. Nie widzisz jej? Przewiń do ostatnich ekranów telefonu — czasem ląduje na samym końcu. 😉',
      '',
      'Dzięki temu Twoje wyzwanie będzie zawsze na wyciągnięcie ręki! 🚀',
      '(Jeśli się nie uda, nic nie szkodzi: aplikacja świetnie działa też w przeglądarce.)',
      '',
      'Jeśli potrzebujesz pomocy, po prostu do mnie napisz. Jestem tu, żeby wszystko poszło jak najlepiej. 😄 ❤️',
    ].join('\n'),
  it: ({ email, code, link, homeUrl }) =>
    [
      'Benvenuta nella Sfida Calisthenics RiseMe™️! 🎉',
      '',
      'Complimenti per l\'ottima decisione! Sono sicura che questi 28 giorni cambieranno molto in te. 😍',
      '',
      'Il tuo accesso all\'app è pronto — ecco i tuoi dati 👇',
      '',
      `📧 E-mail: ${email}`,
      `🔑 Password: ${code}`,
      '',
      'Conserva questa password: ti servirà per entrare nell\'app. 🔒',
      '',
      `Clicca qui e sei subito dentro: 👉 ${link}`,
      '',
      '(Dopo il clic l\'app si apre da sola e non devi nemmeno digitare la password — la tua Sfida ti sta già aspettando!) 💪',
      '',
      '📌 Come accedere la prossima volta?',
      `👉 Vai su ${homeUrl} e accedi con la tua e-mail e la password che trovi qui sopra.`,
      'Se vuoi, nell\'app puoi cambiarla con una password tua.',
      'Hai dimenticato la password? Nella schermata di accesso clicca su «Hai dimenticato la password?».',
      '',
      '📱 Facoltativo: aggiungi l\'app al telefono',
      'RiseMe™️ funziona sul telefono come una vera app 👇',
      '',
      `📲 iPhone: apri ${homeUrl} con SAFARI → pulsante «Condividi» (il quadrato con la freccia) → «Aggiungi alla schermata Home» → «Aggiungi»`,
      '⚠️ L\'opzione giusta è «Aggiungi alla schermata Home» (NON «Aggiungi ai preferiti»)',
      '',
      `📲 Android: apri ${homeUrl} con CHROME → menu ⋮ → «Installa app» (oppure «Aggiungi a schermata Home») → «Installa»`,
      '',
      '✅ L\'icona di RiseMe comparirà sulla schermata Home. Non la vedi? Scorri fino alle ultime schermate del telefono: a volte si nasconde in fondo. 😉',
      '',
      'Così avrai la tua Sfida sempre a portata di mano! 🚀',
      '(Se non riesci, nessun problema: l\'app funziona benissimo anche dal browser.)',
      '',
      'Se hai bisogno di aiuto, scrivimi pure. Sono qui perché tutto vada nel migliore dei modi. 😄 ❤️',
    ].join('\n'),
  cs: ({ email, code, link, homeUrl }) =>
    [
      'Vítej v Kalistenické výzvě RiseMe™️! 🎉',
      '',
      'Gratuluji ti ke skvělému rozhodnutí! Jsem si jistá, že těchto 28 dní v tobě hodně změní. 😍',
      '',
      'Tvůj přístup do aplikace je připravený — tady jsou tvoje údaje 👇',
      '',
      `📧 E-mail: ${email}`,
      `🔑 Heslo: ${code}`,
      '',
      'Toto heslo si ulož — budeš se jím přihlašovat do aplikace. 🔒',
      '',
      `Klikni sem a hned se dostaneš dovnitř: 👉 ${link}`,
      '',
      '(Po kliknutí se aplikace otevře sama a heslo ani nemusíš psát — tvoje výzva už na tebe čeká!) 💪',
      '',
      '📌 Jak se přihlásit příště?',
      `👉 Jdi na ${homeUrl} a přihlas se svým e-mailem a heslem, které máš výše.`,
      'Jestli chceš, můžeš si ho v aplikaci změnit na vlastní heslo.',
      'Zapomněla jsi heslo? Na přihlašovací obrazovce klikni na „Zapomněla jsi heslo?“.',
      '',
      '📱 Nepovinné: přidej si aplikaci do telefonu',
      'RiseMe™️ funguje v telefonu jako opravdová aplikace 👇',
      '',
      `📲 iPhone: otevři ${homeUrl} v SAFARI → tlačítko „Sdílet“ (čtverec se šipkou) → „Přidat na plochu“ → „Přidat“`,
      '⚠️ Správná volba je „Přidat na plochu“ (NE „Přidat do oblíbených“)',
      '',
      `📲 Android: otevři ${homeUrl} v CHROMU → menu ⋮ → „Instalovat aplikaci“ (nebo „Přidat na plochu“) → „Instalovat“`,
      '',
      '✅ Ikona RiseMe se objeví na ploše. Nevidíš ji? Posuň se na poslední obrazovky telefonu — někdy se schová úplně na konec. 😉',
      '',
      'Díky tomu budeš mít svou výzvu vždycky po ruce! 🚀',
      '(Pokud se to nepovede, nevadí: aplikace funguje skvěle i v prohlížeči.)',
      '',
      'Kdybys potřebovala pomoct, prostě mi napiš. Jsem tu, aby všechno šlo co nejlíp. 😄 ❤️',
    ].join('\n'),
  'pt-BR': ({ email, code, link, homeUrl }) =>
    [
      'Bem-vinda ao Desafio de Calistenia RiseMe™️! 🎉',
      '',
      'Parabéns por essa excelente decisão! Tenho certeza de que essa experiência vai ser transformadora pra você. 😍',
      '',
      'Seu acesso ao aplicativo está pronto — aqui estão suas informações 👇',
      '',
      `📧 Email: ${email}`,
      `🔑 Senha: ${code}`,
      '',
      'Guarde esta senha — é com ela que você entra no aplicativo. 🔒',
      '',
      `Toque aqui para entrar agora: 👉 ${link}`,
      '',
      '(Ao tocar, o aplicativo abre sozinho, nem precisa digitar a senha — seu desafio já está pronto!) 💪',
      '',
      '📌 Como entrar em outro dia?',
      `👉 Vá em ${homeUrl}, entre com seu email e a senha acima.`,
      'Se quiser, você pode trocar a senha por uma de sua escolha dentro do aplicativo.',
      'Esqueceu a senha? Use o link "Esqueceu sua senha?" na tela de login.',
      '',
      '📱 Opcional: baixe o aplicativo no seu celular',
      'O RiseMe™️ funciona como um aplicativo de verdade no seu celular 👇',
      '',
      `📲 iPhone: abra ${homeUrl} no SAFARI → botão compartilhar → "Adicionar à Tela de Início" → "Adicionar"`,
      '⚠️ A opção certa é "Adicionar à Tela de Início" (NÃO "Adicionar aos Favoritos")',
      '',
      `📲 Android: abra ${homeUrl} no CHROME → menu de três pontinhos → "Instalar app" → "Instalar"`,
      '',
      '✅ O ícone do RiseMe vai aparecer na sua tela inicial. Não está vendo? Deslize até as últimas telas do celular — às vezes ele fica no final. 😉',
      '',
      'Assim você acessa seu desafio com um toque só! 🚀',
      '(Se não conseguir, sem problema: o aplicativo funciona perfeitamente pelo navegador também.)',
      '',
      'Se precisar de ajuda, é só me escrever. Estou aqui pra você ter a melhor experiência. 😄 ❤️',
    ].join('\n'),
  en: ({ email, code, link, homeUrl }) =>
    [
      'Welcome to the RiseMe™️ Calisthenics Challenge! 🎉',
      '',
      'Congratulations on this great decision! I am sure this experience will be transformative for you. 😍',
      '',
      'Your access to the app is ready — here is your information 👇',
      '',
      `📧 Email: ${email}`,
      `🔑 Password: ${code}`,
      '',
      'Keep this password — it is how you log in to the app. 🔒',
      '',
      `Tap here to enter now: 👉 ${link}`,
      '',
      '(When you tap, the app opens automatically, you do not even need to type the password — your challenge is ready!) 💪',
      '',
      '📌 How to log in another day?',
      `👉 Go to ${homeUrl}, log in with your email and the password above.`,
      'If you like, you can change it to a password of your choice inside the app.',
      'Forgot your password? Use the "Forgot your password?" link on the login screen.',
      '',
      '📱 Optional: get the app on your phone',
      'RiseMe™️ works like a real app on your phone 👇',
      '',
      `📲 iPhone: open ${homeUrl} in SAFARI → share button → "Add to Home Screen" → "Add"`,
      '⚠️ The right option is "Add to Home Screen" (NOT "Add to Favorites")',
      '',
      `📲 Android: open ${homeUrl} in CHROME → three-dot menu → "Install app" → "Install"`,
      '',
      '✅ The RiseMe icon will appear on your home screen. Can not see it? Swipe to the last screens of your phone — sometimes it ends up there. 😉',
      '',
      'This way your challenge is one tap away! 🚀',
      '(If you can not do it, no problem: the app works perfectly in the browser too.)',
      '',
      'If you need help, just write to me. I am here so you have the best experience. 😄 ❤️',
    ].join('\n'),
  nl: ({ email, code, link, homeUrl }) =>
    [
      'Welkom bij de RiseMe™️ Calisthenics Challenge! 🎉',
      '',
      'Super dat je deze stap zet! Ik weet zeker dat deze 28 dagen veel voor je gaan doen. 😍',
      '',
      'Je toegang tot de app staat klaar, hier zijn je inloggegevens 👇',
      '',
      `📧 E-mail: ${email}`,
      `🔑 Wachtwoord: ${code}`,
      '',
      'Bewaar dit wachtwoord goed: daarmee log je in de app. 🔒',
      '',
      `Tik hier om meteen in te loggen: 👉 ${link}`,
      '',
      '(Als je erop tikt, opent de app vanzelf en hoef je niet eens je wachtwoord in te typen – je challenge staat al voor je klaar!) 💪',
      '',
      '⚠️ Blijft het scherm wit of kom je weer op de startpagina? Open de link dan buiten WhatsApp: op je iPhone in Safari, op Android in Chrome.',
      '',
      '📌 Hoe log je de volgende keer in?',
      `👉 Ga naar ${homeUrl} en log in met je e-mailadres en het wachtwoord hierboven.`,
      'Liever een eigen wachtwoord? Dat kun je in de app aanpassen.',
      'Weet je je wachtwoord niet meer? Tik op het inlogscherm op "Wachtwoord vergeten?".',
      '',
      '📱 Optioneel: zet de app op je telefoon',
      'RiseMe™️ werkt op je telefoon als een echte app 👇',
      '',
      `📲 iPhone: open ${homeUrl} in SAFARI → knop "Deel" (vierkantje met pijltje omhoog; soms eerst via •••) → "Zet op beginscherm" → "Voeg toe"`,
      '⚠️ De juiste optie is "Zet op beginscherm" (NIET "Voeg toe aan favorieten")',
      '',
      `📲 Android: open ${homeUrl} in CHROME → menu ⋮ → "App installeren" (of "Toevoegen aan startscherm") → "Installeren"`,
      '',
      '✅ Het RiseMe-icoontje verschijnt op je beginscherm. Zie je het niet? Veeg naar de laatste schermen van je telefoon, soms staat het helemaal achteraan. 😉',
      '',
      'Zo heb je je challenge altijd binnen handbereik! 🚀',
      '(Lukt het niet? Geen probleem: de app werkt ook prima in je browser.)',
      '',
      'Hulp nodig? Stuur me gewoon een berichtje, ik help je graag. 😄 ❤️',
    ].join('\n'),
}

// Grupo 'Comunidad RiseMe World' (do número do suporte; só a equipe posta): enquetes e avisos da cocriação do app (Bruno, 24/10–05/11/2026;
// a comunidade Hno2… foi trocada pelo grupo em 02–05/11 porque as alunas não achavam a enquete no Avisos).
const COMUNIDADE_ES = 'https://chat.whatsapp.com/KgL09RcnjaIFfyMuOv3w3b'

const SUPPORT: Record<AppLocale, SupportCopy> = {
  es: ({ playlist }) =>
    [
      '💛 Un último mensaje importante:',
      '',
      'Si completaste todos los pasos y aún tienes dificultades para acceder a la aplicación, escríbeme — nuestro equipo de soporte te ayudará a resolverlo. 😉',
      ...(playlist
        ? [
            '',
            'Mientras tanto, para que no te pierdas ni un solo día del desafío, puedes ver las lecciones desde esta lista especial de reproducción de YouTube:',
            '',
            `👉 ${playlist}`,
            '',
            '🙏 Este enlace es exclusivamente tuyo y solo es para nuestras estudiantes.',
          ]
        : []),
      '',
      '💬 Únete también a nuestro grupo *Comunidad RiseMe World*: ahí votamos juntas los próximos regalos y novedades de la app.',
      `👉 ${COMUNIDADE_ES}`,
      '',
      '¡Nos vemos en el desafío! 💪',
    ].join('\n'),
  tr: ({ playlist }) =>
    [
      '💛 Son bir önemli mesaj:',
      '',
      'Tüm adımları tamamladın ve uygulamaya girmekte hâlâ zorlanıyorsan bana yaz — destek ekibimiz çözmene yardım edecek. 😉',
      ...(playlist
        ? [
            '',
            'Bu arada meydan okumanın tek bir gününü bile kaçırmaman için dersleri bu özel YouTube oynatma listesinden izleyebilirsin:',
            '',
            `👉 ${playlist}`,
            '',
            '🙏 Bu bağlantı sadece sana ve öğrencilerimize özeldir.',
          ]
        : []),
      '',
      'Meydan okumada görüşürüz! 💪',
    ].join('\n'),
  pl: ({ playlist }) =>
    [
      '💛 Jeszcze jedna ważna wiadomość:',
      '',
      'Jeśli wykonałaś wszystkie kroki, a nadal masz problem z wejściem do aplikacji, napisz do mnie — nasz zespół wsparcia pomoże Ci to rozwiązać. 😉',
      ...(playlist
        ? [
            '',
            'Zanim to rozwiążemy, żebyś nie opuściła ani jednego dnia wyzwania, możesz oglądać lekcje na specjalnej playliście w YouTube:',
            '',
            `👉 ${playlist}`,
            '',
            '🙏 Ten link jest tylko dla uczestniczek wyzwania — prosimy, nie udostępniaj go dalej.',
          ]
        : []),
      '',
      'Widzimy się na treningu! 💪',
    ].join('\n'),
  it: ({ playlist }) =>
    [
      '💛 Un ultimo messaggio importante:',
      '',
      'Se hai seguito tutti i passaggi e hai ancora difficoltà a entrare nell\'app, scrivimi — il nostro team di supporto ti aiuterà a risolvere. 😉',
      ...(playlist
        ? [
            '',
            'Nel frattempo, per non perdere nemmeno un giorno della Sfida, puoi seguire le lezioni nella playlist speciale su YouTube:',
            '',
            `👉 ${playlist}`,
            '',
            '🙏 Questo link è riservato alle partecipanti alla Sfida — per favore, non condividerlo.',
          ]
        : []),
      '',
      'Ci vediamo all\'allenamento! 💪',
    ].join('\n'),
  cs: ({ playlist }) =>
    [
      '💛 Ještě jedna důležitá zpráva:',
      '',
      'Pokud jsi udělala všechny kroky a pořád se ti nedaří dostat se do aplikace, napiš mi — náš tým podpory ti to pomůže vyřešit. 😉',
      ...(playlist
        ? [
            '',
            'Než to vyřešíme, abys nepřišla ani o jeden den výzvy, můžeš sledovat lekce ve speciálním playlistu na YouTube:',
            '',
            `👉 ${playlist}`,
            '',
            '🙏 Tento odkaz je jen pro účastnice výzvy — prosíme, nesdílej ho dál.',
          ]
        : []),
      '',
      'Uvidíme se na tréninku! 💪',
    ].join('\n'),
  'pt-BR': ({ playlist }) =>
    [
      '💛 Uma última mensagem importante:',
      '',
      'Se você fez todos os passos e ainda está com dificuldade para entrar no aplicativo, me escreve — nossa equipe de suporte vai te ajudar a resolver. 😉',
      ...(playlist
        ? [
            '',
            'Enquanto isso, para você não perder nenhum dia do desafio, dá pra assistir às aulas nesta playlist especial do YouTube:',
            '',
            `👉 ${playlist}`,
            '',
            '🙏 Este link é exclusivo seu e só para as nossas alunas.',
          ]
        : []),
      '',
      'Nos vemos no desafio! 💪',
    ].join('\n'),
  en: ({ playlist }) =>
    [
      '💛 One last important message:',
      '',
      'If you followed all the steps and still have trouble getting into the app, write to me — our support team will help you sort it out. 😉',
      ...(playlist
        ? [
            '',
            'Meanwhile, so you do not miss a single day of the challenge, you can watch the lessons in this special YouTube playlist:',
            '',
            `👉 ${playlist}`,
            '',
            '🙏 This link is exclusively yours and only for our students.',
          ]
        : []),
      '',
      'See you in the challenge! 💪',
    ].join('\n'),
  nl: ({ playlist }) =>
    [
      '💛 Nog één belangrijk berichtje:',
      '',
      'Heb je alle stappen gevolgd en lukt het nog steeds niet om in de app te komen? Stuur me een bericht, dan helpt ons supportteam je verder. 😉',
      ...(playlist
        ? [
            '',
            'Zo mis je in de tussentijd geen enkele dag van de challenge. Je kunt de lessen bekijken in een speciale YouTube-afspeellijst:',
            '',
            `👉 ${playlist}`,
            '',
            '🙏 Deze link is alleen voor deelneemsters van de challenge, deel hem alsjeblieft niet met anderen.',
          ]
        : []),
      '',
      'Veel plezier met je eerste training! 💪',
    ].join('\n'),
}

export async function sendWhatsAppAccess(params: {
  challengeId?: string
  productCode: string
  transactionId: string
  name?: string
  email: string
  phone?: string
  code: string
  link: string
  locale: string
  /** Compra da Stripe: a 2ª mensagem diz como pedir reembolso (Bruno 09/11: zero chargeback). */
  comoReembolsar?: boolean
}): Promise<void> {
  if (process.env.WHATSAPP_PROVIDER !== 'zapi') {
    await sendVoxuyAccess(params)
    return
  }

  const phone = params.phone
  if (!isZapiConfigured() || !phone) {
    console.warn(
      `[whatsapp] pulando Z-API — ${!phone ? 'sem telefone' : 'env ausente'} (venda ${params.transactionId}). Backup: email`
    )
    return
  }

  // NÃO envia na hora: a compradora está na VSL do upsell logo após pagar, e a
  // notificação do WhatsApp tira ela da página de venda. Enfileira com atraso; o cron
  // /api/whatsapp/outbox envia. O email (contingência) continua saindo na hora.
  // REGIME "A PEDIDO" (Bruno 14/11/2026, lib/whatsapp-outbox.ts): UMA mensagem (acesso + apoio + como pedir reembolso no
  // fim), e ela só sai depois que a aluna nos escreve (botão da página de obrigado). Quem já nos escreveu antes por este
  // número recebe no atraso normal. Até lá a linha fica em espera; o e-mail de acesso sai na hora, como sempre.
  const unica = mensagensDeAcesso(params).join('\n\n')
  const emEspera = !(await jaEscreveu(phone))
  const sendAt = emEspera ? new Date(ESPERA_PEDIDO) : new Date(Date.now() + ATRASO_ACESSO_MIN * 60_000)
  const idAcesso = await enfileirar({ phone, kind: 'acesso', body: unica, mask: params.code, sendAfter: sendAt })
  if (!idAcesso) return

  // 3ª mensagem: convite de depoimento para TODA compradora, ~30 min depois do acesso (decisão do Bruno,
  // 14/10/2026: 85% nunca escreve, então o convite só pela conversa quase não saía). Na hora de enviar,
  // a fila pula quem pediu para parar, já recebeu convite, está com pessoa/consulta aberta (whatsapp-outbox).
  // Só idiomas com link em lib/whatsapp-agent/depoimentos.ts.
  // Vale para toda COMPRA NOVA (Bruno, 14/10/2026). Compradoras antigas NÃO recebem por envio em lote
  // ("não quero que o chip caia") — scripts/convidar-depoimento.ts fica parado. Desligar: CONVITE_PARA_TODAS = false.
  const chave = toZapiPhone(phone)
  const convite = CONVITE_PARA_TODAS ? conviteDepoimento(params.locale, chave) : null
  if (convite) {
    await enfileirar({
      phone: chave,
      kind: 'depoimento',
      body: convite,
      sendAfter: emEspera ? sendAt : new Date(sendAt.getTime() + ESPERA_DEPOIMENTO_MS), // em espera: liberarEspera põe 30 min depois do acesso
      dependsOn: idAcesso,
    })
  }
}

// Produto de front que não é a Calistenia: o desafio (id do app) troca o nome na saudação (KGF-ES, 26/10/2026).
const NOME_DO_DESAFIO: Record<string, Partial<Record<AppLocale, string>>> = {
  '9': { es: 'Plan de Bienestar Íntimo' },
}

// Compras da Stripe (Bruno 09/11/2026): deixar claro como pedir reembolso, para ela nunca ir ao banco antes de nós.
const COMO_REEMBOLSAR: Partial<Record<string, (homeUrl: string) => string>> & { en: (homeUrl: string) => string } = {
  pl: (h) => `Gdybyś kiedyś chciała zwrot pieniędzy, wystarczy napisać tutaj albo wejść na: ${h}/refund`,
  en: (h) => `If you ever want a refund, just write to us here or go to: ${h}/refund`,
  nl: (h) => `Mocht je je geld terug willen, stuur me dan gewoon hier een berichtje of ga naar: ${h}/refund`,
}

/**
 * Negrito do WhatsApp (*…*) no título, nos rótulos e nos subtítulos (Bruno, 10/11/2026: "só um monte de texto corrido,
 * está muito feio"). Regra única para os 7 idiomas, pela forma das linhas, não pelo texto: 1ª linha; linhas que começam
 * com 📌/📱 inteiras; rótulo até os dois-pontos em 📲/📧/🔑; a 1ª linha que termina em 👇 ("aqui está tu información").
 */
export function destacar(texto: string): string {
  let seta = false
  return texto
    .split('\n')
    .map((l, i) => {
      if (i === 0 && l.trim()) return `*${l.trim()}*`
      if (/^(📌|📱) /.test(l)) return `*${l.trim()}*`
      if (/^(📲|📧|🔑) [^:]+:/.test(l)) return l.replace(/^(\S+ )([^:]+:)/, '$1*$2*')
      if (!seta && l.trim().endsWith('👇')) { seta = true; return `*${l.trim()}*` }
      return l
    })
    .join('\n')
}

/** As 2 mensagens da sequência, prontas — exportado também pra pré-visualizar/testar o texto. */
export function mensagensDeAcesso(p: {
  locale: string
  email: string
  code: string
  link: string
  challengeId?: string
  comoReembolsar?: boolean
}): [string, string] {
  const locale = p.locale as AppLocale
  const copy = COPY[locale] ?? COPY.es
  const support = SUPPORT[locale] ?? SUPPORT.es
  // Raiz do app no idioma dela (mesmo prefixo do link de acesso: /tr, /pl…; es sem prefixo).
  const homeUrl = p.link.split('/entrar')[0]
  const nome = p.challengeId ? NOME_DO_DESAFIO[p.challengeId]?.[locale] : undefined
  const acesso = destacar(copy({ email: p.email, code: p.code, link: p.link, homeUrl }))
  return [
    nome ? acesso.replace('Desafío de Calistenia', nome) : acesso,
    // Sem playlist desde 16/10/2026: ela existia para tapar a falta de suporte, mas tirava a aluna do app
    // (~60% nunca faziam o dia 1 lá). Agora o suporte responde; a playlist fica só como plano B do agente.
    destacar(p.comoReembolsar ? `${support({})}\n\n${(COMO_REEMBOLSAR[locale] ?? COMO_REEMBOLSAR.en)(homeUrl)}` : support({})),
  ]
}

// Abertura do REENVIO de acesso (mesma senha de sempre) — usada pelo script de reenvio em lote e pelo comando
// "reenvia o acesso" do responsável. Sem a palavra "anterior": a msg de acesso diz "la contraseña
// anterior" no sentido de "a de cima".
// Bruno 18/11/2026: a senha da conta é UMA só, para sempre (lib/senha-conta.ts). O reenvio manda a mesma e diz isso com
// todas as letras: "a senha certa é esta". O aviso do telefone existe porque o preenchimento automático guarda senha velha.
const ABERTURA_REENVIO: Record<string, string> = {
  es: '¡Hola! 💛 Te reenviamos por aquí tu acceso a RiseMe. *La contraseña correcta es la de este mensaje*, y es siempre la misma: no cambia. Si tu teléfono te sugiere otra contraseña guardada, bórrala y escribe esta, o simplemente toca el enlace de abajo y entras directo.',
  pl: 'Cześć! 💛 Przesyłamy Ci tutaj jeszcze raz dostęp do RiseMe. *Prawidłowe hasło to to z tej wiadomości* i zawsze jest to samo: nie zmienia się. Jeśli telefon podpowiada inne, zapisane hasło, usuń je i wpisz to poniżej albo po prostu kliknij link na dole, a wejdziesz od razu.',
  it: "Ciao! 💛 Ti rimandiamo qui il tuo accesso a RiseMe. *La password giusta è quella di questo messaggio* ed è sempre la stessa: non cambia. Se il telefono ti suggerisce un'altra password salvata, cancellala e scrivi questa, oppure tocca semplicemente il link qui sotto ed entri subito.",
  cs: 'Ahoj! 💛 Posíláme ti sem znovu přístup do RiseMe. *Správné heslo je to v této zprávě* a je pořád stejné: nemění se. Pokud ti telefon nabízí jiné uložené heslo, smaž ho a napiš tohle, nebo prostě klikni na odkaz níže a jsi hned uvnitř.',
  tr: 'Merhaba! 💛 RiseMe erişimini buradan tekrar gönderiyoruz. *Doğru şifre bu mesajdaki şifredir* ve hep aynıdır: değişmez. Telefonun kayıtlı başka bir şifre önerirse onu sil ve bunu yaz ya da aşağıdaki bağlantıya dokun, doğrudan girersin.',
  en: 'Hi! 💛 We are resending your RiseMe access here. *The correct password is the one in this message*, and it is always the same: it does not change. If your phone suggests another saved password, delete it and type this one, or just tap the link below and you are in.',
  nl: 'Hoi! 💛 Hier zijn opnieuw je inloggegevens voor RiseMe. *Het juiste wachtwoord staat in dit bericht*, en het is altijd hetzelfde: het verandert niet. Stelt je telefoon een ander opgeslagen wachtwoord voor? Verwijder dat en typ dit wachtwoord in, of tik gewoon op de link hieronder, dan ben je meteen binnen.',
  'pt-BR': 'Oi! 💛 Estamos reenviando por aqui seu acesso ao RiseMe. *A senha certa é a desta mensagem*, e é sempre a mesma: não muda. Se o celular sugerir outra senha salva, apague e digite esta, ou simplesmente toque no link abaixo e você entra direto.',
}

export function aberturaReenvio(locale: string): string {
  return ABERTURA_REENVIO[locale] ?? ABERTURA_REENVIO.es
}

// ── Aviso de produto extra (upsell/downsell de quem JÁ tem conta) ─────────────────────────────────────────────────
// Bruno 13/11/2026: quem compra o Protokół no upsell do CL-PL não recebia nada (o produto só aparece na aba "Dodatki").
// Uma mensagem só, ~5 min depois do pagamento (ela já saiu do funil), dizendo o que comprou, que o login é o mesmo e o
// caminho exato no app. Quem chama: a rota da Stripe ([Alunas Stripe]) quando entra a compra extra. 1 vez por venda.
const AVISO_EXTRA: Partial<Record<string, Record<string, (n: string | undefined, valor: string | undefined, homeUrl: string) => string>>> = {
  'protocolo-metabolico': {
    pl: (n, valor, home) => `Gotowe${n ? `, ${n}` : ''}! 💛 Twój *Protokół Metaboliczny 28 Dni*${valor ? ` (${valor})` : ''} jest już w aplikacji.

📲 Wchodzisz tak samo jak zawsze, *tym samym e-mailem i hasłem*. Nie ma nowego hasła.

👉 Otwórz aplikację: ${home}
👉 Na dole ekranu kliknij *„Dodatki"*
👉 Tam znajdziesz *„Protokół metaboliczny"*

Masz pytanie? Napisz tutaj 💛`,
  },
}

export async function avisarProdutoExtra(p: {
  phone: string
  produto: string // id do produto no app, ex.: 'protocolo-metabolico'
  locale: string
  venda: string // id da venda (ex.: sessão da Stripe) — trava de 1 aviso por compra
  nome?: string | null
  valor?: string | null // como ela vê no extrato, ex.: '97 zł'
}): Promise<number | null> {
  const texto = AVISO_EXTRA[p.produto]?.[p.locale]
  if (!texto || !isZapiConfigured()) return null
  const phone = toZapiPhone(p.phone)
  if (!phone) return null
  const { jaEnfileirou, pediuParaParar } = await import('@/lib/whatsapp-outbox')
  const kind = `aviso-extra:${p.venda}`.slice(0, 120)
  if ((await jaEnfileirou(phone, kind)) || (await pediuParaParar(phone))) return null
  // Sem nome (Bruno 13/11: 'para não ter problema e minimizar erros').
  // O acesso do desafio (com a senha) sai 15 min depois da compra do front, por causa da VSL do upsell ([Alunas Stripe]).
  // Se ele ainda está na fila, o aviso espera por ele: "mesmo e-mail e senha" nunca pode chegar antes da senha.
  let sendAfter = new Date(Date.now() + 5 * 60_000)
  let dependsOn: number | undefined
  const { admin } = await import('@/lib/whatsapp-agent/conversa')
  const { data: acesso } = await admin().from('whatsapp_outbox').select('id, send_after').eq('phone', phone).eq('kind', 'acesso').is('sent_at', null).order('send_after', { ascending: false }).limit(1)
  if (acesso?.[0]) {
    dependsOn = acesso[0].id as number
    const depois = new Date(new Date(acesso[0].send_after as string).getTime() + 3 * 60_000)
    if (depois > sendAfter) sendAfter = depois // acesso em espera (regime a pedido) → o aviso espera junto e sai 3 min depois dele
  } else if (!(await jaEscreveu(phone))) {
    sendAfter = new Date(ESPERA_PEDIDO) // nunca nos escreveu: só sai quando ela escrever (o e-mail do produto já avisou)
  }
  return enfileirar({ phone, kind, body: texto(undefined, p.valor ?? undefined, `https://riseme.app/${p.locale}`), sendAfter, dependsOn })
}

/** Texto do aviso (prévia ao Bruno, testes). */
export function textoAvisoProdutoExtra(produto: string, locale: string, nome?: string, valor?: string): string | null {
  return AVISO_EXTRA[produto]?.[locale]?.(nome, valor, `https://riseme.app/${locale}`) ?? null
}
