// ACERVO CIENTÍFICO do atendimento (q10 do mapa do WhatsApp; Bruno 05/11/2026: "respostas confiáveis, pautadas em conhecimento
// verdadeiro, de fontes que valem para qualquer região do planeta"). Trechos curtos, em português (o bot responde no idioma
// dela), cada um com a fonte. Entram na resposta só quando o assunto é treino/conteúdo e o texto dela bate com as tags: o
// bot usa como base e cita a fonte em uma linha. O que NÃO está aqui nem nos materiais continua sendo transferido.
// Regras do produto (descanso diário, reiniciar o desafio, repetições) são do Bruno e moram no CONHECIMENTO, não aqui.
// Revisão: cada trecho tem `revisado` (data em que o Bruno aprovou) — vazio = entrou pela leva inicial do chat (05/11),
// com fonte conferida, aguardando a leitura dele. Versão legível: docs/acervo-cientifico.md (scripts/acervo-md.ts).

export interface Fonte { org: string; titulo: string; ano: number; url?: string }
export interface Trecho {
  id: string
  tema: string
  titulo: string
  pontos: string // o que o bot pode dizer, em 2–5 frases, sem números inventados
  cuidado?: string // quando mandar ao médico / o que NÃO dizer
  fontes: Fonte[]
  tags: string[] // palavras em es/pt (sem acento) que a mensagem dela pode trazer
  revisado?: string // DD/MM/AAAA da aprovação do Bruno
}

