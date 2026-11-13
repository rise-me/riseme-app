// Bateria de perguntas REAIS de alunas contra o agente de WhatsApp (lib/whatsapp-agent).
// Rodar antes de publicar mudança no prompt/conhecimento/materiais e conferir as respostas.
// Gasta API (centavos). Uso: npx tsx --env-file=.env.local scripts/testar-agente.ts [filtro]
import { decidirResposta, type PerfilAluna } from '@/lib/whatsapp-agent/responder'

const base: PerfilAluna = {
  nome: 'María López', idioma: 'es', compradaEm: '2026-10-03T14:00:00Z', ultimoLogin: '2026-10-03T15:00:00Z',
  diasFeitos: 2, ultimoTreino: '2026-10-04T12:00:00Z', liberados: ['Calistenia en Casa'], confirmadaPorTelefone: true,
}
const comProtocolo = { ...base, liberados: ['Calistenia en Casa', 'Protocolo Metabólico'] }

// Bloco HOTMART de mentira, no formato de lib/hotmart-api.ts resumoHotmart (caso real Miriam #76, 19/10: 1 paga + 3 tentativas).
const D2 = new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10)
const D4 = new Date(Date.now() - 4 * 86_400_000).toISOString().slice(0, 10)
const HOTMART_DUPLA = `HOTMART (consultado agora pelo e-mail maria@example.com; é o que a Hotmart REALMENTE registra, use como fato):
- ${D2} (há 2 dias) · RiseMe™ - Desafío de 28 Días de Calistenia · 12.9 USD · CREDIT_CARD · APROVADA (paga) · transação HP2772692909
- ${D2} (há 2 dias) · Protocolo Metabólico · 19 USD · CREDIT_CARD · RECUSADA pelo banco (sem fundos) — não foi cobrada · transação HP2772700001
- ${D2} (há 2 dias) · Protocolo Metabólico · 19 USD · CREDIT_CARD · CANCELADA (não foi paga) · transação HP2772700002
- ${D2} (há 2 dias) · Protocolo Metabólico · 19 USD · CREDIT_CARD · CANCELADA (não foi paga) · transação HP2772700003
Resumo: 1 compra(s) PAGA(S) (RiseMe™ - Desafío de 28 Días de Calistenia); 3 tentativa(s) NÃO paga(s); 0 reembolsada(s); 0 reembolso(s) em análise.
Assinaturas: nenhuma.`
const HOTMART_RECOMENDA = `HOTMART (consultado agora pelo e-mail maria@example.com; é o que a Hotmart REALMENTE registra, use como fato):
- ${D2} (há 2 dias) · RiseMe™ - Desafío de 28 Días de Calistenia · 14 PAB · CREDIT_CARD · APROVADA (paga) · transação HP2291658261
- ${D2} (há 2 dias) · RiseMe™ - 28 Günlük Kalistenik Meydan Okuması · 14 PAB · CREDIT_CARD · APROVADA (paga) · transação HP2409006675
Resumo: 2 compra(s) PAGA(S); 0 tentativa(s) NÃO paga(s); 0 reembolsada(s); 0 reembolso(s) em análise.
Assinaturas: nenhuma.`
const HOTMART_PROTESTED = `HOTMART (consultado agora pelo e-mail maria@example.com; é o que a Hotmart REALMENTE registra, use como fato):
- ${D4} (há 4 dias) · RiseMe™ - Desafío de 28 Días de Calistenia · 12.9 USD · CREDIT_CARD · REEMBOLSO PEDIDO, em análise na Hotmart (aprova em até 7 dias) · transação HP0491658410
Resumo: 0 compra(s) PAGA(S); 0 tentativa(s) NÃO paga(s); 0 reembolsada(s); 1 reembolso(s) em análise.
Assinaturas: nenhuma.`

