/* ==========================================================================
   creed-tools.js — the three interactive tools of the standard.
   Calculator (#calc-rows), Validator (#val-json), Badge (#bg-slug).
   Each init() no-ops unless its root element is on the page, so this file is
   safe to load site-wide; today it ships only on calculator/validator/badge.

   Depends on creed-data.js for the scoring constants (SEVERITY_WEIGHTS,
   CATEGORIES, gradeFor, API) so the maths here cannot drift from the maths
   published on the standard. Falls back to inline copies if it is absent.
   ========================================================================== */
(function () {
    'use strict';

    function D() { return window.CreedData || null; }
    function W() { var d = D(); return d ? d.SEVERITY_WEIGHTS : { info: 0, warning: 1, violation: 3, critical: 5 }; }
    function CATS() { var d = D(); return d ? d.CATEGORIES : ['transparency', 'fairness', 'safety', 'privacy', 'accountability', 'environmental']; }
    function gradeFor(x) {
        var d = D();
        if (d) return d.gradeFor(x);
        return x >= 95 ? 'A+' : x >= 90 ? 'A' : x >= 85 ? 'B+' : x >= 80 ? 'B' : x >= 70 ? 'C' : x >= 60 ? 'D' : 'F';
    }
    var GRADE_COLOR = { 'A+': '#22c55e', 'A': '#22c55e', 'B+': '#3b82f6', 'B': '#3b82f6', 'C': '#eab308', 'D': '#f97316', 'F': '#ef4444' };
    var MARK = {
        pass: ['\u2713', '#22c55e', 'Pass'],
        fail: ['\u2715', '#ef4444', 'Fail'],
        warn: ['!', '#eab308', 'Warning'],
        skip: ['\u2013', '#888', 'Skipped']
    };
    function fmt(n) { return Number(n).toLocaleString(); }
    function el(tag, style, text) {
        var e = document.createElement(tag);
        if (style) e.setAttribute('style', style);
        if (text !== undefined) e.textContent = text;
        return e;
    }
    /* A check row: coloured mark, label, detail. The mark is aria-hidden and the
       status is repeated as visually-hidden text, so a screen reader hears
       "Pass: category is one of the six pillars" rather than a bare tick. */
    function checkRow(status, label, detail) {
        var li = el('li'); li.className = 'tool-check';
        var m = MARK[status] || MARK.skip;
        var mark = el('span', 'color:' + m[1], m[0]);
        mark.className = 'tool-check__mark';
        mark.setAttribute('aria-hidden', 'true');
        li.appendChild(mark);
        var body = el('div');
        var top = el('div', 'color:var(--color-text);font-size:var(--text-sm)');
        var sr = el('span', 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap', m[2] + ': ');
        top.appendChild(sr);
        top.appendChild(document.createTextNode(label));
        body.appendChild(top);
        body.appendChild(el('div', 'color:var(--color-text-muted);font-size:var(--text-xs);line-height:1.5', detail));
        li.appendChild(body);
        return li;
    }

    /* ====================================================================== */
    /* Score calculator                                                        */
    /* ====================================================================== */
    var Calculator = {
        PILLAR_MIN: 100,
        state: { info: 900, warning: 80, violation: 15, critical: 5, pillars: 3, days: 30 },

        PRESETS: [
            ['Clean feed',   { info: 500, warning: 0,   violation: 0,   critical: 0,  pillars: 3, days: 30 }],
            ['Mostly clean', { info: 900, warning: 80,  violation: 15,  critical: 5,  pillars: 3, days: 30 }],
            ['Troubled',     { info: 300, warning: 200, violation: 120, critical: 60, pillars: 4, days: 45 }],
            ['Tiny feed',    { info: 20,  warning: 2,   violation: 0,   critical: 0,  pillars: 1, days: 6  }]
        ],

        init: function () {
            var rows = document.getElementById('calc-rows');
            if (!rows) return;
            var self = this;
            var d = D();
            if (d && d.PILLAR_MIN_EVENTS) this.PILLAR_MIN = d.PILLAR_MIN_EVENTS;

            [['info', 'Info'], ['warning', 'Warning'], ['violation', 'Violation'], ['critical', 'Critical']].forEach(function (pair) {
                var key = pair[0], weights = W();
                var row = el('div'); row.className = 'tool-row';

                var label = el('label', 'font-size:var(--text-sm);color:var(--color-text)');
                label.setAttribute('for', 'calc-' + key);
                label.appendChild(document.createTextNode(pair[1] + ' '));
                label.appendChild(el('span',
                    'display:inline-block;margin-left:0.4rem;font-size:0.65rem;color:var(--color-text-muted);' +
                    'border:1px solid rgba(136,136,136,0.35);border-radius:999px;padding:0.1rem 0.5rem;' +
                    'text-transform:uppercase;letter-spacing:0.08em',
                    'weight ' + weights[key]));

                var range = el('input');
                range.type = 'range'; range.id = 'calc-' + key;
                range.min = '0'; range.max = '1000'; range.step = '1';
                range.value = self.state[key];

                var num = el('input', 'padding:0.45rem 0.6rem');
                num.type = 'number'; num.min = '0'; num.step = '1';
                num.className = 'tool-field';
                num.value = self.state[key];
                num.setAttribute('aria-label', pair[1] + ' count');

                function set(v) {
                    var n = Math.floor(Number(v));
                    if (!isFinite(n) || n < 0) n = 0;
                    self.state[key] = n;
                    range.value = Math.min(n, 1000);
                    num.value = n;
                    self.render();
                }
                range.addEventListener('input', function () { set(range.value); });
                num.addEventListener('input', function () { set(num.value); });

                row.appendChild(label); row.appendChild(range); row.appendChild(num);
                rows.appendChild(row);
                self['_' + key] = { range: range, num: num };
            });

            [['pillars', 6], ['days', 3650]].forEach(function (pair) {
                var key = pair[0], cap = pair[1];
                var range = document.getElementById('calc-' + key);
                var num = document.getElementById('calc-' + key + '-n');
                if (!range || !num) return;
                function set(v) {
                    var n = Math.floor(Number(v));
                    if (!isFinite(n) || n < 0) n = 0;
                    if (n > cap) n = cap;
                    self.state[key] = n;
                    range.value = Math.min(n, Number(range.max));
                    num.value = n;
                    self.render();
                }
                range.addEventListener('input', function () { set(range.value); });
                num.addEventListener('input', function () { set(num.value); });
                self['_' + key] = { range: range, num: num };
            });

            var presets = document.getElementById('calc-presets');
            if (presets) {
                this.PRESETS.forEach(function (p) {
                    var b = el('button', 'padding:0.35rem 0.9rem;font-size:var(--text-xs)', p[0]);
                    b.type = 'button'; b.className = 'btn btn--outline';
                    b.addEventListener('click', function () {
                        Object.keys(p[1]).forEach(function (k) { self.state[k] = p[1][k]; });
                        self.syncInputs();
                        self.render();
                    });
                    presets.appendChild(b);
                });
            }

            this.render();
        },

        syncInputs: function () {
            var self = this;
            ['info', 'warning', 'violation', 'critical', 'pillars', 'days'].forEach(function (k) {
                var r = self['_' + k];
                if (!r) return;
                r.range.value = Math.min(self.state[k], Number(r.range.max));
                r.num.value = self.state[k];
            });
        },

        render: function () {
            var s = this.state, w = W();
            var total = s.info + s.warning + s.violation + s.critical;
            var weighted = w.info * s.info + w.warning * s.warning + w.violation * s.violation + w.critical * s.critical;
            var maxPossible = w.critical * total;
            var rate = total ? weighted / maxPossible : 0;
            var score = total ? Math.round(100 * (1 - rate) * 10) / 10 : 100;
            var grade = gradeFor(score);

            var pillarOk = total >= this.PILLAR_MIN;
            var gateEvents = total >= 100, gatePillars = s.pillars >= 3, gateDays = s.days >= 14;
            var published = gateEvents && gatePillars && gateDays;
            /* A score below the pillar minimum is shown muted: it exists, but it is
               not something the Institute is willing to publish as a grade yet. */
            var provisionalScore = !total || !pillarOk;

            var gEl = document.getElementById('calc-grade');
            gEl.textContent = grade;
            gEl.style.color = provisionalScore ? '#888' : (GRADE_COLOR[grade] || '#c9a44c');
            document.getElementById('calc-score').textContent = score.toFixed(1) + '%';

            var gate = document.getElementById('calc-gate');
            gate.textContent = published ? 'Published' : 'Provisional';
            gate.style.color = published ? '#22c55e' : '#eab308';
            gate.style.border = '1px solid ' + (published ? 'rgba(34,197,94,0.45)' : 'rgba(234,179,8,0.45)');
            gate.style.background = published ? 'rgba(34,197,94,0.08)' : 'rgba(234,179,8,0.08)';

            var x = Math.max(0, Math.min(100, score));
            var marker = document.getElementById('calc-marker');
            marker.setAttribute('x1', x); marker.setAttribute('x2', x);

            document.getElementById('calc-formula').textContent =
                'weighted sum    = 0\u00d7' + fmt(s.info) + ' + 1\u00d7' + fmt(s.warning) +
                ' + 3\u00d7' + fmt(s.violation) + ' + 5\u00d7' + fmt(s.critical) + ' = ' + fmt(weighted) +
                '\nmax possible    = 5 \u00d7 ' + fmt(total) + ' events = ' + fmt(maxPossible) +
                '\nviolation rate  = ' + fmt(weighted) + ' \u00f7 ' + fmt(maxPossible) + ' = ' + (total ? rate.toFixed(3) : '0 (no events)') +
                '\nscore           = 100 \u00d7 (1 \u2212 ' + (total ? rate.toFixed(3) : '0') + ') = ' + score.toFixed(1) + ' \u2192 ' + grade;

            var gates = document.getElementById('calc-gates');
            gates.innerHTML = '';
            [
                [pillarOk, 'Pillar gate: \u2265 ' + fmt(this.PILLAR_MIN) + ' events in this pillar',
                    pillarOk ? fmt(total) + ' events \u2014 this pillar counts toward the overall grade.'
                             : fmt(total) + ' events \u2014 shown muted as provisional and excluded from the overall until it reaches ' + fmt(this.PILLAR_MIN) + '.'],
                [gateEvents, 'Tenant gate: \u2265 100 events across the feed',
                    fmt(total) + ' events in this pillar alone' + (gateEvents ? '.' : ' \u2014 three info events cannot buy an A+.')],
                [gatePillars, 'Tenant gate: \u2265 3 pillars reporting',
                    s.pillars + ' of 6 pillars have events' + (gatePillars ? '.' : ' \u2014 a single-pillar feed is not scored publicly.')],
                [gateDays, 'Tenant gate: \u2265 14 days of history',
                    s.days + ' day' + (s.days === 1 ? '' : 's') + (gateDays ? '.' : ' \u2014 the badge reads PROVISIONAL until the feed has spanned two weeks.')]
            ].forEach(function (g) {
                gates.appendChild(checkRow(g[0] ? 'pass' : 'warn', g[1], g[2]));
            });
        }
    };

    /* ====================================================================== */
    /* Event schema validator                                                  */
    /* ====================================================================== */
    var Validator = {
        CAP: 4096,
        REQ: ['event_type', 'source_platform', 'agent_id', 'category', 'severity', 'description'],

        VALID: JSON.stringify({
            event_type: 'welfare_rest', source_platform: 'acme-orchestrator',
            agent_id: 'worker-7', agent_name: 'Worker Seven',
            category: 'fairness', severity: 'info',
            description: 'agent rested after reaching daily token budget',
            metadata: { budget: 120000 }
        }, null, 2),

        INVALID: JSON.stringify({
            event_type: 'Escalation!', source_platform: 'acme-orchestrator',
            category: 'compliance', severity: 'high',
            description: 'flagged account jane.doe@example.com, callback +1 514 555 0199',
            metadata: { ticket: 'T-4471' }, user_id: 8812
        }, null, 2),

        init: function () {
            var ta = document.getElementById('val-json');
            if (!ta) return;
            var self = this;
            ta.value = this.VALID;
            ta.addEventListener('input', function () { self.render(ta.value); });
            var ok = document.getElementById('val-ex-ok');
            var bad = document.getElementById('val-ex-bad');
            if (ok) ok.addEventListener('click', function () { ta.value = self.VALID; self.render(ta.value); });
            if (bad) bad.addEventListener('click', function () { ta.value = self.INVALID; self.render(ta.value); });
            this.render(ta.value);
        },

        /* Events describe systems, never people — so an email or phone number
           anywhere in the payload is a hard rejection, not a warning. */
        pii: function (str) {
            var s = String(str);
            if (/[\w.+-]+@[\w-]+\.[\w.-]+/.test(s)) return 'contains an email address';
            if (/\+?\d[\d\s().-]{8,}\d/.test(s)) return 'contains a phone number';
            return '';
        },

        validate: function (text) {
            var cats = CATS(), w = W(), cap = this.CAP, self = this;
            var KNOWN = this.REQ.concat(['agent_name', 'metadata']);
            var checks = [], ev = null, parseErr = '';
            function add(label, status, detail) { checks.push({ label: label, status: status, detail: detail }); }

            try { ev = JSON.parse(text); } catch (e) { parseErr = e.message; }
            var isObj = ev && typeof ev === 'object' && !Array.isArray(ev);

            if (!isObj) {
                add('Valid JSON object', 'fail', parseErr
                    ? 'Could not parse: ' + parseErr
                    : 'The event must be a single JSON object, not ' + (Array.isArray(ev) ? 'an array' : typeof ev) + '.');
                ['Required fields present', 'Required fields are non-empty strings',
                 'category is one of the six pillars', 'severity is info \u00b7 warning \u00b7 violation \u00b7 critical',
                 'No personal data in description', 'metadata is an object of at most ' + fmt(cap) + ' bytes',
                 'No personal data in metadata', 'agent_name is a string',
                 'No unknown top-level fields', 'event_type is a short machine string'
                ].forEach(function (l) { add(l, 'skip', 'Skipped until the JSON parses.'); });
                return { checks: checks, weight: null, category: null };
            }

            add('Valid JSON object', 'pass', Object.keys(ev).length + ' top-level fields.');

            var missing = this.REQ.filter(function (k) { return !(k in ev) || ev[k] === null || ev[k] === undefined || ev[k] === ''; });
            add('Required fields present', missing.length ? 'fail' : 'pass',
                missing.length ? 'Missing: ' + missing.join(', ') : this.REQ.join(', ') + '.');

            var wrongType = this.REQ.filter(function (k) { return k in ev && ev[k] !== null && ev[k] !== undefined && typeof ev[k] !== 'string'; });
            add('Required fields are non-empty strings', wrongType.length ? 'fail' : 'pass',
                wrongType.length ? 'Not strings: ' + wrongType.join(', ') : 'All present values are strings.');

            var cat = typeof ev.category === 'string' ? ev.category : '';
            if (cats.indexOf(cat) !== -1) {
                add('category is one of the six pillars', 'pass',
                    cat + ' \u2192 counts toward the ' + cat.charAt(0).toUpperCase() + cat.slice(1) + ' pillar.');
            } else if (cat === 'welfare') {
                add('category is one of the six pillars', 'warn',
                    'welfare is accepted by ingest but scored by the separate welfare engine \u2014 it never moves the ethics overall.');
            } else {
                add('category is one of the six pillars', 'fail',
                    (cat ? '"' + cat + '"' : 'Nothing') + ' given. Allowed: ' + cats.join(', ') + '.');
            }

            var sev = typeof ev.severity === 'string' ? ev.severity : '';
            var weight = sev in w ? w[sev] : null;
            add('severity is info \u00b7 warning \u00b7 violation \u00b7 critical', weight === null ? 'fail' : 'pass',
                weight === null
                    ? (sev ? '"' + sev + '"' : 'Nothing') + ' given \u2014 the four severities carry scoring weights 0, 1, 3 and 5.'
                    : sev + ' carries weight ' + weight + '.');

            var dPii = this.pii(ev.description || '');
            add('No personal data in description', dPii ? 'fail' : 'pass',
                dPii ? 'Description ' + dPii + '. Events describe systems, never people.' : 'No email or phone pattern found.');

            if ('metadata' in ev) {
                var mOk = ev.metadata && typeof ev.metadata === 'object' && !Array.isArray(ev.metadata);
                var bytes = mOk ? new TextEncoder().encode(JSON.stringify(ev.metadata)).length : 0;
                add('metadata is an object of at most ' + fmt(cap) + ' bytes',
                    !mOk ? 'fail' : (bytes > cap ? 'fail' : 'pass'),
                    !mOk ? 'metadata must be a JSON object.' : fmt(bytes) + ' bytes serialized' + (bytes > cap ? ' \u2014 over the cap.' : '.'));
                var mPii = mOk ? this.pii(JSON.stringify(ev.metadata)) : '';
                add('No personal data in metadata', mPii ? 'fail' : 'pass',
                    mPii ? 'Metadata ' + mPii + '.' : 'No email or phone pattern found.');
            } else {
                add('metadata is an object of at most ' + fmt(cap) + ' bytes', 'skip', 'Optional \u2014 not provided.');
                add('No personal data in metadata', 'skip', 'Optional \u2014 not provided.');
            }

            if ('agent_name' in ev) {
                add('agent_name is a string', typeof ev.agent_name === 'string' ? 'pass' : 'fail',
                    typeof ev.agent_name === 'string' ? '"' + ev.agent_name + '" is the display name.' : 'agent_name must be a string.');
            } else {
                add('agent_name is a string', 'skip', 'Optional \u2014 not provided; agent_id is shown instead.');
            }

            var unknown = Object.keys(ev).filter(function (k) { return KNOWN.indexOf(k) === -1; });
            add('No unknown top-level fields', unknown.length ? 'warn' : 'pass',
                unknown.length ? 'Unknown: ' + unknown.join(', ') + '. Move extra context under metadata.' : 'Only schema fields present.');

            var et = typeof ev.event_type === 'string' ? ev.event_type : '';
            var etOk = /^[a-z0-9][a-z0-9_.:-]{0,63}$/.test(et);
            add('event_type is a short machine string', etOk ? 'pass' : 'warn',
                etOk ? '"' + et + '" \u2014 lowercase, no spaces, \u2264 64 characters.'
                     : 'Prefer lowercase snake_case such as welfare_rest or approval_denied (\u2264 64 characters, no spaces).');

            return { checks: checks, weight: weight, category: cats.indexOf(cat) !== -1 ? cat : null };
        },

        render: function (text) {
            var r = this.validate(text);
            var fails = 0, warns = 0;
            r.checks.forEach(function (c) { if (c.status === 'fail') fails++; else if (c.status === 'warn') warns++; });

            var IMPACT = {
                0: 'an info event adds volume toward the gate without lowering the score',
                1: 'a warning weighs 1 of a possible 5 \u2014 a small dip',
                3: 'a violation weighs 3 of 5 \u2014 three times a warning',
                5: 'a critical event weighs the maximum 5 of 5'
            };
            var impact = (r.weight !== null && r.category)
                ? 'Counts toward ' + r.category + ' with weight ' + r.weight + ': ' + IMPACT[r.weight] + '.'
                : (r.weight !== null
                    ? 'Ingest will accept it, but it is not scored against any ethics pillar.'
                    : '');
            function line(parts) { return parts.filter(Boolean).join(' '); }

            var v = fails
                ? ['Rejected by ingest', '#ef4444', 'rgba(239,68,68,0.45)', 'rgba(239,68,68,0.06)',
                   fails + ' check' + (fails === 1 ? '' : 's') + ' failed. Fix the items marked \u2715 and validate again.']
                : warns
                    ? ['Accepted, with warnings', '#eab308', 'rgba(234,179,8,0.45)', 'rgba(234,179,8,0.06)',
                       line([warns + ' advisory item' + (warns === 1 ? '' : 's') + '.', impact])]
                    : ['Accepted', '#22c55e', 'rgba(34,197,94,0.45)', 'rgba(34,197,94,0.06)',
                       line(['Schema-valid.', impact])];

            var box = document.getElementById('val-verdict');
            box.style.border = '1px solid ' + v[2];
            box.style.background = v[3];
            var title = document.getElementById('val-verdict-title');
            title.textContent = v[0];
            title.style.color = v[1];
            document.getElementById('val-verdict-detail').textContent = v[4];

            var list = document.getElementById('val-checks');
            list.innerHTML = '';
            r.checks.forEach(function (c) { list.appendChild(checkRow(c.status, c.label, c.detail)); });
        }
    };

    /* ====================================================================== */
    /* Badge generator                                                         */
    /* ====================================================================== */
    var Badge = {
        DEFAULT_SLUG: 'creed-institute',
        orgs: [],

        init: function () {
            var slugEl = document.getElementById('bg-slug');
            if (!slugEl) return;
            var self = this;
            slugEl.value = this.DEFAULT_SLUG;

            ['bg-slug', 'bg-alt'].forEach(function (id) {
                var e = document.getElementById(id);
                if (e) e.addEventListener('input', function () { self.render(); });
            });
            var link = document.getElementById('bg-link');
            if (link) link.addEventListener('change', function () { self.render(); });

            document.querySelectorAll('[data-copy]').forEach(function (b) {
                b.addEventListener('click', function () { self.copy(b); });
            });

            var img = document.getElementById('bg-img');
            if (img) {
                img.addEventListener('error', function () {
                    img.hidden = true;
                    var f = document.getElementById('bg-img-fail');
                    if (f) f.hidden = false;
                });
                img.addEventListener('load', function () {
                    img.hidden = false;
                    var f = document.getElementById('bg-img-fail');
                    if (f) f.hidden = true;
                });
            }

            this.render();
            this.loadOrgs();
        },

        /* Slug suggestions come from the public directory, so a user can find
           their own slug without asking. Failure is silent: the tool works
           without the list, it is only less convenient. */
        loadOrgs: function () {
            var self = this, waited = 0;
            (function tick() {
                var d = D();
                if (d && d.loadOrgs) {
                    d.loadOrgs({}).then(function (r) {
                        self.orgs = (r && r.list) || [];
                        var dl = document.getElementById('bg-slugs');
                        if (dl) {
                            dl.innerHTML = '';
                            self.orgs.forEach(function (o) {
                                var opt = document.createElement('option');
                                opt.value = o.slug; opt.textContent = o.name;
                                dl.appendChild(opt);
                            });
                        }
                        self.render();
                    }, function () {});
                    return;
                }
                if ((waited += 50) < 8000) setTimeout(tick, 50);
            })();
        },

        render: function () {
            var d = D();
            var host = d ? d.API : 'https://api.creed-ai.org';
            var slug = (document.getElementById('bg-slug').value || '').trim();
            var safe = encodeURIComponent(slug || 'your-org');
            var mode = document.getElementById('bg-link').value;
            var alt = document.getElementById('bg-alt').value || 'C.R.E.E.D. transparency score';

            var badgeUrl = host + '/api/v1/badge/' + safe + '/overall';
            var linkUrl = mode === 'directory' ? 'https://creed-ai.org/directory.html#' + safe
                        : mode === 'scores' ? host + '/api/v1/orgs/' + safe + '/scores' : '';

            var img = '<img src="' + badgeUrl + '" alt="' + alt.replace(/"/g, '&quot;') + '">';
            var htmlSnippet = linkUrl ? '<a href="' + linkUrl + '">' + img + '</a>' : img;
            var mdImg = '![' + alt.replace(/[\[\]]/g, '') + '](' + badgeUrl + ')';
            var mdSnippet = linkUrl ? '[' + mdImg + '](' + linkUrl + ')' : mdImg;
            var rstSnippet = '.. image:: ' + badgeUrl + '\n   :alt: ' + alt + (linkUrl ? '\n   :target: ' + linkUrl : '');

            document.getElementById('bg-url').textContent = badgeUrl;
            document.getElementById('bg-html').textContent = htmlSnippet;
            document.getElementById('bg-md').textContent = mdSnippet;
            document.getElementById('bg-rst').textContent = rstSnippet;

            var imgEl = document.getElementById('bg-img');
            if (imgEl && imgEl.getAttribute('src') !== badgeUrl) {
                imgEl.setAttribute('src', badgeUrl);
                imgEl.setAttribute('alt', alt);
            }

            this._snippets = { html: htmlSnippet, md: mdSnippet, rst: rstSnippet };

            var known = null;
            for (var i = 0; i < this.orgs.length; i++) if (this.orgs[i].slug === slug) { known = this.orgs[i]; break; }
            var hint;
            if (!slug) {
                hint = 'Your slug is assigned when the Institute creates your tenant.';
            } else if (known) {
                var prov = d && d.isProvisional ? d.isProvisional(known) : !!known.provisional;
                hint = 'Found in the directory: ' + known.name +
                    (prov ? ' \u00b7 provisional'
                          : ' \u00b7 ' + String(known.grade).toUpperCase() + (known.overall != null ? ' (' + known.overall + '%)' : '')) +
                    ' \u00b7 ' + String(known.verification_tier || 'self_reported').replace(/_/g, ' ') + '.';
            } else if (this.orgs.length) {
                hint = 'Not in the public directory yet \u2014 the badge will read PROVISIONAL until the feed clears the gate.';
            } else {
                hint = 'Start typing to see slugs from the public directory.';
            }
            document.getElementById('bg-hint').textContent = hint;
        },

        copy: function (btn) {
            var key = btn.getAttribute('data-copy');
            var text = (this._snippets || {})[key];
            if (!text) return;
            function done() {
                btn.textContent = 'Copied \u2713';
                setTimeout(function () { btn.textContent = 'Copy'; }, 1600);
            }
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(done, function () { fallback(); });
            } else fallback();
            function fallback() {
                var ta = document.createElement('textarea');
                ta.value = text; ta.setAttribute('readonly', '');
                ta.style.position = 'fixed'; ta.style.opacity = '0';
                document.body.appendChild(ta); ta.select();
                try { document.execCommand('copy'); } catch (e) {}
                document.body.removeChild(ta);
                done();
            }
        }
    };

    function init() { Calculator.init(); Validator.init(); Badge.init(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    window.CreedTools = { Calculator: Calculator, Validator: Validator, Badge: Badge };
})();
