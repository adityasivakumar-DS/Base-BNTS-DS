# 01 — Repository Analysis

> **Repository analysed:** [`adityasivakumar-DS/Base-BNTS-DS`](https://github.com/adityasivakumar-DS/Base-BNTS-DS)
> **Analysed at ref:** `claude/new-session-lszcvl` (`a6f9102`)
> **Purpose of this document:** A factual, as-built description of the Base BNTS Design System repository — the headless source of truth that the Design System Builder will sit on top of. This is analysis only. It records what exists and how it is wired together. It does **not** recommend changes.

---

## 1. Overview

Base BNTS DS is a **headless, token-driven design system**. It ships:

- A **three-tier design token graph** authored as W3C Design Tokens Community Group (DTCG) JSON.
- A **Style Dictionary** build that compiles those tokens into layered CSS custom properties and a nested JSON export.
- A library of **30 headless components**, each expressed as a plain CSS file plus a static HTML demo. Components read exclusively from CSS custom properties and contain no hardcoded visual values.

The stated governance model is that **code is canonical** — the repository is the single source of truth from which brands and (per its README) Figma are generated, not the reverse. No brand-specific values are stored in this repo; it holds one organisation-level set of chosen values that can be re-themed by changing tokens and rebuilding.

The technology surface is intentionally minimal: JSON tokens, a single build script, vanilla CSS, and vanilla HTML/JS demos. There is no framework, no bundler, and no component runtime.

---

## 2. Architecture

### 2.1 Conceptual model

The system is organised as a **unidirectional dependency cascade**:

```
Core tokens   →   Semantic tokens   →   Base tokens   →   Components
(raw values)      (intent/roles)        (component        (consume CSS
                                         parameters)        variables)
```

- **Core** holds raw primitives — actual hex values, pixel sizes, durations, numeric scales. Core references nothing.
- **Semantic** aliases core primitives into intent roles (e.g. `color.primary.default → {color.brand.500}`). It expresses *what a value means*.
- **Base** aliases semantic roles into component-facing parameters (e.g. `action.primary.bg → {color.primary.default}`). It expresses *what a value does* for a component.
- **Components** never reference tokens by JSON path. They consume the **generated CSS custom properties** (`var(--ds-*)`) produced from the base and semantic tiers.

The README summarises the intent of each tier:

> **Core** holds raw values. **Semantic** maps intent (what something *is*) to core. **Base** maps component roles (what something *does*) to semantic — these are the values components consume.

### 2.2 Layer boundaries as enforced by the build

The cascade is not only conceptual; the Style Dictionary configuration materialises each tier into a **separate CSS file** using per-file filters keyed on source path:

- `build/css/core.css` — tokens whose `filePath` starts with `tokens/core/`.
- `build/css/semantic.css` — tokens under `tokens/semantic/`.
- `build/css/base.css` — tokens under `tokens/base/`.

Semantic and base are emitted with `outputReferences: true`, so their generated CSS variables reference other CSS variables rather than inlining resolved values. Core is emitted with `outputReferences: false`, so it emits resolved literal values. The practical result is a runtime cascade in CSS that mirrors the authoring cascade in JSON.

### 2.3 Runtime composition

A consuming page loads the three built CSS layers in cascade order, then the component's own CSS:

```html
<link rel="stylesheet" href="../../build/css/core.css">
<link rel="stylesheet" href="../../build/css/semantic.css">
<link rel="stylesheet" href="../../build/css/base.css">
<link rel="stylesheet" href="button.css">
```

Because `semantic.css` and `base.css` emit `var(...)` references back to earlier layers, all three files must be present at runtime for variables to resolve. Components then reference only the `--ds-*` variables.

### 2.4 Separation of concerns

- **Values** live in tokens (JSON).
- **Presentation logic** (layout, states, variants) lives in component CSS.
- **Structure and semantics** live in component HTML.
- **Behaviour** (open/close, toggles) is demonstrated by minimal inline JS in the HTML demos and is explicitly described as the consumer's responsibility, not part of the headless component.

---

## 3. Folder Structure

```
Base-BNTS-DS/
├── .gitignore
├── README.md
├── package.json
├── package-lock.json
├── style-dictionary.config.js
├── tokens/
│   ├── core/
│   │   ├── border.json
│   │   ├── color.json
│   │   ├── elevation.json
│   │   ├── motion.json
│   │   ├── opacity.json
│   │   ├── radius.json
│   │   ├── spacing.json
│   │   └── typography.json
│   ├── semantic/
│   │   ├── border.json
│   │   ├── color.json
│   │   ├── elevation.json
│   │   ├── motion.json
│   │   ├── radius.json
│   │   ├── spacing.json
│   │   └── typography.json
│   └── base/
│       └── base.json
├── components/
│   ├── accordion/        (accordion.css, accordion.html)
│   ├── alert/            ... (every component dir holds <name>.css + <name>.html)
│   ├── avatar/
│   ├── badge/
│   ├── breadcrumb/
│   ├── button/
│   ├── card/
│   ├── checkbox/
│   ├── date-picker/
│   ├── drawer/
│   ├── dropdown/
│   ├── file-upload/
│   ├── header/
│   ├── input/
│   ├── list/
│   ├── menu/
│   ├── modal/
│   ├── navigation-menu/
│   ├── pagination/
│   ├── product-card/
│   ├── product-price/
│   ├── progress/
│   ├── radio/
│   ├── rating/
│   ├── switch/
│   ├── table/
│   ├── tabs/
│   ├── textarea/
│   ├── thumbnail/
│   ├── thumbnail-row/
│   ├── toast/
│   └── tooltip/
└── build/                (generated; gitignored)
    ├── css/{core,semantic,base}.css
    └── json/tokens.json
```

### Observations on structure

- The token tree has **exactly three top-level directories** (`core`, `semantic`, `base`) that map 1:1 to the three tiers.
- **Core and semantic are split by foundation** (one file per foundation: border, color, elevation, motion, radius, spacing, typography — plus `opacity` which exists in core only). **Base is a single consolidated `base.json`** rather than being split per foundation or per component.
- **Each component is its own directory** containing exactly two files: `<name>.css` and `<name>.html`. There is no index, manifest, JSON metadata, or JS module per component.
- `build/` is **not committed** (it is in `.gitignore`), so the compiled CSS is a local artifact regenerated from tokens.
- There is **no `docs/`, `test/`, `scripts/`, or CI configuration directory** at the analysed ref. The README notes CI is "TBD Step 7."

---

## 4. Naming Conventions

### 4.1 Token JSON naming

- Token group and leaf keys are **lowercase, dot-delimited by nesting**, e.g. `color.brand.500`, `space.component.padding-md`, `font.letterspacing.wide`.
- **Numeric colour scales** use a fixed ladder: `0, 50, 100, 200 … 900, 950, 1000`. `0` is white and `1000` is black across every palette.
- **T-shirt sizing** is the dominant scale vocabulary: `2xs, xs, sm, md, lg, xl, 2xl, 3xl …` used for spacing, radius, typography sizes, border widths, elevation offsets, and more.
- Files follow the DTCG format: every leaf has `$value` and `$type`; many have `$description`. Files declare `"$schema": "https://tr.designtokens.org/format/"`.
- Semantic/base **references** use curly-brace alias syntax: `"{color.brand.500}"`, `"{corner.default}"`, `"{space.component.padding-md}"`.

### 4.2 Semantic role renaming across tiers

Semantic tokens deliberately **rename primitives into role vocabularies** rather than mirroring core names:

- Radius core `radius.*` → semantic `corner.*` (`corner.default`, `corner.pill`, `corner.circle`).
- Spacing core `spacing.*` → semantic `space.component.*` and `space.layout.*`.
- Typography core `font.*` → semantic `text.*` composite roles (`text.h1`, `text.body-md`, `text.label`).

### 4.3 Generated CSS custom property naming

- Style Dictionary is configured with `prefix: 'ds'` and the `css` transform group, producing kebab-cased variables namespaced with `--ds-`.
- Nesting collapses into hyphenation: `action.primary.bg` → `--ds-action-primary-bg`; `content.text-primary` → `--ds-content-text-primary`; `focus.ring-color` → `--ds-focus-ring-color`.

### 4.4 Component CSS class naming (BEM-style)

Component CSS uses a consistent **BEM-like convention with a `ds-` namespace**:

- **Block:** `.ds-button`, `.ds-card`, `.ds-accordion`, `.ds-modal`.
- **Element:** double underscore — `.ds-card__body`, `.ds-modal__header`, `.ds-accordion__trigger`.
- **Modifier:** double hyphen — `.ds-button--primary`, `.ds-button--sm`, `.ds-card--hoverable`, `.ds-accordion--flush`, `.ds-modal--lg`.

Variant and size modifiers are composed on the same element (e.g. `class="ds-button ds-button--primary ds-button--md"`).

> Note: One naming inconsistency is present in the demos — `modal.html` references button classes as `ds-btn ds-btn--primary` while the button component itself defines `.ds-button`. This is recorded here as an observation, not a recommendation.

---

## 5. Components

### 5.1 Inventory

The `components/` directory contains **30 components**. Each is a self-contained directory with exactly two files — `<name>.css` (headless styles) and `<name>.html` (standalone demo). Grouped by role:

| Group | Components |
|---|---|
| **Actions** | button |
| **Form inputs** | input, textarea, checkbox, radio, switch, dropdown, file-upload, date-picker |
| **Feedback & status** | alert, toast, badge, progress, tooltip, rating |
| **Navigation** | breadcrumb, pagination, tabs, menu, navigation-menu, header |
| **Overlays** | modal, drawer |
| **Containers & data display** | card, table, list, accordion, avatar, thumbnail, thumbnail-row |
| **Commerce** | product-card, product-price |

(Grouping is descriptive, applied for this analysis; the repository stores all components as a flat set of sibling directories with no category folders or index.)

### 5.2 Consistent component contract

Every component observed follows the same conventions:

- **Headless styling.** Each `.css` file opens with a header comment stating the contract — *"All values come from semantic/base CSS variables. No hardcoded colors, radii, or sizes."* Styling is delivered through `var(--ds-*)` references (see §10 for exceptions).
- **BEM class structure** namespaced with `ds-` (block / `__element` / `--modifier`).
- **Variants and sizes as modifier classes.** Size modifiers `--sm / --md / --lg` recur across button, input, badge, switch, modal, card, and others. Semantic/style variants are component-specific (e.g. button: `--primary / --secondary / --ghost / --destructive`; badge: `--default / --primary / --success / --warning / --error / --outline / --dot / --notification`; card: `--hoverable / --horizontal / --sm / --lg`; accordion: `--flush / --bordered`; modal: `--sm / --lg / --full`).
- **State via pseudo-classes and ARIA attributes** rather than extra classes — `:hover:not(:disabled)`, `:active`, `:focus-visible`, `:disabled`, and attribute selectors like `[aria-expanded="true"]`, `[aria-disabled="true"]`, `[aria-hidden]`.
- **No JavaScript module.** Interaction, where shown, is minimal inline `<script>` in the demo only; richer behaviour is framed as the consumer's responsibility.

### 5.3 Shared parameter reuse

Components do **not** each define a private token namespace. Instead they draw from a shared pool of base/semantic variables. Notably, `--ds-action-primary-*` (paddings, font sizes, radius, transition duration/easing) is reused far beyond buttons — inputs, accordion, modal, and card all consume `--ds-action-primary-padding-*` and `--ds-action-primary-radius`. In practice `action.primary` acts as a de facto shared source of component spacing, shape, and motion.

### 5.4 Demo richness varies

Component demos range from compact single-file examples (e.g. `textarea.html` ≈ 2 KB, `dropdown.html` ≈ 3 KB) to large multi-section showcases (`rating.html` ≈ 18 KB, `product-card.html` ≈ 16 KB, `list.html` ≈ 10 KB). Larger demos exercise more variants, sizes, and composed states; smaller ones show a minimal set. All share the same page skeleton (§10.2).

### 5.5 Component status per README

The README's component table marks **Button** as complete (`✅`, listing primary/secondary/ghost/destructive × SM/MD/LG + icon-only) and lists "More components — see playbook Step 5" as *Planned*. The repository on disk, however, contains 30 component directories as listed in §5.1 — i.e. the codebase is ahead of the status table in the README.

---

## 6. Foundations

Foundations are the categories of raw parameters defined in `tokens/core/` (and their semantic counterparts). The following foundations exist:

| Foundation | Core file | Semantic file | Core content summary |
|---|---|---|---|
| **Border** | `border.json` | `border.json` | `width` (hairline 0.5px → 2xl 8px), `style` (none/solid/dashed/dotted/double/groove/inset), `treatment` (inside/outside/center/none) |
| **Color** | `color.json` | `color.json` | 14 palettes × 13 tones + `white`/`black` (see §7.1) |
| **Elevation** | `elevation.json` | `elevation.json` | `x-offset`, `y-offset`, `blur`, `spread` scales + `shadow-opacity` |
| **Motion** | `motion.json` | `motion.json` | `duration` (instant → very-slow), `easing` (linear → bounce/spring), `delay` |
| **Opacity** | `opacity.json` | — (core only) | `transparent` → `opaque`, 11 stops |
| **Radius** | `radius.json` | `radius.json` | `none` → `3xl`, plus `full` (9999px pill) and `circle` (50%) |
| **Spacing** | `spacing.json` | `spacing.json` | `none` → `6xl` (0 → 128px) |
| **Typography** | `typography.json` | `typography.json` | `family`, `weight`, `size`, `lineheight`, `letterspacing`, `paragraphspacing` |

The README attributes the parameter list to source spreadsheets `Foundations_Base_Repo_DS_V1.xlsx` and `Components_Base_Repo_DS_V1.xlsx`, described as "the locked parameter list that defines every knob in this system."

### 6.1 Foundation-by-foundation notes

- **Border:** widths run `hairline 0.5px, xs 1px, sm 2px, md 3px, lg 4px, xl 6px, 2xl 8px`. Styles include legacy values (`groove`, `inset`) explicitly labelled "legacy." A `treatment` group encodes inside/outside/center border positioning as string tokens.
- **Elevation:** shadows are **decomposed into parts** (x-offset, y-offset, blur, spread, shadow-opacity) at core level; the semantic tier composes them into full shadow strings per role (card/popover/tooltip/drawer/dialog/modal).
- **Motion:** durations range `0ms → 1000ms`; easings include CSS keywords plus two custom cubic-beziers (`spring`, `bounce`). The semantic tier composes duration + easing + delay into named motions (`fade-in`, `slide-up`, `dialog-open`, etc.).
- **Opacity:** exists only at core level with no semantic aliasing file.
- **Radius:** includes special non-scalar stops `full` (9999px) and `circle` (50%).
- **Spacing:** a single 13-stop scale from `0px` to `128px`.
- **Typography:** the largest foundation — 4 families, 9 weights, 15 sizes (`2xs` 10px → `10xl` 144px), 7 line-heights, 5 letter-spacings, 6 paragraph-spacings.

---

## 7. Tokens

### 7.1 Core tier (raw primitives)

**Color** (`tokens/core/color.json`) is the largest core file. It defines **14 palettes**, each with a 13-step tone ladder (`0, 50, 100–900, 950, 1000`):

`brand`, `neutral`, `blue`, `green`, `yellow`, `orange`, `red`, `purple`, `cyan`, `teal`, `pink`, `brown`, plus single-tone `white.0` and `black.1000`.

- Brand base tone is `brand.500 = #2a52e0`.
- Neutral is a cool grey ramp (`#f8f9fa` → `#212529` → `#000000`).
- Non-brand hue palettes use Open-Color-style values (e.g. `blue.500 = #339af0`, `red.500 = #ff6b6b`).

Other core foundations (border, elevation, motion, opacity, radius, spacing, typography) are as summarised in §6.

### 7.2 Semantic tier (intent roles)

Semantic tokens alias core primitives into meaning-based roles. Examples from `tokens/semantic/color.json`:

- `color.primary.default → {color.brand.500}`, `.hover → {color.brand.600}`, `.active → {color.brand.700}`, `.subtle → {color.brand.50}`, `.on-primary → {color.white.0}`.
- `color.text.{primary,secondary,disabled,inverse,on-primary}` → neutral/white tones.
- `color.feedback.{success,warning,error,info}` (+ `-subtle` variants) → green/orange/red/blue palettes.
- `color.border.{default,subtle,strong,focus}`, `color.surface.*`, `color.background.*`, `color.link.*`, `color.disabled.*`, `color.overlay.default` (a literal `rgba(0,0,0,0.48)`).

Other semantic files:

- **`border.json`** → role widths/styles: `border.default` (1px solid), `subtle` (0.5px), `strong` (3px), plus `focus/success/warning/error` (2px).
- **`radius.json`** → `corner.*` roles mapping to core radii.
- **`spacing.json`** → `space.component.{padding-*,gap-*}` and `space.layout.{section-*,page}`.
- **`typography.json`** → composite text styles (`text.display`, `text.h1…h4`, `text.body-lg/md/sm`, `text.label`, `text.caption`, `text.code`), each bundling family/size/weight/lineheight/letterspacing.
- **`elevation.json`** → composed shadow strings per surface role.
- **`motion.json`** → composed motion presets.

### 7.3 Base tier (component parameters)

`tokens/base/base.json` is a **single consolidated file** described as "the organisation's one set of chosen values. Every component reads from this tier." Its top-level groups are:

- **`action`** — `primary`, `secondary`, `ghost`, `destructive` button parameter sets (bg, hover/active/disabled backgrounds, text, border, radius, per-size paddings, icon-gap, font family/size/weight, letter-spacing, transition duration/easing). `primary` is the most fully specified; `ghost` uses literal `transparent`.
- **`form.field`** — input parameters (backgrounds, border states incl. hover/focus/error/success, border/focus-ring widths, text/placeholder/label/helper colours, radius, paddings). Contains a literal value: `focus-ring-offset: 2px`.
- **`surface`** — `page`, `card`, `panel`, `overlay`.
- **`content`** — text roles + `link`/`link-hover`.
- **`feedback`** — success/warning/error/info (+ `-subtle`).
- **`focus`** — `ring-color`, `ring-width`, `ring-offset` (literal `2px`).

Base tokens alias into semantic tokens (e.g. `action.primary.bg → {color.primary.default}`), completing the three-hop chain `base → semantic → core`.

### 7.4 Reference integrity notes

- Base `action.destructive.bg-hover` references `{color.red.700}` and `action.destructive.text` references `{color.white.0}` — i.e. base occasionally references **core** palettes directly rather than always going through semantic.
- A small number of **literal values** are embedded in base/semantic rather than aliased: `focus.ring-offset`/`form.field.focus-ring-offset` (`2px`), `action.ghost.bg`/`.border` (`transparent`), `color.overlay.default` (`rgba(0,0,0,0.48)`).

---

## 8. Themes

### 8.1 Theming mechanism (as built)

Theming is achieved by **editing token values and rebuilding**, not by runtime theme switching. The README states:

> Changing a value in `tokens/base/base.json` (or its core/semantic dependencies) and re-running `npm run build` re-themes the entire system.

Because every component consumes `--ds-*` variables and every `--ds-*` variable resolves through the base→semantic→core chain, a change at any tier propagates to all components on rebuild. The single-brand model is explicit: "no brand values live here"; the repo carries one organisation-level value set.

### 8.2 What exists vs. what is planned

- **Present:** a single `:root` theme. All three generated CSS files emit into the `:root` selector (per the Style Dictionary config `options.selector: ':root'`).
- **Not present at this ref:** there is no dark-mode token set, no alternate theme file, no `[data-theme]`/class-scoped selector, and no multi-brand directory. The README describes brands as living in their own repositories and being "Generated in Phase 2," and references a "playbook" and future steps — these are not in the repository at the analysed ref.

### 8.3 Theme-adjacent affordances in components

Some components hint at future theming/state via **CSS variable fallbacks** — e.g. `badge.css` uses `var(--ds-status-success-bg, var(--ds-action-secondary-bg))`, and `modal.css` uses `var(--ds-overlay-scrim, rgba(0,0,0,0.5))`. These fallbacks reference variables that are not all emitted by the current token set, so they resolve to the fallback value.

---

## 9. Accessibility

Accessibility is handled at the **component HTML and CSS level** (there is no separate a11y tooling or token in the repo). Observed patterns:

### 9.1 Focus management

- Every interactive component defines a **`:focus-visible`** rule that draws a ring from tokens: `outline: var(--ds-focus-ring-width) solid var(--ds-focus-ring-color); outline-offset: var(--ds-focus-ring-offset);`. This appears in button, input, accordion, modal, card, and others.
- Components set `outline: none` on the base element and reintroduce the ring only on `:focus-visible`, so the ring is keyboard-oriented rather than shown on mouse click.
- The `focus` token group is documented as meeting "WCAG 3:1 against all surfaces" (`base.json` description on `focus.ring-color`).

### 9.2 Semantic HTML and ARIA

- **Accordion:** triggers are native `<button>` elements with `aria-expanded` and `aria-controls`; content regions use `role="region"` with `aria-labelledby` and toggle `aria-hidden`. Icons are marked `aria-hidden="true"`.
- **Modal:** container uses `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing at the title, and `tabindex="-1"`; the close button has `aria-label="Close modal"`; backdrops use `role="presentation"`. The demo text references closing via Escape.
- **Checkbox:** uses native `<input type="checkbox">` wrapped in `<label>`; groups use `<fieldset>`/`<legend>`; indeterminate state is set via JS (`.indeterminate = true`).
- **Switch:** native `<input type="checkbox" role="switch">`; standalone switches carry `aria-label`.
- **Disabled state:** button CSS targets both `:disabled` and `[aria-disabled="true"]`, sets `cursor: not-allowed` and `pointer-events: none`.

### 9.3 Motion and interaction

- Transitions are token-driven and scoped to specific properties. (No `prefers-reduced-motion` handling is present at this ref — recorded as an observation only.)
- Hit areas: buttons and inputs enforce `min-height` of 32/40/48px for sm/md/lg sizes.

### 9.4 Language and document structure

- Every demo HTML declares `<html lang="en">`, `<meta charset="UTF-8">`, and a responsive viewport meta tag.

---

## 10. CSS Architecture

### 10.1 Custom-property-driven ("headless")

The defining characteristic is that **component CSS contains no hardcoded design values** — colours, radii, spacing, typography, and motion all come from `var(--ds-*)`. Each component file carries a header comment stating this contract, e.g.:

> All values come from semantic/base CSS variables. No hardcoded colors, radii, or sizes.

### 10.2 Layered cascade

CSS is delivered in four layers loaded in order: `core.css` → `semantic.css` → `base.css` → `component.css`. The first three are generated; semantic/base emit `var()` references, so resolution walks back up the cascade at runtime.

### 10.3 Selector strategy

- Flat, low-specificity **BEM class selectors** (`.ds-block__element--modifier`); no ID selectors for styling, no deep descendant chains.
- State handled with **pseudo-classes** (`:hover:not(:disabled)`, `:active`, `:focus-visible`, `:disabled`) and **attribute selectors** (`[aria-expanded="true"]`, `[aria-disabled="true"]`, `[aria-hidden]`).
- Variant and size are **independent modifier classes** composed together.

### 10.4 Layout techniques

- Modern CSS: `inline-flex`/`flex`, CSS Grid (accordion uses `grid-template-rows: 0fr → 1fr` for open/close animation), `aspect-ratio`, `inset`, `calc()` (card size variants scale padding via `calc(... * 1.5)`).
- `box-sizing: border-box` set where inputs need it.

### 10.5 Consistency and exceptions

- Most components reuse a **shared set of variables** — notably `--ds-action-primary-*` (paddings, font sizes, radius, transition) are reused well beyond buttons (inputs, accordion, modal, card all reference `--ds-action-primary-padding-*` and `--ds-action-primary-radius`). This makes `action.primary` a de facto shared spacing/shape source.
- Several components embed **hardcoded fallbacks or literals** inside `var()` (e.g. `card.css`: `box-shadow: 0 4px 12px rgba(0,0,0,0.1)`; `modal.css`: `box-shadow: 0 8px 32px rgba(0,0,0,0.16)`; badge dot sizes in rem). These are exceptions to the "no hardcoded values" contract and are recorded here as observations.
- Some referenced variables (`--ds-surface-input`, `--ds-border-default-color`, `--ds-border-hover-color`, `--ds-status-success-bg`) are **not emitted by the current token set**; the CSS supplies fallbacks so they degrade gracefully.

---

## 11. HTML Architecture

### 11.1 Role of the HTML files

Each component's `<name>.html` is a **standalone demo / documentation page**, not a distributable template. It exists to render the component in isolation for visual verification.

### 11.2 Common page skeleton

Every demo follows the same shape:

1. `<!DOCTYPE html>` with `<html lang="en">`, charset, and viewport meta.
2. The four stylesheet links in cascade order (`../../build/css/{core,semantic,base}.css` then the local component CSS).
3. An inline `<style>` block for **page chrome only** (body background, demo section labels, headings) — these also reference `--ds-*` variables.
4. A `<body>` presenting the component across its variants, sizes, and states, typically grouped under `<h2>`/`.demo-label` section headers.

### 11.3 Markup semantics

- Interactive components use **native semantic elements** (`<button>`, `<input>`, `<label>`, `<fieldset>`/`<legend>`, `<h1>`/`<h2>`) plus ARIA where native semantics are insufficient (dialog, region, switch).
- Class usage matches the BEM structure defined in the component CSS.

### 11.4 Behaviour layer

- Where interaction is needed for the demo, a **minimal inline `<script>`** provides it (e.g. accordion single-open toggling by flipping `aria-expanded`/`aria-hidden`; checkbox indeterminate flag). The repository frames richer behaviour (single vs multi-open, focus trapping) as the **consumer's JavaScript responsibility**, outside the headless component.
- The relative asset path `../../build/css/...` means demos only render correctly after `npm run build` has generated the `build/` directory.

---

## 12. Build Process

### 12.1 Tooling

- **Style Dictionary v4** (`"style-dictionary": "^4.4.0"`) is the only runtime dependency. The project is ESM (`"type": "module"`).
- Scripts (`package.json`):
  - `build` → `node style-dictionary.config.js`
  - `build:watch` → `node --watch style-dictionary.config.js`
  - `test` → placeholder (`echo "No test suite configured yet" && exit 0`).

### 12.2 Configuration (`style-dictionary.config.js`)

- Instantiates `new StyleDictionary({...})` and calls `await sd.buildAllPlatforms()` at module top level.
- **Source globs** (order significant for override semantics): `tokens/core/**/*.json`, `tokens/semantic/**/*.json`, `tokens/base/**/*.json`.
- **Logging:** `verbosity: 'verbose'`, `warnings: 'warn'`.
- **Platform `css`:** `transformGroup: 'css'`, `prefix: 'ds'`, `buildPath: 'build/css/'`, emitting three files each filtered by source `filePath`:
  - `core.css` — core tokens, `selector: ':root'`, `outputReferences: false`.
  - `semantic.css` — semantic tokens, `:root`, `outputReferences: true`.
  - `base.css` — base tokens, `:root`, `outputReferences: true`.
- **Platform `json`:** `transformGroup: 'js'`, `buildPath: 'build/json/'`, emitting `tokens.json` via `format: 'json/nested'`.

### 12.3 Inputs and outputs

| | |
|---|---|
| **Inputs** | 8 core JSON files, 7 semantic JSON files, 1 base JSON file |
| **Outputs** | `build/css/core.css`, `build/css/semantic.css`, `build/css/base.css`, `build/json/tokens.json` |
| **Committed?** | No — `build/` is gitignored |

### 12.4 The re-theme loop

The end-to-end workflow is: **edit token JSON → `npm run build` → CSS variables regenerate → all components reflect the change** (because they only reference variables). No component files are touched to re-theme.

### 12.5 What the build does not include (at this ref)

- No linting, token validation, contrast checking, or visual regression steps (README notes a contrast-check CI gate is "TBD Step 7").
- No bundling, minification, or publish/packaging step.
- No transform for platforms other than CSS and nested JSON (e.g. no iOS/Android/Figma exports in the config).

---

## 13. Summary of Key Facts

- **Type:** Headless, token-driven design system; code is the single source of truth.
- **Tokens:** DTCG-format JSON in a strict three-tier cascade (core → semantic → base), 16 token files total.
- **Color system:** 14 palettes × 13 tones; brand base `#2a52e0`.
- **Foundations:** border, color, elevation, motion, opacity, radius, spacing, typography.
- **Build:** Style Dictionary v4 compiles tokens to three layered `:root` CSS files (`outputReferences` on for semantic/base) plus a nested JSON export; `build/` is not committed.
- **Components:** 30, each a `.css` + `.html` pair; CSS is BEM-namespaced (`ds-`), consumes only `--ds-*` variables, and manages state via pseudo-classes and ARIA attributes.
- **Accessibility:** token-driven `:focus-visible` rings, native semantic elements, ARIA on composite widgets, `min-height` hit targets.
- **Theming:** single `:root` brand, re-themed by editing tokens and rebuilding; multi-brand and dark mode are described as future phases and are not present at this ref.
- **Notable exceptions observed (not recommendations):** a `ds-btn` vs `ds-button` class mismatch in `modal.html`; some hardcoded shadow/rgba literals and rem sizes in component CSS; several referenced CSS variables not emitted by the current token set (guarded by fallbacks); `opacity` present in core only.
