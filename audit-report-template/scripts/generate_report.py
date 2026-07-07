#!/usr/bin/env python3
"""Generate a client Salesforce health check HTML report from master-template.html + a data YAML file.

Usage:
    python3 generate_report.py --data ../audit-report-data.example.yaml \
        --master ../master-template.html \
        --out ../output/northern-trail-outfitters.html

The master HTML is a "bundled" page: fonts/scripts/images live base64-encoded
in a <script type="__bundler/manifest"> tag, and the actual page markup +
client data live as a JSON-encoded string in a <script type="__bundler/template">
tag. This script only touches the `data() { return {...}; }` object inside
that template's embedded <script type="text/x-dc"> component — nothing else
in the bundle is modified, so layout, styling, and assets are untouched.

See ../HOW-TO-GENERATE-REPORT.md for the full field mapping and manual steps
this script automates.
"""
import argparse
import json
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.exit("PyYAML is required: pip install pyyaml")


def load_data(yaml_path: Path) -> dict:
    with open(yaml_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def to_component_data(d: dict) -> dict:
    """Map the human-facing snake_case YAML schema onto the camelCase keys
    the report component's data() object expects."""

    def metric(m):
        return {"v": m["value"], "l": m["label"], "d": m["description"], "t": m["tone"]}

    def pillar(p):
        return {
            "name": p["name"],
            "short": p["short"],
            "score": p["score"],
            "status": p["status"],
            "keyStat": p["key_stat"],
            "takeaway": p["takeaway"],
            "metrics": [metric(m) for m in p["metrics"]],
            "actions": list(p["actions"]),
        }

    def risk(r):
        return {
            "sev": r["severity"],
            "title": r["title"],
            "evidence": r["evidence"],
            "action": r["action"],
        }

    def decision(dd):
        return {"title": dd["title"], "body": dd["body"]}

    story = d["story"]
    return {
        "client": d["client"],
        "reportDate": d["report_date"],
        "overall": d["overall"],
        "overallStatus": d["overall_status"],
        "counts": {
            "critical": d["critical_count"],
            "high": d["high_count"],
            "medium": d["medium_count"],
        },
        "verdict": d["verdict"],
        "heroTakeaway": d["hero_takeaway"],
        "story": [
            {"title": "Where We Are", "tone": "info", "icon": "sparkle", "body": story["where_we_are_body"]},
            {"title": "What’s at Risk", "tone": "bad", "icon": "alert", "body": story["whats_at_risk_body"]},
            {"title": "What’s Working", "tone": "good", "icon": "sparkle", "body": story["whats_working_body"]},
            {"title": "Where We’re Headed", "tone": "info", "icon": "sparkle", "body": story["where_were_headed_body"]},
        ],
        "pillars": [pillar(p) for p in d["pillars"]],
        "risks": [risk(r) for r in d["risks"]],
        "decisions": [decision(dd) for dd in d["decisions"]],
    }


def validate(d: dict) -> None:
    errors = []
    if len(d.get("pillars", [])) != 7:
        errors.append(f"expected exactly 7 pillars, got {len(d.get('pillars', []))}")
    if len(d.get("risks", [])) != 5:
        errors.append(f"expected exactly 5 risks, got {len(d.get('risks', []))}")
    if len(d.get("decisions", [])) != 4:
        errors.append(f"expected exactly 4 decisions, got {len(d.get('decisions', []))}")
    for key in ("where_we_are_body", "whats_at_risk_body", "whats_working_body", "where_were_headed_body"):
        if not d.get("story", {}).get(key):
            errors.append(f"missing story.{key}")
    for i, p in enumerate(d.get("pillars", [])):
        n = len(p.get("metrics", []))
        if not (2 <= n <= 4):
            errors.append(f"pillar {i + 1} ({p.get('name')}): expected 2-4 metrics, got {n}")
    if errors:
        raise SystemExit("Data validation failed:\n" + "\n".join(f"  - {e}" for e in errors))


def extract_script_json(html: str, script_type: str) -> tuple[str, int, int]:
    pattern = r'<script type="%s">(.*?)</script>' % re.escape(script_type)
    m = re.search(pattern, html, re.S)
    if not m:
        raise SystemExit(f"Could not find <script type=\"{script_type}\"> in master template")
    return m.group(1), m.start(1), m.end(1)


def find_matching_brace(s: str, open_idx: int) -> int:
    """Return the index of the '}' that closes the '{' at open_idx, string-aware."""
    depth = 0
    i = open_idx
    in_string = None  # one of None, "'", '"', '`'
    escaped = False
    while i < len(s):
        c = s[i]
        if in_string:
            if escaped:
                escaped = False
            elif c == "\\":
                escaped = True
            elif c == in_string:
                in_string = None
        else:
            if c in ("'", '"', "`"):
                in_string = c
            elif c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    return i
        i += 1
    raise SystemExit("Unbalanced braces while locating data() object in template")


def replace_data_object(template_html: str, component_data: dict) -> str:
    marker = "data() {"
    marker_idx = template_html.find(marker)
    if marker_idx == -1:
        raise SystemExit("Could not find 'data() {' in the master template's component script")
    return_idx = template_html.index("return", marker_idx)
    brace_start = template_html.index("{", return_idx)
    brace_end = find_matching_brace(template_html, brace_start)

    new_object_literal = json.dumps(component_data, indent=2, ensure_ascii=False)
    return template_html[:brace_start] + new_object_literal + template_html[brace_end + 1:]


def repack_template(html: str, start: int, end: int, new_template_html: str) -> str:
    # The bundler's own convention: escape '/' as / so the HTML parser
    # never sees a literal "</script>" inside the JSON string (the template
    # contains several real <script> tags, including its own closing tag).
    new_json = json.dumps(new_template_html, ensure_ascii=False).replace("/", "\\u002F")
    return html[:start] + new_json + html[end:]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data", required=True, type=Path, help="Path to the client's data YAML file")
    ap.add_argument("--master", required=True, type=Path, help="Path to master-template.html")
    ap.add_argument("--out", required=True, type=Path, help="Path to write the generated client HTML")
    args = ap.parse_args()

    raw_data = load_data(args.data)
    validate(raw_data)
    component_data = to_component_data(raw_data)

    master_html = args.master.read_text(encoding="utf-8")
    template_json_str, start, end = extract_script_json(master_html, "__bundler/template")
    template_html = json.loads(template_json_str)

    new_template_html = replace_data_object(template_html, component_data)
    new_html = repack_template(master_html, start, end, new_template_html)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(new_html, encoding="utf-8")
    print(f"Wrote {args.out} ({len(new_html):,} bytes)")


if __name__ == "__main__":
    main()
