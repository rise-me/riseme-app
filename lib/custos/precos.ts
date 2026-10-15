// Preços e franquias usados pelo monitor de custo (lib/custos/cloudflare.ts).
// Fonte: páginas oficiais de preço da Cloudflare (R2, Workers, Stream), conferidas em out/2026.
// Mudou o preço? Muda só aqui.

export const PRECOS = {
  r2: {
    gbMes: 0.015, // armazenamento padrão
    gratisGb: 10,
    classeAPorMilhao: 4.5, // gravações e listagens
    gratisClasseA: 1_000_000,
    classeBPorMilhao: 0.36, // leituras
    gratisClasseB: 10_000_000,
  },
  workers: {
    planoMes: 5, // Workers Paid (fixo)
    incluidas: 10_000_000, // requisições/mês no plano (Workers + funções do Pages)
    extraPorMilhao: 0.3,
  },
  stream: {
    armazenamentoMes: 5, // bloco pré-pago de 1.000 min (fixo)
    porMilMinAssistidos: 1,
  },
} as const

// Operações do R2 que são Classe A (o resto que aparece na conta é Classe B)
export const R2_CLASSE_A = new Set([
  'ListBuckets', 'PutBucket', 'ListObjects', 'PutObject', 'CopyObject', 'CompleteMultipartUpload',
  'CreateMultipartUpload', 'UploadPart', 'UploadPartCopy', 'ListMultipartUploads', 'ListParts',
  'PutBucketEncryption', 'PutBucketCors', 'PutBucketLifecycleConfiguration',
])
export const R2_GRATIS = new Set(['DeleteObject', 'DeleteBucket', 'AbortMultipartUpload'])

// Limites do alerta (decisão do Bruno, 06/10/2026). Env sobrescreve sem mexer no código.
export function limites() {
  return {
    // custo VARIÁVEL de R2 + excedente de Workers projetado no mês (o esperado é ~0)
    r2WorkersUsd: Number(process.env.COST_ALERT_R2_WORKERS_USD ?? 2),
    // Stream total projetado (US$ 5 fixos + minutos assistidos)
    streamUsd: Number(process.env.COST_ALERT_STREAM_USD ?? 20),
    // requisições de Workers projetadas, em fração do incluído no plano
    workersFracao: Number(process.env.COST_ALERT_WORKERS_FRACAO ?? 0.8),
  }
}
