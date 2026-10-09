#!/usr/bin/env python3
"""Orphan and About-page checker — see CLAUDE.md, 'Wezen'.

Three checks, all mechanical:

1. Orphans: a term that no other entry links to. A link from its cluster's About
   page or from the homepage does not count; neither does a link from a source file.
   On 2026-10-09 there were 13, eleven of them orphans since version 1 (May 2026):
   the retroactive-update rule only ever applied to new terms, and the wikilink check
   only asks whether a link resolves, not whether anything links back. Two more lost
   their last inbound link in a clean-up (Shadow Banning in the Algospeak merge,
   UNC when Relevant terms were sharpened). For each orphan the report lists the
   terms it links to that do not link back: the first candidates, not the answer.
   The question that decides is the Backlinks row of Doctor Alert's per-section
   table (V26): which roles in the same situation do not point back yet?
2. About pages: every term must be linked from its own cluster's index.md.
   CLOUD Act and Brussels Effect were missing from Privacy, Data and Control.
3. Counts: the "— N terms" line per cluster on content/index.md must match the
   number of term files in that cluster's folder.

Drafts (draft: true), Concept.md, cluster About pages and anything under Sources/
or with type: source are not terms.

Run from the repo root: python3 scripts/check_orphans.py
Exit code 0 = clean. Exit code 1 = something to look at.
"""
import os
import re
import sys

CONTENT_DIR = os.path.join(os.path.dirname(__file__), "..", "content")
VAULT_DIR = os.path.join(CONTENT_DIR, "Cabinet of Digital Terms")
HOME = os.path.join(CONTENT_DIR, "index.md")

LINK = re.compile(r"\[\[([^\]|#\n]+)")


def read(fpath):
    with open(fpath, encoding="utf-8", errors="ignore") as f:
        return f.read()


def is_source_or_draft(fpath, text):
    if (os.sep + "Sources" + os.sep) in (fpath + os.sep):
        return True
    head = text[:800]
    return bool(re.search(r"^type:\s*source", head, re.MULTILINE)
                or re.search(r"^draft:\s*true", head, re.MULTILINE))


def collect_terms():
    """name -> (path, cluster, text)"""
    terms = {}
    for root, dirs, files in os.walk(VAULT_DIR):
        for fname in files:
            if not fname.endswith(".md") or fname.startswith("._") or fname == "Concept.md":
                continue
            fpath = os.path.join(root, fname)
            if fname == "index.md":
                if os.path.dirname(root) == VAULT_DIR or root == VAULT_DIR:
                    continue  # About page or vault index
                name = os.path.basename(root)
            else:
                name = fname[:-3]
            text = read(fpath)
            if is_source_or_draft(fpath, text):
                continue
            cluster = os.path.relpath(fpath, VAULT_DIR).split(os.sep)[0]
            terms[name] = (fpath, cluster, text)
    return terms


def resolver(terms):
    """Wikilink target (lower case) -> term name, by file name and frontmatter aliases."""
    table = {}
    for name, (_, _, text) in terms.items():
        table[name.lower()] = name
        fm = re.match(r"^---\n(.*?)\n---", text, re.DOTALL)
        if fm:
            block = re.search(r"^aliases:\s*\n((?:\s+-.*\n?)+)", fm.group(1), re.MULTILINE)
            if block:
                for a in re.findall(r"-\s*\"?([^\"\n]+?)\"?\s*$", block.group(1), re.MULTILINE):
                    if "/" not in a:  # path aliases are redirects, not names
                        table.setdefault(a.strip().lower(), name)
    return table


def links_of(text, table):
    out = set()
    for l in LINK.findall(text):
        t = table.get(l.strip().lower())
        if t:
            out.add(t)
    return out


def main():
    terms = collect_terms()
    table = resolver(terms)
    outgoing = {n: links_of(t, table) - {n} for n, (_, _, t) in terms.items()}
    incoming = {n: set() for n in terms}
    for src, targets in outgoing.items():
        for t in targets:
            incoming[t].add(src)

    problems = 0

    orphans = sorted(n for n in terms if not incoming[n])
    if orphans:
        problems += 1
        print(f"{len(orphans)} orphan(s): no other entry links here.")
        print("Question (Doctor Alert, Backlinks): which roles in the same situation do not point back yet?")
        print("Place: a sentence in the Friction of that entry (what falls out of view there, and who has")
        print("an interest in that?), plus its Related terms. An entry with the same image, or the opposite")
        print("one, is a candidate too. The list below is where to start looking, not the answer.\n")
        for n in orphans:
            back = sorted(t for t in outgoing[n] if n not in outgoing[t])
            print(f"[[{n}]]  ({terms[n][1]})")
            if back:
                print(f"  links to, without a link back: {' · '.join(back)}")
        print()

    missing = []
    for n, (_, cluster, _) in sorted(terms.items()):
        about = os.path.join(VAULT_DIR, cluster, "index.md")
        if os.path.exists(about) and n not in links_of(read(about), table):
            missing.append((cluster, n))
    if missing:
        problems += 1
        print(f"{len(missing)} term(s) missing from their cluster's About page:\n")
        for cluster, n in missing:
            print(f"  {cluster}: [[{n}]]")
        print()

    if os.path.exists(HOME):
        home = read(HOME)
        per_cluster = {}
        for _, cluster, _ in terms.values():
            per_cluster[cluster] = per_cluster.get(cluster, 0) + 1
        wrong = []
        for cluster, stated in re.findall(r"<summary><strong>(.+?)</strong>\s*—\s*(\d+) terms</summary>", home):
            actual = per_cluster.get(cluster)
            if actual is not None and actual != int(stated):
                wrong.append((cluster, stated, actual))
        if wrong:
            problems += 1
            print("Cluster counts on content/index.md that do not match the folder:\n")
            for cluster, stated, actual in wrong:
                print(f"  {cluster}: says {stated}, folder has {actual}")
            print()

    if problems:
        return 1
    print("No orphans; About pages and cluster counts match.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
