// The band under the front-page title. The letters are the pixel face Silkscreen, drawn
// once off screen and read back cell by cell, so that every lit cell becomes a plain block:
// the look of a light board, not of a font. Until the face has loaded, the plain text in
// each item is what shows, so nothing depends on the drawing succeeding.

const UNIT = 3 // device pixels per font pixel at 24px Silkscreen
const CELL = 5 // on-screen size of one block, in SVG units
const INK: Record<string, string> = { white: "#f7f7f2", red: "#e50056" }

let scratch: HTMLCanvasElement | null = null
function blocks(text: string, ink: string): SVGSVGElement {
  scratch ??= document.createElement("canvas")
  const ctx = scratch.getContext("2d", { willReadFrequently: true })!
  const font = "24px Silkscreen"
  ctx.font = font
  const w = Math.ceil(ctx.measureText(text).width) + UNIT * 2
  const h = 30
  scratch.width = w
  scratch.height = h
  ctx.font = font
  ctx.fillStyle = "#fff"
  ctx.textBaseline = "top"
  ctx.fillText(text, UNIT, UNIT)
  const d = ctx.getImageData(0, 0, w, h).data
  const cols = Math.floor(w / UNIT)
  const rows = Math.floor(h / UNIT)
  let rects = ""
  let maxCol = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * UNIT + (UNIT >> 1)
      const y = r * UNIT + (UNIT >> 1)
      if (d[(y * w + x) * 4 + 3] > 110) {
        rects += `<rect x="${c * CELL}" y="${r * CELL}" width="${CELL}" height="${CELL}"/>`
        if (c > maxCol) maxCol = c
      }
    }
  }
  const width = (maxCol + 2) * CELL
  const height = rows * CELL
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`)
  svg.setAttribute("width", String(width))
  svg.setAttribute("height", String(height))
  svg.setAttribute("aria-hidden", "true")
  // the thin line round every block is the background showing through, as in the banner of
  // digitale-alertheid.nl (29-10): --ticker-grid is set per strip in ticker.scss. A block is
  // about two screen pixels wide, so on an ordinary screen a line takes half the letter and the
  // news cannot be read (Marieke, same day); the line is drawn only where pixels are fine enough.
  const grid = window.devicePixelRatio >= 2 ? ` style="stroke:var(--ticker-grid);stroke-width:0.45"` : ""
  svg.innerHTML = `<g fill="${INK[ink] ?? INK.white}"${grid} shape-rendering="crispEdges">${rects}</g>`
  return svg
}

// The face comes from Google Fonts, added to the page when the band first appears. The
// stylesheet has to be in before the face can be asked for, so this waits for it; and the
// face itself is given a few seconds, after which the plain lines stay.
function loadFace(): Promise<unknown> {
  const existing = document.querySelector<HTMLLinkElement>("link[data-ticker-face]")
  const sheet: Promise<unknown> = existing
    ? Promise.resolve()
    : new Promise((resolve, reject) => {
        const link = document.createElement("link")
        link.rel = "stylesheet"
        link.href = "https://fonts.googleapis.com/css2?family=Silkscreen&display=swap"
        link.setAttribute("data-ticker-face", "")
        link.onload = () => resolve(undefined)
        link.onerror = () => reject(new Error("no sheet"))
        document.head.appendChild(link)
      })
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("slow face")), 6000))
  return Promise.race([
    sheet.then(() => document.fonts.load("24px Silkscreen")).then((faces) => {
      if (!faces.length) throw new Error("no face")
    }),
    timeout,
  ])
}

function draw(ticker: HTMLElement) {
  for (const el of ticker.querySelectorAll<HTMLElement>("[data-blocks]")) {
    if (el.childElementCount) continue
    el.appendChild(blocks(el.dataset.blocks ?? "", el.dataset.ink ?? "white"))
  }
  for (const item of ticker.querySelectorAll<HTMLElement>(".ticker-item")) {
    if (item.querySelector("svg")) continue
    const rubric = blocks(item.dataset.rubric ?? "", "red")
    const text = blocks(item.dataset.text ?? "", "white")
    item.querySelector(".ticker-fallback")?.remove()
    item.appendChild(rubric)
    item.appendChild(text)
  }
  ticker.classList.add("drawn")
  // one word-width a second, whatever the length of the news
  const run = ticker.querySelector<HTMLElement>(".ticker-run")
  if (run) ticker.style.setProperty("--ticker-duration", `${Math.max(30, Math.round(run.scrollWidth / 55))}s`)
}

document.addEventListener("nav", () => {
  const ticker = document.querySelector<HTMLElement>(".ticker")
  if (!ticker || ticker.classList.contains("drawn")) return
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    // the plain lines, standing still: no face to load, nothing to draw
    ticker.classList.add("still")
    return
  }
  loadFace()
    .then(() => draw(ticker))
    .catch(() => ticker.classList.add("plain"))
})

// Arriving from the band: #news-<part> opens and points at that part of the entry. Only this
// prefix does it; an ordinary link to the page starts at the text (the panels' own addresses
// were reverted on 16-09 because shared links skipped it). Runs on every page, because Quartz
// bundles the scripts of all layout components; it does nothing without the fragment.
const LEADS: Record<string, string> = {
  literal: "Literal meaning",
  origin: "Origin",
  appeal: "The Appeal",
  friction: "The Friction",
  why: "Why This Matters",
  related: "Related terms",
  sources: "Read more",
}
function partOf(name: string): HTMLElement | null {
  const article = document.querySelector<HTMLElement>("article") ?? document.body
  if (name === "curve") return document.querySelector<HTMLElement>(".graph-story.attention, .attention-empty")
  if (name === "moments") return document.querySelector<HTMLElement>(".graph-story.attention .attention-moments")
  if (name === "landscape") {
    const box = document.querySelector<HTMLElement>(".gs-landscape")
    return box?.closest<HTMLElement>("details") ?? box
  }
  if (name === "graph") return document.querySelector<HTMLElement>(".graph")
  if (name === "definition") return article.querySelector<HTMLElement>("blockquote")
  const lead = LEADS[name]
  if (!lead) return null
  for (const p of article.querySelectorAll<HTMLElement>("p")) {
    const first = p.querySelector("strong")
    if (first && p.firstElementChild === first && first.textContent?.trim().startsWith(lead)) return p
  }
  return null
}

document.addEventListener("nav", () => {
  const m = /^#news-([a-z]+)$/.exec(location.hash)
  if (!m) return
  const el = partOf(m[1])
  if (!el) return
  // a panel opens; a part inside a closed panel opens that panel
  const details = el.matches("details") ? (el as HTMLDetailsElement) : el.closest<HTMLDetailsElement>("details")
  if (details) details.open = true
  // after the panels have drawn, or the page will move under the reader
  setTimeout(() => {
    el.classList.add("news-target")
    el.scrollIntoView({ behavior: "smooth", block: "start" })
    setTimeout(() => el.classList.remove("news-target"), 2600)
  }, 250)
})