export const ACERVO: Trecho[] = [
  // ── Energia, calorias e metabolismo ─────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'cal-01', tema: 'Calorias', titulo: 'O que é uma caloria e o balanço energético',
    pontos: 'Caloria é a unidade de energia dos alimentos. O corpo gasta energia para manter as funções vitais (respirar, bater o coração, manter a temperatura), para digerir e para se mover. Perde-se gordura quando, ao longo das semanas, se gasta mais energia do que se come (déficit); ganha-se quando é o contrário. Não existe alimento que "queime" gordura sozinho: o que decide é o balanço do conjunto.',
    fontes: [
      { org: 'OMS (Organização Mundial da Saúde)', titulo: 'Healthy diet — fact sheet', ano: 2020, url: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet' },
      { org: 'NIH / NIDDK (EUA)', titulo: 'Weight management: energy balance', ano: 2023, url: 'https://www.niddk.nih.gov/health-information/weight-management' },
    ],
    tags: ['caloria', 'calorias', 'kcal', 'deficit', 'balance energetico', 'quemar grasa', 'queimar gordura', 'bajar de peso', 'perder peso', 'adelgazar', 'engordar'],
  },
  {
    id: 'cal-02', tema: 'Calorias', titulo: 'Quantas calorias comer: a regra prática e o cálculo que os nutricionistas usam',
    pontos: 'O gasto diário tem duas partes: o metabolismo basal (o que o corpo gasta parado, 60–70% do total na maioria das pessoas) e a atividade. Nutricionistas estimam o basal com a equação de Mifflin-St Jeor (usa peso, altura, idade e sexo) e multiplicam por um fator de atividade (1,2 sedentária até 1,7 muito ativa) para chegar ao gasto total. Um déficit moderado, de 300 a 500 kcal por dia abaixo desse total, costuma dar 0,25 a 0,5 kg por semana, que é o ritmo considerado sustentável. Para mulheres, abaixo de ~1.200 kcal/dia só com acompanhamento profissional.',
    cuidado: 'Não faça a conta pela aluna como prescrição: dê a ideia e a faixa, e diga que o número exato é com nutricionista, sobretudo se ela tem doença, toma remédio, está grávida ou amamentando.',
    fontes: [
      { org: 'Mifflin MD et al., American Journal of Clinical Nutrition', titulo: 'A new predictive equation for resting energy expenditure in healthy individuals', ano: 1990, url: 'https://doi.org/10.1093/ajcn/51.2.241' },
      { org: 'NIH / NHLBI (EUA)', titulo: 'Aim for a Healthy Weight — calorie guidance', ano: 2022, url: 'https://www.nhlbi.nih.gov/health/educational/lose_wt/eat/calories.htm' },
    ],
    tags: ['cuantas calorias', 'quantas calorias', 'metabolismo basal', 'tmb', 'tasa metabolica', 'gasto calorico', 'mifflin', 'harris', 'nutricionista', 'cuanto debo comer', 'bajar 5 kilos', 'perder kilos'],
  },
  {
    id: 'cal-03', tema: 'Metabolismo', titulo: 'Metabolismo "lento", idade e músculo',
    pontos: 'O metabolismo basal cai pouco com a idade em si; o que mais muda é a perda de massa muscular e a queda da atividade ao longo dos anos. Músculo gasta mais energia em repouso que gordura, e treinar força (inclusive com o peso do corpo) ajuda a manter ou aumentar essa massa. Dietas muito restritivas por muito tempo reduzem o gasto do corpo (adaptação), o que explica o efeito sanfona.',
    fontes: [
      { org: 'Pontzer H et al., Science', titulo: 'Daily energy expenditure through the human life course', ano: 2021, url: 'https://doi.org/10.1126/science.abe5017' },
      { org: 'ACSM (American College of Sports Medicine)', titulo: 'Position stand: progression models in resistance training for healthy adults', ano: 2009, url: 'https://doi.org/10.1249/MSS.0b013e3181915670' },
    ],
    tags: ['metabolismo lento', 'metabolismo', 'edad', 'idade', '40 anos', '40 años', '50 años', 'masa muscular', 'efecto rebote', 'sanfona', 'estancada', 'estanque', 'plateau', 'meseta'],
  },
  {
    id: 'cal-04', tema: 'Balança', titulo: 'Por que o peso oscila de um dia para o outro',
    pontos: 'O peso varia 1 a 2 kg em poucos dias por água, sal, carboidrato guardado nos músculos, ciclo menstrual e intestino, sem que a gordura tenha mudado. Por isso a leitura certa é a tendência de 2 a 4 semanas (ou a média semanal), pesando sempre no mesmo horário e condição. Medidas e fotos mostram mudança que a balança esconde quando se ganha músculo e se perde gordura ao mesmo tempo.',
    fontes: [
      { org: 'Bhutani S et al., Physiological Reports', titulo: 'Composition of two-week change in body weight under unrestricted free-living conditions', ano: 2017, url: 'https://doi.org/10.14814/phy2.13336' },
    ],
    tags: ['balanza', 'bascula', 'balança', 'peso sube', 'subi de peso', 'no bajo', 'no bajo de peso', 'retencion', 'retención de liquidos', 'hinchada', 'inchada', 'medidas'],
  },
  // ── Jejum e horário das refeições ───────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'jej-01', tema: 'Jejum', titulo: 'Treinar em jejum',
    pontos: 'Para mulheres saudáveis, treinar em jejum é seguro em treinos curtos e leves a moderados como os do desafio; o corpo usa mais gordura durante o treino, mas ao fim do dia isso não muda a perda de gordura total, que depende do balanço das 24 horas. O que importa é como ela se sente: se fica tonta, fraca ou enjoada, um lanche leve 30 a 60 minutos antes (fruta, iogurte) resolve. Depois do treino, comer com proteína ajuda a recuperar.',
    cuidado: 'Não recomendar jejum para grávida, lactante, diabética, quem toma remédio para glicose ou tem histórico de distúrbio alimentar: nesses casos, "fale com seu médico".',
    fontes: [
      { org: 'Vieira AF et al., British Journal of Nutrition', titulo: 'Effects of aerobic exercise performed in fasted v. fed state on fat and carbohydrate metabolism in adults: a systematic review and meta-analysis', ano: 2016, url: 'https://doi.org/10.1017/S0007114516003160' },
      { org: 'Schoenfeld BJ et al., Journal of the International Society of Sports Nutrition', titulo: 'Body composition changes associated with fasted versus non-fasted aerobic exercise', ano: 2014, url: 'https://doi.org/10.1186/s12970-014-0054-7' },
    ],
    tags: ['ayunas', 'en ayunas', 'jejum', 'sin desayunar', 'antes de desayunar', 'entrenar sin comer', 'comer antes de entrenar', 'comer despues de entrenar', 'pre entreno', 'post entreno'],
  },
  {
    id: 'jej-02', tema: 'Jejum', titulo: 'Jejum intermitente',
    pontos: 'O jejum intermitente (janelas de 16/8, por exemplo) emagrece porque reduz o total comido; nas revisões, dá resultado parecido com uma dieta normal de mesma quantidade de calorias, nem melhor nem pior. Serve para quem se adapta bem à rotina e não serve para quem passa a compensar comendo demais na janela. Não é obrigatório para emagrecer.',
    cuidado: 'Contraindicado sem acompanhamento em gravidez, lactação, diabetes com medicação e distúrbio alimentar. O app tem a aba Ayuno "Próximamente": não prometa conteúdo.',
    fontes: [
      { org: 'Cochrane (Allaf M et al.)', titulo: 'Intermittent fasting for the prevention of cardiovascular disease', ano: 2021, url: 'https://doi.org/10.1002/14651858.CD013496.pub2' },
      { org: 'Liu D et al., New England Journal of Medicine', titulo: 'Calorie restriction with or without time-restricted eating in weight loss', ano: 2022, url: 'https://doi.org/10.1056/NEJMoa2114833' },
    ],
    tags: ['ayuno', 'ayuno intermitente', 'jejum intermitente', '16/8', 'ventana de alimentacion', 'no cenar', 'saltar el desayuno'],
  },
  // ── Alimentação no emagrecimento ────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'ali-01', tema: 'Alimentação', titulo: 'Proteína: quanto e por quê',
    pontos: 'Quem treina e quer perder gordura sem perder músculo se beneficia de 1,2 a 1,6 g de proteína por kg de peso por dia (uma mulher de 70 kg: 85 a 110 g), distribuída nas refeições: ovos, iogurte, frango, peixe, carne magra, leguminosas. Proteína também dá mais saciedade por caloria. Acima de 2 g/kg não traz ganho extra para esse objetivo.',
    fontes: [
      { org: 'ISSN (International Society of Sports Nutrition), Jäger R et al.', titulo: 'Position stand: protein and exercise', ano: 2017, url: 'https://doi.org/10.1186/s12970-017-0177-8' },
      { org: 'Phillips SM & Van Loon LJ, Journal of Sports Sciences', titulo: 'Dietary protein for athletes: from requirements to optimum adaptation', ano: 2011, url: 'https://doi.org/10.1080/02640414.2011.619204' },
    ],
    tags: ['proteina', 'proteína', 'cuanta proteina', 'huevo', 'pollo', 'whey', 'suplemento', 'saciedad', 'hambre', 'fome', 'masa muscular'],
  },
  {
    id: 'ali-02', tema: 'Alimentação', titulo: 'Água: quanto beber',
    pontos: 'A referência europeia para mulheres adultas é cerca de 2 litros de água por dia no total (contando líquidos e alimentos), mais em calor e em dia de treino. Beber água não "queima" gordura por si, mas ajuda a reduzir fome confundida com sede e a manter o desempenho no treino. Urina clara ao longo do dia é um bom sinal.',
    fontes: [
      { org: 'EFSA (Autoridade Europeia de Segurança Alimentar)', titulo: 'Scientific Opinion on Dietary Reference Values for water', ano: 2010, url: 'https://doi.org/10.2903/j.efsa.2010.1459' },
    ],
    tags: ['agua', 'água', 'cuanta agua', 'litros', 'hidratacion', 'hidratación', 'sed'],
  },
  {
    id: 'ali-03', tema: 'Alimentação', titulo: 'Café e cafeína',
    pontos: 'Até cerca de 400 mg de cafeína por dia (3 a 4 xícaras de café coado) é considerado seguro para adultas saudáveis; na gravidez, o limite é 200 mg. Cafeína antes do treino (30 a 60 min) melhora um pouco o desempenho. Depois do meio da tarde pode prejudicar o sono, e sono ruim atrapalha o emagrecimento.',
    cuidado: 'Regra do produto (CONHECIMENTO): café não substitui os chás do Protocolo.',
    fontes: [
      { org: 'EFSA', titulo: 'Scientific Opinion on the safety of caffeine', ano: 2015, url: 'https://doi.org/10.2903/j.efsa.2015.4102' },
      { org: 'ISSN, Guest NS et al.', titulo: 'Position stand: caffeine and exercise performance', ano: 2021, url: 'https://doi.org/10.1186/s12970-020-00383-4' },
    ],
    tags: ['cafe', 'café', 'cafeina', 'cafeína', 'pre entreno', 'energia', 'sueño', 'dormir'],
  },
  {
    id: 'ali-04', tema: 'Alimentação', titulo: 'Vinagre de maçã, chás e "queimadores": o que a evidência diz',
    pontos: 'Vinagre de maçã e chá verde têm estudos pequenos com efeito modesto (poucas centenas de gramas em semanas) e só ajudam dentro de uma alimentação com déficit; não compensam excesso. Não há "queimador de gordura" natural que funcione sozinho. Pode usar como hábito agradável e sem exagero; o resultado vem do conjunto.',
    cuidado: 'Vinagre: diluído, nunca puro (esmalte dos dentes e estômago). Quem tem gastrite, refluxo ou diabetes com remédio: médico antes.',
    fontes: [
      { org: 'Hursel R et al., International Journal of Obesity', titulo: 'The effects of green tea on weight loss and weight maintenance: a meta-analysis', ano: 2009, url: 'https://doi.org/10.1038/ijo.2009.135' },
      { org: 'Khezri SS et al., Journal of Functional Foods', titulo: 'Beneficial effects of apple cider vinegar on weight management in overweight or obese subjects: a randomized clinical trial', ano: 2018, url: 'https://doi.org/10.1016/j.jff.2018.02.003' },
    ],
    tags: ['vinagre', 'vinagre de manzana', 'te verde', 'té verde', 'quemador', 'quemagrasa', 'termogenico', 'suplemento para adelgazar', 'pastillas'],
  },
  {
    id: 'ali-05', tema: 'Alimentação', titulo: 'Carboidrato à noite e "comer depois das 18h"',
    pontos: 'O horário em si não engorda: o que conta é o total do dia. Comer tarde costuma atrapalhar por outros motivos: porções maiores, pior sono e mais beliscos. Uma refeição leve à noite com proteína e vegetais é compatível com emagrecer.',
    fontes: [
      { org: 'Sofer S et al., Obesity', titulo: 'Greater weight loss and hormonal changes after 6 months diet with carbohydrates eaten mostly at dinner', ano: 2011, url: 'https://doi.org/10.1038/oby.2011.48' },
      { org: 'OMS', titulo: 'Healthy diet — fact sheet', ano: 2020, url: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet' },
    ],
    tags: ['carbohidrato', 'carbohidratos', 'pan', 'arroz', 'de noche', 'por la noche', 'cenar tarde', 'despues de las 6', 'después de las 6', 'comer de noche'],
  },
  // ── Treino: princípios ──────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'tre-01', tema: 'Treino', titulo: 'Quanto exercício por semana e por que o treino de força importa',
    pontos: 'A recomendação para adultas é de 150 a 300 minutos semanais de atividade moderada (ou 75 a 150 vigorosa) mais fortalecimento muscular 2 ou mais dias por semana. Treino com o peso do corpo conta como fortalecimento quando os exercícios são desafiadores. Qualquer quantidade é melhor que nenhuma, e começar leve e crescer aos poucos é o caminho com menos lesão.',
    fontes: [
      { org: 'OMS', titulo: 'WHO guidelines on physical activity and sedentary behaviour', ano: 2020, url: 'https://www.who.int/publications/i/item/9789240015128' },
    ],
    tags: ['cuanto ejercicio', 'cuantas veces', 'por semana', 'todos los dias', 'suficiente', 'calistenia funciona', 'peso corporal', 'sin pesas', 'sin equipo', 'resultados'],
  },
  {
    id: 'tre-02', tema: 'Treino', titulo: 'Progressão: como o corpo muda',
    pontos: 'O corpo se adapta quando o estímulo cresce aos poucos: mais repetições, mais séries, menos descanso, versões mais difíceis do mesmo exercício, melhor técnica e amplitude. Sem progressão, o treino vira manutenção. Força e resistência melhoram em 4 a 8 semanas; mudança visível de composição corporal costuma levar 8 a 12 semanas com alimentação alinhada.',
    cuidado: 'Regra do produto: o desafio tem um nível só; se está fácil, mais repetições e atenção à técnica (CONHECIMENTO).',
    fontes: [
      { org: 'ACSM', titulo: 'Position stand: progression models in resistance training for healthy adults', ano: 2009, url: 'https://doi.org/10.1249/MSS.0b013e3181915670' },
    ],
    tags: ['progresion', 'progresión', 'mas repeticiones', 'más repeticiones', 'series', 'muy facil', 'muy fácil', 'no veo resultados', 'cuando veo resultados', 'cuanto tiempo', 'semanas'],
  },
  {
    id: 'tre-03', tema: 'Treino', titulo: 'Dor muscular depois do treino (DOMS) e quando é lesão',
    pontos: 'Dor muscular que aparece 12 a 48 horas depois de um treino novo e melhora em 2 a 4 dias é normal (dor tardia) e não exige parar: movimento leve, água e sono ajudam. Sinal de lesão é diferente: dor aguda e localizada durante o exercício, inchaço, dor que piora com os dias, dor articular (joelho, ombro, coluna) ou que impede movimentos do dia a dia.',
    cuidado: 'Com sinais de lesão: parar o exercício que dói e procurar avaliação médica; não indicar remédio.',
    fontes: [
      { org: 'Cheung K et al., Sports Medicine', titulo: 'Delayed onset muscle soreness: treatment strategies and performance factors', ano: 2003, url: 'https://doi.org/10.2165/00007256-200333020-00005' },
    ],
    tags: ['dolor muscular', 'agujetas', 'dor muscular', 'me duele', 'me duelen', 'adolorida', 'dolor despues', 'lesion', 'lesión', 'inflamado', 'hinchado'],
  },
  {
    id: 'tre-04', tema: 'Treino', titulo: 'Joelho e coluna: dor ao agachar, prancha, abdominal',
    pontos: 'Dor no joelho em agachamento e afundo costuma vir de amplitude ou alinhamento (joelho caindo para dentro) e melhora reduzindo a amplitude, fortalecendo glúteo e quadril e progredindo devagar. Dor lombar em prancha e abdominal costuma vir de perder a posição neutra da coluna: encurtar o tempo, apoiar os joelhos e manter o abdômen firme ajuda. Versões mais fáceis valem mais que insistir com dor.',
    cuidado: 'Dor que persiste por mais de 2 semanas, dor noturna, formigamento ou perda de força: médico ou fisioterapeuta antes de continuar.',
    fontes: [
      { org: 'Escamilla RF, Medicine & Science in Sports & Exercise', titulo: 'Knee biomechanics of the dynamic squat exercise', ano: 2001, url: 'https://doi.org/10.1097/00005768-200101000-00020' },
      { org: 'McGill SM, Journal of Bodywork and Movement Therapies', titulo: 'Core training: evidence translating to better performance and injury prevention', ano: 2010, url: 'https://doi.org/10.1519/SSC.0b013e3181df4521' },
    ],
    tags: ['rodilla', 'rodillas', 'joelho', 'sentadilla', 'agachamento', 'zancada', 'estocada', 'espalda', 'lumbar', 'columna', 'plancha', 'prancha', 'abdominales', 'cuello', 'pescoço'],
  },
  {
    id: 'tre-05', tema: 'Treino', titulo: 'Aquecimento, alongamento e descanso',
    pontos: 'Aquecer 5 a 10 minutos com movimentos leves parecidos com o treino melhora o desempenho e reduz lesão; alongamento estático longo antes do treino não previne lesão e pode reduzir a força na hora, por isso fica melhor depois ou em dia separado. Músculo cresce no descanso: treinos curtos diários são compatíveis desde que o sono seja bom; sinais de excesso são cansaço que não passa, sono ruim e queda de desempenho.',
    cuidado: 'Regra do produto: aquecimento sempre antes de todo treino; a ideia é treinar todo dia (CONHECIMENTO).',
    fontes: [
      { org: 'Behm DG et al., Applied Physiology, Nutrition, and Metabolism', titulo: 'Acute effects of muscle stretching on physical performance, range of motion, and injury incidence in healthy active individuals: a systematic review', ano: 2016, url: 'https://doi.org/10.1139/apnm-2015-0235' },
      { org: 'Fradkin AJ et al., Journal of Science and Medicine in Sport', titulo: 'Does warming up prevent injury in sport? A systematic review', ano: 2006, url: 'https://doi.org/10.1016/j.jsams.2006.03.026' },
    ],
    tags: ['calentamiento', 'calentar', 'aquecimento', 'estiramiento', 'estirar', 'alongamento', 'descanso', 'dia de descanso', 'sobreentrenamiento', 'cansancio', 'cansada'],
  },
  {
    id: 'tre-06', tema: 'Treino', titulo: '"Perder barriga" fazendo abdominal: a redução localizada',
    pontos: 'Não dá para escolher de onde a gordura sai: exercitar o abdômen fortalece o músculo, mas a gordura da região só diminui com déficit no conjunto. Treino de corpo inteiro gasta mais energia e, junto com alimentação, é o que reduz a barriga ao longo das semanas. Postura e abdômen firme mudam a aparência antes de a gordura cair.',
    fontes: [
      { org: 'Ramírez-Campillo R et al., Journal of Strength and Conditioning Research', titulo: 'Regional fat changes induced by localized muscle endurance resistance training', ano: 2013, url: 'https://doi.org/10.1519/JSC.0b013e31827e8681' },
    ],
    tags: ['barriga', 'abdomen', 'abdómen', 'panza', 'bajar la panza', 'perder barriga', 'abdominales', 'cintura', 'localizada', 'brazos flacidos', 'flacidez'],
  },
  {
    id: 'tre-07', tema: 'Treino', titulo: 'Músculo "grande demais": por que mulheres não ficam volumosas com calistenia',
    pontos: 'Ganhar muito volume muscular exige anos de treino pesado, muita comida e, nas mulheres, a testosterona é cerca de 10 a 20 vezes menor que nos homens. Treino com o peso do corpo e dieta de emagrecimento deixa o corpo mais firme e definido, não "grande".',
    fontes: [
      { org: 'Handelsman DJ et al., Endocrine Reviews', titulo: 'Circulating testosterone as the hormonal basis of sex differences in athletic performance', ano: 2018, url: 'https://doi.org/10.1210/er.2018-00020' },
    ],
    tags: ['musculosa', 'muy grande', 'volumen', 'tonificar', 'tonificada', 'firme', 'definir', 'marcada'],
  },
  // ── Fases da vida da mulher ─────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'mul-01', tema: 'Gravidez', titulo: 'Exercício na gravidez',
    pontos: 'Para gravidez sem complicações, a recomendação é manter atividade moderada, cerca de 150 minutos por semana, incluindo fortalecimento, com ajustes: evitar deitar de costas por muito tempo depois do 1º trimestre, evitar saltos de impacto, exercícios com risco de queda e calor excessivo; parar se houver sangramento, tontura, falta de ar antes do esforço, dor no peito ou contrações. Quem não treinava pode começar leve.',
    cuidado: 'Sempre com liberação do médico que a acompanha; o desafio de calistenia não foi desenhado para gestantes (no app há o Preparto, pelo Pase). Nunca prescrever.',
    fontes: [
      { org: 'ACOG (American College of Obstetricians and Gynecologists)', titulo: 'Committee Opinion No. 804: Physical activity and exercise during pregnancy and the postpartum period', ano: 2020, url: 'https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2020/04/physical-activity-and-exercise-during-pregnancy-and-the-postpartum-period' },
      { org: 'OMS', titulo: 'WHO guidelines on physical activity and sedentary behaviour (pregnancy section)', ano: 2020, url: 'https://www.who.int/publications/i/item/9789240015128' },
    ],
    tags: ['embarazada', 'embarazo', 'gravida', 'grávida', 'gestante', 'semanas de embarazo', 'trimestre'],
  },
  {
    id: 'mul-02', tema: 'Pós-parto', titulo: 'Voltar a treinar depois do parto',
    pontos: 'Depois de um parto normal sem complicações, atividade leve (caminhada, respiração, assoalho pélvico) pode começar em dias; exercícios abdominais e de impacto voltam aos poucos, em geral depois da consulta de 6 semanas e com atenção à diástase (separação dos retos) e à incontinência. Cesárea pede mais tempo e liberação médica. A amamentação não é impedida pelo exercício moderado.',
    cuidado: 'Diástase, incontinência ou dor pélvica: fisioterapeuta pélvica antes de abdominais e saltos. No app, o Posparto (pelo Pase) é o desenhado para essa fase.',
    fontes: [
      { org: 'ACOG', titulo: 'Committee Opinion No. 804 (postpartum section)', ano: 2020, url: 'https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2020/04/physical-activity-and-exercise-during-pregnancy-and-the-postpartum-period' },
      { org: 'Evenson KR et al., Obstetrical & Gynecological Survey', titulo: 'Summary of international guidelines for physical activity after pregnancy', ano: 2014, url: 'https://doi.org/10.1097/OGX.0000000000000077' },
    ],
    tags: ['posparto', 'pos parto', 'postparto', 'pós-parto', 'cesarea', 'cesárea', 'diastasis', 'diástase', 'lactancia', 'amamantando', 'amamentando', 'recien parida', 'bebe'],
  },
  {
    id: 'mul-03', tema: 'Menopausa', titulo: 'Treino e peso depois dos 40 e na menopausa',
    pontos: 'Na transição da menopausa a queda do estrogênio favorece ganho de gordura abdominal e perda de músculo e osso. O que mais ajuda, pela evidência: treino de força 2 a 3 vezes por semana (peso do corpo conta), proteína suficiente, sono e atividade diária. Emagrecer é possível, só costuma ser mais lento; medidas e força são melhores indicadores que a balança.',
    cuidado: 'Ondas de calor fortes, sangramento irregular ou sintomas que atrapalham a vida: ginecologista. Não opinar sobre reposição hormonal.',
    fontes: [
      { org: 'NAMS (The Menopause Society)', titulo: 'The 2022 Hormone Therapy Position Statement (lifestyle section)', ano: 2022, url: 'https://doi.org/10.1097/GME.0000000000002028' },
      { org: 'Mishra N et al., Journal of Mid-life Health', titulo: 'Exercise beyond menopause: dos and don\'ts', ano: 2011, url: 'https://doi.org/10.4103/0976-7800.92524' },
    ],
    tags: ['menopausia', 'menopausa', 'premenopausia', 'perimenopausia', 'climaterio', 'sofocos', '45 años', '50 años', '55 años', 'hormonas', 'estrogeno'],
  },
  {
    id: 'mul-04', tema: 'Ciclo menstrual', titulo: 'Treinar durante a menstruação e o ciclo',
    pontos: 'Pode treinar em qualquer fase do ciclo; exercício leve a moderado costuma aliviar cólica e humor. Nos dias antes da menstruação é normal reter líquido (peso sobe 1 a 2 kg) e sentir menos disposição: vale reduzir a intensidade sem parar. Ausência de menstruação por mais de 3 meses em quem treina e come pouco é sinal para procurar médico.',
    fontes: [
      { org: 'McNulty KL et al., Sports Medicine', titulo: 'The effects of menstrual cycle phase on exercise performance in eumenorrheic women: a systematic review and meta-analysis', ano: 2020, url: 'https://doi.org/10.1007/s40279-020-01319-3' },
    ],
    tags: ['menstruacion', 'menstruación', 'regla', 'periodo', 'período', 'colicos', 'cólicos', 'ciclo', 'sindrome premenstrual', 'spm', 'ovulacion'],
  },
  // ── Sono e estresse ─────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'son-01', tema: 'Sono', titulo: 'Sono e emagrecimento',
    pontos: 'Dormir menos de 7 horas aumenta a fome (grelina), reduz a saciedade (leptina) e faz o corpo perder mais músculo e menos gordura numa dieta. A meta para adultas é 7 a 9 horas. Horário regular, quarto escuro e menos tela e cafeína à noite ajudam mais que qualquer suplemento.',
    fontes: [
      { org: 'Nedeltcheva AV et al., Annals of Internal Medicine', titulo: 'Insufficient sleep undermines dietary efforts to reduce adiposity', ano: 2010, url: 'https://doi.org/10.7326/0003-4819-153-7-201010050-00006' },
      { org: 'AASM / Sleep Research Society', titulo: 'Recommended amount of sleep for a healthy adult: a joint consensus statement', ano: 2015, url: 'https://doi.org/10.5665/sleep.4716' },
    ],
    tags: ['sueño', 'dormir', 'duermo mal', 'insomnio', 'cansancio', 'sono', 'estres', 'estrés', 'cortisol', 'ansiedad'],
  },
]

