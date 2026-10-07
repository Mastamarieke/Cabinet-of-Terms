#!/usr/bin/env python3
"""DOI checker — see CLAUDE.md, 'DOI's die niet bestaan'.

Every `doi.org/...` link in content/ is looked up in the DOI registry
(doi.org's handle API). A DOI that is not registered points nowhere, yet on
the site it looks exactly like a scholarly source.

Found on 2026-10-07: 17 of the 67 DOIs in the vault did not exist, in 16
entries. Most came from the first generation of Read more lists, written with
a language model: some had a wrong prefix for a real article (Horton & Wohl,
1956), most belonged to a source whose title, author, year or journal had been
invented along with the DOI. Nothing signalled them, because a DOI link only
fails when someone clicks it.

Needs an internet connection, so it does not run in the pre-commit hook; run it
by hand before a push. Uses curl, because Python's own HTTPS fails on this Mac.

Run from the repo root: python3 scripts/check_dois.py
Exit code 0 = every DOI is registered. Exit code 1 = unregistered DOIs (listed
with file and line). Exit code 2 = the registry could not be reached.
"""
import json
import os
import subprocess
import sys
import time
import urllib.parse

CONTENT_DIR = os.path.join(os.path.dirname(__file__), "..", "content")
UA = "CabinetOfDigitalTerms/1.0 (https://digitale-alertheid.nl; info@digitale-alertheid.nl)"


def dois_in(line):
    """DOIs after 'doi.org/', stopping at whitespace or an unmatched ')'.
    Parentheses inside a DOI, as in 10.1016/0165-4896(82)90076-2, are kept."""
    out, start = [], 0
    while True:
        i = line.find("doi.org/", start)
        if i < 0:
            return out
        j, depth = i + len("doi.org/"), 0
        while j < len(line) and not line[j].isspace():
            if line[j] == "(":
                depth += 1
            elif line[j] == ")":
                if depth == 0:
                    break
                depth -= 1
            elif line[j] in "]>\"'":
                break
            j += 1
        doi = urllib.parse.unquote(line[i + len("doi.org/"):j].rstrip(".,;"))
        if doi.startswith("10."):
            out.append(doi)
        start = j


def registered(doi):
    url = "https://doi.org/api/handles/" + urllib.parse.quote(doi, safe="/()")
    try:
        r = subprocess.run(["curl", "-s", "-m", "20", "-A", UA, url],
                           capture_output=True, text=True, timeout=30)
        return json.loads(r.stdout).get("responseCode") == 1
    except Exception:
        return None


def main():
    where = {}
    for root, dirs, files in os.walk(CONTENT_DIR):
        for fname in files:
            if not fname.endswith(".md") or fname.startswith("._"):
                continue
            path = os.path.join(root, fname)
            with open(path, encoding="utf-8") as f:
                for n, line in enumerate(f, 1):
                    for doi in dois_in(line):
                        where.setdefault(doi, []).append((os.path.relpath(path, CONTENT_DIR), n))

    bad, unreachable = [], 0
    for doi in sorted(where):
        ok = registered(doi)
        if ok is None:
            unreachable += 1
        elif not ok:
            bad.append(doi)
        time.sleep(0.2)

    if unreachable == len(where) and where:
        print("DOI registry could not be reached; nothing checked.")
        return 2
    for doi in bad:
        for path, n in where[doi]:
            print(f"{path}:{n}  {doi}")
    print(f"{len(where)} DOIs checked, {len(bad)} not registered"
          + (f", {unreachable} not reachable" if unreachable else "") + ".")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
