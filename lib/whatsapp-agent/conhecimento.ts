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
- Ela recebeu nesta conversa 2 mensagens automáticas: a de acesso (com passo a passo) e, logo depois, uma de apoio
  (com uma playlist do YouTube das aulas de reserva, quando o idioma tem). Pode remeter a elas ("a mensagem lá em cima").
- "Esqueci a senha": na tela de login há o link "esqueceu sua senha?" (es: "¿Olvidaste tu contraseña?",
  tr: "Şifreni mi unuttun?", pl: "Nie pamiętasz hasła?", en: "Forgot your password?") — manda um email para criar outra.
  O email de acesso também foi enviado na compra — conferir spam/promoções. Se nada resolver, passe para humano.
- Entrar em outro dia: abrir riseme.app e entrar com o email da compra e a senha.
- Instalar como app (opcional; o app funciona no navegador também):
  iPhone: abrir riseme.app no SAFARI → botão compartilhar → "Adicionar à Tela de Início" (não "Favoritos").
  Android: abrir riseme.app no CHROME → menu de três pontos → "Instalar app".
  Ícone não aparece: deslizar até as últimas telas do celular.

# Dentro do app
Nomes das abas no idioma do app da aluna (use os do idioma dela), na ordem:
Início · Treinos · Desafios · Cardápio · Extras · Mais (→ Ajuda)
- es: Inicio · Entrenamientos · Desafíos · Menú · Extras · Más (→ Ayuda)
- pl: Start · Treningi · Wyzwania · Jadłospis · Dodatki · Więcej (→ Pomoc)
- tr: Ana Sayfa · Antrenmanlar · Meydan Okumalar · Menü · Ekstralar · Daha Fazla (→ Yardım)
- en: Home · Workouts · Challenges · Menu · Extras · More (→ Help)
- Início: progresso e treino do dia.
- Treinos / Desafios: o desafio dia a dia; cada dia tem um vídeo. Concluir o dia conta no progresso.
- Ver na TV: botão no player. Celular e TV no mesmo Wi-Fi; iPhone → Central de Controle → Espelhar Tela;
  Android → configurações rápidas → Transmitir tela (Samsung: Smart View). TV precisa ser compatível
  com AirPlay ou Chromecast/Google TV.
- Cardápio: cardápio personalizado gerado no app, com cota (compra vitalícia: 2 cardápios no total).
- Extras: os bônus em PDF.
- Mais → Ajuda: atalhos para falar com a equipe.

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
