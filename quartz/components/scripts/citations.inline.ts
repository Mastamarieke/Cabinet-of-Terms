// Notes beside the text (11-10, UX after De Correspondent). Four kinds, all opening under their
// paragraph, one at a time per paragraph; the phrase they belong to turns red when pointed at,
// and stays red while open. Terms from the Cabinet are left alone (they keep Quartz's preview).
//   *      a citation in brackets, "(Source, 2025: what it shows)", becomes an asterisk; the panel
//          shows the source and the gloss. ==phrase== right before it marks what the source supports.
//   ▾ / ▴  a footnote [^1] becomes a note that opens beside the sentence (a word or name explained).
//   ↘ / ↗  a markdown link with a title, [phrase](url "where it goes"): the first tap shows where
//          it goes and turns the arrow up, the second tap goes there.
const isSource = (a: HTMLAnchorElement) =>
  (a.getAttribute("href") ?? "").includes("/Sources/") || a.classList.contains("external")

type Control = { button: HTMLButtonElement; phrase: HTMLElement | null; fill: (panel: HTMLElement) => void; kind: "star" | "note" | "link"; href?: string }

function makePanel(p: HTMLElement) {
  let panel: HTMLDivElement | null = null
  let open: Control | null = null
  const reset = (c: Control) => {
    c.button.setAttribute("aria-expanded", "false")
    if (c.kind === "note") c.button.textContent = "▾"
    if (c.kind === "link") c.button.textContent = "↘"
    c.phrase?.classList.remove("lit")
  }
  const close = () => {
    if (open) reset(open)
    open = null
    if (panel) panel.hidden = true
  }
  return (c: Control) => {
    c.button.addEventListener("click", () => {
      if (open === c) {
        // a link that is open: the second tap goes there
        if (c.kind === "link" && c.href) {
          if (/^https?:/.test(c.href)) window.open(c.href, "_blank", "noopener")
          else window.location.href = c.href
          return
        }
        close()
        return
      }
      if (open) reset(open)
      open = c
      // the panel opens right after the sentence that holds the mark, not under the whole
      // paragraph (11-10: under a long Friction it opened three sentences away from its mark)
      if (!panel) {
        panel = document.createElement("span")
        // a tap on the open panel closes it too, not only a second tap on its mark (11-10);
        // a link inside the panel still works
        panel.addEventListener("click", (e) => {
          if (!(e.target as HTMLElement).closest("a")) close()
        })
      }
      placeAfterSentence(panel, c.button, p)
      panel.className = c.kind === "star" ? "src-panel" : "note-panel"
      panel.replaceChildren()
      c.fill(panel)
      // a visible way to close it (11-10, Marieke: "ik weet nog steeds niet hoe ik hem weer dicht moet klappen")
      const x = document.createElement("button")
      x.type = "button"
      x.className = "panel-close"
      x.setAttribute("aria-label", "Close")
      x.textContent = "×"
      panel.prepend(x)
      panel.hidden = false
      c.button.setAttribute("aria-expanded", "true")
      if (c.kind === "note") c.button.textContent = "▴"
      if (c.kind === "link") c.button.textContent = "↗"
      c.phrase?.classList.add("lit")
    })
    if (c.phrase) {
      c.phrase.classList.add("sourced")
      c.phrase.addEventListener("click", () => c.button.click())
      c.phrase.addEventListener("mouseenter", () => c.button.classList.add("hot"))
      c.phrase.addEventListener("mouseleave", () => c.button.classList.remove("hot"))
      c.button.addEventListener("mouseenter", () => c.phrase!.classList.add("hot"))
      c.button.addEventListener("mouseleave", () => c.phrase!.classList.remove("hot"))
    }
  }
}

