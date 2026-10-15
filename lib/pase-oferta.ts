// Frequência da oferta do teste grátis do Pase no app (14/10/2026). Regra única pra todos os pontos de contato
// (aviso de bloqueio, fim da aula 1, fim do desafio, pop-up na volta): no máximo UMA oferta automática por dia,
// e cada oferta de fim de aula só uma vez na vida. Fica no aparelho (localStorage) — trocar de celular zera, ok.
// O aviso de bloqueio (clique num desafio trancado) sempre abre: é a aluna pedindo, mas conta como "visto hoje".

const KEY_DIA = 'pase_oferta_dia'
const keyAula = (challengeId: string, day: number) => `pase_oferta_aula_${challengeId}_${day}`

function hoje(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function ler(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}
function gravar(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch {}
}

export function ofertaMostradaHoje(): boolean {
  return ler(KEY_DIA) === hoje()
}

export function marcaOfertaMostrada() {
  gravar(KEY_DIA, hoje())
}

export function ofertaDaAulaJaMostrada(challengeId: string, day: number): boolean {
  return ler(keyAula(challengeId, day)) !== null
}

export function marcaOfertaDaAula(challengeId: string, day: number) {
  gravar(keyAula(challengeId, day), hoje())
}
