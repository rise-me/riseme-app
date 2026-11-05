// FILA TÉCNICA — bugs conhecidos com status + diagnóstico padrão (Bruno, 05/11/2026, item 3 do plano do mapa do WhatsApp).
// Levantado das 37 consultas técnicas de outubro (de 152). O bot: (1) reconhece o sintoma aqui, dá o contorno e o status real;
// (2) se não resolver, faz o diagnóstico padrão (uma pergunta por vez) e abre um TICKET (consulta com motivo "TÉCNICO — …"),
// que vai para a fila técnica (scripts/fila-tecnica.ts, atendida pelo chat do riseme), não para a lista das 20h do Bruno.
// Status: 'contorno' (tem solução que a aluna aplica), 'investigando' (conhecido, sem correção ainda: contorno + ticket),
// 'corrigido' (corrigido na data; se persistir, ticket). Quem muda o status é quem corrige no app (este arquivo).

export type StatusBug = 'contorno' | 'investigando' | 'corrigido'

export interface BugConhecido {
  id: string
  sintoma: string // como a aluna descreve (em português, o bot traduz)
  status: StatusBug
  desde: string // DD/MM/AAAA do 1º relato (ou da correção, se corrigido)
  resposta: string // o que dizer a ela: contorno + o que vai acontecer (em português; o bot escreve no idioma dela)
  casos?: string // consultas de origem (não vai para o bot)
}

export const BUGS_CONHECIDOS: BugConhecido[] = [
  {
    id: 'B1',
    sintoma: 'riseme.app abre em branco, "No se puede acceder a este sitio", ou ao digitar e-mail e senha a página volta para o início (quase sempre iPhone, abrindo pelo navegador de dentro do WhatsApp)',
    status: 'contorno',
    desde: '17/10/2026',
    resposta: 'Abrir fora do WhatsApp: iPhone → Safari; Android → Chrome; digitar https://riseme.app e entrar com e-mail e senha. O navegador interno do WhatsApp não guarda o login. Se no Safari/Chrome continuar em branco → ticket (com print e modelo do celular).',
    casos: '#66 #128 #129 #143',
  },
  {
    id: 'B2',
    sintoma: 'vídeo não carrega: "Video no disponible", ícone de página triste, tela preta, fica parado sem avançar',
    status: 'investigando',
    desde: '16/10/2026',
    resposta: 'Fechar e reabrir o app, trocar a conexão (Wi-Fi ↔ dados móveis) e atualizar o navegador. Desde 05/11 o app mostra a tela "El video no cargó" com o botão Reintentar quando o vídeo não carrega: tocar em Reintentar. Se seguir assim, pedir o print dessa tela, o dia do treino e o modelo do celular, abrir ticket e, para aluna em espanhol, dar a playlist do YouTube como plano B para não parar de treinar.',
    casos: '#55 #67 #94 #97 #147',
  },
  {
    id: 'B3',
    sintoma: 'vídeo corta por volta de 7–8 minutos (diz 10 min) ou pula sozinho para o treino do dia seguinte',
    status: 'investigando',
    desde: '16/10/2026',
    resposta: 'Conhecido, em investigação (relatado por alunas em polonês). Contorno: reabrir o vídeo e arrastar até onde parou; o dia conta com 80% assistido. Abrir ticket com o dia do treino, o aparelho e se foi no app instalado ou no navegador.',
    casos: '#54 #65 #72 #78',
  },
  {
    id: 'B4',
    sintoma: 'aba Extras vazia ("Your bonuses will appear here soon" / "Tus bonos aparecerán aquí pronto") mesmo com o Protocolo Metabólico ou bônus liberados',
    status: 'investigando',
    desde: '15/10/2026',
    resposta: 'Más → Idioma → Español, depois fechar e reabrir o app (o texto em inglês indica que o app abriu em outro idioma). Se seguir vazia, ticket com print.',
    casos: '#46 #63',
  },
  {
    id: 'B5',
    sintoma: 'progresso não registra, dia marcado errado, círculo cinza num dia treinado, "HOY" em outro dia',
    status: 'contorno',
    desde: '18/10/2026',
    resposta: 'O dia conta quando 80% do vídeo é assistido DENTRO do app (pela playlist do YouTube não conta). O calendário semanal vira o dia pelo horário universal (na Colômbia/México/Peru por volta das 19h–21h): treino à noite pode cair no dia seguinte; o progresso em si está certo. Se um dia feito no app não apareceu → ticket com a data.',
    casos: '#70 #79 #86 #91',
  },
  {
    id: 'B6',
    sintoma: 'vídeo sem som (Android)',
    status: 'contorno',
    desde: '04/11/2026',
    resposta: 'Em alguns celulares o vídeo começa MUDO e os botões de volume do aparelho não desmutam o player. Desde 05/11 o app mostra um botão branco "Toca aquí para activar el sonido" quando isso acontece: tocar nele uma vez. Sem o botão: tocar no ícone de som do próprio vídeo, tirar o modo silencioso e subir o volume de mídia (não o de toque). Se seguir sem som → ticket com o modelo do celular.',
    casos: '#149',
  },
]

const STATUS_TXT: Record<StatusBug, string> = {
  contorno: 'TEM SOLUÇÃO (aplique o contorno; não é falha nossa pendente)',
  investigando: 'CONHECIDO, EM INVESTIGAÇÃO pela equipe técnica (sem correção ainda)',
  corrigido: 'CORRIGIDO',
}

/** Bloco para o CONHECIMENTO do agente. */
export function blocoBugsConhecidos(): string {
  return BUGS_CONHECIDOS.map((b) => `- ${b.id} · ${b.sintoma} → ${STATUS_TXT[b.status]}${b.status === 'corrigido' ? ` em ${b.desde}` : ''}. ${b.resposta}`).join('\n')
}