// the end of the sentence a mark stands in: the first ". ", "? " or "! " in the text after it
function placeAfterSentence(panel: HTMLElement, mark: Node, p: HTMLElement) {
  for (let n = mark.nextSibling; n; n = n.nextSibling) {
    if (n === panel || n.nodeType !== Node.TEXT_NODE) continue
    const m = /[.!?…]["”’)\]]*(?=\s|$)/.exec(n.textContent ?? "")
    if (!m) continue
    const rest = (n as Text).splitText(m.index + m[0].length)
    p.insertBefore(panel, rest)
    return
  }
  p.append(panel)
}

function button(kind: Control["kind"], label: string) {
  const b = document.createElement("button")
  b.type = "button"
  b.className = kind === "star" ? "src-mark" : kind === "note" ? "note-mark tri" : "note-mark tri arrow"
  b.textContent = kind === "star" ? "*" : kind === "note" ? "▾" : "↘"
  b.setAttribute("aria-expanded", "false")
  b.setAttribute("aria-label", label)
  return b
}

// ==phrase== right before a mark: the highlight becomes the phrase that lights up
function phraseBefore(node: Node | null): HTMLElement | null {
  let n = node
  while (n && n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim() === "") n = n.previousSibling
  if (n instanceof HTMLElement && n.classList.contains("text-highlight")) {
    n.classList.remove("text-highlight")
    return n
  }
  return null
}

// the highlight is not always right before its source: a few words can sit between them (Brussels
// Effect, "==One click…==, many of them … aloud (De Ruiter, 2019)"). Then take the nearest highlight
// earlier in the paragraph, as long as no other mark stands in between.
function phraseEarlier(node: Node | null): HTMLElement | null {
  for (let n = node; n; n = n.previousSibling) {
    if (!(n instanceof HTMLElement)) continue
    if (n.matches("button, .sourced")) return null
    if (n.classList.contains("text-highlight")) {
      n.classList.remove("text-highlight")
      return n
    }
  }
  return null
}

// a note opens with the name it explains, in bold, as in the prototype: "European Commission: the EU's…"
function withName(content: HTMLElement, phrase: HTMLElement | null) {
  if (!phrase) return
  const name = (phrase.textContent ?? "").trim().replace(/^(the|a|an)\s+/i, "")
  // only a name gets its name in bold; a note on a phrase ("mocked the glasses in a video") does not
  if (!name || !/^[A-Z0-9]/.test(name)) return
  const b = document.createElement("strong")
  b.textContent = name + ": "
  const first = content.querySelector("p") ?? content
  first.prepend(b)
}

// the links in a note are its sources: each goes on a line of its own under the explanation, in
// red, as De Correspondent does ("Timothy Snyder: 'The Weaponization Czar'"); write them in the
// footnote as [Publisher: 'Title'](url)
function withSources(content: HTMLElement) {
  const links = [...content.querySelectorAll<HTMLAnchorElement>("a")]
  if (!links.length) return content
  const box = document.createElement("span")
  box.className = "note-sources"
  for (const a of links) {
    a.querySelectorAll("svg, .external-icon").forEach((x) => x.remove())
    if (/^https?:/.test(a.getAttribute("href") ?? "")) {
      a.target = "_blank"
      a.rel = "noopener"
    }
    // what stood around the link in the sentence (" — ", a full stop) goes with it
    const prev = a.previousSibling
    if (prev?.nodeType === Node.TEXT_NODE) prev.textContent = (prev.textContent ?? "").replace(/[\s—–-]+$/, " ")
    const line = document.createElement("span")
    line.append(a)
    box.append(line)
  }
  content.querySelectorAll("p").forEach((p) => {
    if (!(p.textContent ?? "").trim()) p.remove()
  })
  content.append(box)
  return content
}

function setup(p: HTMLElement) {
  if (p.dataset.citeReady) return
  p.dataset.citeReady = "1"
  const add = makePanel(p)

  // ↘ / ↗ links with a title
  for (const a of [...p.querySelectorAll<HTMLAnchorElement>("a[title]")]) {
    if (a.closest(".rt-line") || a.dataset.footnoteRef !== undefined) continue
    const where = a.getAttribute("title") ?? ""
    const href = a.getAttribute("href") ?? ""
    const phrase = document.createElement("span")
    phrase.append(...a.childNodes)
    // Quartz's own icon for a link out goes: the arrow in the round is the sign
    phrase.querySelectorAll("svg, .external-icon").forEach((x) => x.remove())
    const b = button("link", where)
    a.replaceWith(phrase, b)
    add({
      button: b,
      phrase,
      kind: "link",
      href,
      fill: (panel) => {
        const go = document.createElement("a")
        go.href = href
        go.className = "note-go"
        go.textContent = where
        if (/^https?:/.test(href)) {
          go.target = "_blank"
          go.rel = "noopener"
        }
        panel.append(go)
      },
    })
  }

  // ▾ / ▴ footnotes
  for (const ref of [...p.querySelectorAll<HTMLAnchorElement>("a[data-footnote-ref]")]) {
    const id = decodeURIComponent((ref.getAttribute("href") ?? "").replace(/^#/, ""))
    const li = document.getElementById(id)
    if (!li) continue
    const content = li.cloneNode(true) as HTMLElement
    content.querySelectorAll("[data-footnote-backref]").forEach((x) => x.remove())
    const sup = ref.closest("sup") ?? ref
    const phrase = phraseBefore(sup.previousSibling)
    withName(content, phrase)
    const b = button("note", "Explain")
    sup.replaceWith(b)
    li.dataset.inline = "1"
    // a copy each time: moving the nodes left the note empty the second time it opened
    add({ button: b, phrase, kind: "note", fill: (panel) => panel.append(...withSources(content.cloneNode(true) as HTMLElement).childNodes) })
  }

  // * citations in brackets
  const nodes = [...p.childNodes]
  for (let i = 0; i < nodes.length; i++) {
    const start = nodes[i]
    if (start.nodeType !== Node.TEXT_NODE || !(start.textContent ?? "").endsWith("(")) continue
    const links: HTMLAnchorElement[] = []
    const notes: string[] = []
    let j = i + 1
    let ok = false
    while (j < nodes.length) {
      const n = nodes[j]
      if (n instanceof HTMLAnchorElement && isSource(n)) {
        links.push(n)
        notes.push("")
        j++
        continue
      }
      if (n.nodeType === Node.TEXT_NODE) {
        const s = n.textContent ?? ""
        if (s.startsWith(")")) {
          ok = links.length > 0
          break
        }
        // a short gloss after a source, "(Source, 2025: what it shows)"
        if (/^\s*:/.test(s) && links.length) {
          const close = s.indexOf(")")
          const semi = s.indexOf(";")
          if (semi >= 0 && (close < 0 || semi < close)) {
            notes[notes.length - 1] = s.slice(s.indexOf(":") + 1, semi).trim()
            j++
            continue
          }
          if (close >= 0) {
            notes[notes.length - 1] = s.slice(s.indexOf(":") + 1, close).trim()
            n.textContent = s.slice(close)
            ok = true
            break
          }
        }
        if (/^\s*[;,]\s*$/.test(s) && links.length) {
          j++
          continue
        }
      }
      break
    }
    if (!ok) continue
    const end = nodes[j]
    start.textContent = (start.textContent ?? "").slice(0, -1).replace(/\s+$/, "")
    end.textContent = (end.textContent ?? "").slice(1)
    for (let k = i + 1; k < j; k++) nodes[k].remove()
    const phrase = phraseBefore(start.textContent === "" ? start.previousSibling : null) ?? phraseEarlier(start)
    const b = button("star", "Source: " + links.map((a) => a.textContent).join("; "))
    start.after(b)
    add({
      button: b,
      phrase,
      kind: "star",
      fill: (panel) => {
        const label = document.createElement("span")
        label.className = "src-label"
        label.textContent = "Source: "
        panel.append(label)
        links.forEach((a, n) => {
          if (n) panel.append(document.createTextNode(" · "))
          const copy = a.cloneNode(true) as HTMLElement
          // Quartz's icon for a link out does not belong in a source line
          copy.querySelectorAll("svg, .external-icon").forEach((x) => x.remove())
          panel.append(copy)
          if (notes[n]) panel.append(document.createTextNode(`: ${notes[n]}`))
        })
      },
    })
    // the closing text may itself open the next citation: look at it again
    i = j - 1
  }
}

// Read more becomes "Sources — Term", with Primary and Secondary as fold-outs (11-10). The markdown
// keeps "**Read more:**" (CLAUDE.md); a line of sources separated by " · " becomes one per line.
function sourcesBlock(article: HTMLElement) {
  if (article.dataset.sourcesReady) return
  const head = [...article.querySelectorAll<HTMLParagraphElement>(":scope > p")].find(
    (p) => (p.querySelector("strong")?.textContent ?? "").trim() === "Read more:",
  )
  if (!head) return
  article.dataset.sourcesReady = "1"
  const term = document.querySelector("h1.article-title")?.textContent?.trim() ?? ""
  // the whole block folds: "Sources — Term", and inside it Primary and Secondary fold too (11-10)
  const block = document.createElement("details")
  block.className = "sources-block"
  const title = document.createElement("summary")
  title.className = "sources-title"
  title.textContent = term ? `Sources — ${term}` : "Sources"
  block.append(title)

  // collect the parts after the label: (*Primary:* + list), (*Secondary:* + list), or one list
  const parts: { label: string; list: HTMLElement }[] = []
  let n = head.nextElementSibling
  let label = "Sources"
  while (n && (n.tagName === "P" || n.tagName === "UL")) {
    if (n.tagName === "P") {
      const em = (n.textContent ?? "").trim()
      if (/^Primary:?$/i.test(em)) label = "Primary sources"
      else if (/^Secondary:?$/i.test(em)) label = "Secondary sources"
      else break
    } else parts.push({ label, list: n as HTMLElement })
    const next = n.nextElementSibling
    if (n.tagName === "P") n.remove()
    n = next
  }
  for (const part of parts) {
    // a line of links joined by " · " becomes one per line; a shared description goes under the summary
    const items: HTMLElement[] = []
    let shared = ""
    for (const li of [...part.list.querySelectorAll(":scope > li")]) {
      const links = li.querySelectorAll(":scope > a")
      if (links.length > 1) {
        const tail = (li.lastChild?.textContent ?? "").match(/—\s*(.*)$/)
        if (tail) shared = tail[1].trim()
        links.forEach((a) => {
          const one = document.createElement("li")
          one.append(a)
          items.push(one)
        })
      } else items.push(li as HTMLElement)
    }
    const d = document.createElement("details")
    const kind = part.label.startsWith("Primary") ? "primary" : part.label.startsWith("Secondary") ? "secondary" : "plain"
    d.className = `sources-part ${kind}`
    const s = document.createElement("summary")
    s.textContent = `${part.label} (${items.length})`
    d.append(s)
    const role = kind === "primary" ? "Peer-reviewed research that carries the analysis" : kind === "secondary" ? "Journalism, law, statistics and background" : ""
    if (role) {
      const r = document.createElement("p")
      r.className = "sources-role"
      r.textContent = role
      d.append(r)
    }
    if (shared && kind !== "secondary") {
      const note = document.createElement("p")
      note.className = "sources-note"
      note.textContent = shared
      d.append(note)
    }
    const ul = document.createElement("ul")
    ul.append(...items)
    d.append(ul)
    block.append(d)
    part.list.remove()
  }
  head.replaceWith(block)
}

document.addEventListener("nav", () => {
  const article = document.querySelector("article")
  if (!article) return
  sourcesBlock(article as HTMLElement)
  for (const p of article.querySelectorAll<HTMLElement>("p")) {
    if (p.closest(".src-panel, .note-panel, .rt-panel, .graph-story, li, section[data-footnotes]")) continue
    const first = (p.querySelector("strong")?.textContent ?? "").trim()
    if (p.classList.contains("rt-line") || first.startsWith("In the text") || first.startsWith("Related terms") || first.startsWith("Read more")) continue
    setup(p)
  }
  // the footnotes section goes once every note has moved beside its sentence
  for (const sec of article.querySelectorAll<HTMLElement>("section[data-footnotes]")) {
    const items = [...sec.querySelectorAll<HTMLElement>("li[id]")]
    if (items.length && items.every((li) => li.dataset.inline)) sec.hidden = true
  }
})
