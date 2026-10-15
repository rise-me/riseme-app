# Checklist — produto novo na Perfect Pay ou na Hotmart (oferta, idioma, upsell ou order bump)

> v2 — 06/10/2026. Motivo: mesma falha na Hotmart — o Pilates en La Pared 2.0, vendido como order bump
> do Desafío de Calistenia, nunca liberava o desafio no app porque o produto do bump não tinha webhook
> para o app. Entrou a seção "Hotmart" no fim.
> v1 — 05/10/2026. Motivo: a CL-PL vendeu durante 1 dia (o de estreia) sem entregar NADA (nem conta, nem
> email, nem WhatsApp) porque o produto não estava no webhook da Perfect Pay nem no
> PERFECTPAY_CHALLENGE_MAP. Nenhum erro aparece: a venda simplesmente não chega.
> Regra: produto só "está no ar" depois da venda real conferida (passo 6 na Perfect Pay, H4 na Hotmart).

## 1. Perfect Pay — produto
- [ ] Criar o produto e anotar o **código** (`PPP…`, em Produtos → Detalhes).

## 2. Perfect Pay — webhook (o que faltou na CL-PL)
- [ ] Ferramentas → Webhooks → o webhook `https://riseme.app/api/perfectpay`
      precisa ter o produto NOVO marcado na lista de produtos.
- [ ] Vale para **cada upsell/downsell** também (são produtos separados).

## 3. Vercel — ligar produto → desafio → idioma
- [ ] `PERFECTPAY_CHALLENGE_MAP` += `CÓDIGO:idDoDesafio:idioma` (ex.: `PPPBFHGM:1:pl`).
      Produto fora do mapa = webhook loga "Produto NÃO MAPEADO" e não cria conta.
- [ ] **Republicar** o app depois de mudar a env (env só vale em deploy novo).

## 4. Idioma novo (só se o idioma ainda não existe no app)
- [ ] App: `i18n/routing.ts` + `messages/<idioma>.json` (o TypeScript aponta o resto:
      email de acesso, WhatsApp de acesso/apoio, rótulos).
- [ ] DDI do país em `lib/phone.ts` (COUNTRY_TO_DDI + LOCALE_TO_DDI) — sem DDI o WhatsApp não sai.
- [ ] Nomes das abas no idioma em `lib/whatsapp-agent/conhecimento.ts`.
- [ ] País no `PAIS_TO_ISO` de `scripts/replay-sales.py`.
- [ ] Aulas no Stream (`scripts/publish-lessons.py`) e, se houver, playlist em `PLAYLIST` (lib/whatsapp-access.ts).

## 5. Vendas que entraram antes de ligar tudo
- [ ] Exportar as vendas aprovadas (.xlsx) e reenviar com `scripts/replay-sales.py`
      (`--only-missing`, simula primeiro, `--delay 90` para não disparar WhatsApp em massa).

## 6. Conferir com venda real (obrigatório)
- [ ] Conta criada com o idioma certo (`user_metadata.locale`).
- [ ] Email de acesso chegou.
- [ ] WhatsApp saiu ~15 min depois (`whatsapp_outbox.sent_at` preenchido, sem `last_error`).

---

# Hotmart (produto, upsell ou order bump)

Na Hotmart o webhook também é **por produto**. Order bump e upsell são produtos separados: a compra
deles gera um evento próprio, e sem webhook para aquele produto o app nunca fica sabendo.

## H1. Hotmart — webhook do produto (o que faltou no bump do Pilates)
- [ ] Ferramentas → Webhook → Cadastrar Webhook, com o produto NOVO selecionado:
      URL `https://riseme.app/api/hotmart`, versão 2.0.0, eventos **Compra aprovada** + **Compra reembolsada**.
- [ ] A URL vai sem `?hottok=`: o app valida o token pelo cabeçalho `x-hotmart-hottok`. Se o Histórico
      mostrar 401, usar a URL com `?hottok=` igual à dos webhooks antigos do app.
- [ ] Anotar o **ID do produto**: aparece no botão de teste da configuração (Ações), em "Produto: … - ID: …".
- [ ] **NÃO clicar em "Enviar teste de configuração"**: ele dispara uma "Compra aprovada" falsa em
      produção e o app cria uma conta fantasma.

## H2. Vercel — ligar produto → desafio
- [ ] `HOTMART_CHALLENGE_MAP` += `ID:idDoDesafio` (ex.: `4784921:2`). Sem idioma: Hotmart = `es` fixo no código.
      Produto fora do mapa = webhook loga "[hotmart] Produto NÃO MAPEADO" e não libera nada.
- [ ] **Republicar** o app depois de mudar a env.

## H3. Mensagem de onboarding
- [ ] Order bump/upsell: nada a fazer. A conta já existe (ou é criada por quem chegar primeiro) e a
      aluna recebe uma única mensagem de acesso.
- [ ] Produto de **front** que não seja a Calistenia: o texto de acesso (email + WhatsApp) hoje dá
      boas-vindas ao "Desafío de Calistenia" para todo mundo — precisa de texto próprio antes de vender.

## H4. Conferir com venda real (obrigatório)
- [ ] Ferramentas → Webhook → Histórico: o evento da venda saiu com resposta 200.
- [ ] O desafio aparece liberado para a aluna (`user_challenges`, `access_type = lifetime`).
- [ ] Vendas anteriores ao webhook: exportar as aprovadas da Hotmart (.csv) e reenviar com
      `scripts/replay-sales.py --platform hotmart --file RELATORIO.csv --product-code ID --only-existing`
      (simula primeiro; `--go` para valer). Quem não tem conta fica de fora: decidir caso a caso.
