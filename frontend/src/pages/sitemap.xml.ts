import type { APIRoute } from 'astro';
import { getCachedSitemapChunks, renderSitemap, renderSitemapIndex } from '~/utils/sitemap';

export const GET: APIRoute = () => {
  const chunks = getCachedSitemapChunks();
  const body = chunks.length === 1 ? renderSitemap(chunks[0]) : renderSitemapIndex(chunks.length);

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
};
