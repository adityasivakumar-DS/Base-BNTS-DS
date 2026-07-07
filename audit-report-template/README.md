# Salesforce Health Check — Audit Report Template

Reusable version of the Salesforce Health Check audit report: one master
HTML template, one content template to fill in per client, and a script that
combines them into a client-ready standalone HTML file.

Start with **`HOW-TO-GENERATE-REPORT.md`** for the full workflow. Quick
reference:

- `master-template.html` — the report shell (layout/styling/logic). Don't edit per client.
- `audit-report-source-template.md` — blank fill-in doc for a client's findings.
- `audit-report-data.example.yaml` — worked example (Northern Trail
  Outfitters) in the format `scripts/generate_report.py` consumes; copy this
  per client.
- `scripts/generate_report.py` — generates the client HTML from a data file.
