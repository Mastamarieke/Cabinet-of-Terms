// Outward (2026-10-10): pointing at a cluster or a term lights up its lines and shows its
// numbers; a click keeps that state until clicked again; the ↗ beside a cluster name still
// opens the cluster page. The figure itself is drawn at build time (Outward.tsx).
function setup(block: HTMLElement) {
  const svg = block.querySelector(".outward-svg") as SVGSVGElement | null
  const tip = block.querySelector(".outward-tip") as HTMLElement | null
  if (!svg || !tip) return
  const lines = [...svg.querySelectorAll<SVGPathElement>(".outward-line")]
  const nodes = [...svg.querySelectorAll<SVGGElement>(".outward-node")]
  const rest = tip.textContent ?? ""
  let pinned: string | null = null

  const matches = (line: SVGPathElement, key: string) =>
    key.startsWith("t:") ? line.dataset.t === key.slice(2) : line.dataset.c === key

  function show(key: string | null) {
    svg!.classList.toggle("focused", key !== null)
    for (const l of lines) l.classList.toggle("on", key !== null && matches(l, key))
    for (const n of nodes) n.classList.toggle("on", n.dataset.key === key)
    const node = nodes.find((n) => n.dataset.key === key)
    tip!.textContent = node?.dataset.tip ?? rest
  }

  for (const n of nodes) {
    const key = n.dataset.key!
    const enter = () => show(key)
    const leave = () => show(pinned)
    const click = (e: Event) => {
      if ((e.target as Element).closest("a")) return
      pinned = pinned === key ? null : key
      show(pinned)
    }
    n.addEventListener("mouseenter", enter)
    n.addEventListener("mouseleave", leave)
    n.addEventListener("click", click)
    window.addCleanup(() => {
      n.removeEventListener("mouseenter", enter)
      n.removeEventListener("mouseleave", leave)
      n.removeEventListener("click", click)
    })
  }
}

// The camera (12-10): the drawing as one PNG with its title and key. The copy is never in the
// document, so the styles the sheet gives each element are copied onto it from the original.
const OUTWARD_KEEP = ["fill", "stroke", "stroke-width", "stroke-dasharray", "opacity", "font-size", "font-family", "font-weight", "letter-spacing", "text-transform", "paint-order", "stroke-linejoin"]
function outwardInline(src: Element, dst: Element) {
  const cs = getComputedStyle(src)
  const style = OUTWARD_KEEP.map((k) => `${k}:${cs.getPropertyValue(k)}`).join(";")
  dst.setAttribute("style", style)
  for (let i = 0; i < src.children.length; i++) outwardInline(src.children[i], dst.children[i])
}

function outwardShoot(body: HTMLElement) {
  const svg = body.querySelector("svg.outward-svg") as SVGSVGElement | null
  if (!svg) return
  const name = body.dataset.cluster ?? "cluster"
  const clone = svg.cloneNode(true) as SVGSVGElement
  outwardInline(svg, clone)
  const vb = svg.viewBox.baseVal
  const scale = 2
  const W = vb.width, H = vb.height
  clone.setAttribute("width", String(W))
  clone.setAttribute("height", String(H))
  const root = getComputedStyle(document.documentElement)
  const light = root.getPropertyValue("--light").trim() || "#faf8f8"
  const dark = root.getPropertyValue("--dark").trim() || "#2b2b2b"
  const gray = root.getPropertyValue("--gray").trim() || "#8f8f8f"
  const pad = 20, titleH = 26, keyH = 34
  const canvas = document.createElement("canvas")
  canvas.width = (W + pad * 2) * scale
  canvas.height = (H + pad * 2 + titleH + keyH) * scale
  const ctx = canvas.getContext("2d")!
  ctx.scale(scale, scale)
  ctx.fillStyle = light
  ctx.fillRect(0, 0, W + pad * 2, H + pad * 2 + titleH + keyH)
  const font = getComputedStyle(document.body).fontFamily || "Helvetica, Arial, sans-serif"
  ctx.font = `700 12px ${font}`
  ctx.fillStyle = dark
  const t1 = "RELATIONS"
  ctx.fillText(t1, pad, pad + 12)
  ctx.font = `12px ${font}`
  ctx.fillText(` — how the terms in ${name} link to other clusters`, pad + ctx.measureText(t1).width + 4, pad + 12)
  const image = new Image()
  image.onload = () => {
    ctx.drawImage(image, pad, pad + titleH, W, H)
    ctx.font = `10px ${font}`
    ctx.fillStyle = gray
    const ky = pad + titleH + H + 16
    ctx.fillText("solid line: a term discusses a term in the other cluster in its text · dashed line: it lists that term under Related terms, with a reason", pad, ky)
    ctx.fillText(`Cabinet of Digital Terms · ${location.href.split("#")[0]} · ${new Date().toISOString().slice(0, 10)}`, pad, ky + 14)
    const a = document.createElement("a")
    a.download = `relations-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`
    a.href = canvas.toDataURL("image/png")
    a.click()
  }
  image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(clone))
}

// The loupe (12-10): the block again, as wide as the window, as a live copy: pointing, pinning
// and the camera work in it. Closes on ×, a click beside the card, or Escape.
function outwardLoupe(details: HTMLElement) {
  const body = details.querySelector<HTMLElement>(":scope > .outward-body")
  const overlay = details.querySelector<HTMLElement>(":scope > .outward-overlay")
  const card = overlay?.querySelector<HTMLElement>(".outward-overlay-card")
  const btn = body?.querySelector<HTMLButtonElement>(".outward-loupe")
  if (!body || !overlay || !card || !btn) return
  let copy: HTMLElement | null = null
  const close = () => {
    overlay.classList.remove("active")
    overlay.setAttribute("aria-hidden", "true")
    copy?.remove()
    copy = null
    document.body.style.overflow = ""
  }
  const open = () => {
    if (copy) return
    copy = body.cloneNode(true) as HTMLElement
    copy.querySelector(".outward-loupe")?.remove()
    card.appendChild(copy)
    overlay.classList.add("active")
    overlay.setAttribute("aria-hidden", "false")
    document.body.style.overflow = "hidden"
    setup(copy)
    copy.querySelector<HTMLButtonElement>(".outward-shot")?.addEventListener("click", () => outwardShoot(copy as HTMLElement))
  }
  const onClose = () => close()
  const onBackdrop = (e: MouseEvent) => {
    if (e.target === overlay) close()
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && overlay.classList.contains("active")) close()
  }
  btn.addEventListener("click", open)
  overlay.querySelector(".outward-overlay-close")?.addEventListener("click", onClose)
  overlay.addEventListener("click", onBackdrop)
  document.addEventListener("keydown", onKey)
  window.addCleanup(() => {
    btn.removeEventListener("click", open)
    overlay.querySelector(".outward-overlay-close")?.removeEventListener("click", onClose)
    overlay.removeEventListener("click", onBackdrop)
    document.removeEventListener("keydown", onKey)
    close()
  })
}

document.addEventListener("nav", () => {
  for (const block of document.querySelectorAll<HTMLElement>("details.outward")) {
    const body = block.querySelector<HTMLElement>(":scope > .outward-body")
    if (body) setup(body)
    outwardLoupe(block)
    const shot = body?.querySelector<HTMLButtonElement>(":scope > .outward-shot")
    if (shot && body) {
      const handler = () => outwardShoot(body)
      shot.addEventListener("click", handler)
      window.addCleanup(() => shot.removeEventListener("click", handler))
    }
  }
})
