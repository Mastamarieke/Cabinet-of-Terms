// The masthead and the title row above every page (Masthead.tsx), and the cluster cards on the
// front page. Tried out on 07-11-2026 in a separate build before it came here.
//
// Why a script and not plain CSS: the title is centred over the text column and the line under
// it runs from the left edge of Navigation to the right edge of Backlinks, and those edges are
// only known once the columns are laid out. They move after load (fonts, the graph, a resized
// window), so the positions are measured again whenever a column changes size (ResizeObserver).
// Nothing in the page flow changes while scrolling: an earlier version moved the side columns
// with the title and the page jumped back and forth.

const SITE = "Cabinet of Digital Terms"

let mast: HTMLElement | null = null
let head: HTMLElement | null = null
let center: HTMLElement | null = null
let ls: HTMLElement | null = null
let rs: HTMLElement | null = null
let full = 40
let compact = false
let ro: ResizeObserver | null = null

function el(tag: string, text: string, cls?: string, href?: string): HTMLElement {
  const e = document.createElement(tag)
  if (text) e.textContent = text
  if (cls) e.className = cls
  if (href) (e as HTMLAnchorElement).href = href
  return e
}

const desk = () => window.innerWidth > 800

function build() {
  document.getElementById("mast")?.remove()
  document.getElementById("page-head")?.remove()
  mast = head = null
  center = document.querySelector(".center")
  ls = document.querySelector(".left.sidebar")
  rs = document.querySelector(".right.sidebar")
  const h1 = document.querySelector(".center h1.article-title") as HTMLElement | null
  if (!center || !h1) return
  const homeA = ls?.querySelector(".page-title a.pt-site")
  const href = homeA?.getAttribute("href") ?? "/"
  const title = h1.textContent?.trim() ?? SITE

  mast = el("div", "")
  mast.id = "mast"
  mast.appendChild(el("a", SITE, undefined, href))
  document.body.appendChild(mast)

  head = el("div", "")
  head.id = "page-head"
  if (title !== SITE) {
    head.classList.add("on")
    const crumbs = Array.from(document.querySelectorAll(".breadcrumb-element a"))
      .slice(1, -1)
      .filter((a) => a.textContent?.trim() !== "All Clusters")
    // the three pages about the Cabinet say which part they are (08-11-2026)
    const PARTS: Record<string, string> = { "how-it-is-made": "Part 2 of 3", "how-an-entry-grows": "Part 3 of 3" }
    const part = PARTS[document.body.dataset.slug ?? ""]
    if (part) {
      head.appendChild(el("div", part, "path"))
    } else if (crumbs.length) {
      const path = el("div", "", "path")
      crumbs.forEach((a, i) => {
        if (i) path.appendChild(el("span", " › ", "sep"))
        path.appendChild(el("a", a.textContent!.trim(), undefined, a.getAttribute("href") ?? ""))
      })
      head.appendChild(path)
    }
    const t = el("div", title, "ttl")
    const cs = getComputedStyle(h1)
    t.style.fontFamily = cs.fontFamily
    t.style.fontWeight = cs.fontWeight
    t.style.color = cs.color
    t.style.letterSpacing = cs.letterSpacing
    full = parseFloat(cs.fontSize)
    head.appendChild(t)
  }
  document.body.appendChild(head)
  document.documentElement.classList.add("has-head")
  layout(true)
}

// title over the text column; the line under it as wide as the columns
function geo() {
  if (!head || !center) return
  const c = center.getBoundingClientRect()
  const cc = getComputedStyle(center)
  const L = c.left + (parseFloat(cc.paddingLeft) || 0)
  const R = c.right - (parseFloat(cc.paddingRight) || 0)
  // the width without the scrollbar: window.innerWidth counts it, and where scrollbars are
  // always shown the band and the title were a scrollbar wider than the page (08-11-2026)
  const W = document.documentElement.clientWidth
  head.style.paddingLeft = L + "px"
  head.style.paddingRight = W - R + "px"
  // the name in the red band centred over the same column as the title, so the two line up
  // (08-11-2026, Marieke: "de titel is niet uitgelijnd")
  if (mast) {
    mast.style.paddingLeft = L + "px"
    mast.style.paddingRight = W - R + "px"
  }
  let rule = head.querySelector(".rule") as HTMLElement | null
  if (!rule) {
    rule = el("div", "", "rule")
    head.appendChild(rule)
  }
  let a = L
  let b = R
  if (ls && ls.offsetWidth && ls.getBoundingClientRect().left < L - 50) {
    a = ls.getBoundingClientRect().left + (parseFloat(getComputedStyle(ls).paddingLeft) || 0)
  }
  if (rs && rs.offsetWidth && getComputedStyle(rs).display !== "none" && rs.getBoundingClientRect().left > R) {
    b = rs.getBoundingClientRect().right - (parseFloat(getComputedStyle(rs).paddingRight) || 0)
  }
  rule.style.left = a + "px"
  rule.style.width = b - a + "px"
}

