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

    # term names, so that a bold name in a semantic landscape can be matched to its entry;
    # "SMV" answers for "SMV (Sexual Market Value)" as on the site (GraphStory.tsx)
    term_names = {}
    for dirpath, dirnames, filenames in os.walk(VAULT_DIR):
        if (os.sep + "Sources") in dirpath:
            continue
        for fname in filenames:
            if not fname.endswith(".md") or fname.startswith("._"):
                continue
            if fname == "index.md" and os.path.dirname(dirpath) == VAULT_DIR:
                continue  # a cluster's About page: a bold cluster name is not a relation
            if fname == "index.md" and dirpath == VAULT_DIR:
                continue
            name = os.path.basename(dirpath) if fname == "index.md" else fname[:-3]
            term_names[name.lower()] = name
            short = re.sub(r"\s*\(.*\)$", "", name)
            term_names.setdefault(short.lower(), name)

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
                # an In the text line without a Related terms line (11-10, Dataism): the site hides
                # In the text, so the reader saw no related terms at all, and this check skipped the file
                if re.search(r"\*\*In the text:\*\*", content):
                    violations[rel_path] = ["(no Related terms line: In the text is hidden on the site)"]
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
            # a link to a heading, [[Source#3. Title|label]], points at the file before the #
            body_targets = [l.split("|")[0].split("#")[0].strip() for l in re.findall(r"\[\[([^\]]+)\]\]", body)]
            # a markdown link to another entry counts too (11-10): [phrase](<Term> "where it goes"),
            # the link that opens a line saying where the story continues; links out (http) do not
            body_targets += [l.strip() for l in re.findall(r"\]\(<([^>]+)>", body) if not l.startswith("http")]
            body_targets = [t for t in body_targets if t != this_term and t not in source_names]
            if it and it.start() < m.start():
                listed = set(l.split("|")[0].strip() for l in re.findall(r"\[\[([^\]]+)\]\]", it.group(1)))
                # since 11-10 In the text also lists the terms the semantic landscape tells (bold
                # names that match an entry): an argued relation, not a side path
                land = re.search(r"^semantic_landscape:\s*\|\s*\n((?:[ \t]+.*\n|\s*\n)*)", content, re.M)
                land_targets = set()
                if land:
                    for b in re.findall(r"\*\*([^*]+)\*\*", land.group(1)):
                        t = term_names.get(b.strip().lower())
                        if t and t != this_term:
                            land_targets.add(t)
                expected = set(body_targets) | land_targets
                missing = sorted(expected - listed)
                extra = sorted(listed - expected)
                if missing or extra:
                    violations[rel_path] = missing + [f"(not in the text or landscape: {e})" for e in extra]
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
