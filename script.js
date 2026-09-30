/* SM Blog Panel: a sticky preview image beside a single-column blog list. Hover (or scroll to) a row to show that post's image, category, date and link. Styles live in the template's styles.less. Load after the blog list: <script src="https://cdn.jsdelivr.net/gh/StudioMesa/sm-blog-panel@main/script.js"></script> */
(function () {
  var items = document.querySelectorAll('.blog-single-column--container.blog-item');
  if (!items.length) return;

  var shell = items[0].parentNode;
  shell.className += ' sm-blog-shell';

  var col = document.createElement('div');
  col.className = 'sm-blog-col';

  var panel = document.createElement('div');
  panel.className = 'sm-blog-preview';
  panel.setAttribute('aria-hidden', 'true');
  panel.innerHTML = '<img class="sm-blog-layer" alt=""><img class="sm-blog-layer" alt="">';
  col.appendChild(panel);

  // Caption under the image: category and date of the active post, plus a link to it
  var caption = document.createElement('div');
  caption.className = 'sm-blog-caption';
  caption.innerHTML = '<p class="sm-blog-caption-meta"></p><a class="sm-blog-caption-link" href="#">Read the report<span aria-hidden="true"> →</span></a>';
  col.appendChild(caption);
  var capMeta = caption.querySelector('.sm-blog-caption-meta');
  var capLink = caption.querySelector('.sm-blog-caption-link');

  var rows = document.createElement('div');
  rows.className = 'sm-blog-rows';

  shell.insertBefore(col, shell.firstChild);
  shell.insertBefore(rows, col.nextSibling);

  // Everything that isn't the panel goes inside the rows wrapper, so the grid is
  // exactly one row. Otherwise a stray child auto-places into row 1 ahead of the
  // list and the panel's sticky area is only as tall as that child.
  var kids = [].slice.call(shell.children);
  for (var k = 0; k < kids.length; k++) {
    if (kids[k] !== col && kids[k] !== rows) rows.appendChild(kids[k]);
  }

  // Pagination stays at the bottom of the list, below any posts loaded later.
  var tail = rows.querySelector('.blog-list-pagination, nav.pagination, .pagination');

  var layers = panel.getElementsByTagName('img');
  var on = 0;
  var wanted = '';   // newest hover wins, even if an older image loads later
  var warm = [];
  var active = null;

  function size(img, w) {
    var src = img.getAttribute('data-src') || img.getAttribute('src') || '';
    if (!src || src.indexOf('data:') === 0) return '';
    src = src.split('?')[0];
    return src.indexOf('squarespace') > -1 ? src + '?format=' + w + 'w' : src;
  }

  function text(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }

  function when(item) {
    var t = item.querySelector('time.blog-date');
    if (!t) return '';
    var d = new Date(t.getAttribute('datetime') || text(t));
    return isNaN(d) ? text(t) : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  function describe(item) {
    var cat = text(item.querySelector('.blog-categories'));
    var date = when(item);
    capMeta.textContent = [cat, date].filter(Boolean).join(' · ');
    var a = item.querySelector('.blog-title a, a.image-wrapper');
    if (a) capLink.setAttribute('href', a.getAttribute('href'));
    if (active) active.classList.remove('is-active');
    item.classList.add('is-active');
    active = item;
  }

  function show(item, big) {
    wanted = big;
    describe(item);

    var next = layers[1 - on];
    var swap = function () {
      if (wanted !== big) return;
      layers[on].className = 'sm-blog-layer';
      next.className = 'sm-blog-layer is-on';
      on = 1 - on;
    };

    if (next.src === big) return next.complete && swap();
    next.onload = swap;   // never fade in a half-loaded image
    next.src = big;
  }

  for (var i = 0; i < items.length; i++) setup(items[i]);

  function setup(item) {
    if (tail) rows.insertBefore(item, tail); else rows.appendChild(item);

    var img = item.querySelector('img');
    var big = img ? size(img, 1000) : '';
    if (big) warm.push(big);

    item.addEventListener('mouseenter', function () {
      if (big) show(item, big); else describe(item);
    });

    // Never start empty: the first post with an image fills the panel on load
    if (!active && big) show(item, big);
  }

  // Sticky dies inside any ancestor that scrolls, clips or contains. Squarespace
  // sets these with !important, so a plain inline style loses; these must win.
  function unclip() {
    for (var el = col.parentNode; el && el.nodeType === 1; el = el.parentNode) {
      var cs = getComputedStyle(el);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
        if (el === document.body || el === document.documentElement) el.style.setProperty('overflow-x', 'clip', 'important');
        else el.style.setProperty('overflow', 'visible', 'important');
      }
      if (cs.contain && cs.contain !== 'none') el.style.setProperty('contain', 'none', 'important');
      if (cs.contentVisibility && cs.contentVisibility !== 'visible') el.style.setProperty('content-visibility', 'visible', 'important');
      if (el === document.documentElement) break;
    }
  }

  unclip();
  window.addEventListener('load', unclip);

  // sm-pagination appends posts outside our wrapper and unwired
  var host = document.querySelector('.collection-content-wrapper') || shell;
  new MutationObserver(adopt).observe(host, { childList: true, subtree: true });

  function adopt() {
    var found = document.querySelectorAll('.blog-single-column--container.blog-item');
    for (var n = 0; n < found.length; n++) {
      if (found[n].parentNode !== rows) setup(found[n]);
    }
  }

  // Leaving the list keeps the last post showing, so the panel is never blank

  // warm the cache so the first hover is instant; pointless on phones
  if (!window.matchMedia('(max-width:767px)').matches) {
    setTimeout(function () {
      for (var k = 0; k < warm.length; k++) new Image().src = warm[k];
    }, 1500);
  }
})();
