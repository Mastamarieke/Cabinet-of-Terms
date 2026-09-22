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
  term?: string
}
// what the player needs from the pointer: the month shown by index, and the pointer held
// still while the curve plays itself
type PointerApi = { showIndex: (i: number) => void; hide: () => void; lock: (on: boolean) => void }
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
  let locked = false
  const showAt = (i: number, clientX: number, clientY: number) => {
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
  const show = (clientX: number, clientY: number) => {
    const rect = svg.getBoundingClientRect()
    const xv = ((clientX - rect.left) / rect.width) * W
    const i = Math.max(0, Math.min(n - 1, Math.round(((xv - L) / (W - L - R)) * (n - 1))))
    showAt(i, clientX, clientY)
  }
  // the player's playhead: the same card, placed by the month rather than by the mouse
  const showIndex = (i: number) => {
    const rect = svg.getBoundingClientRect()
    const x = rect.left + ((L + (i * (W - L - R)) / (n - 1)) / W) * rect.width
    showAt(i, x, rect.top + rect.height * 0.3)
  }
  const hide = () => {
    box.hidden = true
    cursor.setAttribute("visibility", "hidden")
    activate(null)
  }
  const onMove = (e: MouseEvent) => {
    if (!locked) show(e.clientX, e.clientY)
  }
  const onLeave = () => {
    if (!locked) hide()
  }
  const onTouch = (e: TouchEvent) => {
    const t = e.touches[0]
    if (t && !locked) show(t.clientX, t.clientY)
  }
  const onDocTouch = (e: TouchEvent) => {
    if (!locked && !body.contains(e.target as Node)) hide()
  }
  ;(body as unknown as { __attention?: PointerApi }).__attention = {
    showIndex,
    hide,
    lock: (on: boolean) => {
      locked = on
      if (!on) hide()
    },
  }
  svg.addEventListener("mousemove", onMove)
  svg.addEventListener("mouseleave", onLeave)
  svg.addEventListener("touchstart", onTouch, { passive: true })
  svg.addEventListener("touchmove", onTouch, { passive: true })
  document.addEventListener("touchstart", onDocTouch, { passive: true })
  window.addCleanup(() => {
    svg.removeEventListener("mousemove", onMove)
    svg.removeEventListener("mouseleave", onLeave)
    svg.removeEventListener("touchstart", onTouch)
    svg.removeEventListener("touchmove", onTouch)
    document.removeEventListener("touchstart", onDocTouch)
    cursor.remove()
  })

  // the list and the marks light each other up
  for (const li of body.querySelectorAll<HTMLElement>(".attention-moments li[data-moment]")) {
    const nr = Number(li.dataset.moment)
    const enter = () => {
      if (!locked) activate(nr)
    }
    const leave = () => {
      if (!locked) activate(null)
    }
    li.addEventListener("mouseenter", enter)
    li.addEventListener("mouseleave", leave)
    window.addCleanup(() => {
      li.removeEventListener("mouseenter", enter)
      li.removeEventListener("mouseleave", leave)
    })
  }
  // a tap on a mark, or on the number in the list, reads that moment aloud
  for (const mark of body.querySelectorAll<SVGGElement>("svg .attention-moment[data-moment]")) {
    const nr = Number(mark.getAttribute("data-moment"))
    const tap = (e: Event) => {
      e.stopPropagation()
      toggleRead(body, nr)
    }
    mark.addEventListener("click", tap)
    window.addCleanup(() => mark.removeEventListener("click", tap))
  }
  for (const num of body.querySelectorAll<HTMLElement>(".attention-moments li[data-moment] .attention-moment-nr")) {
    const li = num.closest<HTMLElement>("li[data-moment]")
    if (!li) continue
    const nr = Number(li.dataset.moment)
    const tap = () => toggleRead(body, nr)
    num.addEventListener("click", tap)
    window.addCleanup(() => num.removeEventListener("click", tap))
  }
}

// The moments read aloud. A tap on a numbered mark on the curve, or on its number in the list,
// says that moment: the card jumps to the month, mark and line light up, the voice reads the
// note. The play button reads them all, in order, after one sentence that names the curve.
// No music. The first version of 21-09 made the curve sound as it played (Web Audio, one
// voice per series, a bell per moment); Marieke's verdict was "niks", and the sound of the
// curve stays where it was, in the archive file in docs/geluid/. This is the reading.
type Player = { stop: () => void; only: number }
type Playing = { __player?: Player; __attention?: PointerApi }

