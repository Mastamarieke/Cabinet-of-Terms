import { clusterIcon, clusterOf } from "../../util/clusters"

// The short card for an entry or a cluster, shared by the preview at a link (popover.inline.ts)
// and the preview in search (search.inline.ts). Moved here on 16-11-2026, when search showed the
// whole page instead (Marieke: the empty graph, the yellow marks and the sources in brackets,
// because the scripts that tidy a page do not run in a preview).

// the path in a preview says where a page lives, not its name again: the name follows as the
// title (10-11-2026, Marieke: "dubbele titels?" when a long name wrapped onto its own line)
function pathOnly(nav: Element | null): Element | null {
  if (!nav) return null
  const els = nav.querySelectorAll(":scope > .breadcrumb-element")
  els[els.length - 1]?.remove()
  els[els.length - 2]?.querySelector(":scope > p")?.remove()
  return nav
}

// the cluster's colour as a band across the top of the preview, and its icon from the D.Alert
// game (15-11-2026, Marieke: "de kleur van het cluster in de hoover"); the title stays HAN red
function markCluster(inner: HTMLElement, iconBefore: Element | null, url: URL) {
  const cluster = clusterOf(url.pathname)
  if (!cluster) return
  inner.style.setProperty("--cluster-color", cluster.color)
  inner.classList.add("has-cluster")
  const root = url.href.split("/Cabinet-of-Digital-Terms/")[0]
  iconBefore?.prepend(clusterIcon(`${root}/${cluster.icon}`))
}

/** Fills `inner` with the card of an entry or a cluster page and returns true; returns false
 *  for any other page, which keeps its full preview. */
export function previewCard(html: Document, url: URL, inner: HTMLElement): boolean {
  // an entry (11-10): only its path, title, first line and definition, as in the prototype
  // (werk/prototype-linkjes.html); the path stays clickable
  const article = html.querySelector("article")
  const quote = article?.querySelector(":scope > blockquote")
  if (article && quote) {
    const card = document.createElement("div")
    card.className = "term-preview"
    const crumbs = pathOnly(html.querySelector("nav.breadcrumb-container"))
    const title = html.querySelector("h1.article-title")
    // the opening question is the first paragraph in bold italics (an entry with a drawing
    // has the drawing and its credit in the paragraphs before it)
    const hook =
      [...article.querySelectorAll(":scope > p")].find((el) => el.querySelector(":scope > em > strong")) ?? null
    // the Narrative Typography drawing across the top (10-11-2026, Marieke chose B in
    // werk/prototype-tekening-in-voorproefje.html): a small cut-out from static/drawings-small,
    // named after the drawing; if there is none yet, the drawing itself
    let banner: HTMLImageElement | null = null
    const drawing = article.querySelector<HTMLImageElement>(":scope > p > img, :scope > img")
    if (drawing && drawing.compareDocumentPosition(quote) & Node.DOCUMENT_POSITION_FOLLOWING) {
      const full = drawing.src
      const name = full.split("/").pop()!.replace(/\.[a-z]+$/i, "")
      const root = full.split("/Cabinet-of-Digital-Terms/")[0]
      banner = document.createElement("img")
      banner.className = "preview-drawing"
      banner.alt = ""
      banner.src = `${root}/static/drawings-small/${name}.png`
      banner.setAttribute("onerror", `this.onerror=null;this.src=${JSON.stringify(full)}`)
    }
    for (const el of [banner, crumbs, title, hook, quote]) if (el) card.appendChild(el)
    inner.appendChild(card)
    inner.classList.add("term-preview-inner")
    markCluster(inner, crumbs, url)
    return true
  }
  // a cluster's About page (10-11-2026, Marieke: in the menu "de prangende vragen en wat het
  // cluster is"). Same build as a term card (Marieke, 10-11: "vormgeving consistenter, de
  // vraag als eerste bovenaan"): path, title, the question where a term has its opening
  // question, and what the cluster is in the box where a term has its definition
  const question = article
    ? [...article.querySelectorAll(":scope > p")].find((el) =>
        (el.textContent ?? "").trim().startsWith("The question this cluster asks"),
      )
    : undefined
  if (article && question) {
    const card = document.createElement("div")
    card.className = "term-preview cluster-preview"
    const crumbs = pathOnly(html.querySelector("nav.breadcrumb-container"))
    const title = html.querySelector("h1.article-title")
    const paras = [...article.querySelectorAll(":scope > p")]
    const opening = paras.find((el) => el.querySelector(":scope > em > strong")) ?? null
    const what = paras.find((el) => el !== opening && el !== question) ?? null
    const q = (question.textContent ?? "").replace(/^\s*The question this cluster asks:\s*/, "").trim()
    const ask = document.createElement("p")
    ask.innerHTML = `<em><strong></strong></em>`
    ask.querySelector("strong")!.textContent = q.charAt(0).toUpperCase() + q.slice(1)
    let box: HTMLElement | null = null
    if (what) {
      box = document.createElement("blockquote")
      box.appendChild(what)
    }
    for (const el of [crumbs, title, ask, box]) if (el) card.appendChild(el)
    inner.appendChild(card)
    inner.classList.add("term-preview-inner")
    markCluster(inner, title, url)
    return true
  }
  return false
}
