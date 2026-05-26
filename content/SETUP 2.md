# SETUP — Cabinet of Digital Terms

*Project Digitale Alertheid — HAN University of Applied Sciences*

---

## Vault structure

```
vault/
├── index.md                          ← Main navigation page
├── SETUP.md                          ← This file
├── Disclaimer of the Cabinet of Digital Terms.md
└── Cabinet of Digital Terms/
    ├── [Cluster Name]/
    │   ├── About [Cluster Name].md   ← Cluster description page
    │   ├── Term One.md               ← Entry
    │   ├── Term One/                 ← Sources subfolder (optional)
    │   │   ├── Lastname_Year_Term.md
    │   │   └── ...
    │   └── ...
    └── ...
```

**Key rules:**
- All term files live inside their cluster folder.
- Cluster names in frontmatter must match the folder name exactly.
- Wikilinks must use the exact filename (without `.md`), never snake_case.

---

## Adding new entries

1. Write the entry using **Lumo V18** (or current version).
2. Save the `.md` file in the correct cluster folder.
3. Add the term to `index.md` — cluster list (term count) and alphabetical term list.
4. Add the term to the cluster's `About [Cluster].md`.
5. Update the term and source counts in `index.md`.
6. **Run the wikilink quality check** (see below) before publishing.

---

## Wikilink Quality Check

Run after every batch of new entries and before publishing a new vault version.

**What it checks:**
- Broken wikilinks (target file does not exist)
- Snake_case links (`[[attention_economy]]` instead of `[[Attention Economy]]`)
- Pipe-links (`[[attention_economy|Attention Economy]]` instead of `[[Attention Economy]]`)
- Links to cluster names instead of term files

**Script — run in terminal from vault root:**

```python
import os, re

vault_dir = 'Cabinet of Digital Terms'  # adjust path as needed

# Build set of all valid filenames (without .md)
valid = set()
for root, dirs, files in os.walk(vault_dir):
    for f in files:
        if f.endswith('.md') and not f.startswith('._'):
            valid.add(f[:-3])

# Find all broken wikilinks
broken_all = {}
for root, dirs, files in os.walk(vault_dir):
    for fname in sorted(files):
        if not fname.endswith('.md') or fname.startswith('._'): continue
        fpath = os.path.join(root, fname)
        with open(fpath, encoding='utf-8', errors='ignore') as f:
            content = f.read()
        # Check both [[link]] and [[link|display]] formats
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

**How to fix broken links:**
- Snake_case → replace with exact filename title
- Non-existent term → remove link, use plain text
- Cluster name → link to `About [Cluster Name]` page instead
- Pipe-link → simplify to `[[Correct Title]]`

---

## Index maintenance

Every time a term is added or removed, update these three numbers in `index.md`:

| Field | Location |
|---|---|
| Total terms | Line ~16: `knowledge bank of N terms` |
| Total terms (bold) | Line ~26: `**N terms**` |
| Total clusters | Line ~26: `**N clusters**` |
| Total sources | Line ~26: `**N verified external sources**` |

Also update the cluster term count in the `<summary>` tag of the relevant cluster section.

---

## Publishing via GitHub Pages / Quartz

See the infrastructure thread for GitHub Actions setup and Quartz configuration.
