# Catálogo de ofertas — gerado de `lib/catalogo.ts` (não editar aqui; editar o .ts e rodar `npx tsx scripts/catalogo-md.ts`)

Gerado em 2026-11-05. Fonte: API da Hotmart (vendas por oferta), CL-ES/config.js, dash, código. "?" = o Bruno preenche.

| Produto | Plataforma | Oferta | Preço | Status | Países | Link | Nota |
|---|---|---|---|---|---|---|---|
| Calistenia en Casa (Desafío de 28 Días de Calistenia) (es) | hotmart 6087092 | `j3m3v9m3` | US$ 12,90 | vigente | todos | <https://pay.hotmart.com/H101419289G?off=j3m3v9m3&checkoutMode=10&hideBillet=1&hideMultipleCards=1> | preço normal do funil para todos os países fora dos testes abaixo |
| Calistenia en Casa (Desafío de 28 Días de Calistenia) (es) | hotmart 6087092 | `yrn1s1q7` | US$ 19,90 | vigente | US, PR | <https://pay.hotmart.com/H101419289G?off=yrn1s1q7&checkoutMode=10&hideBillet=1&hideMultipleCards=1> | EUA e Porto Rico desde 03/11 (T19 venceu); é o A do T30 |
| Calistenia en Casa (Desafío de 28 Días de Calistenia) (es) | hotmart 6087092 | `0kk0z0if` | US$ 24,90 | teste até 2026-11-14 | US, PR | <https://pay.hotmart.com/H101419289G?off=0kk0z0if&checkoutMode=10&hideBillet=1&hideMultipleCards=1> | T30 (24,90 × 19,90), metade de EUA/PR |
| Calistenia en Casa (Desafío de 28 Días de Calistenia) (es) | hotmart 6087092 | `39kagsh5` | US$ 14,90 | teste até 2026-11-10 | CO, MX | <https://pay.hotmart.com/H101419289G?off=39kagsh5&checkoutMode=10&hideBillet=1&hideMultipleCards=1> | T25 Colômbia (desde 29/10) e T31 México (desde 03/11), metade vê 12,90 |
| Calistenia en Casa (Desafío de 28 Días de Calistenia) (es) | hotmart 6087092 | `(RECUPERACAO_OFERTA)` | US$ 12,90 | recuperacao | todos | — | mesmo produto e preço, código próprio só para o dash separar venda recuperada; o código mora na env da Vercel (não lido aqui) — Bruno confirma |
| Pilates en la Pared 2.0 (es) | hotmart 4784921 | `?` | US$ 12,90 (há oferta de 14,90) | vigente | todos | — | oferta avulsa existe na Hotmart (produto 4784921, várias ofertas); CÓDIGO E LINK a receber do Bruno — até lá o bot transfere o pedido com motivo "VENDA — link do Pilates avulso" (?) |
| Pilates en la Pared 2.0 (es) | hotmart 4784921 | `dtl4s1cf` | US$ 7,90 | order-bump | todos | — | order bump no checkout da Calistenia (preço só ali) |
| Protocolo Metabólico 28D (es) | hotmart 7319586 | `ad7ti2nf` | US$ 19 | vigente | todos | <https://pay.hotmart.com/N104738863H?off=ad7ti2nf&checkoutMode=10> | preço de aluna (o mesmo do upsell); comprar com o MESMO e-mail do desafio |
| Pase Completo (todos los desafíos) (es) | hotmart 5734184 | `v4lltj3v` | 7 dias grátis, depois US$ 27 por ano | vigente | todos | <https://pay.hotmart.com/K100401831L?off=v4lltj3v&checkoutMode=10> | cobra no dia 8; cancelar antes = nada cobrado; é a oferta do upsell 2 e do convite do suporte |
| Pase Completo (todos los desafíos) (es) | hotmart 5734184 | `gm2lcusd` | 7 dias grátis, depois US$ 27 por ano | vigente | todos | — | variante do trial (aparece em vendas de 2026); mesmo plano; sem link no suporte |
| Pase Completo (todos los desafíos) (es) | hotmart 5734184 | `peuqcm4o` | mensal (valor: Bruno confirma ?) | descontinuada | todos | — | HOTMART_OFFER_MONTHLY: existe e tem assinantes antigos; o bot não oferece (Bruno 05/11) |
| Pase Completo (todos los desafíos) (es) | hotmart 5734184 | `4wnszk9x` | anual (valor: Bruno confirma ?) | descontinuada | todos | — | HOTMART_OFFER_ANNUAL: existe e tem assinantes antigos; o bot não oferece (Bruno 05/11) |
| RiseMe FIT – Dieta Flexible personalizada (es) | hotmart 6714348 | `cn6j44ww` | US$ 1,99/mês | descontinuada | todos | — | cancelar pelo app (Más → Gestionar suscripción) ou transferir |
| Yoga Facial · Yoga en la Silla · Cuerpo Sexy de Verano · Preparto · Posparto (es) | app | — | — | só pelo Pase | — | — | Desafios do app sem venda avulsa: entram pelo Pase Completo (ou como presente do depoimento). |
| Plan de Bienestar Íntimo (KGF-ES) (es) | hotmart 8806587 | `?` | ? | descontinuada | todos | — | em criação; preencher quando lançar |
| 28-dniowe Wyzwanie Kalisteniczne (CL-PL) (pl) | perfectpay | `PPPBFHGM` | 67 zł | vigente | todos | <https://go.centerpag.com/PPU38CQGNRM> | produto PPPBFHGM; reembolso manual no painel da Perfect Pay |
| Kalistenická výzva 28 dní (CL-CZ) (cs) | hotmart 8735819 | `?` | 17 € | vigente | todos | — | link do funil kalistenika-cz a preencher (?) |
| Sfida di Calistenia 28 giorni (CL-IT) (it) | hotmart 8805538 | `?` | 17 € | vigente | todos | — | link do funil calistenia-it a preencher (?) |
| Provocarea de Calistenie (CL-RO) (ro) | hotmart 8870102 | `?` | ? | vigente | todos | — | a preencher (?) |

