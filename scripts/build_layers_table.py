#!/usr/bin/env python3
"""Rebuild the table of method layers on the homepage (content/index.md) from the
entries themselves — see CLAUDE.md, 'De lagentabel op de homepage wordt gegenereerd'.

The table (Sources folder, semantic landscape, attention curve, Narrative Typography)
was kept by hand and drifted: on 2026-10-13 it listed 10 entries while 34 carried at
least one layer; the whole of Gender & Identity (07-10) and Privacy, Data and Control
(10-10 to 13-10) were missing. A list that can be derived is derived.

Per entry: a Sources folder next to Term/index.md; `semantic_landscape:` and
`entry_image:` in the frontmatter; attention.json (folder) or attention-Term.json (flat),
with the number of series drawn. Grouped by cluster, entries alphabetical. The table is
written between the markers <!-- layers:start --> and <!-- layers:end -->.

Run from the repo root: python3 scripts/build_layers_table.py
"""
import glob
import json
import os
import re

ROOT = os.path.join(os.path.dirname(__file__), "..")
VAULT = os.path.join(ROOT, "content", "Cabinet of Digital Terms")
INDEX = os.path.join(ROOT, "content", "index.md")
START, END = "<!-- layers:start -->", "<!-- layers:end -->"


def frontmatter(text):
    m = re.match(r"---\n(.*?)\n---", text, re.S)
    return m.group(1) if m else ""


def curve_sources(path):
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, ValueError):
        return 0
    return len(data.get("series", []))


rows = []
for cluster_dir in sorted(glob.glob(os.path.join(VAULT, "*"))):
    if not os.path.isdir(cluster_dir) or os.path.basename(cluster_dir) == "Sources":
        continue
    cluster = os.path.basename(cluster_dir)
    candidates = [p for p in glob.glob(os.path.join(cluster_dir, "*.md")) if os.path.basename(p) != "index.md"]
    candidates += glob.glob(os.path.join(cluster_dir, "*", "index.md"))
    for path in candidates:
        folder = path.endswith(os.sep + "index.md")
        here = os.path.dirname(path)
        name = os.path.basename(here) if folder else os.path.basename(path)[:-3]
        with open(path, encoding="utf-8") as f:
            fm = frontmatter(f.read())
        if re.search(r"^draft:\s*true", fm, re.M):
            continue
        sources = folder and os.path.isdir(os.path.join(here, "Sources"))
        landscape = re.search(r"^semantic_landscape:", fm, re.M) is not None
        image = re.search(r"^entry_image:", fm, re.M) is not None
        curve_file = os.path.join(here, "attention.json") if folder else os.path.join(here, f"attention-{name}.json")
        n = curve_sources(curve_file) if os.path.exists(curve_file) else 0
        if sources or landscape or n or image:
            rows.append((cluster, name, sources, landscape, n, image))

tick = lambda b: "✓" if b else ""
lines = [
    "| Cluster | Entry | Sources folder | Semantic landscape | Attention curve | Narrative Typography |",
    "|---|---|---|---|---|---|",
]
previous = None
for cluster, name, sources, landscape, n, image in sorted(rows, key=lambda r: (r[0], r[1].lower())):
    shown = cluster if cluster != previous else ""
    previous = cluster
    curve = f"✓ ({n} source{'s' if n != 1 else ''})" if n else ""
    lines.append(f"| {shown} | **[[{name}]]** | {tick(sources)} | {tick(landscape)} | {curve} | {tick(image)} |")
table = "\n".join(lines)

with open(INDEX, encoding="utf-8") as f:
    text = f.read()
if START in text and END in text:
    text = re.sub(re.escape(START) + r".*?" + re.escape(END), START + "\n" + table + "\n" + END, text, flags=re.S)
else:
    # first run: replace the hand-made table that follows the introducing sentence
    m = re.search(r"(Four layers can be added to an entry[^\n]*\n\n)(\|.*?\n)(?=\n)", text, re.S)
    if not m:
        raise SystemExit("table not found in content/index.md; add the markers by hand")
    text = text[: m.start(2)] + START + "\n" + table + "\n" + END + "\n" + text[m.end(2):]
with open(INDEX, "w", encoding="utf-8") as f:
    f.write(text)
print(f"{len(rows)} entries with at least one layer written to content/index.md")
