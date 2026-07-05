import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { pathToRoot, joinSegments } from "../util/path"
// @ts-ignore
import style from "./styles/entryImage.scss"

const EntryImage: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  const fm = fileData.frontmatter as Record<string, unknown>
  const imageName = fm?.entry_image as string | undefined
  if (!imageName) return null

  const slug = fileData.slug!
  const pageDir = slug.split("/").slice(0, -1).join("/")
  const baseDir = pathToRoot(slug)
  const src = joinSegments(baseDir, pageDir, imageName)

  return (
    <div class="entry-image">
      <img src={src} alt="" />
    </div>
  )
}

EntryImage.css = style

export default (() => EntryImage) satisfies QuartzComponentConstructor
