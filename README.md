# Base BNTS Design System

The **one** base design system for Bounteous. Every brand is generated from this repo — no brand values live here.

## What this repo is

| What | Where |
|------|-------|
| **Core tokens** — raw primitives (actual hex values, px sizes) | `tokens/core/` |
| **Semantic tokens** — intent roles aliasing to core | `tokens/semantic/` |
| **Base tokens** — org's real chosen values for every parameter | `tokens/base/` |
| **Headless components** — read only semantic/base CSS vars | `components/` |
| **Built CSS** — generated, do not edit | `build/` (gitignored) |

## Three-tier token structure

```
core          →  semantic          →  base
─────────────    ─────────────────    ─────────────────────────
#2a52e0          color.primary        action.primary.bg
1px              border.default       form.field.border-width
8px              corner.default       action.primary.radius
```

**Core** holds raw values. **Semantic** maps intent (what something *is*) to core. **Base** maps component roles (what something *does*) to semantic — these are the values components consume.

## Quick start

```bash
npm install
npm run build        # generates build/css/{core,semantic,base}.css and build/json/tokens.json
```

## Using the tokens in a component

```html
<!-- Load all three CSS layers -->
<link rel="stylesheet" href="build/css/core.css">
<link rel="stylesheet" href="build/css/semantic.css">
<link rel="stylesheet" href="build/css/base.css">
```

```css
/* Your component — no hardcoded values */
.my-button {
  background: var(--ds-action-primary-bg);
  color: var(--ds-action-primary-text);
  border-radius: var(--ds-action-primary-radius);
  padding: var(--ds-action-primary-padding-y-md) var(--ds-action-primary-padding-x-md);
}
```

Changing a value in `tokens/base/base.json` (or its core/semantic dependencies) and re-running `npm run build` re-themes the entire system.

## Token foundations

| Foundation | File(s) |
|---|---|
| Border (widths, styles, treatments) | `tokens/core/border.json`, `tokens/semantic/border.json` |
| Color (14 palettes × 13 tones, semantic roles) | `tokens/core/color.json`, `tokens/semantic/color.json` |
| Elevation (shadow offsets, blur, spread, opacity) | `tokens/core/elevation.json`, `tokens/semantic/elevation.json` |
| Motion (duration, easing, delay) | `tokens/core/motion.json`, `tokens/semantic/motion.json` |
| Opacity | `tokens/core/opacity.json` |
| Radius | `tokens/core/radius.json`, `tokens/semantic/radius.json` |
| Spacing (scale, padding, margin, gap, inset) | `tokens/core/spacing.json`, `tokens/semantic/spacing.json` |
| Typography (family, weight, size, line-height, tracking) | `tokens/core/typography.json`, `tokens/semantic/typography.json` |

## Components

| Component | Status |
|---|---|
| Button (primary, secondary, ghost, destructive × SM/MD/LG + icon-only) | ✅ |
| More components — see playbook Step 5 | Planned |

## Brand generator + AI doorway (Playbook Step 9)

`mcp-server/` hosts two things, live in this repo:

- **The AI doorway** — an MCP server exposing this repo's base tokens, component
  manifests, and Figma-mapping rules to any MCP-capable AI tool.
- **The brand generator** — tools on that same server that turn an *approved* mapping of
  a designer's Figma styles into a new, standalone brand design system, scaffolded into
  `generated-brands/<slug>/` (gitignored — brands belong in their own repo, not this one).

See `mcp-server/README.md` for setup, the tool list, and the design decision on what
actually changes per brand (core tier values only — components and semantic/base tiers
are copied unchanged). Run `cd mcp-server && npm install && npm test` for an end-to-end
smoke test against a sample Figma extract.

## Governance

- **Code is canonical.** Figma reads from it, not the other way around.
- **Base changes need PR + review.** No direct commits to `main`.
- **Brands live in their own repos.** Generated in Phase 2. Never edit the base.
- A bad contrast value should fail CI before it ships (CI config: TBD Step 7).

## Foundations source

Derived from `Foundations_Base_Repo_DS_V1.xlsx` and `Components_Base_Repo_DS_V1.xlsx` — the locked parameter list that defines every knob in this system.
