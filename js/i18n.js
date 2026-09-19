/* ==========================================================================
   C.R.E.E.D. Institute — i18n (per-language bundles, root-absolute)
   Replaces the single 113 KB data/translations.json fetched on a relative
   path. English needs no fetch at all; other languages load one ~10 KB file
   from /data/i18n/<lang>.json and are cached in sessionStorage for the visit.

   Why root-absolute: the previous relative path resolved to /fr/data/… and
   /papers/data/… on those pages and 404'd, so the switcher silently did
   nothing exactly where a non-English reader was most likely to land.
   ========================================================================== */

var I18n = {
    SUPPORTED: ['en', 'fr', 'es', 'pt', 'de', 'zh', 'ar', 'he'],
    RTL: ['ar', 'he'],
    STORAGE_KEY: 'creed_lang',
    BASE: '/data/i18n/',

    _dict: null,

    getLang: function () {
        try {
            var saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved && this.SUPPORTED.indexOf(saved) !== -1) return saved;
        } catch (e) {}
        var docLang = (document.documentElement.lang || 'en').slice(0, 2).toLowerCase();
        return this.SUPPORTED.indexOf(docLang) !== -1 ? docLang : 'en';
    },

    setLang: function (lang) {
        if (this.SUPPORTED.indexOf(lang) === -1) return;
        try { localStorage.setItem(this.STORAGE_KEY, lang); } catch (e) {}
        this.apply(lang);
        document.dispatchEvent(new CustomEvent('creed:lang', { detail: { lang: lang } }));
    },

    // English is the markup's own language: nothing to fetch, nothing to swap.
    load: function (lang) {
        var self = this;
        if (lang === 'en') return Promise.resolve(null);

        var cacheKey = 'creed_i18n_' + lang;
        try {
            var cached = sessionStorage.getItem(cacheKey);
            if (cached) return Promise.resolve(JSON.parse(cached));
        } catch (e) {}

        return fetch(this.BASE + lang + '.json', { cache: 'no-cache' })
            .then(function (r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            })
            .then(function (dict) {
                try { sessionStorage.setItem(cacheKey, JSON.stringify(dict)); } catch (e) {}
                return dict;
            })
            .catch(function (err) {
                console.warn('[I18n] could not load ' + lang, err);
                return null;
            });
    },

    apply: function (lang) {
        var self = this;
        this.load(lang).then(function (dict) {
            self._dict = dict;
            document.documentElement.lang = lang;
            document.documentElement.dir = self.RTL.indexOf(lang) !== -1 ? 'rtl' : 'ltr';

            if (!dict) {
                // Back to English: restore the original markup text.
                document.querySelectorAll('[data-i18n][data-i18n-src]').forEach(function (el) {
                    el.innerHTML = el.getAttribute('data-i18n-src');
                });
                return;
            }

            document.querySelectorAll('[data-i18n]').forEach(function (el) {
                var key = el.getAttribute('data-i18n');
                if (!(key in dict)) return;
                // Keep the English original once, so switching back is lossless.
                if (!el.hasAttribute('data-i18n-src')) {
                    el.setAttribute('data-i18n-src', el.innerHTML);
                }
                el.innerHTML = dict[key];
            });
        });
    },

    init: function () {
        this.apply(this.getLang());
        var self = this;
        // <creed-nav> dispatches this when the language dialog is used.
        document.addEventListener('creed:lang', function (e) {
            if (e.detail && e.detail.lang && e.detail.lang !== self.getLang()) {
                self.setLang(e.detail.lang);
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', function () { I18n.init(); });
