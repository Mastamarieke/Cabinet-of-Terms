# Kiosk-prototype (21-09-2026)

Eerste proef van het Cabinet als installatie: één termscherm op 1920×1080, gemaakt uit de gebouwde pagina van Tradwife zonder de site te veranderen. Wat erop staat: de Narrative Typography-illustratie met het definitiecitaat, de graph (echt, aanraakbaar), het landschap als rondleiding (termen tikbaar), de attention curve met de momenten (aanwijzer met de vinger), en een voetregel met de code voor thuis. Wat eraf is: zijbalk, zoekbalk, lopende tekst, bronnen.

Maken, met de devserver op :8080:

    curl -s "http://localhost:8080/Cabinet-of-Digital-Terms/Gender--and--Identity/Tradwife/" -o /tmp/tw.html
    python3 docs/kiosk/kiosk-build.py /tmp /tmp/tw.html
    open http://localhost:8080/static/kiosk-tradwife

Het script schrijft de pagina en het geluid (`docs/geluid/2026-09-21-attention-tradwife.m4a`) naar `quartz/static/` én naar `public/static/`. De twee bestanden staan in `.git/info/exclude`, niet in `.gitignore`: de bouwstap die `quartz/static/` kopieert leest `.gitignore` mee en sloeg ze daardoor over (derde 404 van de avond). Eerst stond de kiosk los in `public/`, maar die map wordt bij elke herbouw leeggemaakt, niet alleen bij een herstart maar bij elke wijziging in `quartz/`; twee keer op 21-09 was de kiosk daardoor een 404 ("ik kan hem niet meer vinden"). Wat in `quartz/static/` staat kopieert elke build opnieuw naar `public/static/`, dus daar blijft hij staan.

Sinds de avond van 21-09 spreekt de kiosk ook: de zes punten op de curve zijn aan te tikken en worden voorgelezen (de afspeelknop ▶ leest ze alle zes op volgorde; de klank die er eerst bij zat is weggehaald, "niks"), het luidsprekertje op het landschap leest de rondleiding voor en licht de genoemde termen op (in de tekst en in de graph), en het luidsprekertje in het definitiecitaat leest de definitie. Alles via de spraak van de browser; de stem is te kiezen in de leesbalk onderaan (`Voice.tsx`, `voice.inline.ts`). Het bouwscript verplaatst die leesbalk uit de verborgen paginakop naar de voet van de pagina.

`kiosk.css` is de hele ingreep: verbergen, herschikken, vergroten. Een echte kiosk-versie wordt een tweede layout in `quartz.layout.ts` (een pad `/kiosk/…`), met terugkeer naar de kaart na een minuut stilte en de kaart van twintig clusters als startscherm. Render: `docs/beeld/2026-09-21-kiosk-1-tradwife-1920x1080.png`.
