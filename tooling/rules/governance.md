# Base ↔ Brand usage rules (served by the AI doorway)

These are the rules the MCP server hands to any AI tool that touches the system.
They are the machine-readable version of the base-vs-brand rule from the playbook.

## Source of truth
- **Code in Git is canonical.** Figma reads from it, never the reverse.
- The base design system lives in **one repo** (this one). It holds the real org
  values and every headless component.

## What a brand may change
- A brand overrides the **core** tier only — the raw primitives (colour ramps,
  type families, radius/spacing scales).
- A brand **inherits** the `semantic` tier, the `base` tier, and every
  `component` unchanged. These define *structure*; the brand supplies *values*.

## What a brand may never do
- Never edit the base repo. Brands are generated into their **own** repo.
- Never hardcode a colour/size into a component. Components read tokens only.
- Never invent a value the tool could have read from the designer's Figma file.

## Automated gates (a brand fails generation if it breaks these)
- **Contrast:** every action/CTA background must meet **WCAG AA (4.5:1)** against
  its resolved text colour. Below that → hard warning requiring designer sign-off.
- **Completeness:** required roles (brand ramp) must be present or explicitly
  inherited — never left undefined.
- **Provenance:** every overridden token records where its value came from
  (which Figma file/style) in `$extensions.bnts.source`.

## Review before generation
- The auto-mapping is a **draft**. The designer sees a mapping table (base
  parameter, value read from Figma, source, confidence) and corrects it before
  anything is written. Generation is blocked until the mapping is approved.
