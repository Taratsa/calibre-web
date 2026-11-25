import { defineMiddleware } from 'astro:middleware';

const HTML_CACHE_CONTROL = 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400, stale-if-error=604800';
// RFC 8288 / RFC 9727 s3: agent discovery on the homepage. Same targets as the <link>
// tags in BaseLayout.astro; the routes are served by Flask (cps/web.py, /.well-known/*).
const HOME_LINK_HEADER = [
  '</.well-known/api-catalog>; rel="api-catalog"',
  '</opds>; rel="service-desc"',
  '</.well-known/agent-skills/index.json>; rel="service-doc"',
  '</.well-known/mcp/server-card.json>; rel="describedby"',
].join(', ');

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  const contentType = response.headers.get('Content-Type') || '';
  if (context.url.pathname.startsWith('/read/')) {
    response.headers.set('Cache-Control', 'private, no-store');
  } else if (context.request.method === 'GET' && response.status === 200 && contentType.includes('text/html')) {
    response.headers.set('Cache-Control', HTML_CACHE_CONTROL);
  }
  if (context.url.pathname === '/' && context.request.method === 'GET' && response.status === 200) {
    response.headers.set('Link', HOME_LINK_HEADER);
  }
  return response;
});
