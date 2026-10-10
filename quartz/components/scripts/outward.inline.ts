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

document.addEventListener("nav", () => {
  for (const block of document.querySelectorAll<HTMLElement>("details.outward")) setup(block)
})
