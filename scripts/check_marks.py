#!/usr/bin/env python3
"""Marks checker — see CLAUDE.md, 'Linkjes in de tekst'.

A phrase in ==highlight== belongs to a mark: a source in brackets after it
("([[Source|Author, 2025]]: gloss)") becomes an asterisk, a footnote ([^name])
becomes a ▾ note. The site's script (citations.inline.ts) makes the highlight the
phrase that lights up. When it cannot find the mark, the highlight stays on the
page as a yellow marker and the source stays as brackets, and nothing says so.

Found on 2026-10-11 in Algorithmic Violence: a gloss with a semicolon in it
("revealed by NOS op 3 and Investico; an investigation found …") stopped thescript, so the source never became an asterisk. Three checks:

  - a highlight with no mark after it in the same paragraph (no footnote, no
    source in brackets before the next highlight);
  - a gloss after a source that contains a semicolon followed by text that is not
    another source: the script stops there;
  - bold, italics or a [[link]] inside a highlight: the page then shows the == signs
    as text (found the same day: ==a contract with **Palantir**== in "Like Prime",
    ==[[BUMMER]]== in Surveillance Capitalism).

Run from the repo root: python3 scripts/check_marks.py
Exit code 0 = clean. Exit code 1 = something to look at (file and line).
Reports, does not block.
"""
import os
import re
import sys

CONTENT_DIR = os.path.join(os.path.dirname(__file__), "..", "content")

HL = re.compile(r"==(?!=)(.+?)==")
MARK = re.compile(r"\[\^[^\]]+\]|\(\s*\[")
# a gloss after a source: "]]: … ; text" or "): … ; text" where text does not start a new source
SEMI = re.compile(r"(\]\]|\]\([^)]*\)):[^()]*?;\s*(?!\[)[^\s)]")


def body_lines(text):
    lines = text.split("\n")
    start = 0
    if lines and lines[0].strip() == "---":
        for i in range(1, len(lines)):
            if lines[i].strip() == "---":
                start = i + 1
                break
    return [(n + 1, l) for n, l in enumerate(lines) if n >= start]


def check(path):
    problems = []
    text = open(path, encoding="utf-8").read()
    if "==" not in text:
        return problems
    for n, line in body_lines(text):
        if line.startswith("[^") or line.startswith("**Related terms") or line.startswith("**In the text"):
            continue
        hls = list(HL.finditer(line))
        for k, m in enumerate(hls):
            end = hls[k + 1].start() if k + 1 < len(hls) else len(line)
            after = line[m.end():end]
            if "*" in m.group(1) or "[[" in m.group(1):
                problems.append((n, f"bold, italics or a link inside a highlight breaks it on the site: =={m.group(1)[:60]}=="))
            if not MARK.search(after):
                problems.append((n, f"highlight without a source or note after it: =={m.group(1)[:60]}=="))
        for m in SEMI.finditer(line):
            problems.append((n, f"semicolon in a gloss stops the asterisk: …{line[m.start():m.end() + 30][:90]}…"))
    return problems


def main():
    found = 0
    for root, _, files in os.walk(CONTENT_DIR):
        for f in files:
            if not f.endswith(".md") or f == "Concept.md":
                continue
            path = os.path.join(root, f)
            for n, msg in check(path):
                print(f"{os.path.relpath(path, CONTENT_DIR)}:{n}: {msg}")
                found += 1
    if found:
        print(f"\n{found} mark(s) to look at. A highlight needs a source in brackets or a footnote after it;")
        print("a gloss after a source has no semicolon, brackets or italics (CLAUDE.md, 'Linkjes in de tekst').")
        sys.exit(1)
    print("Marks: every highlight has its source or note.")


if __name__ == "__main__":
    main()
