# Roadmap RiseMe

> Itens decididos e ainda não feitos. Cada um com o motivo e o que falta para começar.
> Quando um item entrar em execução, o detalhe vai para o commit/PR; aqui fica só a decisão.

## Vender desbloqueio vitalício dentro do app (decidido 06/10/2026, ainda não iniciado)

**Motivo:** a assinatura anual nunca vendeu, e quem está no app já comprou uma vez. Hoje o app
não oferece nenhuma compra avulsa: desafio bloqueado só abre a oferta de assinatura e o Protocolo
Metabólico fica escondido de quem não comprou.

**Decisões do Bruno**
- Cada desafio do app vendido avulso: **US$ 14,90, acesso vitalício**.
- **Protocolo Metabólico** (upsell): **US$ 19,90**.
- **Assinatura continua**, como opção secundária ("todos os desafios por US$ 29,90/mês", valor a
  confirmar). Ela também entra pelo funil de upsell: trial de 7 dias que vira cobrança se a aluna
  não cancelar — isso não muda.

**Checklist — parte do Bruno (bloqueia o resto)**
- [ ] Criar na **Hotmart** um produto para cada desafio do app: Pilates en la Pared, Yoga Facial,
      Yoga en la Silla, Cuerpo Sexy de Verano (e Calistenia en Casa, para quem entrou por outro
      desafio) — US$ 14,90, vitalício.
- [ ] Criar os mesmos na **Perfect Pay** (mercados que vendem por lá: PL, TR).
- [ ] Protocolo Metabólico avulso a US$ 19,90 nas duas plataformas (se ainda não existir nesse preço).
- [ ] Para cada produto: marcar no **webhook** da plataforma e mandar o **ID/código + link de checkout**
      (ver `docs/checklist-novo-produto.md`).

**Checklist — parte técnica (quando os IDs chegarem)**
- [ ] Linhas novas em `HOTMART_CHALLENGE_MAP` / `PERFECTPAY_CHALLENGE_MAP` + redeploy.
- [ ] Desafio com cadeado: oferta principal "Desbloquear este desafío · US$ 14,90 · de por vida";
      assinatura como alternativa menor na mesma tela.
- [ ] Protocolo Metabólico aparece bloqueado em Extras com preço e botão de compra.
- [ ] Checkout abre com o **email da conta já preenchido** (comprar com outro email cria outra conta).
- [ ] Preços e links num arquivo de configuração por idioma/mercado (sem mexer em código para trocar).
- [ ] Atualizar o preço da assinatura no app (hoje fixo: US$ 39/ano e US$ 29/mês no PaywallModal).
- [ ] Ensinar o agente do WhatsApp a oferecer/explicar essas compras (lib/whatsapp-agent).
- [ ] Conferir uma compra real de cada tipo (desbloqueia sozinho na conta certa).

## Outros pendentes já conhecidos
- Tela de assinatura mostra "Starter" para quem cancelou mas ainda está no período pago
  (consulta só `status='active'` em `more/subscription`).
- "Términos de uso" e "Política de privacidad" não abrem nada (login e perfil).
- Reenvio do acesso para as 133 compradoras ES que nunca entraram: devagar, em lotes
  (`scripts/reenviar-acesso.ts`).
- WhatsApp: acompanhamento automático (24h sem entrar / 3 dias sem treinar).
