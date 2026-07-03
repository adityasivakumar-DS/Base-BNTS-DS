# Design profiles (generator input)

A **design profile** is the normalized shape the generator consumes. It is what a
designer's Figma file boils down to: raw brand values, nothing about structure.

In the live flow (playbook Step 10) you don't hand-write this — the Figma MCP's
`get_variable_defs` produces a flat variable map, and
`extract.fromFigmaVariableDefs()` normalizes it into this shape. The JSON files
here are the same shape, on disk, for testing and for pre-extracted brands.

## Schema

```jsonc
{
  "brandName": "EPL",                 // required
  "brandSlug": "epl",                 // optional (derived from name)
  "source": { "tool": "figma", "files": ["<figma url>"] },

  "color": {
    "brand":   "#37003c"              // required. A hex seed -> ramp is DERIVED,
                                       //   OR a full { "0":..,"500":..,"1000":.. } ramp -> HIGH confidence
    "neutral": { "...": "..." },      // optional ramp or seed (greys)
    "success": "#00a650",             // optional feedback seeds (or ramps)
    "error":   "#e90052",
    "warning": "#ffb800",
    "info":    "#04f5ff"
  },

  "typography": {
    "fontFamilyPrimary":  "'Poppins', sans-serif",
    "fontFamilyDisplay":  "'Poppins', sans-serif",
    "fontFamilySecondary":"'Poppins', sans-serif",
    "sizes": { "md": "16px" }         // optional per-step overrides
  },

  "radius":  { "md": "10px" },        // optional named steps; missing steps inherit base
  "spacing": { "md": "16px" }         // optional; omit to inherit the whole base scale
}
```

Anything omitted is **inherited from the base** — that is the point: a brand only
supplies what makes it different.
