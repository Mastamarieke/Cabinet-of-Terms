#!/usr/bin/env python3
"""The press as a fifth clock: how many news articles mention a term, month by month.

    python3 scripts/press_probe.py "Tradwife"
    python3 scripts/press_probe.py "Tradwife" "Sigma Male" "Brain Rot"

GDELT's DOC API, which monitors online news worldwide. Open, no key, no account — the same
kind of source as Wikipedia and OpenAlex, so a reader can check the figures without asking
anyone for permission.

**Why this kept failing.** Every earlier attempt (16-09, 22-09, 23-09) came back 429 and we
concluded in turn that the network was blocked and that the User-Agent was refused. Both were
wrong: GDELT allows one request every five seconds and we were asking faster. This script
waits, retries, and says what it is doing. Nothing else was ever the matter.

Two figures per month, because they answer different questions:
- **articles**: how many pieces mentioned the term. A count, readable as a count.
- **share**: the same as a percentage of everything GDELT indexed that month, because its
  source list grows every year and a raw count would show that growth as attention.

Writes werk/stresstest/press-<term>.json. Nothing on the site changes.
"""
import json
import os
import subprocess
import sys
import time
from datetime import date

UA = "CabinetOfDigitalTerms/1.0 (+https://mastamarieke.github.io/Cabinet-of-Terms; info@digitale-alertheid.nl)"
API = "https://api.gdeltproject.org/api/v2/doc/doc"
WAIT = 6          # GDELT asks for one request every five seconds; six is politer than five
TRIES = 6


def fetch(term, mode):
    """One series, waiting as long as GDELT wants to be waited for."""
    url = (f"{API}?query={subprocess.list2cmdline([term]).strip(chr(34))}&mode={mode}&format=json"
           f"&startdatetime=20190101000000&enddatetime=20260901000000").replace(" ", "%20")
    for attempt in range(1, TRIES + 1):
        out = subprocess.run(["curl", "-s", "-A", UA, "--max-time", "60", url],
                             capture_output=True, text=True).stdout
        try:
            return json.loads(out)["timeline"][0]["data"]
        except Exception:
            if "429" in out or "limit requests" in out:
                print(f"   (GDELT vraagt om geduld, poging {attempt} van {TRIES})")
                time.sleep(WAIT * attempt)      # back off a little further each time
                continue
            print(f"   geen bruikbaar antwoord: {out.strip()[:120]}")
            return None
    return None


def by_month(rows, average=False):
    per = {}
    for r in rows:
        m = r["date"][:4] + "-" + r["date"][4:6]
        per.setdefault(m, []).append(r["value"])
    return {m: (sum(v) / len(v) if average else sum(v)) for m, v in per.items()}


def main():
    terms = sys.argv[1:]
    if not terms:
        sys.exit(__doc__)
    os.makedirs("werk/stresstest", exist_ok=True)
    for i, term in enumerate(terms):
        if i:
            time.sleep(WAIT)
        print(f"== {term}")
        raw = fetch(term, "timelinevolraw")
        if raw is None:
            continue
        time.sleep(WAIT)
        vol = fetch(term, "timelinevol")
        counts = by_month(raw)
        share = by_month(vol, average=True) if vol else {}
        peak = max(counts, key=counts.get)
        print(f"   {sum(counts.values()):,.0f} artikelen, top {peak}: {counts[peak]:,.0f}"
              + (f" ({share.get(peak, 0):.5f}% van alles wat GDELT die maand zag)" if share else ""))
        out = f"werk/stresstest/press-{term.lower().replace(' ', '-')}.json"
        json.dump({
            "term": term,
            "source": "GDELT DOC API, worldwide online news monitored by GDELT: articles mentioning "
                      "the term per month, and the same as a share of all articles indexed that month",
            "retrieved": date.today().isoformat(),
            "articles_per_month": {m: round(v) for m, v in sorted(counts.items())},
            "share_of_all_articles_percent": {m: round(v, 6) for m, v in sorted(share.items())},
        }, open(out, "w"), indent=1)
        print(f"   {out}")


if __name__ == "__main__":
    main()
