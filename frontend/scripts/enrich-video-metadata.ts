import rawData from '../src/data/wordpress-videos.json'

const outputPath = new URL('../src/data/wordpress-videos.json', import.meta.url)
const userAgent = 'pustaka-taratsa-video-metadata/1.0'
const delayMs = 120
const metadata = new Map<string, { channel: string; channelUrl: string; providerTitle?: string; thumbnailUrl?: string }>()
let enriched = 0
let failed = 0

for (const [index, video] of rawData.videos.entries()) {
  const endpoint = video.type === 'youtube'
    ? `https://www.youtube.com/oembed?url=${encodeURIComponent(video.watchUrl)}&format=json`
    : video.type === 'vimeo'
      ? `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(video.watchUrl)}`
      : null
  if (!endpoint) continue

  let value: Record<string, unknown> | undefined
  for (let attempt = 1; attempt <= 3 && !value; attempt += 1) {
    try {
      const response = await fetch(endpoint, { headers: { 'User-Agent': userAgent } })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      value = await response.json() as Record<string, unknown>
    } catch (error) {
      if (attempt === 3) {
        failed += 1
        console.warn(`Skipping ${video.type}:${video.id}: ${error instanceof Error ? error.message : error}`)
      } else {
        await Bun.sleep(500 * attempt)
      }
    }
  }

  if (value && typeof value.author_name === 'string' && value.author_name.trim()) {
    metadata.set(`${video.type}:${video.id}`, {
      channel: value.author_name.trim(),
      channelUrl: typeof value.author_url === 'string' ? value.author_url : video.watchUrl,
      providerTitle: typeof value.title === 'string' ? value.title.trim() : undefined,
      thumbnailUrl: typeof value.thumbnail_url === 'string' ? value.thumbnail_url : undefined,
    })
    enriched += 1
  }
  if ((index + 1) % 50 === 0) console.log(`Processed ${index + 1}/${rawData.videos.length}`)
  await Bun.sleep(delayMs)
}

const videos = rawData.videos.map((video) => {
  const value = metadata.get(`${video.type}:${video.id}`)
  return value ? { ...video, ...value } : video
})
await Bun.write(outputPath, `${JSON.stringify({ ...rawData, videos }, null, 2)}\n`)
console.log(`Wrote ${enriched}/${videos.length} provider metadata records; ${failed} failed`)
