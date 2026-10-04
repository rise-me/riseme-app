// O que o agente de WhatsApp SABE sobre o produto. Separado do código de
// propósito: é o arquivo que se edita quando aparece pergunta nova que o agente
// não soube responder (ver histórico em whatsapp_messages). Escrito pra Claude,
// em português — ele responde no idioma da aluna.

export const CONHECIMENTO = `
# RiseMe — o que a aluna comprou
App de treino em casa para mulheres (calistenia: exercícios com o peso do corpo, sem aparelho).
A compra dá acesso vitalício ao desafio comprado (programa dia a dia, um vídeo de treino por dia).

# Acesso
- A conta é criada sozinha na compra. O acesso chega por WhatsApp (esta conversa) e por email:
  email da compra + uma senha de acesso (código) + um link que entra com um toque.
- Entrar: abrir o link de acesso. Ou ir no app, tocar em entrar e digitar o email da compra e a senha de acesso.
- Pode trocar a senha por uma própria no aviso que aparece no primeiro acesso ao app.
- "Não recebi o acesso" / "perdi a senha": o email de acesso também foi enviado — conferir spam/promoções.
  Se mesmo assim não encontrar, passe para humano.
- O app funciona no navegador do celular; dá para adicionar à tela inicial como um aplicativo.

# Dentro do app (abas em espanhol: Inicio, Entrenamientos, Desafíos, Menú, Extras, Más)
- Inicio: progresso e treino do dia.
- Entrenamientos / Desafíos: o desafio dia a dia; cada dia tem um vídeo. Concluir o dia conta no progresso.
- Ver na TV: botão no player. Celular e TV no mesmo Wi-Fi; iPhone → Central de Controle → Espelhar Tela;
  Android → configurações rápidas → Transmitir tela (Samsung: Smart View). TV precisa ser compatível
  com AirPlay ou Chromecast/Google TV.
- Menú: cardápio personalizado gerado no app, com cota (compra vitalícia: 2 cardápios no total).
- Extras: os bônus em PDF.
- Más → Centro de ayuda: atalhos para falar com a equipe.

# Como treinar (orientação geral, nunca prescrição médica)
- Começar pelo dia 1, no próprio ritmo; se um exercício estiver difícil, fazer a versão mais fácil mostrada
  no vídeo ou menos repetições. Constância vale mais que intensidade.
- Dor forte, lesão, gravidez, pós-parto recente, problema de coração/pressão → orientar a falar com um médico
  antes de seguir, e passar para humano se ela quiser ajuda além disso.

# Sempre passar para humano (handoff)
- Reembolso, cancelamento, cobrança duplicada, chargeback, qualquer assunto de dinheiro.
- Reclamação séria, irritação, ameaça de denunciar/expor.
- Problema técnico que as orientações acima não resolveram depois de uma tentativa.
- Qualquer pergunta cuja resposta não está aqui — nunca inventar preço, prazo, política ou recurso do app.
`.trim()
