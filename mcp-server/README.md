# Base BNTS DS — MCP server & brand generator (Playbook Step 9)

Two connected pieces, matching Step 9 of the playbook exactly:

1. **The AI doorway** — an MCP server that exposes this repo's base tokens, component
   manifests, and mapping rules to any MCP-capable AI tool.
2. **The brand generator** — tools, hosted on the same server, that turn an *approved*
   mapping of a designer's Figma styles into a new, standalone brand design system.

This server never talks to Figma itself. In the intended flow, the orchestrating AI (e.g.
Claude, with the Figma MCP connected) reads a designer's Figma file via Figma's own MCP,
then calls `propose_brand_mapping` here with the extracted styles, shows the designer the
proposed table, and only calls `generate_brand_system` after the designer approves it —
exactly the two-prompt flow in Step 10 of the playbook.

## Setup

```bash
cd mcp-server
npm install
npm start        # runs the server on stdio
```

Connect it from an MCP client (e.g. Claude Desktop / Claude Code) by pointing at
`node <repo>/mcp-server/server.js` as a stdio MCP server, for example in
`claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "base-bnts-ds": {
      "command": "node",
      "args": ["/absolute/path/to/Base-BNTS-DS/mcp-server/server.js"]
    }
  }
}
```

## Tools

| Tool | What it does |
|---|---|
| `list_components` | Every headless component, read straight off `components/` on disk. |
| `get_component_tokens` | For one (or all) components, the exact `--ds-*` custom properties it consumes, resolved to token path + tier + current value. |
| `get_base_parameters` | The flattened, alias-resolved parameter list for `core`, `semantic`, and/or `base`. |
| `get_mapping_rules` | The rules used to map Figma styles onto base core parameters (color role keywords, ramp/scale sizes, font-family slots). |
| `propose_brand_mapping` | Given Figma styles already extracted by the caller (via the Figma MCP), proposes a mapping table. Read-only — writes nothing. |
| `generate_brand_system` | Given an approved (and possibly corrected) mapping, scaffolds `generated-brands/<slug>/` — never touches the base repo. |

## Design decision: what actually changes per brand

A brand is a re-supply of **core** tier raw values only — color ramps, the radius scale,
the spacing scale, and font-family names. `tokens/semantic/`, `tokens/base/`, and every
component under `components/` are copied byte-for-byte into the generated brand. That's
what makes "supplying a new set of values against the same base" literally true: nothing
structural has to change for a brand to look different, because the components only ever
read semantic/base tier variables, and those tiers alias down into core.

Two things this intentionally does **not** try to do, both flagged in the generator's
output rather than silently handled:
- If a Figma file has a genuinely distinct **secondary** palette, this base system's
  `semantic/color.json` derives `secondary.*` from the *brand* ramp, not a separate core
  bucket — so a secondary override needs a semantic-tier edit, which is out of scope for
  an automated generator that's supposed to leave semantic/base alone. It's written to
  `tokens/core/color.json` anyway and flagged in `MAPPING.md`/`README.md` for governance
  review.
- Per-role **type scale** overrides (a brand wanting different sizes/weights per heading
  level, not just a different font family) aren't auto-applied — only the raw font-family
  string is mapped. The base's modular scale is treated as house style.

## Testing without a real Figma connection

`examples/sample-figma-extract.json` is a small, representative payload shaped like what
`propose_brand_mapping` expects, useful for trying the flow end-to-end (see
`test/smoke.js`).
