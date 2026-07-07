# Salesforce Health Check — Audit Report Source Template

This is the fill-in document for a single client's audit report. Fill in every
field below with that client's findings, then hand this document (or its
transcribed YAML — see `HOW-TO-GENERATE-REPORT.md`) to whoever generates the
HTML.

Field names in `snake_case` match the keys in `audit-report-data.example.yaml`
1:1, so transcription is copy/paste, not interpretation.

**Fixed structure — do not add, remove, or reorder items:**
- Exactly **4** Executive Summary cards, with these exact titles (only the body text changes)
- Exactly **7** pillars, with these exact names and in this exact order (they are the audit framework, not per-client content)
- Exactly **5** risks, ordered most severe first
- Exactly **4** decisions
- Each pillar: 2–4 metrics, and ideally 4 priority actions (even numbers lay out cleanly in the 2-column grid)

This is a v1 constraint of the template — the page headings ("Seven Pillars",
"Five Risks", "Four Decisions") are hand-written prose tied to these counts.
Changing a count means also editing that heading text in the HTML (see the guide).

---

## 1. Report Meta

- `client`: <!-- Client / org display name, e.g. "Acme Corp" -->
- `report_date`: <!-- e.g. "June 29, 2026" -->
- `overall`: <!-- Overall score, 0–100 -->
- `overall_status`: <!-- Excellent (85–100) / Good (70–84) / Fair (50–69) / Poor (0–49) -->
- `critical_count`: <!-- integer -->
- `high_count`: <!-- integer -->
- `medium_count`: <!-- integer -->
- `verdict`: <!-- One sentence, sits under the client name in the hero banner -->
- `hero_takeaway`: <!-- 1–2 sentences, sits below the divider at the bottom of the hero banner -->

## 2. Executive Summary (4 cards, titles are fixed)

### Where We Are
- `where_we_are_body`: <!-- What the overall score means in plain terms -->

### What's at Risk
- `whats_at_risk_body`: <!-- The critical/high findings and their common root cause, if any -->

### What's Working
- `whats_working_body`: <!-- The strongest pillars and why -->

### Where We're Headed
- `where_were_headed_body`: <!-- The recommended sequencing / posture going forward -->

## 3. Pillars (exactly 7, fixed names and order)

For each pillar, fill in: score, status, one-line key stat (shown on the
Scorecard row/tile), a takeaway paragraph (shown in the pillar deep-dive), 2–4
metrics, and priority actions.

Status labels: **Excellent** (85–100) / **Good** (70–84) / **Fair** (50–69) / **Poor** (0–49).
Metric tone: **good** / **warn** / **bad** / **info** (drives the metric's accent color).

### Pillar 1 — Usage & Adoption (`short: Usage`)
- `score`:
- `status`:
- `key_stat`:
- `takeaway`:
- Metrics:

| value | label | description | tone |
|---|---|---|---|
| | | | |

- Priority actions:
1.
2.
3.
4.

### Pillar 2 — License & Cost (`short: Licensing`)
- `score`:
- `status`:
- `key_stat`:
- `takeaway`:
- Metrics:

| value | label | description | tone |
|---|---|---|---|
| | | | |

- Priority actions:
1.
2.
3.
4.

### Pillar 3 — Design & Architecture (`short: Architecture`)
- `score`:
- `status`:
- `key_stat`:
- `takeaway`:
- Metrics:

| value | label | description | tone |
|---|---|---|---|
| | | | |

- Priority actions:
1.
2.
3.
4.

### Pillar 4 — Maintenance & Governance (`short: Governance`)
- `score`:
- `status`:
- `key_stat`:
- `takeaway`:
- Metrics:

| value | label | description | tone |
|---|---|---|---|
| | | | |

- Priority actions:
1.
2.
3.
4.

### Pillar 5 — Security & Access Policy (`short: Security`)
- `score`:
- `status`:
- `key_stat`:
- `takeaway`:
- Metrics:

| value | label | description | tone |
|---|---|---|---|
| | | | |

- Priority actions:
1.
2.
3.
4.

### Pillar 6 — Code & Technical Quality (`short: Code`)
- `score`:
- `status`:
- `key_stat`:
- `takeaway`:
- Metrics:

| value | label | description | tone |
|---|---|---|---|
| | | | |

- Priority actions:
1.
2.
3.
4.

### Pillar 7 — Automation & Modernization (`short: Automation`)
- `score`:
- `status`:
- `key_stat`:
- `takeaway`:
- Metrics:

| value | label | description | tone |
|---|---|---|---|
| | | | |

- Priority actions:
1.
2.
3.
4.

## 4. Top Risks (exactly 5, most severe first)

| severity (Critical/High/Medium) | title | evidence | action |
|---|---|---|---|
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |

## 5. Decisions / Next Steps (exactly 4)

1. **title:** <br>**body:**
2. **title:** <br>**body:**
3. **title:** <br>**body:**
4. **title:** <br>**body:**

## 6. Client Logo

Not part of this document. Provide the logo as a separate SVG or PNG file
(transparent background, roughly 108×36px aspect ratio works best) — it's
placed into the report through the report tool's logo slot, not through
text data. See `HOW-TO-GENERATE-REPORT.md`.