## O que o bot de atendimento lê (bloco gerado, idioma es)

```
- Calistenia en Casa (Desafío de 28 Días de Calistenia): 28 dias de treino com o peso do corpo, um vídeo por dia no app, pagamento único e acesso vitalício. Garantia Hotmart: 15 dias.
  Preço normal: US$ 12,90 · VIGENTE · preço normal do funil para todos os países fora dos testes abaixo
  Link oficial (copie exato, sozinho na linha): https://pay.hotmart.com/H101419289G?off=j3m3v9m3&checkoutMode=10&hideBillet=1&hideMultipleCards=1
  Preço normal (US/PR): US$ 19,90 · VIGENTE · EUA e Porto Rico desde 03/11 (T19 venceu); é o A do T30
  Link oficial (US/PR) (copie exato, sozinho na linha): https://pay.hotmart.com/H101419289G?off=yrn1s1q7&checkoutMode=10&hideBillet=1&hideMultipleCards=1
  Preço normal (US/PR): US$ 24,90 · TESTE DE PREÇO (metade das visitantes do país) · T30 (24,90 × 19,90), metade de EUA/PR
  Link oficial (US/PR) (copie exato, sozinho na linha): https://pay.hotmart.com/H101419289G?off=0kk0z0if&checkoutMode=10&hideBillet=1&hideMultipleCards=1
  Preço normal (CO/MX): US$ 14,90 · TESTE DE PREÇO (metade das visitantes do país) · T25 Colômbia (desde 29/10) e T31 México (desde 03/11), metade vê 12,90
  Link oficial (CO/MX) (copie exato, sozinho na linha): https://pay.hotmart.com/H101419289G?off=39kagsh5&checkoutMode=10&hideBillet=1&hideMultipleCards=1
  Quem ainda NÃO comprou este produto (amiga, parente, ela mesma antes da compra) recebe a PÁGINA, não o checkout: https://calistenia.riseme.fitness
  Meios de pagamento: cartão, PayPal, Mercado Pago, PSE, Nequi, Yape e outros meios locais da Hotmart (o boleto fica escondido no link oficial).
- Pilates en la Pared 2.0: 28 dias de pilates na parede, um vídeo por dia no app, pagamento único e acesso vitalício. Vende-se avulso (Bruno, 05/11). Garantia Hotmart: 30 dias.
  Vende-se avulso por US$ 12,90 (há oferta de 14,90), mas o LINK ainda não está cadastrado aqui: diga o preço e transfira com motivo "VENDA — link do Pilates en la Pared 2.0" (a equipe manda o link).
- Protocolo Metabólico 28D: Sistema de chás de 28 dias (um por semana, somado ao anterior), em PDF na aba Extras → Tus productos; complementa o desafio. Garantia Hotmart: 15 dias.
  Preço normal: US$ 19 · VIGENTE · preço de aluna (o mesmo do upsell); comprar com o MESMO e-mail do desafio
  Link oficial (copie exato, sozinho na linha): https://pay.hotmart.com/N104738863H?off=ad7ti2nf&checkoutMode=10
- Pase Completo (todos los desafíos): Assinatura que abre todos os desafios do app (Calistenia, Pilates, Yoga Facial, Yoga en la Silla, Cuerpo Sexy de Verano, Preparto, Posparto e os próximos). Garantia Hotmart: 30 dias.
  Preço normal: 7 dias grátis, depois US$ 27 por ano · VIGENTE · cobra no dia 8; cancelar antes = nada cobrado; é a oferta do upsell 2 e do convite do suporte
  Link oficial (copie exato, sozinho na linha): https://pay.hotmart.com/K100401831L?off=v4lltj3v&checkoutMode=10
- RiseMe FIT – Dieta Flexible personalizada: Order bump antigo (assinatura mensal de US$ 1,99); ainda cobra ~18 assinantes. Não se vende mais. Garantia Hotmart: 30 dias.
  Não se vende por aqui: se ela quiser, diga o que é e que hoje entra pelo Pase Completo; se já paga, cancela pelo app.
- Yoga Facial · Yoga en la Silla · Cuerpo Sexy de Verano · Preparto · Posparto: Desafios do app sem venda avulsa: entram pelo Pase Completo (ou como presente do depoimento).
  Não se vende por aqui: se ela quiser, diga o que é e que hoje entra pelo Pase Completo.
- Plan de Bienestar Íntimo (KGF-ES): Saúde sexual feminina (exercícios de Kegel) no app; oferta em criação, ainda sem criativos nem venda (Bruno 05/11). Não oferecer. Garantia Hotmart: 30 dias.
  Não se vende por aqui: se ela quiser, diga o que é e que hoje entra pelo Pase Completo; se já paga, cancela pelo app.
```
