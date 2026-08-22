import rawData from '../src/data/wordpress-videos.json'

const outputPath = new URL('../src/data/wordpress-videos.json', import.meta.url)
const userAgent = 'pustaka-taratsa-video-metadata/1.0'
const concurrency = 12
const metadata = new Map<string, { providerTitle?: string; providerDescription?: string }>()
const videos = rawData.videos.filter((video) => video.type === 'youtube' && (!video.providerDescription || !video.providerTitle))
let cursor = 0
let enriched = 0
let failed = 0

function textFromRuns(value: unknown) {
  if (!value || typeof value !== 'object') return ''
  const runs = (value as { runs?: unknown }).runs
  if (!Array.isArray(runs)) return ''
  return runs.map((run) => (
    run && typeof run === 'object' && typeof (run as { text?: unknown }).text === 'string'
      ? (run as { text: string }).text
      : ''
  )).join('')
}

function findMetadata(node: unknown): { providerTitle?: string; providerDescription?: string } {
  if (!node || typeof node !== 'object') return {}
  if (Array.isArray(node)) {
    return node.reduce((found, item) => ({ ...found, ...findMetadata(item) }), {})
  }

  const object = node as Record<string, unknown>
  const result: { providerTitle?: string; providerDescription?: string } = {}
  const header = object.videoDescriptionHeaderRenderer
  if (header && typeof header === 'object') {
    const title = textFromRuns((header as Record<string, unknown>).title)
    if (title) result.providerTitle = title
  }
  const expandable = object.expandableVideoDescriptionBodyRenderer
  if (expandable && typeof expandable === 'object') {
    const body = expandable as Record<string, unknown>
    const attributed = body.attributedDescription
    const content = attributed && typeof attributed === 'object' ? (attributed as { content?: unknown }).content : undefined
    if (typeof content === 'string' && content.trim()) result.providerDescription = content.trim()
  }
  for (const value of Object.values(object)) {
    const nested = findMetadata(value)
    if (!result.providerTitle && nested.providerTitle) result.providerTitle = nested.providerTitle
    if (!result.providerDescription && nested.providerDescription) result.providerDescription = nested.providerDescription
    if (result.providerTitle && result.providerDescription) break
  }
  return result
}

async function enrich(video: (typeof rawData.videos)[number]) {
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-US,en;q=0.9' },
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const html = await response.text()
    const match = html.match(/var ytInitialData = (\{.*?\});<\/script>/s)
    if (!match) throw new Error('YouTube initial data unavailable')
    const value = findMetadata(JSON.parse(match[1]))
    if (!value.providerTitle && !value.providerDescription) throw new Error('YouTube metadata unavailable')
    metadata.set(`${video.type}:${video.id}`, value)
    enriched += 1
  } catch (error) {
    failed += 1
    console.warn(`Skipping ${video.id}: ${error instanceof Error ? error.message : error}`)
  }
}

async function worker() {
  while (cursor < videos.length) {
    const video = videos[cursor]
    cursor += 1
    await enrich(video)
    if ((enriched + failed) % 50 === 0) console.log(`Processed ${enriched + failed}/${videos.length}`)
  }
}

await Promise.all(Array.from({ length: concurrency }, worker))
const output = rawData.videos.map((video) => {
  const value = metadata.get(`${video.type}:${video.id}`)
  return value ? { ...video, ...value } : video
})
await Bun.write(outputPath, `${JSON.stringify({ ...rawData, videos: output }, null, 2)}\n`)
console.log(`Wrote YouTube metadata for ${enriched} records; ${failed} failed`)
