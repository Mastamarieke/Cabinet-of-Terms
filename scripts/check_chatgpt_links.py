#!/usr/bin/env python3
"""ChatGPT link residue checker — see CLAUDE.md, 'Links uit ChatGPT'.

A link copied from a ChatGPT answer carries traces of where it came from, and
those traces mean the link has not been checked by a person. Three are
mechanical enough to detect:

  - `utm_source=chatgpt.com` in the URL: ChatGPT appends it to every link it
    gives. On the site it reads as if ChatGPT were the source.
  - `**` inside a URL: bold markers from the answer text that ended up in the
    address (`https://**neuralink**.com`), which makes the link go nowhere.
  - a citation like `([bbc.com](https://...))` straight after a link: ChatGPT's
    own source note, duplicating the link before it.

Found on 2026-10-06: 59 tracking tags in 37 entries, six addresses with bold
markers in them, and two citation notes, all live on the site. Nothing signalled
them because each link still resolved or looked like a link.

Run from the repo root: python3 scripts/check_chatgpt_links.py
Exit code 0 = clean. Exit code 1 = residue found (listed with file and line).
"""
import os
import re
import sys

CONTENT_DIR = os.path.join(os.path.dirname(__file__), "..", "content")

CHECKS = [
    ("utm_source=chatgpt.com in link", re.compile(r"utm_source=chatgpt\.com")),
    ("** inside a URL", re.compile(r"\]\(https?://[^)\s]*\*\*")),
    ("ChatGPT citation note after a link", re.compile(r"\(\[[\w.-]+\.[a-z]{2,}\]\(https?://[^)]*\)\)")),
]


def main():
    found = []
    for root, dirs, files in os.walk(CONTENT_DIR):
        for fname in files:
            if not fname.endswith(".md") or fname.startswith("._"):
                continue
            fpath = os.path.join(root, fname)
            with open(fpath, encoding="utf-8", errors="ignore") as f:
                for n, line in enumerate(f, 1):
                    for label, pattern in CHECKS:
                        if pattern.search(line):
                            found.append((os.path.relpath(fpath, CONTENT_DIR), n, label))

    if not found:
        print("No ChatGPT link residue.")
        return 0

    print(f"ChatGPT link residue: {len(found)} line(s). The link has probably not been checked by a person.")
    for path, n, label in found:
        print(f"  {path}:{n} — {label}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
