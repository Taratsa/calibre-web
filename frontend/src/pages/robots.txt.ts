import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const site = 'https://pustaka.taratsa.id';
  const body = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /ajax/
Disallow: /send/
Disallow: /me

Content-Signal: ai-train=yes, search=yes, ai-input=yes

  Sitemap: ${site}/sitemap-index.xml`;
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
