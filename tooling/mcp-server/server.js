#!/usr/bin/env node
/**
 * The AI doorway — an MCP server exposing the base design system to AI tools.
 *
 * It is READ-ONLY. It lets an assistant answer "what are the base parameters for
 * a button?", "what components exist?", "what are the mapping rules?" straight
 * from the committed base repo, so no tool ever guesses at the base.
 *
 * Run:  node tooling/mcp-server/server.js        (stdio transport)
 * Wire it into any MCP client (Claude Desktop, Cursor, the brand generator, ...):
 *   { "command": "node", "args": ["tooling/mcp-server/server.js"] }
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  readAllTiers,
  flatTier,
  listComponents,
  baseParameters,
  readRules,
  readRulesDoc,
  baseVersion,
} from '../lib/base-reader.js';

const server = new McpServer({
  name: 'bnts-base-design-system',
  version: baseVersion(),
});

const asJson = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] });
const asText = (text) => ({ content: [{ type: 'text', text }] });

server.registerTool(
  'list_components',
  {
    title: 'List base components',
    description: 'Every headless component in the base system and the --ds-* tokens each consumes.',
    inputSchema: {},
  },
  async () => asJson({ baseVersion: baseVersion(), components: listComponents() }),
);

server.registerTool(
  'get_base_parameters',
  {
    title: 'Get base parameters',
    description:
      'The base-tier token roles a component can pick from (e.g. component="button" -> action.*). Omit component to get the whole base tier.',
    inputSchema: { component: z.string().optional().describe('Component name, e.g. "button". Omit for all.') },
  },
  async ({ component }) => asJson({ component: component ?? 'ALL', parameters: baseParameters(component) }),
);

server.registerTool(
  'get_tokens',
  {
    title: 'Get token tier',
    description: 'Raw DTCG tokens for a tier: "core" (primitives), "semantic" (roles), or "base" (component roles).',
    inputSchema: { tier: z.enum(['core', 'semantic', 'base']).describe('Which tier to return') },
  },
  async ({ tier }) => asJson(readAllTiers()[tier]),
);

server.registerTool(
  'get_foundation_values',
  {
    title: 'Get resolved foundation values',
    description: 'Flat map of a core foundation (color, radius, spacing, typography, ...) as path -> value.',
    inputSchema: { foundation: z.string().optional().describe('Filter to one foundation prefix, e.g. "color" or "radius".') },
  },
  async ({ foundation }) => {
    const core = flatTier('core');
    const filtered = foundation
      ? Object.fromEntries(Object.entries(core).filter(([p]) => p.startsWith(foundation)))
      : core;
    return asJson(filtered);
  },
);

server.registerTool(
  'get_mapping_rules',
  {
    title: 'Get brand mapping rules',
    description: 'The rules for auto-mapping a designer\'s Figma styles onto the base core tier. Use these to map a brand.',
    inputSchema: {},
  },
  async () => asJson(readRules('mapping-rules')),
);

server.registerTool(
  'get_usage_rules',
  {
    title: 'Get governance / usage rules',
    description: 'The base-vs-brand rules: what a brand may change, what it may never do, and the automated gates.',
    inputSchema: {},
  },
  async () => asText(readRulesDoc('governance.md')),
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`[bnts doorway] base design system v${baseVersion()} — MCP server ready on stdio`);
