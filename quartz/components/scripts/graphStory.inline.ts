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

// A shared link can name a panel: …/Tradwife/#attention-curve opens the curve and scrolls to
// it; #semantic-landscape and #graph likewise. The details element opens itself, since a
// closed one cannot be scrolled into view in any useful way.
function openNamedPanel() {
  const id = decodeURIComponent(location.hash.slice(1))
  if (!["graph", "semantic-landscape", "attention-curve"].includes(id)) return
  const el = document.getElementById(id)
  if (!el) return
  if (el instanceof HTMLDetailsElement) el.open = true
  requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "start" }))
}

document.addEventListener("nav", () => {
  openNamedPanel()
  window.addEventListener("hashchange", openNamedPanel)
  window.addCleanup(() => window.removeEventListener("hashchange", openNamedPanel))
  for (const btn of document.querySelectorAll<HTMLButtonElement>(".gs-save")) {
    const handler = () => saveLandscape(btn.closest(".gs-landscape") as HTMLElement)
    btn.addEventListener("click", handler)
    window.addCleanup(() => btn.removeEventListener("click", handler))
  }
})
