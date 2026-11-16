import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import MarkdownIt from 'markdown-it'
import index from './clippings.json'

/** Index row written by scripts/seed-clippings.mjs (published clippings only, newest first). */
export interface ClippingSummary {
  id: string
  /** Stable numeric alias; 0 when the clipping has none. `/kliping/<number>/` redirects to the id URL. */
  number: number
  title: string
  publication: string
  date: string
  issue: string
  page: string
  authors: string[]
  tags: string[]
  language: string
  source_url: string
  status: 'published'
  excerpt: string
}

export interface Clipping extends Omit<ClippingSummary, 'excerpt'> {
  body: string
}

export const clippings = index as ClippingSummary[]
export const PAGE_SIZE = 30

const dir = join(process.cwd(), 'src', 'data', 'clippings')

// Clipping text is admin-written but may be pasted from OCR or third-party sources: raw HTML stays escaped
// (html: false) and markdown-it's link validator rejects javascript:, vbscript: and data: URLs.
const md = new MarkdownIt({ html: false, linkify: false, breaks: true })
const defaultLinkOpen = md.renderer.rules.link_open
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet('rel', 'noopener noreferrer nofollow')
  tokens[idx].attrSet('target', '_blank')
  return defaultLinkOpen ? defaultLinkOpen(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options)
}

export function renderBody(body: string): string {
  return md.render(body)
}

/** Full clipping (with Markdown body) or null when the id is unknown or not published. */
export function getClipping(id: string): Clipping | null {
  if (!/^[a-z0-9][a-z0-9-]{0,119}$/.test(id)) return null
  try {
    return JSON.parse(readFileSync(join(dir, `${id}.json`), 'utf8')) as Clipping
  } catch {
    return null
  }
}

export function clippingPath(id: string): string {
  return `/kliping/${id}/`
}

/** Published clipping with this numeric alias, or null. */
export function clippingByNumber(number: number): ClippingSummary | null {
  return number > 0 ? (clippings.find((c) => c.number === number) ?? null) : null
}

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

/** `1998-05-05` -> "5 Mei 1998", `1998-05` -> "Mei 1998", `1998` -> "1998". */
export function formatDate(date: string): string {
  const [year, month, day] = date.split('-')
  if (!year) return ''
  if (!month) return year
  const name = MONTHS[Number(month) - 1]
  return day ? `${Number(day)} ${name} ${year}` : `${name} ${year}`
}
