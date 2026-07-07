# Claude Code — Werkinstructies Cabinet of Digital Terms

*Project Digitale Alertheid — HAN University of Applied Sciences*
*Marieke de Vogel*

---

## Vault & workflow

- De **GitHub-repo** (`/Users/mariekedevogel/Desktop/testGithub/Cabinet-of-Terms/`) is de master vault en de online versie.
- Obsidian opent dezelfde map als leesomgeving — niet als schrijfomgeving.
- Nieuwe entries en wijzigingen worden door Claude Code geschreven, niet handmatig in Obsidian.

---

## Lumo — analytische prompt

- De huidige versie van de Lumo-prompt staat lokaal in de repo-root als `Lumo_V*.md` (gitignored — nooit pushen).
- **Wanneer Marieke een nieuwe Lumo-versie aanlevert:** sla hem op als `Lumo_V[nummer].md` in de repo-root en verwijder de vorige versie. Bevestig welke versie nu actief is.
- Lumo bevat de cluster-lijst, wikilink-regels, schrijfinstructies en de geldige wikilink-lijst. Gebruik deze als referentie bij het schrijven van nieuwe entries.

---

## Maintenance protocol (na elke wijziging)

Bij elke toevoeging, verwijdering of hernoeming van een term:

1. **About-pagina** van het cluster updaten — term toevoegen/verwijderen als `[[wikilink]]`
2. **index.md — clustertelling** updaten: `<summary><strong>[Cluster]</strong> — N terms</summary>`
3. **index.md — totaaltellingen** updaten (consistent op alle plekken):
   - Aantal termen
   - Aantal externe bronnen (tel `[tekst](http...)` links in het gewijzigde bestand)
4. **Wikilink-check** draaien (Python-script uit SETUP.md) — vóór elke push
5. **Lumo cluster-lijst syncen** — na elke publish controleren of Lumo's cluster-lijst nog klopt met de live vault
6. **Retroactieve updates** — bij elke nieuwe term: zoek welke bestaande entries verwant zijn en beoordeel drie niveaus: (1) **wikilink** toevoegen in See also en Navigation; (2) **context** — wordt een bestaande zin scherper als de nieuwe term erin benoemd wordt?; (3) **content** — moet er een nieuwe zin of alinea bij om het analytische belang te verwerken? Alle drie niveaus kunnen van toepassing zijn.

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

Entries met bronnen krijgen een mapstructuur zoals Sigma Male en Looksmaxxing.

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
- Bronbestanden: `Auteur-Jaar.md` (eerste auteur, geen voornaam, koppelteken)
- Secundaire bundel: altijd `Secondary.md`

### Classificatie

| Rol | Wat | Bestand |
|-----|-----|---------|
| `primary` | Peer-reviewed academisch, direct over het fenomeen | eigen `.md` |
| `secondary` | Journalistiek, beschouwend, filosofische achtergrond | samen in `Secondary.md` |
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
entry_image: bestandsnaam.jpg     # optioneel
semantic_landscape: |             # optioneel
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

### Sources callout in entry (index.md)

```markdown
> [!abstract]- Sources
> **[[Auteur-Jaar|Auteur (Jaar)]]** · *Titel* · Tijdschrift · [DOI ↗](url)
> Één zin: wat levert deze bron analytisch op.
>
> **[[Secondary|Auteur (Jaar) · Auteur (Jaar)]]** · [Uitgever ↗](url) · [Uitgever ↗](url)
> Journalistiek + overige achtergrondmaterialen.
```

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

## Sources-structuur protocol

Entries met bronnen krijgen een mapstructuur zoals Sigma Male en Looksmaxxing.

### Mapstructuur

```
Term/
├── index.md           ← de entry
└── Sources/
    ├── index.md       ← bronnen-overzichtspagina
    ├── Auteur-Jaar.md ← per primaire bron één bestand
    ├── Auteur-Jaar.md
    └── Secondary.md   ← alle secundaire bronnen samen
```

### Naamgeving

- Map: exacte termnaam (spaties toegestaan)
- Bronbestanden: `Auteur-Jaar.md` (eerste auteur, geen voornaam, koppelteken)
- Secundaire bundel: altijd `Secondary.md`

### Classificatie

| Rol | Wat | Bestand |
|-----|-----|---------|
| `primary` | Peer-reviewed academisch, direct over het fenomeen | eigen `.md` |
| `secondary` | Journalistiek, beschouwend, filosofische achtergrond | samen in `Secondary.md` |
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
entry_image: bestandsnaam.jpg     # optioneel
semantic_landscape: |             # optioneel
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

### Sources callout in entry (index.md)

```markdown
> [!abstract]- Sources
> **[[Auteur-Jaar|Auteur (Jaar)]]** · *Titel* · Tijdschrift · [DOI ↗](url)
> Één zin: wat levert deze bron analytisch op.
>
> **[[Secondary|Auteur (Jaar) · Auteur (Jaar)]]** · [Uitgever ↗](url) · [Uitgever ↗](url)
> Journalistiek + overige achtergrondmaterialen.
```

### Sources/index.md body

```markdown
Bronmateriaal gebruikt bij de analyse van [[Term]].

**Primary:**
- [[Auteur-Jaar|Auteur (Jaar)]] — één regel omschrijving

**Secondary:**
- [[Secondary|Auteur (Jaar) · Auteur (Jaar)]] — journalistiek + achtergrond

**Behandelde entries:** [[Term]] · [[Verwante term]] · ...
```

---

## Nooit pushen

- `Lumo_V*.md` — staat in `.gitignore`
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
