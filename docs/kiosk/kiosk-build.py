import re, sys, pathlib
S = sys.argv[1]
t = pathlib.Path(sys.argv[2]).read_text()
kiosk_css = pathlib.Path("docs/kiosk/kiosk.css").read_text()
t = t.replace("<head>", '<head><base href="http://localhost:8080/Cabinet-of-Digital-Terms/Gender--and--Identity/Tradwife/">', 1)
t = t.replace("</head>", "<style id=\"kiosk\">" + kiosk_css + "</style></head>", 1)
g0 = t.index('<div class="graph graph-card"'); g1 = t.index('<details class="graph-story"', g0)
graph = t[g0:g1]
landscape = re.search(r'<details class="graph-story"[^>]*>.*?</details>', t[g1:], re.S).group(0)
curve = re.search(r'<details class="graph-story attention"[^>]*>.*?</details>', t, re.S).group(0)
img = re.search(r'<img[^>]*tradwife\.jpg[^>]*>', t).group(0)
caption = re.search(r'<small>.*?</small>', t, re.S).group(0)
quote = re.search(r'<blockquote>.*?</blockquote>', t, re.S).group(0)
for piece in (graph, landscape, curve): t = t.replace(piece, "", 1)
land_open = landscape.replace('<details class="graph-story"', '<details class="graph-story" open', 1)
curve_open = curve.replace('<details class="graph-story attention"', '<details class="graph-story attention" open', 1)
top = ('<div class="kiosk-bar"><h1>Tradwife</h1><span class="listen">&#9654; de curve als geluid, 30 s <audio controls src="http://localhost:8080/static/kiosk-tradwife.m4a" style="vertical-align:middle;height:32px"></audio></span><span class="home">Terug naar de kaart</span></div>'
       '<div class="kiosk-top"><div class="kiosk-left">' + img + caption + quote + '</div><div class="kiosk-right">' + graph + '</div></div>'
       '<div class="kiosk-bottom">' + land_open + curve_open + '</div>'
       '<div class="kiosk-foot"><span>Lees de hele entry thuis, met bronnen en Friction: mastamarieke.github.io/Cabinet-of-Terms</span><span class="qr">QR</span></div>')
t = re.sub(r'(<div class="center"[^>]*>)', lambda m: m.group(1) + top, t, count=1)
# the reading bar (voice) sits in the page header, which the kiosk hides: move it to the foot
bar = re.search(r'<div class="voice-bar".*?</label></div>', t, re.S)
if bar:
    t = t.replace(bar.group(0), "", 1).replace("</body>", bar.group(0) + "</body>", 1)
# public/ is wiped at every rebuild (a restart, but also every edit in quartz/); quartz/static/
# is copied into public/static/ by every build, so the kiosk lives there and survives. Both
# are written: static/ for the next build, public/static/ so that it is there right now.
# The two kiosk files in quartz/static/ are kept out of git via .git/info/exclude (not .gitignore:
# the build's glob honours .gitignore and would then skip them): a local prototype, not the live site.
import shutil
for out in (pathlib.Path("quartz/static"), pathlib.Path("public/static")):
    out.mkdir(parents=True, exist_ok=True)
    (out / "kiosk-tradwife.html").write_text(t)
    shutil.copy("docs/geluid/2026-09-21-attention-tradwife.m4a", out / "kiosk-tradwife.m4a")
print("written: quartz/static/ and public/static/ kiosk-tradwife.html + .m4a")
print("open http://localhost:8080/static/kiosk-tradwife")
