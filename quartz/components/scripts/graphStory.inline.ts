// The landscape as a file: the curated prose, headed by the term, the cluster, the date and
// the page it came from, so that it can be pasted into a document or a slide. Plain text
// (.txt), so that it opens anywhere; the bold marks of the source are dropped as noise.
function saveLandscape(box: HTMLElement) {
  const source = box.querySelector<HTMLScriptElement>("script.gs-source")
  if (!source) return
  const term = box.dataset.term ?? "term"
  const cluster = box.dataset.cluster ?? ""
  const text = (source.textContent ?? "")
    .replace(/\\u003c/g, "<")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\(#[^)]+\)/g, "$1")
    .trim()
  const today = new Date().toISOString().slice(0, 10)
  const body =
    `SEMANTIC LANDSCAPE — ${term}\n` +
    (cluster ? `Cluster: ${cluster}\n` : "") +
    `Cabinet of Digital Terms, ${location.href.split("#")[0]}\n` +
    `Retrieved ${today}\n\n` +
    text +
    "\n"
  const blob = new Blob([body], { type: "text/plain;charset=utf-8" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = `semantic-landscape-${term.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

document.addEventListener("nav", () => {
  for (const btn of document.querySelectorAll<HTMLButtonElement>(".gs-save")) {
    const handler = () => saveLandscape(btn.closest(".gs-landscape") as HTMLElement)
    btn.addEventListener("click", handler)
    window.addCleanup(() => btn.removeEventListener("click", handler))
  }
})

// The landscape read aloud, paragraph by paragraph, in the voice the reading bar has. While
// a term is spoken its link lights up and the graph is told (graph-speak), so that the node
// comes forward as it does under the pointer. The text is the paragraphs as they stand on
// the page, so the offsets the voice reports fall on the same characters as the links.
type Span = { start: number; end: number; el: HTMLAnchorElement }

// The same tidying the voice applies (voice.inline.ts, forSpeech), done here per piece of
// text, so that the character offsets the engine reports fall on this text and not on a
// longer one: a dash becomes a comma, and a comma is one character shorter than " — ".
const tidy = (t: string) => t.replace(/\s*[—–]\s*/g, ", ").replace(/\*\*?/g, "").replace(/\s+/g, " ")

function paragraphs(box: HTMLElement): { text: string; spans: Span[] }[] {
  const out: { text: string; spans: Span[] }[] = []
  for (const p of box.querySelectorAll<HTMLElement>(":scope > p")) {
    let text = ""
    const spans: Span[] = []
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += tidy(node.textContent ?? "")
        return
      }
      const el = node as HTMLElement
      if (el.tagName === "A" && el.classList.contains("internal")) {
        const start = text.length
        text += tidy(el.textContent ?? "")
        spans.push({ start, end: text.length, el: el as HTMLAnchorElement })
        return
      }
      for (const c of el.childNodes) walk(c)
    }
    walk(p)
    out.push({ text: text.trim(), spans })
  }
  return out
}

function tellGraph(id: string | null) {
  document.dispatchEvent(new CustomEvent("graph-speak", { detail: { id } }))
}

async function readLandscape(box: HTMLElement, btn: HTMLButtonElement) {
  const voice = window.cabinetVoice
  if (!voice?.supported) return
  if (btn.classList.contains("is-playing")) {
    voice.stop()
    return
  }
  const term = box.dataset.term ?? ""
  const paras = paragraphs(box)
  btn.classList.add("is-playing")
  const speakerIcon = btn.innerHTML
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="6" width="12" height="12" rx="1.5"/></svg>'
  let lit: HTMLAnchorElement | null = null
  const light = (el: HTMLAnchorElement | null) => {
    if (el === lit) return
    lit?.classList.remove("is-spoken")
    lit = el
    lit?.classList.add("is-spoken")
    tellGraph(lit?.dataset.slug ?? null)
  }
  let cancelled = false
  const intro = await voice.speak(`The semantic landscape of ${term}.`, { label: `Landscape of ${term}` })
  cancelled = intro.cancelled
  for (const para of paras) {
    if (cancelled) break
    const r = await voice.speak(para.text, {
      label: `Landscape of ${term}`,
      onBoundary: (i) => {
        // a little slack: engines differ by a character or two on where a word begins
        const hit = para.spans.find((s) => i >= s.start - 2 && i < s.end)
        if (hit) light(hit.el)
      },
    })
    cancelled = r.cancelled
  }
  light(null)
  btn.classList.remove("is-playing")
  btn.innerHTML = speakerIcon
}

document.addEventListener("nav", () => {
  for (const btn of document.querySelectorAll<HTMLButtonElement>(".gs-speak")) {
    const handler = () => void readLandscape(btn.closest(".gs-landscape") as HTMLElement, btn)
    btn.addEventListener("click", handler)
    window.addCleanup(() => btn.removeEventListener("click", handler))
  }
})

// A link from the homepage ("Try it live") lands on a block by its id:
// #semantic-field, #semantic-landscape, #attention-curve, #relations, #narrative-typography.
// A folded block is opened.
document.addEventListener("nav", () => {
  const id = decodeURIComponent(location.hash.slice(1))
  if (!["semantic-field", "semantic-landscape", "attention-curve", "relations", "narrative-typography"].includes(id)) return
  // the Narrative Typography image is plain markdown (![](tradwife.jpg)), so it has no id:
  // take the first image in the entry's text
  const el =
    document.getElementById(id) ??
    (id === "narrative-typography" ? document.querySelector<HTMLElement>("article img") : null)
  if (!el) return
  if (el instanceof HTMLDetailsElement) el.open = true
  setTimeout(() => el.scrollIntoView({ block: "start" }), 300)
})

// Homepage, "The graphs": a click (or Enter/Space) turns a flip card; a link on the back
// still works as a link.
document.addEventListener("nav", () => {
  for (const card of document.querySelectorAll<HTMLElement>(".flipcard")) {
    const turn = (e: Event) => {
      if ((e.target as HTMLElement).closest("a")) return
      if (e instanceof KeyboardEvent) {
        if (e.key !== "Enter" && e.key !== " ") return
        e.preventDefault()
      }
      const on = card.classList.toggle("flipped")
      card.setAttribute("aria-pressed", String(on))
    }
    card.addEventListener("click", turn)
    card.addEventListener("keydown", turn)
    window.addCleanup(() => {
      card.removeEventListener("click", turn)
      card.removeEventListener("keydown", turn)
    })
  }
})

// Homepage, the orbits card (14-10): "Open the orbits" shows the interactive sketch in a
// full-screen layer, like the loupes; without script the link simply opens the page.
document.addEventListener("nav", () => {
  for (const link of document.querySelectorAll<HTMLAnchorElement>("a.orbit-open")) {
    const open = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
      // Quartz strips ".html" from links, so the page address travels in data-src (14-10)
      const src = link.dataset.src ? new URL(link.dataset.src, location.href).href : link.href
      const overlay = document.createElement("div")
      overlay.className = "orbit-overlay"
      overlay.innerHTML = `<div class="orbit-card"><button class="orbit-close" aria-label="Close">×</button><iframe title="You, in orbits of influence" src="${src}"></iframe></div>`
      const close = () => {
        overlay.remove()
        document.removeEventListener("keydown", onKey)
      }
      const onKey = (k: KeyboardEvent) => {
        if (k.key === "Escape") close()
      }
      overlay.addEventListener("click", (c) => {
        if (c.target === overlay || (c.target as HTMLElement).closest(".orbit-close")) close()
      })
      document.addEventListener("keydown", onKey)
      document.body.appendChild(overlay)
    }
    link.addEventListener("click", open)
    window.addCleanup(() => link.removeEventListener("click", open))
  }
})
