import assert from 'node:assert/strict';
import books from '../src/data/books.json' with { type: 'json' };
import legacyBookSlugs from '../src/data/legacy-book-slugs.json' with { type: 'json' };
import bookSlugs from '../src/data/book-slugs.json' with { type: 'json' };

const booksById = new Map(books.map((book) => [book.id, book]));
const currentSlugs = new Set(books.map((book) => book.slug));

assert.equal(Object.keys(bookSlugs).length, books.length, 'book slug map must cover every book');
assert.equal(new Set(Object.values(bookSlugs)).size, books.length, 'book slugs must be unique');
for (const book of books) {
  assert.equal(bookSlugs[book.id], book.slug, `book slug map mismatch for book ${book.id}`);
}

for (const [slug, bookId] of Object.entries(legacyBookSlugs)) {
  const book = booksById.get(bookId);
  assert.ok(book, `legacy slug ${slug} points to missing book ${bookId}`);
  assert.notEqual(slug, book.slug, `legacy slug ${slug} is still canonical`);
  assert.ok(!currentSlugs.has(slug), `legacy slug ${slug} collides with a canonical slug`);
}

assert.equal(legacyBookSlugs['dengan-trikora-membebaskan-irian-barat'], 1885);
assert.equal(
  booksById.get(1885)?.slug,
  'dengan-trikora-membebaskan-irian-barat-s-anantaguna',
);

console.log(`validated ${Object.keys(legacyBookSlugs).length} legacy book slug aliases`);
