/**
 * Refresh the checked-in video archive from the upstream pustaka-video crawler.
 *
 * Usage: bun scripts/crawl-videos.ts
 *
 * The crawler is intentionally kept independent from the Astro build. Builds
 * consume the checked-in JSON snapshot and never make network requests.
 */
const SOURCE_REPOSITORY = 'https://raw.githubusercontent.com/Taratsa/pustaka-video/main/src/data/wordpress-videos.json'
const outputPath = new URL('../src/data/wordpress-videos.json', import.meta.url)

const response = await fetch(SOURCE_REPOSITORY)
if (!response.ok) throw new Error(`Video dataset request failed: HTTP ${response.status}`)

const payload = await response.text()
const parsed = JSON.parse(payload)
if (!parsed || !Array.isArray(parsed.videos) || !Number.isInteger(parsed.totalPosts)) {
  throw new Error('Video dataset has an unexpected shape')
}

const ids = new Set<string>()
for (const video of parsed.videos) {
  if (!video || !['youtube', 'vimeo', 'video'].includes(video.type) || typeof video.id !== 'string' || !video.id) {
    throw new Error('Video dataset contains an invalid entry')
  }
  const key = `${video.type}:${video.id}`
  if (ids.has(key)) throw new Error(`Duplicate video entry: ${key}`)
  ids.add(key)
}

await Bun.write(outputPath, `${JSON.stringify(parsed, null, 2)}\n`)
console.log(`Wrote ${parsed.videos.length} videos from ${parsed.totalPosts} source posts`)
