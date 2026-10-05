# Checklist — produto novo na Perfect Pay (oferta, idioma ou upsell)

> v1 — 05/10/2026. Motivo: a CL-PL vendeu por dias sem entregar NADA (nem conta, nem
> email, nem WhatsApp) porque o produto não estava no webhook da Perfect Pay nem no
> PERFECTPAY_CHALLENGE_MAP. Nenhum erro aparece: a venda simplesmente não chega.
> Regra: produto só "está no ar" depois do passo 6 (venda real conferida).

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
