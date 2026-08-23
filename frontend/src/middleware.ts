import { defineMiddleware } from 'astro:middleware';

const HTML_CACHE_CONTROL = 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400, stale-if-error=604800';

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  const contentType = response.headers.get('Content-Type') || '';
  if (context.url.pathname.startsWith('/read/')) {
    response.headers.set('Cache-Control', 'private, no-store');
  } else if (context.request.method === 'GET' && response.status === 200 && contentType.includes('text/html')) {
    response.headers.set('Cache-Control', HTML_CACHE_CONTROL);
  }
  return response;
});
