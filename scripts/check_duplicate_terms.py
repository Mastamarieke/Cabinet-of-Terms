#!/usr/bin/env python3
"""Duplicate term checker — see CLAUDE.md, 'Een bestand per term'.

A term must live in exactly one file. Two files resolving to the same term name
(a flat Term.md and/or a Term/index.md) break Quartz's shortest-path wikilink
resolution: with more than one match, it falls back to an absolute-path
interpretation that points nowhere, so every existing [[Term]] link across the
vault silently resolves to a dead page. This happened, unnoticed, to Algospeak,
Podcast-bro, Red Pill, and Ragebaiting before this script existed.

Cluster-root index.md files (About-pages) and Sources/ material (source_role,
type: source, or anything under a Sources/ folder) are not terms and are excluded.

Run from the repo root: python3 scripts/check_duplicate_terms.py
Exit code 0 = clean. Exit code 1 = a term name resolves to more than one file.
"""
import os
import re
import sys

CONTENT_DIR = os.path.join(os.path.dirname(__file__), "..", "content")
VAULT_DIR = os.path.join(CONTENT_DIR, "Cabinet of Digital Terms")


def is_source_file(fpath):
    if (os.sep + "Sources" + os.sep) in (fpath + os.sep):
        return True
    with open(fpath, encoding="utf-8", errors="ignore") as f:
        head = f.read(500)
    return bool(re.search(r"^type:\s*source", head, re.MULTILINE))


def main():
    names = {}
    for root, dirs, files in os.walk(VAULT_DIR):
        for fname in files:
            if not fname.endswith(".md") or fname.startswith("._"):
                continue
            if fname == "Concept.md":
                continue  # draft clusters, not terms
            fpath = os.path.join(root, fname)
            if is_source_file(fpath):
                continue

            if fname == "index.md":
                if os.path.dirname(root) == VAULT_DIR:
                    continue  # cluster-root About page, not a term
                name = os.path.basename(root)
            else:
                name = fname[:-3]

            rel_path = os.path.relpath(fpath, VAULT_DIR)
            names.setdefault(name, []).append(rel_path)

    duplicates = {name: paths for name, paths in names.items() if len(paths) > 1}

    if duplicates:
        print(f"{len(duplicates)} term name(s) resolving to more than one file:\n")
        for name, paths in sorted(duplicates.items()):
            print(f"[[{name}]]:")
            for p in paths:
                print(f"  {p}")
        return 1

    print("No duplicate term names.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
