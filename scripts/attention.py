"""Attention data for one term: independent open sources, one dated JSON file.

    python3 scripts/attention.py "Tradwife" "content/.../Tradwife/attention.json"
    python3 scripts/attention.py "Gooner" "…/attention-Gooner.json" en=Gooning openalex=-
    python3 scripts/attention.py --refresh          # every attention*.json under content/, with its own pins

The curator's pins are stored in the file, so a refresh repeats the same choices; give new
pins on the command line to change them. Refresh twice a year (January, when the previous
year is complete, and September) and after an entry is revised.

Extra arguments pin a language to a given article (lang=Title) or leave it out (lang=-),
for when the term's own page is about something else: "Gooner" redirects to Arsenal's
supporters, "Sigma male" to "Alpha and beta male". The curator decides; the choice is
recorded in the file and shown under the chart.

The site draws the chart from this file (quartz/components/AttentionChart.tsx). Sources:
- Wikipedia page views per year, five languages added together (English, Dutch, German,
  French, Spanish), following a redirect when the term has no page of its own; the Dutch
  edition also on its own, as the local line (Wikimedia REST API).
- Research: peer-reviewed articles in recognised journals (OpenAlex's core flag, the
  Leiden Ranking list) with the term in title or abstract, as a share of all such articles
  that year, per million. Articles only, so that theses, preprints and the datasets OpenAlex
  started indexing by the million in 2025 neither swell the count nor shift the base; fewer
  than ten articles in total is too few for a line (Marieke, 15-09).
- YouTube videos per year with the term in title or description, only when a key is set
  (YOUTUBE_API_KEY, or .youtube-api-key in the repo root; YouTube Data API v3, search.list;
  the count is Google's estimate). Left off by choice (15-09): it counts videos made, use of
  the word rather than attention to it, and the match is loose. The path stays for when a
  platform line is wanted; without a key the caption says nothing about it.
- Google Trends: a CSV the curator exported from trends.google.com and put next to the
  entry as trends.csv (or trends-Term.csv) comes first; otherwise the script asks Google the
  same two requests the Trends website makes (unofficial; Google can close that door any
  day, and then the file simply says so). Monthly interest 0–100, averaged per year.
Attention to the term, not use of it; each series is indexed to its own peak when drawn;
the current year is partial. Too little to draw (fewer than two sources) is recorded too,
so the site can say why there is no curve."""
import json, sys, subprocess, urllib.parse, datetime, os, csv, glob, time

years = list(range(2019, 2027))
today = datetime.date.today().isoformat()
# the public sources are monthly (Wikipedia, Trends), research is yearly; the chart draws
# both on one axis of months, from January 2019 to the current month (15-09, on Marieke's
# question whether months would be better: for the public lines yes, for research no)
# the current month is left out: half a month next to whole ones reads as a fall
months = [f"{y}-{m:02d}" for y in years for m in range(1, 13) if f"{y}-{m:02d}" < today[:7]]
UA = "CabinetOfDigitalTerms/1.0 (karinmarieke.de.vogel@gmail.com)"
LANGS = ["en", "nl", "de", "fr", "es"]
NAMES = {"en": "English", "nl": "Dutch", "de": "German", "fr": "French", "es": "Spanish"}

def get(url):
    # curl rather than urllib: this Python has no certificate store
    out = subprocess.run(["curl", "-s", "-A", UA, "--max-time", "60", url], capture_output=True, text=True).stdout
    try:
        return json.loads(out)
    except json.JSONDecodeError:
        return {}

def lookup(lang, title):
    u = f"https://{lang}.wikipedia.org/w/api.php?action=query&titles={urllib.parse.quote(title)}&redirects=1&format=json"
    d = get(u)
    for pid, page in d.get("query", {}).get("pages", {}).items():
        if pid != "-1":
            return page.get("title")
    return None

def resolve(lang, title):
    """The article the term lands on in this language, following one redirect; None if none.
    Wikipedia titles are case-sensitive after the first letter, so "Parasocial Relationship"
    misses where "Parasocial relationship" hits: both spellings are tried."""
    for variant in (title, title[:1] + title[1:].lower()):
        found = lookup(lang, variant)
        if found:
            return found
    return None

