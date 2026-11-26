/**
 * Add the videos of the Arsip Mei 1998 catalogue (https://1998.logosid.app/katalog.html?k=Video)
 * to src/data/wordpress-videos.json as `collection: "mei-1998"` entries.
 *
 * Usage: bun scripts/import-mei98-videos.ts
 *
 * Only the catalogue's selection is taken from Logos (YouTube ID, title, date of the
 * footage). Playback, thumbnail, channel and title come from YouTube itself (oEmbed):
 * the page embeds youtube-nocookie.com and links to youtube.com, never to Logos.
 * Afterwards run `bun run enrich:video-descriptions` to fill the descriptions.
 *
 * Idempotent: entries of this collection are rebuilt each run; a video that is already
 * present from another collection is skipped.
 */
const CATALOGUE = 'https://1998.logosid.app/data/items.json'
const COLLECTION = 'mei-1998'
const outputPath = new URL('../src/data/wordpress-videos.json', import.meta.url)

interface CatalogueItem {
  k?: string
  t: string
  d?: string
  u?: string
  v?: { yt?: string; noembed?: number }
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
  if (item.k !== 'Video') continue
  const id = item.v?.yt ?? /(?:[?&]v=|youtu\.be\/)([\w-]{11})/.exec(item.u ?? '')?.[1]
  if (!id) {
    console.warn(`Skipping "${item.t}": no YouTube ID`)
    continue
  }
  const key = `youtube:${id}`
  if (taken.has(key)) continue
  taken.add(key)
  added.push({
    type: 'youtube',
    id,
    title: item.t,
    date: item.d ?? '',
    sourceUrl: `https://www.youtube.com/watch?v=${id}`,
    postId: 0,
    context: '',
    embedUrl: `https://www.youtube.com/embed/${id}`,
    watchUrl: `https://www.youtube.com/watch?v=${id}`,
    collection: COLLECTION,
    ...(item.v?.noembed ? { embeddable: false } : {}),
  })
}

// Channel, canonical title and thumbnail straight from YouTube.
let enriched = 0
for (const video of added) {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(String(video.watchUrl))}&format=json`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const meta = (await res.json()) as Record<string, unknown>
    if (typeof meta.author_name === 'string') video.channel = meta.author_name.trim()
    if (typeof meta.author_url === 'string') video.channelUrl = meta.author_url
    if (typeof meta.title === 'string') video.providerTitle = meta.title.trim()
    if (typeof meta.thumbnail_url === 'string') video.thumbnailUrl = meta.thumbnail_url
    enriched += 1
  } catch (error) {
    console.warn(`oEmbed failed for ${video.id}: ${error instanceof Error ? error.message : error}`)
  }
  await Bun.sleep(120)
}

await Bun.write(outputPath, `${JSON.stringify({ ...data, videos: [...kept, ...added] }, null, 2)}\n`)
console.log(`Added ${added.length} videos (${enriched} with YouTube metadata, ${kept.length} others kept)`)
