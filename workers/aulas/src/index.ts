// Porteiro das aulas: entrega os arquivos HLS do R2 só para quem tem um passe assinado pelo app.
//
// URL: https://aulas.riseme.app/<passe>/<curso>/<aula>/<arquivo>
//   passe = <expira_unix>.<assinatura>, assinatura = HMAC-SHA256(TOKEN_SECRET, "<expira>:<curso>/<aula>")
// O app assina só a pasta da aula (lib/hls-token.ts). Como as playlists usam caminhos relativos,
// o passe vai junto em todo pedaço de vídeo e áudio sem o app fazer mais nada.
// O cache da Cloudflare guarda os arquivos SEM o passe na chave: todas as alunas compartilham.

export interface Env {
  AULAS: R2Bucket
  TOKEN_SECRET: string
  ALLOWED_ORIGINS: string // "https://riseme.app,https://www.riseme.app,http://localhost:3000"
}

const TYPES: Record<string, string> = {
  m3u8: 'application/vnd.apple.mpegurl',
  m4s: 'video/mp4',
  mp4: 'video/mp4',
  json: 'application/json',
}

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function validPass(secret: string, pass: string, lessonDir: string): Promise<boolean> {
  const [exp, sig] = pass.split('.')
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < Date.now() / 1000) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const expected = b64url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${exp}:${lessonDir}`)))
  if (expected.length !== sig.length) return false
  let diff = 0
  for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i)
  return diff === 0
}

// Mesma lógica do player do app: HLS nativo no iPhone/iPad, hls.js no resto
function playerPage(src: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Teste de aula</title><script src="https://cdn.jsdelivr.net/npm/hls.js@1.7.3/dist/hls.min.js"></script></head>
<body style="margin:0;background:#000;color:#fff;font:15px -apple-system,sans-serif">
<video id="v" controls playsinline style="width:100%;max-height:70vh;background:#000"></video>
<div id="s" style="padding:12px;line-height:1.6"></div>
<script>
const v = document.getElementById('v'), s = document.getElementById('s'), src = ${JSON.stringify(src)}
const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
let modo = 'nativo', erro = ''
if (!ios && window.Hls && Hls.isSupported()) {
  modo = 'hls.js'
  const h = new Hls({ capLevelToPlayerSize: true }); h.loadSource(src); h.attachMedia(v)
  h.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) erro = d.details })
  window.h = h
} else { v.src = src }
v.addEventListener('error', () => { erro = 'erro do player nativo' })
setInterval(() => {
  const q = window.h && h.levels[h.currentLevel] ? h.levels[h.currentLevel].height + 'p' : (v.videoHeight ? v.videoHeight + 'p' : '-')
  s.innerHTML = 'Idioma: <b>' + src.replace('master_', '').replace('.m3u8', '') + '</b> · player: ' + modo +
    '<br>Tempo: ' + v.currentTime.toFixed(1) + ' / ' + (v.duration ? v.duration.toFixed(0) : '-') + ' s · qualidade: ' + q +
    (erro ? '<br><b style="color:#f66">Erro: ' + erro + '</b>' : '')
}, 1000)
</script></body></html>`
}

function cors(req: Request, env: Env): Record<string, string> {
  const origin = req.headers.get('Origin')
  const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  return origin && allowed.includes(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { ...cors(req, env), 'Access-Control-Allow-Methods': 'GET, HEAD', 'Access-Control-Max-Age': '86400' } })
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('method not allowed', { status: 405 })

    const url = new URL(req.url)
    const [pass, curso, aula, ...rest] = url.pathname.slice(1).split('/')
    if (!pass || !curso || !aula || rest.length === 0 || rest.some((p) => p === '..' || p === '')) {
      return new Response('not found', { status: 404 })
    }
    if (!(await validPass(env.TOKEN_SECRET, pass, `${curso}/${aula}`))) {
      return new Response('forbidden', { status: 403, headers: cors(req, env) })
    }

    // Página de teste (QA no celular): /<passe>/<curso>/<aula>/player.html?lang=pl
    // Mesmo domínio das playlists, então não depende de CORS nem de deploy do app.
    if (rest.join('/') === 'player.html') {
      const lang = (url.searchParams.get('lang') ?? 'pl').replace(/[^a-zA-Z-]/g, '')
      return new Response(playerPage(`master_${lang}.m3u8`), {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
      })
    }

    const key = [curso, aula, ...rest].join('/')
    const ext = key.split('.').pop() ?? ''
    const cacheKey = new Request(`https://cache.aulas/${key}`)
    const cache = caches.default

    let res = await cache.match(cacheKey)
    if (!res) {
      const obj = await env.AULAS.get(key)
      if (!obj) return new Response('not found', { status: 404, headers: cors(req, env) })
      // Pedaços nunca mudam (pasta versionada); playlists podem ganhar idioma novo
      const cacheControl = ext === 'm3u8' ? 'public, max-age=300' : 'public, max-age=31536000, immutable'
      res = new Response(obj.body, {
        headers: { 'Content-Type': TYPES[ext] ?? 'application/octet-stream', 'Cache-Control': cacheControl, ETag: obj.httpEtag },
      })
      ctx.waitUntil(cache.put(cacheKey, res.clone()))
    }

    const out = new Response(req.method === 'HEAD' ? null : res.body, res)
    for (const [k, v] of Object.entries(cors(req, env))) out.headers.set(k, v)
    // O navegador não reaproveita entre alunas (o passe muda a URL); evita cache em proxy alheio
    out.headers.set('Cache-Control', ext === 'm3u8' ? 'private, max-age=60' : 'private, max-age=86400')
    return out
  },
}
