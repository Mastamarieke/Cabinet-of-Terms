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
  python3 scripts/report_relations.py --kandidaten   candidate missing relations
Both also write a Markdown file to werk/relaties/ (gitignored, local only):
overzicht.md for the vault, <Term>.md for one entry. Read it in VS Code with
the Markdown preview (Cmd+Shift+V). Obsidian opens only content/, so werk/ is
outside the vault: the wikilinks are not clickable there, and in exchange the
reports do not show up as backlinks of every entry. The file is generated and
overwritten on every run; notes belong elsewhere.

--kandidaten looks for relations that are missing altogether (Tech Neck and
Wexting: same posture, same cluster, never linked; no check finds that). Three
lenses, each tied to a framing question in Doctor Alert:
  1. named, not linked: a term name in the running text (plain or bold), while
     the two entries are not related anywhere (the lemma: the word is already there)
  2. word family: two terms built on the same part (-fluencer, -pill, -washing …)
     that are not related (blending / metaphor: same building block, same image)
  3. same situation: two terms in the same cluster, neither a hub, with three or
     more neighbours in common (frame: roles in one scene)
A fourth lens, reading a cluster with question 2 in mind, is not a script.
Every decision goes into werk/relaties/besluiten.md, including "nee"; decided
pairs are not proposed again. Output: werk/relaties/kandidaten.md.
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
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "werk", "relaties")
TODAY = __import__("datetime").date.today().isoformat()
FAMILIES = ["fluencer", "pill", "maxxing", "washing", "sphere", " male", "scrolling", "doom"]
DECISIONS = os.path.join(OUT_DIR, "besluiten.md")
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


def wl(names):
    return " · ".join(f"[[{n}]]" for n in names) or "—"


def entry_md(name, terms, inline, related, bold, inbound):
    _, cluster, _ = terms[name]
    one_sided = sorted(t for t in inline[name] if not mentions(t, name, inline, related))
    named_there = sorted(n for n in terms if name in inline[n] and not mentions(name, n, inline, related))
    only = sorted(related[name] - inline[name])
    hubs = sorted((t for t in inline[name] | related[name] if inbound[t] > HUB), key=lambda t: -inbound[t])
    out = [
        f"# Relaties — [[{name}]]",
        "",
        f"*{cluster} · {inbound[name]} inkomende relaties · gegenereerd {TODAY} door `scripts/report_relations.py`; wordt bij elke run overschreven.*",
        "",
        "Signalen, geen oordeel. Lees de hele entry met de vragen per onderdeel ernaast (Doctor Alert, bijlage *Per section*). Waar een relatie niets toevoegt: alleen Related terms, geen zin.",
        "",
        f"## Hier besproken, daar niet beantwoord ({len(one_sided)})",
        "",
        wl(one_sided),
        "",
        "*Vraag in die entry:* welke rollen uit dezelfde situatie wijzen nog niet terug?",
        "",
        f"## Daar besproken, hier niet genoemd ({len(named_there)})",
        "",
        wl(named_there),
        "",
        "*Vraag hier:* beantwoordt deze relatie de vraag van een onderdeel? Zo niet, dan is Related terms genoeg.",
        "",
        f"## Alleen in Related terms ({len(only)} van {len(related[name] | inline[name])})",
        "",
        wl(only),
        "",
        "*Vraag:* welke maakt een onderdeel scherper? Origin: geschiedenis. Literal meaning: een verwant woord. Friction: mechanisme, wat buiten beeld valt en wie daar belang bij heeft. Schrijf niets waar de term niets toevoegt.",
        "",
        f"## Vet, zonder link ({len(bold[name])})",
        "",
        " · ".join(f"*{b}* → [[{t}]]" for b, t in bold[name]) or "—",
        "",
        "*De tekst legt de relatie al; misschien is een link genoeg (met omschrijving: gloss-regel).*",
        "",
        f"## Hubs ({len(hubs)})",
        "",
        " · ".join(f"[[{t}]] ({inbound[t]})" for t in hubs) or "—",
        "",
        "*Vraag:* zegt deze entry iets over de hub wat de veertig andere niet zeggen?",
        "",
    ]
    return out


