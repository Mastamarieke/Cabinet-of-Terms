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
  const noteH = 14 * noteLines.length + 10
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
    ctx.fillStyle = gray
    noteLines.forEach((line, i) => ctx.fillText(line, pad, ly + 4 + i * 14))
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

document.addEventListener("nav", () => {
  for (const btn of document.querySelectorAll<HTMLButtonElement>(".attention-shot")) {
    const handler = () => shoot(btn.closest(".attention-body") as HTMLElement)
    btn.addEventListener("click", handler)
    window.addCleanup(() => btn.removeEventListener("click", handler))
  }
})
