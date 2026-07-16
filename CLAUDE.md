# Claude Code — Werkinstructies Cabinet of Digital Terms

*Project Digitale Alertheid — HAN University of Applied Sciences*
*Marieke de Vogel*

---

## Vault & workflow

- De **GitHub-repo** (`/Users/mariekedevogel/Desktop/testGithub/Cabinet-of-Terms/`) is de master vault en de online versie.
- Obsidian opent dezelfde map als leesomgeving — niet als schrijfomgeving.
- Nieuwe entries en wijzigingen worden door Claude Code geschreven, niet handmatig in Obsidian.

---

## Doctor Alert — analytische prompt

- De huidige versie van de Doctor Alert-prompt staat lokaal in de repo-root als `Doctor-Alert_V*.md` (gitignored — nooit pushen).
- **Wanneer Marieke een nieuwe Doctor Alert-versie aanlevert:** sla hem op als `Doctor-Alert_V[nummer].md` in de repo-root en verwijder de vorige versie. Bevestig welke versie nu actief is.
- Doctor Alert bevat de cluster-lijst, wikilink-regels, schrijfinstructies en de geldige wikilink-lijst. Gebruik deze als referentie bij het schrijven van nieuwe entries.
- Doctor Alert is de shaper van cartographic prompting — hij definieert hoe termen analytisch gepositioneerd worden in het netwerk. Elke versie reflecteert op huidige ontwikkelingen in digitale cultuur.
- `Doctor-Alert_analyse.md` (gitignored) is het werkdocument voor retroactieve updates: bij elke nieuwe cluster of nieuwe term, check dit bestand om te zien welke bestaande entries in de vault aangepast moeten worden.

---

## Maintenance protocol (na elke wijziging)

Bij elke toevoeging, verwijdering of hernoeming van een term:

1. **About-pagina** van het cluster updaten — term toevoegen/verwijderen als `[[wikilink]]`
2. **index.md — clustertelling** updaten: `<summary><strong>[Cluster]</strong> — N terms</summary>`
3. **index.md — totaaltellingen** updaten (consistent op alle plekken):
   - Aantal termen
   - Aantal externe bronnen (tel `[tekst](http...)` links in het gewijzigde bestand)
4. **Wikilink-check** draaien (Python-script uit SETUP.md) — vóór elke push
5. **Doctor Alert cluster-lijst syncen** — na elke publish controleren of Doctor Alert's cluster-lijst nog klopt met de live vault
6. **Retroactieve updates** — bij elke nieuwe term: zoek welke bestaande entries verwant zijn en beoordeel drie niveaus: (1) **wikilink** toevoegen in See also en Navigation; (2) **context** — wordt een bestaande zin scherper als de nieuwe term erin benoemd wordt?; (3) **content** — moet er een nieuwe zin of alinea bij om het analytische belang te verwerken? Alle drie niveaus kunnen van toepassing zijn.
   - **Sources-trigger**: wordt een primaire bron in de Friction-tekst geciteerd? Dan migreert de entry naar de `Term/index.md + Sources/`-mapstructuur (conform Sigma Male, Looksmaxxing, Tradwife) — in dezelfde werksessie of als expliciet gepland vervolgwerk.
   - **Semantic landscape-trigger**: wordt een Narrative Typography-afbeelding ingebed? Dan wordt het semantic landscape aangemaakt of bijgewerkt in het frontmatter van de entry — de afbeelding is een terugkoppelmoment, het semantic landscape de tekstuele neerslag daarvan.
7. **log.md bijwerken** — aan het einde van elke werksessie: voeg een entry toe onder de huidige datum met wat er is gedaan (entries, graph, structuur, maintenance, onderzoek). log.md is gitignored — nooit committen.

---

## Nieuwe cluster aanmaken

Volg de procedure uit Lumo V19 "Adding a new cluster":
1. Definieer naam, beschrijving en initiële termlijst
2. Check op term-migraties (dual placement of full move)
3. Voeg cluster toe aan Lumo's cluster-lijst
4. Maak About-pagina aan
5. Update totale clustertelling overal

---

## Sources-structuur protocol

Entries met bronnen krijgen een mapstructuur zoals Sigma Male, Looksmaxxing en Tradwife. **Trigger**: zodra een primaire bron in de Friction-tekst geciteerd wordt, of zodra een Narrative Typography-afbeelding wordt ingebed, migreert de entry naar deze structuur.

