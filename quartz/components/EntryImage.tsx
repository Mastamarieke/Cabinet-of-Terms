import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { pathToRoot, joinSegments } from "../util/path"
// @ts-ignore
import style from "./styles/entryImage.scss"

const EntryImage: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  const fm = fileData.frontmatter as Record<string, unknown>
  const imageName = fm?.entry_image as string | undefined
  if (!imageName) return null

  const caption = fm?.entry_image_caption as string | undefined
  const slug = fileData.slug!
  const pageDir = slug.split("/").slice(0, -1).join("/")
  const baseDir = pathToRoot(slug)
  const src = joinSegments(baseDir, pageDir, imageName)

  return (
    <figure class="entry-image">
      <img src={src} alt={caption ?? ""} />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}

EntryImage.css = style

EntryImage.afterDOMLoaded = `
document.addEventListener("nav", () => {
  const img = document.querySelector(".entry-image img")
  if (!img) return

  let overlay = null

  img.addEventListener("mouseenter", () => {
    overlay = document.createElement("div")
    overlay.className = "entry-image-overlay"
    const rect = img.getBoundingClientRect()
    overlay.style.cssText = \`
      position: fixed;
      top: \${rect.top}px;
      right: \${window.innerWidth - rect.right}px;
      width: 340px;
      z-index: 9999;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      border-radius: 8px;
      overflow: hidden;
      pointer-events: none;
    \`
    const bigImg = document.createElement("img")
    bigImg.src = img.src
    bigImg.style.cssText = "width: 100%; display: block;"
    overlay.appendChild(bigImg)
    document.body.appendChild(overlay)
    window.addCleanup(() => overlay?.remove())
  })

  img.addEventListener("mouseleave", () => {
    overlay?.remove()
    overlay = null
  })
})
`

export default (() => EntryImage) satisfies QuartzComponentConstructor
