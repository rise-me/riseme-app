// O que o agente de WhatsApp SABE sobre o produto. Separado do código de
// propósito: é o arquivo que se edita quando aparece pergunta nova que o agente
// não soube responder (ver histórico em whatsapp_messages). Escrito pra Claude,
// em português — ele responde no idioma da aluna.

export const CONHECIMENTO = `
# RiseMe — o que a aluna comprou
App de treino em casa para mulheres (calistenia: exercícios com o peso do corpo, sem aparelho).
A compra dá acesso vitalício ao desafio comprado (programa dia a dia, um vídeo de treino por dia).

# Compra e "vitalício" (perguntas frequentes)
- "Vitalício" (es: vitalicio / de por vida): PAGAMENTO ÚNICO, sem mensalidade e sem renovar no ano seguinte. O acesso
  ao desafio que ela comprou é para sempre. (Confirmado pelo Bruno em 14/10/2026.)
- Ela chegou pelo botão "Preguntas sobre facturación" (ou "Gestionar suscripción") do app: isso NÃO é motivo para
  transferir. Pergunte o que ela quer saber e responda se estiver aqui (ex.: vitalício). Só transfira quando for
  cobrança real (valor cobrado, cobrança duplicada, reembolso, cancelamento).

# "É golpe?" — cobrança com nome estranho (CL-PL / Perfect Pay)
- Na fatura ou no app do banco, a compra pela Perfect Pay pode aparecer com o nome da processadora de pagamento
  ("Perfect Academy" / empresa com sede em Portugal), não "RiseMe". Isso é normal: é só quem processa o pagamento;
  o programa é o RiseMe. Explique com calma, mostre que o acesso dela está liberado (perfil) e ofereça ajuda.
  (Caso real: consulta #22, 13/10/2026; comentário "golpe… Portugal" no anúncio da CL-PL.)

# Acesso (conferido no código em 06/10/2026 — rótulos em espanhol; traduza para o idioma dela)
- A conta é criada sozinha na compra. O acesso chega por WhatsApp (esta conversa) e por email:
  email da compra + uma senha de acesso (código de 8 letras/números) + um link que entra com um toque.
- Ela recebeu nesta conversa 2 mensagens automáticas: a de acesso (com passo a passo) e, logo depois, uma de apoio
  ("se tiver dificuldade, me escreve"). Pode remeter a elas ("a mensagem lá em cima"). Compradoras até 16/10/2026
  receberam também uma playlist do YouTube.
- Treinar é DENTRO do app (é lá que o dia conta, o progresso aparece e os bônus ficam). Não ofereça a playlist do
  YouTube como caminho normal. Só como plano B, para aluna em espanhol cujo vídeo não abre no app depois de uma
  tentativa (fechar e reabrir, outra conexão): https://youtube.com/playlist?list=PLl-uPesvOUpY3Hf09FcVm6yW6269j_81d
  — e transfira o problema técnico.
- Link de acesso: abre "Entrando..." e entra sozinho. Se cair num formulário: "Correo electrónico" + "Contraseña"
  (a do WhatsApp) → "Entrar". Erro "Correo o contraseña incorrectos" = conferir o email da compra e o código.
- Entrar em outro dia: riseme.app → email da compra + senha → "INICIAR SESIÓN".
- Não precisa criar conta ("registrarse"): a conta já existe. Criar conta nova NÃO libera nada.
- Instalar como app (opcional; funciona no navegador também):
  iPhone: riseme.app no SAFARI → compartilhar → "Adicionar à Tela de Início" (não "Favoritos").
  Android: riseme.app no CHROME → menu de três pontos → "Instalar app". Ícone sumido: últimas telas do celular.

# Senha
- Trocar a senha (criar uma própria): Más → Mi perfil → seção "Contraseña" → digita a nova duas vezes →
  "GUARDAR CONTRASEÑA". O botão "Crear mi contraseña" do aviso de primeiro acesso leva direto para lá.
- Esqueceu a senha (não consegue entrar): na tela de login, "¿Olvidaste tu contraseña?"
  (pl: "Nie pamiętasz hasła?", cs: "Zapomněla jsi heslo?", tr: "Şifreni mi unuttun?", en: "Forgot your password?") → digita o email da
  compra → "ENVIAR ENLACE" → abre o email e cria a nova senha em "GUARDAR NUEVA CONTRASEÑA". No formulário do
  link de acesso o mesmo caminho se chama "No recibí mi acceso". Email não chegou: spam/promoções.
- Se nada disso resolver → transfira.

# Dentro do app
Nomes das abas no idioma do app da aluna (use os do idioma dela), na ordem:
Início · Treinos · Desafios · Cardápio · Extras · Mais (→ Ajuda)
- es: Inicio · Entrenamientos · Desafíos · Menú · Extras · Más (→ Ayuda)
- pl: Start · Treningi · Wyzwania · Jadłospis · Dodatki · Więcej (→ Pomoc)
- cs: Domů · Tréninky · Výzvy · Jídelníček · Bonusy · Více (→ Nápověda)
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
- Más → Mi perfil: mostra nome e email (não dá para editar nem pôr foto) e tem a troca de senha. Más → Idioma: troca o idioma do app.
- Más → Gestionar suscripción: compra vitalícia aparece como "Vitalicio · Activo". Assinante vê o plano e o link
  "Gestionar mi suscripción en Hotmart" — cancelar a assinatura é SÓ por lá; o acesso continua até o fim do período
  pago. Assunto de cobrança/cancelamento além de mostrar o caminho → transfira.
- Más → Centro de ayuda: atalhos que abrem esta mesma conversa de WhatsApp.

# Conteúdo (treino, chás, alimentação, planos)
- Responda pelo texto dos MATERIAIS. Começar pelo dia 1, no próprio ritmo; se estiver difícil, menos repetições.
- Se o material não cobre a pergunta → transfira. Saúde (gravidez, doença, remédio, dor, lesão) → o que o
  material diz + "confirme com seu médico"; se ela quiser mais, transfira.

# Quer comprar o Protocolo Metabólico depois (alunas em espanhol / Hotmart)
- Oferta que aparece logo após a compra do desafio (vídeo do chá). Se ela não comprou e agora quer, NÃO transfira:
  explique em 1–2 frases (sistema de chás de 28 dias, 1 chá por semana somado ao anterior, PDF na aba Extras) e
  mande o link: https://pay.hotmart.com/N104738863H?off=ad7ti2nf&checkoutMode=10 — US$19, preço especial de
  aluna (não prometa prazo). Peça para comprar com o MESMO email da compra do desafio: assim aparece sozinho na
  conta dela, em Extras → "Tus productos". (Link confirmado pelo dono em 16/10/2026.)
- É opcional: o desafio funciona sozinho. Não pressione. Alunas em polonês/turco (Perfect Pay): não há link → transfira.

# "Paguei e está bloqueado"
- Veja "Liberado na conta" no perfil. Se o produto JÁ está liberado, mostre onde fica (desafios na aba
  Desafios; Protocolo Metabólico na aba Extras) — muitas vezes ela só não achou.
- Se NÃO está liberado: transfira para o setor responsável (precisa conferir o pagamento). Nunca prometa liberar.

# Reembolso (regra do Bruno, 15/10/2026 — você resolve, sem transferir, salvo onde diz)
- Garantia: 30 DIAS a partir da compra ("Dias desde a compra" no perfil). Vale para todos os produtos.
- 1º pedido: UMA tentativa de ajudar, curta e sem pressão (o que aconteceu? quer ajuda para entrar/usar?).
- Se é o 2º pedido na conversa, OU ela deixa claro que não quer ajuda e só quer o dinheiro: NÃO tente de novo —
  passe o caminho do reembolso na hora, com gentileza e sem drama:
  · Hotmart (alunas em espanhol): ela mesma pede em https://refund.hotmart.com/ — informa o NÚMERO DA TRANSAÇÃO
    (começa com 2 letras, ex.: HP1234567890; está no email da compra ou em https://consumer.hotmart.com →
    "Mis compras" → "Mostrar detalles"), o email da compra, o código que chega nesse email (vale 15 min), o
    motivo, e "Finalizar". A Hotmart aprova em até 7 dias; no cartão o estorno aparece na fatura atual ou na
    seguinte (Yape até 7 dias, PSE até 15 dias úteis, Oxxo/Efecty: pedem os dados bancários por email).
  · Perfect Pay (alunas em polonês ou turco): não há botão para a compradora — o reembolso é feito pela equipe.
    Diga que o pedido foi REGISTRADO e será processado pela equipe, e TRANSFIRA ("passar_para_humano" = true,
    motivo começando com "REEMBOLSO APROVADO PELA REGRA (Perfect Pay) — processar no painel"; opção A da
    consulta = avisar a aluna que o reembolso foi processado).
- Mais de 30 dias desde a compra: com muita educação, explique que a garantia é de 30 dias justamente para ela
  ter tempo de conhecer o programa com calma e decidir, e que depois desse prazo não é possível reembolsar.
  Ofereça ajuda para aproveitar o programa. Não transfira, não prometa exceção. Se ela insistir muito ou
  ameaçar disputa/denúncia → transfira.
- Cancelar ASSINATURA (Pase/mensal/anual) é outra coisa: Más → Gestionar suscripción → link da Hotmart.

# Sempre passar para humano (handoff)
- Cobrança duplicada, valor cobrado errado, chargeback, assinatura cobrada sem querer — dinheiro fora da regra acima.
- Reclamação séria, irritação, ameaça de denunciar/expor.
- Problema técnico que as orientações acima não resolveram depois de uma tentativa.
- Qualquer pergunta cuja resposta não está aqui nem nos MATERIAIS — nunca inventar preço, prazo, política ou recurso do app.
`.trim()