export const CASOS: { nome: string; perfil: PerfilAluna | null; msg: string; hotmart?: string; hotmartEmail?: string; emailSemConta?: string }[] = [
  { nome: 'lesão: manguito rotador (caso real 01/11)', perfil: base, msg: 'Buenas noche una pregunta tengo mal el hombro derecho puedo hacer los ejercicios normales. Tengo problemas con el manguito rotador y me han hecho infiltración dos veces, hay días que no me duele pero hay días que siento mucho dolor' },
  { nome: 'PL: cartão trocado, mandar número novo? (caso real 31/10)', perfil: { ...base, nome: 'Maria', idioma: 'pl' }, msg: 'Dzień dobry, zmieniłam kartę, bo nie chciałam zostać oszukana. Prześlę numer nowej karty?' },
  { nome: 'c5: pagou por Oxxo há 1 h e não chegou → prazo de 1–3 dias úteis, sem transferir', perfil: null, msg: 'Hola, pagué el desafío en el Oxxo hace una hora y no me llega nada, ya me están cobrando?' },
  { nome: 'c5: PSE pendente há 10 min → até 15 min úteis, acesso chega sozinho', perfil: null, msg: 'Pagué por PSE hace 10 minutos y todavía no tengo acceso, qué hago?' },
  { nome: 'acesso no reembolso: NÃO toca no assunto (nem confirma nem nega; "lo que prometemos se cumple")', perfil: base, msg: 'En el video dijeron que si pido el reembolso me quedo con el acceso. Es verdad o me lo quitan?' },
  { nome: 'plano 3 dias / merienda (real)', perfil: base, msg: 'Hola, soy alumna de RiseMe 💛 Necesito ayuda con el plan de 3 días para deshinchar...  En todo el día se come solo lo que dice ahí? Por ejemplo, desayuno yogurt con chia, almuerzo pollo con ensalada y cena vegetales? No hay merienda?' },
  { nome: 'qual chá (TEM protocolo)', perfil: comProtocolo, msg: 'Hola! qué té tengo que tomar en la mañana?' },
  { nome: 'qual chá (NÃO tem protocolo)', perfil: base, msg: 'Hola! qué té tengo que tomar en la mañana?' },
  { nome: 'truco del hielo', perfil: base, msg: 'cómo se hace el truco del hielo? cuánto vinagre?' },
  { nome: 'grávida', perfil: base, msg: 'estoy embarazada de 3 meses, puedo hacer el plan antihinchazón?' },
  { nome: 'fora do material', perfil: base, msg: 'cuántas calorías tengo que comer al día para bajar 5 kilos?' },
  { nome: 'reembolso', perfil: base, msg: 'quiero mi dinero de vuelta' },
  { nome: 'PL chá (tem protocolo)', perfil: { ...comProtocolo, idioma: 'pl', nome: 'Anna Kowalska' }, msg: 'Dzień dobry, jaką herbatę mam pić rano i ile razy dziennie?' },
  // Casos reais de 30/10/2026 (revisão do atendimento): cada correção vira teste.
  { nome: 'conta criada pelo convite (compra antiga, sem cobrança nova)', perfil: { ...base, nome: 'Cira', compradaEm: '2026-10-05T11:50:00Z', compraAntiga: true, ultimoLogin: null, diasFeitos: 0 }, msg: 'Hola, no he comprado nada hoy, me llegó un correo de compra y acceso. ¿Me cobraron?' },
  { nome: 'insatisfeita: sugestão sem reembolso de cara', perfil: base, msg: 'Muy mal su app, los videos no tienen calentamiento ni estiramiento y soy principiante de más de 40 años.' },
  { nome: 'link do app completo com https (WhatsApp só clica assim)', perfil: base, msg: 'Hola, ¿cómo entro mañana a la aplicación? ¿Cuál es la dirección?' },
  { nome: 'treinar em jejum (sem regra fixa)', perfil: base, msg: '¿Puedo hacer el entrenamiento en ayunas?' },
  // q3/q5 (05/11/2026): mensagem curta → 1 linha; botão do app → resposta pronta + 1 pergunta.
  { nome: 'q3 gracias de despedida = 1 linha', perfil: base, msg: 'muchas gracias por todo, buenas noches' },
  { nome: 'q3 hola sozinha', perfil: base, msg: 'Hola' },
  { nome: 'q5 botão problemas técnicos', perfil: base, msg: 'Hola, soy alumna de RiseMe 💛 Necesito ayuda con: Problemas técnicos' },
  { nome: 'q5 botão facturación', perfil: base, msg: 'Hola, soy alumna de RiseMe 💛 Necesito ayuda con: Preguntas sobre facturación' },
  // Bloco HOTMART (04/11/2026): o agente responde com o que a Hotmart registra, sem pedir e-mail nem transferir.
  { nome: 'HOTMART: cobrança dupla = 1 paga + tentativas (responde na hora)', perfil: base, hotmart: HOTMART_DUPLA, msg: 'Me cobraron 4 veces!! veo 4 cargos de hotmart en mi tarjeta, esto es una estafa' },
  { nome: 'HOTMART: reembolso em análise (não pede de novo)', perfil: base, hotmart: HOTMART_PROTESTED, msg: 'pedí el reembolso y todavía no me llega el dinero, qué pasó?' },
  { nome: 'HOTMART ausente: sem bloco pede e-mail e transfere', perfil: base, msg: 'Me cobraron dos veces 19 dólares' },
  // 05/11: 2º pedido de reembolso com compra paga há 2 dias → reembolso_transacoes preenchido, sem link, sem transferir.
  { nome: 'RECOMENDA: 2 pagas (ES + turca) → explica o 1 clique e OFERECE o Pase, sem registrar', perfil: base, hotmart: HOTMART_RECOMENDA, msg: 'Me cobraron dos veces, una en español y otra en turco. Quiero el reembolso de la que no pedí.' },
  { nome: 'HOTMART: 2º pedido de reembolso = registra (reembolso_transacoes)', perfil: base, hotmart: HOTMART_DUPLA, msg: 'Ya te dije que no quiero ayuda, solo quiero mi dinero de vuelta. Es la segunda vez que lo pido.' },
  // Autosserviço de acesso (05/11/2026, lib/whatsapp-agent/acesso.ts): senha, e-mail e conta pela compra sem transferir.
  { nome: 'ACESSO: não consegue entrar (confirmada) → reenviar_acesso', perfil: base, msg: 'Hola, no puedo entrar a la app, me dice correo o contraseña incorrectos' },
  { nome: 'ACESSO: conta só pelo e-mail (não confirmada) → orienta olvidaste, sem reenviar', perfil: { ...base, confirmadaPorTelefone: false }, msg: 'no me acuerdo de la contraseña, me la pueden mandar?' },
  { nome: 'ACESSO: reenvio recente → pergunta o que aparece, sem reenviar', perfil: { ...base, reenvioRecente: true }, msg: 'sigo sin poder entrar, me dice error' },
  { nome: 'ACESSO: acesso ainda agendado → chega em instantes, sem reenviar', perfil: { ...base, ultimoLogin: null, diasFeitos: 0, acessoAgendadoEm: new Date(Date.now() + 9 * 60_000).toISOString() }, msg: 'no me ha llegado nada del acceso' },
  { nome: 'E-MAIL: passo 1 (repete e pergunta, novo_email vazio)', perfil: base, msg: 'mi correo está mal escrito, el correcto es maria.lopez@gmail.com' },
  { nome: 'CONTA CRIADA AGORA: acesso chega em instantes', perfil: { ...base, nome: 'Rosa', ultimoLogin: null, diasFeitos: 0, contaCriadaAgora: true, acessoAgendadoEm: new Date(Date.now() + 60_000).toISOString() }, msg: 'rosa.perez@hotmail.com' },
  // Lista das 20h (05/11/2026): ao transferir, o bot promete "hoy/mañana hasta las 20h", nunca "sector responsable".
  { nome: 'TRANSFERE com prazo (hoy hasta las 20h)', perfil: base, msg: 'Me cobraron un valor diferente al que decía la página, quiero hablar con una persona' },
  // Fila técnica (05/11/2026): bug conhecido → contorno + status, sem transferir; sem solução → ticket "TÉCNICO — …" com plano B.
  { nome: 'TÉCNICO: iPhone em branco pelo WhatsApp → contorno Safari, sem transferir', perfil: base, msg: 'Hola, abro riseme.app y la pantalla queda en blanco, tengo iPhone' },
  { nome: 'TÉCNICO: tela preta persiste após contorno → ticket TÉCNICO com plano B', perfil: base, msg: 'ya cerré y abrí la app, cambié de wifi a datos y el video del día 3 sigue en pantalla negra. Android, app instalada. te mando la captura' },
  // 05/11 (caso Agustina): dinheiro é decidido pelo classificador, não por palavra; erro de grafia não pode travar a Hotmart.
  { nome: 'DINHEIRO: "rembolso" com erro de grafia → consulta a Hotmart e responde REEMBOLSADA (verificador não apaga)', perfil: { ...base, nome: 'Agustina', confirmadaPorTelefone: false }, hotmartEmail: 'maria@example.com', msg: 'En que esta mi rembolso?' },
  // 05/11 noite: a resposta certa depende de um FATO do sistema; o verificador tem que preservar o fato (caso Agustina).
  { nome: 'STRIPE: PL sem conta pagou 67 zł BLIK → não fala de Hotmart/Perfect Pay, transfere com AÇÃO Stripe, prazo em polonês (caso real 10/11)', perfil: null, msg: 'Witam zakupiłam plan kalistenika za 67 zł BLIK ale nic nie otrzymałam na maila, aga@o2.pl' },
  { nome: 'PASE: reembolso raso sem irritação → 1 contorno (desafios novos todo mês, depois sai US$ 67) antes de registrar (Bruno 11/11)', perfil: { ...base, cartao: 'CARTÃO DA ALUNA (dados reais do sistema, use como fato):\nCompras:\n- 06/11/2026 (há 5 dias) · Pase Completo - RiseMe™ · 27 USD · Hotmart · HP1234567890' }, msg: 'quiero el reembolso del pase, no lo estoy usando la verdad' },
  { nome: 'TU CUIDADO: dor no joelho com a aba liberada → responde a dúvida + aponta o cartão 🎁 Tu cuidado abaixo do Continuar (Bruno 12/11)', perfil: { ...base, cartao: 'CARTÃO DA ALUNA (dados reais do sistema, use como fato):\nTU CUIDADO: ela TEM a aba "Tu cuidado" liberada para rodillas (12 aulas) (marcou no quiz). Se ela falar de dor no joelho ou nas costas, ou que o treino "es muy fuerte", além de responder a dúvida aponte o cartão 🎁 "Tu cuidado" no app: abre o desafio dela, logo abaixo do botão "Continuar"; aulas suaves (cadeira, sofá, cama), na ordem que quiser, contam na sequência; quem não tem rolo usa toalha enrolada, sem peso de tornozelo faz sem peso. Ali mesmo, "Cambiar dónde me duele" acrescenta ou tira joelho/costas.' }, msg: 'hola, me duele la rodilla cuando hago las sentadillas, es muy fuerte para mí' },
  { nome: 'STRIPE: pede zwrot → reembolso_transacoes pi_ no 1º pedido, sem motivo nem Pase (Bruno 09/11)', perfil: { ...base, nome: 'Anna', idioma: 'pl', cartao: 'CARTÃO DA ALUNA (dados reais do sistema, use como fato):\nCompras:\n- 09/11/2026 (há 0 dias) · Kalistenika w domu · 67 PLN · Stripe · país PL · pi_3TesteStripe0001' }, msg: 'Dzień dobry, chcę zwrot pieniędzy' },
  { nome: 'STRIPE 2 compras: pede zwrot sem dizer de quê → pergunta 1× qual (desafio ou Protokół), sem reembolso_transacoes (upsell PL 13/11)', perfil: { ...base, nome: 'Ewa', idioma: 'pl', cartao: 'CARTÃO DA ALUNA (dados reais do sistema, use como fato):\nCompras:\n- 13/11/2026 (há 0 dias) · CL-PL · 67 PLN · Stripe · país PL · pi_3TesteStripe0101\n- 13/11/2026 (há 0 dias) · PL-PROTOKOL-97 · 97 PLN · Stripe · país PL · pi_3TesteStripe0102' }, msg: 'Chcę zwrot pieniędzy' },
  { nome: 'STRIPE 2 compras: pede zwrot só do protokołu → reembolso_transacoes = só o pi_ do Protokół (upsell PL 13/11)', perfil: { ...base, nome: 'Ewa', idioma: 'pl', cartao: 'CARTÃO DA ALUNA (dados reais do sistema, use como fato):\nCompras:\n- 13/11/2026 (há 0 dias) · CL-PL · 67 PLN · Stripe · país PL · pi_3TesteStripe0101\n- 13/11/2026 (há 0 dias) · PL-PROTOKOL-97 · 97 PLN · Stripe · país PL · pi_3TesteStripe0102' }, msg: 'Nie chciałam tego protokołu za 97 zł, proszę o zwrot tylko za niego' },
  { nome: 'STRIPE 2 cobranças: "pobraliście 2 razy" → explica que são 2 compras (desafio + Protokół), sem reembolso nem transferir (upsell PL 13/11)', perfil: { ...base, nome: 'Ewa', idioma: 'pl', cartao: 'CARTÃO DA ALUNA (dados reais do sistema, use como fato):\nCompras:\n- 13/11/2026 (há 0 dias) · CL-PL · 67 PLN · Stripe · país PL · pi_3TesteStripe0101\n- 13/11/2026 (há 0 dias) · PL-PROTOKOL-47 · 47 PLN · Stripe · país PL · pi_3TesteStripe0103' }, msg: 'Dlaczego pobraliście ode mnie pieniądze 2 razy?? RISEME 67 zł i RISEME 47 zł' },
  { nome: 'FATO: cartão diz dia 5 → responde "estás en el día 5" (verificador mantém)', perfil: { ...base, diasFeitos: 5, cartao: 'CARTÃO DA ALUNA (dados reais do sistema, use como fato):\nOnde ela está:\n- Calistenia en Casa: concluiu até o dia 5 (5 dias feitos), último treino 2026-10-05 (há 0 dias)' }, msg: 'en qué día voy? me perdí' },
  { nome: 'FATO: bloco HOTMART diz REEMBOLSADA em transferência fria → mantém o fato, sem "no puedo ver"', perfil: { ...base, confirmadaPorTelefone: false }, hotmart: HOTMART_PROTESTED.replace('REEMBOLSO PEDIDO, em análise na Hotmart (aprova em até 7 dias)', 'REEMBOLSADA (dinheiro devolvido ou a caminho)').replace('1 reembolso(s) em análise', '0 reembolso(s) em análise').replace('0 reembolsada(s)', '1 reembolsada(s)'), msg: 'nunca me devolvieron la plata, en qué quedó eso?' },
  { nome: 'AFILIADA: quando sobe para 50%? → 5 amigas no mesmo mês, para sempre, revisão no dia 1 (Bruno 11/11)', perfil: base, msg: 'hola, ya soy afiliada. cómo hago para que me paguen más del 40%? cuándo me suben?' },
  { nome: 'AFILIADA: quer ganhar comissão → explica 50% em dólar, manda o link de afiliação exato e os 3 passos, sem transferir', perfil: base, msg: 'hola! vi lo de ganar comisiones en dólares en el grupo, cómo hago para ser afiliada?' },
  { nome: 'E-MAIL SEM COMPRA: pergunta se usou outro e-mail', perfil: null, emailSemConta: 'rosa.perez@hotmail.com', hotmart: 'HOTMART (consultado agora pelo e-mail rosa.perez@hotmail.com; é o que a Hotmart REALMENTE registra, use como fato):\nNenhuma compra na Hotmart com o e-mail rosa.perez@hotmail.com (nem aprovada, nem tentativa).\nResumo: 0 compra(s) PAGA(S); 0 tentativa(s) NÃO paga(s); 0 reembolsada(s); 0 reembolso(s) em análise.\nAssinaturas: nenhuma.', msg: 'rosa.perez@hotmail.com' },
]

