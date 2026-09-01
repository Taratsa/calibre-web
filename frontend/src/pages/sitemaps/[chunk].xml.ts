import type { APIRoute } from 'astro';
import { getCachedSitemapChunks, renderSitemap } from '~/utils/sitemap';

export const GET: APIRoute = ({ params }) => {
  const chunkNumber = Number(params.chunk);
  if (!Number.isSafeInteger(chunkNumber) || chunkNumber < 0) {
    return new Response(null, { status: 404 });
  }

  const chunk = getCachedSitemapChunks()[chunkNumber];
  if (!chunk) return new Response(null, { status: 404 });

  return new Response(renderSitemap(chunk), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
};
