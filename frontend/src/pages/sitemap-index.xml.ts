import type { APIRoute } from 'astro';
import { SITE_URL } from '~/utils/sitemap';

export const GET: APIRoute = () => new Response(null, {
  status: 308,
  headers: {
    Location: `${SITE_URL}/sitemap.xml`,
    'Cache-Control': 'public, max-age=86400',
  },
});