def views(lang, title):
    """Monthly views by readers (not bots), keyed "YYYY-MM"."""
    u = f"https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/{lang}.wikipedia/all-access/user/{urllib.parse.quote(title.replace(' ', '_'))}/monthly/2019010100/2026123100"
    d = get(u)
    by = {m: 0 for m in months}
    for it in d.get("items", []):
        m = it["timestamp"][:4] + "-" + it["timestamp"][4:6]
        if m in by: by[m] += it["views"]
    return by

def trends_api(term):
    """Monthly search interest 2019–2026 from the requests the Trends site itself makes.
    Unofficial: returns None when Google refuses, and the caller records that."""
    ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
    jar = os.path.join(os.environ.get("TMPDIR", "/tmp"), "cabinet-trends.jar")
    subprocess.run(["curl", "-s", "-c", jar, "-A", ua, "-o", "/dev/null", "--max-time", "30",
                    "https://trends.google.com/trends/explore"], capture_output=True)
    req = urllib.parse.quote(json.dumps({"comparisonItem": [{"keyword": term, "geo": "", "time": "2019-01-01 2026-12-31"}],
                                         "category": 0, "property": ""}))
    out = subprocess.run(["curl", "-s", "-b", jar, "-A", ua, "--max-time", "30",
                          f"https://trends.google.com/trends/api/explore?hl=en-US&tz=-120&req={req}"],
                         capture_output=True, text=True).stdout
    try:
        widget = [w for w in json.loads(out[5:])["widgets"] if w.get("id") == "TIMESERIES"][0]
    except (ValueError, KeyError, IndexError):
        return None
    time.sleep(1)
    url = ("https://trends.google.com/trends/api/widgetdata/multiline?hl=en-US&tz=-120"
           f"&req={urllib.parse.quote(json.dumps(widget['request']))}&token={widget['token']}")
    out = subprocess.run(["curl", "-s", "-b", jar, "-A", ua, "--max-time", "30", url], capture_output=True, text=True).stdout
    try:
        points = json.loads(out[5:])["default"]["timelineData"]
    except (ValueError, KeyError):
        return None
    # "Apr 2024" for a monthly answer, "Apr 7, 2024" for a weekly one; both land on a month
    by = {m: [] for m in months}
    for pt in points:
        label = pt["formattedAxisTime"]
        try:
            d = datetime.datetime.strptime(label, "%b %d, %Y") if "," in label else datetime.datetime.strptime(label, "%b %Y")
        except ValueError:
            continue
        m = d.strftime("%Y-%m")
        if m in by and pt.get("value"):
            by[m].append(pt["value"][0])
    vals = {m: (sum(v) / len(v) if v else 0) for m, v in by.items()}
    return vals if sum(vals.values()) else None

def openalex(term, pins):
    # quoted, so that a two-word term is searched as a phrase and not as two words anywhere
    phrase = pins.get("openalex", term).lower()   # openalex=gooning when the term itself is ambiguous
    q = urllib.parse.quote(f'"{phrase}"')
    core = "type:article,primary_location.source.is_core:true"
    hits = get(f"https://api.openalex.org/works?filter=title_and_abstract.search:{q},{core}&group_by=publication_year").get("group_by", [])
    tot = get(f"https://api.openalex.org/works?filter=publication_year:2019-2026,{core}&group_by=publication_year").get("group_by", [])
    h = {int(g["key"]): g["count"] for g in hits if g["key"].isdigit()}
    t = {int(g["key"]): g["count"] for g in tot if g["key"].isdigit()}
    return {y: h.get(y, 0) for y in years}, {y: (h.get(y, 0) / t[y] * 1_000_000 if t.get(y) else 0) for y in years}, phrase

