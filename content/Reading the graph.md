---
---

*Cabinet of Digital Terms — Project Digitale Alertheid, HAN CMD — 2026*

---

## Reading the graph

Every entry carries a graph of its own. It is not decoration and it is not a map of the whole vault: it shows one term and everything the vault says it is connected to. The magnifier in the corner of the panel opens it at full size.

---

## What you are looking at

**The term you are reading sits in the middle**, and stays there. Everything else is arranged around it.

**Its neighbours sit on a ring**, grouped by cluster: each cluster occupies its own arc, with a gap between arcs and its name curving along the rim outside. A term's name carries the colour of its cluster, and so does the line that leads to it, so the groups can be read before a single word is.

**A neighbour with more ties to this term has a bigger dot.** The ring itself is a true circle; how many lines meet at a term is carried by the size of its point, not by its distance.

**Sources sit just inside the ring**, on a dotted line to the term they support, with a book in front of their name. Only the entry's own sources appear. Literature belonging to a neighbouring term is not shown here, because it does not support the term you are reading.

---

## The marks on the lines

| Mark | Meaning |
|---|---|
| **→** | related term — this entry links out to it, and lists it under Related terms |
| **↪** | backlink — that term links here, and this entry does not link back |
| **◇** | cluster page — the About page of the cluster |
| **┄** | source — a dotted tie between a source and the term it belongs to |

An arrow lies along its own line and points at the end it means.

**A line without a mark connects two neighbours to each other.** It needs no mark: a line that does not touch the middle is by definition a link between two of the neighbours, and those lines curve along the rim rather than cutting through the centre. The middle belongs to the term you are reading.

---

## What the graph will not do

**It will not show a relation that is only asserted.** A link between two terms exists in this vault because one of them says something about the other. Where the graph shows a crowd of lines around a term, that is a finding rather than an achievement: it can mean the term is genuinely central, or that its Related terms line has become a collection point.

**It will not keep everything visible at any size.** Above roughly thirty neighbours the drawing gives things up in order of what it can most afford to lose: first the marks on the lines, then the lines between neighbours. The names stay, each along its own spoke, so that a term with sixty neighbours is still drawn the same way as a term with fifteen, only fuller.

**It will not rearrange itself while you read.** The layout is calculated once and then stands still, so the same term looks the same every time you open it.

---

## The three switches

**Sources** shows or hides the entry's own literature.
**Cluster** brings in the other terms of this cluster, including those this entry does not link to — the neighbourhood in the vault rather than the neighbourhood in the text.
**Backlinks** shows the terms that link here without being linked back.

That third one is worth using deliberately. It is the difference between what this entry claims and what the rest of the vault claims about it.

---

## The source pages

An entry that cites literature has a page for it, and that page has a graph of its own. It reads differently, because the thing in the middle is not a term but a set of sources.

**An arrow out (→)** means the source overview names that entry under *Entries covered*: the overview says this literature is also relevant to it. **An arrow in (↪)** means that entry links to a file in this source set: it actually cites the literature. The two are not the same. An entry can be listed as covered without having used a line of it, and the graph shows which is which.

That makes the source graph the one picture in the vault that reports on the work rather than on the network. An entry with an arrow in has been brought into line with the literature. An entry with only an arrow out has not.


## Where the form comes from

None of the drawing is new. The ring with cluster arcs and names along its rim is the form of [Circos](https://doi.org/10.1101/gr.092759.109) (Krzywinski et al., 2009), built for showing relations between chromosome segments: the rim carries the categories, the middle carries the traffic. The term in the centre with its neighbours around it is an [ego network](https://doi.org/10.1016/0165-4896(82)90076-2) (Freeman, 1982), the network seen from one node, which is why two entry graphs can be compared while two force-directed layouts cannot. The map of all twenty clusters bends its lines through the centre in the manner of [hierarchical edge bundling](https://doi.org/10.1109/TVCG.2006.147) (Holten, 2006), so that a thousand links read as traffic between groups. What none of the three provides is the legend as a filter; that came out of curating this vault.

---

*The whole vault has a picture of its own, on All Clusters: twenty circles, one per cluster, with every link drawn between them, and the Cabinet itself in the middle.*
