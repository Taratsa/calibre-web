import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import satori from 'satori';
import sharp from 'sharp';
import type { BookSummary } from '~/data/types';

const require = createRequire(import.meta.url);
const WIDTH = 1200;
const HEIGHT = 630;
const MAX_COVER_BYTES = 5 * 1024 * 1024;

const fonts = [
  {
    name: 'Noto Sans',
    data: readFileSync(require.resolve('@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff')),
    weight: 400 as const,
    style: 'normal' as const,
  },
  {
    name: 'Noto Sans',
    data: readFileSync(require.resolve('@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff')),
    weight: 700 as const,
    style: 'normal' as const,
  },
];

type SatoriElement = {
  type: string;
  props: Record<string, unknown>;
};

function element(type: string, props: Record<string, unknown>): SatoriElement {
  return { type, props };
}

function text(value: string, style: Record<string, unknown>): SatoriElement {
  return element('div', { style, children: value });
}

function trimText(value: string, maxLength: number): string {
  const normalized = value.trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 1).trimEnd()}…`
    : normalized;
}

function coverElement(book: BookSummary, coverDataUri: string | null): SatoriElement {
  if (coverDataUri) {
    return element('img', {
      src: coverDataUri,
      width: 340,
      height: 534,
      style: { width: 340, height: 534, objectFit: 'cover' },
    });
  }

  return element('div', {
    style: {
      width: 340,
      height: 534,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#e5e7eb',
      color: '#6b7280',
      fontSize: 72,
      fontWeight: 700,
    },
    children: trimText(book.title, 2).toUpperCase(),
  });
}

export function bookOgTemplate(book: BookSummary, coverDataUri: string | null): SatoriElement {
  const authors = book.authors.map((author) => author.name).join(' · ');
  const tags = book.tags.slice(0, 3).join(' · ');

  return element('div', {
    style: {
      width: '100%',
      height: '100%',
      display: 'flex',
      padding: 48,
      backgroundColor: '#fafaf7',
      color: '#1f1f1f',
      fontFamily: 'Noto Sans',
    },
    children: [
      element('div', {
        style: {
          width: 340,
          height: 534,
          display: 'flex',
          flexShrink: 0,
          overflow: 'hidden',
          borderRadius: 8,
          backgroundColor: '#e5e7eb',
        },
        children: coverElement(book, coverDataUri),
      }),
      element('div', {
        style: {
          width: 716,
          height: 534,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          marginLeft: 48,
          paddingTop: 8,
          paddingBottom: 8,
        },
        children: [
          text('PUSTAKA TARATSA', {
            color: '#b91c1c',
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 2,
          }),
          element('div', {
            style: {
              display: 'flex',
              flexDirection: 'column',
              flexGrow: 1,
              justifyContent: 'center',
              paddingTop: 24,
              paddingBottom: 24,
            },
            children: [
              text(trimText(book.title, 115), {
                fontSize: 44,
                lineHeight: 1.12,
                fontWeight: 700,
              }),
              authors
                ? text(trimText(authors, 110), {
                    marginTop: 24,
                    color: '#4b5563',
                    fontSize: 24,
                    lineHeight: 1.2,
                  })
                : null,
            ].filter((child): child is SatoriElement => child !== null),
          }),
          element('div', {
            style: {
              display: 'flex',
              flexDirection: 'column',
              paddingTop: 20,
              borderTopWidth: 2,
              borderTopStyle: 'solid',
              borderTopColor: '#e5e7eb',
            },
            children: [
              text(tags ? trimText(tags, 105) : 'Perpustakaan digital non-komersil', {
                color: '#6b7280',
                fontSize: 18,
                lineHeight: 1.2,
              }),
              text('pustaka.taratsa.id', {
                marginTop: 10,
                color: '#b91c1c',
                fontSize: 18,
                fontWeight: 700,
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

export async function renderBookOgImage(book: BookSummary, coverDataUri: string | null): Promise<Buffer> {
  const svg = await satori(bookOgTemplate(book, coverDataUri) as never, {
    width: WIDTH,
    height: HEIGHT,
    fonts,
  });

  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function fetchCoverDataUri(
  coverPath: string,
  backendUrl: string,
  signal: AbortSignal,
): Promise<string | null> {
  const coverUrl = new URL(coverPath, backendUrl);
  const response = await fetch(coverUrl, { signal });
  if (!response.ok) return null;

  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_COVER_BYTES) return null;

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_COVER_BYTES) return null;

  const contentType = response.headers.get('content-type')?.split(';', 1)[0] || 'image/webp';
  if (!contentType.startsWith('image/')) return null;

  // Satori's SVG renderer does not reliably decode WebP data URIs. Normalize
  // the WebP covers served by Flask to PNG before embedding them.
  if (contentType === 'image/webp') {
    try {
      const pngBytes = await sharp(Buffer.from(bytes)).png().toBuffer();
      return `data:image/png;base64,${pngBytes.toString('base64')}`;
    } catch {
      return null;
    }
  }

  return `data:${contentType};base64,${Buffer.from(bytes).toString('base64')}`;
}
