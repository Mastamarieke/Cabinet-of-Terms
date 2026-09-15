// The camera on the attention chart: the SVG, its title and its legend as one PNG, with
// the page's colours resolved into the copy, because a stylesheet cannot travel with it.
// The copy is never in the document, so the variables are read from the page root, not
// from the copy (15-09: a detached clone has no computed style, and every line came out grey).
function resolveVars(el: Element, root: CSSStyleDeclaration) {
  for (const attr of ["fill", "stroke"]) {
    const v = el.getAttribute(attr)
    if (v && v.startsWith("var(")) {
      const name = v.slice(4, -1)
      el.setAttribute(attr, root.getPropertyValue(name).trim() || "#888")
    }
  }
  for (const child of el.children) resolveVars(child, root)
}

function shoot(body: HTMLElement) {
  const svg = body.querySelector("svg.attention-svg") as SVGSVGElement | null
  if (!svg) return
  const term = body.dataset.term ?? "term"
  const root = getComputedStyle(document.documentElement)
  const light = root.getPropertyValue("--light").trim() || "#faf8f8"
  const dark = root.getPropertyValue("--dark").trim() || "#2b2b2b"
  const gray = root.getPropertyValue("--gray").trim() || "#8f8f8f"
  const red = root.getPropertyValue("--han-red").trim() || "#e50056"

  const bodyFont = getComputedStyle(document.body).fontFamily || "Helvetica, Arial, sans-serif"
  const condensed = "Barlow Condensed, Helvetica, Arial, sans-serif"

  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg")
  resolveVars(clone, root)
  // classes carry the type; write it in, the copy has no stylesheet
  for (const t of clone.querySelectorAll("text")) {
    t.setAttribute("font-family", condensed)
    t.setAttribute("font-size", t.classList.contains("attention-year") ? "12" : "11")
    t.setAttribute("fill", t.classList.contains("attention-year") ? "#4e4e4e" : gray)
  }
  for (const l of clone.querySelectorAll(".attention-grid, .attention-base")) {
    l.setAttribute("stroke", "#e5e5e5")
  }
  for (const a of clone.querySelectorAll(".attention-area")) {
    a.setAttribute("opacity", "0.28")
    ;(a as SVGElement).style.mixBlendMode = "multiply"
  }
  for (const b of clone.querySelectorAll(".attention-block")) {
    b.setAttribute("opacity", "0.16")
  }
  for (const c of clone.querySelectorAll(".attention-cursor")) c.remove()
  for (const m of clone.querySelectorAll(".attention-moment")) {
    m.querySelector(".attention-moment-stem")?.setAttribute("stroke", red)
    m.querySelector(".attention-moment-stem")?.setAttribute("stroke-dasharray", "1.5 2.5")
    m.querySelector(".attention-moment-stem")?.setAttribute("opacity", "0.6")
    const dot = m.querySelector(".attention-moment-dot")
    dot?.setAttribute("fill", light)
    dot?.setAttribute("stroke", red)
    dot?.setAttribute("stroke-width", "1.2")
    const num = m.querySelector(".attention-moment-num")
    num?.setAttribute("font-family", condensed)
    num?.setAttribute("font-size", "9.5")
    num?.setAttribute("fill", red)
  }
  const vb = (clone.getAttribute("viewBox") ?? "0 0 640 200").split(" ").map(Number)
  const W = vb[2]
  const H = vb[3]
  // name and figure apart, so that the copy can set them with a space and its own colour
  const legend = [...body.querySelectorAll(".attention-legend li")].map((li) => {
    const peak = li.querySelector(".attention-peak")
    const name = [...li.childNodes]
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent ?? "")
      .join("")
      .replace(/\s+/g, " ")
      .trim()
    return {
      colour: getComputedStyle(li.querySelector("i") as HTMLElement).backgroundColor,
      name: name.toUpperCase(),
      peak: (peak?.textContent ?? "").replace(/\s+/g, " ").trim(),
    }
  })
  const note = (body.querySelector(".attention-note")?.textContent ?? "").replace(/\s+/g, " ").trim()
  const momentLines = [...body.querySelectorAll(".attention-moments li")].flatMap((li) =>
    wrap((li.textContent ?? "").replace(/\s+/g, " ").trim(), 118),
  )

  const scale = 2
  const pad = 24
  const titleH = 34
  // the legend runs on one line and wraps to a second when the figures make it too long
  const probe = document.createElement("canvas").getContext("2d")!
  probe.font = `12px ${condensed}`
  const rows: typeof legend[] = [[]]
  let used = 0
  for (const item of legend) {
    const w = 16 + probe.measureText(item.name).width + 6 + probe.measureText(item.peak).width + 18
    if (used + w > W && rows[rows.length - 1].length) {
      rows.push([])
      used = 0
    }
    rows[rows.length - 1].push(item)
    used += w
  }
  const legendH = 10 + 18 * rows.length
  const noteLines = wrap(note, 118)
  const noteH = 14 * (noteLines.length + momentLines.length) + (momentLines.length ? 18 : 10)
  const canvas = document.createElement("canvas")
  canvas.width = (W + pad * 2) * scale
  canvas.height = (titleH + H + legendH + noteH + pad * 2) * scale
  const ctx = canvas.getContext("2d")!
  ctx.scale(scale, scale)
  ctx.fillStyle = light
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.font = `700 12px ${condensed}`
  ctx.fillStyle = red
  ctx.fillText("ATTENTION CURVE", pad, pad + 12)
  const w1 = ctx.measureText("ATTENTION CURVE").width
  ctx.font = `13px ${bodyFont}`
  ctx.fillStyle = dark
  ctx.fillText(` — the rise and fall of the term ${term}`, pad + w1 + 4, pad + 12)

  const image = new Image()
  image.onload = () => {
    ctx.drawImage(image, pad, pad + titleH, W, H)
    let ly = pad + titleH + H + 16
    for (const row of rows) {
      let lx = pad
      for (const item of row) {
        ctx.font = `12px ${condensed}`
        ctx.fillStyle = item.colour
        ctx.fillRect(lx, ly - 5, 12, 3)
        ctx.fillStyle = dark
        ctx.fillText(item.name, lx + 16, ly)
        lx += 16 + ctx.measureText(item.name).width + 6
        ctx.fillStyle = gray
        ctx.fillText(item.peak, lx, ly)
        lx += ctx.measureText(item.peak).width + 18
      }
      ly += 18
    }
    ctx.font = `10px ${bodyFont}`
    ctx.fillStyle = dark
    momentLines.forEach((line, i) => ctx.fillText(line, pad, ly + 4 + i * 14))
    const noteY = ly + 4 + momentLines.length * 14 + (momentLines.length ? 8 : 0)
    ctx.fillStyle = gray
    noteLines.forEach((line, i) => ctx.fillText(line, pad, noteY + i * 14))
    const a = document.createElement("a")
    a.download = `attention-curve-${term.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`
    a.href = canvas.toDataURL("image/png")
    a.click()
  }
  image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(clone))
}

