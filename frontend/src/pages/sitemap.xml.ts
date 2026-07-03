export async function GET() {
  const base = 'https://pustaka.taratsa.id';

  const staticPages = [
    base,
    `${base}/author`,
    `${base}/series`,
    `${base}/publisher`,
    `${base}/category`,
    `${base}/language`,
    `${base}/formats`,
    `${base}/ratings`,
    `${base}/shelf`,
    `${base}/search`,
  ];

  const dynamic = import.meta.glob('./book/[id].astro', { eager: true, query: '?url' });
  for (const [, v] of Object.entries(dynamic)) {
    staticPages.push(`${base}${(v as { url: string }).url}`);
  }

  const urls = [...new Set(staticPages)].map(url => `  <url><loc>${url}</loc></url>`).join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
