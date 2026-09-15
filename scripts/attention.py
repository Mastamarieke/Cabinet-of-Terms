"""Attention data for one term: independent open sources, one dated JSON file.

    python3 scripts/attention.py "Tradwife" "content/.../Tradwife/attention.json"
    python3 scripts/attention.py "Gooner" "…/attention-Gooner.json" en=Gooning de=-

Extra arguments pin a language to a given article (lang=Title) or leave it out (lang=-),
for when the term's own page is about something else: "Gooner" redirects to Arsenal's
supporters, "Sigma male" to "Alpha and beta male". The curator decides; the choice is
recorded in the file and shown under the chart.

The site draws the chart from this file (quartz/components/AttentionChart.tsx). Sources:
Wikipedia page views per year in five languages (English, Dutch, German, French, Spanish),
following a redirect when the term has none of its own (Wikimedia REST API), and research
works per million with the term in title or abstract (OpenAlex). Attention to the term, not
use of it; each series is indexed to its own peak when drawn; the current year is partial.
Too little to draw (no Wikipedia article anywhere, or fewer than five research works) is
recorded too, so the site can say why there is no curve."""
import json, sys, subprocess, urllib.parse, datetime

term = sys.argv[1]            # "Tradwife"
out_path = sys.argv[2]        # where the JSON goes
pins = dict(a.split("=", 1) for a in sys.argv[3:])   # {"en": "Gooning", "de": "-"}
years = list(range(2019, 2027))
today = datetime.date.today().isoformat()
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
    u = f"https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/{lang}.wikipedia/all-access/user/{urllib.parse.quote(title.replace(' ', '_'))}/monthly/2019010100/2026123100"
    d = get(u)
    by = {y: 0 for y in years}
    for it in d.get("items", []):
        y = int(it["timestamp"][:4])
        if y in by: by[y] += it["views"]
    return by

def openalex():
    # quoted, so that a two-word term is searched as a phrase and not as two words anywhere
    phrase = pins.get("openalex", term).lower()   # openalex=gooning when the term itself is ambiguous
    q = urllib.parse.quote(f'"{phrase}"')
    hits = get(f"https://api.openalex.org/works?filter=title_and_abstract.search:{q}&group_by=publication_year").get("group_by", [])
    tot = get("https://api.openalex.org/works?filter=publication_year:2019-2026&group_by=publication_year").get("group_by", [])
    h = {int(g["key"]): g["count"] for g in hits if g["key"].isdigit()}
    t = {int(g["key"]): g["count"] for g in tot if g["key"].isdigit()}
    return {y: h.get(y, 0) for y in years}, {y: (h.get(y, 0) / t[y] * 1_000_000 if t.get(y) else 0) for y in years}, phrase

series = []
checked = []
for lang in LANGS:
    pinned = pins.get(lang)
    if pinned == "-":
        checked.append(f"{NAMES[lang]}: left out by the curator")
        continue
    title = resolve(lang, pinned) if pinned else resolve(lang, term)
    if not title:
        checked.append(f"{NAMES[lang]}: no article")
        continue
    v = views(lang, title)
    if not sum(v.values()):
        checked.append(f"{NAMES[lang]}: article \"{title}\", no views recorded")
        continue
    via = "" if title.lower() == term.lower() else (f", the article chosen by the curator" if pinned else f", reached via a redirect")
    checked.append(f"{NAMES[lang]}: \"{title}\"" + (" (chosen)" if pinned else ""))
    series.append({
        "label": f"{NAMES[lang]} Wikipedia, page views",
        "source": f"Wikimedia REST API, {lang}.wikipedia article \"{title}\"{via}, monthly user views",
        "values": v,
    })
series.sort(key=lambda s: -sum(s["values"].values()))
raw, per_million, phrase = openalex()
works = sum(raw.values())
if pins.get("openalex") == "-":
    works = 0
    checked_oa = "OpenAlex: left out by the curator (the word is ambiguous in the literature)"
else:
    checked_oa = f"OpenAlex: {works} works since 2019"
if works >= 5:
    series.append({
        "label": "Research: works per million (OpenAlex)",
        "source": f"OpenAlex, works with \"{phrase}\" in title or abstract ({works} since 2019), per million works published that year"
        + (" (phrase chosen by the curator)" if "openalex" in pins else ""),
        "values": per_million,
        "raw": raw,
    })

enough = len(series) >= 2
data = {
    "term": term,
    "retrieved": today,
    "years": years,
    "enough": enough,
    "checked": checked + [checked_oa],
    "note": "Attention to the term, not use of it. Each series is indexed to its own peak (= 100); the current year is partial.",
    "series": series,
}
json.dump(data, open(out_path, "w"), indent=1)
for s in series:
    print(s["label"], {k: round(v, 2) for k, v in s["values"].items()})
print("checked:", "; ".join(data["checked"]))
print("enough to draw:" , enough, "| written:", out_path)