// ─── Busca simples por tags (sem IA): normaliza acentos e pontua por tag encontrada ──────────────────────────────────────
const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Trechos mais relevantes para o texto (últimas mensagens dela). Vazio = nada bate. */
export function buscarAcervo(texto: string, max = 3): Trecho[] {
  const t = ` ${norm(texto)} `
  return ACERVO.map((tr) => ({ tr, n: tr.tags.filter((tag) => t.includes(norm(tag))).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, max)
    .map((x) => x.tr)
}

/** Bloco para a resposta: trechos + fontes, com a regra de uso. */
export function blocoAcervo(trechos: Trecho[]): string {
  if (!trechos.length) return ''
  return [
    'ACERVO CIENTÍFICO (trechos que batem com a dúvida dela; fonte conferida). Use como base da resposta, no idioma dela, em',
    'blocos curtos; cite a fonte em uma linha simples ("según la OMS…", "un estudio en el British Journal of Nutrition…"), sem',
    'link. Respeite o "cuidado" (quando mandar ao médico). Regras do produto (descanso, repetições, reiniciar) vêm do',
    'CONHECIMENTO e valem acima do acervo. O que não está aqui nem nos materiais: transfira.',
    ...trechos.map((tr) => `- [${tr.id}] ${tr.titulo}: ${tr.pontos}${tr.cuidado ? ` CUIDADO: ${tr.cuidado}` : ''} FONTES: ${tr.fontes.map((f) => `${f.org}, "${f.titulo}" (${f.ano})`).join('; ')}.`),
  ].join('\n')
}
