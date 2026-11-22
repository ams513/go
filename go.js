(function () {
  'use strict';
  var PIC = 'img/stark-1080.jpg';
  var SITE = 'https://starkforall.com/';
  var go = document.getElementById('go');
  var go2 = document.getElementById('go2');
  var picBtn = document.getElementById('pic');
  var statusEl = document.getElementById('status');
  var msgsEl = document.getElementById('msgs');
  var tabsEl = document.getElementById('tabs');
  var appsEl = document.getElementById('apps');
  var cards = Array.prototype.slice.call(msgsEl.querySelectorAll('.msg'));
  var cur = 0;
  var file = null;
  var filePromise = null;

  function say(m) { statusEl.textContent = m; }
  function msg() { var ps = cards[cur].querySelectorAll('p'); return ps[0].textContent.replace(/\s+/g, ' ').trim() + '\n' + ps[1].textContent.trim(); }
  function firstUrl() { var m = msg().match(/https?:\/\/[^\s]+/); return m ? m[0] : SITE; }
  function body() { return msg().replace(/\s*https?:\/\/[^\s]+/g, '').replace(/\s+/g, ' ').replace(/[:\s]+$/, ''); }
  function enc(s) { return encodeURIComponent(s); }

  var apps = [
    ['Messages', function () { return 'sms:?&body=' + enc(firstUrl()); }],
    ['WhatsApp', function (m) { return 'https://wa.me/?text=' + enc(m); }],
    ['X', function (m) { return 'https://twitter.com/intent/tweet?text=' + enc(m); }],
    ['Facebook', function () { return 'https://www.facebook.com/sharer/sharer.php?u=' + enc(firstUrl()) + '&quote=' + enc(body()); }],
    ['LinkedIn', function (m) { return 'https://www.linkedin.com/feed/?shareActive=true&text=' + enc(m); }],
    ['Reddit', function () { return 'https://www.reddit.com/submit?url=' + enc(firstUrl()) + '&title=' + enc(body().slice(0, 290)); }],
    ['Bluesky', function (m) { return 'https://bsky.app/intent/compose?text=' + enc(m); }],
    ['Telegram', function () { return 'https://t.me/share/url?url=' + enc(firstUrl()) + '&text=' + enc(body()); }],
    ['Threads', function (m) { return 'https://www.threads.net/intent/post?text=' + enc(m); }],
    ['Email', function (m) { return 'mailto:?subject=' + enc('Stark') + '&body=' + enc(m); }]
  ];
  var links = [];
  apps.forEach(function (a) {
    var li = document.createElement('li');
    var el = document.createElement('a');
    el.textContent = a[0];
    el.setAttribute('aria-label', 'Share with ' + a[0]);
    if (a[0] !== 'Messages' && a[0] !== 'Email') { el.target = '_blank'; el.rel = 'noopener noreferrer'; }
    li.appendChild(el); appsEl.appendChild(li);
    links.push([el, a[1]]);
  });
  var cli = document.createElement('li');
  var cb = document.createElement('button');
  cb.type = 'button'; cb.textContent = 'Copy message';
  cli.appendChild(cb); appsEl.appendChild(cli);

  function refresh() {
    var m = msg();
    links.forEach(function (l) { l[0].href = l[1](m); });
  }
  function select(i, scroll) {
    cur = i;
    Array.prototype.forEach.call(tabsEl.children, function (b, k) { b.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
    if (scroll) msgsEl.scrollTo({ left: cards[i].offsetLeft - msgsEl.offsetLeft, behavior: 'smooth' });
    refresh();
  }
  cards.forEach(function (c, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = String(i + 1);
    b.setAttribute('aria-label', 'Message ' + (i + 1));
    b.addEventListener('click', function () { select(i, true); });
    tabsEl.appendChild(b);
  });
  var t = null;
  msgsEl.addEventListener('scroll', function () {
    clearTimeout(t);
    t = setTimeout(function () {
      var i = Math.round(msgsEl.scrollLeft / (msgsEl.scrollWidth / cards.length));
      i = Math.max(0, Math.min(cards.length - 1, i));
      if (i !== cur) select(i, false);
    }, 80);
  }, { passive: true });
  msgsEl.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' && cur < cards.length - 1) { select(cur + 1, true); e.preventDefault(); }
    if (e.key === 'ArrowLeft' && cur > 0) { select(cur - 1, true); e.preventDefault(); }
  });
  document.addEventListener('keydown', function (e) {
    var n = /^[1-9]$/.test(e.key) ? +e.key : 0;
    if (n && n <= cards.length && !e.ctrlKey && !e.metaKey && !e.altKey) select(n - 1, true);
  });

  function copyText(m, ok) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(m).then(function () { say(ok); }, function () { say('Copy failed. Select the message above and copy it.'); });
    }
    say('Copy not available here. Select the message above and copy it.');
  }
  function copy() { return copyText(msg(), 'Message copied. Paste it anywhere.'); }
  function copyLink() { return copyText(SITE, 'Link copied. Paste it in a message.'); }
  cb.addEventListener('click', copy);

  function loadFile() {
    if (!filePromise) {
      filePromise = fetch(PIC).then(function (r) {
        if (!r.ok) throw new Error('pic');
        return r.blob();
      }).then(function (b) {
        file = new File([b], 'Stark.jpg', { type: 'image/jpeg' });
        return file;
      }).catch(function () { filePromise = null; return null; });
    }
    return filePromise;
  }

  function send(data, fallback) {
    return navigator.share(data).catch(function (e) {
      if (e && e.name === 'AbortError') return;
      return fallback();
    });
  }
  // The big button: the link alone, so chat apps build a tap-to-open card.
  go.addEventListener('click', function () {
    if (!navigator.share) { copyLink(); return; }
    send({ url: SITE }, copyLink);
  });
  go2.addEventListener('click', function () {
    if (!navigator.share) { copy(); return; }
    send({ text: msg() }, copy);
  });
  // The picture is a small option at the bottom.
  picBtn.addEventListener('click', function () {
    if (!navigator.share) { copyLink(); return; }
    var go_ = function () {
      var withFile = file && navigator.canShare && navigator.canShare({ files: [file] });
      send(withFile ? { files: [file], text: msg(), title: 'Stark' } : { text: body(), url: firstUrl() }, copy);
    };
    if (file) { go_(); return; }
    say('Getting the picture...');
    loadFile().then(function () { say(''); go_(); });
  });

  select(0, false);
  if (!navigator.share) say('Sharing is not available here: the buttons copy instead, or pick an app below.');
})();
