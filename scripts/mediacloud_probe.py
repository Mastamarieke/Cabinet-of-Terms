#!/usr/bin/env python3
"""The press as a fifth clock: how many news stories mention a term, month by month.

    python3 scripts/mediacloud_probe.py "Tradwife"
    python3 scripts/mediacloud_probe.py "Tradwife" --start 2019-01-01 --collection 34412234

A probe, not part of the attention curve yet (23-09-2026). It answers one question first:
does the press lead the public or follow it? Wikipedia says when people looked a word up;
Media Cloud says when journalists wrote it down. If the press line runs ahead of Wikipedia,
the word was pushed; if it runs behind, the press was reporting on something already under
way. Tradwife is the test, because its peaks are dated and sourced.

Media Cloud is open and free but wants an account: the key goes in .mediacloud-key in the
repo root (gitignored, like .youtube-api-key), or in MEDIACLOUD_API_KEY. Get one at
https://search.mediacloud.org — register, then copy the key from the account page.

Why Media Cloud and not Google Trends: Trends gives an index against its own busiest month,
so it cannot say how much, only when. Media Cloud counts stories, and a count can be read.
Why not GDELT: its API answers 429 to this network, every time since 16-09-2026.
"""
import json
import os
import subprocess
import sys
import urllib.parse
from datetime import date

API = "https://search.mediacloud.org/api/search"


def key():
    k = os.environ.get("MEDIACLOUD_API_KEY")
    if not k and os.path.exists(".mediacloud-key"):
        k = open(".mediacloud-key").read().strip()
    if not k:
        sys.exit(
            "No API key. Register at https://search.mediacloud.org, copy the key from your\n"
            "account page, and put it in .mediacloud-key in the repo root (one line)."
        )
    return k


def get(path, params, k):
    # curl rather than urllib: this Python has no certificate store (same as attention.py)
    url = f"{API}/{path}?" + urllib.parse.urlencode(params)
    r = subprocess.run(
        ["curl", "-s", "--max-time", "60", "-H", f"Authorization: Bearer {k}", url],
        capture_output=True, text=True,
    )
    try:
        return json.loads(r.stdout)
    except Exception:
        head = r.stdout.strip()[:200].replace("\n", " ")
        sys.exit(f"Media Cloud did not answer with JSON on {path}: {head}")


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    term = sys.argv[1]
    args = sys.argv[2:]
    start = args[args.index("--start") + 1] if "--start" in args else "2019-01-01"
    end = args[args.index("--end") + 1] if "--end" in args else date.today().isoformat()
    # 34412234 is Media Cloud's "United States - National" collection; without one the query
    # runs over everything the index holds, which is what we want for a first look.
    coll = args[args.index("--collection") + 1] if "--collection" in args else None
    k = key()

    params = {"q": f'"{term}"', "start_date": start, "end_date": end, "platform": "onlinenews-mediacloud"}
    if coll:
        params["collections"] = coll

    total = get("total-count", params, k)
    print(f"== {term}: {total.get('count', total)} stories, {start} to {end}")

    counts = get("story-count-over-time", params, k)
    rows = counts.get("count_over_time", {}).get("counts", counts.get("counts", []))
    if not rows:
        print(json.dumps(counts)[:400])
        return
    # the API answers by day; fold into months, which is the curve's own axis
    per_month = {}
    for r in rows:
        d = str(r.get("date", ""))[:7]
        if d:
            per_month[d] = per_month.get(d, 0) + int(r.get("count", 0))
    peak = max(per_month, key=per_month.get)
    print(f"   peak {peak}: {per_month[peak]} stories")
    for m in sorted(per_month):
        if per_month[m]:
            bar = "#" * min(60, round(per_month[m] / max(1, per_month[peak]) * 60))
            print(f"   {m} {per_month[m]:>6}  {bar}")
    out = f"werk/stresstest/press-{term.lower().replace(' ', '-')}.json"
    os.makedirs("werk/stresstest", exist_ok=True)
    json.dump({"term": term, "source": "Media Cloud, onlinenews-mediacloud", "start": start,
               "end": end, "retrieved": date.today().isoformat(), "months": per_month},
              open(out, "w"), indent=1)
    print(f"   written: {out}")


if __name__ == "__main__":
    main()
