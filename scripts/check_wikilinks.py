#!/usr/bin/env python3
"""Wikilink checker — see CLAUDE.md, 'Wikilink-check script'.

Run from the repo root: python3 scripts/check_wikilinks.py
Exit code 0 = clean. Exit code 1 = broken wikilinks found in published content.

Broken links inside a Concept.md are not an error — a draft cluster (`draft: true`)
intentionally forward-references terms that don't exist yet. Everything else must resolve.
"""
import os
import re
import sys

CONTENT_DIR = os.path.join(os.path.dirname(__file__), "..", "content")
VAULT_DIR = os.path.join(CONTENT_DIR, "Cabinet of Digital Terms")


def main():
    valid = set()
    for root, dirs, files in os.walk(VAULT_DIR):
        for f in files:
            if f.endswith(".md") and not f.startswith("._"):
                if f == "index.md":
                    valid.add(os.path.basename(root))
                else:
                    valid.add(f[:-3])

    broken_all = {}
    for root, dirs, files in os.walk(VAULT_DIR):
        for fname in sorted(files):
            if not fname.endswith(".md") or fname.startswith("._"):
                continue
            if fname == "Concept.md":
                continue  # draft clusters intentionally forward-reference unwritten terms
            fpath = os.path.join(root, fname)
            rel_path = os.path.relpath(fpath, VAULT_DIR)
            with open(fpath, encoding="utf-8", errors="ignore") as f:
                content = f.read()
            links = re.findall(r"\[\[([^\]|#\n]+)", content)
            broken = sorted(set(l.strip() for l in links if l.strip() not in valid))
            if broken:
                broken_all[rel_path] = broken

    if broken_all:
        print(f"{len(broken_all)} file(s) with broken wikilinks:\n")
        for fname, links in sorted(broken_all.items()):
            print(f"{fname}:")
            for l in links:
                print(f"  [[{l}]]")
        return 1

    print("All wikilinks valid.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
