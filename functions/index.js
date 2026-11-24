// Homepage. Normal visits get the static page untouched.
// Share links (/?post=ID) get the same page with that post's title, summary and
// cover in the preview tags, so WhatsApp, Facebook and X show the right card.
const SB = 'https://vxzpbznyzkixqcmdqyco.supabase.co';
const KEY = 'sb_publishable_ohGRmn9Z4WkG3jdTloWOyg_Jd4zEcn_';
const SITE = 'https://demarsivemedia.com/';
const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const id = url.searchParams.get('post');
  const page = await env.ASSETS.fetch(new Request(new URL('/', url), request));
  if (!id || !/^\d{1,9}$/.test(id) || !page.ok) return page;
  let post;
  try {
    const r = await fetch(`${SB}/rest/v1/posts?select=title,excerpt,cover_url,cover_alt&published=is.true&id=eq.${id}`,
      { headers: { apikey: KEY }, cf: { cacheTtl: 300, cacheEverything: true } });
    post = (await r.json())[0];
  } catch (e) { return page; }
  if (!post) return page;
  const img = new URL(post.cover_url || 'assets/img/blog-demarsive.jpg', SITE).href;
  const link = `${SITE}?post=${id}`;
  const title = `${post.title} | Demarsive Media`;
  let html = await page.text();
  const set = (re, val) => { html = html.replace(re, val); };
  set(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  set(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(post.title)}">`);
  set(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(post.excerpt)}">`);
  set(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${esc(img)}">`);
  set(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${esc(link)}">`);
  set(/<meta property="og:type" content="[^"]*">/, `<meta property="og:type" content="article">`);
  set(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(post.excerpt)}">`);
  set(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${esc(post.title)}">`);
  set(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${esc(post.excerpt)}">`);
  set(/<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${esc(img)}">`);
  set(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${esc(link)}">`);
  const h = new Headers(page.headers);
  h.delete('content-length'); h.set('cache-control', 'public, max-age=300');
  return new Response(html, { status: 200, headers: h });
}
