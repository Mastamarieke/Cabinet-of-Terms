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