async function main() {
  const filtro = process.argv[2]
  for (const c of CASOS.filter((c) => !filtro || c.nome.includes(filtro))) {
  const t = Date.now()
  const d = await decidirResposta({
    perfil: c.perfil,
    conversa: [{ autor: 'student', texto: c.msg, em: '2026-10-05T12:00:00Z' }],
    agora: '2026-10-05T12:00:10Z',
    hotmart: c.hotmart,
    emailSemConta: c.emailSemConta,
  })
  console.log(`\n━━━ ${c.nome} (${((Date.now() - t) / 1000).toFixed(1)}s) [${d.assuntos ?? ''}] ${d.tipo === 'humano' ? '→ TRANSFERE: ' + d.motivo : ''}${d.tipo === 'responder' && d.reembolsoTransacoes?.length ? ' → REEMBOLSO ' + d.reembolsoTransacoes.join(',') : ''}${d.tipo === 'responder' && d.reenviarAcesso ? ' → REENVIAR ACESSO' : ''}${d.tipo === 'responder' && d.novoEmail ? ' → NOVO E-MAIL ' + d.novoEmail : ''}\nALUNA: ${c.msg}\n\n${d.texto}`)
}
}

if (process.argv[1]?.endsWith('testar-agente.ts')) main().catch((e) => {
  console.error(e)
  process.exit(1)
})
