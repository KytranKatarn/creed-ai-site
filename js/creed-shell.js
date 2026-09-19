/* creed-shell.js v2 — the ONE place the creed-ai.org site chrome lives.
 * Defines <creed-nav current="…" base="/"> and <creed-footer base="/">.
 * Light DOM, so css/components.css styles apply unchanged.
 *
 * v2 changes (from the information-architecture audit):
 *  - Six top-level tabs with sub-tabs, replacing ten flat links. Every one of the
 *    site's 33 pages now has a navigation path; nine pages that were reachable only
 *    by typing the URL (principles, case-studies, policy, partners, press, contact
 *    and the three working papers) are in the menu.
 *  - standard.html and get-scored.html are promoted out of the footer — they are what
 *    the Institute asks organizations to adopt.
 *  - current="" takes a PAGE key (e.g. "press") and marks both the page in its
 *    dropdown and the tab that contains it.
 *  - Dropdowns are keyboard-operable: Enter/Space/ArrowDown to open, Escape to close,
 *    arrows to move, and they open on hover for pointer users. Below 1200px the whole
 *    thing becomes one flat accordion-free list, which is what a phone wants.
 *  - Also, as in v1: aria-expanded/aria-controls on the menu button, Escape + scroll
 *    lock for the open menu, a real dialog for the language picker, a skip link, and
 *    root-absolute hrefs so it works under /fr/ and /papers/.
 */