### Mapstructuur

```
Term/
├── index.md          ← de entry
└── Sources/
    ├── index.md      ← bronnen-overzichtspagina
    ├── Auteur-Jaar.md ← per primaire bron één bestand
    ├── Auteur-Jaar.md
    └── Secondary.md  ← alle secundaire bronnen samen
```

### Naamgeving

- Map: exacte termnaam (spaties toegestaan)
- Bronbestanden: **altijd** `Auteur-Term-Jaar.md` (eerste auteur, geen voornaam, termnaam, jaar — bijv. `Brady-Ragebaiting-2017.md`, `Ging-Tradwife-2019.md`). Nooit alleen `Auteur-Jaar.md` — een bron kan later in een andere entry geciteerd worden en dan ontstaat een naamconflict.
- Secundaire bundel: altijd `Secondary.md`

### Aantal primary bronnen

**Maximaal 2 primary bronnen per entry** — de twee die de analytische kern vormen. Overige academische bronnen gaan in `Secondary.md`, ook als ze peer-reviewed zijn. Kies de twee die samen het mechanisme én het empirische bewijs leveren.

### Classificatie

| Rol | Wat | Bestand |
|-----|-----|---------|
| `primary` | Peer-reviewed academisch, direct over het fenomeen — max. 2 per entry | eigen `.md` |
| `secondary` | Journalistiek, beschouwend, filosofische achtergrond, aanvullende academische bronnen | samen in `Secondary.md` |
| `artifact` | Het fenomeen zelf als product (zelfhulpboek, meme, app) | eigen `.md` |

### Frontmatter entry (index.md)

```yaml
---
title: "Termnaam"
aliases:
  - Termnaam
term: Termnaam
cluster: Clusternaam
analytical_layer: mechanism/cause/consequence/reaction
status: publieksversie
version: V[n]
analysis_version: pending
related_cause: [...]
related_mechanism: [...]
related_consequence: [...]
related_reaction: [...]
semantic_landscape: |   # optioneel
  [tekst]
---
```

### Frontmatter primaire bronbestanden

```yaml
---
title: "Auteur (Jaar)"
full_title: "Volledige titel"
type: source
source_role: primary
source_type: academic-article / book / report
analytical_layer: [...]
source_function: [Theoretical/Critical, Empirical/Data, Genealogical]
author: Volledige naam
year: JJJJ
journal: Tijdschriftnaam        # of publisher:
doi: https://doi.org/...        # of url:
access: open-access / paywalled
discipline: [...]
cluster: Clusternaam
linked_entries: ["[[Term]]", ...]
tags: [source, primary, academic, peer-reviewed]
---
```

### Frontmatter Secondary.md

```yaml
---
title: "Secondary Sources — Termnaam"
type: source
source_role: secondary
discipline: [Journalism, ...]
cluster: Clusternaam
linked_entries: ["[[Term]]", ...]
tags: [source, secondary, journalistic]
---
```

### Frontmatter Sources/index.md

```yaml
---
title: "Sources"
cluster: Clusternaam
tags: [source-index]
---
```

### Bronverwerking in de entry (index.md)

**De twee primary bronnen worden inhoudelijk verwerkt in de Friction-sectie** — niet alleen in Sources/, maar ook zichtbaar in de body van de entry:
- Citeer als wikilink: `[[Auteur-Jaar|Auteur et al. (Jaar)]]`
- Benoem wat de bron bijdraagt: welk mechanisme, welke bevinding, welk theoretisch kader

**Secondary bronnen** worden inline geciteerd (plain text, geen wikilink) waar ze analytisch passen — doorgaans Origin of Friction, maar soms elders. Niet elke secondary bron hoeft in de body; alleen waar de bron het argument scherper maakt of een concreet voorbeeld toevoegt dat er zonder ontbreekt.

### Sources callout in entry (index.md)

**Nooit toevoegen.** De bronnen leven in `Sources/` — niet in de entry zelf. Geen `[!abstract]- Sources` callout in `index.md`.

### Sources/index.md body

