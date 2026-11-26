/**
 * Add the videos of the Arsip Mei 1998 catalogue (https://1998.logosid.app/katalog.html?k=Video)
 * to src/data/wordpress-videos.json as `collection: "mei-1998"` entries.
 *
 * Usage: bun scripts/import-mei98-videos.ts
 *
 * Only the catalogue's selection is taken from Logos (video ID, title, date of the
 * footage). Playback, thumbnail, channel and description come from the source itself:
 * YouTube oEmbed for `v.yt`, the archive.org metadata API for `v.ia`. The page embeds
 * youtube-nocookie.com / archive.org and links there, never to Logos.
 * YouTube descriptions still need `bun run enrich:video-descriptions -- --collection mei-1998`.
 *
 * Idempotent: entries of this collection are rebuilt each run; a video that is already
 * present from another collection is skipped. Internet Archive items that are not public
 * movies (e.g. the audio item in the catalogue) are reported and left out.
 */
const CATALOGUE = 'https://1998.logosid.app/data/items.json'
const COLLECTION = 'mei-1998'
const outputPath = new URL('../src/data/wordpress-videos.json', import.meta.url)

interface CatalogueItem {
  k?: string
  t: string
  d?: string
  u?: string
  v?: { yt?: string; ia?: string; noembed?: number }
}

interface ArchiveMetadata {
  is_dark?: boolean
  metadata?: {
    mediatype?: string
    'access-restricted-item'?: string
    title?: string
    creator?: string | string[]
    description?: string | string[]
  }
}

function plainText(value: string) {
  return value
    .replace(/<\/?(?:br|div|p|li)\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

async function archiveInfo(id: string) {
  const res = await fetch(`https://archive.org/metadata/${encodeURIComponent(id)}`)
  if (!res.ok) throw new Error(`metadata HTTP ${res.status}`)
  const info = (await res.json()) as ArchiveMetadata
  const meta = info.metadata ?? {}
  if (info.is_dark || meta.mediatype !== 'movies' || meta['access-restricted-item'] === 'true') {
    return null
  }
  const description = Array.isArray(meta.description) ? meta.description.join(' ') : meta.description
  return {
    channel: (Array.isArray(meta.creator) ? meta.creator.join(', ') : meta.creator)?.trim(),
    description: description ? plainText(description) : undefined,
  }
}

// Logos sits behind a Cloudflare challenge that rejects the default fetch user agent.
const response = await fetch(CATALOGUE, { headers: { 'User-Agent': 'Mozilla/5.0' } })
if (!response.ok) throw new Error(`Catalogue request failed: HTTP ${response.status}`)
const items = (await response.json()) as CatalogueItem[]
if (!Array.isArray(items)) throw new Error('Catalogue has an unexpected shape')

const data = JSON.parse(await Bun.file(outputPath).text())
const kept = (data.videos as Array<{ type: string; id: string; collection?: string }>).filter((video) => video.collection !== COLLECTION)
const taken = new Set(kept.map((video) => `${video.type}:${video.id}`))

const added: Array<Record<string, string | number | boolean>> = []
for (const item of items) {
  // The catalogue files standalone clips as "Video" and footage uploaded to an archive as "Audio/video".
  if (item.k !== 'Video' && item.k !== 'Audio/video') continue
  const archiveId = item.v?.ia
  const youtubeId = item.v?.yt ?? /(?:[?&]v=|youtu\.be\/)([\w-]{11})/.exec(item.u ?? '')?.[1]
  const type = archiveId ? 'archive' : youtubeId ? 'youtube' : null
  const id = archiveId ?? youtubeId
  if (!type || !id) {
    console.warn(`Skipping "${item.t}": no video ID`)
    continue
  }
  const key = `${type}:${id}`
  if (taken.has(key)) continue
  taken.add(key)
  const detailsUrl = type === 'archive' ? `https://archive.org/details/${id}` : `https://www.youtube.com/watch?v=${id}`
  added.push({
    type,
    id,
    title: item.t,
    date: item.d ?? '',
    sourceUrl: detailsUrl,
    postId: 0,
    context: '',
    embedUrl: type === 'archive' ? `https://archive.org/embed/${id}` : `https://www.youtube.com/embed/${id}`,
    watchUrl: detailsUrl,
    collection: COLLECTION,
    ...(item.v?.noembed ? { embeddable: false } : {}),
  })
}

// Channel, canonical title, thumbnail and description from the source itself.
let enriched = 0
const unavailable = new Set<string>()
for (const video of added) {
  const id = String(video.id)
  try {
    if (video.type === 'archive') {
      const info = await archiveInfo(id)
      if (!info) {
        unavailable.add(id)
        console.warn(`Skipping ${id}: not a public archive.org movie`)
        continue
      }
      video.channel = info.channel ?? 'Internet Archive'
      video.channelUrl = `https://archive.org/details/${id}`
      video.thumbnailUrl = `https://archive.org/services/img/${id}`
      if (info.description) video.providerDescription = info.description
    } else {
      const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(String(video.watchUrl))}&format=json`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const meta = (await res.json()) as Record<string, unknown>
      if (typeof meta.author_name === 'string') video.channel = meta.author_name.trim()
      if (typeof meta.author_url === 'string') video.channelUrl = meta.author_url
      if (typeof meta.title === 'string') video.providerTitle = meta.title.trim()
      if (typeof meta.thumbnail_url === 'string') video.thumbnailUrl = meta.thumbnail_url
    }
    enriched += 1
  } catch (error) {
    console.warn(`${video.type} metadata failed for ${id}: ${error instanceof Error ? error.message : error}`)
  }
  await Bun.sleep(120)
}

const usable = added.filter((video) => !unavailable.has(String(video.id)))
await Bun.write(outputPath, `${JSON.stringify({ ...data, videos: [...kept, ...usable] }, null, 2)}\n`)
console.log(`Added ${usable.length} videos (${enriched} enriched, ${unavailable.size} skipped; ${kept.length} others kept)`)
