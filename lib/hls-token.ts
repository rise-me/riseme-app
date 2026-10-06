import 'server-only'
import { createHmac } from 'node:crypto'

// Passe para o porteiro das aulas (workers/aulas): assina a pasta da aula (<curso>/<aula>) com
// validade. Só é gerado no servidor, depois de o app conferir que a aluna tem acesso ao desafio.
// Mesmo segredo no Vercel (HLS_TOKEN_SECRET) e no Worker (TOKEN_SECRET).
const TTL_SECONDS = 6 * 60 * 60 // cobre aula pausada e retomada no mesmo dia

export function signLessonPath(playlistPath: string): string | null {
  const secret = process.env.HLS_TOKEN_SECRET
  if (!secret) return null
  const lessonDir = playlistPath.split('/').slice(0, 2).join('/')
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS
  const sig = createHmac('sha256', secret).update(`${exp}:${lessonDir}`).digest('base64url')
  return `${exp}.${sig}/${playlistPath}`
}
