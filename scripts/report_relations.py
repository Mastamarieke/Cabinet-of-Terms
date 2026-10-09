#!/usr/bin/env python3
"""Relations report — see CLAUDE.md, 'Wezen' and 'Kwaliteit van relaties'.

Not a check and not in the pre-commit hook: it reports signals, the curator judges.
Written 2026-10-09, after the orphan round showed that the real question is not
how many links a term has but what they are worth. A script cannot say whether a
relation adds something (Flexing next to Highlight Reel was correct and added
nothing); it can say where to look. The judgement is the framing per entry:
read the whole entry with the per-section questions of Doctor Alert (appendix
"Per section") beside it.

Signals per entry:
  - argued here, not returned: terms linked in the running text whose own entry
    does not link back anywhere (the one-sided relations orphans come from)
  - named there, not here: entries that argue this term in their text while this
    entry does not mention them
  - Related terms only: relations listed but argued nowhere in the text
  - bold, not linked: existing term names set in bold without a link
  - hubs: linked terms with more than HUB inbound relations, where a link is
    often filler

Run from the repo root:
  python3 scripts/report_relations.py            vault summary
  python3 scripts/report_relations.py "Term"     one entry
Always exits 0.
"""
import collections
import os
import re
import sys

sys.dont_write_bytecode = True  # importing check_orphans would otherwise leave scripts/__pycache__/
sys.path.insert(0, os.path.dirname(__file__))
from check_orphans import collect_terms, resolver, links_of  # noqa: E402

HUB = 30
RELATED = re.compile(r"\*\*Related terms:?\*\*:?(.*)")
BOLD = re.compile(r"\*\*([^*\n]{3,60})\*\*")


def split(text):
    """Running text (without frontmatter, Related terms line and Read more) and the Related terms line."""
    body = re.sub(r"^---\n.*?\n---", "", text, count=1, flags=re.DOTALL)
    body = re.split(r"\*\*Read more", body)[0]
    body = re.split(r"\*Read more", body)[0]
    m = RELATED.search(body)
    if m:
        return body[: m.start()], m.group(1)
    return body, ""


def build():
    terms = collect_terms()
    table = resolver(terms)
    inline, related, bold = {}, {}, {}
    for name, (_, _, text) in terms.items():
        running, rel = split(text)
        inline[name] = links_of(running, table) - {name}
        related[name] = links_of(rel, table) - {name}
        found, seen = [], set()
        for b in BOLD.findall(running):
            t = table.get(b.strip().lower())
            if t and t != name and t not in inline[name] and t not in seen:
                seen.add(t)
                found.append((b.strip(), t))
        bold[name] = found
    inbound = collections.Counter(t for n in terms for t in inline[n] | related[n])
    return terms, inline, related, bold, inbound


def mentions(a, b, inline, related):
    return b in inline[a] or b in related[a]


def entry(name, terms, inline, related, bold, inbound):
    _, cluster, _ = terms[name]
    print(f"{name}  ({cluster})")
    print(f"  inbound relations: {inbound[name]}")

    one_sided = sorted(t for t in inline[name] if not mentions(t, name, inline, related))
    print(f"\n  Argued here, not returned ({len(one_sided)}): {' · '.join(one_sided) or '—'}")
    print("    Ask in that entry: which roles in the same situation do not point back yet?")

    named_there = sorted(n for n in terms if name in inline[n] and not mentions(name, n, inline, related))
    print(f"\n  Named there, not here ({len(named_there)}): {' · '.join(named_there) or '—'}")
    print("    Ask here: does this relation answer a question of one of the sections? If not, Related terms is enough.")

    only = sorted(related[name] - inline[name])
    print(f"\n  Related terms only ({len(only)} of {len(related[name] | inline[name])}): {' · '.join(only) or '—'}")
    print("    Ask: which of these would make a section sharper (Origin: history; Literal meaning: a related word;")
    print("    Friction: mechanism, what falls out of view)? Write nothing where the term adds nothing.")

    print(f"\n  Bold, not linked ({len(bold[name])}): {' · '.join(f'{b} → [[{t}]]' for b, t in bold[name]) or '—'}")
    print("    The text already makes the relation; a link may be all it needs (gloss rule applies).")

    hubs = sorted((t for t in inline[name] | related[name] if inbound[t] > HUB), key=lambda t: -inbound[t])
    print(f"\n  Hubs linked ({len(hubs)}): {' · '.join(f'{t} ({inbound[t]})' for t in hubs) or '—'}")
    print("    Ask: does this entry say something about the hub that the other forty do not?")


def summary(terms, inline, related, bold, inbound):
    pairs = sum(len(inline[n]) for n in terms)
    one_sided = sum(1 for n in terms for t in inline[n] if not mentions(t, n, inline, related))
    rel_total = sum(len(inline[n] | related[n]) for n in terms)
    rel_only = sum(len(related[n] - inline[n]) for n in terms)
    bold_total = sum(len(bold[n]) for n in terms)
    orphans = sorted(n for n in terms if not any(n in inline[m] or n in related[m] for m in terms if m != n))

    print(f"Relations report — {len(terms)} entries\n")
    print(f"  links argued in the text:              {pairs}")
    print(f"    of which not returned by the other:  {one_sided} ({one_sided * 100 // max(pairs, 1)}%)")
    print(f"  relations in Related terms only:       {rel_only} of {rel_total} ({rel_only * 100 // max(rel_total, 1)}%)")
    print(f"  bold term names without a link:        {bold_total}")
    print(f"  orphans:                               {len(orphans)}")
    print(f"\n  Hubs (> {HUB} inbound): " + " · ".join(f"{t} ({c})" for t, c in inbound.most_common() if c > HUB))

    worst = sorted(terms, key=lambda n: -len(related[n] - inline[n]))[:10]
    print("\n  Most Related-terms-only relations: " + " · ".join(f"{n} ({len(related[n] - inline[n])})" for n in worst))
    boldest = sorted((n for n in terms if bold[n]), key=lambda n: -len(bold[n]))[:10]
    print("  Most bold-not-linked: " + " · ".join(f"{n} ({len(bold[n])})" for n in boldest))
    print('\nFor one entry: python3 scripts/report_relations.py "Term"')


def main():
    terms, inline, related, bold, inbound = build()
    if len(sys.argv) > 1:
        wanted = " ".join(sys.argv[1:]).strip().lower()
        match = [n for n in terms if n.lower() == wanted] or [n for n in terms if wanted in n.lower()]
        if not match:
            print(f"No entry matches '{wanted}'.")
            return 0
        for n in match:
            entry(n, terms, inline, related, bold, inbound)
            print()
        return 0
    summary(terms, inline, related, bold, inbound)
    return 0


if __name__ == "__main__":
    sys.exit(main())