def summary_md(terms, inline, related, bold, inbound):
    pairs = sum(len(inline[n]) for n in terms)
    one_sided = sum(1 for n in terms for t in inline[n] if not mentions(t, n, inline, related))
    rel_total = sum(len(inline[n] | related[n]) for n in terms)
    rel_only = sum(len(related[n] - inline[n]) for n in terms)
    bold_total = sum(len(bold[n]) for n in terms)
    orphans = sorted(n for n in terms if not any(n in inline[m] or n in related[m] for m in terms if m != n))
    out = [
        "# Relaties — overzicht van de vault",
        "",
        f"*{len(terms)} entries · gegenereerd {TODAY} door `scripts/report_relations.py`; wordt bij elke run overschreven. Per entry: `python3 scripts/report_relations.py \"Term\"`.*",
        "",
        "Signalen, geen oordeel: waar je kijkt bij een herziening, niet wat er moet veranderen.",
        "",
        "| | |",
        "|---|---|",
        f"| links in de lopende tekst | {pairs} |",
        f"| waarvan door de andere entry nergens beantwoord | {one_sided} ({one_sided * 100 // max(pairs, 1)}%) |",
        f"| relaties alleen in Related terms | {rel_only} van {rel_total} ({rel_only * 100 // max(rel_total, 1)}%) |",
        f"| vetgedrukte termnamen zonder link | {bold_total} |",
        f"| wezen | {len(orphans)} {wl(orphans) if orphans else ''} |",
        "",
        f"**Hubs (meer dan {HUB} inkomend):** " + " · ".join(f"[[{t}]] ({c})" for t, c in inbound.most_common() if c > HUB),
        "",
        "## Alle entries",
        "",
        "*Kolommen: inkomend = relaties naar deze entry; eenzijdig = hier besproken, daar niet beantwoord; alleen RT = alleen in Related terms; vet = vetgedrukte termnaam zonder link; hubs = gelinkte hubs.*",
        "",
        "| entry | cluster | inkomend | eenzijdig | alleen RT | vet | hubs |",
        "|---|---|---|---|---|---|---|",
    ]
    for n in sorted(terms, key=lambda x: (terms[x][1], x.lower())):
        os_ = sum(1 for t in inline[n] if not mentions(t, n, inline, related))
        hubs = sum(1 for t in inline[n] | related[n] if inbound[t] > HUB)
        out.append(f"| [[{n}]] | {terms[n][1]} | {inbound[n]} | {os_} | {len(related[n] - inline[n])} | {len(bold[n])} | {hubs} |")
    out.append("")
    return out


def write(lines, filename):
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    return os.path.relpath(path, os.path.join(os.path.dirname(__file__), ".."))



def decided_pairs():
    """Pairs already judged by the curator, from besluiten.md: lines '- [[A]] — [[B]] · …'."""
    pairs = set()
    if os.path.exists(DECISIONS):
        with open(DECISIONS, encoding="utf-8") as f:
            for line in f:
                m = re.match(r"\s*-\s*\[\[([^\]|]+)\]\]\s*—\s*\[\[([^\]|]+)\]\]", line)
                if m:
                    pairs.add(frozenset((m.group(1).strip(), m.group(2).strip())))
    return pairs


def ensure_decisions_file():
    if os.path.exists(DECISIONS):
        return
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(DECISIONS, "w", encoding="utf-8") as f:
        f.write("""# Besluiten over relaties

Door de curator, met de hand bijgehouden; **dit bestand wordt niet overschreven**. Een paar dat hier staat, stelt `report_relations.py --kandidaten` niet opnieuw voor. Ook "nee" opschrijven: anders komt het paar elke keer terug.

Vorm, één regel per paar:

`- [[Term A]] — [[Term B]] · zin in <entry>, <sectie> / alleen Related terms / nee · reden · datum`

## Besluiten

""")


def sentence_around(text, i):
    st = max(text.rfind(". ", 0, i), text.rfind("\n", 0, i)) + 1
    en = text.find(". ", i)
    en = len(text) if en < 0 else en + 1
    return text[st:en].strip().replace("\n", " ")


def candidate_pairs(terms, inline, related, inbound, done=frozenset()):
    """The three lenses as data: lens1 [(entry, term, sentence)], lens2 [(family, a, b)], lens3 {cluster: [(k, a, b, common)]}."""
    nb = {n: inline[n] | related[n] for n in terms}
    for n in terms:
        for m in inline[n] | related[n]:
            nb[m] = nb[m] | {n}
    open_pair = lambda a, b: b not in nb[a] and frozenset((a, b)) not in done

    # 1. named, not linked
    names = {}
    for n in terms:
        names[n.lower()] = n
        short = n.split(" (")[0]
        if short != n and len(short) >= 5:
            names.setdefault(short.lower(), n)
    lens1 = []
    for n in sorted(terms, key=str.lower):
        running, _ = split(terms[n][2])
        plain = re.sub(r"\[\[[^\]]*\]\]", "", running)
        seen = set()
        for k, m in names.items():
            if m == n or m in seen or len(k) < 5 or not open_pair(n, m):
                continue
            hit = re.search(r"(?<![\w-])" + re.escape(k) + r"(?![\w-])", plain, re.IGNORECASE)
            if hit:
                seen.add(m)
                readable = re.sub(r"\[\[(?:[^\]|]+\|)?([^\]]+)\]\]", r"\1", running)
                j = readable.lower().find(hit.group(0).lower())
                lens1.append((n, m, sentence_around(readable, max(j, 0))))

    # 2. word family
    lens2 = []
    for fam in FAMILIES:
        members = sorted((n for n in terms if fam in n.lower()), key=str.lower)
        for i, a in enumerate(members):
            for b in members[i + 1:]:
                if open_pair(a, b):
                    lens2.append((fam.strip(), a, b))

    # 3. same situation
    lens3 = collections.defaultdict(list)
    ns = sorted(terms, key=str.lower)
    for i, a in enumerate(ns):
        for b in ns[i + 1:]:
            if terms[a][1] != terms[b][1] or inbound[a] > HUB or inbound[b] > HUB or not open_pair(a, b):
                continue
            common = sorted((nb[a] & nb[b]) - {a, b})
            if len(common) >= 3:
                lens3[terms[a][1]].append((len(common), a, b, common))

    return lens1, lens2, lens3


