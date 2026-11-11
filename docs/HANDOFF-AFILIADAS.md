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

- Funil de upsell na oferta `a6ybtkbv`: handoff `~/Ferramentas/modelador-funis/HANDOFF-FUNIL-AFILIADAS.md` (o funil ativo 286612 não mostra os detalhes sem desativar).
## Feito em 10/11
- Passo a passo feito com a conta de teste do Bruno (brunosouzamart7, idioma da conta trocado para ES): afiliação INSTANTÂNEA, sem cadastro extra nessa conta (outra conta dele, com cadastro incompleto, mostrou 'Complete seu cadastro' antes do botão: o PDF cobre). Depois de afiliar, a Hotmart cai em 'Links de divulgación' com 'Página de Ventas' (go.hotmart.com/…) e 'Página de Producto' (?dp=1); NÃO há link de 'Página de pagamento' para afiliada.
- Sem página externa, o link da afiliada caía no MARKETPLACE da Hotmart (título '(Amigas)', 'Ir al carrito', preço convertido, outros produtos nossos). Corrigido: página de vendas do produto = `https://riseme.app/api/amigas` (app/api/amigas/route.ts, commit 18b971d) → 302 para `pay.hotmart.com/J108410690N?off=a6ybtkbv&checkoutMode=10` levando os parâmetros. Conferido por curl: go.hotmart.com/E108438052K → checkout com `ref=E108438052K`.
- Rótulos reais da Hotmart em ES: 'Ingresa para afiliarte', 'He olvidado mi contraseña' (NÃO 'Olvidé'), 'Afiliarse Ahora', 'Página de Ventas' → 'Copiar link', Productos → Mis productos → 'Soy Afiliado(a)', Cartera → Saldo / 'Retiros de dinero'.
- GUIA PDF (ES, 9 págs.) NO AR: https://riseme.app/guias/afiliadas-es.pdf (fonte `materiais/guia-afiliada/es.html`, prints `materiais/guia-afiliada/img/` com nome/e-mail/foto/código BORRADOS, script `prepara_prints.py`; commit 12216c2). Bruno revisa → com o ok, o link vai ao dono do bot (LINK_GUIA_AFILIADA_ES + rótulo 'He olvidado mi contraseña').
- A conta de teste (brunosouzamart7) ficou AFILIADA ao 8926725 (código E108438052K) e com idioma ES. Não vale como venda de teste de afiliada sem o Bruno decidir.

## Decidido pelo Bruno em 11/11 — comissão em degraus
- Base 40% (até US$ 5,17), "para poder premiar alunas com a narrativa de que você pode chegar até 50%… ou um pouquinho mais".
- 5 amigas no mesmo mês (mês do calendário, sem reembolso) → 50% (US$ 6,46); 15 no mês → 55% (US$ 7,10). Quem sobe FICA para sempre.
- Aplicação: à mão na Hotmart (Programa de afiliados → Lista de afiliados → ⋮ → "Editar comissão"); conferência todo dia 1º. Fonte dos números: `lib/afiliadas.ts` (COMISSAO_ES, DEGRAUS_AFILIADA_ES).
- Feito 11/11 (8490922): comissão do produto = 40% (a Hotmart aplica a partir de 14/11; redução leva 3 dias), texto da página de afiliação com os degraus, guia PDF com o bloco "Sube de nivel" (valor por venda borrado nos prints), dono do bot avisado (ele põe os degraus na regra AFILIADA).

## Falta (atualizado 10/11)
- FEITO 11/11: Bruno 'tá tudo certo'; link do PDF + rótulo 'He olvidado mi contraseña' enviados ao [Arquiteto dos Fluxos no WhatsAPp] e NO BOT (dfa2281, testado no servidor).
- Dash: ligar o produto 8926725 ao funil CL-ES depois da 1ª venda (o produto chega pelo webhook) → dashboard-lucro.
- Post no grupo (texto para o Bruno aprovar) + linha no MAPA-TESTES (critério proposto, falta ok).
- BOT TEM DONO ÚNICO desde 09/11 (riseme/CLAUDE.md, "Dono do bot"): o chat [Arquiteto dos Fluxos no WhatsAPp]. A regra AFILIADA (já no ar, 8f4ce82) passou para ele em 09/11; link do PDF guia e post no grupo vão POR ELE.
- H4: 1ª venda real conferida (acesso no app + webhook 200).

## 🚨 11/11 — afiliação travada fora do Brasil (achado pelo dono do bot)
- 1º caso real: Llilda (Peru, WhatsApp final 897), logo depois do post no grupo. A página de afiliação mostra: "Solamente Afiliados que residen en Brasil y tienen dirección fiscal en el país pueden afiliarse a este producto."
- Causa provável: o produto 8926725 está na conta de produtor BRASILEIRA do Bruno; pela regra do Banco Central que a Hotmart aplica, produtor brasileiro só aceita afiliado residente no Brasil. Respostas do suporte da Hotmart (Reclame Aqui) dizem que afiliado estrangeiro consegue se afiliar quando o PRODUTOR é estrangeiro.
- Caminho em análise (Bruno 11/11): conta de produtor da Hotmart em nome da LLC (RiseMe & CO LLC) → recriar o produto "Amigas" lá (mesmo conteúdo, 40% + degraus, afiliação de 1 clique, fora do mercado) → webhook do app + HOTMART_CHALLENGE_MAP com o ID novo → trocar LINK_AFILIACAO_ES / PRODUTO_AFILIADAS_ES em lib/afiliadas.ts (avisar o dono do bot) → refazer o guia PDF com o link novo. Bruno perguntou à gerente de contas da Hotmart antes; a conta da LLC quem cria é ele.
- Enquanto isso: o bot explica a trava quando a aluna mostra o aviso e oferece a indicação (1 mês de Pase).

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