(function () {
  'use strict';

  /* [tabKey, tabLabel, tabHref|null, i18nKey, [[pageKey, label, file, i18nKey], …]] */
  var NAV = [
    ['standard', 'The Standard', 'standard.html', 'nav.standard', [
      ['standard', 'Specification v1', 'standard.html', 'nav.spec'],
      ['get-scored', 'Get scored', 'get-scored.html', 'nav.get_scored'],
      ['calculator', 'Score calculator', 'calculator.html', 'nav.calculator'],
      ['validator', 'Event schema validator', 'validator.html', 'nav.validator']
    ]],
    ['transparency', 'Transparency', 'governance.html', 'nav.transparency', [
      ['governance', 'Live register', 'governance.html', 'nav.governance'],
      ['directory', 'Directory', 'directory.html', 'nav.directory'],
      ['oversight', 'Human oversight', 'oversight.html', 'nav.oversight'],
      ['remediation', 'Remediations', 'remediation.html', 'nav.remediation'],
      ['incidents', 'Incidents', 'incidents.html', 'nav.incidents'],
      ['accountability', 'Accountability', 'accountability.html', 'nav.accountability'],
      ['badge', 'Badge generator', 'badge.html', 'nav.badge']
    ]],
    ['research', 'Research', 'research.html', 'nav.research', [
      ['research', 'Papers & open data', 'research.html', 'nav.papers'],
      ['programs', 'Programs', 'programs.html', 'nav.programs'],
      ['case-studies', 'Case studies', 'case-studies.html', 'nav.case_studies'],
      ['policy', 'Policy submissions', 'policy.html', 'nav.policy']
    ]],
    ['institute', 'Institute', 'about.html', 'nav.institute', [
      ['about', 'About & leadership', 'about.html', 'nav.about'],
      ['principles', 'Principles', 'principles.html', 'nav.principles'],
      ['manifesto', 'Manifesto', 'manifesto.html', 'nav.manifesto'],
      ['platform', 'Platform (A.R.C.H.I.E.)', 'platform.html', 'nav.platform'],
      ['partners', 'Partners', 'partners.html', 'nav.partners'],
      ['press', 'Press kit', 'press.html', 'nav.press'],
      ['contact', 'Contact', 'contact.html', 'nav.contact']
    ]],
    ['news', 'News', 'news.html', 'nav.news', []],
    ['get-involved', 'Get Involved', 'get-involved.html', 'nav.get_involved', [
      ['get-involved', 'Ways to contribute', 'get-involved.html', 'nav.ways'],
      ['advisory', 'Advisory board seats', 'about.html#board', 'nav.advisory']
    ]]
  ];

  /* Papers live under Research but are not in the dropdown — they mark the tab only. */
  var TAB_OF = { 'wp-001': 'research', 'wp-002': 'research', 'wp-003': 'research', 'papers': 'research', 'donate': 'get-involved' };

  var FOOTER = [
    ['The Standard', [['Specification v1', 'standard.html'], ['Get scored', 'get-scored.html'], ['Six pillars', 'standard.html#pillars'], ['Event schema', 'standard.html#schema']]],
    ['Transparency', [['Live register', 'governance.html'], ['Directory', 'directory.html'], ['Human oversight', 'oversight.html'], ['Remediations', 'remediation.html'], ['Incidents', 'incidents.html'], ['Accountability', 'accountability.html']]],
    ['Institute', [['About', 'about.html'], ['Manifesto', 'manifesto.html'], ['Research', 'research.html'], ['Press', 'press.html'], ['Contact', 'contact.html'], ['Donate', 'donate.html']]]
  ];

  var LANGS = [['en', 'English'], ['fr', 'Fran\u00e7ais'], ['es', 'Espa\u00f1ol'], ['pt', 'Portugu\u00eas'],
               ['de', 'Deutsch'], ['zh', '\u4e2d\u6587'], ['ar', '\u0627\u0644\u0639\u0631\u0628\u064a\u0629'], ['he', '\u05e2\u05d1\u05e8\u05d9\u05ea']];

  var CSS = '' +
    '.creed-skip{position:absolute;top:-100px;left:1rem;z-index:100001;padding:.6rem 1rem;background:var(--color-primary);color:var(--color-base);font-family:var(--font-nav);text-transform:uppercase;letter-spacing:.1em}' +
    '.creed-skip:focus{top:1rem;outline:2px solid #fff}' +
    '.nav__item{position:relative;display:flex;align-items:center}' +
    '.nav__item>.nav__link{display:inline-flex;align-items:center;gap:.35rem}' +
    '.nav__caret{width:.42em;height:.42em;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(45deg) translateY(-.1em);opacity:.65;transition:transform var(--speed-fast) var(--ease-out)}' +
    '.nav__item[aria-expanded="true"] .nav__caret{transform:rotate(225deg) translateY(-.15em)}' +
    '.nav__sub{position:absolute;top:100%;left:-1rem;min-width:16rem;display:none;flex-direction:column;padding:.5rem 0;' +
      'background:#07070f;border:1px solid var(--color-border);box-shadow:0 18px 44px rgba(0,0,0,.55)}' +
    '.nav__item[aria-expanded="true"] .nav__sub{display:flex}' +
    '.nav__sub a{display:block;padding:.6rem 1.15rem;font-family:var(--font-nav);font-size:.82rem;letter-spacing:.09em;' +
      'text-transform:uppercase;color:var(--color-text-muted);white-space:nowrap;transition:color var(--speed-fast) var(--ease-out),background var(--speed-fast) var(--ease-out)}' +
    '.nav__sub a:hover,.nav__sub a:focus-visible{color:var(--color-primary);background:rgba(201,164,76,.07)}' +
    '.nav__sub a[aria-current="page"]{color:var(--color-primary);box-shadow:inset 2px 0 0 var(--color-primary)}' +
    '@media (max-width:1199px){' +
    'nav.nav .nav__links{display:none}' +
    'nav.nav .nav__menu-btn{display:flex;position:relative;z-index:100000}' +
    'nav.nav .nav__lang{position:relative;z-index:100000}' +
    'nav.nav.nav--menu-open{height:100vh;height:100dvh;z-index:9999;background:rgba(5,5,15,.98)}' +
    'nav.nav.nav--menu-open .nav__inner{height:var(--nav-height);align-items:center}' +
    'nav.nav.nav--menu-open .nav__logo{position:relative;z-index:100000}' +
    'nav.nav .nav__links.nav__links--open{display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;' +
      'position:fixed;top:0;left:0;width:100vw;height:100vh;height:100dvh;background:rgba(5,5,15,.98);' +
      'padding:calc(var(--nav-height) + 1.5rem) 1.5rem 3rem;gap:0;overflow-y:auto;z-index:99999}' +
    'nav.nav .nav__links--open .nav__item{display:block}' +
    'nav.nav .nav__links--open .nav__item>.nav__link{font-family:var(--font-nav);font-size:.72rem;letter-spacing:.22em;' +
      'color:var(--color-primary);padding:1.4rem 0 .5rem;pointer-events:none}' +
    'nav.nav .nav__links--open .nav__caret{display:none}' +
    'nav.nav .nav__links--open .nav__sub{display:flex;position:static;min-width:0;border:none;box-shadow:none;background:none;padding:0}' +
    'nav.nav .nav__links--open .nav__sub a{font-size:1.02rem;letter-spacing:.06em;padding:.7rem 0;color:var(--color-text);' +
      'border-bottom:1px solid rgba(201,164,76,.12)}' +
    'nav.nav .nav__links--open .nav__item--flat>.nav__link{pointer-events:auto;font-size:1.02rem;letter-spacing:.06em;' +
      'color:var(--color-text);text-transform:uppercase;padding:.7rem 0;border-bottom:1px solid rgba(201,164,76,.12)}' +
    'nav.nav .nav__links--open .nav__link--cta{margin-top:1.5rem;color:var(--color-primary)!important;pointer-events:auto!important}' +
    '}' +
    '.creed-footer__grid{display:grid;grid-template-columns:1.4fr repeat(3,1fr);gap:var(--space-2xl)}' +
    '.creed-footer__heading{font-family:var(--font-nav);font-size:var(--text-xs);letter-spacing:.2em;text-transform:uppercase;color:var(--color-primary);margin-bottom:var(--space-md)}' +
    '.creed-footer__list{display:flex;flex-direction:column;gap:var(--space-sm)}' +
    '.creed-footer__list a{font-family:var(--font-nav);font-size:var(--text-sm);text-transform:uppercase;letter-spacing:.1em;color:var(--color-text-muted)}' +
    '.creed-footer__list a:hover,.creed-footer__list a:focus-visible{color:var(--color-primary)}' +
    '@media (max-width:900px){.creed-footer__grid{grid-template-columns:1fr 1fr}}' +
    '@media (max-width:560px){.creed-footer__grid{grid-template-columns:1fr}}';

  var injected = false;
  function injectCSS() {
    if (injected) return; injected = true;
    var s = document.createElement('style');
    s.id = 'creed-shell-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function baseOf(el) { var b = el.getAttribute('base') || '/'; return /\/$/.test(b) ? b : b + '/'; }

  /* links="file.html=href;…" overrides individual targets (used to wire prototypes together). */
  var PREVIEW = {};
  function overridesOf(el) {
    var map = el.hasAttribute('preview') ? Object.assign({}, PREVIEW) : {};
    var raw = el.getAttribute('links');
    if (raw) raw.split(';').forEach(function (pair) {
      var kv = pair.split('=');
      if (kv.length === 2 && kv[0].trim()) map[kv[0].trim()] = kv[1].trim();
    });
    return map;
  }
  function hrefFor(base, file, ov) {
    if (Object.prototype.hasOwnProperty.call(ov, file)) return ov[file];
    var hash = '', i = file.indexOf('#');
    if (i !== -1) { hash = file.slice(i); file = file.slice(0, i); }
    return base + file + hash;
  }
  function pageKey(el) {
    var c = el.getAttribute('current');
    if (c) return c;
    var p = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '');
    return p === 'index' || p === '' ? 'home' : p;
  }
  function tabOf(page) {
    if (TAB_OF[page]) return TAB_OF[page];
    for (var i = 0; i < NAV.length; i++) {
      if (NAV[i][0] === page) return NAV[i][0];
      for (var j = 0; j < NAV[i][4].length; j++) if (NAV[i][4][j][0] === page) return NAV[i][0];
    }
    return '';
  }

  class CreedNav extends HTMLElement {
    connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      injectCSS();
      var base = baseOf(this), page = pageKey(this), tab = tabOf(page), ov = overridesOf(this);

      var links = NAV.map(function (t) {
        var isTab = t[0] === tab;
        var subs = t[4];
        var top = '<a href="' + hrefFor(base, t[2], ov) + '" class="nav__link' + (isTab ? ' active' : '') + '"' +
          (isTab ? ' aria-current="true"' : '') + ' data-i18n="' + t[3] + '">' + esc(t[1]) +
          (subs.length ? '<span class="nav__caret" aria-hidden="true"></span>' : '') + '</a>';
        if (!subs.length) return '<div class="nav__item nav__item--flat">' + top + '</div>';
        var sub = subs.map(function (s) {
          var on = s[0] === page;
          return '<a href="' + hrefFor(base, s[2], ov) + '"' + (on ? ' aria-current="page"' : '') +
            ' data-i18n="' + s[3] + '">' + esc(s[1]) + '</a>';
        }).join('');
        return '<div class="nav__item" aria-expanded="false"><button type="button" class="nav__toggle" hidden aria-label="' +
          esc(t[1]) + '"></button>' + top + '<div class="nav__sub" role="group" aria-label="' + esc(t[1]) + '">' + sub + '</div></div>';
      }).join('');
      links += '<div class="nav__item nav__item--flat"><a href="' + hrefFor(base, 'donate.html', ov) +
        '" class="nav__link nav__link--cta" data-i18n="nav.donate">Donate</a></div>';

      var langs = LANGS.map(function (l) {
        return '<button type="button" class="lang-overlay__btn" data-lang="' + l[0] + '" lang="' + l[0] + '">' + l[1] + '</button>';
      }).join('');

      this.innerHTML =
        '<a class="creed-skip" href="#main">Skip to content</a>' +
        '<nav class="nav" id="mainNav" aria-label="Primary">' +
        '<div class="nav__inner container" style="gap:1.5rem">' +
        '<a href="' + (ov['index.html'] || base) + '" class="nav__logo" aria-label="C.R.E.E.D. Institute \u2014 home"><span class="nav__logo-text">C.R.E.E.D.</span></a>' +
        '<div class="nav__links" id="navLinks">' + links + '</div>' +
        '<div class="nav__tools" style="display:flex;align-items:center;gap:var(--space-md)">' +
        '<button type="button" class="nav__lang" id="langToggle" aria-haspopup="dialog" aria-controls="langOverlay" aria-label="Change language">EN</button>' +
        '<button type="button" class="nav__menu-btn" id="menuToggle" aria-expanded="false" aria-controls="navLinks" aria-label="Open menu"><span></span><span></span><span></span></button>' +
        '</div></div></nav>' +
        '<div class="lang-overlay" id="langOverlay" role="dialog" aria-modal="true" aria-labelledby="langTitle">' +
        '<div class="lang-overlay__panel"><button type="button" class="lang-overlay__close" aria-label="Close">&times;</button>' +
        '<h2 class="lang-overlay__title" id="langTitle">Select Language</h2>' +
        '<div class="lang-overlay__grid">' + langs + '</div></div></div>';

      this._bind();
    }

    _bind() {
      var nav = this.querySelector('#mainNav'), links = this.querySelector('#navLinks'),
        menu = this.querySelector('#menuToggle'), langBtn = this.querySelector('#langToggle'),
        overlay = this.querySelector('#langOverlay'), self = this;

      var onScroll = function () { nav.classList.toggle('nav--scrolled', window.scrollY > 40); };
      window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

      /* ---- dropdowns ---- */
      var items = Array.prototype.slice.call(this.querySelectorAll('.nav__item[aria-expanded]'));
      function closeAll(except) {
        items.forEach(function (it) { if (it !== except) it.setAttribute('aria-expanded', 'false'); });
      }
      var desktop = function () { return window.matchMedia('(min-width:1200px)').matches; };
      items.forEach(function (item) {
        var trigger = item.querySelector('.nav__link');
        item.addEventListener('mouseenter', function () { if (desktop()) { closeAll(item); item.setAttribute('aria-expanded', 'true'); } });
        item.addEventListener('mouseleave', function () { if (desktop()) item.setAttribute('aria-expanded', 'false'); });
        item.addEventListener('focusin', function () { if (desktop()) { closeAll(item); item.setAttribute('aria-expanded', 'true'); } });
        trigger.addEventListener('keydown', function (e) {
          if (!desktop()) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            closeAll(item); item.setAttribute('aria-expanded', 'true');
            var first = item.querySelector('.nav__sub a'); if (first) first.focus();
          }
        });
        item.addEventListener('keydown', function (e) {
          if (e.key === 'Escape') { item.setAttribute('aria-expanded', 'false'); trigger.focus(); }
          if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
          var subs = Array.prototype.slice.call(item.querySelectorAll('.nav__sub a'));
          var i = subs.indexOf(document.activeElement);
          if (i === -1) return;
          e.preventDefault();
          var n = e.key === 'ArrowDown' ? i + 1 : i - 1;
          if (n >= 0 && n < subs.length) subs[n].focus();
          else if (n < 0) trigger.focus();
        });
      });
      document.addEventListener('click', function (e) { if (!self.contains(e.target)) closeAll(null); });

      /* ---- mobile menu ---- */
      function setMenu(open) {
        links.classList.toggle('nav__links--open', open);
        menu.classList.toggle('is-open', open);
        nav.classList.toggle('nav--menu-open', open);
        menu.setAttribute('aria-expanded', open ? 'true' : 'false');
        menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        document.documentElement.style.overflow = open ? 'hidden' : '';
        if (open) closeAll(null);
      }
      menu.addEventListener('click', function () { setMenu(!links.classList.contains('nav__links--open')); });
      links.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });

      /* ---- language dialog ---- */
      function setLangOpen(open) {
        overlay.classList.toggle('lang-overlay--open', open);
        langBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) { var f = overlay.querySelector('.lang-overlay__btn'); if (f) f.focus(); }
        else langBtn.focus();
      }
      langBtn.addEventListener('click', function () { setLangOpen(!overlay.classList.contains('lang-overlay--open')); });
      overlay.querySelector('.lang-overlay__close').addEventListener('click', function () { setLangOpen(false); });
      overlay.addEventListener('click', function (e) { if (e.target === overlay) setLangOpen(false); });
      overlay.querySelectorAll('.lang-overlay__btn').forEach(function (b) {
        b.addEventListener('click', function () {
          var lang = b.getAttribute('data-lang');
          langBtn.textContent = lang.toUpperCase();
          document.dispatchEvent(new CustomEvent('creed:lang', { detail: { lang: lang } }));
          setLangOpen(false);
        });
      });

      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (overlay.classList.contains('lang-overlay--open')) setLangOpen(false);
        else if (links.classList.contains('nav__links--open')) setMenu(false);
        else closeAll(null);
      });

      try {
        var saved = localStorage.getItem('creed_lang');
        if (saved) langBtn.textContent = saved.toUpperCase();
      } catch (err) {}

      window.addEventListener('resize', function () {
        if (desktop() && links.classList.contains('nav__links--open')) setMenu(false);
      });
    }
  }

  class CreedFooter extends HTMLElement {
    connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      injectCSS();
      var base = baseOf(this), ov = overridesOf(this);
      var cols = FOOTER.map(function (c) {
        var list = c[1].map(function (l) {
          return '<a href="' + hrefFor(base, l[1], ov) + '">' + esc(l[0]) + '</a>';
        }).join('');
        return '<div><div class="creed-footer__heading">' + esc(c[0]) + '</div><div class="creed-footer__list">' + list + '</div></div>';
      }).join('');
      var year = new Date().getFullYear();
      this.innerHTML =
        '<footer class="footer">' +
        '<div class="footer__inner container">' +
        '<div class="creed-footer__grid">' +
        '<div><span class="footer__logo">C.R.E.E.D. INSTITUTE</span>' +
        '<p class="footer__tagline" data-i18n="footer.tagline">Preventive AI Ethics</p>' +
        '<p class="footer__initiative" data-i18n="footer.initiative">A founding initiative of Kytran Empowerment Inc.</p></div>' +
        cols +
        '</div>' +
        '<div class="footer__copy">&copy; ' + year + ' C.R.E.E.D. Institute. Canadian Registered Nonprofit. ' +
        '<a href="' + hrefFor(base, 'standard.html', ov) + '">Standard</a> and papers licensed CC BY-SA 4.0.</div>' +
        '</div></footer>';
    }
  }

  if (!window.customElements.get('creed-nav')) window.customElements.define('creed-nav', CreedNav);
  if (!window.customElements.get('creed-footer')) window.customElements.define('creed-footer', CreedFooter);
})();
