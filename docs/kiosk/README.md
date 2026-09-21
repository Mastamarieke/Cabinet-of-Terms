# Kiosk-prototype (21-09-2026)

Eerste proef van het Cabinet als installatie: één termscherm op 1920×1080, gemaakt uit de gebouwde pagina van Tradwife zonder de site te veranderen. Wat erop staat: de Narrative Typography-illustratie met het definitiecitaat, de graph (echt, aanraakbaar), het landschap als rondleiding (termen tikbaar), de attention curve met de momenten (aanwijzer met de vinger), en een voetregel met de code voor thuis. Wat eraf is: zijbalk, zoekbalk, lopende tekst, bronnen.

Maken, met de devserver op :8080:

    curl -s "http://localhost:8080/Cabinet-of-Digital-Terms/Gender--and--Identity/Tradwife/" -o /tmp/tw.html
    python3 docs/kiosk/kiosk-build.py /tmp /tmp/tw.html      # schrijft public/kiosk-tradwife.html
    open http://localhost:8080/kiosk-tradwife.html

`kiosk.css` is de hele ingreep: verbergen, herschikken, vergroten. Een echte kiosk-versie wordt een tweede layout in `quartz.layout.ts` (een pad `/kiosk/…`), met terugkeer naar de kaart na een minuut stilte en de kaart van twintig clusters als startscherm. Render: `docs/beeld/2026-09-21-kiosk-1-tradwife-1920x1080.png`.
