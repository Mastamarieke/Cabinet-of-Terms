import { computePosition, flip, inline, offset, shift } from "@floating-ui/dom"
import { normalizeRelativeURLs } from "../../util/path"
import { fetchCanonical } from "./util"

const p = new DOMParser()

// the path in a preview says where a page lives, not its name again: the name follows as the
// title (10-11-2026, Marieke: "dubbele titels?" when a long name wrapped onto its own line)
function pathOnly(nav: Element | null): Element | null {
  if (!nav) return null
  const els = nav.querySelectorAll(":scope > .breadcrumb-element")
  els[els.length - 1]?.remove()
  els[els.length - 2]?.querySelector(":scope > p")?.remove()
  return nav
}

let activeAnchor: HTMLAnchorElement | null = null

async function mouseEnterHandler(
  this: HTMLAnchorElement,
  { clientX, clientY }: { clientX: number; clientY: number },
) {
  const link = (activeAnchor = this)
  if (link.dataset.noPopover === "true") {
    return
  }

  async function setPosition(popoverElement: HTMLElement) {
    // in the menu the card opens to the right of the whole menu, level with the link, so the
    // menu itself stays visible (a short name would otherwise put the card over longer ones)
    const menu = link.closest(".explorer") as HTMLElement | null
    const inMenu = !!menu
    const reference = menu
      ? {
          getBoundingClientRect: () => {
            const l = link.getBoundingClientRect()
            const right = menu.getBoundingClientRect().right
            return { x: right, y: l.top, left: right, right, top: l.top, bottom: l.bottom, width: 0, height: l.height }
          },
        }
      : link
    const { x, y } = await computePosition(reference, popoverElement, {
      strategy: "fixed",
      placement: inMenu ? "right-start" : "bottom",
      middleware: inMenu
        ? [offset(12), flip(), shift({ padding: 8 })]
        : [inline({ x: clientX, y: clientY }), shift(), flip()],
    })
    Object.assign(popoverElement.style, {
      transform: `translate(${x.toFixed()}px, ${y.toFixed()}px)`,
    })
  }

  function showPopover(popoverElement: HTMLElement) {
    clearActivePopover()
    popoverElement.classList.add("active-popover")
    setPosition(popoverElement as HTMLElement)

    if (hash !== "") {
      const targetAnchor = `#popover-internal-${hash.slice(1)}`
      const heading = popoverInner.querySelector(targetAnchor) as HTMLElement | null
      if (heading) {
        // leave ~12px of buffer when scrolling to a heading
        popoverInner.scroll({ top: heading.offsetTop - 12, behavior: "instant" })
      }
    }
  }

  const targetUrl = new URL(link.href)
  const hash = decodeURIComponent(targetUrl.hash)
  targetUrl.hash = ""
  targetUrl.search = ""
  const popoverId = `popover-${link.pathname}`
  const prevPopoverElement = document.getElementById(popoverId)

  // dont refetch if there's already a popover
  if (!!document.getElementById(popoverId)) {
    showPopover(prevPopoverElement as HTMLElement)
    return
  }

  const response = await fetchCanonical(targetUrl).catch((err) => {
    console.error(err)
  })

  if (!response) return
  const [contentType] = response.headers.get("Content-Type")!.split(";")
  const [contentTypeCategory, typeInfo] = contentType.split("/")

  const popoverElement = document.createElement("div")
  popoverElement.id = popoverId
  popoverElement.classList.add("popover")
  const popoverInner = document.createElement("div")
  popoverInner.classList.add("popover-inner")
  popoverInner.dataset.contentType = contentType ?? undefined
  popoverElement.appendChild(popoverInner)

  switch (contentTypeCategory) {
    case "image":
      const img = document.createElement("img")
      img.src = targetUrl.toString()
      img.alt = targetUrl.pathname

      popoverInner.appendChild(img)
      break
    case "application":
      switch (typeInfo) {
        case "pdf":
          const pdf = document.createElement("iframe")
          pdf.src = targetUrl.toString()
          popoverInner.appendChild(pdf)
          break
        default:
          break
      }
      break
    default:
      const contents = await response.text()
      const html = p.parseFromString(contents, "text/html")
      normalizeRelativeURLs(html, targetUrl)
      // prepend all IDs inside popovers to prevent duplicates
      html.querySelectorAll("[id]").forEach((el) => {
        const targetID = `popover-internal-${el.id}`
        el.id = targetID
      })
      // an entry (11-10): only its path, title, first line and definition, as in the prototype
      // (werk/prototype-linkjes.html); the path stays clickable. Other pages keep the full preview.
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
          [...article.querySelectorAll(":scope > p")].find((el) =>
            el.querySelector(":scope > em > strong"),
          ) ?? null
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
          banner.addEventListener("error", () => (banner!.src = full), { once: true })
        }
        for (const el of [banner, crumbs, title, hook, quote]) if (el) card.appendChild(el)
        popoverInner.appendChild(card)
        popoverInner.classList.add("term-preview-inner")
        break
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
        popoverInner.appendChild(card)
        popoverInner.classList.add("term-preview-inner")
        break
      }
      // in the menu only terms and clusters get a preview; other pages would be a long block
      if (link.closest(".explorer")) return
      const elts = [...html.getElementsByClassName("popover-hint")]
      if (elts.length === 0) return

      elts.forEach((elt) => popoverInner.appendChild(elt))
  }

  if (!!document.getElementById(popoverId)) {
    return
  }

  document.body.appendChild(popoverElement)
  if (activeAnchor !== this) {
    return
  }

  showPopover(popoverElement)
}

function clearActivePopover() {
  activeAnchor = null
  const allPopoverElements = document.querySelectorAll(".popover")
  allPopoverElements.forEach((popoverElement) => popoverElement.classList.remove("active-popover"))
}

document.addEventListener("nav", () => {
  const links = [...document.querySelectorAll("a.internal")] as HTMLAnchorElement[]
  for (const link of links) {
    link.addEventListener("mouseenter", mouseEnterHandler)
    link.addEventListener("mouseleave", clearActivePopover)
    window.addCleanup(() => {
      link.removeEventListener("mouseenter", mouseEnterHandler)
      link.removeEventListener("mouseleave", clearActivePopover)
    })
  }

  // the menu on the left (10-11-2026): its links are built by the explorer script after this
  // runs, so they are reached through the explorer itself, one link at a time
  for (const explorer of document.querySelectorAll<HTMLElement>(".explorer")) {
    let current: HTMLAnchorElement | null = null
    const over = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.("a[href]") as HTMLAnchorElement | null
      if (!a || a === current || !explorer.contains(a)) return
      current = a
      mouseEnterHandler.call(a, e)
    }
    const out = (e: MouseEvent) => {
      if (!current) return
      const to = e.relatedTarget as Node | null
      if (to && current.contains(to)) return
      current = null
      clearActivePopover()
    }
    explorer.addEventListener("mouseover", over)
    explorer.addEventListener("mouseout", out)
    window.addCleanup(() => {
      explorer.removeEventListener("mouseover", over)
      explorer.removeEventListener("mouseout", out)
    })
  }
})
