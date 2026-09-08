import type { APIRoute } from 'astro';
import { getAllBooks } from '~/data';
import { bookByPathSegment } from '~/utils/book-url';
import { fetchCoverDataUri, renderBookOgImage } from '~/utils/og-image';

const BACKEND_URL = process.env.BACKEND_URL || 'http://calibre-web-automated:8083';

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  const segment = params.id;
  if (!segment || /^\d+$/.test(segment)) return new Response(null, { status: 404 });

  const match = bookByPathSegment(segment);
  const book = match && getAllBooks().find((candidate) => candidate.id === match.id);
  if (!book || segment !== book.slug) return new Response(null, { status: 404 });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const coverDataUri = book.cover_url.startsWith('/cover')
      ? await fetchCoverDataUri(book.cover_url, BACKEND_URL, controller.signal)
      : null;
    const image = await renderBookOgImage(book, coverDataUri);

    return new Response(new Uint8Array(image), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(image.byteLength),
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Cloudflare-CDN-Cache-Control': 'public, max-age=86400',
        'ETag': `W/\"${book.id}-${book.last_modified || book.timestamp || 'current'}\"`,
      },
    });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    console.error(`Failed to generate OG image for book ${book.id}`, error);
    return new Response('Unable to generate image', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  } finally {
    clearTimeout(timeout);
  }
};
