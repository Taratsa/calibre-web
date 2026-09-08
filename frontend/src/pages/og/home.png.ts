import type { APIRoute } from 'astro';
import { renderBookOgImage } from '~/utils/og-image';
import type { BookSummary } from '~/data/types';

const homeCard: BookSummary = {
  id: 0,
  title: 'Pustaka Taratsa',
  slug: 'home',
  authors: [],
  author_sort: null,
  tags: ['Buku langka', 'Zine', 'Literatur Indonesia'],
  publisher: null,
  publishers: [],
  languages: ['id'],
  pubdate: null,
  timestamp: null,
  last_modified: null,
  series: null,
  identifiers: [],
  formats: [],
  cover_url: '/static/images/Header_Beranda.webp',
  cover_og_url: '/static/images/Header_Beranda.webp',
  url: '/',
  rating: null,
};

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const image = await renderBookOgImage(homeCard, null);
    return new Response(new Uint8Array(image), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(image.byteLength),
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Cloudflare-CDN-Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Failed to generate homepage OG image', error);
    return new Response('Unable to generate image', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
};
