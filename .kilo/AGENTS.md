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