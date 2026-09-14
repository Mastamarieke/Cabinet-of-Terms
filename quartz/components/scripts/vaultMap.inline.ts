import type { ContentDetails } from "../../plugins/emitters/contentIndex"
import { FullSlug, resolveRelative, getFullSlug } from "../../util/path"
import { registerEscapeHandler } from "./util"

// One circle per cluster, the terms of that cluster as points on its rim, and every link in
// the vault drawn between those points. A single ring of 256 names cannot be read; twenty
// small rings can, because each one is small enough to take in at a glance and the traffic
// between them becomes the picture.

const NS = "http://www.w3.org/2000/svg"

function svgEl(name: string, attrs: Record<string, string | number> = {}) {
  const node = document.createElementNS(NS, name)
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value))
  return node
}

// Same palette as the entry graph, so a cluster keeps its colour wherever you meet it.
const clusterColour = (segment: string): string => {
  if (segment.includes("Platform-Mechanisms")) return "#D94A4A"
  if (segment.includes("AI-Specific")) return "#0E9272"
  if (segment.includes("AI-and-Energy")) return "#3F51B5"
  if (segment.includes("Gender")) return "#C56A1A"
  if (segment.includes("Parents")) return "#B88900"
  if (segment.includes("Relationships")) return "#168AAD"
  if (segment.includes("Students")) return "#6A5ACD"
  if (segment.includes("Beauty")) return "#C653A0"
  if (segment.includes("Counter-Movements")) return "#9B3A6D"
  if (segment.includes("Design-Philosophy")) return "#6A8F1F"
  if (segment.includes("SF-as-Ideology")) return "#0097A7"
  if (segment.includes("Culture-Wars")) return "#C44536"
  if (segment.includes("Society-and-Power")) return "#228B4E"
  if (segment.includes("Privacy")) return "#2F80C0"
  if (segment.includes("Inclusion")) return "#607D8B"
  if (segment.includes("Manifestos")) return "#7B3FA1"
  if (segment.includes("Statements-as")) return "#455A64"
  if (segment.includes("End-Times")) return "#C62828"
  if (segment.includes("New-Digital-Professions")) return "#1976D2"
  if (segment.includes("Subcultural")) return "#B83280"
  if (segment.includes("Consequences")) return "#00897B"
  return "#7A7A7A"
}

// The same shortenings the entry graph's legend uses. A name has to fit on the rim of a
// circle of forty pixels, and "Subcultural Vocabulary and Platform Language" never will.
const shortClusterTitles: Record<string, string> = {
  "Beauty,-Influencers--and--Self-Image": "Beauty & Self-Image",
  "Consequences-of-Digital-Behaviour": "Consequences",
  "Culture-Wars-and-Political-Language": "Culture Wars",
  "Design-Philosophy-and-Ethical-Design": "Ethical Design",
  "End-Times-Thinking-and-Elite-Survivalism": "End-Times Thinking",
  "Inclusion,-Accessibility-and-Ageing": "Inclusion & Ageing",
  "New-Digital-Professions": "Digital Professions",
  "Platform-Mechanisms--and--Economics": "Platform Mechanisms",
  "Privacy,-Data-and-Control": "Privacy & Data",
  "Statements-as-Analytical-Object": "Statements",
  "Subcultural-Vocabulary-and-Platform-Language": "Subcultural Vocabulary",
}

const clusterName = (segment: string) =>
  (
    shortClusterTitles[segment] ?? segment.replaceAll("--and--", " & ").replaceAll("-", " ")
  ).toUpperCase()

type Term = {
  id: FullSlug
  title: string
  cluster: string
  x: number
  y: number
  at: number
  degree: number
  dot?: SVGElement
}

const VAULT = "Cabinet-of-Digital-Terms"
const SIZE = 1500
const CENTRE = SIZE / 2

