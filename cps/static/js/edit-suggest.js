/* Suggestions for the book editor (plain_book_edit.html): click or tab into Author, Tags, Series, Publisher or Language and
 * the values that already exist are offered, most used first; typing narrows them. The list comes from the Rust backend
 * (GET /api/suggest, editors only) and is a WAI-ARIA combobox: Arrow keys move, Enter or a click chooses, Escape closes.
 * The form works without it. Multi-value fields (authors "&", tags and languages ",") complete the part being typed. */
(function () {
  if (!window.fetch) return;
  var FIELDS = {
    authors: { separator: ' & ', split: /\s*&\s*/ },
    tags: { separator: ', ', split: /\s*,\s*/ },
    languages: { separator: ', ', split: /\s*,\s*/ },
    series: null,
    publisher: null
  };
  var API_FIELD = { publisher: 'publishers' };
  var uid = 0;

  function attach(input, name) {
    var multi = FIELDS[name];
    var id = 'suggest-' + (++uid);
    var list = document.createElement('ul');
    list.id = id; list.className = 'suggest-list'; list.setAttribute('role', 'listbox'); list.hidden = true;
    input.parentNode.insertBefore(list, input.nextSibling);
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', id);

    var items = [], active = -1, timer = null, serial = 0, stale = false;

    // The text being completed: everything after the last separator for a multi-value field.
    function bounds() {
      var value = input.value;
      if (!multi) return { head: '', term: value };
      // Authors are separated by "&" (a comma belongs to a name: "Doe, John"); tags and languages by a comma.
      var cut = value.lastIndexOf(name === 'authors' ? '&' : ',');
      return { head: value.slice(0, cut + 1), term: value.slice(cut + 1) };
    }
    function chosen() {
      return multi ? input.value.split(multi.split).map(function (s) { return s.trim().toLowerCase(); }) : [];
    }
    function close() {
      list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1;
    }
    function mark(index) {
      active = index;
      Array.prototype.forEach.call(list.children, function (li, i) {
        li.setAttribute('aria-selected', i === index ? 'true' : 'false');
        if (i === index) { input.setAttribute('aria-activedescendant', li.id); li.scrollIntoView({ block: 'nearest' }); }
      });
      if (index < 0) input.removeAttribute('aria-activedescendant');
    }
    function choose(index) {
      var item = items[index];
      if (!item) return;
      if (multi) {
        // Keep what is already typed before the part being completed (it ends with its separator) and add the choice.
        // No separator is appended: an empty trailing value would be saved as an empty author or tag.
        var head = bounds().head.replace(/\s+$/, '');
        input.value = (head ? head + ' ' : '') + item.name;
      } else {
        input.value = item.name;
      }
      close();
      input.focus();
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    function render(found) {
      var taken = chosen();
      var term = bounds().term.trim().toLowerCase();
      items = found.filter(function (it) { return taken.indexOf(it.name.toLowerCase()) < 0 || it.name.toLowerCase() === term; });
      list.textContent = '';
      items.forEach(function (it, i) {
        var li = document.createElement('li');
        li.id = id + '-' + i; li.setAttribute('role', 'option'); li.setAttribute('aria-selected', 'false');
        var label = document.createElement('span'); label.textContent = it.name;
        var count = document.createElement('span'); count.className = 'suggest-count'; count.textContent = it.count;
        count.setAttribute('aria-label', it.count + ' buku');
        li.appendChild(label); li.appendChild(count);
        // mousedown, not click: the input must keep focus so its blur does not close the list first.
        li.addEventListener('mousedown', function (e) { e.preventDefault(); choose(i); });
        list.appendChild(li);
      });
      list.hidden = items.length === 0;
      input.setAttribute('aria-expanded', items.length ? 'true' : 'false');
      active = -1; stale = false;
    }
    function fetchSuggestions() {
      var mine = ++serial;
      var url = '/api/suggest?field=' + encodeURIComponent(API_FIELD[name] || name) + '&q=' + encodeURIComponent(bounds().term.trim());
      fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : { items: [] }; })
        .then(function (d) { if (mine === serial && document.activeElement === input) render(d.items || []); })
        .catch(function () { if (mine === serial) close(); });
    }
    function schedule(delay) { clearTimeout(timer); timer = setTimeout(fetchSuggestions, delay); }

    input.addEventListener('focus', function () { schedule(0); });
    input.addEventListener('click', function () { if (list.hidden) schedule(0); });
    input.addEventListener('input', function () {
      // The list on screen answers the OLD text: drop the highlight and ignore Arrow/Enter until the new answer is shown.
      stale = true; mark(-1);
      schedule(150);
    });
    input.addEventListener('blur', function () { clearTimeout(timer); serial++; close(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { if (!list.hidden) { close(); e.preventDefault(); } return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (list.hidden) { schedule(0); return; }
        e.preventDefault();
        if (stale) return;
        mark(e.key === 'ArrowDown' ? (active + 1) % items.length : (active - 1 + items.length) % items.length);
      } else if (e.key === 'Enter' && !list.hidden && !stale && active >= 0) {
        e.preventDefault(); choose(active);   // Enter picks the highlighted value instead of submitting the form
      }
    });
  }

  Object.keys(FIELDS).forEach(function (name) {
    var input = document.getElementById(name);
    if (input && input.tagName === 'INPUT') attach(input, name);
  });
}());
