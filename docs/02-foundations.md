# 02 — Foundations Audit

> **Repository:** [`adityasivakumar-DS/Base-BNTS-DS`](https://github.com/adityasivakumar-DS/Base-BNTS-DS) · **ref:** `a6f9102`
> **Scope:** An evaluative audit of the design-token **foundations** only. Each foundation is analysed, its strengths and weaknesses identified, and rated. **Components are explicitly out of scope** — this document never evaluates component CSS/HTML, only the token tiers and foundations they consume.
> **Prior context:** See `01-repository-analysis.md` for the neutral, as-built description. This document is the judgement layer on top of it.

---

## 1. Method & rating scale

Each foundation is assessed on four axes and given a single consolidated score:

- **Completeness** — does the scale/coverage span the range real products need?
- **Consistency** — internal regularity (naming, steps, structure, DTCG conformance).
- **Wiring** — is it correctly aliased through the tiers and actually usable in the generated CSS?
- **Accessibility fitness** — does the foundation support (or obstruct) accessible outcomes?

**Rating scale (1–5):**

| Score | Meaning |
|---|---|
| **5** | Excellent — comprehensive, consistent, production-ready |
| **4** | Strong — minor gaps only |
| **3** | Adequate — usable but with notable gaps |
| **2** | Weak — significant gaps or defects |
| **1** | Absent / placeholder only |

All colour-contrast figures below are computed from the raw token hex values using the WCAG 2.x relative-luminance formula.

---

## 2. Scorecard summary

| # | Foundation | Rating | One-line verdict |
|---|---|:---:|---|
| 3.1 | **Core Tokens** | ★ 4.5 / 5 | Comprehensive, DTCG-conformant primitive layer; a little redundancy and one orphaned scale. |
| 3.2 | **Semantic Tokens** | ★ 4.0 / 5 | Strong role vocabulary; a few literals and one missing aliasing file. |
| 3.3 | **Brand Tokens** | ★ 3.5 / 5 | Clean 13-step brand ramp and primary/secondary roles; single-brand, and mid-tones are contrast-risky. |
| 4.1 | **Typography** | ★ 4.0 / 5 | Rich scale and composite text roles; font families are placeholders and type is non-fluid. |
| 4.2 | **Spacing** | ★ 4.5 / 5 | Clean, regular scale with a sensible component/layout semantic split. |
| 4.3 | **Radius** | ★ 4.5 / 5 | Full range including pill/circle; cleanly aliased to `corner.*` roles. |
| 4.4 | **Borders** | ★ 3.5 / 5 | Good width/style scales; `treatment` tokens aren't CSS-actionable and legacy styles linger. |
| 4.5 | **Elevation** | ★ 3.0 / 5 | Well-decomposed, but composed shadows carry **no colour** and `shadow-opacity` is orphaned. |
| 4.6 | **Motion** | ★ 4.0 / 5 | Comprehensive durations/easings/delays and composed presets; no reduced-motion provision. |
| 5.1 | **Light Mode** | ★ 4.0 / 5 | Works as the single `:root` theme; not explicitly namespaced as "light". |
| 5.2 | **Dark Mode** | ★ 1.0 / 5 | Absent — no dark token set, selector, or scaffolding. |
| 6 | **Responsive Behaviour** | ★ 1.5 / 5 | No breakpoint, container, or fluid/`clamp()` tokens; foundations are static. |
| 7 | **Accessibility** | ★ 3.0 / 5 | Excellent focus tokens and stated WCAG intent; feedback mid-tones and missing modes pull it down. |
| | **Overall** | **★ 3.5 / 5** | A well-architected primitive+semantic system with clear gaps in modes, responsiveness, and a few wiring defects. |

---

## 3. Token tiers

### 3.1 Core Tokens — ★ 4.5 / 5

The primitive layer (`tokens/core/`) is the strongest part of the system.

**Strengths**
- **DTCG-conformant.** Every leaf carries `$value` + `$type`, most carry `$description`, and files declare the `tr.designtokens.org` schema. This makes the layer portable and tool-readable.
- **Comprehensive coverage.** Eight foundations, each with a well-populated scale (14 colour palettes × 13 tones; 15 type sizes; 13 spacing stops; etc.).
- **Regular, predictable scales.** T-shirt sizing (`2xs…3xl`) and the fixed colour ladder (`0,50,100…950,1000`) are applied uniformly, so a consumer can predict a token name without looking it up.
- **References nothing.** Core is a true primitive root — no aliases, no cycles.

**Weaknesses**
- **`opacity` is orphaned** — it exists only in core with no semantic counterpart and no role that consumes it, so it never surfaces as a usable semantic/base variable.
- **Redundancy in the colour ladder.** Every one of the 12 full palettes repeats `0 = #ffffff` and `1000 = #000000`, duplicating the dedicated `white`/`black` palettes and inflating the token count with values that carry no palette-specific meaning.
- **Legacy carry-over.** `border.style` includes `groove`/`inset`, self-labelled "legacy," which dilutes an otherwise curated set.

### 3.2 Semantic Tokens — ★ 4.0 / 5

The intent layer (`tokens/semantic/`) maps primitives to roles.

**Strengths**
- **Genuine role renaming**, not a mirror of core: `radius.* → corner.*`, `spacing.* → space.{component,layout}.*`, `font.* → text.*`. This is the hallmark of a mature semantic layer — consumers reason in intent, not primitives.
- **Good role breadth** for colour (primary/secondary/surface/background/text/border/feedback/link/disabled/overlay) and typography (display, h1–h4, body, label, caption, code).
- **Composition happens here**, appropriately — elevation and motion assemble multi-part primitives into ready-to-use role values.

**Weaknesses**
- **Literal leakage.** A handful of semantic values are hardcoded rather than aliased — most notably `color.overlay.default = rgba(0,0,0,0.48)`, which bypasses the colour/opacity primitives it should compose from.
- **Missing aliasing file.** There is no `semantic/opacity.json`, so opacity has no intent layer at all (mirrors the core gap in 3.1).
- **Uneven tier discipline** at the boundary (see 3.3 / base): some downstream references skip semantic and reach into core directly.

### 3.3 Brand Tokens — ★ 3.5 / 5

"Brand" here = the `color.brand.*` core palette plus the semantic `color.primary.*` / `color.secondary.*` roles that alias it. There is no separate brand tier — by design, per the README, real brand values are generated into downstream repos.

**Strengths**
- **A complete 13-step brand ramp** (`brand.0…1000`, base `#2a52e0`) gives themers a full tonal range to remap.
- **Primary/secondary roles are properly derived** from the ramp (`primary.default → brand.500`, `hover → 600`, `active → 700`, `subtle → 50`; `secondary → brand.100/200/300`), so a single ramp swap re-themes both.
- **Primary-on-white passes AA:** `brand.500 #2a52e0` vs `#ffffff` ≈ **6.2:1** (passes normal-text AA and large-text AAA).

**Weaknesses**
- **Single brand only.** There is no multi-brand scaffolding, no brand-token namespace, and no mechanism in-repo to hold more than one brand — consistent with the stated "brands live elsewhere" model, but it means the foundation itself offers no brand switching.
- **Secondary role leans on very light tints** (`brand.100 #dde8ff`), which constrain usable text pairings on top of secondary surfaces.
- **Brand vs. neutral overlap risk:** `brand.50 #f0f4ff` and `neutral.50 #f8f9fa` are near-indistinguishable, so "primary subtle" and a plain surface can read as the same colour.

---

## 4. Per-foundation audit

### 4.1 Typography — ★ 4.0 / 5

**Strengths**
- **Deep, well-labelled scale:** 15 sizes (`2xs` 10px → `10xl` 144px), 9 weights (100–900), 7 line-heights, 5 letter-spacings, 6 paragraph-spacings.
- **Composite semantic roles** (`text.h1`, `text.body-md`, `text.label`, `text.code`, …) bundle family+size+weight+lineheight+letterspacing — a themer sets a heading style in one place.
- **Sensible role-to-primitive choices** (display uses tightest tracking + tight line-height; body uses `relaxed` 1.5; labels use `wide` tracking).

**Weaknesses**
- **Placeholder font families.** `family.primary`, `secondary`, and `display` all resolve to **Inter**; only `monospace` differs. The family axis exists but carries no real typographic differentiation.
- **`paragraphspacing` is unused** by any semantic `text.*` role — it's defined but never surfaces through the intent layer.
- **No responsive/fluid type.** Sizes are fixed px; there is no `clamp()`-based or breakpoint-scaled type role (see §6).
- **`lineheight` typed as `number`** (unitless) is correct, but sizes are px rather than rem, which fixes type to a non-scaling absolute unit.

### 4.2 Spacing — ★ 4.5 / 5

**Strengths**
- **One clean geometric-ish scale**, `none` (0) → `6xl` (128px), 13 stops, no gaps or oddities.
- **Purpose-split semantic layer:** `space.component.{padding,gap}` for inside-component rhythm and `space.layout.{section,page}` for page rhythm — a clear separation of concerns.
- **Predictable mapping** (component `padding-md → spacing.md`, `gap-xs → spacing.2xs`), so the semantic names are self-documenting.

**Weaknesses**
- **Layout scale is thin:** only four layout roles (`section-sm/md/lg`, `page`), all mapping into the same primitive scale — limited vocabulary for complex page composition.
- **No negative or fractional spacing** roles (e.g. for overlap or optical alignment), so those cases fall back to ad-hoc values.

### 4.3 Radius — ★ 4.5 / 5

**Strengths**
- **Full range** `none → 3xl` plus the two special cases that matter — `full` (9999px pill) and `circle` (50%).
- **Clean semantic remap to `corner.*`** with intent labels (`subtle` for inputs, `default` for most UI, `lg` for cards, `xl` for modals, `pill`, `circle`).
- **No wiring defects** — every `corner.*` role resolves to a real primitive.

**Weaknesses**
- **Minor naming asymmetry:** core uses `2xs…3xl` while the semantic layer uses descriptive names (`sharp/subtle/default/lg/xl/pill/circle`) — a small cognitive hop between tiers.
- No per-corner tokens (top-left vs. bottom-right); only uniform radii are expressible at the token level.

### 4.4 Borders — ★ 3.5 / 5

**Strengths**
- **Sensible width ladder** (`hairline 0.5px → 2xl 8px`) and a semantic role set (`default/subtle/strong/focus` + `success/warning/error`) that pairs width with style.
- **Focus width promoted to a role** (`border.focus = 2px`), reinforcing the accessibility story.

**Weaknesses**
- **`treatment` (inside/outside/center) is not CSS-actionable.** These are Figma/design-tool concepts with no direct CSS property; as tokens they can't drive the generated CSS meaningfully.
- **Legacy styles** (`groove`, `inset`) are included despite being self-labelled legacy.
- **Semantic border roles pair width+style but not colour** — colour lives in `color.border.*`, so a "border" is only fully specified by combining two separate semantic branches, which is easy to get partially wrong.

### 4.5 Elevation — ★ 3.0 / 5

The most defect-prone foundation.

**Strengths**
- **Correct decomposition** at core: `x-offset`, `y-offset`, `blur`, `spread`, and `shadow-opacity` as independent scales.
- **Role-based composition** at semantic: `card`, `popover`, `tooltip`, `drawer`, `dialog`, `modal`, plus a `surface = none` base.
- Offsets/blur/spread escalate sensibly with elevation height.

**Weaknesses**
- **Composed shadows have no colour.** Each semantic shadow is `"{x-offset} {y-offset} {blur} {spread}"` — e.g. card = `1px 2px 8px 0px`. A CSS `box-shadow` needs a colour component; without one the value is incomplete and renders inconsistently (browser default / `currentColor`) rather than a controlled tint.
- **`shadow-opacity` is orphaned.** It's defined as a full scale but never referenced by the composed shadows, so the intended soft, low-opacity shadow tint is not actually wired in.
- **Consequence:** the elevation foundation cannot, as authored, produce the subtle shadows its descriptions promise without a colour/opacity token being added into the composition.

### 4.6 Motion — ★ 4.0 / 5

**Strengths**
- **Complete primitive set:** durations (`0 → 1000ms`), easings (CSS keywords + custom `spring`/`bounce` cubic-beziers), delays.
- **Composed semantic presets** (`fade-in/out`, `slide-up`, `scale-in`, `dialog-open`, `drawer-open`, `tooltip-reveal`) bundle duration+easing+delay per interaction — ready to consume.
- Preset choices are considered (entrances use `ease-out`, exits `ease-in`, tooltip is instant + short delay).

**Weaknesses**
- **No reduced-motion provision at the token level** — nothing expresses a "motion off / minimal" variant, so honouring `prefers-reduced-motion` is pushed entirely downstream (see §7).
- **Easings typed `cubicBezier`** even when the value is a CSS keyword (`linear`, `ease`) — a minor type-vs-value mismatch.

---

## 5. Modes

### 5.1 Light Mode — ★ 4.0 / 5

**Strengths**
- A **coherent light theme exists** and is the system's default: neutral surfaces (`surface.default → neutral.0`, `background.default → neutral.50`) with dark text (`text.primary → neutral.900`) yield high body-text contrast (~15:1).
- All generated variables land in `:root`, so light mode is globally available with no opt-in.

**Weaknesses**
- **Light mode is implicit, not named.** There is no `light` token set or `[data-theme="light"]`/`.theme-light` scope — the theme is simply "whatever `:root` holds." That leaves no symmetrical structure for a second mode to slot into.
- Some light-mode surface tones are very close (`neutral.0` vs `neutral.50` vs brand `50`), reducing surface separation (see 3.3).

### 5.2 Dark Mode — ★ 1.0 / 5

**Strengths**
- The **raw material exists** — full tonal ramps (0→1000) for every palette mean a dark theme *could* be derived without new primitives. Inverse hints are present (`text.inverse`, `surface.inverse → neutral.900`).

**Weaknesses**
- **No dark mode is implemented.** There is no dark token file, no `prefers-color-scheme` handling, no `[data-theme="dark"]` selector, and no dark role overrides. The `inverse` tokens are isolated values, not a mode.
- Because the build emits a single `:root` block, there is currently **no structural seam** for a mode to be layered in.
- **Rating reflects near-total absence**, offset only slightly by the primitives being dark-ready.

---

## 6. Responsive Behaviour — ★ 1.5 / 5

**Strengths**
- Spacing and type scales are **broad enough** that a downstream responsive strategy could select different stops per breakpoint.

**Weaknesses**
- **No breakpoint tokens** — there is no `breakpoint.*` foundation defining sm/md/lg/xl viewport widths.
- **No container/query tokens** and **no fluid tokens** — nothing uses `clamp()`, `min()`, `max()`, or viewport units, so no value scales with the viewport at the token level.
- **Fixed absolute units.** Type sizes and spacing are px, which do not respond to root-font-size or user zoom preferences the way `rem` would.
- **Net:** responsiveness is entirely deferred to whatever consumes the tokens; the foundation layer contributes nothing to it. The 1.5 (rather than 1.0) credits only the latent flexibility of the scales.

---

## 7. Accessibility — ★ 3.0 / 5

Assessed at the foundation level (colour values, focus tokens, motion tokens); component usage is out of scope.

**Strengths**
- **Focus is a first-class foundation.** `focus.ring-color/width/offset` and `border.focus` exist as dedicated roles, and the ring colour is documented as meeting **WCAG 3:1 against all surfaces**.
- **Body-text contrast is excellent** in the default (light) palette: `text.primary neutral.900` on `surface.default neutral.0` ≈ **15:1**; `text.secondary neutral.700` on white ≈ **8:1** — both clear AA/AAA.
- **Primary brand passes** as text/fill on white (`brand.500` ≈ 6.2:1).
- **Tonal ramps enable accessible pairing** — the presence of 900/950 tones means dark-on-light and light-on-dark pairs are derivable.

**Weaknesses**
- **Feedback mid-tones are contrast-risky as fills behind white.** The `500`-level feedback colours are light, so white text over them fails AA:
  - `feedback.error red.500 #ff6b6b` + white ≈ **2.8:1** ✗
  - `feedback.info blue.500 #339af0` + white ≈ **3.0:1** ✗ (borderline large-text only)
  - `feedback.success green.500 #51cf66` + white ≈ **2.0:1** ✗
  - `feedback.warning orange.500 #ff922b` + white ≈ ~2.3:1 ✗
  The `-subtle` (50-level) variants are correctly intended for tinted backgrounds with dark text and do pass — but the base 500 feedback tones are not safe as solid fills for light text.
- **No reduced-motion token** — the motion foundation offers no accessible fallback for vestibular sensitivity (see 4.6).
- **Disabled semantics are colour-only** at the token level (`disabled.text/surface/border` are all low-contrast neutrals), providing no non-colour signal.
- **`opacity` unavailable as a role** means accessible dimming/disabled treatments can't be expressed via a semantic opacity token.

---

## 8. Consolidated strengths & weaknesses

### Top strengths
1. **Rigorous three-tier architecture** with genuine intent renaming — the core and semantic layers are textbook.
2. **DTCG conformance** throughout, making the foundations portable and machine-readable.
3. **Broad, regular scales** for colour, type, spacing, and radius.
4. **Focus and body-text accessibility** are strong by construction.
5. **Elevation and motion are correctly decomposed** into composable primitives.

### Top weaknesses
1. **No dark mode and no theming seam** — the single `:root` output has no structure for a second mode.
2. **No responsive foundation** — no breakpoints, no fluid/`clamp()` tokens, px-based units.
3. **Elevation is functionally incomplete** — composed shadows lack colour and `shadow-opacity` is orphaned.
4. **Feedback 500-tones fail contrast** as fills behind light text.
5. **`opacity` foundation is orphaned** (no semantic layer, no consumers).
6. **Placeholder typography families** — the family axis carries no real differentiation.
7. **Minor tier-purity leaks** — literal values in the semantic layer and `treatment` tokens that CSS can't act on.

---

## 9. Overall rating — ★ 3.5 / 5

Base BNTS DS has a **genuinely strong primitive and semantic core** — the architecture, DTCG conformance, and scale design are excellent and would rate 4.5–5 on their own. The overall score is pulled to **3.5** by foundation-level gaps that matter for real products: the **absence of dark mode and any responsive/theming seam**, an **elevation foundation that can't render controlled shadows as authored**, **contrast-unsafe feedback mid-tones**, and an **orphaned opacity scale**. None of these are architectural flaws — they are missing or half-wired pieces on an otherwise sound base.
