# Indicação de amigas — método e evidência (19/10/2026)

> Pedido do Bruno (19/10): uma aluna pediu o link para a amiga comprar e o agente não tinha ("perdemos uma venda
> gratuita via indicação — isso é o ápice do nosso trabalho"). Primeiro pedido explícito em 15 dias de conversas.

## O que já está no ar
- Agente manda o link de compra com `src=indicacao` quando a aluna quer indicar (lib/whatsapp-agent/conhecimento.ts).
- Amiga comprou → aluna manda ao agente o email da amiga → servidor confere (compra do desafio nos últimos 30 dias,
  não é a própria aluna, amiga ainda não contada) e libera **1 mês do Pase Completo** (lib/whatsapp-agent/indicacao.ts).

## O que a pesquisa diz (fontes no fim)
- ✔ Cliente indicado vale mais e retém mais (banco alemão, ~10 mil clientes: +16% de valor; churn menor).
- ✔ **Presente para a AMIGA traz mais clientes novos do que presente só para quem indica** (2 experimentos de campo,
  JMR 2020; jogo mobile JMIS 2021). Só quem indica ganhando gera desconfiança de interesse; presente de produto atenua.
- ✔ Ter recompensa aumenta a indicação; aumentar o valor acrescenta pouco.
- ✔ Banner fixo vira paisagem (NN/g). Momento certo: evidência fraca → cartão discreto fixo + destaque em poucos momentos.
- ✔ WhatsApp: ~80% de uso na América Latina — é o canal.
- Email para a base: saúde/fitness ~1,5% de clique → em 4.300 emails, ~60 cliques. **Polônia: email comercial exige
  consentimento prévio (lei PKE 2024, multa até 3% do faturamento) → não mandar para as compradoras PL.**
- Fraude típica: autoindicação (2º email). Defesas: rejeitar a própria conta (feito), 1 crédito por amiga (feito),
  só compra recente (feito), teto de meses por aluna, revisar à mão os casos estranhos.

## Desenho proposto (decisões do Bruno pendentes)
1. Recompensa para as duas: quem indica = 1 mês do Pase; amiga = cardápio extra (custo zero).
2. Cartão discreto fixo no Início + destaque ao terminar o dia 7 e o dia 28 (máx. 1x/semana; nunca para quem está com problema).
3. Botão "compartilhar no WhatsApp" com mensagem pronta em 1ª pessoa e link com o código da aluna.
4. Email único para a base ES (não PL), com descadastro.
5. Medir: % de alunas que compartilham, vendas por 100 compartilhamentos, reembolso das indicadas, retenção no Pase.
   A/B: amiga com presente × sem presente, ~4 semanas.

## Fontes
- Schmitt, Skiera & Van den Bulte 2011: https://faculty.wharton.upenn.edu/wp-content/uploads/2012/04/Schmitt-Skiera-vandenBulte-2011-Referral-Programs-Customer-Value.pdf
- Van den Bulte et al. JMR 2018: https://faculty.wharton.upenn.edu/wp-content/uploads/2017/07/VdB-et-al.-JMR-2018.pdf
- Gershon, Cryder & John JMR 2020: https://olin.washu.edu/about/news-and-media/news/2020/07/research-into-social-dynamics-shows-how-firms-can-win-more-customers.php
- Jung et al. JMIS 2021: https://jmis-web.org/articles/1512
- Verlegh et al. JAMS 2013: https://dare.uva.nl/id/553a0430-0ee6-4f93-bd73-f97db1105ca2
- Ryu & Feick 2007: https://kellercenter.hankamer.baylor.edu/news/story/2008/insider-referral-reward-programs-and-referral-likelihood
- Dropbox (Houston 2010): https://www.slideshare.net/slideshow/dropbox-startup-lessons-learned-3836587/3836587
- Cegueira de banner (NN/g): https://www.nngroup.com/articles/banner-blindness-old-and-new-findings/
- WhatsApp na América Latina: https://www.warc.com/content/article/four-fifths-of-latin-america-use-whatsapp/124358
- Benchmarks de email (MailerLite): https://mailerlite.com/blog/compare-your-email-performance-metrics-industry-benchmarks
- Polônia, consentimento (PKE art. 398): https://www.ifirma.pl/blog/prawo-komunikacji-elektronicznej-juz-opublikowane-nowe-zasady-zgod-marketingowych-w-2024-roku/
- Fraude em indicação: https://www.talkable.com/blog/preventing-referral-program-fraud
