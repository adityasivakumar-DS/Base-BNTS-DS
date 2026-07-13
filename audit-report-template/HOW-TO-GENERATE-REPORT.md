# How to Generate a Client Audit Report

This package turns the Salesforce Health Check audit report into a reusable
template: fill in a client's findings once, run one script, get that
client's standalone HTML report.

## Files in this package

| File | Purpose |
|---|---|
| `master-template.html` | The report shell — layout, styling, fonts, scoring logic, icons. Never edit this per client. |
| `audit-report-source-template.md` | Blank fill-in doc. Give this to whoever is authoring a client's findings (a person, or an AI reading the org's health-check output). |
| `audit-report-data.example.yaml` | The same content as the built-in Northern Trail Outfitters example, already transcribed into the YAML the script consumes. Copy this file per client. |
| `scripts/generate_report.py` | Takes a data YAML file + `master-template.html` → writes the client's HTML. |

## Why there's a script (don't hand-edit the HTML)

`master-template.html` is a **bundled** page: fonts, scripts, and images are
base64-encoded inside a `<script type="__bundler/manifest">` tag, and the
entire page — markup, styles, and the client data — lives as a single
JSON-encoded string inside a `<script type="__bundler/template">` tag. Every
`/` character in that JSON string is escaped as `/` on purpose: the
template contains several real `<script>` tags (including its own closing
tag), and an unescaped `</script>` inside the JSON would truncate the whole
page the moment a browser parses it.

That escaping is easy to break by hand and hard to notice until the report
fails to load. `generate_report.py` decodes it, edits only the client data
object, and re-encodes it the same way, so this never comes up.

## End-to-end workflow

1. **Author the content.** Copy `audit-report-source-template.md`, fill in
   every field for the client (or have an AI do it from the org's
   health-check findings). Keep the fixed structure: 4 Executive Summary
   cards, 7 pillars in the given order, 5 risks (most severe first), 4
   decisions.

2. **Transcribe to YAML.** Copy `audit-report-data.example.yaml` to a new
   file (e.g. `clients/acme-corp.yaml`) and replace every value with what's
   in the filled markdown. Field names match 1:1 — see the mapping table
   below if anything is unclear.

3. **Generate the HTML:**

   ```bash
   pip install -r scripts/requirements.txt
   python3 scripts/generate_report.py \
     --data clients/acme-corp.yaml \
     --master master-template.html \
     --out output/acme-corp.html
   ```

   The script validates structure (pillar/risk/decision counts, required
   fields) before writing, and fails with a clear message if something's
   missing or miscounted.

4. **Add the client logo.** The logo is a drag-and-drop image slot in the
   report builder tool the master template was authored in, not a text
   field — it isn't part of the data file. Open the generated HTML in that
   tool and drop the client's logo into the slot in the top nav. (If you're
   only ever distributing the standalone HTML file, the slot shows a
   placeholder and the report still works — just without the client's mark.)

5. **Validate the output** before sending it out:
   - Open the generated `.html` file directly in a browser (it needs
     internet access — it loads React/ReactDOM/Babel from `unpkg.com` at
     runtime).
   - Check the client name, overall score, and nav (Scorecard / Risks /
     Pillars / Decisions) render.
   - Click through the Scorecard's Bars/Tiles toggle and a couple of Pillar
     tabs to confirm the data came through.
   - Skim the Executive Summary cards and Risks list for the client's
     actual findings, not leftover example text.

## Field mapping (markdown → YAML → report)

| Markdown field | YAML key | Report field |
|---|---|---|
| `client` | `client` | Hero name |
| `report_date` | `report_date` | Nav + footer date |
| `overall` | `overall` | Hero score, Scorecard subheading |
| `overall_status` | `overall_status` | Hero status pill |
| `critical_count` / `high_count` / `medium_count` | `critical_count` / `high_count` / `medium_count` | Hero counts |
| `verdict` | `verdict` | Hero subhead |
| `hero_takeaway` | `hero_takeaway` | Hero closing line |
| `where_we_are_body` etc. | `story.where_we_are_body` etc. | Executive Summary card bodies (titles/icons/colors are fixed by design) |
| Pillar `score`, `status`, `key_stat`, `takeaway`, metrics table, actions | `pillars[].*` | Scorecard row/tile, Pillar deep-dive |
| Risks table | `risks[].*` | Risks section, ordered as given |
| Decisions | `decisions[].*` | Decisions section |

## Layout notes

- **Responsive.** The report adapts at 1024px (nav collapses, headings/scores
  scale down) and 640px (nav links become a horizontal swipe strip, the
  Scorecard bars table and Risks rows reflow to stacked cards, all grids
  drop to a single column). Breakpoints live in a `<style>` block in the
  template's `<helmet>`, keyed to `rpt-*` classes on the relevant elements.
- **Decisions carousel.** The Decisions section shows 2 cards at a time
  (1 on mobile) in a horizontally-scrolling, snap-aligned track, with
  prev/next arrow buttons. It's plain CSS scroll + native `scrollBy()` — no
  extra component state, so it composes fine with any number of decisions
  (though the heading text still says "Four," per the fixed-count note
  below).

## Known limitations (v1)

- **Fixed counts.** The page headings — "One Score, Seven Pillars", "Five
  Risks, Ranked", "Four Decisions to Begin" — are hand-written prose tied to
  those exact counts. If a client's assessment genuinely needs a different
  number of risks or decisions, that heading text has to be edited directly
  in `master-template.html` (search for the phrase in the decoded template,
  same JSON-string caveat as above applies) — the script does not do this.
- **Client logo** is a manual step in the report builder tool (see above),
  not part of the data file.
- **Pillar names/order are fixed** — they represent the audit framework
  itself (Usage & Adoption, License & Cost, Design & Architecture,
  Maintenance & Governance, Security & Access Policy, Code & Technical
  Quality, Automation & Modernization), not client-specific content.
- The remaining section subheadings (e.g. "Ordered by severity, most
  critical first.") were deliberately written generically so they hold for
  any client — no per-client editing needed there.
