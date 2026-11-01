/**
 * Fetch YouTube captions for every crawled video and store them as
 * src/data/video-transcripts/<id>.json  ({ lang, auto, lines: [[seconds, text], ...] }).
 *
 * Requires `yt-dlp` on PATH. YouTube blocks most datacenter IPs, so run this from
 * a machine that can watch YouTube, or pass an exported cookies file.
 *
 *   bun scripts/enrich-video-transcripts.ts [--cookies cookies.txt] [--id VIDEO_ID]
 *                                           [--limit N] [--retry-empty] [--delay-ms 1500]
 *
 * Resumable: videos that already have a file are skipped. A video with no captions
 * gets `lines: []` so it is not retried (use --retry-empty to retry them). A yt-dlp
 * failure (blocked, network) writes nothing, so the next run retries it.
 */
import rawData from '../src/data/wordpress-videos.json'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export type TranscriptLine = [seconds: number, text: string]

/** Caption languages in order of preference (first one found wins). */
const languages = ['id', 'id-orig', 'en', 'en-orig']
/** A paragraph is closed once it reaches this many characters. */
const paragraphChars = 280

interface Json3 {
  events?: Array<{ tStartMs?: number; segs?: Array<{ utf8?: string }> }>
}

export function parseJson3(raw: string): TranscriptLine[] {
  const data = JSON.parse(raw) as Json3
  const lines: TranscriptLine[] = []
  let start = 0
  let buffer = ''
  for (const event of data.events ?? []) {
    const text = (event.segs ?? []).map((seg) => seg.utf8 ?? '').join('').replace(/\s+/g, ' ').trim()
    if (!text) continue
    if (!buffer) start = Math.floor((event.tStartMs ?? 0) / 1000)
    buffer = buffer ? `${buffer} ${text}` : text
    if (buffer.length >= paragraphChars) {
      lines.push([start, buffer])
      buffer = ''
    }
  }
  if (buffer) lines.push([start, buffer])
  return lines
}

function arg(name: string) {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? undefined : process.argv[index + 1]
}

async function fetchCaptions(id: string, cookies?: string) {
  const dir = mkdtempSync(join(tmpdir(), 'ytsub-'))
  try {
    const command = [
      'yt-dlp', '--skip-download', '--no-warnings', '--quiet',
      '--write-subs', '--write-auto-subs',
      '--sub-langs', languages.join(','), '--sub-format', 'json3',
      '-o', join(dir, '%(id)s'),
      ...(cookies ? ['--cookies', cookies] : []),
      `https://www.youtube.com/watch?v=${id}`,
    ]
    const proc = Bun.spawn(command, { stdout: 'pipe', stderr: 'pipe' })
    const [stderr, code] = await Promise.all([new Response(proc.stderr).text(), proc.exited])
    if (code !== 0) throw new Error(stderr.trim().split('\n').pop() || `yt-dlp exited ${code}`)

    const files = readdirSync(dir)
    for (const lang of languages) {
      const name = files.find((file) => file === `${id}.${lang}.json3`)
      if (name) return { lang, lines: parseJson3(readFileSync(join(dir, name), 'utf8')) }
    }
    return { lang: null, lines: [] as TranscriptLine[] }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

async function main() {
  const outDir = new URL('../src/data/video-transcripts/', import.meta.url).pathname
  mkdirSync(outDir, { recursive: true })

  const cookies = arg('cookies')
  const only = arg('id')
  const limit = Number(arg('limit') ?? Infinity)
  const delayMs = Number(arg('delay-ms') ?? 1500)
  const retryEmpty = process.argv.includes('--retry-empty')

  const todo = rawData.videos.filter((video) => {
    if (video.type !== 'youtube' || (only && video.id !== only)) return false
    const file = join(outDir, `${video.id}.json`)
    if (!existsSync(file)) return true
    return retryEmpty && JSON.parse(readFileSync(file, 'utf8')).lines.length === 0
  }).slice(0, limit)

  let saved = 0
  let empty = 0
  let failed = 0
  for (const [index, video] of todo.entries()) {
    try {
      const { lang, lines } = await fetchCaptions(video.id, cookies)
      await Bun.write(join(outDir, `${video.id}.json`), `${JSON.stringify({ lang, lines })}\n`)
      if (lines.length) saved += 1
      else empty += 1
    } catch (error) {
      failed += 1
      console.warn(`Skipping ${video.id}: ${error instanceof Error ? error.message : error}`)
    }
    if ((index + 1) % 25 === 0) console.log(`Processed ${index + 1}/${todo.length}`)
    await Bun.sleep(delayMs)
  }
  console.log(`Transcripts saved: ${saved}; no captions: ${empty}; failed: ${failed}`)
}

if (import.meta.main) await main()
