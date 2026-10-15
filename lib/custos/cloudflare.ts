import 'server-only'
import { PRECOS, R2_CLASSE_A, R2_GRATIS, limites } from './precos'

// Monitor de custo da Cloudflare: lê o uso do mês (GraphQL Analytics), projeta até o fim do
// mês e diz se algo passou do limite. Envs: CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_ANALYTICS_TOKEN
// (precisa de Account Analytics: Read).

export interface UsoCloudflare {
  fracaoDoMes: number
  r2: { gb: number; classeA: number; classeB: number; custo: number }
  workers: { requisicoes: number; custoExtra: number }
  stream: { minutosAssistidos: number; custo: number }
  alertas: string[]
}

const QUERY = `query($acc:String!,$a:Time!,$b:Time!,$da:Date!,$db:Date!){viewer{accounts(filter:{accountTag:$acc}){
 r2Storage: r2StorageAdaptiveGroups(limit:100,filter:{datetime_geq:$a,datetime_leq:$b},orderBy:[datetime_DESC]){max{payloadSize metadataSize} dimensions{bucketName datetime}}
 r2Ops: r2OperationsAdaptiveGroups(limit:100,filter:{datetime_geq:$a,datetime_leq:$b}){sum{requests} dimensions{actionType}}
 workers: workersInvocationsAdaptive(limit:1000,filter:{date_geq:$da,date_leq:$db}){sum{requests}}
 pages: pagesFunctionsInvocationsAdaptiveGroups(limit:1000,filter:{date_geq:$da,date_leq:$db}){sum{requests}}
 stream: streamMinutesViewedAdaptiveGroups(limit:100,filter:{date_geq:$da,date_leq:$db}){sum{minutesViewed}}
}}}`

type Linha<T> = { sum?: T; max?: T; dimensions?: Record<string, string> }

const soma = <K extends string>(rows: Linha<Record<K, number>>[] | undefined, k: K) =>
  (rows ?? []).reduce((t, r) => t + (r.sum?.[k] ?? 0), 0)

export async function usoCloudflare(agora = new Date()): Promise<UsoCloudflare> {
  const acc = process.env.CLOUDFLARE_ACCOUNT_ID
  const token = process.env.CLOUDFLARE_ANALYTICS_TOKEN
  if (!acc || !token) throw new Error('CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_ANALYTICS_TOKEN ausentes')

  const inicio = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 1))
  const fim = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() + 1, 1))
  const fracao = Math.max(0.02, (agora.getTime() - inicio.getTime()) / (fim.getTime() - inicio.getTime()))
  const dia = (d: Date) => d.toISOString().slice(0, 10)

  const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: QUERY,
      variables: { acc, a: inicio.toISOString(), b: agora.toISOString(), da: dia(inicio), db: dia(agora) },
    }),
    cache: 'no-store',
  })
  const json = await res.json()
  if (json.errors?.length) throw new Error(`GraphQL: ${json.errors[0].message}`)
  const d = json.data.viewer.accounts[0]

  // R2: armazenamento = leitura mais recente de cada bucket; operações projetadas pro mês
  const vistos = new Set<string>()
  let bytes = 0
  for (const r of d.r2Storage as Linha<{ payloadSize: number; metadataSize: number }>[]) {
    const b = r.dimensions?.bucketName ?? ''
    if (vistos.has(b)) continue
    vistos.add(b)
    bytes += (r.max?.payloadSize ?? 0) + (r.max?.metadataSize ?? 0)
  }
  let a = 0
  let b = 0
  for (const r of d.r2Ops as Linha<{ requests: number }>[]) {
    const tipo = r.dimensions?.actionType ?? ''
    if (R2_GRATIS.has(tipo)) continue
    if (R2_CLASSE_A.has(tipo)) a += r.sum?.requests ?? 0
    else b += r.sum?.requests ?? 0
  }
  const gb = bytes / 1e9
  const aMes = a / fracao
  const bMes = b / fracao
  const p = PRECOS.r2
  const custoR2 =
    Math.max(0, gb - p.gratisGb) * p.gbMes +
    (Math.max(0, aMes - p.gratisClasseA) / 1e6) * p.classeAPorMilhao +
    (Math.max(0, bMes - p.gratisClasseB) / 1e6) * p.classeBPorMilhao

  // Workers + funções do Pages dividem o mesmo limite do plano
  const reqMes = (soma(d.workers, 'requests') + soma(d.pages, 'requests')) / fracao
  const w = PRECOS.workers
  const extraWorkers = (Math.max(0, reqMes - w.incluidas) / 1e6) * w.extraPorMilhao

  const minMes = soma(d.stream, 'minutesViewed') / fracao
  const s = PRECOS.stream
  const custoStream = s.armazenamentoMes + (minMes / 1000) * s.porMilMinAssistidos

  const lim = limites()
  const alertas: string[] = []
  const variavel = custoR2 + extraWorkers
  if (variavel > lim.r2WorkersUsd) {
    alertas.push(`R2 + Workers devem custar US$ ${variavel.toFixed(2)} além do plano neste mês (limite US$ ${lim.r2WorkersUsd})`)
  }
  if (reqMes > w.incluidas * lim.workersFracao) {
    alertas.push(`Workers/funis devem fazer ${(reqMes / 1e6).toFixed(1)} mi de requisições no mês (plano inclui ${w.incluidas / 1e6} mi)`)
  }
  if (custoStream > lim.streamUsd) {
    alertas.push(`Stream deve custar US$ ${custoStream.toFixed(2)} no mês (limite US$ ${lim.streamUsd})`)
  }

  return {
    fracaoDoMes: fracao,
    r2: { gb, classeA: Math.round(aMes), classeB: Math.round(bMes), custo: custoR2 },
    workers: { requisicoes: Math.round(reqMes), custoExtra: extraWorkers },
    stream: { minutosAssistidos: Math.round(minMes), custo: custoStream },
    alertas,
  }
}

export function mensagemCusto(u: UsoCloudflare): string {
  const usd = (n: number) => `US$ ${n.toFixed(2)}`
  const linhas = [
    u.alertas.length ? '⚠️ *Alerta de custo — Cloudflare*' : '📊 *Resumo semanal — Cloudflare*',
    ...u.alertas.map((a) => `• ${a}`),
    '',
    `Projeção do mês (${Math.round(u.fracaoDoMes * 100)}% do mês passado):`,
    `• R2: ${u.r2.gb.toFixed(1)} GB guardados → ${usd(u.r2.custo)}`,
    `• Workers + funis: ${(u.workers.requisicoes / 1e6).toFixed(1)} mi req → US$ 5 do plano + ${usd(u.workers.custoExtra)}`,
    `• Stream: ${u.stream.minutosAssistidos.toLocaleString('pt-BR')} min assistidos → ${usd(u.stream.custo)}`,
  ]
  return linhas.join('\n')
}