async function renderVaultMap() {
  const container = document.querySelector("#vault-map") as HTMLElement | null
  if (!container) return
  const inner = container.querySelector(".vault-map-inner") as HTMLElement | null
  const stage = container.querySelector(".vault-map-stage") as HTMLElement | null
  const overlay = container.querySelector(".vault-map-overlay") as HTMLElement | null
  if (!inner || !stage || !overlay) return
  inner.innerHTML = ""

  const data = await fetchData
  const here = getFullSlug(window)

  // A term is a page one level inside a cluster, or a folder entry's index.md. Cluster
  // landing pages, draft Concept pages and everything under Sources/ are not terms.
  const terms = new Map<string, Term>()
  const register = (key: string, term: Term) => terms.set(key, term)
  for (const [slug, details] of Object.entries<ContentDetails>(data)) {
    const parts = slug.split("/")
    if (parts[0] !== VAULT || parts.includes("Sources")) continue
    if ((details.tags ?? []).includes("source")) continue
    const flat = parts.length === 3 && parts[2] !== "index" && parts[2] !== "Concept"
    const folder = parts.length === 4 && parts[3] === "index"
    if (!flat && !folder) continue
    const term: Term = {
      id: slug as FullSlug,
      title: details.title ?? parts[parts.length - 1],
      cluster: parts[1],
      x: 0,
      y: 0,
      at: 0,
      degree: 0,
    }
    register(slug, term)
    // A folder entry is linked to as ".../Term", not ".../Term/index", so it answers to both.
    if (folder) register(parts.slice(0, 3).join("/"), term)
  }

  const unique = [...new Set(terms.values())]

  const edges: { a: Term; b: Term; across: boolean }[] = []
  const seen = new Set<string>()
  for (const [slug, details] of Object.entries<ContentDetails>(data)) {
    const from = terms.get(slug)
    if (!from) continue
    for (const link of details.links ?? []) {
      const to = terms.get(link)
      if (!to || to === from) continue
      const key = [from.id, to.id].sort().join("|")
      if (seen.has(key)) continue
      seen.add(key)
      edges.push({ a: from, b: to, across: from.cluster !== to.cluster })
      from.degree++
      to.degree++
    }
  }

  const clusters = [...new Set(unique.map((t) => t.cluster))].sort()
  const members = new Map<string, Term[]>(
    clusters.map((c) => [
      c,
      unique.filter((t) => t.cluster === c).sort((p, q) => p.title.localeCompare(q.title)),
    ]),
  )

  // The twenty circles sit on one ring. Their own radius grows with the number of terms, so
  // a big cluster is visibly bigger rather than just more crowded. Spacing pushes the ring
  // outward while the circles keep their size, which is the only way to make room between
  // them without making each one harder to read.
  const controls = { spacing: 1, nodeSize: 1, labelSize: 1 }
  const geometry = new Map<string, { x: number; y: number; r: number }>()
  let extent = SIZE / 2
  const place = () => {
    const ringRadius = 520 * controls.spacing
    extent = 0
    clusters.forEach((cluster, i) => {
      const angle = (i / clusters.length) * 2 * Math.PI - Math.PI / 2
      const list = members.get(cluster)!
      const r = 24 + list.length * 1.55
      const x = CENTRE + Math.cos(angle) * ringRadius
      const y = CENTRE + Math.sin(angle) * ringRadius
      geometry.set(cluster, { x, y, r })
      extent = Math.max(extent, ringRadius + r + 40)
      list.forEach((term, j) => {
        const at = (j / list.length) * 2 * Math.PI - Math.PI / 2
        term.at = at
        term.x = x + Math.cos(at) * r
        term.y = y + Math.sin(at) * r
      })
    })
  }
  place()

  const edgePath = (edge: { a: Term; b: Term; across: boolean }) => {
    let cx: number
    let cy: number
    if (edge.across) {
      // Bent towards the middle of the map. Parallel journeys between the same two clusters
      // then travel together, which is what turns 786 separate lines into visible traffic.
      const mx = (edge.a.x + edge.b.x) / 2
      const my = (edge.a.y + edge.b.y) / 2
      cx = CENTRE + (mx - CENTRE) * 0.28
      cy = CENTRE + (my - CENTRE) * 0.28
    } else {
      const g = geometry.get(edge.a.cluster)!
      cx = g.x
      cy = g.y
    }
    return `M ${edge.a.x.toFixed(1)} ${edge.a.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${edge.b.x.toFixed(1)} ${edge.b.y.toFixed(1)}`
  }

  // The name runs around its own circle, on the side facing away from the middle of the map,
  // so it reads as the label of that circle and of nothing else. Below the horizon the
  // letters would stand on their heads, so there the arc is walked the other way and the
  // baseline moves out far enough for them to hang the right way up.
  const arcOf = (cluster: string) => {
    const g = geometry.get(cluster)!
    const outward = Math.atan2(g.y - CENTRE, g.x - CENTRE)
    const below = Math.sin(outward) > 0
    const radius = g.r + (below ? 16 : 5)
    const half = (89.5 * Math.PI) / 180
    const from = below ? outward + half : outward - half
    const to = below ? outward - half : outward + half
    return {
      radius,
      d:
        `M ${(g.x + Math.cos(from) * radius).toFixed(1)} ${(g.y + Math.sin(from) * radius).toFixed(1)} ` +
        `A ${radius.toFixed(1)} ${radius.toFixed(1)} 0 0 ${below ? 0 : 1} ` +
        `${(g.x + Math.cos(to) * radius).toFixed(1)} ${(g.y + Math.sin(to) * radius).toFixed(1)}`,
    }
  }

  const termPoint = (term: Term) => {
    const flip = Math.cos(term.at) < 0
    const x = term.x + Math.cos(term.at) * (6 * controls.nodeSize)
    const y = term.y + Math.sin(term.at) * (6 * controls.nodeSize)
    return {
      x,
      y,
      anchor: flip ? "end" : "start",
      rotate: `rotate(${((term.at + (flip ? Math.PI : 0)) * 180) / Math.PI} ${x.toFixed(1)} ${y.toFixed(1)})`,
    }
  }

  const svg = svgEl("svg", {
    class: "vault-map",
    viewBox: `0 0 ${SIZE} ${SIZE}`,
    preserveAspectRatio: "xMidYMid meet",
    role: "img",
    "aria-label": "Map of the Cabinet: every cluster as a circle, every term as a point on it",
  })
  const defs = svgEl("defs")
  const edgeLayer = svgEl("g", { class: "vm-edges" })
  const clusterLayer = svgEl("g", { class: "vm-clusters" })
  const nodeLayer = svgEl("g", { class: "vm-nodes" })
  const labelLayer = svgEl("g", { class: "vm-hover" })
  svg.append(defs, edgeLayer, clusterLayer, nodeLayer, labelLayer)

  const edgeOf = new Map<Term, SVGElement[]>()
  const noteEdge = (term: Term, path: SVGElement) => {
    const list = edgeOf.get(term) ?? []
    list.push(path)
    edgeOf.set(term, list)
  }

  const drawn: { edge: { a: Term; b: Term; across: boolean }; path: SVGElement }[] = []
  for (const edge of edges) {
    const path = svgEl("path", {
      class: `vm-edge${edge.across ? " across" : ""}`,
      d: edgePath(edge),
      stroke: clusterColour(edge.a.cluster),
    })
    edgeLayer.appendChild(path)
    drawn.push({ edge, path })
    noteEdge(edge.a, path)
    noteEdge(edge.b, path)
  }

  const clusterEdges = new Map<string, SVGElement[]>()
  for (const cluster of clusters) {
    const list: SVGElement[] = []
    for (const term of members.get(cluster)!) list.push(...(edgeOf.get(term) ?? []))
    clusterEdges.set(cluster, [...new Set(list)])
  }

  const curved: { cluster: string; label: SVGElement; arcEl: SVGElement; radius: number }[] = []
  const rings: { cluster: string; ring: SVGElement; count: SVGElement }[] = []
  for (const cluster of clusters) {
    const g = geometry.get(cluster)!
    const colour = clusterColour(cluster)
    const group = svgEl("g", { class: "vm-cluster", tabindex: 0, role: "link" })
    const ring = svgEl("circle", { class: "vm-ring", cx: g.x, cy: g.y, r: g.r, stroke: colour })
    group.appendChild(ring)
    const arc = arcOf(cluster)
    const pathId = `vm-arc-${cluster}`
    const arcEl = svgEl("path", { id: pathId, fill: "none", d: arc.d })
    defs.appendChild(arcEl)
    const label = svgEl("text", { class: "vm-cluster-name", fill: colour })
    const onArc = svgEl("textPath", { startOffset: "50%" })
    onArc.setAttribute("href", `#${pathId}`)
    onArc.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", `#${pathId}`)
    onArc.textContent = clusterName(cluster)
    label.appendChild(onArc)
    const full = svgEl("title")
    full.textContent = clusterName(cluster)
    label.appendChild(full)
    group.appendChild(label)
    curved.push({ cluster, label, arcEl, radius: arc.radius })

    // With the name outside, the middle of the circle is free for the count.
    const count = svgEl("text", { class: "vm-count", x: g.x, y: g.y + 4, fill: colour })
    count.textContent = String(members.get(cluster)!.length)
    group.appendChild(count)
    rings.push({ cluster, ring, count })

    const target = `${VAULT}/${cluster}/index` as FullSlug
    const lit = clusterEdges.get(cluster)!
    // In the loupe the ring itself carries the hover; in the small panel the peek below does,
    // over the whole disc, so these stay out of its way there.
    group.addEventListener("pointerenter", () => {
      if (!enlarged()) return
      svg.classList.add("focused")
      for (const path of lit) path.classList.add("lit")
    })
    group.addEventListener("pointerleave", () => {
      if (!enlarged()) return
      svg.classList.remove("focused")
      for (const path of lit) path.classList.remove("lit")
    })
    group.addEventListener("click", () => {
      window.spaNavigate(new URL(resolveRelative(here, target), window.location.toString()))
    })
    clusterLayer.appendChild(group)
  }

  // The subject of this picture is the Cabinet itself, and it sits where the subject sits in
  // every other graph of the vault: in the middle. That is also the densest part of the
  // drawing, so the name gets the same pale halo the term names have.
  const centreLabel = svgEl("text", {
    class: "vm-centre-name",
    x: CENTRE,
    y: CENTRE,
    "text-anchor": "middle",
    "dominant-baseline": "middle",
    tabindex: 0,
    role: "link",
  })
  centreLabel.textContent = "Cabinet of Digital Terms"
  const goHome = () =>
    window.spaNavigate(new URL(resolveRelative(here, "index" as FullSlug), window.location.toString()))
  centreLabel.addEventListener("click", goHome)
  centreLabel.addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Enter") goHome()
  })
  clusterLayer.appendChild(centreLabel)

  const marks: { term: Term; dot: SVGElement; hit: SVGElement; name: SVGElement }[] = []
  const hoverLabel = svgEl("text", { class: "vm-term-name" })
  labelLayer.appendChild(hoverLabel)

  for (const term of unique) {
    const colour = clusterColour(term.cluster)
    const dot = svgEl("circle", {
      class: "vm-node",
      cx: term.x,
      cy: term.y,
      // A term that many others point to is a slightly bigger point. Capped, because degree
      // in this vault runs from one to sixty and an uncapped scale would make one term a
      // blot and the rest identical.
      r: (2.6 + Math.min(term.degree, 24) * 0.11) * controls.nodeSize,
      fill: colour,
      tabindex: 0,
      role: "link",
    })
    dot.setAttribute("data-title", term.title)
    term.dot = dot

    // Every term also carries its name outward along its own spoke, in the colour of its
    // cluster. Hidden while the whole map is in view, where 261 names would be a grey band;
    // shown as soon as you zoom in, which is the moment you are reading one circle.
    const point = termPoint(term)
    const name = svgEl("text", {
      class: "vm-term-label",
      x: point.x,
      y: point.y,
      fill: colour,
      "text-anchor": point.anchor,
      "dominant-baseline": "middle",
      transform: point.rotate,
    })
    name.textContent = term.title
    nodeLayer.appendChild(name)

    // A point of three pixels is not something you can aim at. The visible dot keeps its
    // size and an invisible disc around it takes the pointer.
    const hit = svgEl("circle", { class: "vm-hit", cx: term.x, cy: term.y, r: 7 * controls.nodeSize })

    const lit = edgeOf.get(term) ?? []
    const enter = () => {
      svg.classList.add("focused")
      dot.classList.add("lit")
      for (const path of lit) path.classList.add("lit")
      const outward = term.y < CENTRE ? -1 : 1
      hoverLabel.setAttribute("x", String(term.x))
      hoverLabel.setAttribute("y", String(term.y + outward * 16))
      hoverLabel.setAttribute("fill", colour)
      hoverLabel.textContent = `${term.title} · ${term.degree}`
      hoverLabel.classList.add("shown")
    }
    const leave = () => {
      svg.classList.remove("focused")
      dot.classList.remove("lit")
      for (const path of lit) path.classList.remove("lit")
      hoverLabel.classList.remove("shown")
    }
    hit.addEventListener("pointerenter", enter)
    hit.addEventListener("pointerleave", leave)
    dot.addEventListener("focus", enter)
    dot.addEventListener("blur", leave)
    const go = () =>
      window.spaNavigate(new URL(resolveRelative(here, term.id), window.location.toString()))
    hit.addEventListener("click", go)
    dot.addEventListener("keydown", (e) => {
      if ((e as KeyboardEvent).key === "Enter") go()
    })
    nodeLayer.appendChild(dot)
    labelLayer.appendChild(hit)
    marks.push({ term, dot, hit, name })
  }

  inner.appendChild(svg)

  // Measured once it is on the page rather than guessed from the letter count: a name that
  // would run past the end of its arc is set smaller until it fits. A hidden element has no
  // measurable text, so this runs again the moment the map is opened.
  // Text on a path cannot be measured where it sits: the browser reports the length of what
  // still fits on the path, so a name that was already cut off measured exactly the length
  // of its arc and looked as though it fitted. This one is measured off the path, straight,
  // and only then given its size.
  const ruler = svgEl("text", { class: "vm-cluster-name", visibility: "hidden", x: -9999, y: -9999 })
  labelLayer.appendChild(ruler)
  const widthOf = (text: string, size: number) => {
    ruler.style.fontSize = `${size}px`
    ruler.textContent = text
    return (ruler as SVGTextContentElement).getComputedTextLength?.() ?? 0
  }

  // Below its smallest readable size a name stops shrinking and starts abbreviating, from
  // the back, with a full stop to say so. Cutting at both ends is what produced
  // "UNTER MOVEMEN", which names nothing.
  const abbreviate = (name: string, size: number, room: number) => {
    const words = name.split(" ")
    let text = name
    let width = widthOf(text, size)
    while (width > room) {
      const last = words[words.length - 1].replace(/\.$/, "")
      if (last.length > 4) {
        words[words.length - 1] = `${last.slice(0, -1)}.`
      } else if (words.length > 1) {
        words.pop()
      } else {
        break
      }
      text = words.join(" ")
      width = widthOf(text, size)
    }
    return text
  }

  // Set as an inline style, not as an SVG attribute: a presentation attribute loses to any
  // rule in the stylesheet, so the font-size in the scss was quietly overruling every size
  // computed here.
  const fitNames = () => {
    for (const { cluster, label, radius } of curved) {
      const full = clusterName(cluster)
      const base = 11 * controls.labelSize
      const room = Math.PI * radius * 0.94
      const natural = widthOf(full, base)
      const size = natural > room && natural > 0 ? Math.max(7, base * (room / natural)) : base
      ;(label as SVGElement).style.fontSize = `${size.toFixed(1)}px`
      const onArc = label.querySelector("textPath")
      if (onArc) onArc.textContent = abbreviate(full, size, room)
    }
    for (const { name } of marks) {
      ;(name as SVGElement).style.fontSize = `${(8 * controls.labelSize).toFixed(1)}px`
    }
  }
  fitNames()

  // Zoom and pan by moving the window the picture is seen through, rather than by scaling
  // the drawing: at any magnification the lines keep their hairline weight and the labels
  // their size, which is the whole reason to draw this in vectors.
  // The frame follows the drawing. Push the circles apart and the view widens to keep them
  // in sight, instead of the map growing out of its own window.
  const home = { x: 0, y: 0, w: SIZE, h: SIZE }
  const reframe = () => {
    home.x = CENTRE - extent
    home.y = CENTRE - extent
    home.w = 2 * extent
    home.h = 2 * extent
  }
  reframe()
  const view = { ...home }
  const applyView = () => {
    svg.setAttribute("viewBox", `${view.x} ${view.y} ${view.w} ${view.h}`)
    svg.classList.toggle("zoomed", view.w < SIZE * 0.55)
  }
  const toHome = () => {
    reframe()
    Object.assign(view, home)
    applyView()
  }

  // A short glide of the viewBox between two frames, for the peek below: a jump would
  // read as a different drawing, a glide as the same one coming closer.
  let gliding = 0
  const glideTo = (to: { x: number; y: number; w: number; h: number }, ms = 520) => {
    cancelAnimationFrame(gliding)
    const from = { ...view }
    const t0 = performance.now()
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms)
      const e = 1 - Math.pow(1 - k, 3)
      view.x = from.x + (to.x - from.x) * e
      view.y = from.y + (to.y - from.y) * e
      view.w = from.w + (to.w - from.w) * e
      view.h = from.h + (to.h - from.h) * e
      applyView()
      if (k < 1) gliding = requestAnimationFrame(step)
    }
    gliding = requestAnimationFrame(step)
  }

  // Every mark keeps a reference to itself, so a change of spacing moves the drawing rather
  // than building it again: 1700 elements rebuilt on every step of a slider would stutter.
  const applyLayout = () => {
    place()
    for (const { edge, path } of drawn) path.setAttribute("d", edgePath(edge))
    for (const { cluster, ring, count } of rings) {
      const g = geometry.get(cluster)!
      ring.setAttribute("cx", g.x.toFixed(1))
      ring.setAttribute("cy", g.y.toFixed(1))
      ring.setAttribute("r", g.r.toFixed(1))
      count.setAttribute("x", g.x.toFixed(1))
      count.setAttribute("y", (g.y + 4).toFixed(1))
    }
    for (const item of curved) {
      const arc = arcOf(item.cluster)
      item.arcEl.setAttribute("d", arc.d)
      item.radius = arc.radius
    }
    for (const { term, dot, hit, name } of marks) {
      dot.setAttribute("cx", term.x.toFixed(1))
      dot.setAttribute("cy", term.y.toFixed(1))
      dot.setAttribute("r", ((2.6 + Math.min(term.degree, 24) * 0.11) * controls.nodeSize).toFixed(2))
      hit.setAttribute("cx", term.x.toFixed(1))
      hit.setAttribute("cy", term.y.toFixed(1))
      hit.setAttribute("r", (7 * controls.nodeSize).toFixed(1))
      const point = termPoint(term)
      name.setAttribute("x", point.x.toFixed(1))
      name.setAttribute("y", point.y.toFixed(1))
      name.setAttribute("text-anchor", point.anchor)
      name.setAttribute("transform", point.rotate)
    }
    fitNames()
  }

  const panel = container.querySelector(".vault-map-controls") as HTMLElement | null
  const showValues = () => {
    for (const out of panel?.querySelectorAll("output[data-control-value]") ?? []) {
      const key = out.getAttribute("data-control-value") as keyof typeof controls
      out.textContent = controls[key].toFixed(2)
    }
  }
  const onSlide = (e: Event) => {
    const input = e.target as HTMLInputElement
    const key = input.dataset.control as keyof typeof controls | undefined
    if (!key || !(key in controls)) return
    controls[key] = Number(input.value)
    showValues()
    applyLayout()
    if (key === "spacing") toHome()
  }
  panel?.addEventListener("input", onSlide)
  container.querySelector(".vault-map-controls-reset")?.addEventListener("click", () => {
    controls.spacing = 1
    controls.nodeSize = 1
    controls.labelSize = 1
    for (const input of panel?.querySelectorAll("input[data-control]") ?? []) {
      ;(input as HTMLInputElement).value = "1"
    }
    showValues()
    applyLayout()
    toHome()
  })
  showValues()

  const enlarged = () => svg.parentElement === stage

  svg.addEventListener(
    "wheel",
    (e) => {
      if (!enlarged()) return
      e.preventDefault()
      const box = svg.getBoundingClientRect()
      const px = view.x + ((e.clientX - box.left) / box.width) * view.w
      const py = view.y + ((e.clientY - box.top) / box.height) * view.h
      const factor = e.deltaY > 0 ? 1.12 : 1 / 1.12
      const w = Math.min(SIZE * 1.6, Math.max(SIZE * 0.12, view.w * factor))
      const scaled = w / view.w
      view.x = px - (px - view.x) * scaled
      view.y = py - (py - view.y) * scaled
      view.w = w
      view.h = view.h * scaled
      applyView()
    },
    { passive: false },
  )

  // In the small panel, resting the pointer on a cluster brings that circle close enough to
  // read its names, and the names appear because the view counts as zoomed. The hover area
  // is the whole disc plus a margin, measured in map units, so moving from the ring onto a
  // term does not let go; the frame glides back once the pointer has left the neighbourhood.
  let peeked: string | null = null
  const peekAt = (cluster: string | null) => {
    if (cluster === peeked) return
    if (peeked) {
      svg.classList.remove("focused")
      for (const path of clusterEdges.get(peeked) ?? []) path.classList.remove("lit")
    }
    peeked = cluster
    svg.classList.toggle("peek", !!cluster)
    for (const m of marks) m.name.classList.toggle("peeked", !!cluster && m.term.cluster === cluster)
    if (!cluster) {
      glideTo(home)
      return
    }
    svg.classList.add("focused")
    for (const path of clusterEdges.get(cluster) ?? []) path.classList.add("lit")
    const g = geometry.get(cluster)!
    // room around the circle, so that there is somewhere inside the frame to let go
    const half = g.r + 150
    glideTo({ x: g.x - half, y: g.y - half, w: 2 * half, h: 2 * half })
  }
  svg.addEventListener("pointermove", (e) => {
    if (enlarged() || dragging) return
    const box = svg.getBoundingClientRect()
    const mx = view.x + ((e.clientX - box.left) / box.width) * view.w
    const my = view.y + ((e.clientY - box.top) / box.height) * view.h
    // stay with the current cluster while the pointer is on the circle or its names; the
    // band along the edge of the frame is where it lets go
    if (peeked) {
      const g = geometry.get(peeked)!
      if (Math.hypot(mx - g.x, my - g.y) <= g.r + 100) return
    }
    let hit: string | null = null
    for (const cluster of clusters) {
      const g = geometry.get(cluster)!
      if (Math.hypot(mx - g.x, my - g.y) <= g.r + 40) {
        hit = cluster
        break
      }
    }
    peekAt(hit)
  })
  svg.addEventListener("pointerleave", () => {
    if (!enlarged()) peekAt(null)
  })

  let dragging: { x: number; y: number } | null = null
  svg.addEventListener("pointerdown", (e) => {
    if (!enlarged()) return
    // Only empty canvas drags the view; a point or a circle is something you click.
    if ((e.target as Element).classList.contains("vm-hit")) return
    if ((e.target as Element).closest(".vm-cluster")) return
    dragging = { x: e.clientX, y: e.clientY }
    svg.classList.add("dragging")
    svg.setPointerCapture(e.pointerId)
  })
  svg.addEventListener("pointermove", (e) => {
    if (!dragging) return
    const box = svg.getBoundingClientRect()
    view.x -= ((e.clientX - dragging.x) / box.width) * view.w
    view.y -= ((e.clientY - dragging.y) / box.height) * view.h
    dragging = { x: e.clientX, y: e.clientY }
    applyView()
  })
  const endDrag = () => {
    dragging = null
    svg.classList.remove("dragging")
  }
  svg.addEventListener("pointerup", endDrag)
  svg.addEventListener("pointercancel", endDrag)

  const open = () => {
    peekAt(null)
    cancelAnimationFrame(gliding)
    stage.appendChild(svg)
    overlay.classList.add("active")
    toHome()
    fitNames()
  }
  const close = () => {
    inner.appendChild(svg)
    overlay.classList.remove("active")
    toHome()
  }
  // A picture of the whole map, not of the current zoom: the export is the thing you put in
  // a slide. The stylesheet cannot travel with it, so the rules it needs are written into
  // the copy before it is handed to the canvas.
  const shoot = () => {
    const clone = svg.cloneNode(true) as SVGElement
    clone.setAttribute("xmlns", NS)
    clone.setAttribute("viewBox", `0 0 ${SIZE} ${SIZE}`)
    clone.setAttribute("width", String(SIZE))
    clone.setAttribute("height", String(SIZE))
    clone.classList.remove("focused", "zoomed")
    const rules = document.createElementNS(NS, "style")
    rules.textContent = `
      text { font-family: 'Barlow Condensed', 'Helvetica Neue', Helvetica, Arial, sans-serif }
      .vm-edge { fill: none; stroke-width: .9; opacity: .16 }
      .vm-edge.across { stroke-width: 1.1; opacity: .13 }
      .vm-ring { fill: none; stroke-width: 1.2; opacity: .5 }
      .vm-hit { fill: none }
      .vm-node { opacity: .9 }
      .vm-cluster-name { font-size: 11px; letter-spacing: .06em; text-anchor: middle; opacity: .85 }
      .vm-count { font-size: 10px; text-anchor: middle; opacity: .45 }
      .vm-term-label, .vm-term-name { display: none }
      .vm-centre-name { font-size: 26px; letter-spacing: .04em; fill: #2b2b2b; paint-order: stroke; stroke: #faf8f8; stroke-width: 10px; stroke-linejoin: round }
    `
    clone.insertBefore(rules, clone.firstChild)
    const source = new XMLSerializer().serializeToString(clone)
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = SIZE * 2
      canvas.height = SIZE * 2
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.fillStyle =
        getComputedStyle(document.documentElement).getPropertyValue("--light").trim() || "#faf8f8"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((file) => {
        if (!file) return
        const url = URL.createObjectURL(file)
        const link = document.createElement("a")
        link.href = url
        link.download = "cabinet-map.png"
        link.click()
        URL.revokeObjectURL(url)
      })
    }
    image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source)
  }

  container.querySelector(".vault-map-shot")?.addEventListener("click", shoot)
  container.querySelector(".vault-map-expand")?.addEventListener("click", open)
  container.querySelector(".vault-map-close")?.addEventListener("click", close)
  container.querySelector(".vault-map-reset")?.addEventListener("click", toHome)
  registerEscapeHandler(overlay, close)
  // The sidebar's "whole vault" button hands over to the map instead of the force graph.
  document.addEventListener("open-vault-map", open)
  window.addCleanup(() => document.removeEventListener("open-vault-map", open))
  // Clicking through to a term should not leave the overlay hanging over the page it opens.
  svg.addEventListener("click", (e) => {
    if (enlarged() && (e.target as Element).classList.contains("vm-hit")) close()
  })
}

document.addEventListener("nav", async () => {
  await renderVaultMap()
})
