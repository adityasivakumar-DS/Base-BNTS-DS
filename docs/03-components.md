# 03 — Component Audit

> **Repository:** [`adityasivakumar-DS/Base-BNTS-DS`](https://github.com/adityasivakumar-DS/Base-BNTS-DS) · **ref:** `a6f9102`
> **Scope:** One report per component for all **32 components** in `components/`. Each report documents twelve dimensions — Purpose, Variants, States, Slots, Properties, Token Usage, Accessibility, Interactions, Composition, Dependencies, Responsive Behaviour, and Builder Readiness. Findings are grounded in each component's actual `<name>.css` and `<name>.html`.
> **Related:** `01-repository-analysis.md` (as-built system analysis) · `02-foundations.md` (foundations audit).

---

## 1. How to read this document

Every component has an identically-structured report in §4, ordered alphabetically and numbered 01–32. **Builder Readiness** is the audit's summary judgement for each component — how ready it is to be imported, edited (tokens/props), and previewed live inside the visual Design System Builder — scored 1–5:

| Score | Meaning |
|---|---|
| **5** | Fully token-driven; variants/sizes/states cleanly parameterisable; no blocking hardcoded values; JS optional. |
| **4** | Ready with minor friction — a few hardcoded values or a small JS need. |
| **3** | Usable but needs remediation — notable hardcoded values, missing-token fallbacks, or non-trivial JS/state. |
| **2** | Significant gaps. |
| **1** | Placeholder / broken. |

---

## 2. Builder-readiness scorecard

| # | Component | Score | # | Component | Score |
|---|---|:---:|---|---|:---:|
| 01 | accordion | ★ 4 | 17 | modal | ★ 3 |
| 02 | alert | ★ 4 | 18 | navigation-menu | ★ 3 |
| 03 | avatar | ★ 3 | 19 | pagination | ★ 3 |
| 04 | badge | ★ 3 | 20 | product-card | ★ 3 |
| 05 | breadcrumb | ★ 4 | 21 | product-price | ★ 4 |
| 06 | button | ★ 5 | 22 | progress | ★ 3 |
| 07 | card | ★ 3 | 23 | radio | ★ 4 |
| 08 | checkbox | ★ 4 | 24 | rating | ★ 3 |
| 09 | date-picker | ★ 3 | 25 | switch | ★ 4 |
| 10 | drawer | ★ 3 | 26 | table | ★ 4 |
| 11 | dropdown | ★ 4 | 27 | tabs | ★ 4 |
| 12 | file-upload | ★ 3 | 28 | textarea | ★ 4 |
| 13 | header | ★ 3 | 29 | thumbnail-row | ★ 3 |
| 14 | input | ★ 3 | 30 | thumbnail | ★ 3 |
| 15 | list | ★ 3 | 31 | toast | ★ 3 |
| 16 | menu | ★ 3 | 32 | tooltip | ★ 4 |

**Distribution:** ★5 × 1 · ★4 × 12 · ★3 × 19 · ★2 × 0 · ★1 × 0 — **average ≈ 3.4 / 5.**

**Interpretation:** No component is broken, and the theming model works everywhere — but only **Button** is fully builder-ready as-is. The bulk sit at ★3–4, held back not by design flaws but by a small set of *systemic, repo-wide* issues (below). Fixing those few root causes would lift most of the library to ★4–5 at once.

---

## 3. Cross-cutting findings

These patterns recur across many components and dominate the readiness scores. They are stated once here rather than repeated in every report.

1. **Un-emitted border tokens, often with no fallback — the #1 blocker.** `--ds-border-default-color` (and `--ds-border-default-width`) are referenced by a large share of components, and in many they appear **bare** (`var(--ds-border-default-color)` with no fallback): confirmed in accordion, alert, avatar, badge, radio, header, input, list, menu, table, tabs, textarea, switch, pagination, and thumbnail-row. The current token build does not emit these names, so those borders/dividers resolve to nothing. This is the single most widespread break risk.

2. **Missing status colour tokens collapse semantic variants.** The `--ds-status-success` / `--ds-status-warning` (`-bg`) family is referenced by alert, avatar, badge, product-price, progress, and toast but never emitted. These *do* use fallbacks, so success and warning silently collapse to `--ds-action-primary-bg` / `--ds-content-text-primary` — variant distinction is lost and contrast is not guaranteed.

3. **Other un-emitted-but-fallback-guarded variables** appear throughout and will only ever render their fallback until the token set adds them: `--ds-surface-input`, `--ds-surface-overlay`, `--ds-overlay-scrim`, `--ds-border-hover-color`, `--ds-content-text-placeholder`, `--ds-form-label-*`, `--ds-rating-star-color`, `--ds-surface-tooltip` / `--ds-content-tooltip`, `--ds-overlay-hover` / `--ds-overlay-caption`, and `--ds-shadow-md`.

4. **Hardcoded literals persist despite the "no hardcoded values" file headers.** Common offenders: fixed px dimensions (drawer widths, thumbnail/avatar sizes, min-widths), `box-shadow`s with baked `rgba(0,0,0,…)`, `z-index` values, transforms (`translateY`, `scale`), `aspect-ratio`, `2–3px` border/outline widths, and `white`-fill embedded SVGs in checkbox/radio that will not re-theme. These block full token-driven editing in the Builder.

5. **No responsive CSS.** No component stylesheet contains media or container queries. Responsiveness is entirely intrinsic — `flex-wrap`, `%`, `max-width`, `aspect-ratio`, `overflow` — so breakpoint behaviour is deferred to the consumer.

6. **Behaviour is the consumer's responsibility.** Only **accordion** and **tabs** ship demo JS (simple toggling). Every other interactive component (menu, dropdown open/close, modal focus-trap/Escape, drawer, toast auto-dismiss, date-picker selection, file-upload drag-and-drop, pagination, list selection, thumbnail selection) demonstrates markup only; real interaction must be supplied downstream.

7. **Class-name mismatch in demos.** `modal.html` and `product-card.html` reference footer buttons as `ds-btn ds-btn--*`, but the button component defines `ds-button ds-button--*`. The demo buttons therefore render unstyled.

8. **Component-level accessibility gaps** (beyond the strong shared `:focus-visible` story): `table` headers lack `scope`/`aria-sort`; `tabs` has no arrow-key roving; `input`/`textarea` error states lack `aria-invalid`/`aria-describedby`.

9. **Inter-component composition exists.** `product-card` composes `ds-rating` and `ds-product-price`, so it carries cross-component CSS dependencies the Builder must resolve together.

---

## 4. Per-component reports


### 01. Accordion

*`components/accordion/` — collapsible disclosure panels grouped as vertical stack.*

- **Purpose:** Vertically stacked expand/collapse disclosure sections revealing content on trigger click.
- **Variants:** `--flush` (no outer border); `--bordered` (per-item border, radius, `gap`); default (top/bottom item borders).
- **States:** `:hover`, `:focus-visible` on `__trigger`; `[aria-expanded="true"]` rotates icon; `__content[aria-hidden="false"]` / `:not([aria-hidden])` expands grid.
- **Slots:** `__trigger` (header/label + icon), `__body` (panel content), `__content-inner` (animation wrapper), `__icon` (chevron SVG).
- **Properties:** variant class; `aria-expanded`, `aria-controls`, `aria-labelledby`, `aria-hidden`, `id` per item.
- **Token Usage:** `--ds-border-default-width`, `--ds-content-text-primary`/`-secondary`, `--ds-action-primary-padding-x/y-md`, `--ds-action-primary-font-size-md`, `--ds-action-primary-radius`, `--ds-action-primary-transition-duration`, `--ds-action-ghost-bg`, `--ds-focus-ring-width`/`-color`/`-offset`. Flags: `--ds-border-default-color` referenced but not emitted (no fallback); hardcoded `font-weight:500/600`, `line-height:1.6`, `gap:0.75rem`, `gap:0.5rem`, `rotate(180deg)`, SVG `16` sizing.
- **Accessibility:** native `<button>` triggers with `aria-expanded`/`aria-controls`; content `role="region"` + `aria-labelledby`; icon `aria-hidden`; visible focus ring; keyboard toggling via Enter/Space native to button.
- **Interactions:** click toggles expand/collapse via grid-template-rows animation; demo JS enforces single-open per group; real toggle logic (single vs multi-open) is consumer's responsibility.
- **Composition:** items nest inside `.ds-accordion`; body accepts arbitrary content incl. `<code>`; variant modifiers combine with base.
- **Dependencies:** core/semantic/base CSS layers; inline chevron SVG (`currentColor`); demo JS for toggling; no other DS components.
- **Responsive Behaviour:** `width:100%` triggers; No explicit media queries or responsive breakpoints.
- **Builder Readiness:** ★ 4/5 — token-driven with clean variants/states; minor hardcoded numerics (weights, gaps, line-height) and un-emitted `--ds-border-default-color` without fallback; needs simple toggle JS.


### 02. Alert

*`components/alert/` — inline status message with icon, text, dismiss.*

- **Purpose:** Contextual inline banner conveying info/success/warning/error status with optional dismiss.
- **Variants:** `--info`, `--success`, `--warning`, `--error` (left-border color); `--sm` (compact padding/font).
- **States:** `:hover`, `:focus-visible` on `__close`; `__title:only-child` removes bottom margin.
- **Slots:** `__icon` (status SVG), `__content` (wrapper), `__title`, `__description`, `__close` (dismiss button).
- **Properties:** variant + size class; `role="alert"`; `aria-label` on close; icon color set inline per variant.
- **Token Usage:** `--ds-border-default-width`, `--ds-content-text-primary`/`-secondary`, `--ds-action-primary-padding-x/y-md`, `--ds-action-primary-radius`, `--ds-action-primary-font-size-md`/`-sm`, `--ds-action-primary-bg`, `--ds-action-destructive-bg`, `--ds-action-ghost-bg-hover`, `--ds-focus-ring-*`. Fallbacks: `--ds-status-success`/`--ds-status-warning` (fallback to `--ds-action-primary-bg`/`--ds-content-text-primary`), `--ds-action-primary-transition-duration,0.15s`. Flags: `--ds-border-default-color` referenced but not emitted (no fallback); `--ds-status-success`/`-warning` not emitted (rely on fallbacks); hardcoded `border-left:4px`, `font-weight:600`, margins/line-heights, `*0.625`/`*0.75` calc factors.
- **Accessibility:** `role="alert"` on container; icons `aria-hidden`; close button has `aria-label` and focus ring; semantic `<p>` title/description; contrast concern — status colors depend on un-emitted tokens falling back to primary, muddying variant distinction.
- **Interactions:** static/CSS-only; close button present but NO dismiss JS in demo — actual dismissal is consumer's responsibility.
- **Composition:** icon + content + optional close in flex row; description optional (title-only supported); combines variant + size modifiers.
- **Dependencies:** core/semantic/base CSS layers; inline status SVG icons (colored inline); no JS; no other DS components.
- **Responsive Behaviour:** `flex:1`/`min-width:0` content; No explicit media queries.
- **Builder Readiness:** ★ 4/5 — cleanly parameterizable variants/sizes, no JS strictly required; hardcoded `4px` left border, un-emitted color tokens, and status colors leaning on fallbacks reduce fidelity.


### 03. Avatar

*`components/avatar/` — user image/initials circle with sizes, status, grouping.*

- **Purpose:** Display user identity as image, initials, or fallback with optional status and stacking.
- **Variants:** sizes `--xs`/`--sm`/`--md`/`--lg`/`--xl`; shape `--square`; `__status--online`/`--offline`/`--busy`; `.ds-avatar-group` (stacked).
- **States:** No interactive pseudo-states; visual status modifiers only (`--online`/`--offline`/`--busy`).
- **Slots:** avatar container (initials text), `__image`, `__initials`, `__fallback`, `__status` (indicator dot).
- **Properties:** size class; shape; status class; `aria-label`; image `src`/`alt`; group membership.
- **Token Usage:** `--ds-action-secondary-bg`/`-text`, `--ds-action-primary-bg`/`-text`, `--ds-action-primary-radius` (square), `--ds-action-destructive-bg` (busy), `--ds-surface-page` (group/status border), `--ds-action-ghost-bg` (demo +N). Fallback: `--ds-status-success` (→ `--ds-action-primary-bg`) for online. Flags: `--ds-status-success` not emitted (fallback used); `--ds-border-default-color` used for offline but not emitted (no fallback); many hardcoded sizes (`1.5rem`–`5rem`, font-sizes), `border-radius:50%`, `2px` borders, `margin-left:-0.5rem`, status `0.75rem`, `0.4em` initials.
- **Accessibility:** `aria-label` provides accessible name; status dots have `aria-label`; `user-select:none`; images carry `alt`; group has descriptive `aria-label`; no roles beyond labels; decorative border rings via `--ds-surface-page`.
- **Interactions:** purely presentational; no JS; image-load fallback behavior (`__fallback`) is consumer's responsibility.
- **Composition:** avatars stack in `.ds-avatar-group` with negative margin overlap; status/image nest inside container; combines size + shape modifiers.
- **Dependencies:** core/semantic/base CSS layers; external image URLs in demo (pravatar); no JS; no other DS components.
- **Responsive Behaviour:** fixed sizes via classes; No explicit media queries (demo uses `flex-wrap` on rows only).
- **Builder Readiness:** ★ 3/5 — token-driven colors and clean size/shape/status modifiers, but sizes/dimensions are hardcoded rem values (not tokenized) and offline status relies on un-emitted `--ds-border-default-color` without fallback.


### 04. Badge

*`components/badge/` — small pill label for status, counts, notifications.*

- **Purpose:** Compact inline label conveying status, category, or notification count.
- **Variants:** `--default`/`--primary`/`--success`/`--warning`/`--error`/`--outline`; `--dot`; sizes `--sm`/`--lg`; `--notification` (overlay); wrapper `.ds-badge-wrapper`.
- **States:** No interactive pseudo-states; visual variant/size modifiers only.
- **Slots:** badge text content; dot badge is empty; notification badge holds count; `.ds-badge-wrapper` anchors host + overlay.
- **Properties:** variant + size class; dot/notification modifier; `aria-label` (dot/notification); `aria-hidden` on decorative dots.
- **Token Usage:** `--ds-action-secondary-bg`/`-text`, `--ds-action-primary-bg`/`-text`, `--ds-action-destructive-bg`, `--ds-border-default-width`, `--ds-action-primary-font-size-sm`/`-md`, `--ds-surface-page` (notification ring). Fallbacks: `--ds-status-success-bg`/`--ds-status-warning-bg` (→ `--ds-action-secondary-bg`), `--ds-status-success`/`--ds-status-warning` (→ `--ds-action-primary-bg`/`--ds-content-text-primary`). Flags: `--ds-border-default-color`, `--ds-status-success-bg`, `--ds-status-warning-bg`, `--ds-status-success`, `--ds-status-warning` all referenced but NOT emitted (rely on fallbacks); hardcoded `border-radius:9999px`/`50%`, paddings, `font-size:0.625rem`, notification `1.125rem`/`top/right:-0.375rem`, `2px` border, `z-index:1`.
- **Accessibility:** decorative dots `aria-hidden`; count/status badges carry `aria-label` (e.g. "5 unread messages"); no roles; semantic `<span>`; success/warning colors degrade to fallback tokens (contrast/variant-distinction concern).
- **Interactions:** purely presentational; no JS; count updates are consumer's responsibility.
- **Composition:** notification badge absolutely positioned inside `.ds-badge-wrapper` over button/avatar; dot badge pairs inline with label text; variant + size modifiers combine.
- **Dependencies:** core/semantic/base CSS layers; no JS; no icons; no other DS components (demo stubs button/avatar).
- **Responsive Behaviour:** `white-space:nowrap`, `inline-flex`; No explicit media queries.
- **Builder Readiness:** ★ 3/5 — clean variant/size parameterization and no JS, but heavy reliance on un-emitted `--ds-status-*` tokens via fallbacks (collapsing success/warning to primary) plus numerous hardcoded dimensions.


### 05. Breadcrumb

*`components/breadcrumb/` — navigational trail with size variants and separators.*

- **Purpose:** Hierarchical navigation trail showing the current page's ancestry with links and a current-page marker.
- **Variants:** `ds-breadcrumb--sm`; `ds-breadcrumb--lg` (default/`md` is base); separator style (`/` text vs inline chevron SVG) is markup-driven, not a class.
- **States:** `.ds-breadcrumb__link:hover` (color + underline); `:focus-visible` (focus ring).
- **Slots:** `ds-breadcrumb__list` (ol); `ds-breadcrumb__item` (li); `ds-breadcrumb__link` (a); `ds-breadcrumb__separator` (text or SVG); `ds-breadcrumb__current` (current page span).
- **Properties:** size modifier; `href` on links; separator content; `aria-current`/`aria-hidden`/`aria-label` on markup.
- **Token Usage:** `--ds-content-text-secondary`, `--ds-content-text-primary`, `--ds-action-primary-font-size-sm`/`-md`, `--ds-action-primary-transition-duration`, `--ds-action-primary-radius`, `--ds-focus-ring-width`/`-color`/`-offset`. Hardcoded literals: `gap`/`padding` `0.25rem`/`0.125rem`, `font-weight: 500`, `calc(... * 0.875)` for `--sm`. No fallbacks used; no missing-token references.
- **Accessibility:** `<nav aria-label="Breadcrumb">` + `<ol>`; separators wrapped in `aria-hidden="true"` items; current page uses `aria-current="page"`; keyboard focus ring via `:focus-visible`; links use real `<a>`.
- **Interactions:** No JS; purely declarative navigation; real routing is consumer's responsibility.
- **Composition:** Ordered list of items alternating link/separator/current; icons embedded as inline SVG inside links/separators.
- **Dependencies:** 3 CSS layers (core/semantic/base) + `breadcrumb.css`; optional inline SVG icons; no JS.
- **Responsive Behaviour:** `.ds-breadcrumb__list` uses `flex-wrap: wrap`; separators `flex-shrink: 0`. No media queries.
- **Builder Readiness:** ★ 4/5 — clean token-driven colors/sizes and good a11y; minor hardcoded spacing/font-weight and a `calc` for the small size.


### 06. Button

*`components/button/` — headless button with variants, sizes, icon support.*

- **Purpose:** Interactive action trigger with multiple visual variants, sizes, and icon/icon-only layouts.
- **Variants:** `ds-button--primary`, `--secondary`, `--ghost`, `--destructive`; sizes `--sm`/`--md`/`--lg`; `--icon-only`.
- **States:** `:focus-visible` (ring); `:hover:not(:disabled)` and `:active:not(:disabled)` per variant; `:disabled` / `[aria-disabled="true"]`.
- **Slots:** Button text content; optional leading inline SVG icon (gap via `--ds-action-primary-icon-gap`).
- **Properties:** variant class, size class, icon-only, `disabled`/`aria-disabled`, `aria-label` (icon-only), text/icon content.
- **Token Usage:** `--ds-action-primary-*` (bg/text/border + hover/active/disabled, radius, padding-x/y per size, font-*, icon-gap, transition-duration/easing, letter-spacing), `--ds-action-secondary-*`, `--ds-action-ghost-*`, `--ds-action-destructive-*`, `--ds-border-default-width`, `--ds-focus-ring-*`. Hardcoded literals: `min-height: 32px/40px/48px`, `aspect-ratio: 1`, `opacity: 1`. No `var()` fallbacks; no missing-token references.
- **Accessibility:** Native `<button>`; keyboard-only focus ring via `:focus-visible`; icon-only buttons carry `aria-label`; disabled sets `cursor:not-allowed` + `pointer-events:none`; decorative SVGs `aria-hidden`.
- **Interactions:** No JS; hover/active/focus purely CSS; click behaviour is consumer's responsibility.
- **Composition:** Used standalone or within card footers, forms, toolbars; wraps inline SVG icons.
- **Dependencies:** 3 CSS layers + `button.css`; optional inline SVG icons; no JS.
- **Responsive Behaviour:** `white-space: nowrap`; `inline-flex`. No media queries or fluid sizing.
- **Builder Readiness:** ★ 5/5 — fully token-driven colors/spacing/typography, cleanly parameterizable variants/sizes/states, only trivial fixed min-heights, JS optional.


### 07. Card

*`components/card/` — container with media, body, footer; layout variants.*

- **Purpose:** Content container grouping media, title/subtitle, body content, and footer actions.
- **Variants:** `ds-card--hoverable`, `--horizontal`, `--sm`, `--lg` (default vertical is base); combinable (e.g. horizontal + hoverable).
- **States:** `.ds-card--hoverable:hover` (shadow + lift), `:active` (reset), `:focus-visible` (ring).
- **Slots:** `ds-card__media`, `ds-card__body`, `ds-card__header`, `ds-card__title`, `ds-card__subtitle`, `ds-card__content`, `ds-card__footer`.
- **Properties:** variant/size classes; `tabindex`/`role`/`aria-label` on hoverable cards; media element, text content, footer buttons.
- **Token Usage:** `--ds-content-text-primary`/`-secondary`, `--ds-action-primary-radius`, `--ds-action-primary-padding-y-md`/`-x-md`, `--ds-action-primary-font-size-sm`/`-md`/`-lg`, `--ds-action-primary-icon-gap`, `--ds-focus-ring-*`. Fallbacks: `var(--ds-surface-overlay, var(--ds-surface-page))`, many `var(--ds-action-primary-padding-*, 0.75rem/1rem/0.5rem)` and font-size fallbacks in `--sm`/`--lg`. Missing-token references: `--ds-surface-overlay` and `--ds-border-default-color` (not emitted — rely on fallback / may render invalid). Hardcoded literals: `box-shadow: 0 4px 12px rgba(0,0,0,0.1)`, `transform: translateY(-1px)`, `aspect-ratio: 16/9`, `width: 240px`, `font-weight: 600`, `line-height` values, `gap: 0.375rem`.
- **Accessibility:** Hoverable cards use `tabindex="0"` + `role="article"`/`aria-label` and `:focus-visible` ring; titles use real `<h2>`; media placeholders use `role="img"`. Whole-card click target lacks a semantic link (consumer concern).
- **Interactions:** No JS; hover/lift is CSS; navigation on click is consumer's responsibility.
- **Composition:** Nests DS buttons in footer (demo uses `ds-btn--*` classes — a different/absent component); wraps media, headings, paragraphs; grid/stack layout is demo-only.
- **Dependencies:** 3 CSS layers + `card.css`; no JS; footer buttons reference a button component; missing `--ds-border-default-color`/`--ds-surface-overlay` tokens.
- **Responsive Behaviour:** `aspect-ratio: 16/9`, `overflow: hidden`, `flex` layouts, `width:100%` media; horizontal fixed `240px`. No media queries (demo grid uses `auto-fill minmax`).
- **Builder Readiness:** ★ 3/5 — mostly token-driven but has hardcoded shadow/transform/dimensions, several missing-token fallbacks (`--ds-surface-overlay`, `--ds-border-default-color`), and footer references a button class the DS button doesn't expose.


### 08. Checkbox

*`components/checkbox/` — native checkbox with checked/indeterminate/disabled states.*

- **Purpose:** Styled native checkbox with label, supporting groups and standard form states.
- **Variants:** Label sizes `ds-checkbox-label--sm`/`--lg` (base is `md`); no color variants.
- **States:** `:checked` (fill + tick SVG), `:indeterminate` (fill + dash SVG), `:hover:not(:disabled)`, `:focus-visible` (ring), `:disabled` (+ `:disabled + .ds-checkbox-label`).
- **Slots:** `ds-checkbox-group` (container); `ds-checkbox-item` (label wrapper); `ds-checkbox` (input); `ds-checkbox-label` (text).
- **Properties:** `checked`, `disabled`, `indeterminate` (JS-set), `name`, label size modifier, label text.
- **Token Usage:** `--ds-action-primary-bg`, `--ds-action-primary-bg-disabled`, `--ds-action-primary-border-disabled`, `--ds-action-primary-text-disabled`, `--ds-action-primary-radius`, `--ds-action-primary-transition-duration`, `--ds-action-primary-font-size-sm`/`-md`/`-lg`, `--ds-action-primary-icon-gap`, `--ds-content-text-primary`, `--ds-border-default-width`, `--ds-focus-ring-*`. Fallbacks: `var(--ds-form-label-gap, 0.5rem)`, `var(--ds-action-primary-icon-gap, 0.5rem)`, `var(--ds-surface-input, var(--ds-surface-page))`. Missing-token references: `--ds-form-label-gap` and `--ds-surface-input` (not emitted — rely on fallback). Hardcoded literals: `width/height: 1.125rem`, `line-height: 1.4`, embedded SVG tick/dash with hardcoded `stroke='white'`/`fill='white'`.
- **Accessibility:** Native `<input type=checkbox>` (keyboard + semantics free); `<label>` wraps input for click target; `:focus-visible` ring; group demo wrapped in `<fieldset>`/`<legend>`. Checkmark color hardcoded white may not track token theming.
- **Interactions:** Checked/indeterminate handled natively; `indeterminate` requires JS (demo sets `.indeterminate = true`); state management otherwise consumer's responsibility.
- **Composition:** Items stacked in `ds-checkbox-group`; wrapped in `fieldset`/`legend` for grouping.
- **Dependencies:** 3 CSS layers + `checkbox.css`; inline data-URI SVG icons; minimal JS only for indeterminate; missing `--ds-surface-input`/`--ds-form-label-gap` tokens.
- **Responsive Behaviour:** `flex` column/row layouts; `flex-shrink: 0` on box. No media queries or fluid sizing.
- **Builder Readiness:** ★ 4/5 — token-driven with clean native states; minor hardcoded box size and white SVG stroke, two missing-token fallbacks, and indeterminate needs a line of JS.


### 09. Date Picker

*`components/date-picker/` — date input with trigger button and calendar popup.*

- **Purpose:** Native date input paired with a calendar-icon trigger and a static calendar-grid popup for picking a date.
- **Variants:** No block-level variants; day modifiers `--selected`, `--today`, `--outside`.
- **States:** `:hover:not(:disabled)`, `:focus-visible`, `:disabled` on `__input`/`__trigger`/`__day`/`__nav`.
- **Slots:** `__label`; `__input-row` (holds `__input` + `__trigger`); `__calendar` (`__calendar-header`, `__nav`, `__month-label`, `__grid`, `__day-name`, `__day`).
- **Properties:** input `value`/`type=date`/`disabled`; label `for`; trigger `aria-label`; day modifier classes; nav `aria-label`.
- **Token Usage:** `--ds-content-text-primary`/`-secondary`, `--ds-action-primary-*` (radius, padding, font-size-sm/md, bg, text, bg-disabled, text-disabled, transition-duration), `--ds-action-secondary-bg`/`-text`/`-border`/`-bg-hover`, `--ds-focus-ring-*`. Fallback vars: `--ds-form-label-gap`, `--ds-form-label-font-size`, `--ds-form-label-font-weight`, `--ds-surface-input`, `--ds-surface-overlay` (all with fallbacks). NOT emitted by token set: `--ds-surface-input`, `--ds-border-default-color`, `--ds-border-default-width` (no fallback on width). Hardcoded literals: `max-width:320px`, `gap:0.5rem`, `min-height:40px`, calendar `width:280px`, `box-shadow: 0 4px 16px rgba(0,0,0,0.12)`, grid `gap:2px`, `font-weight:600`, `opacity:0.5/0.35`, various `rem` paddings/margins.
- **Accessibility:** `<label for>`; trigger `aria-label="Open calendar"`; calendar `role="dialog"`; grid `role="grid"`; nav buttons `aria-label`; SVG `aria-hidden`; `:focus-visible` rings everywhere. Concern: `role="grid"` lacks rows/gridcell semantics; day-names not associated; scrim contrast n/a.
- **Interactions:** Static demo only — no JS; calendar shown inline, not toggled. Real popup open/close, month nav, date selection, and syncing input↔calendar are the consumer's responsibility.
- **Composition:** `__input-row` composes native `<input type=date>` with icon `<button>`; calendar is a standalone sibling block; inline SVG icon in trigger.
- **Dependencies:** 3 CSS layers (core/semantic/base); inline SVG calendar icon; JS required for real behaviour; no other DS components.
- **Responsive Behaviour:** `width:100%` with `max-width:320px`; calendar fixed `width:280px`; `aspect-ratio:1` on trigger/day; no media queries. Largely `No explicit responsive rules`.
- **Builder Readiness:** ★ 3/5 — mostly token-driven but relies on non-emitted `--ds-border-default-*`/`--ds-surface-input`, several hardcoded sizes and a hardcoded box-shadow, and needs non-trivial JS for actual picking.


### 10. Drawer

*`components/drawer/` — side/bottom sliding panel over a scrim backdrop.*

- **Purpose:** Fixed-position overlay panel (right/left/bottom) with backdrop, header, scrollable body and footer, for edit forms, nav, or sheets.
- **Variants:** `--left`, `--bottom` (position); `--sm` (320px), `--lg` (640px) (size); default right at 400px.
- **States:** `:focus-visible` on `.ds-drawer` and `__close`; `__close:hover`.
- **Slots:** `__header` (holds `__title` + `__close`); `__body` (scrollable content); `__footer` (action buttons).
- **Properties:** variant/size classes; `role`/`aria-modal`/`aria-labelledby`/`tabindex` on container; `__title` `id`; close `type`/`aria-label`.
- **Token Usage:** `--ds-surface-overlay` (fallback `--ds-surface-page`), `--ds-content-text-primary`/`-secondary`, `--ds-action-primary-*` (radius, padding-x/y-md, font-size-lg/md, transition-duration w/ fallback 0.2s), `--ds-action-ghost-bg-hover`, `--ds-action-primary-icon-gap` (fallback), `--ds-focus-ring-*`. Fallback vars: `--ds-overlay-scrim` (fallback `rgba(0,0,0,0.5)`), `--ds-action-primary-icon-gap` (0.5rem), `--ds-action-primary-padding-y-md` (0.75rem in calc). NOT emitted: `--ds-overlay-scrim`, `--ds-border-default-color`, `--ds-border-default-width`, `--ds-surface-input` (demo only). Hardcoded literals: widths `400/320/640px`, `max-width:90vw`, `max-height:80vh`, box-shadows with `rgba(0,0,0,0.12)`, `font-weight:600`, `line-height:1.3/1.6`, close `padding:0.375rem`.
- **Accessibility:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby` → title `id`, `tabindex="-1"` for focus; backdrop `aria-hidden`; close `aria-label`; `:focus-visible` rings. Focus trap/return not implemented (no JS).
- **Interactions:** Demos are static (fixed positioning simulated in bounded `.demo-frame`); no JS. Open/close, backdrop-click dismiss, ESC, focus trapping are the consumer's responsibility.
- **Composition:** Nests DS buttons (`ds-btn ds-btn--ghost`/`--primary`) in footer; body hosts arbitrary form fields / nav; pairs with `.ds-drawer-backdrop` sibling.
- **Dependencies:** 3 CSS layers; DS button component (footer); JS for behaviour; close icon is a demo CSS `::before` "✕" (no shipped icon).
- **Responsive Behaviour:** `max-width:90vw` (side), `max-height:80vh` and `width:100%` (bottom), `overflow-y:auto` body; no media queries.
- **Builder Readiness:** ★ 3/5 — clean variant/size parameterization and good ARIA, but many hardcoded dimensions/shadows, reliance on non-emitted `--ds-overlay-scrim`/`--ds-border-default-*`, and required JS for focus trap and open/close.


### 11. Dropdown

*`components/dropdown/` — styled native select with sizes, error, hint.*

- **Purpose:** Token-styled native `<select>` with custom chevron, label, size options, error state and hint text.
- **Variants:** Sizes `--sm`, `--md`, `--lg`; state `--error`; hint `ds-dropdown-hint--error`.
- **States:** `:hover:not(:disabled)`, `:focus-visible`, `:disabled`.
- **Slots:** `ds-dropdown-label`; `ds-dropdown` (holds `<option>`s); `ds-dropdown-hint` (helper/error text) — all inside `ds-dropdown-wrapper`.
- **Properties:** size/error variant classes; `disabled`; `id`+label `for`; `<option>` value/text; hint text/error modifier.
- **Token Usage:** `--ds-content-text-primary`/`-secondary`, `--ds-action-primary-*` (radius, padding-x/y-sm/md/lg, font-size-sm/md/lg, bg, bg-disabled, text-disabled, transition-duration), `--ds-action-destructive-bg` (error), `--ds-focus-ring-*`. Fallback vars: `--ds-form-label-gap`, `--ds-form-label-font-size`, `--ds-form-label-font-weight`, `--ds-surface-input` (fallback `--ds-surface-page`), `--ds-border-hover-color` (fallback `--ds-action-primary-bg`). NOT emitted: `--ds-surface-input`, `--ds-border-hover-color`, `--ds-border-default-color`/`-width`. Hardcoded literals: chevron SVG data-URI with baked stroke `#666`; `min-height:32/40/48px`; `padding-right: calc(...*2.5)`.
- **Accessibility:** Real `<select>` (native keyboard/ARIA); `<label for>`; error hint conveyed by color + text only (no `aria-invalid`/`aria-describedby` wiring). Chevron hardcoded `#666` may fail contrast in some themes.
- **Interactions:** Native select behaviour — no JS needed; open/select handled by browser. Error toggling is consumer's responsibility.
- **Composition:** `ds-dropdown-wrapper` stacks label + select + hint; standalone form control.
- **Dependencies:** 3 CSS layers; inline data-URI SVG chevron; no JS; no other DS components.
- **Responsive Behaviour:** `width:100%`, `box-sizing:border-box`; no media queries. `No explicit responsive rules`.
- **Builder Readiness:** ★ 4/5 — native element, cleanly parameterized sizes/error, no JS; docked for baked `#666` chevron color and reliance on non-emitted `--ds-surface-input`/`--ds-border-*` fallbacks.


### 12. File Upload

*`components/file-upload/` — drag-drop zone, button style, uploaded file list.*

- **Purpose:** File input presented as a dashed drop zone or compact button, plus a list of uploaded files with size and remove control.
- **Variants:** Drop-zone (`__zone`) vs button (`__button`) presentations; zone modifiers `--drag-over`, `--disabled`.
- **States:** `__zone:hover`, `--drag-over`, `:focus-within`, `--disabled`; `__button:hover`/`:focus-visible`; `__file-remove:hover`/`:focus-visible`.
- **Slots:** `__label`; `__zone` (`__icon`, `__text`, `__subtext`, `__input`); `__button`; `__list` → `__file-item` (`__file-name`, `__file-size`, `__file-remove`).
- **Properties:** input `type=file`/`multiple`/`accept`/`aria-label`; zone `role`/`tabindex`/`aria-label`; variant/state classes; file item text; remove `aria-label`.
- **Token Usage:** `--ds-content-text-primary`/`-secondary`, `--ds-action-primary-*` (radius, padding-x/y-md/lg, font-size-sm/md, icon-gap, transition-duration, bg), `--ds-action-secondary-bg`/`-text`/`-border`/`-bg-hover`, `--ds-action-ghost-bg-hover` (fallback `--ds-surface-input`), `--ds-action-destructive-bg` (remove hover), `--ds-focus-ring-*`. Fallback vars: `--ds-form-label-gap`, `--ds-form-label-font-size`, `--ds-form-label-font-weight`, `--ds-surface-input` (fallback `--ds-surface-page`), `--ds-action-ghost-bg-hover`. NOT emitted: `--ds-surface-input`, `--ds-border-default-color`, `--ds-border-default-width`. Hardcoded literals: `border: 2px dashed`, `gap:0.5rem/0.375rem`, `padding:0.5rem/0.125rem`, `opacity:0.5`, SVG dimensions.
- **Accessibility:** Real `<input type=file>` (kept in DOM); zone as `role="button"` `tabindex="0"` with `aria-label`; decorative SVGs `aria-hidden`; remove buttons have per-file `aria-label`; `:focus-within` ring on zone; `:focus-visible` on button/remove.
- **Interactions:** Static demo — no JS. Drag/drop handling, `--drag-over` toggling, file list rendering, size formatting, and removal are the consumer's responsibility.
- **Composition:** Drop zone overlays transparent full-size `__input`; button uses `<label>` wrapping hidden input; file list is independent `<ul>`; inline SVG icons throughout.
- **Dependencies:** 3 CSS layers; inline SVG icons (upload/file/close); JS required for drag-drop and list behaviour; no other DS components.
- **Responsive Behaviour:** Flex column layout; `__file-name` truncates via `overflow/text-overflow/white-space`; no media queries. `No explicit responsive rules`.
- **Builder Readiness:** ★ 3/5 — well-structured and token-driven for color/spacing, but hardcoded `2px dashed` border, reliance on non-emitted `--ds-surface-input`/`--ds-border-default-*`, and needs non-trivial JS for drag-drop and dynamic file list.


### 13. Header

*`components/header/` — sticky top navigation bar with brand, nav, actions.*

- **Purpose:** Sticky page banner holding brand logo, primary navigation links, and action buttons.
- **Variants:** `--transparent` (no bg/border for hero overlay); `--compact` (reduced padding, smaller nav font); `--active` on `__nav-link` for current page.
- **States:** `:hover` and `:focus-visible` on `__nav-link`; `--active` visual state; sticky `position: sticky`.
- **Slots:** `__brand`, `__nav` (`<ul>` of `__nav-link`), `__actions` (right-aligned via `margin-left: auto`).
- **Properties:** variant (transparent/compact); active nav link; brand content/logo; action buttons (`aria-label`, `aria-current`).
- **Token Usage:** `--ds-surface-page`, `--ds-content-text-primary`, `--ds-action-primary-padding-{x,y}-md`, `--ds-action-primary-radius`, `--ds-action-primary-font-size-{sm,md}`, `--ds-action-primary-transition-duration`, `--ds-action-ghost-{bg,text}`, `--ds-action-primary-bg`, `--ds-focus-ring-{width,color,offset}`. Fallback: `var(--ds-surface-overlay, var(--ds-surface-page))` — `--ds-surface-overlay` not emitted. Referenced but not emitted: `--ds-border-default-width`, `--ds-border-default-color` (no fallback, will resolve empty). Hardcoded: `z-index:100`, `gap:0.25rem`, `font-weight:700/600`.
- **Accessibility:** `role="banner"`; `<nav aria-label>`; `aria-current="page"` on active link; `aria-label` on brand; logo SVG `aria-hidden`; visible focus ring.
- **Interactions:** Purely CSS; no JS in demo. Sticky scroll behaviour via CSS. Real nav routing / active-state toggling is consumer's responsibility.
- **Composition:** Wraps `__brand` anchor, `<nav>/<ul>` link list, and `__actions` holding external button classes (`ds-btn` defined only in demo, not component CSS).
- **Dependencies:** 3 CSS layers (core/semantic/base); inline brand SVG; button styling supplied externally; no JS.
- **Responsive Behaviour:** No explicit responsive rules; relies on flex (`flex:1`, `flex-shrink:0`, `margin-left:auto`) — no media queries or wrap.
- **Builder Readiness:** ★ 3/5 — clean variants and mostly token-driven, but depends on non-emitted `--ds-border-default-*` (no fallback) and non-emitted `--ds-surface-overlay`; a few hardcoded literals; no mobile/hamburger handling.


### 14. Input

*`components/input/` — labeled text field with sizes, states, icon.*

- **Purpose:** Headless single-line form input with label, hint, sizes, error state, and optional leading icon.
- **Variants:** Sizes `--sm`/`--md`/`--lg`; state `--error` (input) and `ds-input-hint--error`.
- **States:** `:hover:not(:disabled)`, `:focus-visible`, `:disabled`, `::placeholder`, `--error` + `--error:focus-visible`.
- **Slots:** `ds-input-label`, `ds-input` (field), `ds-input-hint`, `ds-input-group__icon` (leading icon within `ds-input-group`).
- **Properties:** size; error flag; disabled; `type`; `placeholder`/`value`; `aria-describedby`; icon presence.
- **Token Usage:** `--ds-content-text-primary`, `--ds-action-primary-radius`, `--ds-action-primary-padding-{x,y}-{sm,md,lg}`, `--ds-action-primary-font-size-{sm,md,lg}`, `--ds-action-primary-transition-duration`, `--ds-action-primary-bg`, `--ds-action-primary-{bg,text}-disabled`, `--ds-action-destructive-bg`, `--ds-content-text-secondary`, `--ds-focus-ring-{width,color,offset}`. Fallbacks: `--ds-form-label-gap`, `--ds-form-label-font-{family,size,weight}`, `--ds-content-text-placeholder`, `--ds-border-hover-color` (all with fallbacks — likely not emitted). Referenced but not emitted (no fallback): `--ds-border-default-width`, `--ds-border-default-color`. Fallback with non-emitted var: `var(--ds-surface-input, var(--ds-surface-page))`. Hardcoded: `min-height:32px/40px/48px`.
- **Accessibility:** `<label for>` associations; `aria-describedby` links hint/error; icon `aria-hidden`; disabled via native `disabled`; visible focus ring; error conveyed by color only (no `aria-invalid` in demo — contrast/announcement concern).
- **Interactions:** Native input behaviour; no JS. Validation/error toggling is consumer's responsibility.
- **Composition:** `ds-input-wrapper` groups label+field+hint; `ds-input-group` positions absolute icon over padded input.
- **Dependencies:** 3 CSS layers; inline search SVG (icon demo); no JS.
- **Responsive Behaviour:** `width:100%` fluid; `box-sizing:border-box`; no media queries.
- **Builder Readiness:** ★ 3/5 — well-parameterized sizes/states, but relies on non-emitted `--ds-border-default-*` without fallback and several fallback-only vars; hardcoded `min-height`; missing `aria-invalid`.


### 15. List

*`components/list/` — vertical item list with media, content, actions.*

- **Purpose:** Headless vertical list supporting plain rows or rich items with media, title/subtitle, and trailing action.
- **Variants:** `--bordered`, `--sm`, `--lg`, `--striped`; item modifiers `--interactive`, `--selected`, `--disabled`.
- **States:** `:hover`, `:focus-visible` (inset ring), `--selected` (+ selected:hover), `--disabled` (opacity/pointer-events); `:last-child`/`:not(:last-child)` and `:nth-child(even)` for separators/stripes.
- **Slots:** `__item`, `__item-media`, `__item-content` (holds `__item-title`, `__item-subtitle`), `__item-action`.
- **Properties:** size variant; bordered/striped flags; per-item interactive/selected/disabled; `role`/`aria-selected`/`tabindex`; media/badge content.
- **Token Usage:** `--ds-action-primary-radius`, `--ds-action-primary-padding-{x,y}-md`, `--ds-action-primary-font-size-{sm,md}`, `--ds-content-text-{primary,secondary}`, `--ds-action-secondary-bg`, `--ds-action-ghost-bg-hover`, `--ds-focus-ring-{width,color,offset}`. Fallbacks: `--ds-action-primary-icon-gap` (0.75rem), `--ds-action-primary-transition-duration` (0.15s), `--ds-focus-ring-offset` (2px), `--ds-action-primary-padding-y-md` (0.625rem in calc), `var(--ds-action-ghost-bg, var(--ds-action-secondary-bg))`. Referenced but not emitted (no fallback): `--ds-border-default-width`, `--ds-border-default-color`. Hardcoded: media sizes `2.5rem/2rem/3rem`, `gap:0.125rem`, `line-height:1.3/1.4`, `opacity:0.4`.
- **Accessibility:** Demo uses `role="listbox"`/`role="option"` with `aria-selected`, `aria-multiselectable`, `aria-disabled`, `tabindex`; `aria-label` on lists; avatars/icons `aria-hidden`; inset focus ring. Selected uses `--ds-action-secondary-bg` background (contrast depends on token).
- **Interactions:** Selection/keyboard navigation shown only via static ARIA/tabindex; no JS — arrow-key roving and selection toggling are consumer's responsibility.
- **Composition:** Items compose avatar/badge/icon-btn helpers (defined in demo, not component); truncation via ellipsis on title/subtitle.
- **Dependencies:** 3 CSS layers; inline SVG icons; badge/avatar/icon-btn styles external; no JS.
- **Responsive Behaviour:** Flex column; `min-width:0` + ellipsis truncation; no media queries.
- **Builder Readiness:** ★ 3/5 — rich variant/state matrix and heavily token-driven, but non-emitted `--ds-border-default-*` (used for borders/separators, no fallback) and several hardcoded sizes; interactivity needs consumer JS.


### 16. Menu

*`components/menu/` — floating dropdown menu with items, groups, shortcuts.*

- **Purpose:** Headless absolutely-positioned menu surface with items, labels, separators, icons, shortcuts, and destructive action.
- **Variants:** `--sm` (menu); item `--destructive`.
- **States:** `:hover`, `:focus-visible` (menu + inset item ring), `[aria-disabled="true"]` (opacity/pointer-events); destructive `:hover` inverts colors including icon.
- **Slots:** `__item` (button/anchor), `__icon`, `__shortcut`, `__label` (group heading), `__separator` (`<hr>`).
- **Properties:** size variant; per-item destructive/disabled; icon + shortcut content; `role`/`aria-label`/`aria-disabled`.
- **Token Usage:** `--ds-surface-page`, `--ds-action-primary-radius`, `--ds-action-primary-padding-{x,y}-md`, `--ds-action-primary-font-size-{sm,md}`, `--ds-content-text-{primary,secondary}`, `--ds-action-ghost-bg-hover`, `--ds-action-destructive-bg`, `--ds-action-primary-text`, `--ds-focus-ring-{width,color,offset}`. Fallbacks: `--ds-action-primary-icon-gap` (0.5rem), `--ds-action-primary-transition-duration` (0.15s), calc fallbacks for `padding-y-md`/`padding-x-md`/`font-size-sm`/`focus-ring-offset`, `var(--ds-surface-overlay, var(--ds-surface-page))` (overlay not emitted). Referenced but not emitted (no fallback): `--ds-border-default-width`, `--ds-border-default-color`. Hardcoded: `box-shadow: 0 4px 16px rgba(0,0,0,0.12)`, `min-width:180px`, `z-index:500`, separator `height:1px`, `line-height:1.4`, `opacity:0.4`, shortcut `padding-left:1.5rem`.
- **Accessibility:** `role="menu"` + `role="menuitem"`; wrapper `<li role="none">`/`role="presentation"`; `aria-disabled`; shortcuts have descriptive `aria-label`; icons `aria-hidden`; visible focus ring. No roving `tabindex` in demo markup.
- **Interactions:** No JS — open/close, positioning, arrow-key navigation, activation, and disabled skipping are all consumer's responsibility; demo forces `position: relative` to show it inline.
- **Composition:** Items are `<button>`/anchor inside `<li role="none">`; composes inline SVG icons and shortcut spans; `__separator` divides groups.
- **Dependencies:** 3 CSS layers; inline SVG icons; no JS; requires a trigger/positioning layer from consumer.
- **Responsive Behaviour:** No explicit responsive rules; fixed `min-width`, `white-space:nowrap`, absolute positioning.
- **Builder Readiness:** ★ 3/5 — clean item/variant model and token-driven colors, but hardcoded `box-shadow`/`min-width`/`z-index`, non-emitted `--ds-border-default-*` and `--ds-surface-overlay`, and all menu behaviour requires JS.


### 17. Modal

*`components/modal/` — centered dialog with backdrop, header, body, footer.*

- **Purpose:** Accessible overlay dialog for confirmations, forms, alerts, and detail views.
- **Variants:** `ds-modal--sm` (400px); `ds-modal--lg` (800px); `ds-modal--full` (fullscreen, `border-radius:0`); default 560px.
- **States:** `.ds-modal:focus-visible`; `.ds-modal__close:hover`; `.ds-modal__close:focus-visible`.
- **Slots:** `ds-modal__header`; `ds-modal__title`; `ds-modal__close`; `ds-modal__body`; `ds-modal__footer` (footer optional per demo).
- **Properties:** size variant; title text/id; `aria-labelledby`; `tabindex="-1"`; footer button set (uses `ds-btn` variants).
- **Token Usage:** consumes `--ds-action-primary-radius`, `--ds-action-primary-padding-x/y-md`, `--ds-action-primary-font-size-lg/md`, `--ds-content-text-primary/secondary`, `--ds-action-ghost-bg-hover`, `--ds-focus-ring-width/color/offset`, `--ds-border-default-width`; fallback vars `var(--ds-overlay-scrim, rgba(0,0,0,0.5))`, `var(--ds-surface-overlay, var(--ds-surface-page))`, `var(--ds-action-primary-transition-duration, 0.2s)`, `var(--ds-action-primary-icon-gap, 0.5rem)`; flag NOT-emitted vars `--ds-overlay-scrim`, `--ds-surface-overlay`, `--ds-border-default-color` (relies on fallback); hardcoded literals `box-shadow: 0 8px 32px rgba(0,0,0,0.16)`, `max-width:560px/400px/800px`, `max-height:90vh`, close `padding:0.375rem`, `font-weight:600`, `line-height:1.3/1.6`, `z-index:1000`.
- **Accessibility:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `tabindex="-1"`, focusable container with focus ring; close button `aria-label`, icon `aria-hidden`; backdrop `role="presentation"`.
- **Interactions:** open/close, Escape-to-close, focus trap, backdrop-click all described in copy but NO JS in demo — consumer's responsibility; body scrolls independently (`overflow-y:auto`).
- **Composition:** wraps `ds-btn` buttons in footer; body accepts arbitrary content incl. inline-styled inputs; sits inside a backdrop container.
- **Dependencies:** 3 CSS layers (core/semantic/base); `ds-btn` component for actions; demo uses CSS glyph close icon (`✕`), not inline SVG; JS required by consumer for behaviour.
- **Responsive Behaviour:** `width:100%`, `max-width`, `max-height:90vh`, `overflow-y:auto` on body; no media queries.
- **Builder Readiness:** ★ 3/5 — clean variants/slots and token-driven spacing, but hardcoded max-widths/box-shadow, missing-token fallbacks (`--ds-overlay-scrim`, `--ds-surface-overlay`, `--ds-border-default-color`), and all open/close/focus behaviour needs consumer JS.


### 18. Navigation Menu

*`components/navigation-menu/` — horizontal/vertical nav with dropdown submenus.*

- **Purpose:** Primary/site navigation menu bar or sidebar with nested dropdown submenus.
- **Variants:** `ds-nav-menu--vertical` (sidebar); link modifiers `ds-nav-menu__link--active`, `ds-nav-menu__link--current`; item `ds-nav-menu__item--open`.
- **States:** `.ds-nav-menu__link:hover`; `:focus-visible`; `--active` (+`--active:hover`); `--current` (+`--current:hover`); `--open > link .chevron` rotates 180deg; `.ds-nav-menu__dropdown-link:hover`/`:focus-visible`.
- **Slots:** `ds-nav-menu__list`; `ds-nav-menu__item`; `ds-nav-menu__link`; `ds-nav-menu__chevron`; `ds-nav-menu__dropdown`; `ds-nav-menu__dropdown-link`.
- **Properties:** orientation variant; active/current link markers; open state; `aria-haspopup`/`aria-expanded`/`aria-controls`; icon+label content per link.
- **Token Usage:** consumes `--ds-action-primary-padding-x/y-md`, `--ds-action-primary-radius`, `--ds-content-text-primary`, `--ds-action-primary-font-size-md`, `--ds-action-primary-transition-duration`, `--ds-action-ghost-bg`, `--ds-action-ghost-text`, `--ds-action-primary-bg/text`, `--ds-focus-ring-width/color/offset`, `--ds-border-default-width`; fallback var `var(--ds-surface-overlay, var(--ds-surface-page))`; flag NOT-emitted vars `--ds-surface-overlay`, `--ds-border-default-color`; hardcoded literals gaps `0.25/0.375/0.5/0.125rem`, `border-bottom/left:2px`, `min-width:200px`, `box-shadow:0 4px 16px rgba(0,0,0,0.12)`, `z-index:200`, `rotate(180deg)`, `font-weight:600`, dropdown `top:calc(100% + 0.375rem)`.
- **Accessibility:** `role="menubar"/"menu"/"menuitem"/"none"`, `aria-label`, `aria-haspopup`, `aria-expanded`, `aria-controls`, `aria-current="page"/"true"`; chevron/icon SVGs `aria-hidden`; visible focus rings.
- **Interactions:** dropdown shown open statically for demo via `--open` class; no JS present — open/close, keyboard arrow navigation, and expand/collapse are consumer's responsibility.
- **Composition:** `<nav>` > `ul.ds-nav-menu__list` > items with `<a>`/`<button>` links; dropdown is nested `<ul>`; links embed inline SVG icons + text.
- **Dependencies:** 3 CSS layers; inline SVG icons (chevron, nav glyphs); JS for interactive dropdowns.
- **Responsive Behaviour:** `--vertical` restacks to column with static/nested dropdowns; `white-space:nowrap` on links; no media queries.
- **Builder Readiness:** ★ 3/5 — good token-driven theming and clear orientation/state variants, but several hardcoded dimensions/shadows, missing-token fallbacks, and dropdown/keyboard behaviour requires consumer JS.


### 19. Pagination

*`components/pagination/` — page-number links with prev/next, ellipsis, sizes.*

- **Purpose:** Navigate multi-page result sets via numbered page links plus prev/next controls.
- **Variants:** `ds-pagination--sm`; `ds-pagination--lg`; link modifiers `ds-pagination__link--prev`, `ds-pagination__link--next`.
- **States:** `:hover:not([aria-disabled="true"])`; `:focus-visible`; `[aria-current="page"]` (active, `cursor:default`); `[aria-disabled="true"]` (`opacity:0.4`, `pointer-events:none`).
- **Slots:** `ds-pagination__item`; `ds-pagination__link`; `ds-pagination__ellipsis`.
- **Properties:** size variant; current page (`aria-current`); disabled state (`aria-disabled`); prev/next labels; per-link `aria-label`.
- **Token Usage:** consumes `--ds-action-primary-radius`, `--ds-action-primary-font-size-sm/md`, `--ds-content-text-primary/secondary`, `--ds-surface-page`, `--ds-action-secondary-bg/text/border`, `--ds-action-primary-bg/text`, `--ds-focus-ring-width/color/offset`, `--ds-action-primary-transition-duration`, `--ds-border-default-width`; flag NOT-emitted var `--ds-border-default-color` (no fallback here — resolves to nothing); hardcoded literals `min-width/height:2.25rem` (1.75/2.75 for sm/lg), padding `0 0.5/0.375/0.625/0.75rem`, gap `0.25rem`, `opacity:0.4`, `calc(...*0.875)`, `line-height:1`, `font-weight:600`.
- **Accessibility:** wrapping `<nav aria-label>`; `aria-current="page"` on active; `aria-disabled="true"` + `role="link"` on disabled prev; per-page `aria-label`; ellipsis `role="presentation"` inside `aria-hidden` item; icon SVGs `aria-hidden`.
- **Interactions:** links are static `<a href="#">`; no JS — actual page changes / disabled handling are consumer's responsibility.
- **Composition:** `<nav>` > `ul.ds-pagination` > `li.ds-pagination__item` containing `<a>`/`<span>` links or ellipsis; prev/next embed inline SVG chevrons.
- **Dependencies:** 3 CSS layers; inline SVG chevron icons; JS for navigation logic.
- **Responsive Behaviour:** `flex-wrap:wrap` on container allows wrapping; no media queries.
- **Builder Readiness:** ★ 3/5 — strong state/variant parameterization via `aria-*` and size modifiers, but fixed rem dimensions, `--ds-border-default-color` referenced without fallback, and navigation needs consumer JS.


### 20. Product Card

*`components/product-card/` — e-commerce card with media, price, wishlist, CTA.*

- **Purpose:** Display a product with image, badge, brand, name, rating, price, wishlist, and CTA.
- **Variants:** `ds-product-card--horizontal`; `ds-product-card--compact`; `ds-product-card--out-of-stock` (adds `::after` "Out of Stock" media overlay).
- **States:** `.ds-product-card:hover` (lift + shadow); `:hover .ds-product-card__image` (scale 1.04); `.ds-product-card__wishlist:hover`/`:focus-visible`.
- **Slots:** `ds-product-card__media-wrapper`; `__image`; `__badge`; `__wishlist`; `__body`; `__brand`; `__name`; `__rating`; `__price-row`; `__footer`.
- **Properties:** layout/density variant; stock state; badge text; wishlist toggle; image; brand/name/rating/price content; CTA button (disabled when out of stock).
- **Token Usage:** consumes `--ds-content-text-primary/secondary`, `--ds-action-primary-bg/text`, `--ds-action-primary-padding-x/y-md/sm`, `--ds-action-primary-font-size-sm/md`, `--ds-focus-ring-*`; heavy fallback vars — `var(--ds-surface-overlay, var(--ds-surface-page))`, `var(--ds-border-default-width, 1px)`, `var(--ds-action-primary-radius, 0.5rem)`, `var(--ds-shadow-md, rgba(0,0,0,0.1))`, `var(--ds-surface-input, var(--ds-surface-page))`, `var(--ds-overlay-disabled, rgba(0,0,0,0.4))`, `var(--ds-action-primary-text, #fff)`, `var(--ds-focus-ring-width, 2px)`; flag NOT-emitted vars `--ds-surface-overlay`, `--ds-border-default-color`, `--ds-surface-input`, `--ds-shadow-md`, `--ds-overlay-disabled` (demo also uses `--ds-status-success`); hardcoded literals `translateY(-2px)`, `scale(1.04)`, wishlist `2rem`+`border-radius:50%`, horizontal media `180px`, `-webkit-line-clamp:2`, `aspect-ratio:1`, gaps `0.375/0.25/0.5rem`, `letter-spacing:0.05em`.
- **Accessibility:** semantic `<article>`/`<h3>`; wishlist `<button aria-label>` with `aria-hidden` SVG; rating exposes `aria-label` (e.g. "4 out of 5 stars"); out-of-stock overlay is CSS `content` (not announced); CTA uses native `disabled`.
- **Interactions:** hover lift/zoom are CSS-only; wishlist toggle and add-to-cart have NO JS — consumer's responsibility; out-of-stock disables wishlist via inline `pointer-events:none`.
- **Composition:** composes DS `ds-rating` and `ds-product-price` components, a badge, and a primary button; body/footer accept arbitrary content; horizontal variant wraps body+footer in a flex column.
- **Dependencies:** 3 CSS layers; sibling components `../rating/rating.css` and `../product-price/product-price.css`; inline SVG icons; demo-local `.ds-btn-primary`/`.ds-badge` styles; JS for cart/wishlist.
- **Responsive Behaviour:** `aspect-ratio:1`, `object-fit:cover`, `overflow:hidden`, `flex-wrap` on price row, `-webkit-line-clamp` name truncation; demo grid `repeat(3,1fr)`; no media queries in component CSS.
- **Builder Readiness:** ★ 3/5 — rich variants/slots and composes cleanly with rating/price, but numerous hardcoded values and many missing-token fallbacks (`--ds-surface-input`, `--ds-shadow-md`, `--ds-overlay-disabled`, `--ds-surface-overlay`, `--ds-border-default-color`); interactivity needs consumer JS.


### 21. Product Price

*`components/product-price/` — Displays current, original, discount, range, per-unit pricing.*

- **Purpose:** Present product pricing (current, was/original, discount %, range, per-unit) with sale emphasis.
- **Variants:** `--sale` (destructive-colored current); `--sm` / `--lg` (default md); `--stacked` (column layout).
- **States:** None (purely presentational; no `:hover`/`:focus`/interactive states in CSS).
- **Slots:** `__current`; `__original`; `__discount`; `__label`; `__range`; `__per-unit` sub-parts where text is placed.
- **Properties:** size (`--sm`/`--lg`); sale flag (`--sale`); layout (`--stacked`); text content of each sub-element.
- **Token Usage:** `--ds-content-text-primary`, `--ds-content-text-secondary`, `--ds-action-primary-bg`, `--ds-action-destructive-bg` (no fallback) consumed; sizing via `var(--ds-action-primary-font-size-lg/md/sm, ...)`, `var(--ds-font-size-xs/xl, ...)` all with hardcoded rem fallbacks; `--ds-status-success` referenced (likely not emitted) via `var(--ds-status-success, var(--ds-action-primary-bg))`; hardcoded literals: `gap` `0.375rem`/`0.125rem`, `font-weight` 700/600, `line-height` 1.2.
- **Accessibility:** No roles/ARIA; plain `<span>`s; line-through on `__original` conveys sale by style only (no `<del>`/`<s>` or screen-reader text) — potential concern for assistive tech.
- **Interactions:** None; static display component, no JS in demo; consumer supplies price values/formatting.
- **Composition:** Inline-flex row (or column when stacked) of spans; stacked demo nests an inner flex `div` for original+discount; intended to sit within product cards.
- **Dependencies:** 3 CSS layers (core/semantic/base) + `product-price.css`; no JS, SVG, or other DS components.
- **Responsive Behaviour:** `flex-wrap: wrap` on container allows wrapping; no media queries.
- **Builder Readiness:** ★ 4/5 — clean token-driven variants/sizes, no JS; minor hardcoded rem fallbacks/spacing and a non-emitted `--ds-status-success` reference.


### 22. Progress

*`components/progress/` — Linear and circular progress bars with states.*

- **Purpose:** Show determinate/indeterminate task progress as linear bar or circular ring.
- **Variants:** `--sm`/`--md`/`--lg` (track height); `--indeterminate`; `--circular`; fill variants `__fill--success`, `__fill--error`.
- **States:** No pseudo-class states; `--indeterminate` animated via `@keyframes`; visual state via fill modifiers; ARIA states in HTML (`aria-busy`).
- **Slots:** `__header` (with `__label`, `__value`); `__track`/`__fill`; `__circle-wrapper` (`__circle-svg` with `__circle-track`/`__circle-fill`, `__circle-text`).
- **Properties:** size; determinate value (inline `style="width:%"` on fill / SVG `stroke-dashoffset`); state (success/error); label/value text; ARIA `aria-valuenow/min/max`.
- **Token Usage:** `--ds-action-secondary-bg` (track), `--ds-action-primary-bg` (fill), `--ds-action-destructive-bg` (error), `--ds-content-text-primary/secondary`, `--ds-action-primary-font-size-sm` (no fallback) consumed; `--ds-status-success` referenced (likely not emitted) via `var(--ds-status-success, var(--ds-action-primary-bg))`; hardcoded literals: `border-radius: 9999px`, heights `0.25/0.5/0.75rem`, `gap 0.375rem`, `width:25% !important`, animation timings/transforms, `transition 0.3s`.
- **Accessibility:** `role="progressbar"` with `aria-valuenow/valuemin/valuemax`/`aria-label`; indeterminate uses `aria-busy="true"`; circular SVGs `aria-hidden` with `aria-label` on wrapper; percentage duplicated as visible text.
- **Interactions:** Fill width / stroke-dashoffset must be set by consumer (inline styles in demo); no JS present; indeterminate is pure CSS animation; real progress updates are consumer's responsibility.
- **Composition:** Linear = header row + track/fill; circular = wrapper stacking SVG rings + centered text label; each `.ds-progress` is standalone block.
- **Dependencies:** 3 CSS layers + `progress.css`; inline SVG `<circle>` for circular; no JS or other DS components.
- **Responsive Behaviour:** Track `width: 100%`; circular fixed 64px SVG; no media queries.
- **Builder Readiness:** ★ 3/5 — token-driven colors, but circular requires manual circumference/offset math and inline styles, `!important` and hardcoded radii/sizes, plus non-emitted `--ds-status-success` fallback.


### 23. Radio

*`components/radio/` — Custom-styled radio inputs in groups with labels.*

- **Purpose:** Accessible single-select radio buttons grouped vertically or horizontally with labels/hints.
- **Variants:** `--horizontal` group modifier (default vertical); size fixed at `1.125rem`.
- **States:** `:checked` (SVG dot), `:hover:not(:disabled)`, `:focus-visible` (focus ring), `:disabled` (+ disabled label via `:disabled + .ds-radio-label`).
- **Slots:** `.ds-radio-item` label wraps `.ds-radio` input + `.ds-radio-label` text; optional `.ds-radio-hint`; group container `.ds-radio-group`.
- **Properties:** orientation (`--horizontal`); `name`/`value`/`checked`/`disabled` on native input; label + hint text.
- **Token Usage:** `--ds-action-primary-bg`, `--ds-content-text-primary/secondary`, `--ds-action-primary-font-size-md/sm`, `--ds-action-primary-transition-duration`, `--ds-action-primary-bg-disabled`, `--ds-action-primary-border-disabled`, `--ds-action-primary-text-disabled`, `--ds-focus-ring-width/color/offset` consumed (no fallback); fallbacks used: `var(--ds-form-label-gap, 0.5rem)`, `var(--ds-action-primary-icon-gap, 0.5rem)`; referenced but likely NOT emitted: `--ds-border-default-width`, `--ds-border-default-color` (bare, no fallback), `var(--ds-surface-input, var(--ds-surface-page))`; hardcoded literals: size `1.125rem`, `border-radius: 50%`, embedded white-fill SVG data URI (`fill='white'`).
- **Accessibility:** Native `<input type="radio">`; `role="radiogroup"` + `aria-labelledby`/legend in demo; `:focus-visible` ring; disabled cursor/color; label association via wrapping `<label>`. Embedded checked-dot SVG hardcodes `white` (contrast concern on light primary bg).
- **Interactions:** Native browser radio behavior (selection, arrow-key navigation within group); no JS needed; hint/state entirely CSS.
- **Composition:** `.ds-radio-group` stacks/flows `.ds-radio-item` labels; combines with fieldset/legend for form grouping.
- **Dependencies:** 3 CSS layers + `radio.css`; inline data-URI SVG for checked dot; no JS or other DS components.
- **Responsive Behaviour:** Horizontal group uses `flex-wrap: wrap`; no media queries.
- **Builder Readiness:** ★ 4/5 — native semantics, token-driven, no JS; minor: hardcoded size/`white` dot color and reliance on non-emitted `--ds-border-*`/`--ds-surface-input` tokens (one without fallback).


### 24. Rating

*`components/rating/` — Star rating, read-only display or interactive radio group.*

- **Purpose:** Show/collect star ratings with full/half/empty stars, optional review count.
- **Variants:** `--sm`/`--md`/`--lg` (star SVG size, default md); `--readonly`; star modifiers `__star--filled`, `__star--half`.
- **States:** `:hover` (and sibling combinators to fill hovered + reset following stars) only when not `--readonly`; `__input:focus-visible + __star` focus ring; `--readonly` disables pointer-events.
- **Slots:** `.ds-rating` wraps `__star` labels/spans (each with inline `<svg>`); half uses `__star-full`/`__star-empty` SVGs; hidden `__input` radios; `__count` text.
- **Properties:** size; readonly flag; rating value (which stars get `--filled`/`--half`, or which radio `checked`); star SVG icon; count text; `aria-label`.
- **Token Usage:** `--ds-content-text-secondary` (empty), `--ds-action-primary-transition-duration` (fallback `0.15s`), `--ds-focus-ring-width/color/offset` (fallbacks `2px`/`--ds-action-primary-bg`/`2px`), `--ds-action-primary-font-size-sm` (fallback `0.75rem`) consumed; referenced but likely NOT emitted: `--ds-rating-star-color` via `var(--ds-rating-star-color, var(--ds-action-primary-bg))`; hardcoded literals: gaps `0.125/0.375rem`, star sizes `1/1.25/1.75rem`, `clip-path: inset(...)`, `border-radius: 2px`, clip `rect(0 0 0 0)`, `width/height: 1px`.
- **Accessibility:** Read-only: `aria-label` on container, stars `aria-hidden`; interactive: visually-hidden native radios in fieldset/legend with per-star `aria-label`, `role="group"`; `:focus-visible` ring on adjacent star. Half-star has no numeric text alt beyond container label.
- **Interactions:** Interactive selection via native radios (no JS); hover preview is pure CSS; consumer must render correct filled/half classes or checked radio to reflect value; no JS in demo.
- **Composition:** Inline-flex row of star spans/labels + optional `__count`; interactive variant nests inputs+labels inside fieldset; suits product cards/review UIs.
- **Dependencies:** 3 CSS layers + `rating.css`; inline star `<svg>` paths (repeated per star); no JS or other DS components.
- **Responsive Behaviour:** Inline-flex, fixed rem star sizes; no media queries.
- **Builder Readiness:** ★ 3/5 — token-driven colors and no-JS accessible pattern, but many hardcoded sizes/clip values, per-star SVG duplication, half-star CSS has redundant/dead rules, and non-emitted `--ds-rating-star-color` reliance.


### 25. Switch

*`components/switch/` — checkbox-based toggle switch with sizes and states*

- **Purpose:** Binary on/off toggle rendered from a native `input[type=checkbox]` styled as a track+thumb switch.
- **Variants:** size modifiers `--sm`, `--lg` (default/medium is base `.ds-switch`); no visual-color variants.
- **States:** `:checked`, `:hover:not(:disabled)`, `:checked:hover:not(:disabled)`, `:focus-visible`, `:disabled`, and `:disabled + .ds-switch-label`.
- **Slots:** `.ds-switch-item` (label wrapper), `.ds-switch` (the input), `.ds-switch-label` (text); thumb is `::after` pseudo-element.
- **Properties:** size (`--sm`/`--lg`), `checked`, `disabled`, `role="switch"`, `aria-label`; consumer sets these on the native input.
- **Token Usage:** `--ds-action-primary-bg`, `--ds-action-primary-bg-hover`, `--ds-action-primary-bg-disabled`, `--ds-action-primary-text-disabled`, `--ds-action-primary-transition-duration`, `--ds-action-primary-icon-gap` (fallback `0.5rem`), `--ds-action-primary-font-size-md`, `--ds-surface-page`, `--ds-content-text-primary`, `--ds-focus-ring-*`; flags: `--ds-border-default-color` (unemitted, no fallback) used for off-state track; hardcoded literals — track/thumb sizes (`2.5rem`/`1.375rem`, `1rem`, radii `9999px`/`50%`), translate offsets, and `box-shadow 0 1px 3px rgba(0,0,0,0.2)`.
- **Accessibility:** uses native checkbox with `role="switch"`; `aria-label` supplied when no visible label; `:focus-visible` ring; `:disabled` sets `not-allowed` cursor; thumb contrast relies on `rgba` shadow. Checked state conveyed by native `checked` (no explicit `aria-checked`).
- **Interactions:** toggle behaviour is native (checkbox); no JS in demo; visual thumb slide via CSS `transform`; real state binding is consumer's responsibility.
- **Composition:** `.ds-switch-item` label wraps input + `.ds-switch-label`; demo also composes into a settings-list row layout via inline flex.
- **Dependencies:** 3 CSS layers (core/semantic/base) + `switch.css`; no JS, no SVG, no other DS components.
- **Responsive Behaviour:** No explicit responsive rules (fixed rem dimensions; `flex-shrink:0`).
- **Builder Readiness:** ★ 4/5 — clean token-driven colors and parameterized sizes/states, but fixed rem geometry and hardcoded `box-shadow`/`rgba`, plus reliance on unemitted `--ds-border-default-color` without fallback for the off track.


### 26. Table

*`components/table/` — semantic data table with density/style variants*

- **Purpose:** Styled `<table>` for tabular data with sortable headers, numeric cells, and row selection.
- **Variants:** `--striped`, `--hoverable`, `--bordered`, `--compact` (combinable, e.g. `--compact --hoverable`).
- **States:** `.ds-table--hoverable tbody tr:hover`, `tr:last-child td` (no border), `.ds-table__sort-btn:focus-visible`, sort direction `--asc`/`--desc`, `.ds-table__row--selected`.
- **Slots:** `.ds-table-wrapper` (scroll container), `.ds-table` (table), `thead/tbody/th/td`, `.ds-table__sort-btn` (header button), `.ds-table__cell--numeric`.
- **Properties:** variant classes on `.ds-table`; per-cell `--numeric`; sort button state `--asc`/`--desc` + `aria-label`; row `--selected` + `aria-selected`.
- **Token Usage:** `--ds-action-primary-font-size-md/-sm`, `--ds-action-primary-padding-y-md`/`-x-md`, `--ds-content-text-primary`/`-secondary`, `--ds-border-default-width`, `--ds-action-primary-bg`, `--ds-action-secondary-bg`, `--ds-action-ghost-bg-hover`, `--ds-focus-ring-*`; fallbacks — `--ds-action-ghost-bg` (fallback `var(--ds-action-secondary-bg)`), `--ds-action-primary-transition-duration` (fallback `0.15s`), compact paddings fallback to `0.375rem`/`0.625rem`; flags: `--ds-border-default-color` (unemitted, no fallback) used on every border; hardcoded literals — `2px solid` header/focus borders, `border-radius: 2px`, gap `0.25rem`, calc multipliers `0.5/0.75`.
- **Accessibility:** native semantic table (`th` scope implied by position, not explicit `scope`); sort buttons carry descriptive `aria-label`; sort arrow spans `aria-hidden`; selected row uses `aria-selected="true"`; focus ring on sort button. Concern: no `scope="col"` on `th`; sort direction not exposed via `aria-sort`.
- **Interactions:** sort-button clicks and selection are visual only; no JS in demo; actual sorting/selection is consumer's responsibility.
- **Composition:** wrapper enables horizontal scroll; sort buttons nest inside `th`; numeric modifier on `th`/`td`.
- **Dependencies:** 3 CSS layers + `table.css`; no JS, no SVG (arrows are unicode glyphs), no other DS components.
- **Responsive Behaviour:** `.ds-table-wrapper { width:100%; overflow-x:auto }` and `.ds-table{width:100%}` give horizontal scroll on narrow viewports; no media queries.
- **Builder Readiness:** ★ 4/5 — token-driven with cleanly combinable variants and an overflow wrapper; minor hardcoded `2px` borders/radii and reliance on unemitted `--ds-border-default-color`; sorting/selection require consumer JS.


### 27. Tabs

*`components/tabs/` — ARIA tablist with underline/pills styles and sizes*

- **Purpose:** Tabbed navigation switching between `role=tabpanel` regions via `role=tab` triggers.
- **Variants:** style `--pills` (default is underline); sizes `--sm`, `--lg`.
- **States:** `:hover:not(:disabled)`, `:focus-visible`, `[aria-selected="true"]`, `:disabled`, panel `[hidden]`; badge restyled when trigger not selected.
- **Slots:** `.ds-tabs` (root), `.ds-tabs__list` (tablist), `.ds-tabs__trigger` (tab button), `.ds-tabs__badge` (count), `.ds-tabs__panel` (tabpanel content).
- **Properties:** variant/size classes on `.ds-tabs`; per-trigger `aria-selected`, `aria-controls`, `tabindex`, `disabled`; panel `hidden`, `aria-labelledby`.
- **Token Usage:** `--ds-border-default-width`, `--ds-border-default-color` (unemitted, no fallback — used on list border, hover/inactive-badge bg), `--ds-action-primary-padding-y-md`/`-x-md`, `--ds-action-primary-font-size-md/-sm`, `--ds-action-primary-transition-duration`, `--ds-action-primary-radius`, `--ds-action-primary-bg`/`-text`, `--ds-action-secondary-bg`, `--ds-action-ghost-bg`/`-text`, `--ds-content-text-primary`/`-secondary`, `--ds-focus-ring-*`; hardcoded literals — `2px solid transparent` bottom border, gaps `0.375rem`/`0.25rem`, badge sizing (`1.25rem`, `999px`, padding `0 0.3rem`), `opacity:0.4`, calc multipliers `0.75`/`1.125`/`1.25`.
- **Accessibility:** full ARIA pattern — `role=tablist`/`tab`/`tabpanel`, `aria-selected`, `aria-controls`, `aria-labelledby`, roving `tabindex`, panel `tabindex=0`, `aria-label` on lists; disabled tab via native `disabled`; badge has `aria-label`; `:focus-visible` ring. Selected-color contrast depends on `--ds-action-primary-bg`.
- **Interactions:** demo JS handles click-to-switch (toggles `aria-selected`, `tabindex`, panel `hidden`); no arrow-key roving navigation implemented — consumer must add keyboard support and robust behaviour.
- **Composition:** panels sit as siblings under `.ds-tabs`; triggers can contain text + `.ds-tabs__badge`; pills variant wraps list in a filled rounded container.
- **Dependencies:** 3 CSS layers + `tabs.css`; demo-only inline JS for switching; no SVG, no other DS components.
- **Responsive Behaviour:** `.ds-tabs__list { overflow-x:auto; scrollbar-width:none }` (+ hidden webkit scrollbar) for horizontal overflow scrolling; no media queries.
- **Builder Readiness:** ★ 4/5 — token-driven with clean variant/size params and strong ARIA; needs consumer JS (demo lacks keyboard nav) and has minor hardcoded values plus unemitted `--ds-border-default-color` without fallback.


### 28. Textarea

*`components/textarea/` — multiline input with label, hint, sizes, error*

- **Purpose:** Styled multiline `<textarea>` with label, hint/error text, and optional char count.
- **Variants:** size `--sm`, `--lg`; `--error`; `--no-resize`; hint variant `.ds-textarea-hint--error`.
- **States:** `::placeholder`, `:hover:not(:disabled)`, `:focus-visible`, `:disabled`, `--error:focus-visible`.
- **Slots:** `.ds-textarea-wrapper`, `.ds-textarea-label`, `.ds-textarea` (field), `.ds-textarea-hint`, `.ds-textarea-char-count`.
- **Properties:** size/error/no-resize classes; native `placeholder`, `rows`, `disabled`, `id`/`for`; hint/count text content.
- **Token Usage:** `--ds-content-text-primary`, `--ds-content-text-secondary`, `--ds-action-primary-radius`, `--ds-action-primary-padding-*` (sm/md/lg), `--ds-action-primary-font-size-*`, `--ds-action-primary-transition-duration`, `--ds-action-primary-bg`, `--ds-action-primary-bg-disabled`, `--ds-action-primary-text-disabled`, `--ds-action-destructive-bg`, `--ds-focus-ring-*`; fallbacks — `--ds-form-label-gap`(`0.375rem`), `--ds-form-label-font-family`(`inherit`), `--ds-form-label-font-size`(`0.875rem`), `--ds-form-label-font-weight`(`500`), `--ds-surface-input`(fallback `var(--ds-surface-page)`), `--ds-content-text-placeholder`(fallback secondary), `--ds-border-hover-color`(fallback `var(--ds-action-primary-bg)`); flags: `--ds-border-default-color` (unemitted, no fallback) on default border; `--ds-surface-input`, `--ds-content-text-placeholder`, `--ds-border-hover-color` are unemitted but fallback-guarded; hardcoded literals — `min-height:80px`, `line-height:1.5`.
- **Accessibility:** label linked via `for`/`id`; error conveyed by color + hint text only (no `aria-invalid`/`aria-describedby`); `:focus-visible` ring; disabled uses native `disabled` + `not-allowed`. Concern: error state not programmatically exposed.
- **Interactions:** native textarea; `resize:vertical` (default) / `none` (disabled, `--no-resize`); char-count updating is consumer's responsibility (no JS in demo).
- **Composition:** wrapper stacks label + field + hint/count; error field pairs with `--error` hint variant.
- **Dependencies:** 3 CSS layers + `textarea.css`; no JS, no SVG, no other DS components.
- **Responsive Behaviour:** `width:100%` and `box-sizing:border-box` fluidly fill container; no media queries.
- **Builder Readiness:** ★ 4/5 — strongly token-driven with well-guarded fallbacks and clean size/error/no-resize params; minor hardcoded `min-height:80px`/`line-height`, unemitted `--ds-border-default-color` (no fallback), and error state lacking ARIA wiring.


### 29. Thumbnail Row

*`components/thumbnail-row/` — horizontal scrolling strip of selectable image thumbnails*

- **Purpose:** Horizontally scrollable row of selectable thumbnail items (gallery/carousel picker) with optional add button.
- **Variants:** size `--sm`/`--md`/`--lg` (60/80/120px); `--filmstrip` (60×90 portrait); item state `__item--active`.
- **States:** `:focus-visible` (item + add-btn); `:hover` (add-btn); `--active` selected item; scrollbar styling.
- **Slots:** `__item` (holds `__image` or fill content); `__image`; `__add-btn` (trailing action).
- **Properties:** row size variant; per-item active flag; `tabindex`; `role`/`aria-selected`/`aria-label`; optional add button.
- **Token Usage:** `--ds-action-primary-radius`, `--ds-action-primary-bg`, `--ds-action-primary-transition-duration`, `--ds-content-text-secondary`, `--ds-focus-ring-width/color/offset`, `--ds-border-default-width`; flags: `--ds-border-default-color` (NOT emitted, used raw with NO fallback on scrollbar-color/scrollbar/add-btn border — will fail); many `var(--x, fallback)` fallbacks (radius, transition, focus ring); hardcoded literals: `gap 0.5rem`, all item sizes `60/80/120/90px`, `border 2px`, scrollbar `4px`/`9999px`, svg `1.25rem`; HTML uses `--ds-surface-input` (NOT emitted) with hex fallbacks plus raw hex demo fills.
- **Accessibility:** `role="listbox"` on row, `role="option"` + `aria-selected` on items, `aria-label`s, `tabindex="0"`; add-btn is real `<button>` with `aria-label`; visible focus ring.
- **Interactions:** selection/scroll behaviour is consumer's responsibility; no JS in demo; `--active`/`aria-selected` toggling must be wired by consumer.
- **Composition:** row wraps N `__item`s (+ optional trailing `__add-btn`); items contain images; can embed the separate Thumbnail component's content.
- **Dependencies:** 3 CSS layers (core/semantic/base); inline plus-icon SVG for add-btn; no JS; token set missing `--ds-border-default-color`/`--ds-surface-input`.
- **Responsive Behaviour:** `overflow-x: auto` with touch scrolling + thin scrollbar; fixed pixel item sizing (not fluid); `flex-shrink: 0`.
- **Builder Readiness:** ★ 3/5 — clean variant/state structure but many hardcoded pixel sizes and a missing `--ds-border-default-color` token used without fallback; selection needs consumer JS.


### 30. Thumbnail

*`components/thumbnail/` — single image thumbnail with overlay, caption, play, select*

- **Purpose:** Single image thumbnail with aspect ratio, hover overlay, optional caption/play button and selected state.
- **Variants:** aspect `--1-1`/`--4-3`/`--16-9`/`--3-4`; size `--sm`/`--md`/`--lg` (max-width 120/240/480px); `--selected`.
- **States:** `:hover` (image `scale(1.04)`, overlay darken); `[tabindex]:focus-visible`; `--selected` (outline).
- **Slots:** `__image`; `__overlay`; `__caption`; `__play` (icon); `__checkbox` (multi-select).
- **Properties:** aspect ratio; size; selected flag; `tabindex`; `role` (img/button/option); `aria-selected`/`aria-label`.
- **Token Usage:** `--ds-action-primary-radius`, `--ds-action-primary-bg`, `--ds-action-primary-transition-duration`, `--ds-action-primary-text`, `--ds-action-primary-padding-x/y-sm`, `--ds-action-primary-font-size-sm`, `--ds-focus-ring-*`; flags: `--ds-surface-input` (NOT emitted, fallback `var(--ds-surface-page)`), `--ds-overlay-hover` (NOT emitted, fallback `rgba(0,0,0,0.3)`), `--ds-overlay-caption` (NOT emitted, fallback `rgba(0,0,0,0.5)`); hardcoded literals: `scale(1.04)`, selected `outline 3px`+`offset 2px`, play svg `2.5rem`, `drop-shadow rgba`, checkbox `0.5rem`, all max-widths, `line-height` values; demo has raw hex fills + `#fff`.
- **Accessibility:** flexible `role` (img/button/option); `aria-label`/`aria-selected`; `__play` `aria-hidden`; focus ring on focusable thumbnails; caption is plain text (contrast rests on overlay fallback).
- **Interactions:** hover/select behaviour visual only; selection toggling and play action are consumer's responsibility; no JS in demo.
- **Composition:** composes into grids and the Thumbnail Row; layers image + overlay + caption/play absolutely; sized by parent wrapper width.
- **Dependencies:** 3 CSS layers; inline play SVG; no JS; token set missing overlay + surface-input tokens (all have fallbacks).
- **Responsive Behaviour:** `aspect-ratio` modifiers; `max-width` size caps; `width/height:100%` image with `object-fit: cover`; fluid within container.
- **Builder Readiness:** ★ 3/5 — well parameterized but relies on three non-emitted overlay/surface tokens via fallbacks plus hardcoded pixel sizes and outline widths.


### 31. Toast

*`components/toast/` — fixed notification region with status toast items*

- **Purpose:** Transient status notifications (icon + title + description + close) stacked in a fixed corner region.
- **Variants:** `--success`, `--error`, `--warning`, `--info` (colored left border + icon color).
- **States:** `:hover` (close bg/color); `:focus-visible` (close ring); status variant classes; no disabled state.
- **Slots:** `__icon`, `__content` (holds `__title` + `__description`), `__close`; region `.ds-toast-region` container.
- **Properties:** status variant; title/description text; icon SVG; `role` (status/alert); `aria-live`/`aria-atomic`; close `aria-label`.
- **Token Usage:** `--ds-action-primary-padding-x/y-md`, `--ds-action-primary-icon-gap`, `--ds-action-primary-radius`, `--ds-action-primary-font-size-md/sm`, `--ds-content-text-primary/secondary`, `--ds-action-ghost-bg-hover`, `--ds-action-destructive-bg`, `--ds-action-primary-bg`, `--ds-focus-ring-*`; flags: `--ds-surface-overlay` (fallback `var(--ds-surface-page)`), `--ds-status-success` (NOT emitted, fallback `--ds-action-primary-bg`), `--ds-status-warning` (NOT emitted, fallback `var(--ds-action-secondary-border, currentColor)`), `--ds-action-secondary-border` (fallback chain); hardcoded literals: `box-shadow 0 4px 16px rgba(0,0,0,0.12)`, `max-width 360px`, `z-index 9000`, border-left `3px`, gap `0.5rem`, margins `0.125rem`, close `padding 0.25rem`, font-weight `600`, line-heights.
- **Accessibility:** region `aria-label="Notifications"`; success/warning/info `role="status" aria-live="polite"`, error `role="alert" aria-live="assertive"`, `aria-atomic="true"`; separate visually-hidden live region; icons `aria-hidden`; close is real button with `aria-label`; `pointer-events` managed so region is click-through.
- **Interactions:** dismiss/auto-timeout/enqueue behaviour is consumer's responsibility; no JS in demo (toasts shown statically); close button non-functional without JS.
- **Composition:** `.ds-toast-region` holds N `.ds-toast` items; each toast composes icon/content/close; status modifier tints border+icon.
- **Dependencies:** 3 CSS layers; inline status SVG icons; no JS; token set missing `--ds-status-success`/`--ds-status-warning` (fallbacks provided, so success/warning lose distinct color).
- **Responsive Behaviour:** fixed region bottom-right; `max-width: 360px`; `min-width:0` content for truncation; no media queries.
- **Builder Readiness:** ★ 3/5 — solid tokenized structure and strong a11y, but status colors depend on non-emitted tokens (fall back to primary), hardcoded shadow/z-index/max-width, and dismiss needs JS.


### 32. Tooltip

*`components/tooltip/` — hover/focus popover label with placement arrow*

- **Purpose:** Small contextual label revealed on hover/focus of a trigger, with directional arrow.
- **Variants:** placement `--top`/`--bottom`/`--left`/`--right` (positions bubble + arrow).
- **States:** shown via `:hover` on wrapper, trigger `:focus-visible`, or `[data-state="open"]`; hidden via `[data-state="closed"]`; trigger `:focus-visible` ring.
- **Slots:** `.ds-tooltip` (text content); `.ds-tooltip-trigger` (the triggering control); `.ds-tooltip-wrapper` (positioning context); `::after` arrow (generated).
- **Properties:** placement variant; tooltip text; `data-state` open/closed; `id` + trigger `aria-describedby`; `role="tooltip"`.
- **Token Usage:** `--ds-action-primary-font-size-sm`, `--ds-action-primary-radius`, `--ds-action-primary-transition-duration`, `--ds-focus-ring-width/color/offset`; flags: `--ds-surface-tooltip` (NOT emitted, fallback `var(--ds-action-primary-bg)`, used for bg + all 4 arrow colors), `--ds-content-tooltip` (NOT emitted, fallback `var(--ds-action-primary-text)`); hardcoded literals: `z-index 9000`, `padding 0.25rem 0.5rem`, `max-width 240px`, arrow `border 5px`, all placement offsets `0.375rem`, `line-height 1.4`.
- **Accessibility:** `role="tooltip"` + `aria-describedby` links trigger to bubble; focus-visible reveals + rings trigger; `pointer-events: none` prevents hover trapping; no `Escape`-to-dismiss wired.
- **Interactions:** CSS-only hover/focus reveal; `data-state` toggling for controlled/click behaviour is consumer's responsibility; no JS in demo; no dismiss-on-escape logic.
- **Composition:** `-wrapper` wraps trigger + tooltip; trigger can be any focusable control (demo uses button); nests inline via `inline-flex`.
- **Dependencies:** 3 CSS layers; no icons/JS; relies on non-emitted `--ds-surface-tooltip`/`--ds-content-tooltip` (fall back to primary action colors).
- **Responsive Behaviour:** `max-width: 240px` with `white-space: normal` wrapping; percentage-based placement transforms; no media queries.
- **Builder Readiness:** ★ 4/5 — cleanly tokenized, CSS-only reveal covers hover+focus, placements parameterized; minor gaps: non-emitted tooltip color tokens (fallbacks) and hardcoded offsets/z-index; controlled open + escape need JS.