def run(term, out_path, pins):
    # what the file held before this run: a Trends line that Google refuses to give again
    # today is kept from there, dated, rather than lost (15-09, after a refresh dropped all six)
    try:
        old = json.load(open(out_path))
    except (OSError, json.JSONDecodeError, TypeError):
        old = {}
    series = []
    checked = []    # what the reader sees under the chart: which article, how many articles, what is missing
    curator = []    # why: the reasons, for the curator reading the file before the push
    combined = {m: 0 for m in months}
    in_sum = []
    dutch = None
    wikipedia = {}  # per language: the article counted, or why not
    same, other, missing, left_out = [], [], [], []
    for lang in LANGS:
        pinned = pins.get(lang)
        if pinned == "-":
            wikipedia[lang] = "left out by the curator"
            left_out.append(NAMES[lang])
            continue
        title = resolve(lang, pinned) if pinned else resolve(lang, term)
        if not title:
            wikipedia[lang] = "no article"
            missing.append(NAMES[lang])
            continue
        v = views(lang, title)
        if not sum(v.values()):
            wikipedia[lang] = f"article \"{title}\", no views recorded"
            missing.append(NAMES[lang])
            continue
        how = "" if title.lower() == term.lower() else (" (chosen by the curator)" if pinned else " (via a redirect)")
        wikipedia[lang] = f"\"{title}\"{how}"
        (same if not how else other).append((NAMES[lang], title, how))
        in_sum.append(f"{NAMES[lang]} \"{title}\"{how}")
        for m in months: combined[m] += v[m]
        if lang == "nl":
            dutch = (title, v, how)
    # the source line says what was counted; the checked line only what was not
    gaps = []
    if left_out:
        gaps.append(", ".join(left_out) + " left out by the curator")
    if missing:
        gaps.append("no article in " + ", ".join(missing))
    if not in_sum:
        gaps = ["no article in any of the five languages"]
    if gaps:
        checked.append("Wikipedia: " + "; ".join(gaps))
    if in_sum:
        names = [n for n, _, _ in same]
        listed = (", ".join(names[:-1]) + " and " + names[-1]) if len(names) > 1 else names[0] if names else ""
        counted = ([f"the article \"{same[0][1]}\" on the {listed} Wikipedia"] if same else []) \
            + [f"{n} \"{t}\"{how}" for n, t, how in other]
        series.append({
            "label": f"Wikipedia, page views ({len(in_sum)} languages)" if len(in_sum) > 1 else f"{(same + other)[0][0]} Wikipedia, page views",
            "source": "Wikimedia REST API: " + "; ".join(counted) + ", monthly views by readers" + (", added up" if len(in_sum) > 1 else ""),
            "period": "month",
            "values": combined,
        })
    if dutch and len(in_sum) > 1:
        title, v, how = dutch
        series.append({
            "label": "Dutch Wikipedia, page views",
            "source": f"Wikimedia REST API, nl.wikipedia article \"{title}\"{how}, on its own as the local line",
            "period": "month",
            "values": v,
        })
    raw, per_million, phrase = openalex(term, pins)
    works = sum(raw.values())
    if pins.get("openalex") == "-":
        works = 0
        checked_oa = "OpenAlex: left out by the curator, the word means something else in the literature"
    elif works < 10:
        checked_oa = f"OpenAlex: {works} peer-reviewed article{'s' if works != 1 else ''} since 2019, too few for a line"
    else:
        checked_oa = None   # the source line under the chart already says what was counted
        curator.append(f"OpenAlex: {works} peer-reviewed articles since 2019")
    if works >= 10:
        series.append({
            "label": "Research: articles per million (OpenAlex)",
            "source": f"OpenAlex, a database of scholarly publications: {works} peer-reviewed articles in recognised journals (the Leiden core list) since 2019 with \"{phrase}\" in the title or abstract, as a share of all such articles that year (per million)"
            + (", phrase chosen by the curator" if "openalex" in pins else ""),
            "period": "year",
            "values": per_million,
            "raw": raw,
        })

    # YouTube, only with a key on this machine; the count is Google's estimate per year
    # the key comes from the environment, or from a one-line file .youtube-api-key in the
    # repo root (gitignored); never from the repository itself
    key = os.environ.get("YOUTUBE_API_KEY")
    if not key and os.path.exists(".youtube-api-key"):
        key = open(".youtube-api-key").read().strip()
    if key and pins.get("youtube") != "-":
        yt = {}
        for y in years:
            u = ("https://www.googleapis.com/youtube/v3/search?part=id&type=video&maxResults=1"
                 f"&q={urllib.parse.quote(pins.get('youtube', term))}&publishedAfter={y}-01-01T00:00:00Z&publishedBefore={y}-12-31T23:59:59Z&key={key}")
            d = get(u)
            yt[y] = int(d.get("pageInfo", {}).get("totalResults", 0)) if "pageInfo" in d else 0
        if sum(yt.values()):
            series.append({
                "label": "YouTube, videos per year",
                "source": f"YouTube Data API v3, search.list, videos with \"{pins.get('youtube', term)}\" in title or description, Google's estimated count per year",
                "period": "year",
                "values": yt,
            })
            curator.append("YouTube: counted")
        else:
            checked.append("YouTube: no videos found")
    else:
        # not a gap the reader needs: YouTube is a choice, not a missing source (Marieke, 15-09)
        curator.append("YouTube: not counted, no API key on this machine" if not key else "YouTube: left out by the curator")

    # Google Trends, only from a CSV the curator exported by hand
    out_dir = os.path.dirname(out_path)
    for name in ("trends.csv", f"trends-{term}.csv"):
        path = os.path.join(out_dir, name)
        if os.path.exists(path):
            by = {m: [] for m in months}
            with open(path, newline="", encoding="utf-8-sig") as f:
                for row in csv.reader(f):
                    if len(row) >= 2 and row[0][:4].isdigit():
                        m = row[0][:7]
                        try:
                            if m in by: by[m].append(float(row[1].replace("<1", "0")))
                        except ValueError:
                            pass
            vals = {m: (sum(v) / len(v) if v else 0) for m, v in by.items()}
            if sum(vals.values()):
                series.append({
                    "label": "Google Trends, search interest",
                    "source": f"Google Trends, exported by the curator as {name} (weekly interest 0–100, averaged per month)",
                    "period": "month",
                    "values": vals,
                })
                curator.append(f"Google Trends: from {name}")
            break
    else:
        if pins.get("trends") == "-":
            checked.append("Google Trends: left out by the curator")
        else:
            vals = trends_api(pins.get("trends", term))
            if vals:
                series.append({
                    "label": "Google Trends, search interest",
                    "source": f"Google Trends, worldwide, \"{pins.get('trends', term)}\", monthly interest 0–100, fetched with the same requests the Trends site makes (unofficial)"
                    + (", word chosen by the curator" if "trends" in pins else ""),
                    "period": "month",
                    "values": vals,
                    "retrieved": today,
                })
                curator.append("Google Trends: fetched")
            else:
                kept = [x for x in old.get("series", []) if x["label"].startswith("Google Trends")]
                if kept:
                    prev = dict(kept[0])
                    prev["retrieved"] = prev.get("retrieved", old.get("retrieved", "earlier"))
                    if "retrieved" not in prev["source"]:
                        prev["source"] += f", retrieved {prev['retrieved']}"
                    series.append(prev)
                    curator.append(f"Google Trends: Google did not answer today, line kept from {prev['retrieved']}")
                else:
                    # Google did not answer and there is nothing to keep: the line is simply not there (Marieke, 15-09)
                    checked.append("Google Trends: not available")
                    curator.append("Google Trends: no export beside the entry, and Google did not answer the request")

    enough = len(series) >= 2
    data = {
        "term": term,
        "retrieved": today,
        "years": years,
        "months": months,
        "enough": enough,
        "checked": checked + ([checked_oa] if checked_oa else []),
        "curator": curator,
        "wikipedia": wikipedia,
        "note": "Attention to the term, not use of it. The sources cannot be compared in size, only in shape and timing: each is indexed to its own peak (= 100); the current year is partial.",
        "series": series,
    }
    data["pins"] = pins
    json.dump(data, open(out_path, "w"), indent=1)
    for s in series:
        v = s["values"]; peak = max(v, key=lambda k: v[k])
        print(f"{s['label']} ({s.get('period', 'year')}): peak {round(v[peak], 1)} in {peak}, {len(v)} values")
    print("checked:", "; ".join(data["checked"]))
    if curator: print("curator:", "; ".join(curator))
    print("enough to draw:" , enough, "| written:", out_path)

def jobs():
    """(term, path, pins) per run: one from the arguments, or every file on --refresh."""
    if len(sys.argv) >= 2 and sys.argv[1] == "--refresh":
        for path in sorted(glob.glob("content/**/attention*.json", recursive=True)):
            try:
                old = json.load(open(path))
            except (OSError, json.JSONDecodeError):
                continue
            yield old["term"], path, old.get("pins", {})
        return
    term, path = sys.argv[1], sys.argv[2]
    pins = dict(a.split("=", 1) for a in sys.argv[3:])   # {"en": "Gooning", "openalex": "-"}
    if not pins and os.path.exists(path):
        try:
            pins = json.load(open(path)).get("pins", {})
        except (OSError, json.JSONDecodeError):
            pins = {}
    yield term, path, pins

for i, (term, path, pins) in enumerate(jobs()):
    if i:
        time.sleep(2)  # be gentle with the APIs
    print(f"== {term}")
    run(term, path, pins)
