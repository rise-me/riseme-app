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

## Aulas: vídeo único no R2 com um áudio por idioma (decidido 06/10/2026, ainda não iniciado)

**Motivo:** hoje cada idioma é uma cópia inteira do vídeo no Cloudflare Stream, e o Stream ainda
cobra US$ 1 a cada mil minutos assistidos. Com o catálogo da fábrica (80 cursos) isso iria a
~US$ 1.200/mês (5 idiomas) ou ~US$ 2.100/mês (10 idiomas). No R2, com o vídeo guardado uma vez e
um áudio leve por idioma, fica em ~US$ 36–42/mês, e assistir não é cobrado. Pesquisa completa,
com fontes: `docs/pesquisa-video-multiaudio.md`.

**Decisões do Bruno**
- Arquitetura: **Cloudflare R2 + HLS empacotado por nós**, uma playlist por idioma apontando para
  o mesmo vídeo; o app abre a do idioma da conta da aluna (o celular nunca escolhe o áudio).
- A fábrica de dublagem passa a fazer o **cartão de descanso sem texto**, para o vídeo ser igual
  em todos os idiomas.
- **Pré-parto e pós-parto** entram no app já nesse modelo (não sobem no Stream).
- Stream fica só para o que já está lá (Calistenia PL) até a migração; Mux é o plano B.

**Checklist — parte do Bruno (~5 min; bloqueia só a subida para o R2)**
- [ ] Ativar o R2: painel Cloudflare → **R2 Object Storage** → ativar (aceitar os termos). Grátis até 10 GB.
- [ ] Token: **My Profile → API Tokens → Create Custom Token**, nome `riseme-r2`, permissões:
  - `Account` → `Workers R2 Storage` → `Edit`
  - `Account` → `Workers Scripts` → `Edit`
  - `Account` → `Account Analytics` → `Read` (monitor de custo: ler o uso de R2, Workers e Stream)
  - `Zone` → `DNS` → `Edit`, `Zone` → `Workers Routes` → `Edit`, `Zone` → `Cache Rules` → `Edit` (zona `riseme.app`)
- [ ] Colar no `.env.local` do riseme: `CLOUDFLARE_R2_TOKEN=<o token>` (não colar no chat) e avisar "pronto".
- [ ] Quando a aula piloto estiver no ar: abrir o link no iPhone (e num Android) e dizer se tocou no idioma certo.

**Checklist — parte técnica**
- [x] Piloto empacotado (06/10): Calistenia dia 1, vídeo único + áudio EN e PL (vídeo PL = EN quadro a quadro).
      21,9 MB/min de vídeo nas 4 qualidades + 4–7 MB de áudio por idioma. Falta subir no R2.
      Código no ramo `feat/video-r2` (worktree `../riseme-r2`).
- [ ] Testes decisivos: áudio certo no iPhone (Safari e app na tela inicial, iOS 26/27, AirPlay),
      Android (Chrome e Samsung Internet), qualidade e MB reais por minuto, sincronia da dublagem.
- [x] `scripts/package-lesson.py` (empacota; `--add` põe idioma sem recodificar) e
      `scripts/publish-hls.py` (`--setup` cria bucket + porteiro; depois sobe a aula e registra).
- [x] Player (HLS nativo no iPhone, hls.js no resto), regra dos 80% mantida — falta testar no celular.
- [x] Porteiro (`workers/aulas`): passe assinado pelo servidor; testado local (válido 200; vencido,
      de outra aula ou adulterado 403). Falta: publicar (`--setup`) e `HLS_TOKEN_SECRET` no Vercel.
- [x] Fábrica: cartão de descanso sem texto por padrão (06/10).
- [ ] Fábrica: pergunta "publicar no app?" apontando para package-lesson + publish-hls.
- [ ] Subir pré e pós-parto (ES e EN, depois PT) e criar os desafios no app.
- [ ] Migrar Calistenia PL do Stream e, quando houver os originais, ES e TR do YouTube.
- [ ] Conferir o custo real depois de um mês e cancelar o Stream quando nada mais depender dele.

## Outros pendentes já conhecidos
- Tela de assinatura mostra "Starter" para quem cancelou mas ainda está no período pago
  (consulta só `status='active'` em `more/subscription`).
- "Términos de uso" e "Política de privacidad" não abrem nada (login e perfil).
- Reenvio do acesso para as 133 compradoras ES que nunca entraram: devagar, em lotes
  (`scripts/reenviar-acesso.ts`).
- WhatsApp: acompanhamento automático (24h sem entrar / 3 dias sem treinar).
