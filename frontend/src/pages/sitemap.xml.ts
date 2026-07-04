import { getAllBooks, getAllAuthors, getAllSeries, getAllPublishers, getAllCategories, getAllLanguages, getShelves, PAGE_SIZE } from '~/data';
import type { BookSummary } from '~/data/types';

export async function GET() {
  const base = 'https://pustaka.taratsa.id';

  const books = getAllBooks();
  const authors = getAllAuthors();
  const series = getAllSeries();
  const publishers = getAllPublishers();
  const categories = getAllCategories();
  const languages = getAllLanguages();
  const shelves = getShelves();

  const totalPages = Math.max(1, Math.ceil(books.length / PAGE_SIZE));

  const urls: string[] = [
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

  for (let p = 1; p <= totalPages; p++) {
    urls.push(`${base}/page/${p}`);
  }

  for (const b of books) {
    urls.push(`${base}/book/${b.id}`);
  }

  for (const a of authors) {
    urls.push(`${base}/author/${a.id}`);
  }

  for (const s of series) {
    urls.push(`${base}/series/${s.id}`);
  }

  for (const p of publishers) {
    urls.push(`${base}/publisher/${p.id}`);
  }

  for (const c of categories) {
    urls.push(`${base}/category/${c.id}`);
  }

  for (const l of languages) {
    urls.push(`${base}/language/${l.lang_code}`);
  }

  for (const s of shelves) {
    urls.push(`${base}/shelf/${s.id}`);
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.map(url => `<url><loc>${url}</loc></url>`).join('\n  ')}
</urlset>`;

  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
