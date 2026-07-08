# From LLM Wiki to Cartographic Prompting

### A pattern for building visual, relational knowledge bases with an LLM as sparring partner, not just a generator

*by Marieke de Vogel*

*Tags: Artificial Intelligence, LLM, Knowledge Management, Design Research, Digital Culture*

---

The dominant story about AI and humans goes like this: AI is a train. You can either board it — ideally with a GitHub account and a background in computer science — or be left behind.

I am a retired visual researcher and designer. I have no hardcore background in computer science. I built a knowledge system anyway — and found myself wandering into territory where I couldn't find an existing map that covered my needs.

This is the account of a serendipist in a new technology landscape.

I mention who I am because it matters for what comes next. The insight I want to share did not come from a lab — it came from "Doctor Alert's lab," a main character in [Project Digital Alertness](https://digitale-alertheid.nl/), which I developed at the Communication & Multimedia Design programme of HAN University of Applied Sciences, in collaboration with the [Lectorate Media Design](https://www.han.nl/onderzoek/lectoraten/lectoraat-media-design/). Visual thinking — how structure becomes visible, how hierarchy carries meaning, how an image can embody what text cannot — is my discipline. It turned out to be exactly what was missing from the existing frameworks.

Within that project, we research, design, and build conversation pieces: physical and digital artifacts that make the friction and invisible workings of technology tangible and discussable. The [Term Seeker](https://digitale-alertheid.nl/the-term-seeker-reaching-for-language-in-a-digital-world/) is one of those pieces. Physical cards, an interactive installation in progress, and a RAPPID 2026 paper — [Staging Digital Friction](https://digitale-alertheid.nl/staging-digital-friction-accepted-at-rappid-2026/) — are some examples.

This article argues that Karpathy's three-layer model is a powerful text-first architecture — and that visual and relational knowledge systems can extend it with additional layers: graph, visual grammar, semantic landscape, and public-facing curation.

The *Cabinet of Digital Terms* is the knowledge backbone of that ecosystem: a structured, analytical vault of terms from digital culture — [Sigma Male](https://mastamarieke.github.io/Cabinet-of-Terms/Cabinet-of-Digital-Terms/Gender--and--Identity/Sigma-Male/), [Looksmaxxing](https://mastamarieke.github.io/Cabinet-of-Terms/Cabinet-of-Digital-Terms/Gender--and--Identity/Looksmaxxing/), [Surveillance Capitalism](https://mastamarieke.github.io/Cabinet-of-Terms/Cabinet-of-Digital-Terms/Privacy--Data-and-Control/Surveillance-Capitalism/) — organized into clusters, layered by analytical function, and published as a navigable knowledge graph at [mastamarieke.github.io/Cabinet-of-Terms](https://mastamarieke.github.io/Cabinet-of-Terms/). We are now exploring how the archive itself can become a conversation piece — how the graph, the clusters, the cartographic layer can work as an alertness tool.

Karpathy had built and described a model for this. I had built something structurally similar, without knowing his existed — the underlying practice traces back to handwritten term-fields I sketched as early as 2017, long before any of this was digital. The earliest sketch of what would become the Cabinet of Digital Terms was first shown [here](https://digitale-alertheid.nl/cabinet-of-digital-terms-a-map-of-the-digital-world-in-267-terms/).

*[FIGUUR 1: handgeschreven word cloud]*
*Figure 1. SELF ESTEEM, handwritten word cloud, 2017 by Marieke de Vogel — the earliest sketch of what would become the Cabinet of Digital Terms.*

By February 2026, I was using an AI model to systematically generate term analyses; by early March, the analytical framework had gone through more than fifty documented versions. His article, which started circulating in early April 2026, gave me the language to describe what I had been doing. I pushed the vault to GitHub for the first time on 26 May 2026. This article is that description.

---

## Karpathy's LLM Wiki: architecture — and its operations

In a gist he published outlining a pattern for building personal knowledge bases with LLMs — [*LLM Wiki*](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — Andrej Karpathy structures the pattern in two parts: an architecture of three layers, and three operations that run on top of it.

Three layers, each with a distinct role:

- **Raw sources.** Immutable input documents: papers, articles, notes. The LLM reads these but does not write them.
- **The wiki.** LLM-generated markdown files synthesizing the raw sources. The LLM owns this layer entirely.
- **The schema.** A `CLAUDE.md` or `AGENTS.md` file that tells the LLM how the wiki works — structure, conventions, rules for generating content.

Three operations run on top of that architecture:

- **Ingest.** A new source is read and folded into the wiki — one source can touch ten to fifteen pages in a single pass.
- **Query.** A question is answered from the wiki, and good answers get filed back in as new pages.
- **Lint.** A periodic health check for contradictions, stale claims, and orphan pages.

**Indexing and logging**

Two further files support the pattern: `index.md`, a content-oriented catalog the LLM keeps updated on every ingest, and `log.md`, a chronological, append-only record of what happened and when. They are not a fourth layer; they help the architecture and operations run smoothly at scale.

It is an elegant model. The key insight is persistence: instead of re-deriving knowledge from raw sources on every query — the RAG pattern — the LLM maintains a compiled wiki that grows with each ingest. Knowledge is synthesised once and retrieved thereafter, not reconstructed from scratch. The schema keeps that process disciplined. Together, the three layers form a system that is more than document storage: it is a self-maintaining knowledge artifact.

Others have extended the pattern with hybrid search, team workflows, and newsroom structures. This article proposes a different direction: cartographic.

Yet the model remains text-first. It does not fully account for position — where a term stands in relation to others, and what its placement in a topology reveals. This article is about that architecture: what the Cabinet of Digital Terms adds to Karpathy's three layers. The operations are a separate question, one I return to only briefly at the end.

---

## How the Cabinet of Terms maps onto Karpathy's LLM Wiki

The Cabinet of Digital Terms maps onto Karpathy's first two layers directly: raw sources sit in `Sources/` folders per term, immutable; the wiki is the entries themselves — though curated and co-created, not LLM-owned, a point I expand on later.

The schema, Karpathy's third layer, is where the real divergence starts. `CLAUDE.md` handles maintenance — file structure, naming conventions, workflow. But the deeper schema is `Doctor_Alert.md`: a character crafted as the prompt engineer for instructing the LLM to write curated content.

Doctor Alert is the analytical persona behind the Cabinet's prompt architecture: a designed voice that uses narrative framing to make relational knowledge readable. Like Schön's reflective practitioner, Doctor Alert does not apply a fixed framework: each version adapts to what has changed in the network. The version number is a record of reflection.

Karpathy has one schema; the Cabinet has two — one for structure, one for analysis. That second schema, Doctor Alert, is what I call **cartographic prompting**: a prompting practice that treats the position of each term in a relational topology as itself an analytical argument, not just a storage decision. And as the next sections show, Doctor Alert's role does not stop at the schema layer.

That second schema is itself co-created the same way an entry is: through iteration with the LLM as a virtual sparring partner — proposing restructurings or refinements that get tested against real terms, and are kept, adjusted, or rejected. Doctor Alert V19 is not solely my design executed by the LLM — it is what a dozen rounds of proposal and testing produced.

---

## The graph layer

Here is what Karpathy's model does not describe — not the graph itself, but what it means.

Karpathy does mention a graph, in passing: among his tips, he notes that "Obsidian's graph view is the best way to see the shape of your wiki — what's connected to what, which pages are hubs, which are orphans." This is more than decoration. It acknowledges that knowledge is not just what each document says, but how documents relate. Seeing hubs and orphans is a diagnostic act — it tells you where your knowledge is concentrated and where it is thin. That is a genuine insight, and it points toward topology as something meaningful.

But the graph in Karpathy's model serves the wiki. It is a lens on the wiki's health, not a layer in the architecture. You look at it to find problems — orphans, disconnected clusters, overweight hubs. The graph helps you maintain the system. It does not itself produce analytical claims.

In the Cabinet of Digital Terms, the graph is not only a diagnostic tool. It is an analytical surface. The position of a term in the network is itself a claim about how digital culture works: not just what a term means, but where it stands.

- Which **cluster** it belongs to (Gender & Identity, AI & Society, Behaviour & Relationships)
- Which **analytical layer** it occupies: is it a cause, a mechanism, a consequence, or a reaction?
- Which **terms link to it** — and which terms it links toward

This is not navigation. This is analysis. The relational topology of the vault is not a map of the content — it is the content. A term that sits between Manosphere, Blackpill, and SMV (Sexual Market Value) carries meaning from that position that no single entry can fully articulate.

At the graph layer, cartographic prompting becomes visible — and Doctor Alert maintains the topology.

Karpathy's model builds a second brain — knowledge stored and categorised in documents. The Cabinet of Digital Terms treats knowledge as something that lives not only in documents, but in the space between them. Doctor Alert is the instrument of that exploration.

---

## The visual grammar layer

Cartography is not just structure. A map without visual grammar is a list.

The Cabinet of Digital Terms translates its analytical framework into a visual grammar built on top of the graph:

- **Color per cluster** — the taxonomy is made visible at a glance
- **Node types** — entries, sources, and cluster nodes are visually distinct: three ontological levels in one image
- **Toggles** — the reader chooses which analytical layer is visible: only entries, only sources, or the full graph with cluster anchors
- **Hierarchy** — the weight of connections shapes the spatial layout

And one element that operates differently from all of these: the entry image. For certain terms, a carefully chosen photograph or image is embedded in the entry itself — not as illustration, but as analytical argument. The image embodies something about how the term operates culturally — its texture, its power, its affect — in a way that a definition cannot.

This is a technique I introduced called **Narrative Typography**, applied by the Narrative Typographers — the collective I initiated — who visualise the terms for the Cabinet of Digital Terms. They are co-authors in this cartographic system, translating abstract relationships into entry images that argue rather than decorate.

*[FIGUUR 2: screenshot van de Sigma Male entry]*
*Figure 2. The Sigma Male entry demonstrates how graph topology, semantic landscape, Narrative Typography, and interface design together constitute the cartographic layer.*

I have written about this approach in [Narrative Typography: The Metaphoric Visualisation of Terms](https://digitale-alertheid.nl/narrative-typography-the-metaphoric-visualisation-of-terms/).

At the visual grammar layer, cartographic prompting becomes legible to a reader who has never read the schema. This visual grammar layer is not decorative. It is functional.

---

## The living semantic landscape

The final layer is the smallest — and perhaps the most demanding.

Certain entries in the Cabinet of Digital Terms contain a `semantic_landscape` field: a short text that does not describe the term itself, but describes how to read the term's position in the graph. What do its connections mean? What does it reveal about the cluster it inhabits? What becomes visible when you stand at this node and look outward?

In the current version of the Cabinet, three entries have been fully developed with entry images, source and cluster toggles, and an expandable semantic landscape. The remaining entries are still basic entries. This matters because the cartographic layer is not a static feature added once; it is built entry by entry, as the system grows.

As the Cabinet develops, clusters become visible, connections emerge, and central nodes begin to reveal themselves. The semantic landscape adds a second layer: where the graph shows structure visually, the semantic landscape translates that topology into words — telling the reader how to interpret what they are looking at, for one specific node.

But the graph is not static. As the vault grows, new terms shift the topology — connections change, clusters expand, central nodes move. The semantic landscape must move with it. It is not a snapshot. It is a living annotation.

That maintenance does not require a separate protocol. It is embedded in Doctor Alert. When a new cluster or term arrives, `Doctor_Alert_analysis.md` runs the intake: it distinguishes primary research sources from curated secondary literature for the term, maps which entries across relevant clusters hold connections to the new term, and flags which of those entries and clusters need updating — including which semantic landscapes need re-reading and entry `.md` files. Each new version of Doctor Alert reflects on what has changed in the network. The living semantic landscape is not a task. It is part of what Doctor Alert does.

At the semantic landscape, Doctor Alert translates the graph into text.

Doctor Alert, then, is not confined to a single role. It is the schema, and it is the same instrument that shapes the visual grammar and maintains the living semantic landscape. One prompting system, operating across three layers of the model — not because the model is underspecified, but because in a cartographic system, structure, visual translation, and annotation are one continuous act of reflection, not three separate ones.

---

## From retrieval to curated cartography

The difference between Karpathy's model and the Cabinet of Digital Terms is not a matter of scale or sophistication. It is a difference in what knowledge is.

There is also a difference in address. Karpathy's model is primarily a personal knowledge base; the Cabinet is designed to be public — every term, every connection, every semantic landscape is published as an open, navigable site.

Karpathy's model is not merely RAG-oriented, but it remains text-first: knowledge is gathered from documents, organized through a wiki, and formalized in schema. The Cabinet of Digital Terms is cartographic: knowledge also lives between documents — in the topology of connections, in the visual grammar that makes that topology readable, and in the annotations that teach you how to look.

The Cabinet of Digital Terms is not a filing system where terms happen to be stored near each other. Every connection, every cluster, every position is a deliberate analytical choice. A term's position is not a matter of organisation — it is a claim about how digital culture works.

This approach has a lineage. Raymond Williams' *Keywords: A Vocabulary of Culture and Society* (1976) treated words as sites of cultural contest, not neutral labels. *Digital Keywords* (Peters, Princeton UP, 2016) extended that method to the digital domain — 25 deep essays, analytically rich, but a closed book. The Cabinet sits between that keywords tradition, media literacy, digital-rights glossaries, and LLM-based knowledge architecture. Cartographic prompting asks what happens when that methodology is operationalized at scale, with an LLM as writing partner, a living vault, and a graph as the analytical surface: it extends these traditions cartographically, treating relations, visual grammar, and public navigation as part of the knowledge itself.

I said earlier that the wiki layer is curated and co-created, not LLM-owned, and left it at that. It deserves more, because it cuts against the current framing of AI-authored knowledge as something that either replaces human judgment or merely assists it. Every cluster placement, every semantic landscape, every image chosen by the Narrative Typographers reflects a curatorial decision that a human made and remains accountable for. Terms and clusters come from research and current affairs; a human decides where each one stands and what its position means.

In practice, co-creation happens in Visual Studio Code, where the LLM and I work side by side on the same files. The vault was first built in Obsidian; now the LLM helps generate and revise the markdown files in VS Code, while I review, curate, commit, and push them to GitHub, where they are published with Quartz. Working with an LLM, VS Code, and Quartz together offers more freedom in implementing the UI elements that strengthen the content — toggles, cluster colours, node types, and the visual grammar that makes the cartographic layer legible.

At this scale, curation becomes procedural as well as editorial. The Cabinet now contains more than 250 terms, not all of which have been curated to the same depth. That is not a flaw in the model, but part of the research question: can a knowledge bank be built in such a way that curation, revision, and relational meaning can scale over time, while giving readers insight into the terms of a rapidly changing media landscape? Doctor Alert is the instrument that makes this question workable. It helps identify which terms need revision, which connections should be reconsidered, and where the semantic landscape needs updating. The LLM can propose revisions, but the curatorial frame — what belongs, what matters, and what a term's position claims — remains human.

In that sense, AI is not only one of the objects of digital alertness, but also part of its method and ecosystem.

In a moment where AI autonomy is often treated as an inevitability to be managed rather than a design choice, the Cabinet of Digital Terms takes the opposite position deliberately: curation stays human, structurally, at every layer — including the layers, like the graph and the semantic landscape, that Karpathy's model does not have a place for at all.

---

## The extension, made explicit

To make the extension explicit, here is the architecture in compressed form:

**Architecture**

| Karpathy | Cabinet | Difference |
|---|---|---|
| Raw sources | `Sources/` folders per term | Match, plus curated intake via `Doctor_Alert_analysis.md` |
| The wiki | Entries, with `index.md` per term | Curated and co-created, not LLM-owned |
| The schema | `CLAUDE.md` + `Doctor_Alert.md` | Structure schema + cartographic analysis schema |

Operations and supporting files. Ingest, query, lint, `index.md`, and `log.md` are present, but they are not where the Cabinet diverges. The difference lives in the architecture and in the additional cartographic layers below.

**Cabinet layers with no Karpathy equivalent**

| Layer | What it adds |
|---|---|
| Graph | Topology as analytical argument, not navigation |
| Visual grammar | Cluster colour, node types, toggles |
| Semantic landscape | Textual translation of a term's graph position |
| Narrative Typography | Entry images as analytical argument |
| Publishing | Public-facing knowledge architecture |

Whether the Cabinet needs its own equivalent of ingest, query, and lint — beyond the sync check that already keeps the local vault, the repository, and the live site aligned — is a question worth asking, but not one this article answers.

The underlying research question is this: can a knowledge bank become an alert interpretive system — one that knows not just what it contains, but what its contents mean in relation to each other? Doctor Alert is the instrument of that exploration, maintained as a living system: as digital culture produces new terms, Doctor Alert adapts, the vault grows, and the conversation pieces carry that knowledge into public space.

Whether cartographic prompting and the layers it produces can be formalized — whether they point toward a new class of LLM knowledge architecture — is an invitation to take it further.

---

## Open Challenges

This article proposes a cartographic model for LLM knowledge architecture. Five concrete challenges remain:

1. **Visualising the terms** — Collaborating with the Narrative Typographers to develop entry images that function as analytical argument, not illustration. The visual grammar exists; applying it consistently across all terms is work in progress.

2. **Keeping the system current** — Digital culture produces new terms continuously. The intake workflow via `Doctor_Alert_analysis.md` is operational; the open question is whether the topology can absorb the pace of change without becoming a snapshot rather than a living system.

3. **Preserving epistemic quality at scale** — The real risk of scale isn't technical. It's that curation quietly turns into review. As more terms enter the vault, it becomes tempting to approve a placement the LLM proposes rather than to determine it — and approving is not the same claim as deciding. Each connection must still carry an accountable claim about digital culture, made, not merely checked. Source selection, cluster placement, and link integrity are decisions I make and can verify directly. The analytical prose in an entry is drafted by the LLM and co-created — read, checked, and adjusted by me, though not every entry has yet had the same depth of editorial pass. The challenge is to expand co-creation without letting curatorial judgment collapse into approval without scrutiny — and, eventually, to make that depth of review visible per entry, for instance through an "approved by" marker that does not yet exist.

4. **Automation as prompt, not as judgment** — Algorithmic gap-detection can flag under-connected clusters faster than any human reviewer: a node with few links, a cluster without a bridge, a term that floats without context. That is useful signal. But a gap identified algorithmically is a structural observation; a gap named editorially is a claim about what is missing from the public understanding of digital culture. The challenge is to use the first as a trigger for the second — without collapsing the distinction. And whatever automation enters the workflow, the graph must remain legible to a reader who has never seen a network-analysis dashboard: the visual grammar exists for that reader, not only for people fluent in graph science.

5. **Implementing this beyond one vault** — Cartographic prompting was built for one specific vault, maintained by one accountable curator. The method could in principle transfer — to a classroom, a research team, a knowledge-management project in another domain. But the open question is institutional, not technical: who holds the curatorial role when more participants are involved? Who keeps that role accountable when the project is handed over? The schema can be adapted. The accountability cannot be automated.

These challenges are invitations. Whether you work in education, knowledge management, design, or AI research — if the model resonates, there is room to take it further. This is a non-profit project; if you'd like to collaborate, reach me at [email to follow].

---

## References

Karpathy, A. (2026, April 4). *LLM Wiki* [Gist]. GitHub. https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f

Peters, B. (Ed.). (2016). *Digital keywords: A vocabulary of information society and culture*. Princeton University Press.

Schön, D. A. (1983). *The reflective practitioner: How professionals think in action*. Basic Books.

Williams, R. (1976). *Keywords: A vocabulary of culture and society*. Oxford University Press.

---

*Marieke de Vogel is a visual researcher and designer. She initiated [Project Digital Alertness](https://digitale-alertheid.nl/) at the Communication & Multimedia Design programme of HAN University of Applied Sciences, in collaboration with the [Lectorate Media Design](https://www.han.nl/onderzoek/lectoraten/lectoraat-media-design/).*

*The Cabinet of Digital Terms is live at [mastamarieke.github.io/Cabinet-of-Terms](https://mastamarieke.github.io/Cabinet-of-Terms/). Digital Alertness is live at [digitale-alertheid.nl](https://digitale-alertheid.nl/).*
