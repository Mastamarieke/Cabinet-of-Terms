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

# Clusters that have been through the full method (the five steps in Doctor Alert, 13-10).
# Add a cluster here when the curator declares it done.
FULL_METHOD = ["Privacy, Data and Control"]

# The table is kept short on purpose (curator, 13-10: "het moet niet te lang worden"):
# three rows, the first two with the entries as links, the third with the clusters only.
all_entries = {}
for cluster_dir in sorted(glob.glob(os.path.join(VAULT, "*"))):
    if not os.path.isdir(cluster_dir) or os.path.basename(cluster_dir) == "Sources":
        continue
    cluster = os.path.basename(cluster_dir)
    if not os.path.exists(os.path.join(cluster_dir, "index.md")):
        continue  # a concept cluster without a page (SF as Inspiration): nothing to link to
    n = 0
    for path in [p for p in glob.glob(os.path.join(cluster_dir, "*.md")) if os.path.basename(p) != "index.md"] + glob.glob(os.path.join(cluster_dir, "*", "index.md")):
        with open(path, encoding="utf-8") as f:
            if re.search(r"^draft:\s*true", frontmatter(f.read()), re.M):
                continue
        n += 1
    if n:
        all_entries[cluster] = n

with_layers = {(c, name) for c, name, *_ in rows}
full = sorted([r for r in rows if r[0] in FULL_METHOD], key=lambda r: r[1].lower())
earlier = sorted([r for r in rows if r[0] not in FULL_METHOD], key=lambda r: (r[0], r[1].lower()))
rest_clusters = sorted(c for c, n in all_entries.items() if n > sum(1 for r in rows if r[0] == c))
rest_count = sum(all_entries.values()) - len(rows)

def grouped(rs):
    parts, by = [], {}
    for r in rs:
        by.setdefault(r[0], []).append(f"[[{r[1]}]]")
    for c in sorted(by):
        parts.append(f"[[{c}]]: " + " · ".join(by[c]))
    return "<br>".join(parts)

lines = [
    "| | entries | which |",
    "|---|---|---|",
    f"| **Full method**: sources, landscape, curve, relations argued in the text | {len(full)} | {grouped(full)} |",
    f"| **Earlier round**: some of the layers, before the current method | {len(earlier)} | {grouped(earlier)} |",
    f"| **Not yet** | {rest_count} | " + " · ".join(f"[[{c}]]" for c in rest_clusters) + " |",
]
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
print(f"table written: {len(full)} full method, {len(earlier)} earlier round, {rest_count} not yet")

# The list of clusters on the All Clusters page (13-10): its text said "The twenty clusters are
# listed below" while Quartz shows no folder listing on a page with its own text, so nothing
# followed, from 12-09 on. Generated here, from the same counts, between the markers.
ALL = os.path.join(VAULT, "index.md")
CSTART, CEND = "<!-- clusters:start -->", "<!-- clusters:end -->"
listing = "\n".join(f"- [[{c}]] · {n} terms" for c, n in sorted(all_entries.items()))
with open(ALL, encoding="utf-8") as f:
    page = f.read()
if CSTART in page and CEND in page:
    page = re.sub(re.escape(CSTART) + r".*?" + re.escape(CEND), CSTART + "\n" + listing + "\n" + CEND, page, flags=re.S)
else:
    page = page.rstrip("\n") + "\n\n" + CSTART + "\n" + listing + "\n" + CEND + "\n"
with open(ALL, "w", encoding="utf-8") as f:
    f.write(page)
print(f"cluster list written: {len(all_entries)} clusters")
