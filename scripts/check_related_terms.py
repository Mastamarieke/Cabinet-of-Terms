#!/usr/bin/env python3
"""Related terms checker — see CLAUDE.md, 'Related terms-check script'.

Checks the mandatory direction: every term inline-linked in the running text
must also appear in the Related terms line. Source files (Sources/ folders,
or any file tagged `source`) are excluded — they are not term relations.
Related terms may hold more than the body discusses (see CLAUDE.md); that
direction is not checked here.

Run from the repo root: python3 scripts/check_related_terms.py
Exit code 0 = clean. Exit code 1 = an inline term is missing from Related terms.
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
    source_names = set()
    for dirpath, dirnames, filenames in os.walk(VAULT_DIR):
        for fname in filenames:
            if not fname.endswith(".md") or fname.startswith("._"):
                continue
            fpath = os.path.join(dirpath, fname)
            if is_source_file(fpath):
                name = fname[:-3] if fname != "index.md" else os.path.basename(dirpath)
                source_names.add(name)

    violations = {}
    for dirpath, dirnames, filenames in os.walk(VAULT_DIR):
        for fname in filenames:
            if not fname.endswith(".md") or fname.startswith("._"):
                continue
            fpath = os.path.join(dirpath, fname)
            if (os.sep + "Sources" + os.sep) in (fpath + os.sep):
                continue
            rel_path = os.path.relpath(fpath, VAULT_DIR)
            with open(fpath, encoding="utf-8", errors="ignore") as f:
                content = f.read()
            m = re.search(r"\*\*Related terms:\*\*(.*)", content)
            if not m:
                continue
            related_line = m.group(1)
            related_targets = set(
                l.split("|")[0].strip() for l in re.findall(r"\[\[([^\]]+)\]\]", related_line)
            )
            # Prototype (2026-10-10, Surveillance Capitalism): an "In the text" line lists the
            # terms the running text discusses; Related terms then holds only the side paths,
            # each with a short reason. The In the text line must match the body exactly.
            it = re.search(r"\*\*In the text:\*\*(.*)", content)
            body_end = it.start() if it and it.start() < m.start() else m.start()
            body = content[:body_end]
            fm_end = re.match(r"^---.*?---\s*", body, flags=re.DOTALL)
            if fm_end:
                body = body[fm_end.end() :]
            this_term = os.path.basename(dirpath) if fname == "index.md" else fname[:-3]
            body_targets = [l.split("|")[0].strip() for l in re.findall(r"\[\[([^\]]+)\]\]", body)]
            body_targets = [t for t in body_targets if t != this_term and t not in source_names]
            if it and it.start() < m.start():
                listed = set(l.split("|")[0].strip() for l in re.findall(r"\[\[([^\]]+)\]\]", it.group(1)))
                missing = sorted(set(body_targets) - listed)
                extra = sorted(listed - set(body_targets))
                if missing or extra:
                    violations[rel_path] = missing + [f"(not in the text: {e})" for e in extra]
                continue
            missing = [t for t in body_targets if t not in related_targets]
            if missing:
                violations[rel_path] = missing

    if violations:
        print(f"{len(violations)} file(s) with inline terms missing from Related terms:\n")
        for fpath, missing in sorted(violations.items()):
            print(f"{fpath}: {missing}")
        return 1

    print("All inline terms are reflected in Related terms.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
