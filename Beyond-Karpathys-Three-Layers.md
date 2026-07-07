# Beyond Karpathy's Three Layers: A Cartographic Extension of LLM Knowledge Architecture

*by Marieke de Vogel*

---

## Doctor Alert's Lab

The dominant story about AI and humans goes like this: AI is a train. You can either board it — ideally with a GitHub account and a background in computer science — or be left behind.

I am retired. I am a visual researcher and designer. I have no hardcore background in computer science. I built a knowledge system anyway — and found myself wandering into territory where I couldn't find an existing map that covered my needs.

This is the account of a serendipist in a new technology landscape.

I mention who I am because it matters for what comes next. The insight I want to share did not come from a lab — it came from "Doctor Alert's lab," a main character in [Project Digital Alertness](https://digitale-alertheid.nl), which I developed at the Communication & Multimedia Design programme of HAN University of Applied Sciences, in collaboration with the [Lectorate Media Design](https://www.han.nl/onderzoek/lectoraten/lectoraat-media-design/). Visual thinking — how structure becomes visible, how hierarchy carries meaning, how an image can embody what text cannot — is my discipline. It turned out to be exactly what was missing from the existing frameworks.

Within that project, we research, design, and build conversation pieces: physical and digital artifacts that make the friction and invisible workings of technology tangible and discussable. The [Term Seeker](https://digitale-alertheid.nl/the-term-seeker-reaching-for-language-in-a-digital-world/) is one of those pieces. Physical cards, an interactive installation in progress, and a RAPPID 2026 paper — [Staging Digital Friction](https://digitale-alertheid.nl/staging-digital-friction-accepted-at-rappid-2026/) — are some examples.

The *Cabinet of Digital Terms* is the knowledge backbone of that ecosystem: a structured, analytical vault of terms from digital culture — [Sigma Male](https://mastamarieke.github.io/Cabinet-of-Terms/Cabinet-of-Digital-Terms/Gender--and--Identity/Sigma-Male/), [Looksmaxxing](https://mastamarieke.github.io/Cabinet-of-Terms/Cabinet-of-Digital-Terms/Gender--and--Identity/Looksmaxxing/), [Surveillance Capitalism](https://mastamarieke.github.io/Cabinet-of-Terms/Cabinet-of-Digital-Terms/Privacy--Data-and-Control/Surveillance-Capitalism/) — organized into clusters, layered by analytical function, and published as a navigable knowledge graph at [mastamarieke.github.io/Cabinet-of-Terms](https://mastamarieke.github.io/Cabinet-of-Terms/). We are now exploring how the archive itself can become a conversation piece — how the graph, the clusters, the cartographic layer can work as an alertness tool.

Karpathy had built and described a model for this. I had built something structurally similar, without knowing his existed — the underlying practice traces back to handwritten term-fields I sketched as early as 2017, long before any of this was digital. The earliest sketch of what would become the Cabinet of Digital Terms was first shown [here](https://digitale-alertheid.nl/cabinet-of-digital-terms-a-map-of-the-digital-world-in-267-terms/).

By February 2026, I was using an AI model to systematically generate term analyses; by early March, the analytical framework had gone through more than fifty documented versions. His article, which started circulating in early April 2026, gave me the language to describe what I had been doing. I pushed the vault to GitHub for the first time on 26 May 2026. This article is that description.

---

## Karpathy's architecture — and its operations

In a gist he published outlining a pattern for building personal knowledge bases with LLMs — [*LLM Wiki*](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — Andrej Karpathy structures the pattern in two parts: an **architecture** of three layers, and three **operations** that run on top of it.

**Architecture**

Three layers, each with a distinct role:

- **Raw sources.** Immutable input documents: papers, articles, notes. The LLM reads these but does not write them.
- **The wiki.** LLM-generated markdown files synthesizing the raw sources. The LLM owns this layer entirely.
- **The schema.** A `CLAUDE.md` or `AGENTS.md` file that tells the LLM how the wiki works — structure, conventions, rules for generating content.

**Operations**

Three operations run on top of that architecture:

- **Ingest.** A new source is read and folded into the wiki — one source can touch ten to fifteen pages in a single pass.
- **Query.** A question is answered from the wiki, and good answers get filed back in as new pages.
- **Lint.** A periodic health check for contradictions, stale claims, and orphan pages.

Two further files round out the pattern: `index.md`, a content-oriented catalog of every page the LLM keeps updated on every ingest, and `log.md`, a chronological, append-only record of what happened and when. Neither is a fourth layer — Karpathy is explicit that they exist to help the architecture and operations run smoothly at scale, not to add a new kind of knowledge.

It is an elegant model. It separates what is immutable (sources) from what is generated (wiki) and what is instructional (schema), and it keeps itself healthy through the lint loop. For retrieval-augmented generation, it is close to complete.

But it is fundamentally a document management system. Knowledge lives in the text. Retrieval is linear: source → wiki → schema. This article is about the *architecture* — what the Cabinet of Digital Terms adds to Karpathy's three layers. The operations are a separate question, one I return to only briefly at the end.

---

## How the Cabinet of Terms maps onto Karpathy's model

The Cabinet of Digital Terms maps onto Karpathy's first two layers directly. Raw sources sit in `Sources/` folders per term — immutable, read but not written by the LLM. The wiki is the entries themselves. But even here one divergence matters: **this layer is co-created, not LLM-owned.** I bring the curatorial judgment, the analytical framework, the cartographic perspective; the LLM brings the writing. Neither of us owns the wiki entirely — a point I return to below, because it matters more than one sentence can carry.

The schema, Karpathy's third layer, is where the real divergence starts. `CLAUDE.md` handles maintenance — file structure, naming conventions, workflow. But the deeper schema is `Doctor_Alert.md`: a character crafted as the prompt engineer for instructing the LLM to write curated content. Like a character in a story, Doctor Alert tells the LLM to write not a document but a node — with awareness of where each term sits in a relational topology: which cluster it belongs to, which analytical layer it occupies (cause, mechanism, consequence, or reaction), what its position among surrounding terms reveals. The LLM writes not a document but a node, positioned in a landscape Doctor Alert has defined.

In the tradition of Schön's reflective practitioner, Doctor Alert does not apply a fixed framework — each version is shaped by current developments. Doctor Alert V1 is not the same as Doctor Alert V19; the version number is a record of reflection. Karpathy has one schema; the Cabinet has two, one for structure and one for analysis. And as the next sections show, Doctor Alert's role does not stop at the schema layer.

---

## The fourth layer: the graph

Here is what Karpathy's model does not describe — not the graph itself, but what it means.

Karpathy does mention a graph, in passing: among his tips, he notes that "Obsidian's graph view is the best way to see the shape of your wiki — what's connected to what, which pages are hubs, which are orphans." That is a navigation aid. It shows you what is connected. It does not tell you what the connection *means*.

In the Cabinet of Digital Terms, the *position* of a term in the network is itself analytical information. Not just what a term means — but where it stands:

- Which **cluster** it belongs to (Gender & Identity, AI & Society, Behaviour & Relationships)
- Which **analytical layer** it occupies: is it a cause, a mechanism, a consequence, or a reaction?
- Which **terms link to it** — and which terms it links toward

This is not navigation. This is analysis. The relational topology of the vault is not a map of the content — it *is* the content. A term that sits between Manosphere, Blackpill, and SMV (Sexual Market Value) carries meaning from that position that no single entry can fully articulate.

Karpathy's model builds a second brain — knowledge stored and categorised in documents. The Cabinet of Digital Terms treats knowledge as something that lives not only in documents, but in **the space between them**. Doctor Alert is the instrument of that exploration — and, as the layers below show, its reach extends well past the schema.

---

## The visual grammar layer

Cartography is not just structure. A map without visual grammar is a list.

The Cabinet of Digital Terms translates its analytical framework into a visual grammar built on top of the graph:

- **Color per cluster** — the taxonomy is made visible at a glance
- **Node types** — entries, sources, and cluster nodes are visually distinct: three ontological levels in one image
- **Toggles** — the reader chooses which analytical layer is visible: only entries, only sources, or the full graph with cluster anchors
- **Hierarchy** — the weight of connections shapes the spatial layout

And one element that operates differently from all of these: the **entry image**. For certain terms, a carefully chosen photograph or image is embedded in the entry itself — not as illustration, but as analytical argument. The image embodies something about how the term operates culturally — its texture, its power, its affect — in a way that a definition cannot.

This is a technique I introduced called **Narrative Typography**, applied by the Narrative Typographers — the collective I initiated — who visualise the terms for the Cabinet of Digital Terms. They are co-authors in this cartographic system, translating abstract relationships into entry images that argue rather than decorate.

I have written about this approach in [Narrative Typography: The Metaphoric Visualisation of Terms](https://digitale-alertheid.nl/narrative-typography-the-metaphoric-visualisation-of-terms/).

This visual grammar layer is not decorative. It is functional. It makes the analytical framework legible to a reader who has never read the schema.

---

## The living semantic landscape

The final layer is the smallest — and perhaps the most demanding.

Certain entries in the Cabinet of Digital Terms contain a `semantic_landscape` field: a short text that does not describe the term itself, but describes **how to read the term's position in the graph**. What do its connections mean? What does it reveal about the cluster it inhabits? What becomes visible when you stand at this node and look outward?

The graph itself is already readable and observable — the topology can be seen, navigated, and interpreted. Clusters become visible, connections emerge, central nodes reveal themselves. The semantic landscape adds a second layer: where the graph shows structure visually, the semantic landscape tells the *reader* how to interpret what they are looking at — in words, for one specific node.

But the graph is not static. As the vault grows, new terms shift the topology — connections change, clusters expand, central nodes move. The semantic landscape must move with it. It is not a snapshot. It is a living annotation.

That maintenance does not require a separate protocol. It is embedded in Doctor Alert. When a new cluster or term arrives, `Doctor_Alert_analysis.md` runs the intake: it distinguishes primary research sources from curated secondary literature for the term, maps which entries across relevant clusters hold connections to the new term, and flags which of those entries and clusters need updating — including which semantic landscapes need re-reading and entry `.md` files. Each new version of Doctor Alert reflects on what has changed in the network. The living semantic landscape is not a task. It is part of what Doctor Alert does.

Doctor Alert, then, is not confined to a single role. It is the schema, and it is the same instrument that shapes the visual grammar and maintains the living semantic landscape. One prompting system, operating across three layers of the model — not because the model is underspecified, but because in a cartographic system, structure, visual translation, and annotation are one continuous act of reflection, not three separate ones.

---

## From retrieval to cartography

The difference between Karpathy's model and the Cabinet of Digital Terms is not a matter of scale or sophistication. It is a difference in what knowledge *is*.

Karpathy's model is RAG-oriented: knowledge lives in documents, retrieval brings it to the surface. The Cabinet of Digital Terms is cartographic: knowledge also lives in the space between documents, in the topology of connections, in the visual grammar that makes that topology readable, and in the annotations that teach you how to look.

The Cabinet of Digital Terms is not a filing system where terms happen to be stored near each other. Every connection, every cluster, every position is a deliberate analytical choice. Where a term sits is not a matter of organisation — it is a claim about how digital culture works.

This approach has a lineage. Raymond Williams' *Keywords: A Vocabulary of Culture and Society* (1976) treated words as sites of cultural contest, not neutral labels. *Digital Keywords* (Peters, Princeton UP, 2016) extended that method to the digital domain — 25 deep essays, analytically rich, but a closed book. Cartographic prompting asks: what if that methodology were operationalized at scale, with an LLM as writing partner, a living vault, and a graph as the analytical surface?

I said earlier that the wiki layer is co-created, not LLM-owned, and left it at that. It deserves more, because it cuts against the current framing of AI-authored knowledge as something that either replaces human judgment or merely assists it. Every cluster placement, every semantic landscape, every image chosen by the Narrative Typographers reflects a curatorial decision that a human made and remains accountable for. The LLM proposes a node; a human decides where it stands and what its position means. In practice, that co-creation happens in Visual Studio Code, where the LLM and I work side by side on the same files — the vault itself is built in Obsidian, and every change is pushed and committed to GitHub from there. In a moment where AI autonomy is often treated as an inevitability to be managed rather than a design choice, the Cabinet of Digital Terms takes the opposite position deliberately: curation stays human, structurally, at every layer — including the layers, like the graph and the semantic landscape, that Karpathy's model does not have a place for at all.

To make the extension explicit — and to be precise about what is and isn't being extended:

**Architecture**

| Karpathy | Cabinet | Difference |
|---|---|---|
| Raw sources | `Sources/` folders per term | Match, plus curation — `Doctor_Alert_analysis.md` retroactively determines which existing entries need updating when new sources or terms arrive |
| The wiki | Entries (with an `index.md` per term) | Co-created, not LLM-owned — the curatorial decision stays with me |
| The schema | `CLAUDE.md` + `Doctor_Alert.md` | Two schemas: `CLAUDE.md` for structure, `Doctor_Alert.md` as the prompt engineer for cartographic prompting across all entry and cluster `.md` files |

**Operations**

The Cabinet's operations mirror Karpathy's; the difference lives in the architecture, not the operations. Ingest is creating a new term through the Doctor Alert workflow, query is reading entries and navigating the graph, and lint is the wikilink-check script — all three map directly, with no structural divergence worth a table.

**Indexing & logging**

| Karpathy | Cabinet | Difference |
|---|---|---|
| Index | `index.md` with a cluster count | Match |
| `log.md` | Present | Match |

**Cabinet layers with no Karpathy equivalent**

| Layer | What it is |
|---|---|
| Graph | Topology as analytical argument, not navigation |
| Visual grammar | Cluster colour, node types, toggles |
| Semantic landscape | A reading of the term's position in the graph, in words, per term |
| Narrative Typography | Entry images as analytical argument |

Whether the Cabinet needs its own equivalent of ingest, query, and lint — beyond the sync check that already keeps the local vault, the repository, and the live site aligned — is a question worth asking, but not one this article answers.

The underlying research question is this: can a knowledge bank become a conscious, alert brain — one that knows not just what it contains, but what its contents mean in relation to each other? Doctor Alert is the instrument of that exploration, maintained as a living system: as digital culture produces new terms, Doctor Alert adapts, the vault grows, and the conversation pieces carry that knowledge into public space.

Whether cartographic prompting and the layers it produces can be formalized — whether they point toward a new class of LLM knowledge architecture — is an invitation to take it further.

---

## Open Challenges

This article proposes a cartographic model for LLM knowledge architecture. Three concrete challenges remain:

1. **Visualising the terms** — Collaborating with the Narrative Typographers to develop entry images that function as analytical argument, not illustration. The visual grammar exists; applying it consistently across all terms is work in progress.

2. **Keeping the system current** — Digital culture produces new terms continuously. The intake workflow via `Doctor_Alert_analysis.md` is operational; scaling it while preserving curation quality is the next hurdle.

3. **Scaling co-creation without losing curation** — The Cabinet grows through human judgment at three points: which terms enter, how the cartographic prompt is steered, and whether definitions and connections hold up under scrutiny. What cannot be automated is the question of *what belongs* — and what a term's position in the network actually claims about digital culture. That judgment stays human, by design.

These challenges are invitations. Whether you work in education, knowledge management, design, or AI research — if the model resonates, there is room to take it further.

---

## References

Karpathy, A. (2026, April 4). *LLM Wiki* [Gist]. GitHub. https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f

Peters, B. (Ed.). (2016). *Digital keywords: A vocabulary of information society and culture*. Princeton University Press.

Schön, D. A. (1983). *The reflective practitioner: How professionals think in action*. Basic Books.

Williams, R. (1976). *Keywords: A vocabulary of culture and society*. Oxford University Press.

---

*Marieke de Vogel is a visual researcher and designer. She initiated [Project Digital Alertness](https://digitale-alertheid.nl) at the Communication & Multimedia Design programme of HAN University of Applied Sciences, in collaboration with the [Lectorate Media Design](https://www.han.nl/onderzoek/lectoraten/lectoraat-media-design/). The Cabinet of Digital Terms is live at [mastamarieke.github.io/Cabinet-of-Terms](https://mastamarieke.github.io/Cabinet-of-Terms/).*
