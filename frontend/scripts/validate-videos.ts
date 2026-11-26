import rawData from '../src/data/wordpress-videos.json'

const videos = rawData.videos
const ids = new Set<string>()
const sourceUrls = new Set<string>()
for (const video of videos) {
  const key = `${video.type}:${video.id}`
  if (ids.has(key)) throw new Error(`Duplicate video entry: ${key}`)
  ids.add(key)
  const known = video.postId === 0
    ? video.sourceUrl.startsWith('https://www.youtube.com/watch?v=')
    : video.sourceUrl.startsWith('https://19651966perpustakaanonline.wordpress.com/')
  if (!known) {
    throw new Error(`Unexpected source URL: ${video.sourceUrl}`)
  }
  sourceUrls.add(video.sourceUrl.replace(/\/$/, ''))
}

console.log(`Videos: ${videos.length}`)
console.log(`Unique video IDs: ${ids.size}`)
console.log(`Source articles with videos: ${sourceUrls.size}`)
console.log(`Source posts: ${rawData.totalPosts}`)
