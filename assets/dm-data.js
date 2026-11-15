/* Demarsive Media: reads site content from the database. Pages keep their built-in content if this fails. */
window.DM = (function () {
  var URL = 'https://vxzpbznyzkixqcmdqyco.supabase.co';
  var KEY = 'sb_publishable_ohGRmn9Z4WkG3jdTloWOyg_Jd4zEcn_';
  function req(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ apikey: KEY, 'Content-Type': 'application/json' }, opts.headers || {});
    return fetch(URL + '/rest/v1/' + path, opts).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function inline(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }
  // Simple writing format: "## Heading", "- bullet", "1. numbered", **bold**, [link text](https://...), blank line between paragraphs
  function md(text) {
    return String(text || '').replace(/\r/g, '').split(/\n\s*\n/).map(function (block) {
      var lines = block.split('\n').filter(function (l) { return l.trim(); });
      if (!lines.length) return '';
      if (/^##\s+/.test(lines[0]) && lines.length === 1) return '<h2>' + inline(lines[0].replace(/^##\s+/, '')) + '</h2>';
      if (lines.every(function (l) { return /^-\s+/.test(l); })) return '<ul>' + lines.map(function (l) { return '<li>' + inline(l.replace(/^-\s+/, '')) + '</li>'; }).join('') + '</ul>';
      if (lines.every(function (l) { return /^\d+\.\s+/.test(l); })) return '<ol>' + lines.map(function (l) { return '<li>' + inline(l.replace(/^\d+\.\s+/, '')) + '</li>'; }).join('') + '</ol>';
      return '<p>' + lines.map(inline).join('<br>') + '</p>';
    }).join('');
  }
  return {
    url: URL, key: KEY, esc: esc, md: md,
    table: function (name, query) { return req(name + '?' + query); },
    rpc: function (name, args) {
      return fetch(URL + '/rest/v1/rpc/' + name, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(args || {}) }).then(function (r) {
        return r.text().then(function (t) { var j = t ? JSON.parse(t) : null; if (!r.ok) throw new Error((j && j.message) || 'Something went wrong. Please try again.'); return j; });
      });
    },
    device: function () {
      var id = null;
      try { id = localStorage.getItem('dm-dev'); } catch (e) {}
      if (!id) { id = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12); try { localStorage.setItem('dm-dev', id); } catch (e) {} }
      return id;
    },
    // Counts a visit or a tap. Nothing about the person is stored, only a daily total.
    track: function (name, oncePerVisit) {
      try { if (oncePerVisit) { if (sessionStorage.getItem('dm-t-' + name)) return; sessionStorage.setItem('dm-t-' + name, '1'); } } catch (e) {}
      this.rpc('track', { p_name: name }).catch(function () {});
    }
  };
})();
