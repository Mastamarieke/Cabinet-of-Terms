// Related terms (10-10): each reason "(…)" is folded away; a small button after a term name
// shows its reason in a panel under the line, a second tap or another term changes it, and
// "show all reasons" lists every term with its reason, one per line.
function setup(line: HTMLElement) {
  if (line.dataset.rtReady) return
  line.dataset.rtReady = "1"
  const pairs: { name: string; href: string; reason: string; button: HTMLButtonElement }[] = []
  for (const reason of line.querySelectorAll<HTMLElement>(".rt-reason")) {
    // the term name is the nearest link before the reason
    let prev = reason.previousSibling
    while (prev && !(prev instanceof HTMLAnchorElement)) prev = prev.previousSibling
    if (!prev) continue
    const a = prev as HTMLAnchorElement
    const button = document.createElement("button")
    button.type = "button"
    button.className = "rt-why note-mark tri"
    button.setAttribute("aria-expanded", "false")
    button.setAttribute("aria-label", `Why ${a.textContent}?`)
    button.title = "Why this term?"
    button.textContent = "▾"
    // name and button stay together when the line wraps
    const keep = document.createElement("span")
    keep.className = "rt-term"
    a.before(keep)
    keep.append(a, button)
    pairs.push({
      name: a.textContent ?? "",
      href: a.getAttribute("href") ?? "",
      reason: (reason.textContent ?? "").replace(/^\(|\)$/g, ""),
      button,
    })
  }
  if (!pairs.length) return

  const panel = document.createElement("div")
  panel.className = "rt-panel note-panel"
  panel.hidden = true
  const all = document.createElement("button")
  all.type = "button"
  all.className = "rt-all"
  all.textContent = "all reasons ▾"
  line.after(panel)
  line.append(" ", all)

  let open: number | "all" | null = null
  const render = () => {
    pairs.forEach((p, i) => {
      const on = open === i || open === "all"
      p.button.setAttribute("aria-expanded", String(on))
      p.button.textContent = on ? "▴" : "▾"
    })
    all.textContent = open === "all" ? "hide reasons ▴" : "all reasons ▾"
    panel.replaceChildren()
    const shown = open === "all" ? pairs : open === null ? [] : [pairs[open]]
    for (const p of shown) {
      const row = document.createElement("p")
      const name = document.createElement("a")
      name.href = p.href
      name.className = "internal"
      name.textContent = p.name
      row.append(name, document.createTextNode(`: ${p.reason}`))
      panel.append(row)
    }
    panel.hidden = shown.length === 0
  }
  pairs.forEach((p, i) =>
    p.button.addEventListener("click", () => {
      open = open === i ? null : i
      render()
    }),
  )
  all.addEventListener("click", () => {
    open = open === "all" ? null : "all"
    render()
  })
}

document.addEventListener("nav", () => {
  for (const line of document.querySelectorAll<HTMLElement>("p.rt-line")) setup(line)
})
