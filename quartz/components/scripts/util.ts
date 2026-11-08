export function registerEscapeHandler(outsideContainer: HTMLElement | null, cb: () => void) {
  if (!outsideContainer) return
  function click(this: HTMLElement, e: HTMLElementEventMap["click"]) {
    if (e.target !== this) return
    e.preventDefault()
    e.stopPropagation()
    cb()
  }

  function esc(e: HTMLElementEventMap["keydown"]) {
    if (!e.key.startsWith("Esc")) return
    e.preventDefault()
    cb()
  }

  outsideContainer?.addEventListener("click", click)
  window.addCleanup(() => outsideContainer?.removeEventListener("click", click))
  document.addEventListener("keydown", esc)
  window.addCleanup(() => document.removeEventListener("keydown", esc))
}

export function removeAllChildren(node: HTMLElement) {
  while (node.firstChild) {
    node.removeChild(node.firstChild)
  }
}

// AliasRedirect emits HTML redirects which also have the link[rel="canonical"]
// containing the URL it's redirecting to.
// Extracting it here with regex is _probably_ faster than parsing the entire HTML
// with a DOMParser effectively twice (here and later in the SPA code), even if
// way less robust - we only care about our own generated redirects after all.
const canonicalRegex = /<link rel="canonical" href="([^"]*)">/

export async function fetchCanonical(url: URL): Promise<Response> {
  const res = await fetch(`${url}`)
  if (!res.headers.get("content-type")?.startsWith("text/html")) {
    return res
  }

  // reading the body can only be done once, so we need to clone the response
  // to allow the caller to read it if it's was not a redirect
  const text = await res.clone().text()
  const [_, redirect] = text.match(canonicalRegex) ?? []
  return redirect ? fetch(`${new URL(redirect, url)}`) : res
}

// The front page in reading order (08-11-2026, Marieke chose variant B): what the Cabinet is,
// then the news, then the cluster cards, then the map. Ticker and map are rendered above the
// article like on every page; the front page has empty slots, <div class="home-slot"
// data-slot="ticker|map">, and they move there before they measure themselves. Called from the
// nav handlers of both scripts, whichever runs first; the second call finds no slots left.
export function placeHomeSlots() {
  const parts: Record<string, string> = { ticker: ".ticker", map: "#vault-map" }
  for (const slot of document.querySelectorAll<HTMLElement>(".home-slot[data-slot]")) {
    const el = document.querySelector<HTMLElement>(parts[slot.dataset.slot ?? ""] ?? ":not(*)")
    if (el) slot.replaceWith(el)
  }
}
