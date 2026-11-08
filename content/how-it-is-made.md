---
title: How it is made
description: "How the Cabinet of Digital Terms is made: cartographic prompting in five steps, and the drawings and images it grew from."
---

## Cartographic Prompting

The Cabinet asks what you lose when the machine thinks for you, and it is itself written with a language model. The model drafts; the curator chooses the terms and the sources, reads, corrects, and decides where a term belongs, as described in [Cartographic Prompting](https://digitale-alertheid.nl/beyond-karpathys-llm-wiki-cartographic-prompting-as-curatorial-practice/). The model has made mistakes that look right, such as sources that do not exist and links that lead nowhere; each one that was found became a check that now runs for every entry. Sources listed under an entry that its text does not discuss are leads for anyone who wants to research the term further. The Termophile in the quote on the front page is critical of AI and uses it. More about the Cabinet itself: [Cabinet of Digital Terms: A Map of the Digital World](https://digitale-alertheid.nl/cabinet-of-digital-terms-a-map-of-the-digital-world-in-267-terms/).

==Cartographic Prompting==[^cp] is a term the curator coined, because the Cabinet is put together by prompting, curating and directing: a language model does not start from a blank page, it first gets a map.

<div role="list" aria-label="How an entry is made, in five steps" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:8px;margin:1em 0 1.2em"><div style="background:#FDECF2;color:#2b2b2b;border-radius:10px;padding:10px 12px;font-size:.86em;line-height:1.4"><div style="font-weight:700;font-size:1.05em;margin-bottom:3px"><span style="opacity:.6;margin-right:.35em">1</span>A term<span aria-hidden="true" style="float:right;color:#E50056">→</span></div>The curator proposes it and chooses the sources.</div><div style="background:#FAD3E2;color:#2b2b2b;border-radius:10px;padding:10px 12px;font-size:.86em;line-height:1.4"><div style="font-weight:700;font-size:1.05em;margin-bottom:3px"><span style="opacity:.6;margin-right:.35em">2</span>The map<span aria-hidden="true" style="float:right;color:#E50056">→</span></div>The clusters, the terms already there, the writing instructions, where to look.</div><div style="background:#F7B8D0;color:#2b2b2b;border-radius:10px;padding:10px 12px;font-size:.86em;line-height:1.4"><div style="font-weight:700;font-size:1.05em;margin-bottom:3px"><span style="opacity:.6;margin-right:.35em">3</span>Placement<span aria-hidden="true" style="float:right;color:#E50056">→</span></div>The model works out the cluster, the neighbours, and how the term differs from them.</div><div style="background:#F7B8D0;color:#2b2b2b;border-radius:10px;padding:10px 12px;font-size:.86em;line-height:1.4"><div style="font-weight:700;font-size:1.05em;margin-bottom:3px"><span style="opacity:.6;margin-right:.35em">4</span>The curator decides<span aria-hidden="true" style="float:right;color:#E50056">→</span></div>Accepts, corrects, or goes against the model.</div><div style="background:#E50056;color:#ffffff;border-radius:10px;padding:10px 12px;font-size:.86em;line-height:1.4"><div style="font-weight:700;font-size:1.05em;margin-bottom:3px"><span style="opacity:.6;margin-right:.35em">5</span>The entry</div>Written, then revised in up to three versions, cluster by cluster.</div></div>

A map does not explain a city; it shows where things are in relation to each other, where the borders run and what lies at the edges. The Cabinet does the same with words.

<span style="display:block;font-size:.86em;color:var(--darkgray)">Claude is used in production; Claude, ChatGPT and Lumo were used while exploring. The full method: [Cartographic Prompting: Curatorial Practice Alongside Karpathy’s LLM Wiki](https://digitale-alertheid.nl/beyond-karpathys-llm-wiki-cartographic-prompting-as-curatorial-practice/).</span>

<details>
<summary><strong>How it is made, technically</strong></summary>

<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px;margin:.6em 0 1em"><div style="background:#FDECF2;color:#2b2b2b;border-radius:10px;padding:12px 14px;font-size:.86em;line-height:1.45"><div style="display:flex;gap:6px;align-items:center;margin-bottom:2px"><span style="display:inline-flex;align-items:center;justify-content:center;width:1.5em;height:1.5em;border-radius:50%;background:#F4A3C2;color:#2b2b2b;font-size:.85em;font-weight:700">1</span></div><div style="font-weight:700;font-size:1.1em">First version · in Obsidian</div><p style="margin:.45em 0 0">The Cabinet began as notes in Obsidian, a program on the curator's own computer: ten vaults between 27 April and 10 May 2026, then still called <em>Kabinet van Digitale Termen</em>.</p><p style="margin:.45em 0 0">A repository on GitHub keeps every change as a version. Quartz turns the notes into a website on GitHub Pages: online from 29 April, the first full version on 26 May 2026.</p></div><div style="background:#F7B8D0;color:#2b2b2b;border-radius:10px;padding:12px 14px;font-size:.86em;line-height:1.45"><div style="display:flex;gap:6px;align-items:center;margin-bottom:2px"><span style="display:inline-flex;align-items:center;justify-content:center;width:1.5em;height:1.5em;border-radius:50%;background:#EC5590;color:#fff;font-size:.85em;font-weight:700">2</span><span style="display:inline-flex;align-items:center;justify-content:center;width:1.5em;height:1.5em;border-radius:50%;background:#E50056;color:#fff;font-size:.85em;font-weight:700">3</span></div><div style="font-weight:700;font-size:1.1em">Second and third version · in VS Code</div><p style="margin:.45em 0 0">Cartographic Prompting and vibe coding: Claude Code, working in VS Code, writes the entries and the site's own code from a description of what is needed. Lumo and ChatGPT helped with the input.</p><p style="margin:.45em 0 0">Two files guide the model: <strong>Doctor Alert</strong> (writing instructions, search directions, the clusters), which grew out of the earlier prompts Term Seeker and Lumo, and, since July 2026, <strong>CLAUDE.md</strong> (working rules, checks, and what went wrong before). Both stay on the curator's computer, and can be shared when a partner wants to work with the method.</p><p style="margin:.45em 0 0">Before a change is saved, small scripts check that every link leads somewhere, that no term exists twice and that no term is left without links. The graph, the landscape, the curve and the marks in the text are the Cabinet's own code; they show on the site, not in Obsidian, which is now used to read.</p></div></div>

Tools and terms: ==Obsidian==[^obsidian] · ==Quartz==[^quartz] · ==GitHub==[^github] · ==VS Code==[^vscode] · ==vibe coding==[^vibe]

</details>

---

## Cabinet and visualisations

The sketches the Cabinet grew from, the parts of an entry described in [A living lab](./how-an-entry-grows), and the orbit map. Click a card to see it large, with what it shows.

<div class="flipcards flipcards-pair flipcards-detail">
<div class="flipcard" tabindex="0" role="button" aria-pressed="false" aria-label="Word clouds by hand: turn the card">
<div class="flip-face flip-front">
<img class="shot" src="beeld/homepage-woordwolk-self-esteem.jpg" alt="A handwritten word cloud of terms around Self Esteem">
<span class="flip-where">an early iteration, 2017–2018</span><span class="flip-name">Word clouds by hand</span><span class="flip-caption">By Marieke de Vogel</span><span class="flip-tools"><button type="button" class="flip-zoom" data-img="beeld/homepage-woordwolk-self-esteem.jpg" data-alt="Word clouds by hand" aria-label="Enlarge Word clouds by hand">enlarge ⤢</button><span class="flip-turn">turn ↻</span></span>
</div>
<div class="flip-face flip-back">

<span class="flip-name">Word clouds by hand</span>

Long before there was a Cabinet, the terms were collected by hand. This cloud gathers Nomophobia, Quantified Self, Snapchat Dysmorphia, Hikikomori and Tinderella Syndrome around Self Esteem; another one, Rabbit Holes, opens the essay on cartographic prompting. They are the first sketch of the map: words that belong together, before anyone drew the lines.

<span class="flip-turn">turn back ↺</span>
</div>
</div>

<div class="flipcard" tabindex="0" role="button" aria-pressed="false" aria-label="Objects of Interest: turn the card">
<div class="flip-face flip-front">
<img class="shot" src="beeld/homepage-objects-of-interest.jpg" alt="Objects of Interest: fourteen drawn storage jars, each labelled with a theme">
<span class="flip-where">an early iteration, 2023</span><span class="flip-name">Objects of Interest</span><span class="flip-caption">By Marieke de Vogel</span><span class="flip-tools"><button type="button" class="flip-zoom" data-img="beeld/homepage-objects-of-interest.jpg" data-alt="Objects of Interest" aria-label="Enlarge Objects of Interest">enlarge ⤢</button><span class="flip-turn">turn ↻</span></span>
</div>
<div class="flip-face flip-back">

<span class="flip-name">Objects of Interest</span>

An early iteration of the Cabinet, before the clusters had their names: the themes as storage jars, fourteen in two rows, from Post Truth and Well Being to Self Esteem and Learning. The idea held: a cabinet keeps what would otherwise be lost.

<span class="flip-turn">turn back ↺</span>
</div>
</div>

</div>

<div class="flipcards flipcards-grid flipcards-detail">
<div class="flipcard" tabindex="0" role="button" aria-pressed="false" aria-label="Semantic field: turn the card">
<div class="flip-face flip-front">
<img class="shot shot-light" src="beeld/homepage-field-light.png" alt="The semantic field of Privacy Washing"><img class="shot shot-dark" src="beeld/homepage-field.png" alt="The semantic field of Privacy Washing">
<span class="flip-where">in every entry</span><span class="flip-name">Semantic field</span><span class="flip-tools"><button type="button" class="flip-zoom" data-img="beeld/homepage-field-light.png" data-img-dark="beeld/homepage-field.png" data-alt="The semantic field of Privacy Washing" aria-label="Enlarge Semantic field">enlarge ⤢</button><span class="flip-turn">turn ↻</span></span>
</div>
<div class="flip-face flip-back">

<span class="flip-name">Semantic field</span>

The graph above every entry: the term in the middle, its neighbours on a ring grouped by cluster, its sources marked as books. An arrow shows which way a link runs; a line shows how well a relation is argued (thick: discussed in both texts, plain: in one text, dashed: only in Related terms, with a reason). Three switches show or hide the sources, the other terms in the cluster, and the entries that link here without being linked back.

[[Privacy Washing#semantic-field|Try it live in Privacy Washing ↗]]

<span class="flip-turn">turn back ↺</span>
</div>
</div>

<div class="flipcard" tabindex="0" role="button" aria-pressed="false" aria-label="Semantic landscape: turn the card">
<div class="flip-face flip-front">
<img class="shot shot-light" src="beeld/homepage-landscape-light.png" alt="The semantic landscape of Vendor Lock-in"><img class="shot shot-dark" src="beeld/homepage-landscape-dark.png" alt="The semantic landscape of Vendor Lock-in">
<span class="flip-where">since the second version</span><span class="flip-name">Semantic landscape</span><span class="flip-tools"><button type="button" class="flip-zoom" data-img="beeld/homepage-landscape-light.png" data-img-dark="beeld/homepage-landscape-dark.png" data-alt="The semantic landscape of Vendor Lock-in" aria-label="Enlarge Semantic landscape">enlarge ⤢</button><span class="flip-turn">turn ↻</span></span>
</div>
<div class="flip-face flip-back">

<span class="flip-name">Semantic landscape</span>

The graph told as a short story: one thing that surprises, one thread followed through the neighbours, people at the end. The names in it are links. Vendor Lock-in begins: *In a survey of people working with cloud services in British businesses, fewer than half knew what vendor lock-in meant.*

[[Vendor Lock-in#semantic-landscape|Read it in Vendor Lock-in ↗]]

<span class="flip-turn">turn back ↺</span>
</div>
</div>

<div class="flipcard" tabindex="0" role="button" aria-pressed="false" aria-label="Attention curve: turn the card">
<div class="flip-face flip-front">
<img class="shot shot-light" src="beeld/homepage-curve-light-card.png" alt="The attention curve of Tradwife"><img class="shot shot-dark" src="beeld/homepage-curve-dark-card.png" alt="The attention curve of Tradwife">
<span class="flip-where">since the second version</span><span class="flip-name">Attention curve</span><span class="flip-tools"><button type="button" class="flip-zoom" data-img="beeld/homepage-curve-light-card.png" data-img-dark="beeld/homepage-curve-dark-card.png" data-alt="The attention curve of Tradwife" aria-label="Enlarge Attention curve">enlarge ⤢</button><span class="flip-turn">turn ↻</span></span>
</div>
<div class="flip-face flip-back">

<span class="flip-name">Attention curve</span>

When the word drew attention: Wikipedia page views, search interest and research per year, each on its own scale. Numbered moments explain the peaks, or say plainly that no cause was found. In Tradwife the highest peak, April 2024, came three months before the newspaper profile usually credited with it; the likely cause was a radio podcast, and the note says it is not proven.

[[Tradwife#attention-curve|Try it live in Tradwife ↗]]

<span class="flip-turn">turn back ↺</span>
</div>
</div>

<div class="flipcard" tabindex="0" role="button" aria-pressed="false" aria-label="Relations: turn the card">
<div class="flip-face flip-front">
<img class="shot shot-light" src="beeld/homepage-relations-light.png" alt="The relations of Privacy, Data and Control"><img class="shot shot-dark" src="beeld/homepage-relations.png" alt="The relations of Privacy, Data and Control">
<span class="flip-where">on every cluster page</span><span class="flip-name">Relations</span><span class="flip-tools"><button type="button" class="flip-zoom" data-img="beeld/homepage-relations-light.png" data-img-dark="beeld/homepage-relations.png" data-alt="The relations of Privacy, Data and Control" aria-label="Enlarge Relations">enlarge ⤢</button><span class="flip-turn">turn ↻</span></span>
</div>
<div class="flip-face flip-back">

<span class="flip-name">Relations</span>

On every cluster page: how its terms connect to the other clusters, in both directions. On the left the clusters whose terms point in, on the right the clusters its own terms point to. A solid line means a term discusses the other term in its text, a dashed line that it lists it under Related terms, with a reason. Point at a cluster or a term to see only its lines.

[[Privacy, Data and Control#relations|Try it live in Privacy, Data and Control ↗]]

<span class="flip-turn">turn back ↺</span>
</div>
</div>

<div class="flipcard" tabindex="0" role="button" aria-pressed="false" aria-label="Narrative Typography: turn the card">
<div class="flip-face flip-front">
<img class="shot" src="beeld/homepage-tradwife.jpg" alt="Tradwife, drawn as Narrative Typography">
<span class="flip-where">since the second version, in four entries</span><span class="flip-name">Narrative Typography</span><span class="flip-caption">By Narrative Typographer Marieke de Vogel</span><span class="flip-tools"><button type="button" class="flip-zoom" data-img="beeld/homepage-tradwife.jpg" data-alt="Tradwife, drawn as Narrative Typography" aria-label="Enlarge Narrative Typography">enlarge ⤢</button><span class="flip-turn">turn ↻</span></span>
</div>
<div class="flip-face flip-back">

<span class="flip-name">Narrative Typography</span>

The term drawn as an image by a designer, set above the definition, so the form of the word shows its meaning before you read it. So far in Tradwife (Marieke de Vogel), and in Sigma Male, Looksmaxxing and Predatory Design (Anne-Marie Bruinsma); more will follow.

[[Tradwife#narrative-typography|See it in Tradwife ↗]] · [About Narrative Typography](https://digitale-alertheid.nl/narrative-typography-the-metaphoric-visualisation-of-terms/)

<span class="flip-turn">turn back ↺</span>
</div>
</div>

<div class="flipcard" tabindex="0" role="button" aria-pressed="false" aria-label="You, in orbits of influence: turn the card">
<div class="flip-face flip-front">
<img class="shot" src="beeld/homepage-orbits.jpg" alt="The clusters of the Cabinet on five orbits around a person at the centre, joined by coloured lines">
<span class="flip-where">sketch · used in every revision since the third version</span><span class="flip-name">You, in orbits of influence</span><a class="orbit-open" href="https://mastamarieke.github.io/Cabinet-of-Terms/static/orbits-of-influence.html" data-src="static/orbits-of-influence.html">Open the orbits ↗</a><span class="flip-tools"><button type="button" class="flip-zoom" data-img="beeld/homepage-orbits.jpg" data-alt="The clusters of the Cabinet on five orbits around a person at the centre, joined by coloured lines" aria-label="Enlarge You, in orbits of influence">enlarge ⤢</button><span class="flip-turn">turn ↻</span></span>
</div>
<div class="flip-face flip-back">

<span class="flip-name">You, in orbits of influence</span>

The cluster map of the Cabinet, rearranged around you: every cluster sits on the orbit of how close it comes to your daily life. Around it runs a band with the two clusters that do things differently, Design Philosophy and Ethical Design and Counter-Movements, on every orbit. Every line is a link between two terms, counted on 12 October 2026.

The orbits follow the psychologist ==Urie Bronfenbrenner==[^bronfenbrenner], who drew a child's world as circles around the child:

- **microsystem** (1, You): where you are, at home, at school and on your screen;
- **mesosystem** (2, You and others): where your places meet, the phone at the dinner table, the class chat at night;
- **exosystem** (3, The systems you use): places you never enter that still shape your life, such as the offices where your apps are made;
- **macrosystem** (4, Society): the beliefs, laws and words of a whole society;
- **chronosystem** (5, The world and the future): what changes over time, across generations. In Bronfenbrenner this is time itself; here it is drawn as the outermost orbit.

Jessica Navarro and Jonathan Tudge brought the model online in 2022, and found that on a screen the far circles no longer wait their turn: ==a decision taken in an office far away reaches your phone directly, with no parent or teacher in between== ([Navarro and Tudge, 2022](https://doi.org/10.1007/s12144-022-02738-3): Technologizing Bronfenbrenner, on forces from the outer systems that often circumvent parents and educators). Where a cluster sits is a choice, not a measurement. Open the orbits below, point at a cluster to see its links, and click to open it.


<span class="flip-turn">turn back ↺</span>
</div>
</div>

</div>

---

<nav class="pager" aria-label="Pages about the Cabinet, page 2 of 3"><a class="pg-arrow prev" href="./" aria-label="Previous page: Start"><span class="pg-circ">←</span><span class="pg-t">Start</span></a><ol class="pg-steps"><li class="pg-step done"><a href="./"><span class="pg-dot">1</span><span class="pg-part">Part 1</span><span class="pg-lbl">Start</span></a></li><li class="pg-step now"><a href="./how-it-is-made" aria-current="page"><span class="pg-dot">2</span><span class="pg-part">Part 2</span><span class="pg-lbl">How it is made</span></a></li><li class="pg-step next"><a href="./how-an-entry-grows"><span class="pg-dot">3</span><span class="pg-part">Part 3</span><span class="pg-lbl">A living lab</span></a></li></ol><a class="pg-arrow next" href="./how-an-entry-grows" aria-label="Next page: A living lab"><span class="pg-t">A living lab</span><span class="pg-circ">→</span></a></nav>


[^bronfenbrenner]: Developmental psychologist at Cornell University (1917–2005). In *The Ecology of Human Development* (1979) he described how a child grows up inside nested systems, from the family to the culture around it.

[^github]: A platform for keeping projects online, built on Git, a system that tracks every change to a file, so that each step can be traced and undone. [GitHub Docs: About GitHub and Git](https://docs.github.com/en/get-started/start-your-journey/about-github-and-git)

[^obsidian]: A notes app that works with Markdown files: plain text files kept on your own computer, linked to each other so that knowledge grows as a network. [Moreno Maugliani: Een Tweede Brein bouwen met Obsidian](https://morenomaugliani.com/tweede-brein-bouwen-met-obsidian/)

[^quartz]: An open-source tool that turns Markdown files, such as Obsidian notes, into a website. [Quartz](https://quartz.jzhao.xyz/)

[^vibe]: Programming by describing a task in plain language to a language model, which writes the code. The term was coined in February 2025 by Andrej Karpathy, the same Karpathy whose LLM Wiki the essay on Cartographic Prompting answers. [Wikipedia: Vibe coding](https://en.wikipedia.org/wiki/Vibe_coding)

[^vscode]: Visual Studio Code, an open-source program for writing code and text, in which Claude Code works with the files of the Cabinet. [Visual Studio Code](https://code.visualstudio.com/)

[^cp]: Working definition: a prompting practice that takes cartography itself as input (a large language model is instructed with writing instructions, search directions, and content frameworks) so that the placement of digital terms in a relational network reveals which cluster a term belongs to and why.
