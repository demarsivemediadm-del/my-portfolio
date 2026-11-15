/* Home page: fill packages, reviews and blog from the database. */
(function () {
  var DM = window.DM, root = document.documentElement;
  function showPrices() { root.classList.remove('dm-wait'); }
  setTimeout(showPrices, 3500);
  if (!DM) return showPrices();

  // Packages. The database sends one price per plan, picked by the visitor's country.
  DM.rpc('get_packages').then(function (rows) {
    var groups = {};
    rows.forEach(function (r) { (groups[r.grp] = groups[r.grp] || []).push(r); });
    [].forEach.call(document.querySelectorAll('[data-price]'), function (span) {
      var k = span.dataset.price.split('-'), row = (groups[k[0]] || [])[Number(k[1])];
      if (!row) return;
      span.textContent = row.price;
      var card = span.parentElement && span.parentElement.parentElement, ul = card && card.querySelector('ul');
      if (!ul || !card.querySelector('h3') || card.tagName === 'SECTION') return;
      card.querySelector('h3').textContent = row.name;
      if (card.firstElementChild && card.firstElementChild.tagName === 'DIV') card.firstElementChild.textContent = row.tagline;
      var li = ul.querySelector('li');
      if (li && row.features && row.features.length) {
        ul.innerHTML = '';
        row.features.forEach(function (f) { var n = li.cloneNode(false); n.textContent = f; ul.appendChild(n); });
      }
    });
  }).catch(function () {}).then(showPrices);

  // Pictures and videos the owner has replaced from the admin page
  DM.table('home_media', 'select=original,url').then(function (rows) {
    rows.forEach(function (r) {
      [].forEach.call(document.querySelectorAll('img, video'), function (n) {
        var lazy = n.tagName === 'VIDEO' && !n.getAttribute('src') && n.dataset.src;
        if ((lazy ? n.dataset.src : n.getAttribute('src')) !== r.original) return;
        if (n.tagName === 'VIDEO') n.removeAttribute('poster');
        if (lazy) n.dataset.src = r.url; else n.src = r.url;
      });
      var full = r.original.replace('-preview.mp4', '-full.mp4');
      [].forEach.call(document.querySelectorAll('[data-video]'), function (n) { if (n.dataset.video === full) n.dataset.video = r.url; });
    });
  }).catch(function () {});

  // Reviews
  var revSec = document.getElementById('reviews');
  if (revSec) DM.table('reviews', 'select=name,role,quote&published=is.true&order=sort,id').then(function (rows) {
    var first = revSec.querySelector('figure'); if (!first || !rows.length) return;
    var wrap = first.parentElement.parentElement, cards = [].slice.call(wrap.children);
    var mid = cards[1] || cards[0];
    rows.forEach(function (r, i) {
      var c = cards[i];
      if (!c) { c = mid.cloneNode(true); wrap.appendChild(c); }
      c.querySelector('blockquote').textContent = r.quote;
      var cap = c.querySelector('figcaption'), spans = cap.children;
      spans[0].textContent = (r.name || '?').trim().charAt(0).toUpperCase();
      spans[1].innerHTML = '';
      var nm = spans[1].appendChild(document.createElement('span'));
      nm.style.cssText = 'color: #FFFFFF; font-weight: 600; font-size: 17px'; nm.textContent = r.name;
      spans[1].appendChild(document.createTextNode(r.role || ''));
    });
    cards.slice(rows.length).forEach(function (c) { c.remove(); });
  }).catch(function () {});

  // Blog
  var blog = document.getElementById('blog');
  if (blog) DM.table('posts', 'select=id,category,meta,title,excerpt,cover_url,cover_alt,body,link_url,link_label,note&published=is.true&order=sort,id').then(function (rows) {
    var arts = [].slice.call(blog.querySelectorAll('article')); if (arts.length < 2 || !rows.length) return;
    var list = arts[0].parentElement, tplBig = arts[0], tpl = arts[1];
    var btn = blog.querySelector('button[data-post]'), link = blog.querySelector('article a[target]'), note = blog.querySelector('article > div > span');
    var sBtn = btn ? btn.style.cssText : '', sLink = link ? link.style.cssText : sBtn, sNote = note ? note.style.cssText : sBtn;
    window.DMPosts = {};
    var out = rows.map(function (r, i) {
      var a = (i === 0 ? tplBig : tpl).cloneNode(true);
      a.dataset.cat = r.category; a.style.display = '';
      var img = a.querySelector('img'); img.src = r.cover_url; img.alt = r.cover_alt || '';
      var box = a.children[1];
      box.children[0].textContent = r.meta; box.querySelector('h3').textContent = r.title; box.querySelector('p').textContent = r.excerpt;
      var act;
      if (r.body) { window.DMPosts[r.id] = r; act = document.createElement('button'); act.type = 'button'; act.dataset.post = r.id; act.style.cssText = sBtn; act.innerHTML = 'Read more &rsaquo;'; }
      else if (r.link_url && /^https?:\/\//.test(r.link_url)) { act = document.createElement('a'); act.href = r.link_url; act.target = '_blank'; act.rel = 'noopener'; act.style.cssText = sLink; act.textContent = (r.link_label || 'Open link') + ' ›'; }
      else { act = document.createElement('span'); act.style.cssText = sNote; act.textContent = r.note || ''; }
      box.replaceChild(act, box.lastElementChild);
      return a;
    });
    arts.forEach(function (a) { a.remove(); });
    out.forEach(function (a) { list.appendChild(a); });
  }).catch(function () {});
})();
