#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { loadResolvedTokens } from './lib/tokenStore.js';
import { getComponentManifest, listComponentNames } from './lib/components.js';
import { MAPPING_RULES_DOC, COLOR_ROLE_RULES, RADIUS_SCALE_KEYS, SPACING_SCALE_KEYS, FONT_FAMILY_SLOT_RULES } from './lib/mappingRules.js';
import { proposeBrandMapping } from './lib/mapper.js';
import { generateBrandSystem } from './lib/brandGenerator.js';

const server = new McpServer({ name: 'base-bnts-ds', version: '1.0.0' });

// ---- Base system introspection (the "AI doorway" from Step 9a) --------------------------

server.registerTool(
  'list_components',
  {
    title: 'List headless components',
    description:
      "Lists every headless component in the base design system, derived by scanning components/ on disk — never hand-maintained, so it can't drift from the code.",
    inputSchema: {},
  },
  async () => ({ content: [{ type: 'text', text: JSON.stringify(listComponentNames(), null, 2) }] })
);

server.registerTool(
  'get_component_tokens',
  {
    title: 'Get a component (or all components) and the tokens it consumes',
    description:
      'Returns, for one component or all of them, the exact CSS custom properties it reads (parsed straight from its .css file) resolved back to their token path, tier, type, and current value.',
    inputSchema: { component: z.string().optional().describe('Component name, e.g. "button". Omit for every component.') },
  },
  async ({ component }) => {
    const { cssVarIndex } = loadResolvedTokens();
    const manifest = getComponentManifest(cssVarIndex);
    const result = component ? manifest.filter((c) => c.name === component) : manifest;
    if (component && result.length === 0) {
      return { content: [{ type: 'text', text: `No component named "${component}". Known components: ${listComponentNames().join(', ')}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

server.registerTool(
  'get_base_parameters',
  {
    title: 'Get the base system parameter list',
    description:
      'Returns the flattened, alias-resolved parameter list for one or all token tiers (core, semantic, base) — the same dictionary the whole system speaks (Step 1).',
    inputSchema: {
      tier: z.enum(['core', 'semantic', 'base']).optional().describe('Restrict to one tier. Omit for all three.'),
    },
  },
  async ({ tier }) => {
    const { resolved } = loadResolvedTokens();
    const payload = tier ? { [tier]: resolved[tier] } : resolved;
    return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
  }
);

server.registerTool(
  'get_mapping_rules',
  {
    title: 'Get the Figma-to-base-parameter mapping rules',
    description:
      'Returns the rules the brand generator uses to map Figma styles onto base core parameters — color role keywords, ramp/scale slot counts, and font-family slots — plus a plain-language explanation.',
    inputSchema: {},
  },
  async () => ({
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          { doc: MAPPING_RULES_DOC, colorRoles: COLOR_ROLE_RULES, radiusScaleKeys: RADIUS_SCALE_KEYS, spacingScaleKeys: SPACING_SCALE_KEYS, fontFamilySlots: FONT_FAMILY_SLOT_RULES },
          null,
          2
        ),
      },
    ],
  })
);

// ---- Brand generator (Step 9b) ----------------------------------------------------------

const figmaStyleShape = z.object({
  name: z.string(),
  value: z.union([z.string(), z.number()]).optional(),
  fontFamily: z.string().optional(),
});

server.registerTool(
  'propose_brand_mapping',
  {
    title: 'Propose a brand mapping from extracted Figma styles',
    description:
      'Given styles already extracted from a designer\'s Figma file (via the Figma MCP — this tool does not talk to Figma itself), proposes a mapping onto the base system\'s core parameters as a reviewable table. Every value is either read from Figma or explicitly flagged as interpolated/unmapped — nothing is silently guessed. Does not write anything; call generate_brand_system after a human approves.',
    inputSchema: {
      colors: z.array(figmaStyleShape).optional(),
      radii: z.array(figmaStyleShape).optional(),
      spacing: z.array(figmaStyleShape).optional(),
      typography: z.array(figmaStyleShape).optional(),
      sourceFiles: z.array(z.string()).optional().describe('Figma file URLs/keys these styles were read from.'),
    },
  },
  async (figmaStyles) => ({ content: [{ type: 'text', text: JSON.stringify(proposeBrandMapping(figmaStyles), null, 2) }] })
);

server.registerTool(
  'generate_brand_system',
  {
    title: 'Generate a brand design system from an approved mapping',
    description:
      'Scaffolds a new, standalone brand design system into generated-brands/<slug> using an APPROVED mapping (the output of propose_brand_mapping, corrected by the designer). Copies components/ and tokens/semantic + tokens/base unchanged from the base repo, writes brand-specific tokens/core files, and never modifies the base repo itself. Refuses to overwrite an existing brand folder unless overwrite is set.',
    inputSchema: {
      brandName: z.string(),
      mapping: z.record(z.any()).describe('The approved mapping object (shape of propose_brand_mapping\'s output: color/radius/spacing/fontFamily).'),
      sourceFiles: z.array(z.string()).optional(),
      overwrite: z.boolean().optional(),
    },
  },
  async ({ brandName, mapping, sourceFiles, overwrite }) => {
    try {
      const result = generateBrandSystem({ brandName, mapping, sourceFiles, overwrite });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `generate_brand_system failed: ${err.message}` }], isError: true };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
