/* ==========================================================================
   C.R.E.E.D. Institute — Public Transparency Directory (barba-safe)
   Renders the per-organization governance-score directory (#dir-grid) from the
   public multi-tenant API GET /api/v1/orgs. Each listed org shows its overall
   governance grade — or, when it has not yet logged enough governance events,
   an honest "provisional / insufficient data" state instead of a confident
   grade (the API's provisional gate; see js/governance.js for the same rule).

   Loaded on every page; Directory.init() no-ops unless #dir-grid is present.

   Related-party disclosure: every organization currently listed is the Institute
   itself, its parent company, a kytranempowerment.com subdomain, or a Kytran-
   operated product. Presenting those identically to an independent adopter would
   overstate adoption, so each card is flagged and an "Independent" filter is
   offered. It legitimately returns zero today; that is the honest number.
   hook (transitions.js). It no-ops on pages without the #dir-grid widget.
   ========================================================================== */

var Directory = {
    API_URL: 'https://api.creed-ai.org/api/v1/orgs',
    FALLBACK_URL: '/data/directory-fallback.json',
    REFRESH_MS: 120000,
    MIN_EVENTS: 100, // overall-grade gate (a pillar needs >=100 events to count)
    _timer: null,

    gradeColor: function (grade) {
        if (!grade) return '#94a3b8';
        var g = String(grade).toUpperCase();
        if (g === 'A+' || g === 'A') return '#22c55e';
        if (g === 'B+' || g === 'B') return '#3b82f6';
        if (g === 'C') return '#eab308';
        if (g === 'D') return '#f97316';
        if (g === 'F') return '#ef4444';
        return '#94a3b8';
    },

    applyStyles: function (el, styles) {
        Object.keys(styles).forEach(function (k) { el.style[k] = styles[k]; });
    },

    setStatus: function (msg, ok) {
        var dot = document.getElementById('dir-dot');
        var txt = document.getElementById('dir-status-text');
        if (txt) txt.textContent = msg;
        if (dot) dot.style.background = ok ? '#22c55e' : '#eab308';
    },

    // An org is provisional when the API says so, or its grade isn't a real
    // letter grade, or it simply hasn't logged enough governance events yet.
    // A listing is a related party when it is the Institute, its parent company,
    // or anything operated by them. Kept as data, not as a judgement: the flag
    // says who is related, and the reader decides what that is worth.
    RELATED_DOMAINS: ['creed-ai.org', 'kytranempowerment.com', 'what-the-fact.com'],

    isRelatedParty: function (org) {
        if (org.related_party === true) return true;
        var host = '';
        try { host = new URL(org.website || org.url || '').hostname.toLowerCase(); } catch (e) { return false; }
        return this.RELATED_DOMAINS.some(function (d) { return host === d || host.endsWith('.' + d); });
    },

    isProvisional: function (org) {
        if (org.provisional === true) return true;
        var g = org.grade ? String(org.grade).toUpperCase() : '';
        var letters = ['A+', 'A', 'B+', 'B', 'C', 'D', 'F'];
        if (letters.indexOf(g) === -1) return true; // e.g. "PROVISIONAL"
        var ev = Number(org.events_30d || org.event_count || 0);
        return ev < this.MIN_EVENTS;
    },

    makeOrgCard: function (org) {
        var self = this;
        var provisional = this.isProvisional(org);
        var events = Number(org.events_30d || org.event_count || 0);
        var score = (org.overall !== undefined && org.overall !== null) ? Math.round(org.overall * 10) / 10 : null;

        var card = document.createElement('div');
        this.applyStyles(card, {
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid ' + (provisional ? 'rgba(148,163,184,0.18)' : 'rgba(201,164,76,0.25)'),
            borderRadius: '12px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
        });

        // Header: org name + verification chip
        var head = document.createElement('div');
        this.applyStyles(head, { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' });

        var nameWrap = document.createElement('div');
        var nameEl = document.createElement('div');
        this.applyStyles(nameEl, { fontFamily: "'Orbitron',sans-serif", fontSize: '1.05rem', fontWeight: '700', color: '#e2e8f0', lineHeight: '1.2' });
        nameEl.textContent = org.name || org.slug;
        nameWrap.appendChild(nameEl);
        if (this.isRelatedParty(org)) {
            var rel = document.createElement('span');
            this.applyStyles(rel, {
                display: 'inline-block', marginTop: '0.3rem', padding: '0.15rem 0.4rem',
                fontFamily: "'IBM Plex Mono',monospace", fontSize: '0.6rem', letterSpacing: '0.1em',
                textTransform: 'uppercase', color: '#e8b04b', border: '1px solid #e8b04b'
            });
            rel.textContent = 'Related party';
            rel.title = 'Operated by the C.R.E.E.D. Institute or Kytran Empowerment Inc.';
            nameWrap.appendChild(rel);
        }
        if (org.country) {
            var ctryEl = document.createElement('div');
            this.applyStyles(ctryEl, { fontFamily: "'IBM Plex Mono',monospace", fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' });
            ctryEl.textContent = org.country;
            nameWrap.appendChild(ctryEl);
        }
        head.appendChild(nameWrap);

        var tierEl = document.createElement('span');
        this.applyStyles(tierEl, { fontFamily: "'IBM Plex Mono',monospace", fontSize: '0.6rem', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.25)', borderRadius: '999px', padding: '0.15rem 0.5rem', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' });
        tierEl.textContent = (org.verification_tier || 'self_reported').replace(/_/g, ' ');
        head.appendChild(tierEl);
        card.appendChild(head);

        // Score row
        var scoreRow = document.createElement('div');
        this.applyStyles(scoreRow, { display: 'flex', alignItems: 'baseline', gap: '0.75rem' });

        if (provisional) {
            var pill = document.createElement('span');
            this.applyStyles(pill, { fontFamily: "'IBM Plex Mono',monospace", fontSize: '0.7rem', fontWeight: '700', color: '#eab308', border: '1px solid rgba(234,179,8,0.4)', background: 'rgba(234,179,8,0.08)', borderRadius: '6px', padding: '0.2rem 0.55rem', textTransform: 'uppercase', letterSpacing: '0.06em' });
            pill.textContent = 'Provisional';
            scoreRow.appendChild(pill);
        } else {
            var gradeEl = document.createElement('div');
            this.applyStyles(gradeEl, { fontFamily: "'Orbitron',sans-serif", fontSize: '2rem', fontWeight: '900', color: this.gradeColor(org.grade), lineHeight: '1' });
            gradeEl.textContent = org.grade;
            scoreRow.appendChild(gradeEl);
            if (score !== null) {
                var scoreEl = document.createElement('div');
                this.applyStyles(scoreEl, { fontFamily: "'IBM Plex Mono',monospace", fontSize: '0.95rem', color: '#94a3b8' });
                scoreEl.textContent = score + '%';
                scoreRow.appendChild(scoreEl);
            }
        }
        card.appendChild(scoreRow);

        // Sub-line: honest event context
        var sub = document.createElement('div');
        this.applyStyles(sub, { fontFamily: "'IBM Plex Mono',monospace", fontSize: '0.75rem', color: '#64748b', lineHeight: '1.4' });
        if (provisional) {
            sub.textContent = 'Insufficient data to grade — ' + Number(events).toLocaleString() +
                ' governance event' + (events === 1 ? '' : 's') + ' (min ' + this.MIN_EVENTS + ').';
        } else {
            sub.textContent = Number(events).toLocaleString() + ' governance events (30d).';
        }
        card.appendChild(sub);

        // Footer: link out
        if (org.website) {
            var link = document.createElement('a');
            link.href = org.website;
            link.target = '_blank';
            link.rel = 'noopener';
            this.applyStyles(link, { fontFamily: "'IBM Plex Mono',monospace", fontSize: '0.75rem', color: '#c9a44c', textDecoration: 'none', marginTop: '0.25rem' });
            link.textContent = 'Visit ' + (org.website || '').replace(/^https?:\/\//, '') + ' →';
            card.appendChild(link);
        }

        return card;
    },

    // 'all' | 'independent' | 'related'
    filter: 'all',

    setFilter: function (mode) {
        this.filter = mode;
        var btns = document.querySelectorAll('[data-dir-filter]');
        btns.forEach(function (b) {
            var on = b.getAttribute('data-dir-filter') === mode;
            b.style.background = on ? 'var(--color-primary)' : 'transparent';
            b.style.color = on ? '#06060f' : 'var(--color-text-muted)';
        });
        if (this._last) this.renderOrgs(this._last);
    },

    renderOrgs: function (list) {
        var grid = document.getElementById('dir-grid');
        if (!grid) return;
        this._last = list;
        var self0 = this;
        if (this.filter === 'independent') list = list.filter(function (o) { return !self0.isRelatedParty(o); });
        else if (this.filter === 'related') list = list.filter(function (o) { return self0.isRelatedParty(o); });
        while (grid.firstChild) grid.removeChild(grid.firstChild);

        if (!list || !list.length) {
            var msg = document.createElement('div');
            this.applyStyles(msg, { color: '#64748b', fontSize: '0.9rem', gridColumn: '1/-1', textAlign: 'center' });
            msg.textContent = 'No scored organizations are listed yet.';
            grid.appendChild(msg);
            return;
        }

        var self = this;
        // Verified (real grade) first, then by event volume desc.
        var sorted = list.slice().sort(function (a, b) {
            var pa = self.isProvisional(a) ? 1 : 0;
            var pb = self.isProvisional(b) ? 1 : 0;
            if (pa !== pb) return pa - pb;
            return Number(b.events_30d || 0) - Number(a.events_30d || 0);
        });
        sorted.forEach(function (org) { grid.appendChild(self.makeOrgCard(org)); });

        // Honest empty state — an empty Independent view is a real answer, not a bug.
        if (!sorted.length) {
            var empty = document.createElement('p');
            self.applyStyles(empty, {
                gridColumn: '1 / -1', fontFamily: "'IBM Plex Mono',monospace",
                fontSize: '0.9rem', lineHeight: '1.8', color: 'var(--color-text-muted)',
                border: '1px solid var(--color-border)', padding: '1.5rem', margin: '0'
            });
            empty.textContent = self.filter === 'independent'
                ? 'No independent organizations are listed yet. Every current listing is the Institute, its parent company, or a Kytran-operated product.'
                : 'No organizations match this filter.';
            grid.appendChild(empty);
        }

        var relCount = self._last.filter(function (o) { return self.isRelatedParty(o); }).length;
        var disc = document.getElementById('dir-disclosure');
        if (disc) {
            disc.textContent = relCount === self._last.length
                ? 'All ' + relCount + ' listings are related parties \u2014 the Institute, its parent company, or a Kytran-operated product. Independent adopters: 0.'
                : relCount + ' of ' + self._last.length + ' listings are related parties.';
        }

        var countEl = document.getElementById('dir-count');
        if (countEl) countEl.textContent = String(list.length);
    },

    _extract: function (data) {
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.orgs)) return data.orgs;
        return [];
    },

    fetchData: function () {
        var self = this;
        fetch(this.API_URL, { mode: 'cors', cache: 'no-cache' })
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function (data) {
                self.renderOrgs(self._extract(data));
                self.setStatus('Live · updated ' + new Date().toLocaleTimeString(), true);
            })
            .catch(function (err) {
                // Live cross-origin fetch blocked (Chrome PNA on a LAN) or outage —
                // fall back to the same-origin published snapshot so the directory
                // is never blank.
                console.warn('[DIR] live fetch failed, trying same-origin snapshot:', err);
                fetch(self.FALLBACK_URL, { cache: 'no-cache' })
                    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
                    .then(function (data) {
                        self.renderOrgs(self._extract(data));
                        var when = data._snapshot_date ? ' (' + data._snapshot_date + ')' : '';
                        self.setStatus('Published snapshot' + when + ' — live feed not reachable from this network', false);
                    })
                    .catch(function (e2) {
                        self.setStatus('Directory unavailable — retrying soon', false);
                        console.warn('[DIR] fallback also failed:', e2);
                    });
            });
    },

    init: function () {
        if (!document.getElementById('dir-grid')) return; // no-op off the directory page
        if (this._timer) { clearInterval(this._timer); this._timer = null; }
        this.fetchData();
        var self = this;
        this._timer = setInterval(function () { self.fetchData(); }, this.REFRESH_MS);
    }
};

document.addEventListener('DOMContentLoaded', function () {
    Directory.init();
});
