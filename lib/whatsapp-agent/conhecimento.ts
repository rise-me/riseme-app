// O que o agente de WhatsApp SABE sobre o produto. Separado do código de
// propósito: é o arquivo que se edita quando aparece pergunta nova que o agente
// não soube responder (ver histórico em whatsapp_messages). Escrito pra Claude,
// em português — ele responde no idioma da aluna.

export const CONHECIMENTO = `
# RiseMe — o que a aluna comprou
App de treino em casa para mulheres (calistenia: exercícios com o peso do corpo, sem aparelho).
A compra dá acesso vitalício ao desafio comprado (programa dia a dia, um vídeo de treino por dia).

# Acesso (conferido no código em 06/10/2026 — rótulos em espanhol; traduza para o idioma dela)
- A conta é criada sozinha na compra. O acesso chega por WhatsApp (esta conversa) e por email:
  email da compra + uma senha de acesso (código de 8 letras/números) + um link que entra com um toque.
- Ela recebeu nesta conversa 2 mensagens automáticas: a de acesso (com passo a passo) e, logo depois, uma de apoio
  (com uma playlist do YouTube das aulas de reserva, quando o idioma tem). Pode remeter a elas ("a mensagem lá em cima").
- Link de acesso: abre "Entrando..." e entra sozinho. Se cair num formulário: "Correo electrónico" + "Contraseña"
  (a do WhatsApp) → "Entrar". Erro "Correo o contraseña incorrectos" = conferir o email da compra e o código.
- Entrar em outro dia: riseme.app → email da compra + senha → "INICIAR SESIÓN".
- Não precisa criar conta ("registrarse"): a conta já existe. Criar conta nova NÃO libera nada.
- Instalar como app (opcional; funciona no navegador também):
  iPhone: riseme.app no SAFARI → compartilhar → "Adicionar à Tela de Início" (não "Favoritos").
  Android: riseme.app no CHROME → menu de três pontos → "Instalar app". Ícone sumido: últimas telas do celular.

# Senha
- NÃO existe hoje tela para trocar a senha dentro do app (o perfil só mostra nome e email). O botão
  "Crear mi contraseña" do aviso de primeiro acesso leva ao perfil e lá não há como trocar — não mande ela lá.
- Para criar uma senha própria OU recuperar a esquecida: na tela de login, "¿Olvidaste tu contraseña?"
  (pl: "Nie pamiętasz hasła?", tr: "Şifreni mi unuttun?", en: "Forgot your password?") → digita o email da
  compra → "ENVIAR ENLACE" → abre o email e cria a nova senha em "GUARDAR NUEVA CONTRASEÑA". No formulário do
  link de acesso o mesmo caminho se chama "No recibí mi acceso". Email não chegou: spam/promoções.
- Se nada disso resolver → transfira.

# Dentro do app
Nomes das abas no idioma do app da aluna (use os do idioma dela), na ordem:
Início · Treinos · Desafios · Cardápio · Extras · Mais (→ Ajuda)
- es: Inicio · Entrenamientos · Desafíos · Menú · Extras · Más (→ Ayuda)
- pl: Start · Treningi · Wyzwania · Jadłospis · Dodatki · Więcej (→ Pomoc)
- tr: Ana Sayfa · Antrenmanlar · Meydan Okumalar · Menü · Ekstralar · Daha Fazla (→ Yardım)
- en: Home · Workouts · Challenges · Menu · Extras · More (→ Help)
- Desafios: os comprados aparecem liberados ("Empezar desafío" / "Continuar — Día N"). Os dias abrem EM ORDEM:
  pular dia mostra "Clase bloqueada". O dia conta como concluído quando ela assiste pelo menos 80% do vídeo.
  Desafio com cadeado ("🔒 Desbloquear") = não comprado: o botão abre a oferta de assinatura do app.
- Selo "🎧 Audio en español": aquele desafio ainda não tem vídeo no idioma dela; o áudio é em espanhol.
- Ver na TV: botão de TV no player = instruções de espelhar a tela (não transmite sozinho). Celular e TV no mesmo
  Wi-Fi; iPhone → Central de Controle → Espelhar Tela; Android → configurações rápidas → Transmitir tela
  (Samsung: Smart View). TV compatível com AirPlay ou Chromecast/Google TV.
- Extras: os bônus em PDF (liberados para quem comprou qualquer desafio). Produto comprado à parte (ex.: Protocolo
  Metabólico) aparece em "Tus productos" SÓ se ela comprou — se comprou e não aparece, ver "Paguei e está bloqueado".
  Dentro do material há "Descargar PDF".
- Cardápio (Menú): cardápio personalizado gerado no app. Compra vitalícia: 2 cardápios no total; depois disso o app
  oferece assinatura. Assinatura mensal: 3 por mês; anual: 1 por semana.
- Ayuno (jejum): ainda não existe ("Próximamente").
- Más → Mi perfil: só mostra nome e email (não dá para editar, nem foto). Más → Idioma: troca o idioma do app.
- Más → Gestionar suscripción: compra vitalícia aparece como "Vitalicio · Activo". Assinante vê o plano e o link
  "Gestionar mi suscripción en Hotmart" — cancelar a assinatura é SÓ por lá; o acesso continua até o fim do período
  pago. Assunto de cobrança/cancelamento além de mostrar o caminho → transfira.
- Más → Centro de ayuda: atalhos que abrem esta mesma conversa de WhatsApp.

# Conteúdo (treino, chás, alimentação, planos)
- Responda pelo texto dos MATERIAIS. Começar pelo dia 1, no próprio ritmo; se estiver difícil, menos repetições.
- Se o material não cobre a pergunta → transfira. Saúde (gravidez, doença, remédio, dor, lesão) → o que o
  material diz + "confirme com seu médico"; se ela quiser mais, transfira.

# "Paguei e está bloqueado"
- Veja "Liberado na conta" no perfil. Se o produto JÁ está liberado, mostre onde fica (desafios na aba
  Desafios; Protocolo Metabólico na aba Extras) — muitas vezes ela só não achou.
- Se NÃO está liberado: transfira para o setor responsável (precisa conferir o pagamento). Nunca prometa liberar.

# Sempre passar para humano (handoff)
- Reembolso, cancelamento, cobrança duplicada, chargeback, qualquer assunto de dinheiro.
- Reclamação séria, irritação, ameaça de denunciar/expor.
- Problema técnico que as orientações acima não resolveram depois de uma tentativa.
- Qualquer pergunta cuja resposta não está aqui nem nos MATERIAIS — nunca inventar preço, prazo, política ou recurso do app.
`.trim()
