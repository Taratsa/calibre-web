# Calibre-Web Fork Notes

## Repository Info
- This is a forked repository from upstream (https://github.com/janeczku/calibre-web)
- Branch: `taratsa` (custom modifications for Taratsa deployment)

## Upstream Sync
- When syncing from upstream, committed changes are preserved
- If upstream modifies the same lines, merge conflicts may occur and need manual resolution
- DO NOT use `git reset --hard upstream/main` - this will wipe local modifications
- Safe sync: `git fetch upstream && git merge upstream/main`

## Important Notes

### Modified Files
- `cps/helper.py` - Server-side Umami analytics tracking for direct downloads
- `cps/web.py` - Added trailing slash route for book detail pages (`/book/<id>/<slug>/`)
- `cps/templates/layout.html` - Frontend Umami tracking for file downloads, PDF reads
- `cps/templates/detail.html` - Fixed JSON-LD structured data, added canonical URL
- `cps/templates/author.html` - Fixed JSON-LD structured data

### Key Features
- Umami analytics tracking for downloads (browser-based via data attributes + server-side)
- Events tracked: `file-download`, `pdf-read`, `pdf-download`, `direct-download`
- Canonical URL on book detail pages: `/book/<id>` (without slug)
- Structured data fixes to prevent Google Search parsing errors

### Structured Data (JSON-LD)

#### Book Pages (`cps/templates/detail.html`)
Book pages include Schema.org Book structured data:
- `url` - Book page URL
- `name` - Book title
- `author` - Array of Person objects with `@type` and `name`
- `image` - Cover image URL
- `inLanguage` - Language code (e.g., "id")
- `description` - From comments or fallback "title by author (publisher)"
- `isbn` - When available
- `datePublished` - Publication date
- `publisher` - Publisher name
- `bookFormat` - EBook for EPUB formats, Book for PDF/others
- `aggregateRating` - When ratings exist (ratingValue, bestRating, worstRating, ratingCount)

#### Author Pages (`cps/templates/author.html`)
Author pages include Schema.org Person structured data:
- `name` - Author name (cleaned of "Author: " prefix)
- `image` - Author photo URL
- `description` - Author bio (from safe_about)
- `sameAs` - Goodreads link
- `url` - Author page URL

### SEO Guidelines
- All book pages have canonical URLs
- Open Graph meta tags for social sharing
- Twitter card meta tags
- book:author, book:publisher, book:release_date, book:isbn Open Graph meta

### Caching Configuration

#### Book Downloads
- **Cache-Control**: `public, max-age=2592000` (1 month)
- Applied in `cps/helper.py` in `get_download_link()` function
- Cloudflare CDN caches book files for 1 month after first download

#### Recommended Cloudflare Cache Rules
For optimal CDN performance, configure in Cloudflare dashboard:

**PDF/Ebook files** (`/download/*/pdf/*`, `/download/*/epub/*`):
- Edge TTL: 1 month
- Browser TTL: 1 month
- Cache Key: Include query strings

**Cover images** (`/cover/*`):
- Edge TTL: 1 week
- Browser TTL: 1 day
- Already uses `c=timestamp` query string for cache busting

#### Current Caching Status (verified via curl)
- Book downloads: `Cache-Control: max-age=2592000`, `cf-cache-status: HIT/EXPIRED`
- Cover images: Dynamic (no cache headers from app, relies on Cloudflare defaults)