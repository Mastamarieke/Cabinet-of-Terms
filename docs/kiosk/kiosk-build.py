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
top = ('<div class="kiosk-bar"><h1>Tradwife</h1><span class="home">Terug naar de kaart</span></div>'
       '<div class="kiosk-top"><div class="kiosk-left">' + img + caption + quote + '</div><div class="kiosk-right">' + graph + '</div></div>'
       '<div class="kiosk-bottom">' + land_open + curve_open + '</div>'
       '<div class="kiosk-foot"><span>Lees de hele entry thuis, met bronnen en Friction: mastamarieke.github.io/Cabinet-of-Terms</span><span class="qr">QR</span></div>')
t = re.sub(r'(<div class="center"[^>]*>)', lambda m: m.group(1) + top, t, count=1)
pathlib.Path("public/kiosk-tradwife.html").write_text(t); print("written")
