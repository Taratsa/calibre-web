import rawData from './wordpress-videos.json'

export type VideoSource = 'youtube' | 'vimeo' | 'video'

export interface CrawledVideo {
  type: VideoSource
  id: string
  title: string
  date: string
  sourceUrl: string
  postId: number
  context: string
  embedUrl: string
  watchUrl: string
  channel?: string
  channelUrl?: string
  providerTitle?: string
  thumbnailUrl?: string
}

export interface FilmVideo extends CrawledVideo {
  year: string
  thumbnail: string | null
  sourceLabel: string
  sourceDomain: string
  channel: string
  channelUrl: string
  providerTitle: string
}

const entities: Record<string, string> = {
  '&amp;': '&',
  '&nbsp;': ' ',
  '&quot;': '"',
  '&#039;': "'",
  '&#39;': "'",
  '&apos;': "'",
  '&lt;': '<',
  '&gt;': '>',
  '&#8211;': '–',
  '&#8212;': '—',
  '&#8216;': '‘',
  '&#8217;': '’',
  '&#8220;': '“',
  '&#8221;': '”',
  '&#8230;': '…',
  '&hellip;': '…',
  '&ldquo;': '“',
  '&rdquo;': '”',
  '&lsquo;': '‘',
  '&rsquo;': '’',
}

export function decodeEntities(value: string) {
  return value
    .replace(/&(?:amp|nbsp|quot|apos|lt|gt|hellip|ldquo|rdquo|lsquo|rsquo);|&#(?:039|39|8211|8212|8216|8217|8220|8221|8230);/gi, (match) => {
      const normalized = match.toLowerCase()
      const known = Object.entries(entities).find(([key]) => key.toLowerCase() === normalized)
      return known?.[1] ?? match
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, ' ')
    .trim()
}

function thumbnailFor(video: CrawledVideo) {
  if (video.type === 'youtube') return `https://i.ytimg.com/vi/${encodeURIComponent(video.id)}/hqdefault.jpg`
  if (video.type === 'vimeo') return `https://vumbnail.com/${encodeURIComponent(video.id)}.jpg`
  return null
}

function domainFor(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'Sumber eksternal'
  }
}

function labelFor(type: VideoSource) {
  if (type === 'youtube') return 'YouTube'
  if (type === 'vimeo') return 'Vimeo'
  return 'Video'
}

/**
 * Safety net against duplicates: keep only the first entry per video ID.
 * The crawler already de-duplicates, but the sitemap/HTML fallback path can
 * re-introduce a video if the same embed appears in more than one post.
 */
function dedupeById(items: FilmVideo[]) {
  const seen = new Set<string>()
  return items.filter((video) => {
    const key = `${video.type}:${video.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export const videos: FilmVideo[] = dedupeById(
  (rawData.videos as CrawledVideo[]).map((video) => ({
    ...video,
    title: decodeEntities(video.title) || 'Video tanpa judul',
    year: video.date?.slice(0, 4) || '—',
    thumbnail: video.thumbnailUrl || thumbnailFor(video),
    sourceLabel: labelFor(video.type),
    sourceDomain: domainFor(video.sourceUrl),
    channel: video.channel || 'Kanal tidak tersedia',
    channelUrl: video.channelUrl || video.watchUrl,
    providerTitle: decodeEntities(video.providerTitle || video.title),
  })),
)

export const totalPosts = rawData.totalPosts
export const pageSize = 12
export const totalPages = Math.ceil(videos.length / pageSize)
