/* ==========================================================================
   C.R.E.E.D. Institute — Live Governance Data (barba-safe)
   Populates the governance.html live-scores widget (#lgd-* elements) from the
   public C.R.E.E.D. scores API.

   Why this is a global module (not an inline <script>): the site uses barba.js
   SPA transitions. Barba swaps only <main data-barba="container"> via innerHTML,
   and scripts injected via innerHTML do NOT execute — so an inline per-page
   <script> only runs on a HARD load and never when the page is reached by an
   in-site nav click. This module is loaded on every page (so it persists across
   swaps) and Governance.init() is invoked both on DOMContentLoaded (first load)
   and from the barba `after` hook in transitions.js (every navigation). It
   no-ops on pages without the widget. (Was: stats stuck at "—" after nav.)
   ========================================================================== */

var Governance = {
    API_URL: 'https://creed.kytranempowerment.com/api/v1/scores',
    REFRESH_MS: 60000,
    _timer: null,

    CATEGORY_LABELS: {
        accountability: 'Accountability',
        fairness: 'Fairness',
        privacy: 'Privacy',
        safety: 'Safety',
        transparency: 'Transparency'
    },
    CATEGORY_ORDER: ['accountability', 'fairness', 'privacy', 'safety', 'transparency'],

    gradeColor: function (grade) {
        if (!grade) return '#94a3b8';
        var g = String(grade).toUpperCase();
        if (g === 'A+' || g === 'A') return '#22c55e';
        if (g === 'B+' || g === 'B') return '#3b82f6';
        if (g === 'C') return '#eab308';
        if (g === 'D') return '#f97316';
        return '#ef4444';
    },

    scoreToGradeColor: function (score) {
        if (score >= 95) return '#22c55e';
        if (score >= 80) return '#3b82f6';
        if (score >= 70) return '#eab308';
        if (score >= 60) return '#f97316';
        return '#ef4444';
    },

    setStatus: function (msg, ok) {
        var dot = document.getElementById('lgd-dot');
        var txt = document.getElementById('lgd-status-text');
        if (txt) txt.textContent = msg;
        if (dot) dot.style.background = ok ? '#22c55e' : '#ef4444';
    },

    applyStyles: function (el, styles) {
        Object.keys(styles).forEach(function (k) { el.style[k] = styles[k]; });
    },

    makeCategoryCard: function (key, cat) {
        var score = cat && cat.score !== undefined ? Math.round(cat.score) : (typeof cat === 'number' ? Math.round(cat) : null);
        var grade = cat && cat.grade ? cat.grade : null;
        var label = this.CATEGORY_LABELS[key] || (key.charAt(0).toUpperCase() + key.slice(1));
        var color = grade ? this.gradeColor(grade) : (score !== null ? this.scoreToGradeColor(score) : '#94a3b8');
        var displayVal = grade || (score !== null ? (score + '%') : '—');

        var card = document.createElement('div');
        this.applyStyles(card, { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '1.25rem', textAlign: 'center' });

        var labelEl = document.createElement('div');
        this.applyStyles(labelEl, { fontFamily: "'IBM Plex Mono',monospace", fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' });
        labelEl.textContent = label;

        var valEl = document.createElement('div');
        this.applyStyles(valEl, { fontFamily: "'Orbitron',sans-serif", fontSize: '1.6rem', fontWeight: '700', color: color, lineHeight: '1' });
        valEl.textContent = displayVal;

        card.appendChild(labelEl);
        card.appendChild(valEl);

        if (grade && score !== null) {
            var subEl = document.createElement('div');
            this.applyStyles(subEl, { fontFamily: "'IBM Plex Mono',monospace", fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.3rem' });
            subEl.textContent = score + '%';
            card.appendChild(subEl);
        }

        return card;
    },

    renderCategories: function (categories) {
        var container = document.getElementById('lgd-categories');
        if (!container) return;
        while (container.firstChild) container.removeChild(container.firstChild);

        if (!categories) {
            var msg = document.createElement('div');
            this.applyStyles(msg, { color: '#64748b', fontSize: '0.85rem', gridColumn: '1/-1', textAlign: 'center' });
            msg.textContent = 'No category breakdown available.';
            container.appendChild(msg);
            return;
        }

        var self = this;
        var keys = this.CATEGORY_ORDER.filter(function (k) { return k in categories; });
        if (!keys.length) keys = Object.keys(categories);
        keys.forEach(function (key) {
            container.appendChild(self.makeCategoryCard(key, categories[key]));
        });
    },

    fetchData: function () {
        var self = this;
        fetch(this.API_URL, { mode: 'cors', cache: 'no-cache' })
            .then(function (r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            })
            .then(function (data) {
                // /api/v1/scores shape: { overall:<number>, grade, event_count, by_category:{...} }.
                // Tolerate object-shaped overall and the public /score shape too.
                var overallObj = (data.overall && typeof data.overall === 'object') ? data.overall : data;
                var grade = data.grade || overallObj.grade || '—';
                var rawScore = (typeof data.overall === 'number') ? data.overall
                    : (overallObj.score !== undefined ? overallObj.score
                        : (data.score !== undefined ? data.score : null));
                var score = rawScore !== null ? Math.round(rawScore * 10) / 10 : null;
                var events = data.event_count !== undefined ? data.event_count
                    : (overallObj.event_count !== undefined ? overallObj.event_count
                        : (data.events_today !== undefined ? data.events_today : null));

                var gradeEl = document.getElementById('lgd-grade');
                if (gradeEl) { gradeEl.textContent = grade; gradeEl.style.color = self.gradeColor(grade); }

                var scoreEl = document.getElementById('lgd-score');
                if (scoreEl) scoreEl.textContent = score !== null ? score + '%' : '—';

                var eventsEl = document.getElementById('lgd-events');
                if (eventsEl) eventsEl.textContent = events !== null ? Number(events).toLocaleString() : '—';

                self.renderCategories(data.by_category || data.categories || data.breakdown || null);
                self.setStatus('Updated ' + new Date().toLocaleTimeString(), true);
            })
            .catch(function (err) {
                self.setStatus('Unavailable — retrying in 60s', false);
                console.warn('[LGD] fetch error:', err);
            });
    },

    init: function () {
        // No-op unless the live-governance widget is on the current page.
        if (!document.getElementById('lgd-score')) return;
        // Clear any prior refresh timer so repeated barba visits don't stack intervals.
        if (this._timer) { clearInterval(this._timer); this._timer = null; }
        this.fetchData();
        var self = this;
        this._timer = setInterval(function () { self.fetchData(); }, this.REFRESH_MS);
    }
};

document.addEventListener('DOMContentLoaded', function () {
    Governance.init();
});
