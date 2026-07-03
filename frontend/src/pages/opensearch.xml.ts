export async function GET() {
  const base = 'https://pustaka.taratsa.id';
  const instance = 'Pustaka Taratsa';
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>${instance}</ShortName>
  <Description>Search ${instance} Indonesian rare books, zines, and open access ebooks</Description>
  <Url type="text/html" method="get" template="${base}/search?q={searchTerms}"/>
  <Image>${base}/favicon.ico</Image>
  <InputEncoding>UTF-8</InputEncoding>
  <OutputEncoding>UTF-8</OutputEncoding>
</OpenSearchDescription>`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