function wrap(text: string, max: number): string[] {
  const words = text.split(" ")
  const lines: string[] = []
  let line = ""
  for (const w of words) {
    if ((line + " " + w).trim().length > max) {
      lines.push(line.trim())
      line = w
    } else line += " " + w
  }
  if (line.trim()) lines.push(line.trim())
  return lines
}

// The reader's pointer: the month under it, with the real figure of every series, and the
// moment's note where there is one. On a phone a touch does the same; a touch elsewhere
// clears it. The drawing's margins are those of the component (L, R, in viewBox units).
type Readout = {
  months: string[]
  years: number[]
  series: { label: string; colour: string; yearly: boolean; unit: string; values: number[] }[]
  moments: { i: number; n: number; note: string }[]
}
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const monthName = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`
const figure = (v: number, unit: string) => {
  if (unit === "per million") return `${v.toFixed(1)} per million`
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 10_000) return `${Math.round(v / 1_000)}k`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`
  return String(Math.round(v))
}

function pointer(body: HTMLElement) {
  const svg = body.querySelector<SVGSVGElement>("svg.attention-svg")
  const box = body.querySelector<HTMLElement>(".attention-readout")
  const dataEl = body.querySelector<HTMLScriptElement>("script.attention-data")
  if (!svg || !box || !dataEl) return
  let data: Readout
  try {
    data = JSON.parse(dataEl.textContent ?? "")
  } catch {
    return
  }
  const vb = (svg.getAttribute("viewBox") ?? "0 0 640 184").split(" ").map(Number)
  const W = vb[2]
  const L = 34
  const R = 22
  const n = data.months.length
  const cursor = document.createElementNS("http://www.w3.org/2000/svg", "line")
  cursor.setAttribute("class", "attention-cursor")
  cursor.setAttribute("y1", "10")
  cursor.setAttribute("y2", String(vb[3] - 24))
  cursor.setAttribute("visibility", "hidden")
  svg.appendChild(cursor)

  const activate = (nr: number | null) => {
    for (const el of body.querySelectorAll("[data-moment]")) {
      el.classList.toggle("is-active", nr !== null && el.getAttribute("data-moment") === String(nr))
    }
  }
  const show = (clientX: number, clientY: number) => {
    const rect = svg.getBoundingClientRect()
    const xv = ((clientX - rect.left) / rect.width) * W
    const i = Math.max(0, Math.min(n - 1, Math.round(((xv - L) / (W - L - R)) * (n - 1))))
    const xi = L + (i * (W - L - R)) / (n - 1)
    cursor.setAttribute("x1", xi.toFixed(1))
    cursor.setAttribute("x2", xi.toFixed(1))
    cursor.setAttribute("visibility", "visible")
    const month = data.months[i]
    const year = Number(month.slice(0, 4))
    const moment = data.moments.find((m) => m.i === i)
    const rows = data.series.map((s) => {
      const v = s.yearly ? s.values[data.years.indexOf(year)] ?? 0 : s.values[i]
      return `<div><i style="background:${s.colour}"></i>${s.label}${s.yearly ? " <small>(year)</small>" : ""}<span>${figure(v, s.unit)}</span></div>`
    })
    box.innerHTML =
      `<b>${monthName(month)}</b>` + rows.join("") + (moment ? `<p><strong>${moment.n}</strong> ${moment.note}</p>` : "")
    box.hidden = false
    activate(moment ? moment.n : null)
    // the card sits beside the pointer, and flips to the other side near the right edge
    const bodyRect = body.getBoundingClientRect()
    const px = clientX - bodyRect.left
    const py = clientY - bodyRect.top
    const bw = box.offsetWidth
    const left = px + 16 + bw > bodyRect.width ? px - 16 - bw : px + 16
    box.style.left = `${Math.max(0, left)}px`
    box.style.top = `${Math.max(0, py - 12)}px`
  }
  const hide = () => {
    box.hidden = true
    cursor.setAttribute("visibility", "hidden")
    activate(null)
  }
  const onMove = (e: MouseEvent) => show(e.clientX, e.clientY)
  const onTouch = (e: TouchEvent) => {
    const t = e.touches[0]
    if (t) show(t.clientX, t.clientY)
  }
  const onDocTouch = (e: TouchEvent) => {
    if (!body.contains(e.target as Node)) hide()
  }
  svg.addEventListener("mousemove", onMove)
  svg.addEventListener("mouseleave", hide)
  svg.addEventListener("touchstart", onTouch, { passive: true })
  svg.addEventListener("touchmove", onTouch, { passive: true })
  document.addEventListener("touchstart", onDocTouch, { passive: true })
  window.addCleanup(() => {
    svg.removeEventListener("mousemove", onMove)
    svg.removeEventListener("mouseleave", hide)
    svg.removeEventListener("touchstart", onTouch)
    svg.removeEventListener("touchmove", onTouch)
    document.removeEventListener("touchstart", onDocTouch)
    cursor.remove()
  })

  // the list and the marks light each other up
  for (const li of body.querySelectorAll<HTMLElement>(".attention-moments li[data-moment]")) {
    const nr = Number(li.dataset.moment)
    const enter = () => activate(nr)
    const leave = () => activate(null)
    li.addEventListener("mouseenter", enter)
    li.addEventListener("mouseleave", leave)
    window.addCleanup(() => {
      li.removeEventListener("mouseenter", enter)
      li.removeEventListener("mouseleave", leave)
    })
  }
}

document.addEventListener("nav", () => {
  for (const btn of document.querySelectorAll<HTMLButtonElement>(".attention-shot")) {
    const handler = () => shoot(btn.closest(".attention-body") as HTMLElement)
    btn.addEventListener("click", handler)
    window.addCleanup(() => btn.removeEventListener("click", handler))
  }
  for (const body of document.querySelectorAll<HTMLElement>(".attention-body")) pointer(body)
})
