import { liveSearch, renderCards } from './search';

let installed = false;

export function setupLiveSearch(): void {
  if (installed) return;

  const root = document.querySelector('.search-page');
  if (!root) return;
  installed = true;

  const input = root.querySelector<HTMLInputElement>('input[name="q"]');
  const form = root.querySelector<HTMLFormElement>('form[role="search"]');
  const status = document.getElementById('search-status');
  const results = document.getElementById('search-results');
  const empty = document.getElementById('search-empty');
  const grid = results?.querySelector<HTMLElement>('.book-grid');

  if (!input || !form || !results || !empty || !grid || !status) {
    installed = false;
    return;
  }

  let lastQuery = '';
  let rafHandle = 0;

  const statusEl: HTMLElement = status;
  const resultsEl: HTMLElement = results;
  const emptyEl: HTMLElement = empty;
  const gridEl: HTMLElement = grid;

  function showQuery(q: string) {
    if (!q.trim()) {
      statusEl.hidden = true;
      resultsEl.hidden = true;
      emptyEl.hidden = true;
      return;
    }
    statusEl.hidden = false;
    statusEl.textContent = `Mencari "${q}"…`;
    resultsEl.hidden = true;
    emptyEl.hidden = true;
  }

  function showHits(hits: Awaited<ReturnType<typeof liveSearch>>, terms: string[], q: string) {
    if (q.trim() !== lastQuery) return;
    if (hits.length === 0) {
      statusEl.textContent = `Tidak ditemukan hasil untuk "${q}"`;
      resultsEl.hidden = true;
      emptyEl.hidden = false;
      const strong = emptyEl.querySelector('strong');
      if (strong) strong.textContent = q;
    } else {
      statusEl.textContent = `${hits.length} hasil untuk "${q}"`;
      gridEl.innerHTML = renderCards(hits, terms);
      resultsEl.hidden = false;
      emptyEl.hidden = true;
    }
  }

  async function runQuery(q: string) {
    if (q === lastQuery) return;
    lastQuery = q;
    showQuery(q);
    if (!q.trim()) return;
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const hits = await liveSearch(q);
    showHits(hits, terms, q);
  }

  input.addEventListener('input', () => {
    cancelAnimationFrame(rafHandle);
    const q = input.value;
    rafHandle = requestAnimationFrame(() => runQuery(q));
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    runQuery(input.value);
    const params = new URLSearchParams(window.location.search);
    if (input.value.trim()) params.set('q', input.value);
    else params.delete('q');
    const qs = params.toString();
    history.replaceState(null, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const active = document.activeElement;
      if (active && active.tagName === 'INPUT') return;
      e.preventDefault();
      input.focus();
      input.select();
    }
  });
}
