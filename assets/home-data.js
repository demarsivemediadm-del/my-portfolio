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
  if (revSec) DM.table('reviews', 'select=name,role,quote,rating&published=is.true&order=sort,id').then(function (rows) {
    var first = revSec.querySelector('figure'); if (!first || !rows.length) return;
    var wrap = first.parentElement.parentElement, cards = [].slice.call(wrap.children);
    var mid = cards[1] || cards[0];
    rows.forEach(function (r, i) {
      var c = cards[i];
      if (!c) { c = mid.cloneNode(true); wrap.appendChild(c); }
      var bq = c.querySelector('blockquote'); bq.textContent = r.quote;
      var st = c.querySelector('.dm-stars'); if (st) st.remove();
      if (r.rating) { st = document.createElement('div'); st.className = 'dm-stars'; st.setAttribute('role', 'img'); st.setAttribute('aria-label', r.rating + ' out of 5 stars'); st.textContent = '\u2605\u2605\u2605\u2605\u2605'.slice(0, r.rating); bq.parentNode.insertBefore(st, bq); }
      var cap = c.querySelector('figcaption'), spans = cap.children;
      spans[0].textContent = (r.name || '?').trim().charAt(0).toUpperCase();
      spans[1].innerHTML = '';
      var nm = spans[1].appendChild(document.createElement('span'));
      nm.style.cssText = 'color: #FFFFFF; font-weight: 600; font-size: 17px'; nm.textContent = r.name;
      spans[1].appendChild(document.createTextNode(r.role || ''));
    });
    cards.slice(rows.length).forEach(function (c) { c.remove(); });
  }).catch(function () {});

  // ---------- likes ----------
  var likeCounts = {}, liked = {};
  try { liked = JSON.parse(localStorage.getItem('dm-liked') || '{}'); } catch (e) {}
  var HEART = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.3C1 8.300 2.900 4.500 6.500 4.500c2.200 0 3.600 1.200 4.500 2.500h2c.900-1.300 2.300-2.500 4.500-2.500 3.600 0 5.500 3.800 4.100 7.200C19.500 16.400 12 21 12 21z"/></svg>';
  function paintLikes() {
    [].forEach.call(document.querySelectorAll('.dm-like'), function (b) {
      var id = b.dataset.like, on = !!liked[id], n = likeCounts[id] || 0;
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.querySelector('span').textContent = n ? String(n) : 'Like';
      b.setAttribute('aria-label', (on ? 'Unlike this post' : 'Like this post') + (n ? ', ' + n + (n === 1 ? ' like' : ' likes') : ''));
    });
  }
  function likeBtn(id) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'dm-like'; b.dataset.like = id; b.innerHTML = HEART + '<span>Like</span>';
    return b;
  }
  // ---------- share links: demarsivemedia.com/?post=ID ----------
  var SHARE = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 3v13"/><path d="M7 8l5-5 5 5"/></svg>';
  function postLink(id) { return location.origin + '/?post=' + id; }
  function shareBtn(id, title) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'dm-share'; b.dataset.share = id; b.dataset.title = title || '';
    b.innerHTML = SHARE + '<span>Share</span>'; b.setAttribute('aria-label', 'Share this post'); return b;
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.dm-share'); if (!b) return;
    var url = postLink(b.dataset.share), lab = b.querySelector('span');
    DM.track && DM.track('share');
    if (navigator.share) { navigator.share({ title: b.dataset.title, url: url }).catch(function () {}); return; }
    var done = function () { lab.textContent = 'Link copied'; setTimeout(function () { lab.textContent = 'Share'; }, 2200); };
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () { prompt('Copy this link', url); });
    else prompt('Copy this link', url);
  });

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.dm-like'); if (!b || b.disabled) return;
    var id = b.dataset.like; b.disabled = true;
    DM.rpc('toggle_like', { p_post: Number(id), p_device: DM.device() }).then(function (r) {
      likeCounts[id] = r.n; if (r.liked) liked[id] = 1; else delete liked[id];
      try { localStorage.setItem('dm-liked', JSON.stringify(liked)); } catch (err) {}
    }).catch(function () {}).then(function () { b.disabled = false; paintLikes(); });
  });

  // ---------- comments (shown under an open article) ----------
  window.DMPostExtras = function (post, holder) {
    holder.innerHTML = '';
    var top = document.createElement('div'); top.className = 'dm-likerow'; top.appendChild(likeBtn(post.id)); top.appendChild(shareBtn(post.id, post.title)); holder.appendChild(top);
    try { history.replaceState(null, '', '/?post=' + post.id); } catch (e) {}
    var h = document.createElement('h3'); h.textContent = 'Comments'; holder.appendChild(h);
    var list = document.createElement('div'); list.className = 'dm-comments'; list.textContent = 'Loading…'; holder.appendChild(list);
    function loadC() {
      return DM.table('comments', 'select=name,body,created_at&post_id=eq.' + Number(post.id) + '&approved=is.true&order=created_at').then(function (rows) {
        list.textContent = rows.length ? '' : 'No comments yet. Be the first.';
        rows.forEach(function (c) {
          var d = document.createElement('div'); d.className = 'dm-comment';
          var n = document.createElement('strong'); n.textContent = c.name;
          var t = document.createElement('span'); t.textContent = new Date(c.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
          var p = document.createElement('p'); p.textContent = c.body;
          d.appendChild(n); d.appendChild(t); d.appendChild(p); list.appendChild(d);
        });
      }).catch(function () { list.textContent = 'Comments could not be loaded.'; });
    }
    loadC();
    var f = document.createElement('form'); f.className = 'dm-form';
    f.innerHTML = '<label>Your name<input name="name" maxlength="60" required autocomplete="name"></label><label>Your comment<textarea name="body" maxlength="1000" required rows="3"></textarea></label><input name="website" class="dm-hp" tabindex="-1" autocomplete="off" aria-hidden="true"><button type="submit">Post comment</button><p role="status"></p>';
    f.addEventListener('submit', function (e) {
      e.preventDefault(); var btn = f.querySelector('button'), msg = f.querySelector('[role=status]'); btn.disabled = true; msg.textContent = '';
      DM.rpc('add_comment', { p_post: Number(post.id), p_name: f.name.value, p_body: f.body.value, p_hp: f.website.value }).then(function (live) {
        f.reset();
        if (live === false) msg.textContent = 'Thank you. Your comment will appear once it has been checked.';
        else { msg.textContent = 'Thank you. Your comment is up.'; loadC(); }
      }).catch(function (err) { msg.textContent = err.message; }).then(function () { btn.disabled = false; });
    });
    holder.appendChild(f);
    // more from the blog, and a way back into the rest of the site
    var others = (window.DMPostList || []).filter(function (r) { return String(r.id) !== String(post.id); }).slice(0, 4);
    var more = document.createElement('div'); more.className = 'dm-more';
    if (others.length) {
      var mh = document.createElement('h3'); mh.textContent = 'More from the blog'; more.appendChild(mh);
      var grid = document.createElement('div'); grid.className = 'dm-more-grid';
      others.forEach(function (r) {
        var c = document.createElement('button'); c.type = 'button'; c.className = 'dm-more-card'; c.dataset.goto = r.id;
        var im = document.createElement('img'); im.src = r.cover_url; im.alt = ''; im.loading = 'lazy';
        var m = document.createElement('span'); m.textContent = r.meta || '';
        var t = document.createElement('strong'); t.textContent = r.title;
        c.appendChild(im); c.appendChild(m); c.appendChild(t); grid.appendChild(c);
      });
      more.appendChild(grid);
    }
    var nav = document.createElement('div'); nav.className = 'dm-more-nav';
    nav.innerHTML = '<button type="button" data-goto="blog">See all blog posts</button><button type="button" data-goto="top">Explore Demarsive Media</button>';
    more.appendChild(nav);
    holder.appendChild(more);
    paintLikes();
  };

  function gotoPost(id) {
    var close = document.querySelector('#dm-modal [data-close]'), blog = document.getElementById('blog');
    var opener = blog && blog.querySelector('button[data-post="' + id + '"]'), card = document.getElementById('post-card-' + id);
    if (opener) { opener.click(); return; }
    if (close) close.click();
    if (card) { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); card.classList.add('dm-flash'); setTimeout(function () { card.classList.remove('dm-flash'); }, 2600); }
  }
  document.addEventListener('click', function (e) {
    var g = e.target.closest && e.target.closest('#dm-modal [data-goto]'); if (!g) return;
    var to = g.dataset.goto, close = document.querySelector('#dm-modal [data-close]');
    if (to === 'blog') { close.click(); document.getElementById('blog').scrollIntoView({ behavior: 'smooth' }); }
    else if (to === 'top') { close.click(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    else gotoPost(to);
  });

  // ---------- leave a review ----------
  var revSec2 = document.getElementById('reviews');
  if (revSec2) {
    var open = document.createElement('button'); open.type = 'button'; open.className = 'dm-revopen'; open.textContent = 'Leave a review';
    revSec2.appendChild(open);
    var box = document.createElement('div'); box.id = 'dm-revbox'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Leave a review');
    box.innerHTML = '<form class="dm-form"><h3>Leave a review</h3><p>Worked with us? Tell others how it went. Reviews appear after we have checked them.</p>'
      + '<fieldset><legend>Your rating</legend><div class="dm-rate">' + [5, 4, 3, 2, 1].map(function (n) { return '<input type="radio" name="rating" id="dm-r' + n + '" value="' + n + '" required><label for="dm-r' + n + '" aria-label="' + n + (n === 1 ? ' star' : ' stars') + '">\u2605</label>'; }).join('') + '</div></fieldset>'
      + '<label>Your name<input name="name" maxlength="60" required autocomplete="name"></label><label>Business, or what we did for you<input name="role" maxlength="80"></label><label>Your review<textarea name="quote" maxlength="600" required rows="4"></textarea></label>'
      + '<input name="website" class="dm-hp" tabindex="-1" autocomplete="off" aria-hidden="true"><div class="dm-formbtns"><button type="submit">Send review</button><button type="button" data-close>Close</button></div><p role="status"></p></form>';
    document.body.appendChild(box);
    var rf = box.querySelector('form');
    function shut() { box.classList.remove('open'); document.body.style.overflow = ''; open.focus(); }
    open.addEventListener('click', function () { box.classList.add('open'); document.body.style.overflow = 'hidden'; rf.name.focus(); });
    box.addEventListener('click', function (e) { if (e.target === box || e.target.closest('[data-close]')) shut(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && box.classList.contains('open')) shut(); });
    rf.addEventListener('submit', function (e) {
      e.preventDefault(); var btn = rf.querySelector('button[type=submit]'), msg = rf.querySelector('[role=status]'); btn.disabled = true; msg.textContent = '';
      DM.rpc('submit_review', { p_name: rf.name.value, p_role: rf.role.value, p_quote: rf.quote.value, p_rating: Number(rf.rating.value), p_hp: rf.website.value }).then(function () {
        rf.reset(); msg.textContent = 'Thank you. Your review has been sent and will appear once it has been checked.';
      }).catch(function (err) { msg.textContent = err.message; }).then(function () { btn.disabled = false; });
    });
  }

  // ---------- simple counts: visits, WhatsApp taps, contact form ----------
  DM.track('visit', true);
  document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('a[href*="wa.me"]'); if (a) DM.track('whatsapp'); });
  var cf = document.getElementById('contact-form'); if (cf) cf.addEventListener('submit', function () { DM.track('contact'); });

  // Blog
  var blog = document.getElementById('blog');
  if (blog) DM.table('posts', 'select=id,category,meta,title,excerpt,cover_url,cover_alt,body,link_url,link_label,note&published=is.true&order=sort,id').then(function (rows) {
    var arts = [].slice.call(blog.querySelectorAll('article')); if (arts.length < 2 || !rows.length) return;
    var list = arts[0].parentElement, tplBig = arts[0], tpl = arts[1];
    var btn = blog.querySelector('button[data-post]'), link = blog.querySelector('article a[target]'), note = blog.querySelector('article > div > span');
    var sBtn = btn ? btn.style.cssText : '', sLink = link ? link.style.cssText : sBtn, sNote = note ? note.style.cssText : sBtn;
    window.DMPosts = {}; window.DMPostList = rows;
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
      a.id = 'post-card-' + r.id;
      var row = document.createElement('div'); row.className = 'dm-likerow'; row.appendChild(likeBtn(r.id)); row.appendChild(shareBtn(r.id, r.title)); box.appendChild(row);
      return a;
    });
    arts.forEach(function (a) { a.remove(); });
    out.forEach(function (a) { list.appendChild(a); });
    var want = new URLSearchParams(location.search).get('post');
    if (want) { try { history.scrollRestoration = 'manual'; } catch (e) {} blog.scrollIntoView(); }
    if (want) setTimeout(function () {
      var opener = blog.querySelector('button[data-post="' + want + '"]'), card = document.getElementById('post-card-' + want);
      if (opener) opener.click();
      else if (card) { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); card.classList.add('dm-flash'); setTimeout(function () { card.classList.remove('dm-flash'); }, 2600); }
    }, 300);
    DM.rpc('post_like_counts').then(function (cs) { cs.forEach(function (c) { likeCounts[c.post_id] = c.n; }); paintLikes(); }).catch(function () {});
  }).catch(function () {});
})();