function setTitleSize() {
  const t = head?.querySelector(".ttl") as HTMLElement | null
  if (t) t.style.fontSize = (compact ? full * 0.5 : desk() ? full : full * 0.6) + "px"
}

function layout(first: boolean) {
  if (!mast || !head || !center) return
  const MH = mast.getBoundingClientRect().height
  const on = head.classList.contains("on")
  if (first) {
    head.classList.remove("compact")
    compact = false
    setTitleSize()
    const FH = on ? head.offsetHeight : 0
    if (desk()) {
      head.style.top = MH + "px"
      document.body.style.paddingTop = MH + FH + "px"
      for (const s of [ls, rs]) {
        if (!s) continue
        s.style.top = MH + FH + "px"
        s.style.height = `calc(100vh - ${MH + FH}px)`
        s.style.paddingTop = "0px"
      }
      center.style.paddingTop = "1.4rem"
      center.style.marginTop = ""
      align()
    } else {
      document.body.style.paddingTop = MH + "px"
      if (ls) ls.style.top = MH + "px"
      head.style.top = MH + (ls ? ls.getBoundingClientRect().height : 0) + "px"
      center.style.marginTop = FH + "px"
    }
  }
  geo()
  // while scrolling only the header changes, and only on a phone
  const y = window.scrollY
  const want = on && !desk() && (compact ? y > 10 : y > 80)
  if (want !== compact) {
    compact = want
    head.classList.toggle("compact", compact)
    setTitleSize()
  }
}

// Navigation, the first line of the page and the first heading on the right on one line
function align() {
  if (!center) return
  const nav = ls?.querySelector(".page-title") as HTMLElement | null
  const rh = rs?.querySelector("h3")
  const rbox = (rh?.closest(".right.sidebar > *") as HTMLElement | null) ?? null
  const firstLine = (center.querySelector(".content-meta") ?? center.querySelector("article")) as HTMLElement | null
  const pc = center.querySelector(".page-header") as HTMLElement | null
  if (pc) pc.style.marginTop = "0px"
  for (const e of [nav, rbox]) if (e) e.style.marginTop = "0px"
  if (!firstLine) return
  const target = firstLine.getBoundingClientRect().top - center.getBoundingClientRect().top
  for (const [e, col] of [
    [nav, ls],
    [rbox, rs],
  ] as const) {
    if (!e || !col) continue
    const now = e.getBoundingClientRect().top - col.getBoundingClientRect().top
    e.style.marginTop = Math.max(0, target - now) + "px"
  }
}

function watch() {
  ro?.disconnect()
  if (window.ResizeObserver) {
    ro = new ResizeObserver(() => requestAnimationFrame(geo))
    for (const e of [center, ls, rs, document.body]) if (e) ro.observe(e)
  }
  let n = 0
  const iv = setInterval(() => {
    geo()
    if (++n > 12) clearInterval(iv)
  }, 400)
}

// the cluster cards on the front page turn like the cards under "Drawings and images"
function cards() {
  document.querySelectorAll<HTMLElement>(".clustercards .fc").forEach((c) => {
    if (c.dataset.ok) return
    c.dataset.ok = "1"
    const turn = () => c.setAttribute("aria-pressed", String(c.classList.toggle("flipped")))
    c.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest("a")) return
      turn()
    })
    c.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && !(e.target as HTMLElement).closest("a")) {
        e.preventDefault()
        turn()
      }
    })
  })
}

let tick = false
window.addEventListener(
  "scroll",
  () => {
    if (tick) return
    tick = true
    requestAnimationFrame(() => {
      tick = false
      layout(false)
    })
  },
  { passive: true },
)
window.addEventListener("resize", () => layout(true))
window.addEventListener("load", () => (compact ? geo() : layout(true)))

// an iframe on a page carries its address in data-src: Quartz strips ".html" from every
// relative src, so src="static/tijdlijn-versies.html" became a 404 (the same reason popups use
// data-src, see CLAUDE.md "Een losse HTML-pagina op de site")
function frames() {
  document.querySelectorAll<HTMLIFrameElement>("iframe[data-src]").forEach((f) => {
    if (!f.getAttribute("src")) f.src = f.dataset.src!
  })
}

document.addEventListener("nav", () => {
  frames()
  for (const s of [ls, rs]) if (s) s.style.paddingTop = ""
  build()
  watch()
  cards()
  document.fonts?.ready.then(() => layout(true))
  for (const t of [300, 1000, 2500]) setTimeout(() => !compact && layout(true), t)
})