```markdown
Bronmateriaal gebruikt bij de analyse van [[Term]].

**Primary:**
- [[Auteur-Jaar|Auteur (Jaar)]] — één regel omschrijving
- [[Auteur-Jaar|Auteur (Jaar)]] — één regel omschrijving

**Secondary:**
- [[Secondary|Auteur (Jaar) · Auteur (Jaar)]] — journalistiek + achtergrond

**Behandelde entries:** [[Term]] · [[Verwante term]] · ...
```

---

## Build-workflow: nieuwe entry met bronnen en afbeelding

Volg deze volgorde bij het bouwen van een entry met folder-structuur (zoals Tradwife, Looksmaxxing, Sigma Male).

### Stap 1 — Bronnen classificeren

Verdeel de aangeleverde bronnen in primary / secondary / artifact (zie Sources-structuur protocol hieronder) en bepaal welke twee primaire bronnen de analytische kern vormen.

### Stap 2 — Bestanden schrijven (in volgorde)

1. `Term/index.md` — de volledige entry (vervangt de oude platte `Term.md`)
   - De **twee primary bronnen worden inhoudelijk verwerkt in Friction**: citeer als `[[Auteur-Jaar|Auteur et al. (Jaar)]]` en benoem hun bijdrage
   - **Secondary bronnen** worden inline geciteerd (plain text) waar ze analytisch passen — doorgaans Origin of Friction
2. `Term/Sources/Auteur-Jaar.md` — eerste primaire bron
3. `Term/Sources/Auteur-Jaar.md` — tweede primaire bron
4. `Term/Sources/Secondary.md` — alle secundaire bronnen
5. `Term/Sources/index.md` — bronnen-overzichtspagina

### Stap 3 — Opruimen

- Verwijder de oude platte `Term.md` als die bestaat

### Stap 4 — Retroactieve updates

- Zoek verwante entries en voeg `[[Term]]` toe op drie niveaus: frontmatter, See also, en Friction/body waar analytisch relevant

### Stap 5 — Commit en push (vóór afbeelding)

- Stage alleen de nieuwe Term-bestanden en gewijzigde verwante entries
- Push — zo staat de map op GitHub en kan de afbeelding er via de GitHub-UI in worden geüpload
- Commit de afbeelding **nooit** samen met de andere bestanden — aparte commit

### Stap 6 — Afbeelding toevoegen

1. Marieke uploadt de afbeelding via GitHub: navigeer naar de Term-map → "Add file" → "Upload files"
2. `git pull` om de afbeelding lokaal binnen te halen
3. Hernoem het bestand als er spaties in de naam zitten: `tradwife.jpg` (geen spaties)
4. Voeg toe aan `index.md`:
   - Frontmatter: `entry_image: termnaam.jpg` en `entry_image_caption: "By Narrative Typographer [Naam]"`
   - Body: `![](termnaam.jpg)` + `<small>*By Narrative Typographer [Naam]*</small>` — direct bóven de definition quote
5. Commit en push

### Volgorde afbeelding in de entry body

```markdown
![](termnaam.jpg)
<small>*By Narrative Typographer [Naam]*</small>

> Definition quote hier.
```

---

## Nooit pushen

- `Doctor-Alert_V*.md` — staat in `.gitignore`
- `log.md` — staat in `.gitignore`
- SSH-sleutels of bestanden met persoonlijke gegevens

---

## Wikilink-check script

Draaien vanuit `content/`:

```python
import os, re

vault_dir = 'Cabinet of Digital Terms'

valid = set()
for root, dirs, files in os.walk(vault_dir):
    for f in files:
        if f.endswith('.md') and not f.startswith('._'):
            valid.add(f[:-3])

broken_all = {}
for root, dirs, files in os.walk(vault_dir):
    for fname in sorted(files):
        if not fname.endswith('.md') or fname.startswith('._'): continue
        fpath = os.path.join(root, fname)
        with open(fpath, encoding='utf-8', errors='ignore') as f:
            content = f.read()
        links = re.findall(r'\[\[([^\]|#\n]+)', content)
        broken = sorted(set(l.strip() for l in links if l.strip() not in valid))
        if broken:
            broken_all[fname] = broken

if broken_all:
    print(f'{len(broken_all)} files with broken wikilinks:\n')
    for fname, links in sorted(broken_all.items()):
        print(f'{fname}:')
        for l in links:
            print(f'  [[{l}]]')
else:
    print('All wikilinks valid.')
```
