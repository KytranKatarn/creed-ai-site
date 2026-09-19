/* creed-data.js — shared client for the public C.R.E.E.D. scoring API.
 * One place for the API host, the scoring constants (mirrors kytran_creed/services/scoring_engine.py),
 * grade colours, freshness maths, and the same-origin snapshot fallback that keeps widgets
 * from ever rendering blank. Used by the home strip, directory, badge generator and calculator. */
window.CreedData = (function () {
  'use strict';
  /* One canonical host. standard.html documented api.creed-ai.org while the scripts
     called creed.kytranempowerment.com; whichever was wrong, a developer following the
     docs wrote to the wrong place. CNAME api.creed-ai.org at the platform. */
  var API = 'https://api.creed-ai.org';
  var SEVERITY_WEIGHTS = { info: 0, warning: 1, violation: 3, critical: 5 };
  var CATEGORIES = ['transparency', 'fairness', 'safety', 'privacy', 'accountability', 'environmental'];
  var CATEGORY_LABELS = { transparency: 'Transparency', fairness: 'Fairness', safety: 'Safety', privacy: 'Privacy', accountability: 'Accountability', environmental: 'Environmental' };
  var GRADE_THRESHOLDS = [[95, 'A+'], [90, 'A'], [85, 'B+'], [80, 'B'], [70, 'C'], [60, 'D']];
  var LETTERS = ['A+', 'A', 'B+', 'B', 'C', 'D', 'F'];
  var PILLAR_MIN_EVENTS = 100;
  var TENANT_GATE = { events: 100, pillars: 3, days: 14 };
  var MUTED = '#888';

  function gradeFor(score) {
    for (var i = 0; i < GRADE_THRESHOLDS.length; i++) if (score >= GRADE_THRESHOLDS[i][0]) return GRADE_THRESHOLDS[i][1];
    return 'F';
  }
  function gradeColor(grade) {
    var g = String(grade || '').toUpperCase();
    if (g === 'A+' || g === 'A') return '#22c55e';
    if (g === 'B+' || g === 'B') return '#3b82f6';
    if (g === 'C') return '#eab308';
    if (g === 'D') return '#f97316';
    if (g === 'F') return '#ef4444';
    return MUTED;
  }
  function isLetter(g) { return LETTERS.indexOf(String(g || '').toUpperCase()) !== -1; }

  function fetchJSON(url, ms) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var t = ctrl ? setTimeout(function () { ctrl.abort(); }, ms || 6000) : null;
    return fetch(url, { mode: 'cors', cache: 'no-cache', signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .finally(function () { if (t) clearTimeout(t); });
  }

  /* Snapshots mirror /data/governance-fallback.json and /data/directory-fallback.json in the site repo. */
  var SCORES_SNAPSHOT = {
    _snapshot_date: '2026-08-30', overall: 100.0, grade: 'A+', event_count: 5, overall_provisional: true,
    by_category: {
      accountability: { events: 5, grade: 'A+', note: 'below minimum volume (5 events; minimum 100 for a non-provisional score)', provisional: true, score: 100.0 },
      environmental: { events: 0, grade: 'A+', note: 'no events recorded', provisional: true, score: 100.0 },
      fairness: { events: 0, grade: 'A+', note: 'no events recorded', provisional: true, score: 100.0 },
      privacy: { events: 0, grade: 'A+', note: 'no events recorded', provisional: true, score: 100.0 },
      safety: { events: 0, grade: 'A+', note: 'no events recorded', provisional: true, score: 100.0 },
      transparency: { events: 0, grade: 'A+', note: 'no events recorded', provisional: true, score: 100.0 }
    }
  };
  var ORGS_SNAPSHOT = {
    _snapshot_date: '2026-08-23',
    orgs: [
      { country: 'Canada', events_30d: 433, grade: 'A+', last_event_at: '2026-08-23T03:00:17', member_since: '2026-06-09T21:15:03', name: 'C.R.E.E.D. Institute', overall: 100.0, provisional: false, slug: 'creed-institute', verification_tier: 'self_reported', website: 'https://creed-ai.org' },
      { country: 'Canada', events_30d: 804926, grade: 'A+', last_event_at: '2026-08-23T07:26:38', member_since: '2026-06-10T14:40:47', name: 'Kytran Empowerment', overall: 99.8, provisional: false, slug: 'kytran-empowerment', verification_tier: 'self_reported', website: 'https://kytranempowerment.com' },
      { country: 'Canada', events_30d: 432, grade: 'PROVISIONAL', last_event_at: '2026-08-23T03:00:07', member_since: '2026-06-10T14:40:47', name: 'Gov Watch', overall: null, provisional: true, slug: 'gov-watch', verification_tier: 'self_reported', website: 'https://gov.kytranempowerment.com' },
      { country: 'Canada', events_30d: 550, grade: 'A+', last_event_at: '2026-08-23T07:00:55', member_since: '2026-06-10T14:40:47', name: 'Civic Watch', overall: 99.3, provisional: false, slug: 'civic-watch', verification_tier: 'self_reported', website: 'https://civic.kytranempowerment.com' },
      { country: 'Canada', events_30d: 0, grade: 'PROVISIONAL', last_event_at: null, member_since: '2026-06-10T14:40:47', name: 'Legal Watch', overall: null, provisional: true, slug: 'legal-watch', verification_tier: 'self_reported', website: 'https://legal.kytranempowerment.com' },
      { country: 'Canada', events_30d: 436, grade: 'PROVISIONAL', last_event_at: '2026-08-23T03:00:16', member_since: '2026-06-10T14:40:47', name: 'Market Watch', overall: null, provisional: true, slug: 'market-watch', verification_tier: 'self_reported', website: 'https://market.kytranempowerment.com' },
      { country: 'Canada', events_30d: 7878, grade: 'A+', last_event_at: '2026-08-23T06:00:11', member_since: '2026-06-10T14:40:47', name: 'What The Fact', overall: 95.4, provisional: false, slug: 'what-the-fact', verification_tier: 'self_reported', website: 'https://what-the-fact.com' },
      { country: 'Canada', events_30d: 437, grade: 'PROVISIONAL', last_event_at: '2026-08-23T03:00:05', member_since: '2026-06-10T14:47:44', name: 'Kytran System Operations', overall: null, provisional: true, slug: 'kso', verification_tier: 'self_reported', website: 'https://server.kytranempowerment.com' },
      { country: 'Canada', events_30d: 0, grade: 'PROVISIONAL', last_event_at: null, member_since: '2026-06-10T14:47:44', name: 'Kytran Business Suite', overall: null, provisional: true, slug: 'kbs', verification_tier: 'self_reported', website: 'https://business.kytranempowerment.com' },
      { country: 'Canada', events_30d: 438, grade: 'A+', last_event_at: '2026-08-23T03:00:07', member_since: '2026-06-10T14:47:44', name: 'Media Hub', overall: 100.0, provisional: false, slug: 'media-hub', verification_tier: 'self_reported', website: 'https://media.kytranempowerment.com' }
    ]
  };

  function loadScores(opts) {
    opts = opts || {};
    if (opts.source === 'snapshot') return Promise.resolve({ data: SCORES_SNAPSHOT, live: false });
    return fetchJSON((opts.api || API) + '/api/v1/scores', opts.timeout)
      .then(function (d) { return { data: d, live: true }; })
      .catch(function () { return { data: SCORES_SNAPSHOT, live: false }; });
  }
  function extractOrgs(d) { return Array.isArray(d) ? d : (d && Array.isArray(d.orgs) ? d.orgs : []); }
  function loadOrgs(opts) {
    opts = opts || {};
    if (opts.source === 'snapshot') return Promise.resolve({ list: extractOrgs(ORGS_SNAPSHOT), live: false, snapshotDate: ORGS_SNAPSHOT._snapshot_date });
    return fetchJSON((opts.api || API) + '/api/v1/orgs', opts.timeout)
      .then(function (d) { return { list: extractOrgs(d), live: true, snapshotDate: '' }; })
      .catch(function () { return { list: extractOrgs(ORGS_SNAPSHOT), live: false, snapshotDate: ORGS_SNAPSHOT._snapshot_date }; });
  }

  /* Provisional = API flag, or non-letter grade, or below the volume gate — same rule as js/directory.js. */
  function isProvisional(org, minEvents) {
    if (org.provisional === true) return true;
    if (!isLetter(org.grade)) return true;
    return Number(org.events_30d || org.event_count || 0) < (minEvents || PILLAR_MIN_EVENTS);
  }
  function overallProvisional(scores) {
    if (!scores) return true;
    if (scores.overall_provisional === true) return true;
    var cats = scores.by_category || scores.categories || null;
    if (!cats) return false;
    var keys = Object.keys(cats);
    return keys.length > 0 && keys.every(function (k) { return cats[k] && cats[k].provisional; });
  }

  function parseUTC(iso) {
    if (!iso) return null;
    var s = String(iso);
    if (!/[zZ]|[+-]\d\d:?\d\d$/.test(s)) s += 'Z';
    var t = Date.parse(s);
    return isNaN(t) ? null : t;
  }
  function relativeTime(iso, now) {
    var t = parseUTC(iso);
    if (t === null) return 'never';
    var diff = Math.max(0, (now || Date.now()) - t), m = Math.round(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    var h = Math.round(m / 60);
    if (h < 48) return h + ' h ago';
    var d = Math.round(h / 24);
    if (d < 60) return d + ' d ago';
    return Math.round(d / 30) + ' mo ago';
  }
  /* Freshness colour: reporting within 24 h is healthy, within 7 d is stale, beyond that is silent. */
  function freshness(iso, now) {
    var t = parseUTC(iso);
    if (t === null) return { text: 'never reported', color: MUTED, level: 'none' };
    var age = (now || Date.now()) - t;
    if (age < 86400000) return { text: 'last reported ' + relativeTime(iso, now), color: '#22c55e', level: 'fresh' };
    if (age < 7 * 86400000) return { text: 'last reported ' + relativeTime(iso, now), color: '#eab308', level: 'stale' };
    return { text: 'silent — last reported ' + relativeTime(iso, now), color: '#ef4444', level: 'silent' };
  }
  function badgeUrl(slug, api) { return (api || API) + '/api/v1/badge/' + encodeURIComponent(slug) + '/overall'; }
  function scoresUrl(slug, api) { return (api || API) + '/api/v1/orgs/' + encodeURIComponent(slug) + '/scores'; }

  return {
    API: API, SEVERITY_WEIGHTS: SEVERITY_WEIGHTS, CATEGORIES: CATEGORIES, CATEGORY_LABELS: CATEGORY_LABELS,
    GRADE_THRESHOLDS: GRADE_THRESHOLDS, LETTERS: LETTERS, PILLAR_MIN_EVENTS: PILLAR_MIN_EVENTS, TENANT_GATE: TENANT_GATE, MUTED: MUTED,
    gradeFor: gradeFor, gradeColor: gradeColor, isLetter: isLetter, fetchJSON: fetchJSON,
    loadScores: loadScores, loadOrgs: loadOrgs, isProvisional: isProvisional, overallProvisional: overallProvisional,
    relativeTime: relativeTime, freshness: freshness, badgeUrl: badgeUrl, scoresUrl: scoresUrl,
    SCORES_SNAPSHOT: SCORES_SNAPSHOT, ORGS_SNAPSHOT: ORGS_SNAPSHOT
  };
})();
