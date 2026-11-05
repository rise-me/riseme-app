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
    tags: ['balanza', 'bascula', 'báscula', 'balança', 'peso sube', 'subi de peso', 'subí de peso', 'no bajo', 'no bajo de peso', 'sin bajar', 'peso igual', 'retencion', 'retención de liquidos', 'hinchada', 'inchada', 'medidas'],
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

  // ══ NÍVEL 2 — o "como fazer" (Bruno 05/11: "aprofundar agora custa menos que remendar toda semana") ═══════════════════
  // ── Joelho, quadril e amplitude ─────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'joe-02', tema: 'Joelho', titulo: 'Como ganhar amplitude e alinhamento no agachamento (exercícios)',
    pontos: 'Amplitude se ganha aos poucos, sem dor: (1) agachar até uma cadeira ou caixa e levantar, descendo um pouco mais a cada semana; (2) agachar segurando num apoio (porta, mesa) para controlar a descida; (3) ponte de glúteo (deitada, pés no chão, subir o quadril) 2–3 séries de 12–15 para fortalecer glúteo e proteger o joelho; (4) "concha" deitada de lado (joelhos dobrados, abrir o joelho de cima) 2 séries de 15 por lado para o quadril, que é o que impede o joelho de cair para dentro; (5) alongar panturrilha e flexores do quadril 30–60 s depois do treino, porque tornozelo e quadril rígidos limitam o agachamento. Dica de execução: pés na largura do quadril, peso nos calcanhares, joelho apontando para a ponta do pé, descer só até onde não dói.',
    cuidado: 'Dor aguda, inchaço, estalo com dor ou joelho que "trava": parar e avaliar com médico/fisioterapeuta.',
    fontes: [
      { org: 'Powers CM, Journal of Orthopaedic & Sports Physical Therapy', titulo: 'The influence of abnormal hip mechanics on knee injury: a biomechanical perspective', ano: 2010, url: 'https://doi.org/10.2519/jospt.2010.3337' },
      { org: 'Crossley KM et al., British Journal of Sports Medicine', titulo: 'Patellofemoral pain consensus statement (exercise and physical interventions)', ano: 2016, url: 'https://doi.org/10.1136/bjsports-2016-096268' },
    ],
    tags: ['amplitud', 'amplitude', 'rango de movimiento', 'movilidad', 'mobilidade', 'rodilla hacia adentro', 'bajar mas', 'no puedo bajar', 'sentadilla profunda', 'cadera', 'quadril', 'gluteo', 'glúteo', 'puente', 'ponte', 'tobillo'],
  },
  {
    id: 'cos-02', tema: 'Coluna', titulo: 'Como fortalecer o core sem dor lombar (progressões)',
    pontos: 'Ordem segura para o abdômen e a lombar: (1) "inseto morto" (deitada, braços e pernas para cima, estender braço e perna opostos devagar, lombar encostada no chão) 2 séries de 8 por lado; (2) "cachorro-pássaro" (quatro apoios, estender braço e perna opostos, sem girar o tronco) 2 séries de 8 por lado; (3) prancha com joelhos no chão, 3 séries de 15–30 s, só então a prancha completa, aumentando 5–10 s por semana; (4) ponte de glúteo. Regra de ouro: coluna neutra (nem arqueada, nem arredondada), abdômen firme como se fosse levar um soco, respirar. Abdominais tradicionais com a lombar arqueando e pernas esticadas são os que mais dão dor; versões curtas e lentas rendem mais.',
    cuidado: 'Dor que desce para a perna, formigamento, fraqueza ou dor noturna: médico antes de continuar.',
    fontes: [
      { org: 'McGill SM, Strength & Conditioning Journal', titulo: 'Core training: evidence translating to better performance and injury prevention', ano: 2010, url: 'https://doi.org/10.1519/SSC.0b013e3181df4521' },
      { org: 'Owen PJ et al., British Journal of Sports Medicine', titulo: 'Which specific modes of exercise training are most effective for treating low back pain? Network meta-analysis', ano: 2020, url: 'https://doi.org/10.1136/bjsports-2019-100886' },
    ],
    tags: ['core', 'abdomen', 'lumbar', 'lombar', 'espalda baja', 'plancha', 'prancha', 'bird dog', 'dead bug', 'columna neutra', 'postura', 'hernia'],
  },
  {
    id: 'omb-01', tema: 'Ombro e punho', titulo: 'Flexão de braço: dor no punho ou no ombro e como progredir',
    pontos: 'Dor no punho na flexão costuma ser falta de mobilidade: apoiar as mãos em halteres fixos ou nos punhos fechados (punho reto), ou elevar as mãos num degrau, resolve na maioria. Dor no ombro costuma vir de cotovelos muito abertos: cotovelos a uns 45° do corpo, mãos um pouco mais largas que os ombros, omoplatas firmes. Progressão: flexão na parede → mãos no sofá ou mesa → joelhos no chão → completa → pés elevados. Trocar de nível quando fizer 12–15 repetições limpas.',
    cuidado: 'Dor no ombro ao levantar o braço no dia a dia, ou que acorda à noite: médico.',
    fontes: [
      { org: 'ACSM', titulo: 'Position stand: progression models in resistance training for healthy adults', ano: 2009, url: 'https://doi.org/10.1249/MSS.0b013e3181915670' },
    ],
    tags: ['flexiones', 'flexion', 'lagartijas', 'push up', 'muñeca', 'muñecas', 'punho', 'hombro', 'hombros', 'ombro', 'codos', 'no puedo hacer flexiones'],
  },
  {
    id: 'pro-02', tema: 'Treino', titulo: 'Escada de progressão dos exercícios do desafio',
    pontos: 'Quando um exercício está fácil ou difícil demais, muda-se a versão, não o treino: agachamento (até a cadeira → livre → com pausa de 2 s embaixo → afundo → agachamento búlgaro com pé atrás no sofá); flexão (parede → inclinada → joelhos → completa); prancha (joelhos → completa → com toque no ombro); ponte de glúteo (duas pernas → uma perna); abdominal (inseto morto → elevação de pernas dobradas → prancha lateral). Regra: ficar numa versão até 12–15 repetições limpas (ou 30–45 s na prancha) e então subir um degrau. Fazer "até a falha" todo dia não é necessário; 1–3 repetições de reserva já estimulam.',
    cuidado: 'Regra do produto: o desafio tem um nível; aqui estão as variações para adaptar, sem pular dias.',
    fontes: [
      { org: 'ACSM', titulo: 'Position stand: progression models in resistance training for healthy adults', ano: 2009, url: 'https://doi.org/10.1249/MSS.0b013e3181915670' },
      { org: 'Schoenfeld BJ et al., Journal of Sports Sciences', titulo: 'Loading recommendations for muscle strength, hypertrophy, and local endurance: a re-examination of the repetition continuum', ano: 2021, url: 'https://doi.org/10.3390/sports9020032' },
    ],
    tags: ['progresion', 'variacion', 'variación', 'version mas facil', 'más fácil', 'más difícil', 'mas dificil', 'no puedo hacer', 'no aguanto', 'bulgara', 'zancadas', 'plancha lateral', 'hasta el fallo', 'cuantas repeticiones'],
  },
  {
    id: 'fle-01', tema: 'Flexibilidade', titulo: 'Como ganhar flexibilidade',
    pontos: 'Flexibilidade melhora com alongamento estático de 30–60 segundos por músculo, 2–3 vezes por semana, feito depois do treino ou em sessão separada, até um desconforto leve, nunca dor. Em 4–8 semanas a amplitude muda. Antes do treino, o melhor é aquecimento dinâmico (movimentos amplos e lentos, como balanços de perna e círculos de quadril). Mulheres a partir dos 40 e no pós-parto ganham mais com consistência do que com intensidade.',
    fontes: [
      { org: 'ACSM, Garber CE et al., Medicine & Science in Sports & Exercise', titulo: 'Quantity and quality of exercise for developing and maintaining cardiorespiratory, musculoskeletal, and neuromotor fitness in apparently healthy adults', ano: 2011, url: 'https://doi.org/10.1249/MSS.0b013e318213fefb' },
    ],
    tags: ['flexibilidad', 'flexibilidade', 'estirar', 'estiramientos', 'alongar', 'rigida', 'rígida', 'dura', 'tocar los pies', 'spagat', 'yoga'],
  },
  // ── Calorias e alimentação, nível 2 ─────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'cal-05', tema: 'Calorias', titulo: 'Como estimar o próprio gasto (passo a passo) e ajustar',
    pontos: 'Equação de Mifflin-St Jeor para mulheres: basal = 10 × peso (kg) + 6,25 × altura (cm) − 5 × idade − 161. Exemplo: 70 kg, 165 cm, 40 anos → 700 + 1.031 − 200 − 161 ≈ 1.370 kcal. Multiplica-se pelo fator de atividade: 1,2 (sedentária), 1,375 (leve: o desafio diário), 1,55 (moderada: desafio + caminhadas), 1,725 (intensa). No exemplo, com fator leve: ≈ 1.880 kcal de gasto; déficit de 300–500 dá uma meta de 1.400–1.600 kcal. Ajuste: pesar 1 vez por semana nas mesmas condições; se em 3 semanas o peso não mexeu, cortar 100–200 kcal ou somar 2.000–3.000 passos por dia. Contar por 1–2 semanas num app de alimentos ensina as porções; depois dá para seguir por medidas de mão (proteína = palma, carboidrato = punho, gordura = polegar).',
    cuidado: 'É estimativa, não prescrição; condição de saúde, remédio, gravidez ou amamentação → nutricionista. Nunca abaixo de ~1.200 kcal sem profissional.',
    fontes: [
      { org: 'Mifflin MD et al., American Journal of Clinical Nutrition', titulo: 'A new predictive equation for resting energy expenditure in healthy individuals', ano: 1990, url: 'https://doi.org/10.1093/ajcn/51.2.241' },
      { org: 'NIH / NHLBI (EUA)', titulo: 'Aim for a Healthy Weight — calorie guidance', ano: 2022, url: 'https://www.nhlbi.nih.gov/health/educational/lose_wt/eat/calories.htm' },
    ],
    tags: ['calcular', 'como calculo', 'formula', 'fórmula', 'ejemplo', 'factor de actividad', 'contar calorias', 'app de calorias', 'porciones', 'porções', 'mano', 'cuanto como'],
  },
  {
    id: 'ali-06', tema: 'Alimentação', titulo: 'Prato simples para emagrecer sem contar: a regra das metades',
    pontos: 'Sem contar calorias: metade do prato de vegetais e verduras, um quarto de proteína (ovo, frango, peixe, carne magra, leguminosas), um quarto de carboidrato de boa qualidade (arroz, batata, milho, tortilla integral), uma colher de gordura boa (azeite, abacate, castanhas). Fruta 2–3 porções por dia. Açúcar adicionado abaixo de 10% das calorias (idealmente 5%): refrigerante, suco de caixinha e doces são a maior fonte. Fibra 25–30 g por dia (vegetais, frutas, feijão, aveia) dá saciedade e intestino regular.',
    fontes: [
      { org: 'OMS', titulo: 'Guideline: sugars intake for adults and children', ano: 2015, url: 'https://www.who.int/publications/i/item/9789241549028' },
      { org: 'EFSA', titulo: 'Scientific Opinion on Dietary Reference Values for carbohydrates and dietary fibre', ano: 2010, url: 'https://doi.org/10.2903/j.efsa.2010.1462' },
    ],
    tags: ['que comer', 'qué como', 'plato', 'prato', 'porciones', 'azucar', 'azúcar', 'fibra', 'verduras', 'fruta', 'frutas', 'refresco', 'gaseosa', 'dulces', 'pan', 'tortilla', 'arroz'],
  },
  {
    id: 'ali-07', tema: 'Alimentação', titulo: 'Ultraprocessados e por que "comida de verdade" emagrece mais',
    pontos: 'Num estudo controlado, pessoas com acesso livre a comida ultraprocessada comeram em média 500 kcal a mais por dia e ganharam peso em duas semanas, mesmo com os mesmos nutrientes na tabela, em comparação com comida minimamente processada. Ultraprocessado (salgadinho, biscoito, refrigerante, embutido, pronto para aquecer) é fácil de comer demais e sacia pouco. Trocar o que dá: não precisa ser perfeito, precisa ser a maioria das refeições.',
    fontes: [
      { org: 'Hall KD et al., Cell Metabolism', titulo: 'Ultra-processed diets cause excess calorie intake and weight gain: an inpatient randomized controlled trial', ano: 2019, url: 'https://doi.org/10.1016/j.cmet.2019.05.008' },
    ],
    tags: ['ultraprocesados', 'ultraprocessados', 'procesados', 'comida chatarra', 'galletas', 'papitas', 'snacks', 'embutidos', 'comida real', 'saludable'],
  },
  {
    id: 'ali-08', tema: 'Alimentação', titulo: 'Adoçantes, "detox", sucos e chás emagrecedores',
    pontos: 'Adoçantes sem açúcar não ajudam a controlar o peso a longo prazo, segundo a diretriz da OMS de 2023; podem servir de transição, mas o objetivo é reduzir o doce em geral. "Detox", sucos de limpeza e chás emagrecedores não têm evidência: fígado e rins já fazem a limpeza, e os chás laxantes só tiram água. Suco, mesmo natural, concentra o açúcar da fruta sem a fibra: melhor a fruta inteira.',
    fontes: [
      { org: 'OMS', titulo: 'Use of non-sugar sweeteners: WHO guideline', ano: 2023, url: 'https://www.who.int/publications/i/item/9789240073616' },
      { org: 'NIH / NCCIH (EUA)', titulo: '"Detoxes" and "cleanses": what you need to know', ano: 2019, url: 'https://www.nccih.nih.gov/health/detoxes-and-cleanses-what-you-need-to-know' },
    ],
    tags: ['edulcorante', 'adoçante', 'stevia', 'sucralosa', 'detox', 'jugo', 'jugos', 'suco', 'te para adelgazar', 'té para adelgazar', 'laxante', 'limpieza'],
  },
  {
    id: 'ali-09', tema: 'Alimentação', titulo: 'Álcool e emagrecimento',
    pontos: 'Álcool tem 7 kcal por grama (uma taça de vinho ou uma lata de cerveja ≈ 120–150 kcal), tira a prioridade do corpo de queimar gordura enquanto é metabolizado, piora o sono e aumenta o apetite. Não precisa zerar para emagrecer, mas reduzir frequência e dose é dos ajustes que mais rendem. Não há dose "saudável": a OMS considera que nenhum nível é isento de risco.',
    fontes: [
      { org: 'OMS', titulo: 'No level of alcohol consumption is safe for our health', ano: 2023, url: 'https://www.who.int/europe/news/item/04-01-2023-no-level-of-alcohol-consumption-is-safe-for-our-health' },
    ],
    tags: ['alcohol', 'álcool', 'vino', 'cerveza', 'trago', 'tragos', 'fin de semana', 'fiesta'],
  },
  {
    id: 'ali-10', tema: 'Alimentação', titulo: 'Suplementos: o que tem evidência (creatina, proteína em pó, vitamina D) e o que não tem',
    pontos: 'Creatina (3–5 g por dia, qualquer horário) é o suplemento com mais evidência para força e massa muscular, segura em adultas saudáveis, e pode subir o peso em 0,5–1 kg por água no músculo, não gordura. Proteína em pó só substitui comida quando não dá para bater a meta de proteína. Vitamina D só com exame mostrando falta. Multivitamínico, colágeno, termogênico e "queimadores" não têm evidência para emagrecer. Para berberina, garcinia e afins, não há recomendação segura sem médico.',
    cuidado: 'Qualquer suplemento com doença renal, gravidez ou remédio de uso contínuo: médico antes. O bot não indica dose de suplemento fora destes.',
    fontes: [
      { org: 'ISSN, Kreider RB et al.', titulo: 'Position stand: safety and efficacy of creatine supplementation in exercise, sport, and medicine', ano: 2017, url: 'https://doi.org/10.1186/s12970-017-0173-z' },
      { org: 'ISSN, Jäger R et al.', titulo: 'Position stand: protein and exercise', ano: 2017, url: 'https://doi.org/10.1186/s12970-017-0177-8' },
    ],
    tags: ['creatina', 'suplemento', 'suplementos', 'proteina en polvo', 'whey', 'colageno', 'colágeno', 'vitamina', 'vitaminas', 'multivitaminico', 'omega', 'berberina', 'garcinia', 'termogenico', 'quemador'],
  },
  {
    id: 'jej-03', tema: 'Jejum', titulo: 'Como fazer jejum intermitente com segurança (se ela quiser)',
    pontos: 'Formato mais usado: 16/8 (comer num período de 8 horas, por exemplo 12h–20h), começando com 12/12 e alargando aos poucos. Dentro da janela, as refeições normais com proteína e vegetais, sem compensar. Água, café e chá sem açúcar são livres no jejum. Treinar pode ser antes ou dentro da janela. Sinais para parar: tontura, dor de cabeça persistente, irritabilidade forte, compulsão na janela, ciclo menstrual desregulado. Jejuns longos (24 h ou mais) não têm vantagem e aumentam risco.',
    cuidado: 'Não para grávidas, lactantes, diabéticas com remédio, adolescentes, pessoas com distúrbio alimentar ou abaixo do peso. Com qualquer doença, médico antes.',
    fontes: [
      { org: 'Liu D et al., New England Journal of Medicine', titulo: 'Calorie restriction with or without time-restricted eating in weight loss', ano: 2022, url: 'https://doi.org/10.1056/NEJMoa2114833' },
      { org: 'de Cabo R & Mattson MP, New England Journal of Medicine', titulo: 'Effects of intermittent fasting on health, aging, and disease', ano: 2019, url: 'https://doi.org/10.1056/NEJMra1905136' },
    ],
    tags: ['como hacer ayuno', 'empezar ayuno', 'ventana', '12/12', '16/8', 'que puedo tomar en ayuno', 'cafe en ayunas', 'romper el ayuno', 'ayuno largo'],
  },
  {
    id: 'pla-01', tema: 'Platô', titulo: 'O peso travou: o que fazer, em ordem',
    pontos: 'Depois de semanas perdendo, o corpo gasta menos (adaptação) e o peso para. Em ordem: (1) conferir se o déficit ainda existe: pesar as porções por uma semana, porque "esquecer" 200–300 kcal por dia é comum; (2) recalcular o gasto com o peso novo (quem pesa menos gasta menos); (3) subir a atividade do dia (passos, escada, ficar de pé), que pesa mais que o treino em si; (4) proteína e sono em dia; (5) se tudo está certo há 3–4 semanas, uma pausa de 1–2 semanas comendo na manutenção costuma destravar e aliviar a cabeça. Platô de 2 semanas não é platô; é a oscilação normal.',
    fontes: [
      { org: 'Trexler ET et al., Journal of the International Society of Sports Nutrition', titulo: 'Metabolic adaptation to weight loss: implications for the athlete', ano: 2014, url: 'https://doi.org/10.1186/1550-2783-11-7' },
      { org: 'Paluch AE et al., The Lancet Public Health', titulo: 'Daily steps and all-cause mortality: a meta-analysis of 15 international cohorts', ano: 2022, url: 'https://doi.org/10.1016/S2468-2667(21)00302-9' },
    ],
    tags: ['estancada', 'estancamiento', 'meseta', 'plateau', 'no bajo mas', 'no bajo más', 'dejé de bajar', 'deje de bajar', 'sin bajar', 'no bajo', 'no he bajado', 'no pierdo peso', 'no adelgazo', 'no baja', 'mismo peso', 'ni un gramo', 'ni un kilo', 'la bascula no', 'la báscula no', 'semanas sin', 'pasos', 'caminar', 'caminata', 'descanso de la dieta'],
  },
  // ── Fases da vida, nível 2 ──────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'mul-05', tema: 'Gravidez', titulo: 'Como adaptar os exercícios na gravidez (com liberação médica)',
    pontos: 'Com o médico de acordo: trocar saltos por passos; agachamento com apoio e amplitude confortável; depois do 1º trimestre, nada deitada de costas por mais de 1–2 minutos (usar lado ou inclinada); prancha pode virar prancha na parede ou nos joelhos; evitar abdominais tradicionais (favorecem a diástase); treino do assoalho pélvico (contrair como se segurasse a urina, 8–12 vezes, 3 séries por dia) desde o início; intensidade em que dá para conversar; hidratar e evitar calor. Parar e ligar para o médico se: sangramento, perda de líquido, contrações regulares, tontura, dor no peito, falta de ar antes do esforço, dor ou inchaço na panturrilha.',
    cuidado: 'Sempre com liberação de quem acompanha a gestação. O desafio de calistenia não é para gestantes; o Preparto (Pase) é.',
    fontes: [
      { org: 'ACOG', titulo: 'Committee Opinion No. 804: Physical activity and exercise during pregnancy and the postpartum period', ano: 2020, url: 'https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2020/04/physical-activity-and-exercise-during-pregnancy-and-the-postpartum-period' },
      { org: 'Mottola MF et al., British Journal of Sports Medicine', titulo: '2019 Canadian guideline for physical activity throughout pregnancy', ano: 2018, url: 'https://doi.org/10.1136/bjsports-2018-100056' },
    ],
    tags: ['embarazada', 'embarazo', 'gravida', 'grávida', 'gestante', 'trimestre', 'boca arriba', 'saltos', 'suelo pelvico', 'suelo pélvico', 'kegel', 'contracciones'],
  },
  {
    id: 'mul-06', tema: 'Pós-parto', titulo: 'Diástase e assoalho pélvico: como checar e por onde começar',
    pontos: 'Checar a diástase: deitada, joelhos dobrados, levantar a cabeça levemente e sentir com os dedos acima e abaixo do umbigo; 2 dedos ou mais de separação, ou a barriga "saltar" numa ponta, pede progressão lenta e fisioterapia pélvica. Começar por: respiração com o abdômen (expirar puxando o umbigo), contração do assoalho pélvico (8–12 vezes, 3 séries por dia, segurando 5–10 s), ponte de glúteo, inseto morto com pernas apoiadas, caminhada. Deixar abdominal tradicional, prancha completa e saltos para quando não houver vazamento de urina, peso no períneo nem a barriga saltando. Treino do assoalho pélvico reduz a incontinência na maioria das mulheres em 3 meses.',
    cuidado: 'Incontinência, dor pélvica, sensação de peso ou cesárea com dor: fisioterapeuta pélvica e médico antes de evoluir. No app, o Posparto (Pase) é o programa dessa fase.',
    fontes: [
      { org: 'Cochrane (Woodley SJ et al.)', titulo: 'Pelvic floor muscle training for preventing and treating urinary and faecal incontinence in antenatal and postnatal women', ano: 2020, url: 'https://doi.org/10.1002/14651858.CD007471.pub4' },
      { org: 'Evenson KR et al., Obstetrical & Gynecological Survey', titulo: 'Summary of international guidelines for physical activity after pregnancy', ano: 2014, url: 'https://doi.org/10.1097/OGX.0000000000000077' },
    ],
    tags: ['diastasis', 'diástase', 'suelo pelvico', 'suelo pélvico', 'perdida de orina', 'pérdida de orina', 'incontinencia', 'kegel', 'posparto', 'cesarea', 'cesárea', 'cuarentena', 'barriga despues del parto'],
  },
  {
    id: 'mul-07', tema: 'Menopausa', titulo: 'Menopausa: treino para osso, barriga e calorões (como fazer)',
    pontos: 'Para o osso e a massa muscular, o que funciona é treino de força progressivo (agachamento, afundo, flexão, ponte, com carga ou versões mais difíceis) 2–3 vezes por semana e algum impacto controlado (subir degrau, pequenos saltos se as articulações permitirem). A gordura abdominal responde a déficit moderado + proteína (1,2–1,6 g/kg) + força; cardio sozinho rende menos. Calorões: exercício regular ajuda muitas mulheres, mas treinar em ambiente fresco e hidratada evita piorar na hora. Sono costuma ser o maior gargalo: rotina fixa, quarto frio, sem álcool à noite.',
    cuidado: 'Osteoporose diagnosticada: liberar saltos e cargas com o médico. Sintomas fortes: ginecologista; o bot não opina sobre hormônios.',
    fontes: [
      { org: 'Watson SL et al., Journal of Bone and Mineral Research', titulo: 'High-intensity resistance and impact training improves bone mineral density and physical function in postmenopausal women with osteopenia and osteoporosis: the LIFTMOR randomized controlled trial', ano: 2018, url: 'https://doi.org/10.1002/jbmr.3284' },
      { org: 'NAMS (The Menopause Society)', titulo: 'The 2022 Hormone Therapy Position Statement', ano: 2022, url: 'https://doi.org/10.1097/GME.0000000000002028' },
    ],
    tags: ['menopausia', 'menopausa', 'osteoporosis', 'huesos', 'ossos', 'sofocos', 'calores', 'barriga menopausia', 'grasa abdominal', 'perimenopausia'],
  },
  {
    id: 'mul-08', tema: 'Condições comuns', titulo: 'Síndrome dos ovários policísticos (SOP) e hipotireoidismo: dá para emagrecer?',
    pontos: 'SOP: a diretriz internacional recomenda exatamente o que o desafio faz, atividade regular (150 min moderada ou 75 vigorosa por semana, com força 2 dias) e alimentação com déficit moderado; perder 5–10% do peso já melhora ciclo e insulina. Hipotireoidismo tratado e com dose ajustada não impede emagrecer; sem tratamento, o gasto cai e a retenção de líquido confunde a balança. Em ambos, o ritmo pode ser mais lento, não impossível.',
    cuidado: 'Diagnóstico e medicação são do médico; o bot não ajusta nem comenta dose. Sem diagnóstico e com ciclo irregular, pelos no rosto ou cansaço extremo: consultar.',
    fontes: [
      { org: 'Teede HJ et al., Human Reproduction', titulo: 'Recommendations from the international evidence-based guideline for the assessment and management of polycystic ovary syndrome', ano: 2018, url: 'https://doi.org/10.1093/humrep/dey256' },
    ],
    tags: ['ovario poliquistico', 'ovarios poliquisticos', 'sop', 'pcos', 'tiroides', 'hipotiroidismo', 'resistencia a la insulina', 'insulina', 'hormonal'],
  },
  {
    id: 'mul-09', tema: 'Condições comuns', titulo: 'Diabetes tipo 2 e pressão alta: treinar com segurança',
    pontos: 'Exercício regular é parte do tratamento das duas: melhora a glicose por 24–72 horas e reduz a pressão. Cuidados práticos: com remédio para glicose, ter um carboidrato rápido por perto e não treinar em jejum sem aval médico; com pressão alta, evitar prender a respiração nos esforços (expirar na força) e exercícios de cabeça para baixo; medir a pressão com regularidade. Não treinar com glicose muito alta com sintomas, ou com pressão descontrolada.',
    cuidado: 'Liberação e ajuste de remédio são do médico. Tontura, dor no peito, visão turva ou suor frio: parar e procurar atendimento.',
    fontes: [
      { org: 'ADA (American Diabetes Association), Colberg SR et al., Diabetes Care', titulo: 'Physical activity/exercise and diabetes: a position statement of the American Diabetes Association', ano: 2016, url: 'https://doi.org/10.2337/dc16-1728' },
      { org: 'OMS', titulo: 'WHO guidelines on physical activity and sedentary behaviour (chronic conditions)', ano: 2020, url: 'https://www.who.int/publications/i/item/9789240015128' },
    ],
    tags: ['diabetes', 'glucosa', 'azucar en sangre', 'presion alta', 'presión alta', 'hipertension', 'hipertensión', 'metformina', 'insulina', 'mareo'],
  },
  // ── Corpo, pele e sinais ────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'cor-01', tema: 'Corpo', titulo: 'Celulite e flacidez',
    pontos: 'Celulite é estrutura da pele e da gordura sob ela, com forte componente genético e hormonal; nenhum creme, massagem ou "treino para celulite" a elimina. O que reduz a aparência é perder gordura, ganhar músculo embaixo da pele (glúteo e coxa) e manter hidratação e sono. Flacidez de braços e barriga melhora com força progressiva e com o tempo; pele muito esticada por perda grande de peso pode precisar de avaliação dermatológica.',
    fontes: [
      { org: 'Luebberding S et al., American Journal of Clinical Dermatology', titulo: 'Cellulite: an evidence-based review', ano: 2015, url: 'https://doi.org/10.1007/s40257-015-0129-5' },
    ],
    tags: ['celulitis', 'celulite', 'flacidez', 'flacida', 'flácida', 'piel suelta', 'estrias', 'estrías', 'crema', 'masaje'],
  },
  {
    id: 'cor-02', tema: 'Corpo', titulo: 'Estresse, cortisol e barriga',
    pontos: 'Estresse crônico eleva o cortisol, aumenta a vontade de comida calórica e piora o sono; o conjunto favorece gordura abdominal. Exercício regular é dos melhores reguladores de estresse, mas treino muito intenso em cima de pouco sono piora. O que funciona: treino moderado e constante, 7–9 horas de sono, refeições regulares com proteína, 10 minutos de caminhada ou respiração lenta nos dias ruins. "Cortisol alto" não é diagnóstico de WhatsApp: se há ganho de peso rápido, estrias roxas, fraqueza ou pressão alta, é médico.',
    fontes: [
      { org: 'Tomiyama AJ, Annual Review of Psychology', titulo: 'Stress and obesity', ano: 2019, url: 'https://doi.org/10.1146/annurev-psych-010418-102936' },
    ],
    tags: ['estres', 'estrés', 'cortisol', 'ansiedad', 'ansiedade', 'nervios', 'como por ansiedad', 'atracon', 'atracón', 'barriga de estres'],
  },
  {
    id: 'cor-03', tema: 'Corpo', titulo: 'Inchaço, gases e intestino',
    pontos: 'Barriga inchada no fim do dia costuma ser gás ou água, não gordura: comer rápido, refrigerante, excesso de sal, adoçantes e fibra aumentada de repente são as causas mais comuns. Ajuda: mastigar devagar, aumentar a fibra aos poucos com água, caminhar 10 minutos depois das refeições, reduzir sal e refrigerante, intestino regular. Inchaço com dor forte, sangue, perda de peso sem querer ou que dura semanas pede médico.',
    cuidado: 'Regra do produto: o bônus Plano Antiinchaço traz o protocolo de 3 dias; use-o como base e o acervo como explicação.',
    fontes: [
      { org: 'NIH / NIDDK (EUA)', titulo: 'Gas in the digestive tract: symptoms and causes', ano: 2021, url: 'https://www.niddk.nih.gov/health-information/digestive-diseases/gas-digestive-tract' },
    ],
    tags: ['hinchazon', 'hinchazón', 'hinchada', 'inchaço', 'inchada', 'gases', 'estreñimiento', 'estrenimiento', 'intestino', 'digestion', 'digestión', 'retencion de liquidos'],
  },
  {
    id: 'sin-01', tema: 'Sinais de alerta', titulo: 'Quando parar de treinar e procurar atendimento',
    pontos: 'Parar na hora e procurar atendimento: dor ou pressão no peito, falta de ar desproporcional, tontura ou desmaio, palpitação forte que não passa, dor de cabeça súbita e intensa, dor aguda com inchaço numa articulação, perda de força num lado do corpo. Não são "frescura" nem "falta de costume". Enjoo leve, suor e cansaço em treino novo são normais e melhoram em 1–2 semanas.',
    cuidado: 'Diante de qualquer um desses sinais, o bot orienta a procurar atendimento e não tenta diagnosticar.',
    fontes: [
      { org: 'ACSM, Riebe D et al., Medicine & Science in Sports & Exercise', titulo: 'Updating ACSM\'s recommendations for exercise preparticipation health screening', ano: 2015, url: 'https://doi.org/10.1249/MSS.0000000000000664' },
    ],
    tags: ['dolor en el pecho', 'me falta el aire', 'mareo', 'mareada', 'desmayo', 'palpitaciones', 'taquicardia', 'nauseas', 'náuseas', 'vomito', 'me siento mal'],
  },
]

// ─── Busca simples por tags (sem IA): normaliza acentos e pontua por tag encontrada ──────────────────────────────────────
const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Trechos mais relevantes para o texto (últimas mensagens dela). Vazio = nada bate. */
export function buscarAcervo(texto: string, max = 4): Trecho[] {
  const t = ` ${norm(texto)} `
  return ACERVO.map((tr) => ({ tr, n: tr.tags.filter((tag) => t.includes(norm(tag))).reduce((p, tag) => p + (tag.includes(' ') ? 2 : 1), 0) }))
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
