# creed-ai.org — design conventions

## Setup
No provider or wrapper. Plain HTML on a dark ground: `css/base.css` styles `body` with
`--color-base` (#0a0a1a) and `--color-text` (#e0e0e0) — never paint your own page
background. Fonts load via `styles.css` from Google Fonts: **Antonio** (`--font-nav`),
**Orbitron** (`--font-heading`), **IBM Plex Mono** (`--font-body` — body copy is
monospace by design). The site is bilingual (EN/FR, `.lang-overlay` switcher) — keep
copy translatable, avoid text baked into images. Reduced-motion overrides import last.

## Styling idiom — semantic classes + BEM `--` modifiers, gold identity
Sister system to the Kytran Empowerment site, re-toned for the ethics institute:
**gold** replaces cyan as the identity color. This is NOT a utility-class system —
compose from the vocabulary below, write your own layout glue with tokens. No
Bootstrap-style row/col grid exists; use flex/grid in your own rules.

Components (from `css/components.css`):
`.nav` (fixed, `--nav-height` 80px; `.nav--scrolled`) · `.hero` · `.section`
(`--space-section` 8rem rhythm) · `.glass-panel` (glassmorphism surface with
gold-tinted `--color-glass-border`) · `.card` and `.card-grid` · `.btn` with
`.btn--primary`, `.btn--outline`, `.btn--lg` · `.footer` · `.lang-overlay`.

Tokens (in `css/base.css` `:root` — same names as the Kytran site, different values):
- Color: `--color-base` #0a0a1a · `--color-primary` **#c9a44c gold** ·
  `--color-secondary` #00e5ff · `--color-accent` #e8e8e8 (silver) ·
  `--color-text` · `--color-text-muted` · `--color-border` (gold-tinted rgba) ·
  `--color-glass-bg` · `--color-glass-border`
- Type: `--text-xs` … `--text-4xl`, `--text-hero`
- Space: `--space-xs` … `--space-3xl`, `--space-section`
- Shape/motion: `--border-radius` 12px · `--ease-out` · `--speed-fast|medium|slow`
- Layout: `--max-width` 1200px · `--nav-height`

Tone: institutional gravitas — gold on near-black, generous whitespace, fewer neon
effects than the Kytran site. Governance scores and grades (A+ …) are core content.

## Where the truth lives
Read `css/base.css` (tokens) and `css/components.css` before styling.
`css/responsive.css` = breakpoints; `css/reduced-motion.css` = accessibility, last.
Page styles staged un-imported under `css/pages/` (`donate`, `governance`,
`manifesto`); the closure imports `home.css`.

## Idiomatic example
```html
<section class="section">
  <div class="glass-panel" style="max-width: var(--max-width); margin: 0 auto; padding: var(--space-2xl);">
    <h2 style="font-family: var(--font-heading); font-size: var(--text-3xl); color: var(--color-primary);">
      Ethics, Continuously Scored
    </h2>
    <p style="color: var(--color-text-muted); margin-block: var(--space-md) var(--space-xl);">
      Live transparency scoring of AI governance.
    </p>
    <a class="btn btn--primary" href="#">View Governance</a>
    <a class="btn btn--outline" href="#">Read the Manifesto</a>
  </div>
</section>
```