const SQUARE = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="6" width="12" height="12" rx="1.5"/></svg>'
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function readMoments(body: HTMLElement, only = 0): Player | null {
  const holder = body as unknown as Playing
  const api = holder.__attention
  const dataEl = body.querySelector<HTMLScriptElement>("script.attention-data")
  const voice = window.cabinetVoice
  if (!api || !dataEl || !voice?.supported) return null
  let data: Readout
  try {
    data = JSON.parse(dataEl.textContent ?? "")
  } catch {
    return null
  }
  const list = only ? data.moments.filter((m) => m.n === only) : data.moments
  if (list.length === 0) return null
  const term = data.term ?? body.dataset.term ?? "the term"
  const btn = body.querySelector<HTMLButtonElement>(":scope > .attention-play")
  const playIcon = btn?.innerHTML ?? ""
  if (btn) {
    btn.classList.add("is-playing")
    btn.innerHTML = SQUARE
  }
  api.lock(true)

  let stopped = false
  const stop = () => {
    if (stopped) return
    stopped = true
    document.removeEventListener("voice-stop", onVoiceStop)
    api.lock(false)
    if (btn) {
      btn.classList.remove("is-playing")
      btn.innerHTML = playIcon
    }
    if (holder.__player?.only === only) holder.__player = undefined
    voice.release()
  }
  const onVoiceStop = () => stop()
  document.addEventListener("voice-stop", onVoiceStop)
  const player = { stop, only }
  holder.__player = player

  void (async () => {
    const label = `Attention curve of ${term}`
    voice.hold(label)
    if (!only) {
      const first = monthName(data.months[0])
      const last = monthName(data.months[data.months.length - 1])
      const r = await voice.speak(`${term}. Attention curve, ${first} to ${last}, ${list.length} moments.`, { label })
      if (r.cancelled || stopped) return stop()
      await sleep(400)
    }
    for (const m of list) {
      if (stopped) return
      api.showIndex(m.i)
      const month = monthName(data.months[m.i])
      const r = await voice.speak(`Moment ${m.n}, ${month}. ${m.note}`, { label: `${term}, moment ${m.n}: ${month}` })
      if (r.cancelled || stopped) return stop()
      if (!only) await sleep(700)
    }
    stop()
  })()
  return player
}

// The play button toggles the whole reading; a mark toggles its own moment, and switches
// from whatever was being read to that one.
function toggleRead(body: HTMLElement, only = 0) {
  const holder = body as unknown as Playing
  const running = holder.__player
  if (running) {
    const same = running.only === only
    running.stop()
    window.cabinetVoice?.stop()
    if (same || !only) return
  }
  readMoments(body, only)
}

// The loupe: the whole block again, as large as the window allows, in an overlay. The copy is
// live: the pointer reads it out, the camera works, the moments light up. Closes on ×, on a
// click beside the card, or on Escape.
function loupe(details: HTMLElement) {
  const body = details.querySelector<HTMLElement>(":scope > .attention-body")
  const overlay = details.querySelector<HTMLElement>(":scope > .attention-overlay")
  const card = overlay?.querySelector<HTMLElement>(".attention-overlay-card")
  const btn = body?.querySelector<HTMLButtonElement>(".attention-loupe")
  if (!body || !overlay || !card || !btn) return
  let copy: HTMLElement | null = null
  const close = () => {
    ;(copy as unknown as Playing | null)?.__player?.stop()
    overlay.classList.remove("active")
    overlay.setAttribute("aria-hidden", "true")
    copy?.remove()
    copy = null
    document.body.style.overflow = ""
  }
  const open = () => {
    if (copy) return
    copy = body.cloneNode(true) as HTMLElement
    copy.querySelector(".attention-loupe")?.remove()
    copy.querySelector(".attention-readout")?.replaceChildren()
    copy.querySelector("line.attention-cursor")?.remove()
    card.appendChild(copy)
    overlay.classList.add("active")
    overlay.setAttribute("aria-hidden", "false")
    document.body.style.overflow = "hidden"
    pointer(copy)
    const shot = copy.querySelector<HTMLButtonElement>(".attention-shot")
    shot?.addEventListener("click", () => shoot(copy as HTMLElement))
    const play = copy.querySelector<HTMLButtonElement>(".attention-play")
    play?.addEventListener("click", () => toggleRead(copy as HTMLElement))
  }
  btn.addEventListener("click", open)
  overlay.querySelector(".attention-overlay-close")?.addEventListener("click", close)
  const onBackdrop = (e: MouseEvent) => {
    if (e.target === overlay) close()
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && overlay.classList.contains("active")) close()
  }
  overlay.addEventListener("click", onBackdrop)
  document.addEventListener("keydown", onKey)
  window.addCleanup(() => {
    btn.removeEventListener("click", open)
    overlay.removeEventListener("click", onBackdrop)
    document.removeEventListener("keydown", onKey)
    close()
  })
}

document.addEventListener("nav", () => {
  for (const d of document.querySelectorAll<HTMLElement>("details.attention")) loupe(d)
  for (const btn of document.querySelectorAll<HTMLButtonElement>("details.attention > .attention-body > .attention-shot")) {
    const handler = () => shoot(btn.closest(".attention-body") as HTMLElement)
    btn.addEventListener("click", handler)
    window.addCleanup(() => btn.removeEventListener("click", handler))
  }
  for (const body of document.querySelectorAll<HTMLElement>("details.attention > .attention-body")) pointer(body)
  for (const btn of document.querySelectorAll<HTMLButtonElement>("details.attention > .attention-body > .attention-play")) {
    const body = btn.closest(".attention-body") as HTMLElement
    const handler = () => toggleRead(body)
    btn.addEventListener("click", handler)
    window.addCleanup(() => {
      btn.removeEventListener("click", handler)
      ;(body as unknown as Playing).__player?.stop()
    })
  }
})
