// The camera on the attention chart: the SVG, its title and its legend as one PNG, with
// the page's colours resolved into the copy, because a stylesheet cannot travel with it.
function resolveVars(el: Element) {
  const cs = getComputedStyle(el)
  for (const attr of ["fill", "stroke"]) {
    const v = el.getAttribute(attr)
    if (v && v.startsWith("var(")) {
      const name = v.slice(4, -1)
      el.setAttribute(attr, cs.getPropertyValue(name).trim() || "#888")
    }
  }
  for (const child of el.children) resolveVars(child)
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

  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg")
  resolveVars(clone)
  // classes carry the type; write it in, the copy has no stylesheet
  for (const t of clone.querySelectorAll("text")) {
    t.setAttribute("font-family", "Barlow Condensed, Helvetica, Arial, sans-serif")
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
  const vb = (clone.getAttribute("viewBox") ?? "0 0 640 200").split(" ").map(Number)
  const W = vb[2]
  const H = vb[3]
  const legend = [...body.querySelectorAll(".attention-legend li")].map((li) => ({
    colour: getComputedStyle(li.querySelector("i") as HTMLElement).backgroundColor,
    text: (li.textContent ?? "").replace(/\s+/g, " ").trim(),
  }))
  const note = (body.querySelector(".attention-note")?.textContent ?? "").replace(/\s+/g, " ").trim()

  const scale = 2
  const pad = 24
  const titleH = 34
  const legendH = 26
  const noteLines = wrap(note, 118)
  const noteH = 14 * noteLines.length + 10
  const canvas = document.createElement("canvas")
  canvas.width = (W + pad * 2) * scale
  canvas.height = (titleH + H + legendH + noteH + pad * 2) * scale
  const ctx = canvas.getContext("2d")!
  ctx.scale(scale, scale)
  ctx.fillStyle = light
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.font = "700 12px Barlow Condensed, Helvetica, Arial, sans-serif"
  ctx.fillStyle = red
  ctx.fillText("ATTENTION CURVE", pad, pad + 12)
  const w1 = ctx.measureText("ATTENTION CURVE").width
  ctx.font = "13px Source Sans Pro, Source Sans 3, Helvetica, Arial, sans-serif"
  ctx.fillStyle = dark
  ctx.fillText(` — the rise and fall of the term ${term}`, pad + w1 + 4, pad + 12)

  const image = new Image()
  image.onload = () => {
    ctx.drawImage(image, pad, pad + titleH, W, H)
    let lx = pad
    const ly = pad + titleH + H + 16
    ctx.font = "12px Barlow Condensed, Helvetica, Arial, sans-serif"
    for (const item of legend) {
      ctx.fillStyle = item.colour
      ctx.fillRect(lx, ly - 5, 12, 3)
      ctx.fillStyle = dark
      ctx.fillText(item.text.toUpperCase(), lx + 16, ly)
      lx += 16 + ctx.measureText(item.text.toUpperCase()).width + 18
    }
    ctx.font = "10px Source Sans Pro, Source Sans 3, Helvetica, Arial, sans-serif"
    ctx.fillStyle = gray
    noteLines.forEach((line, i) => ctx.fillText(line, pad, ly + 18 + i * 14))
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
