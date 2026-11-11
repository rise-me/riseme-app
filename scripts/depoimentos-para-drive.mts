// Vídeos de depoimento (bucket 'depoimentos' do Supabase) → Drive "00 - RiseMe™/Provas Sociais Clientes/Calistenia/<IDIOMA>/".
// Bruno 10/11/2026: as provas sociais moram no Drive. Roda todo dia junto do backup (~/Ferramentas/backup-claude/backup.sh).
// Só sobe o que falta: compara por MD5 com tudo que já está na pasta (vídeo mandado 2× sobe 1×). Nunca apaga nada.
// Nome no padrão que já existia na pasta: AAAA-MM-DD_Nome_PAÍS_IDIOMA.mp4 (país pelo DDI da conversa).
// Uso: npx tsx --env-file=.env.local scripts/depoimentos-para-drive.mts [--seco]
import { createClient } from '@supabase/supabase-js'
import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const DRIVE = 'gdrive-full:00 - RiseMe™/Provas Sociais Clientes'
const seco = process.argv.includes('--seco')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const DDI: [string, string][] = [['1787','PR'],['1939','PR'],['593','EC'],['591','BO'],['595','PY'],['598','UY'],['502','GT'],['503','SV'],['504','HN'],['505','NI'],['506','CR'],['507','PA'],['420','CZ'],['34','ES'],['48','PL'],['52','MX'],['54','AR'],['51','PE'],['56','CL'],['57','CO'],['58','VE'],['39','IT'],['40','RO'],['55','BR'],['1','US']]
const pais = (tel: string) => DDI.find(([k]) => tel.replace(/\D/g, '').startsWith(k))?.[1] ?? 'XX'
const sh = (c: string) => execSync(c, { stdio: ['ignore', 'pipe', 'ignore'] }).toString()

const noDrive = new Set(sh(`rclone md5sum "${DRIVE}"`).split('\n').map((l) => l.split(' ')[0]).filter(Boolean))
const nomesNoDrive = new Set(sh(`rclone lsf -R "${DRIVE}"`).split('\n'))
const pasta = mkdtempSync(join(tmpdir(), 'depo-'))
let subiu = 0
try {
  const { data: dias } = await db.storage.from('depoimentos').list('', { limit: 1000 })
  for (const d of dias ?? []) {
    const { data: arqs } = await db.storage.from('depoimentos').list(d.name, { limit: 1000 })
    for (const f of arqs ?? []) {
      const src = `${d.name}/${f.name}`
      const { data: s } = await db.storage.from('depoimentos').createSignedUrl(src, 3600)
      const local = join(pasta, 'v')
      sh(`curl -s -o "${local}" "${s!.signedUrl}"`)
      const md5 = sh(`md5 -q "${local}"`).trim()
      if (noDrive.has(md5)) continue
      const id = f.name.replace(/-\d+\.\w+$/, '')
      let nome = '', tel = /^[0-9a-f-]{36}$/.test(id) ? '' : id, idioma = 'es'
      if (!tel) {
        const { data: a } = await db.auth.admin.getUserById(id)
        const m = (a.user?.user_metadata ?? {}) as Record<string, any>
        nome = m.name ?? m.full_name ?? ''
        idioma = String(m.locale ?? m.idioma ?? 'es').slice(0, 2)
        const { data: c } = await db.from('whatsapp_chats').select('phone').eq('user_id', id).limit(1)
        tel = String(c?.[0]?.phone ?? '')
      }
      if (pais(tel) === 'PL') idioma = 'pl'
      const p1 = (nome.trim().split(/\s+/)[0] || 'SemNome').normalize('NFD').replace(/[̀-ͯ]/g, '')
      const IDI = idioma.toUpperCase()
      let alvo = `Calistenia/${IDI}/${d.name}_${p1[0].toUpperCase()}${p1.slice(1).toLowerCase()}_${pais(tel)}_${IDI}.${f.name.split('.').pop()}`
      for (let n = 2; nomesNoDrive.has(alvo); n++) alvo = alvo.replace(/( \(\d+\))?(\.\w+)$/, ` (${n})$2`)
      if (!seco) sh(`rclone copyto "${local}" "${DRIVE}/${alvo}"`)
      noDrive.add(md5); nomesNoDrive.add(alvo); subiu++
      console.log(`${seco ? '[seco] ' : ''}subiu ${alvo}`)
    }
  }
} finally { rmSync(pasta, { recursive: true, force: true }) }
console.log(`depoimentos → Drive: ${subiu} novo(s)`)
