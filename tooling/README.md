# Step 9 — Brand generator + AI doorway

This folder is the output of **playbook Step 9**: the two connected pieces that let
brands be generated from the base design system.

```
tooling/
├── mcp-server/          (a) the AI doorway — an MCP server over the base
│   └── server.js
├── brand-generator/     (b) the brand generator — Figma -> base params -> brand repo
│   ├── cli.js               orchestrator: extract -> map -> review -> generate
│   ├── lib/
│   │   ├── extract.js       normalize a Figma file into a design profile
│   │   ├── map.js           auto-map the profile onto the base CORE tier
│   │   ├── review.js        render the mapping table + apply designer corrections
│   │   ├── generate.js      scaffold a new brand repo (base untouched)
│   │   └── selftest.js      `npm test`
│   └── figma-inputs/        design profiles (e.g. epl.figma.json)
├── lib/                 shared: base-reader (single source), color maths
└── rules/               mapping-rules.json + governance.md (served by the doorway)
```

## The one idea

The base = `core` (primitives) → `semantic` (roles) → `base` (component roles) →
`components`. **A brand is nothing but a new `core` tier.** So the generator copies
`semantic`, `base`, and `components` from the base *unchanged*, and writes a fresh
`core` from the designer's Figma values. The base is never edited.

## Setup

```bash
cd tooling
npm install
npm test
```

## (a) The AI doorway (MCP server)

A read-only MCP server that exposes the base so any AI tool reads it instead of
guessing. Tools: `list_components`, `get_base_parameters`, `get_tokens`,
`get_foundation_values`, `get_mapping_rules`, `get_usage_rules`.

```bash
npm run mcp        # serves on stdio
```

Wire it into an MCP client (Claude Desktop, Cursor, …):

```json
{
  "mcpServers": {
    "bnts-base": { "command": "node", "args": ["tooling/mcp-server/server.js"] }
  }
}
```

## (b) The brand generator

```bash
# 1. Draft a mapping and STOP for review (nothing is generated):
node brand-generator/cli.js brand-generator/figma-inputs/epl.figma.json \
     --out ../EPL-Repo-AI-DS

# -> writes MAPPING-REVIEW.md + mapping.corrections.json for the designer.

# 2. Designer edits mapping.corrections.json, then approve + generate + verify:
node brand-generator/cli.js brand-generator/figma-inputs/epl.figma.json \
     --out ../EPL-Repo-AI-DS \
     --approve --corrections ../EPL-Repo-AI-DS/mapping.corrections.json --build
```

The generated brand repo gets its **own** tokens (`core` new, `semantic`/`base`
inherited), **own** components (copied unchanged), **own** Storybook, and **own**
Figma library setup — plus `MAPPING-REVIEW.md` and `brand.config.json` recording
exactly what came from Figma.

### The review gate

Generation is blocked until the mapping is **approved**. Contrast failures (an
action colour below WCAG AA against its text) are hard blockers — resolve them in
`mapping.corrections.json` or pass `--force` with sign-off.

## The live Figma flow (Step 10)

Step 10 swaps the on-disk profile for the Figma MCP: the client calls
`get_variable_defs` on the designer's file, passes the result through
`extract.fromFigmaVariableDefs()`, and the same map → review → generate follows.
Confirm Figma MCP capabilities and plan tiers against Figma's current docs.
