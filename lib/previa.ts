// Recurso novo entra no ar DESLIGADO para as alunas: liga para todas quando a variável vale '1' na Vercel
// (Production + redeploy); conta admin sempre vê, para conferir em produção antes de ligar.
// Usado por: "Tu cuidado" (CUIDADO_ATIVO) e "Tu clase de hoy" (CLASE_HOY_ATIVO).
export function recursoLigado(variavel: string, admin: boolean): boolean {
  return process.env[variavel] === '1' || admin
}
