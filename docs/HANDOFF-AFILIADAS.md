# Handoff: programa de alunas afiliadas (piloto) — 09/11/2026

Pedido do Bruno (09/11): alunas divulgam o desafio para amigas e ganham comissão em dólar. Piloto direto, sem enquete antes.
O chat que executa é aberto pelo Bruno; ele aprova cada passo que mexe na Hotmart.

## Decidido
- Produto SEPARADO na Hotmart, só para afiliadas: mesmo conteúdo da Calistenia ES (produto 6087092), outro ID. Motivo: venda de afiliada não se mistura com a de anúncio no dashboard e nenhuma afiliada ganha comissão de venda que o anúncio trouxe.
- Programa de afiliados desse produto com afiliação AUTOMÁTICA (sem aprovação manual).
- Tutorial em PDF passo a passo, bonito, identidade preta e branca da RiseMe (a mesma dos PDFs da área de membros), com prints de cada tela da Hotmart, quadrado vermelho + seta onde clicar, links clicáveis. No fim, a aluna tem o próprio link.
- Divulgação do programa no grupo "Comunidad RiseMe World™" (só admins postam). ENQUETE já postada em 09/11 pelo chat do suporte ("¿Te gustaría ganar comisiones en dólares…?"): usar os votos como lista de interessadas; postar no grupo = outbox kind `grupo`, groupId 120363404724925989-group.

## Fatos levantados (09/11)
- A API pública da Hotmart NÃO cria afiliação nem gera hotlink: a aluna se afilia pelo link do produto. A Hotmart rastreia, paga a comissão e desconta reembolso.
- Toda compradora JÁ TEM conta Hotmart (criada na compra, com o e-mail da compra; Bruno 09/11). O PDF parte daí: entrar com esse e-mail (ou "esqueci a senha" se nunca definiu), afiliar-se e pegar o link.
- Atrito que sobra: completar o cadastro para receber (dados e conta para saque). Conferir no passo a passo se a Hotmart pede isso antes de afiliar ou só no primeiro saque.

## Decidido pelo Bruno (09/11, chat de execução)
- Destino do link: CHECKOUT DIRETO do produto novo. A página CL-ES não serve, porque os botões dela levam ao 6087092 e a afiliada perderia a venda.
- Preço: US$ 14,90.
- Comissão: 50%, só no front. O mesmo Funil de Vendas de upsell/downsell da CL-ES é ligado na oferta nova, e o upsell fica 100% com a RiseMe (os produtos de upsell não têm afiliação).
- A indicação do app (src=ind-…, Pase + dieta) CONVIVE com o programa de afiliadas.
- Idioma: só ES no piloto.