def candidates_md(terms, inline, related, bold, inbound):
    ensure_decisions_file()
    done = decided_pairs()
    lens1, lens2, lens3 = candidate_pairs(terms, inline, related, inbound, done)
    out = [
        "# Ontbrekende relaties — kandidaten",
        "",
        f"*Gegenereerd {TODAY} door `python3 scripts/report_relations.py --kandidaten`; wordt bij elke run overschreven. Besluiten horen in [besluiten.md](besluiten.md); wat daar staat, komt hier niet meer terug ({len(done)} besloten).*",
        "",
        "Kandidaten, geen opdrachten. Per paar de framing-vraag stellen (Doctor Alert, bijlage *Per section*): voegt de relatie iets toe, en in welk onderdeel? Dan: een zin daar, alleen Related terms, of nee. Alles opschrijven in besluiten.md, ook nee.",
        "",
        f"## 1. Genoemd, niet gelinkt ({len(lens1)})",
        "",
        "*Het woord staat al in de tekst; de twee entries zijn nergens met elkaar verbonden. Meest zeker: vaak is een link genoeg (gloss-regel). Let op een andere betekenis (een jaartal, een letterlijke betekenis).*",
        "",
    ]
    for n, m, sent in lens1:
        out.append(f"- [[{n}]] noemt [[{m}]]: {sent}")
    out += ["", f"## 2. Woordfamilie ({len(lens2)})", "",
            "*Zelfde bouwsteen, nog niet verbonden. Soms verwant (Kidfluencer en Momfluencer), soms alleen een gedeeld woord (Doomscrolling en Doomsday Prep): dan is het nee.*", ""]
    for fam, a, b in lens2:
        out.append(f"- *{fam}*: [[{a}]] — [[{b}]]")
    total3 = sum(len(v) for v in lens3.values())
    out += ["", f"## 3. Dezelfde situatie, per cluster ({total3})", "",
            "*Twee termen uit hetzelfde cluster, geen van beide een hub, met drie of meer gemeenschappelijke buren. Een leeslijst voor wie een cluster herziet, geen takenlijst: veel paren horen terecht niet direct bij elkaar. Hier vond de zoektocht Tech Neck en Wexting.*", ""]
    for cl in sorted(lens3):
        rows = sorted(lens3[cl], reverse=True)
        out += [f"### {cl} ({len(rows)})", ""]
        for k, a, b, common in rows:
            out.append(f"- [[{a}]] — [[{b}]] · {k} gedeeld: {', '.join(common)}")
        out.append("")
    out += ["## 4. Lezen", "", "*Wat geen buren en geen woord deelt, vindt alleen iemand die de teksten van een cluster naast elkaar leest met vraag 2: wie zit er in dezelfde situatie? Niet te automatiseren.*", ""]
    return out, len(lens1), len(lens2), total3

def main():
    terms, inline, related, bold, inbound = build()
    if sys.argv[1:] == ["--kandidaten"]:
        lines, a, b, c = candidates_md(terms, inline, related, bold, inbound)
        print(f"Kandidaten: {a} genoemd niet gelinkt · {b} woordfamilie · {c} dezelfde situatie")
        print(f"Opgeslagen: {write(lines, 'kandidaten.md')}  (besluiten: werk/relaties/besluiten.md)")
        return 0
    if len(sys.argv) > 1:
        wanted = " ".join(sys.argv[1:]).strip().lower()
        match = [n for n in terms if n.lower() == wanted] or [n for n in terms if wanted in n.lower()]
        if not match:
            print(f"Geen entry gevonden voor '{wanted}'.")
            return 0
        for n in match:
            lines = entry_md(n, terms, inline, related, bold, inbound)
            print("\n".join(lines))
            safe = re.sub(r'[\\/:*?"<>|]', "-", n)
            print(f"Opgeslagen: {write(lines, safe + '.md')}\n")
        return 0
    lines = summary_md(terms, inline, related, bold, inbound)
    print("\n".join(lines[:16]))
    print(f"\nVolledige tabel met alle entries opgeslagen: {write(lines, 'overzicht.md')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
