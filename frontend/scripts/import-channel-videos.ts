/**
 * Add every video of a YouTube channel to src/data/wordpress-videos.json as a collection.
 *
 * Usage: bun scripts/import-channel-videos.ts --channel @jakartanicus --collection jakartanicus
 *                                              [--no-streams] [--limit N] [--delay-ms 2000]
 *
 * The channel's Videos and Live tabs are listed with `yt-dlp --flat-playlist` (works from this server;
 * only watching/subtitles is bot-checked). That listing has no exact dates, so each new video's watch page
 * is read for the publish date and description (`ytInitialData`, same source as enrich-video-descriptions.ts).
 *
 * Resumable and idempotent: a video is written only once its date is known, ids already present in the
 * file (from any collection) are skipped, and the file is saved every 25 videos and on a 429/stop, so
 * running it again continues where it stopped.
 */
const outputPath = new URL('../src/data/wordpress-videos.json', import.meta.url)

function flag(name: string) {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? undefined : process.argv[index + 1]
}
const channel = flag('channel')
const collection = flag('collection')
if (!channel?.startsWith('@') || !collection) throw new Error('Usage: --channel @handle --collection name')
const includeStreams = !process.argv.includes('--no-streams')
const limit = Number(flag('limit') ?? Infinity)
const delayMs = Number(flag('delay-ms') ?? 2000)
const maxDescription = 1500

const MONTHS: Record<string, string> = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' }

async function list(tab: string) {
  const proc = Bun.spawn(['yt-dlp', '--flat-playlist', '--no-warnings', '--print', '%(id)s\t%(title)s', `https://www.youtube.com/${channel}/${tab}`], { stdout: 'pipe', stderr: 'pipe' })
  const [out, err, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited])
  if (code !== 0) throw new Error(`yt-dlp ${tab} failed: ${err.trim().split('\n').pop()}`)
  return out.trim().split('\n').filter(Boolean).map((line: string) => {
    const [id, ...title] = line.split('\t')
    return { id, title: title.join('\t').trim() }
  })
}

function textOf(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  const value = node as { simpleText?: unknown; runs?: unknown }
  if (typeof value.simpleText === 'string') return value.simpleText
  return Array.isArray(value.runs) ? value.runs.map((run) => (run && typeof run === 'object' && 'text' in run ? String(run.text) : '')).join('') : ''
}

/** Walks ytInitialData for the description header (publish date) and body (description). */
function findDetails(node: unknown, found: { date?: string; description?: string } = {}) {
  if (!node || typeof node !== 'object') return found
  if (Array.isArray(node)) {
    for (const item of node) findDetails(item, found)
    return found
  }
  const object = node as Record<string, unknown>
  const header = object.videoDescriptionHeaderRenderer
  if (!found.date && header && typeof header === 'object' && 'publishDate' in header) {
    const match = /([A-Z][a-z]{2}) (\d{1,2}), (\d{4})/.exec(textOf(header.publishDate))
    if (match && MONTHS[match[1]]) found.date = `${match[3]}-${MONTHS[match[1]]}-${match[2].padStart(2, '0')}`
  }
  const body = object.expandableVideoDescriptionBodyRenderer
  if (!found.description && body && typeof body === 'object' && 'attributedDescription' in body) {
    const attributed = body.attributedDescription
    if (attributed && typeof attributed === 'object' && 'content' in attributed && typeof attributed.content === 'string') found.description = attributed.content.trim()
  }
  for (const value of Object.values(object)) {
    if (found.date && found.description) break
    findDetails(value, found)
  }
  return found
}

class RateLimited extends Error {}

async function details(id: string) {
  const response = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-US,en;q=0.9' },
  })
  if (response.status === 429) throw new RateLimited()
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const match = (await response.text()).match(/var ytInitialData = (\{.*?\});<\/script>/s)
  if (!match) throw new Error('no ytInitialData')
  return findDetails(JSON.parse(match[1]))
}

const data = JSON.parse(await Bun.file(outputPath).text())
const known = new Set<string>((data.videos as Array<{ type: string; id: string }>).map((video) => `${video.type}:${video.id}`))

const listed = [...(await list('videos')), ...(includeStreams ? await list('streams') : [])]
const todo = listed.filter((video, index) => !known.has(`youtube:${video.id}`) && listed.findIndex((other) => other.id === video.id) === index).slice(0, limit)
console.log(`${listed.length} listed, ${todo.length} to fetch`)

const channelUrl = `https://www.youtube.com/${channel}`
let added = 0
let failed = 0
const save = () => Bun.write(outputPath, `${JSON.stringify(data, null, 2)}\n`)

for (const [index, video] of todo.entries()) {
  let info: { date?: string; description?: string } | undefined
  for (let attempt = 1; attempt <= 3 && !info; attempt += 1) {
    try {
      info = await details(video.id)
    } catch (error) {
      if (error instanceof RateLimited) {
        console.warn(`429 at ${index}/${todo.length}; waiting 90s`)
        await Bun.sleep(90_000)
      } else {
        console.warn(`${video.id}: ${error instanceof Error ? error.message : error}`)
        break
      }
    }
  }
  if (!info?.date) {
    failed += 1
    if (!info && failed >= 5 && failed === index + 1) break // nothing works: stop instead of hammering
  } else {
    const watch = `https://www.youtube.com/watch?v=${video.id}`
    data.videos.push({
      type: 'youtube',
      id: video.id,
      title: video.title,
      date: info.date,
      sourceUrl: watch,
      postId: 0,
      context: '',
      embedUrl: `https://www.youtube.com/embed/${video.id}`,
      watchUrl: watch,
      collection,
      channel: channel.slice(1).replace(/^./, (c: string) => c.toUpperCase()),
      channelUrl,
      providerTitle: video.title,
      ...(info.description ? { providerDescription: info.description.slice(0, maxDescription) } : {}),
    })
    added += 1
  }
  if ((index + 1) % 25 === 0) {
    await save()
    console.log(`Processed ${index + 1}/${todo.length} (${added} added, ${failed} without date)`)
  }
  await Bun.sleep(delayMs)
}

await save()
console.log(`Added ${added} videos; ${failed} not added (rerun to retry); ${known.size} were already present`)
