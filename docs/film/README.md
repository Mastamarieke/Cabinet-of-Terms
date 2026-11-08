# Rondleiding als film

`2026-10-08-cabinet-tour.mp4`: 2 min 7 s, 1920×1080, Engelse ondertitels, geen geluid. Voor algemene bezoekers: homepage, lichtkrant, kaart, een term kiezen (Hypergamy), graph, semantic landscape, attention curve met aanwijzer, momenten en loep, de tekst, Read more en een bronpagina, en een klik in de lichtkrant die naar een onderdeel springt. Opgenomen van de lokale devserver (met de lichtkrant), 8 oktober 2026.

Opnieuw maken (devserver draait op :8080):

1. Chrome headless met `--remote-debugging-port=9335 --use-angle=swiftshader --enable-unsafe-swiftshader`.
2. `node record.mjs` — loopt de rondleiding, schrijft beelden naar `frames/` met `meta.json` (echte tijd) en `segs.json` (per stap de duur in de film; headless is trager dan de film, dus elke stap wordt naar zijn eigen duur teruggerekend).
3. `python3 timeline.py` in `frames/` — maakt `timeline.json`.
4. `node assemble.mjs uit.mp4` — Chrome speelt de beelden af op een canvas en neemt op (MediaRecorder, H.264). Alleen dat tabblad open laten: achtergrondtabbladen worden vertraagd.
5. `avconvert --source uit.mp4 --preset Preset1920x1080 --output film.mp4` — van gefragmenteerde naar gewone mp4, anders kent QuickTime de duur niet.

Ondertitels en cursor worden in de pagina zelf getekend (`OVERLAY` in `record.mjs`); link-voorbeelden staan tijdens de opname uit.