## Feito em 09/11 (chat de execução)
- Hotmart: produto **8926725** "RiseMe™ - Desafío de 28 Días de Calistenia (Amigas)", ACTIVE (aprovado pela Hotmart no mesmo dia), US$ 14,90 à vista, oferta `a6ybtkbv`, checkout `https://pay.hotmart.com/J108410690N`, garantia 15 dias, ESS / sem conteúdo educacional (igual ao 6087092), área de membros "RiseMe™ - Fitness & Health".
- Conteúdo na Hotmart (Bruno 09/11: "dentro da Hotmart a gente nem foca, temos o app"): só 1 módulo "Tu acceso a la app RiseMe" com a aula "Cómo entrar en la app RiseMe (empieza aquí)" + PDF `materiais/pristup-do-aplikace/es.html` (versão ES do PDF de acesso da CZ/IT, textos do app real, assinado Adriana Sánchez). As aulas NÃO foram copiadas.
- Programa de afiliados: afiliação de 1 clique, 50% (Hotmart mostra "até US$ 6,46 por venda"), último clique, cookie eterno, FORA do mercado da Hotmart (só entra quem tem o link), texto de apresentação em ES com regras (sem anúncio pago, sem perfil/página com o nome RiseMe, reembolso não comissiona). "Afiliação Global" ligada, mas sem efeito: os outros produtos não têm programa.
- Link de afiliação (página de recrutamento): `https://affiliate.hotmart.com/affiliate-recruiting/view/4565R108410711`.
- A página do produto ficou a do Marketplace da Hotmart (descrição + botão comprar). A Hotmart NÃO aceita `pay.hotmart.com` como página externa. A afiliada copia no painel dela o link da "Página de pagamento" (vai direto ao checkout com o código dela). Conferir isso nos prints do passo 4.
- H1: webhook "[App RiseMe] Envio de Acesso CL-ES Amigas" → `https://riseme.app/api/hotmart`, 2.0.0, Compra aprovada + Compra reembolsada, só o 8926725 (teste NÃO enviado). O webhook "[Dash]" já cobre "Todos os produtos". O webhook de RECUPERAÇÃO ficou de fora de propósito (mandaria o link da oferta do anúncio e roubaria a venda da afiliada).
- H2: `HOTMART_CHALLENGE_MAP` += `8926725:1` em Production (Bruno autorizou; a Vercel passou a mostrar como Sensitive, valor não legível). Vale no deploy seguinte ao commit do bot.
- Bot: regra "AFILIADA" em `lib/whatsapp-agent/conhecimento.ts` (seção Vendas), dados em `lib/afiliadas.ts`, assunto `venda` reconhece afiliad/comisión/ganar dinero, caso na bateria (`scripts/testar-agente.ts`).

## Falta
- Funil de upsell na oferta `a6ybtkbv`: handoff `~/Ferramentas/modelador-funis/HANDOFF-FUNIL-AFILIADAS.md` (o funil ativo 286612 não mostra os detalhes sem desativar).
- Passo 4 (prints do lado da aluna): precisa de uma conta Hotmart que NÃO seja a produtora (a do Bruno não se afilia ao próprio produto). O Claude não cria conta. Bruno loga uma conta de compradora no Chrome (ex.: a de teste da esposa) → o chat faz o passo a passo e os prints → PDF → `LINK_GUIA_AFILIADA_ES` em `lib/afiliadas.ts`.
- Dash: ligar o produto 8926725 ao funil CL-ES depois da 1ª venda (o produto chega pelo webhook) → dashboard-lucro.
- Post no grupo (texto para o Bruno aprovar) + linha no MAPA-TESTES (critério proposto, falta ok).
- H4: 1ª venda real conferida (acesso no app + webhook 200).

## Ordem sugerida (original)
1. Criar o produto na Hotmart pelo Chrome (Bruno logado), copiando a Calistenia ES; ofertas; programa de afiliados automático.
2. Checklist de produto novo: `docs/checklist-novo-produto.md` seções H1–H4 (webhook `https://riseme.app/api/hotmart` no produto novo + `ID:1` no `HOTMART_CHALLENGE_MAP` da Vercel + conferir uma venda real). Sem isso a compradora não recebe acesso.
3. Dashboard: produto novo no funil CL-ES (pedir ao chat dashboard-lucro; ele é dono do formato).
4. Fazer o passo a passo como uma aluna (conta de teste), tirando print de cada tela.
5. PDF: HTML → PDF com `scripts/render-material.mjs` (confere estouro de página); se for para a área de membros, `scripts/publish-material.py`.
6. Bot de suporte: regra "como virar afiliada" no `lib/whatsapp-agent/conhecimento.ts` + link do PDF.
7. Post no grupo (texto aprovado pelo Bruno) e teste no `~/.claude/MAPA-TESTES.md` com critério escrito antes (ex.: afiliadas ativas e vendas em 14 dias).

## Referências
- Indicação que já existe (aluna ganha 1 mês de Pase, amiga uma dieta): `lib/whatsapp-agent/indicacao.ts`, `lib/indicacao-link.ts`. Decidir se convive ou é substituída.
- Regras do chip: nada de envio em massa a alunas sem ok do Bruno.
