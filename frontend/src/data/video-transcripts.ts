import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface VideoTranscript {
  lang: string | null
  /** [startSeconds, text] paragraphs */
  lines: Array<[number, string]>
}

const dir = join(process.cwd(), 'src', 'data', 'video-transcripts')

/** Returns the transcript for a video ID, or null when none was fetched or it has no captions. */
export function getTranscript(id: string): VideoTranscript | null {
  if (!/^[\w-]+$/.test(id)) return null
  try {
    const transcript = JSON.parse(readFileSync(join(dir, `${id}.json`), 'utf8')) as VideoTranscript
    return transcript.lines.length ? transcript : null
  } catch {
    return null
  }
}

export function formatTimestamp(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}
