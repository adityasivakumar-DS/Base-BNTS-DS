# 04 — Gap Analysis: Repository vs. Enterprise Design System Builder

> **Repository:** [`adityasivakumar-DS/Base-BNTS-DS`](https://github.com/adityasivakumar-DS/Base-BNTS-DS) · **ref:** `a6f9102`
> **Question this document answers:** What must exist for an enterprise, AI-powered **Design System Builder** to sit on top of this repository — and what is missing today?
> **Related:** `01-repository-analysis.md`, `02-foundations.md`, `03-components.md`.
> **This is analysis only. Nothing is implemented here** — no manifests, schemas, or code are written; each gap is described, justified, and prioritised.

---

## 1. Framing

### 1.1 What the Builder must be able to do

Per the project brief, the Builder must let users: import the headless design system; browse foundations and components; edit core / semantic / brand tokens; edit component properties; generate themes; preview components live; generate **multiple** design systems; and export to **GitHub, Figma, CSS variables, design tokens, and documentation**.

### 1.2 What the repository is today

A **hand-authored, human-readable headless library**:

- A three-tier DTCG token graph (`tokens/core|semantic|base`) compiled by Style Dictionary into layered CSS custom properties and one `build/json/tokens.json`.
- 32 components, each a `<name>.css` + `<name>.html` pair. Design decisions are encoded in **BEM class names** (variants = `--modifier`), **pseudo/attribute selectors** (states), **BEM `__elements`** (slots), and **`var(--ds-*)` references** (token bindings).

### 1.3 The central gap

**There is no machine-readable contract layer.** Everything the Builder needs — *what* components exist, their properties, variants, states, slots, which tokens they bind, how to render them, how to validate an edit, how to export — is currently **implicit in CSS/HTML and must be inferred by parsing source files**. Parsing is brittle (e.g. the `ds-btn` vs `ds-button` mismatch, un-emitted tokens guarded by silent fallbacks, hardcoded literals) and lossy (intent, constraints, and relationships aren't recoverable from CSS at all).

An enterprise Builder needs these facts as **explicit, typed, versioned, machine-readable artifacts** that are the source of truth for its UI, its validation, its preview engine, and its exporters. That artifact layer is the bulk of what is missing.

### 1.4 What already exists and is reusable (the substrate)

To be fair, the repo is a strong *input*:

| Asset | Value to the Builder |
|---|---|
| 3-tier DTCG token JSON | Direct source for token-editing UIs and theme generation (needs a schema/binding layer on top). |
| `build/json/tokens.json` | A machine-readable token snapshot (values only; no editor metadata). |
| Consistent `ds-` BEM naming | Enables *some* automated extraction of variants/slots. |
| Per-component demo HTML | Seed markup for a preview harness and for inferring slots/states. |
| Style Dictionary pipeline | A working transform engine to extend for new export targets. |
| Focus tokens + ARIA in demos | Partial basis for accessibility contracts. |

None of these *is* the product model — they are raw material the model must be built from.

---

## 2. Gap catalog

Each gap: **what it is → current state in repo → why the Builder needs it → priority.** Priorities are defined in §4.

### A. Machine-readable model

#### A1. Component Manifest — **P0**
- **What:** A single index of every component: id, name, source files, entry points, category, dependencies, version, status.
- **Current:** None. The set of components is only discoverable by listing `components/*/`. No index file, no `components.json`.
- **Why:** The Builder's "Browse Components" and "Import" flows need one authoritative, ordered, deduplicated list with pointers to each component's assets. Filesystem scanning is not a contract.

#### A2. Component Metadata — **P0**
- **What:** Per-component descriptor — id, display name, description, category/taxonomy, tags, status/maturity, version, thumbnail, keywords.
- **Current:** None. Only the folder name and an incomplete README table (marks Button ✅, everything else "Planned," while 32 exist on disk).
- **Why:** Drives catalog cards, search, filtering, grouping, and the detail view. Without it the Builder has nothing to show but a raw folder name.

#### A3. Foundation Manifest — **P0**
- **What:** Machine-readable description of each foundation (color, typography, spacing, radius, border, elevation, motion, opacity): its token groups, scale structure, units, editable ranges, and UI hints (e.g. "color → swatch/picker", "spacing → px slider").
- **Current:** `tokens.json` holds *values* only; there is no description of foundation structure or edit affordances. `opacity` has no semantic layer at all.
- **Why:** Powers "Browse Foundations" and the token editors. The Builder must know that `spacing` is an ordered px scale, `color.brand` is a 13-step ramp, etc., to render the right controls.

#### A4. Token Schema & Binding Map — **P0**
- **What:** (a) A schema over the tokens defining type, unit, allowed values/ranges, and the reference graph (core→semantic→base). (b) A **binding map** linking each component property to the token(s) / CSS variables it consumes.
- **Current:** DTCG `$type` exists, but no editor-oriented schema (ranges/units/enum), and **no binding map** — the token↔component relationship lives only inside `var(--ds-*)` references in CSS. Several referenced variables aren't even emitted (`--ds-border-default-color`, `--ds-status-*`, …).
- **Why:** Editing a token must (1) be validated and (2) update the correct live previews. Both require knowing the graph and which components a token affects. This is the connective tissue between "Edit Tokens" and "Preview Live."

#### A5. Import Contract (ingestion spec) — **P0**
- **What:** A defined shape the Builder ingests: how it reads this repo (or any conforming headless DS) into its internal model — manifest locations, token entry points, versioning, integrity checks.
- **Current:** None. "Import the headless design system" has no defined interface; it would today mean bespoke parsing of this specific repo layout.
- **Why:** "Import the Headless Design System" is the Builder's first user action and the precondition for everything else. It also enables importing *other* conforming systems later.

### B. Component contracts

#### B1. Variant Definitions — **P1**
- **What:** Enumerated variants per component with their class mapping, human labels, defaults, and mutual-exclusivity groups (e.g. button variant vs. size are orthogonal).
- **Current:** Implicit in `--modifier` classes (e.g. `ds-button--primary|secondary|ghost|destructive`, sizes `--sm|md|lg`). Recoverable by CSS parsing but not declared, labelled, or grouped.
- **Why:** The property panel must present variants as typed, mutually-exclusive choices, and the preview must combine them correctly.

#### B2. State Definitions — **P1**
- **What:** Enumerated states (default/hover/active/focus-visible/disabled/checked/indeterminate/expanded/error/…) with how each is triggered and previewed.
- **Current:** Implicit in pseudo-classes and attribute selectors. No declaration of which states a component supports or how to force them for preview.
- **Why:** "Preview Components Live" must render each state on demand (a Builder can't hover for the user). Needs an explicit, forceable state list.

#### B3. Slot Definitions — **P1**
- **What:** Named content insertion points, allowed content types, required/optional, defaults.
- **Current:** Implicit in BEM `__element` structure (`ds-card__title`, `ds-modal__footer`, …). No declared slot model or content rules.
- **Why:** The Builder must let users place/edit content and must know where icons, text, media, and actions go — and what's valid in each.

#### B4. Property Schema — **P0**
- **What:** The typed, editable property set per component: name, type (enum/boolean/text/number/token-ref/color), default, options, constraints, and mapping to variant/state/slot/token.
- **Current:** None. Properties are only expressible as raw class combinations and content. There is no notion of a "prop" the Builder can render an editor for.
- **Why:** "Edit Component Properties" is impossible without it — this schema *is* what the property editor renders. (Elevated to P0 because it is the backbone of the component-editing capability, alongside A2/A4.)

#### B5. Accessibility Contracts — **P2**
- **What:** Per-component required roles, ARIA attributes, keyboard interaction model, focus behaviour, and contrast/WCAG assertions that can be *tested*.
- **Current:** Good *patterns* in demos (dialog/region/switch roles, `:focus-visible` rings) but no declared contract; gaps already found (table `th` lacks `scope`/`aria-sort`; tabs lacks arrow-key roving; input/textarea error states lack `aria-invalid`).
- **Why:** Enterprise DS must guarantee accessibility across generated themes/brands; the Builder should block edits that break contrast or strip required ARIA. Needs machine-checkable rules.

#### B6. Interaction Contracts — **P2**
- **What:** Expected behaviours, events, and state machines (open/close, select, dismiss, focus-trap, roving tabindex) — independent of framework.
- **Current:** Headless = CSS only; only accordion and tabs ship demo JS. Real behaviour is explicitly "the consumer's responsibility."
- **Why:** Live preview of interactive components, and any generated app code, need a defined behavioural contract — otherwise the Builder can only preview static states.

#### B7. Component Relationships — **P2**
- **What:** A composition/dependency graph: which components contain or depend on others, alternatives, and grouping.
- **Current:** Implicit and only found by reading CSS (e.g. `product-card` composes `ds-rating` + `ds-product-price`; many components share `--ds-action-primary-*`).
- **Why:** Import ordering, impact analysis, "used by / uses" navigation, and correct export bundling all need the graph.

### C. Theming & multi-brand

#### C1. Theme / Brand Model (multi-theme structure) — **P0**
- **What:** A structure for multiple named themes/brands: a theme manifest, per-brand token overrides, mode scoping, and a way to hold >1 value set.
- **Current:** A single `:root` theme; "no brand values live here"; brands are described as living in separate repos, generated in a future phase. There is no in-model concept of "a theme" or "a brand."
- **Why:** "Edit Brand Tokens," "Generate Themes," and "Generate **Multiple** Design Systems" cannot exist without a first-class multi-theme model. This is the biggest single capability gap.

#### C2. Mode Definitions (light/dark/high-contrast) — **P2**
- **What:** Declared modes with token overrides and a selector strategy.
- **Current:** Light only, implicit in `:root`; no dark mode, no `prefers-color-scheme`, no `[data-theme]` seam (see `02-foundations.md`).
- **Why:** Enterprise themes are expected to ship modes; the Builder needs a place to author and preview them.

### D. Validation & governance

#### D1. Validation Rules — **P1**
- **What:** Constraints enforced on edits: token ranges/units, required token presence, reference integrity (no dangling `var(--ds-*)`), contrast gates, property value validation, theme completeness.
- **Current:** None. README notes a contrast CI gate is "TBD Step 7." Un-emitted-token references currently pass silently.
- **Why:** An enterprise Builder must prevent invalid or inaccessible output. Validation is what makes token/brand editing safe.

#### D2. Versioning & Change Management — **P3**
- **What:** Semver per component/token set, changelogs, migration/deprecation metadata.
- **Current:** Repo-level `package.json` version only; no per-artifact versioning or change tracking.
- **Why:** Multiple generated design systems must track which base version they derive from and migrate on updates.

### E. Preview & runtime

#### E1. Preview / Render Harness Contract — **P1**
- **What:** A defined way to render any component in isolation with a chosen theme, variant, state, and slot content — including required CSS layers, sandboxing, and how states are forced.
- **Current:** Demo HTML pages exist but hardwire relative paths (`../../build/css/...`) and require `npm run build` first; they are not an isolated, parameterised render target.
- **Why:** "Preview Components Live" needs a reliable, theme-parameterised harness, not per-component demo pages.

#### E2. Icon Registry — **P2**
- **What:** A managed icon set with ids/metadata, decoupled from component markup.
- **Current:** Icons are inline SVGs hardcoded in demos (some with baked fills like `stroke="white"`, `#666`) that won't re-theme.
- **Why:** Components with icon slots need a themable, selectable icon source in the Builder.

#### E3. Behaviour / Framework Binding Layer — **P3**
- **What:** Optional JS behaviours or framework adapters (React/Web Components) implementing the interaction contracts.
- **Current:** None beyond two demo scripts.
- **Why:** Needed for interactive live preview and for any code the Builder generates for consumers.

### F. Export & interop

#### F1. Export Rules / Profiles — **P1 (CSS + tokens) / P2 (Figma, GitHub, docs)**
- **What:** Declared export profiles: CSS variables, design tokens (DTCG/other), Figma (variables + Code Connect), GitHub (repo/PR shape), and documentation — each with naming, format, and transform rules.
- **Current:** Style Dictionary emits only layered CSS + one nested JSON. No Figma, GitHub, or docs export config; `build/` is gitignored.
- **Why:** Five of the Builder's named outputs are exports. CSS-vars and token export are near-term (the pipeline exists); Figma/GitHub/docs are larger integrations.

#### F2. Figma Binding (Code Connect / variable mapping) — **P3**
- **What:** Mapping between components/tokens and Figma components/variables.
- **Current:** None. README says "Figma reads from code" but no binding artifact exists.
- **Why:** "Export to Figma" and code↔design parity require an explicit mapping.

### G. AI & documentation

#### G1. AI Metadata — **P3**
- **What:** Structured, model-facing metadata: natural-language descriptions, usage guidance, do/don't examples, semantic tags, prompts, and (optionally) embeddings — per token, foundation, and component.
- **Current:** Only human `$description` fields on some tokens; nothing component-level or AI-oriented.
- **Why:** This is an **AI-powered** Builder; AI generation/assist quality depends on rich, structured metadata. Deferred only because it presupposes the P0–P1 model exists to annotate.

#### G2. Design Rules / Usage Guidelines — **P2**
- **What:** When-to-use, composition rules, pairing/spacing constraints, anti-patterns — as structured, enforceable guidance.
- **Current:** None (scattered token `$description`s only).
- **Why:** Enterprise governance and AI generation both consume design rules; the Builder can surface and enforce them.

#### G3. Documentation Source / Generation — **P2**
- **What:** Structured content (usage, examples, API/props, a11y notes) that a docs exporter renders.
- **Current:** README + these `/docs` analysis files; no per-component structured doc source.
- **Why:** "Export Documentation" needs a structured source, not prose pages.

### H. Data quality (prerequisites that de-risk everything)

#### H1. Token/Reference Integrity Cleanup — **P1**
- **What:** Resolve the un-emitted tokens referenced across the library (`--ds-border-default-color`, `--ds-border-default-width`, `--ds-status-*`, `--ds-surface-input`, `--ds-overlay-scrim`, …) and the `ds-btn`/`ds-button` mismatch.
- **Current:** Many components reference variables the build never emits — some **without fallback** (borders resolve empty); status variants silently collapse to primary.
- **Why:** Any manifest/binding/preview built now would encode these breaks. Clean data is a precondition for a trustworthy model. *(Identification only here; remediation is future work.)*

#### H2. Builder Metadata (editor hints) — **P1**
- **What:** UI-authoring hints layered on the model: which props are editable, control types (color picker / slider / select / text), grouping/order, canvas defaults, preview backgrounds, responsive preview sizes.
- **Current:** None.
- **Why:** Turns the raw model (A/B) into a usable editing UI. Distinct from Property Schema: B4 defines *what* a prop is; H2 defines *how the Builder renders its editor.*

---

## 3. Prioritised gap register (master table)

| ID | Gap | Category | Priority | Blocks Builder capability | Depends on |
|---|---|---|:---:|---|---|
| A1 | Component Manifest | Model | **P0** | Import, Browse Components | — |
| A2 | Component Metadata | Model | **P0** | Browse Components, Search | A1 |
| A3 | Foundation Manifest | Model | **P0** | Browse Foundations, Edit Tokens | — |
| A4 | Token Schema & Binding Map | Model | **P0** | Edit Tokens/Semantic/Brand, Preview | A3 |
| A5 | Import Contract | Model | **P0** | Import | A1, A3 |
| B4 | Property Schema | Contract | **P0** | Edit Component Properties | A2, A4 |
| C1 | Theme / Brand Model | Theming | **P0** | Edit Brand, Generate Themes, Generate Multiple DS | A4 |
| B1 | Variant Definitions | Contract | **P1** | Edit Properties, Preview | A2 |
| B2 | State Definitions | Contract | **P1** | Preview Live | A2 |
| B3 | Slot Definitions | Contract | **P1** | Edit Properties, Preview | A2 |
| D1 | Validation Rules | Governance | **P1** | Safe Edit Tokens/Themes | A4, C1 |
| E1 | Preview / Render Harness | Runtime | **P1** | Preview Live | A4, B1–B3 |
| F1a | Export: CSS vars + tokens | Export | **P1** | Export CSS, Export Tokens | A4, C1 |
| H1 | Token/Reference Integrity | Data quality | **P1** | (De-risks all model work) | — |
| H2 | Builder Metadata (editor hints) | Model | **P1** | Edit Properties/Tokens UI | B4, A4 |
| B5 | Accessibility Contracts | Contract | **P2** | A11y-safe generation | B1–B3 |
| B6 | Interaction Contracts | Contract | **P2** | Interactive preview | B2 |
| B7 | Component Relationships | Contract | **P2** | Import order, Export bundling | A1 |
| C2 | Mode Definitions (dark/HC) | Theming | **P2** | Generate Themes (modes) | C1 |
| E2 | Icon Registry | Runtime | **P2** | Preview, icon slots | B3 |
| F1b | Export: Figma / GitHub / Docs | Export | **P2** | Export to Figma/GitHub/Docs | F1a, G3 |
| G2 | Design Rules | AI/Docs | **P2** | Governance, AI assist | A2 |
| G3 | Documentation Source | AI/Docs | **P2** | Export Documentation | A2, B1–B4 |
| D2 | Versioning & Change Mgmt | Governance | **P3** | Multi-DS lifecycle | A1, C1 |
| E3 | Behaviour / Framework Bindings | Runtime | **P3** | Interactive preview, codegen | B6 |
| F2 | Figma Binding (Code Connect) | Export | **P3** | Export to Figma (deep) | F1b |
| G1 | AI Metadata | AI | **P3** | AI-powered generation | A2, B*, C1 |

---

## 4. Prioritisation rationale & sequencing

**Priority bands:**

- **P0 — Foundational. Nothing works without these.** They constitute the *machine-readable model and multi-theme structure* the Builder is built on. Until A1–A5, B4, and C1 exist, the Builder cannot import, browse, edit properties, or generate themes at all.
- **P1 — Core builder loop.** The import→browse→edit→validate→preview→export(basic) cycle. These make the Builder *usable* end-to-end for a single design system, with CSS/token export. H1 (data cleanup) and H2 (editor hints) sit here because they gate a trustworthy, usable editing UI.
- **P2 — Enterprise completeness.** Accessibility/interaction/design contracts, modes, relationships, icons, and the heavier exporters (Figma/GitHub/docs). These make output *safe, governed, and portable*.
- **P3 — Intelligence & scale.** AI metadata, framework bindings, deep Figma binding, versioning/lifecycle. These deliver the "AI-powered" and "multiple design systems at scale" ambitions and presuppose the model beneath them.

**Dependency ordering (critical path):**

```
H1 (clean data)
   └─► A3 Foundation Manifest ─► A4 Token Schema+Bindings ─┬─► C1 Theme/Brand Model ─► F1a Export(CSS/tokens)
   └─► A1 Component Manifest ─► A2 Component Metadata ─► B4 Property Schema ─┐        └─► D1 Validation
                                    └─► B1/B2/B3 (variant/state/slot) ───────┴─► E1 Preview Harness ─► H2 Editor Hints
```

Everything in P2/P3 hangs off this spine: contracts (B5–B7) extend the component model; modes (C2) extend the theme model; exporters (F1b/F2) extend F1a; AI/docs (G1–G3) annotate the completed model.

---

## 5. Coverage map — Builder capability → readiness

Readiness of each named Builder capability given today's repo (all currently **Blocked** or **Partial**; none is ready, because the model layer is absent):

| Builder capability | Required artifacts | Today |
|---|---|---|
| Import the Headless DS | A5, A1, A3 | ❌ Blocked (bespoke parsing only) |
| Browse Foundations | A3, A4 | 🟡 Partial (values in `tokens.json`; no manifest) |
| Browse Components | A1, A2 | 🟡 Partial (folders exist; no metadata) |
| Edit Tokens (core) | A4, D1 | 🟡 Partial (editable JSON; no schema/validation) |
| Edit Semantic Tokens | A4, D1 | 🟡 Partial (as above) |
| Edit Brand Tokens | C1, A4 | ❌ Blocked (no brand/theme model) |
| Edit Component Properties | B4, A2, A4, H2 | ❌ Blocked (no property schema) |
| Generate Themes | C1, A4, D1 | ❌ Blocked (single `:root`) |
| Preview Components Live | E1, B1–B3, A4 | ❌ Blocked (demo pages only) |
| Generate Multiple DS | C1, A5, D2 | ❌ Blocked (no multi-theme model) |
| Export to GitHub | F1b, A1 | ❌ Blocked (no exporter) |
| Export to Figma | F1b, F2 | ❌ Blocked (no binding) |
| Export CSS Variables | F1a, A4 | 🟡 Partial (Style Dictionary emits CSS; not Builder-driven) |
| Export Design Tokens | F1a | 🟡 Partial (`tokens.json` exists; no profiles) |
| Export Documentation | G3, F1b, A2 | ❌ Blocked (prose only) |

---

## 6. Summary

The repository is an excellent **source of design decisions** but not yet a **product model a Builder can drive**. The overarching gap is the absence of an explicit, typed, versioned **contract/metadata layer** — manifests, schemas, and contracts that make the system's components, foundations, tokens, themes, and rules machine-readable.

- **7 P0 gaps** (A1–A5, B4, C1) form the non-negotiable foundation: the machine-readable model plus a multi-theme structure. Nothing in the Builder functions until these exist.
- **8 P1 gaps** complete the core import→edit→validate→preview→export loop for a single system, and include two prerequisites (H1 data-integrity cleanup, H2 editor hints).
- **P2** delivers enterprise safety and portability (a11y/interaction/design contracts, modes, relationships, icons, Figma/GitHub/docs export).
- **P3** delivers the AI and multi-system-at-scale ambitions, which sit atop the completed model.

Every capability in the brief is currently **Blocked or Partial** — not because the design system is weak (it is strong), but because the *Builder-facing artifact layer does not exist yet*. Building that layer, in the dependency order in §4, is the project's critical path.
