import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import style from "./styles/graphStory.scss"

const GraphStory: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  const fm = fileData.frontmatter as Record<string, unknown>
  if (!fm?.term || !fm?.semantic_landscape) return null

  const landscape = fm.semantic_landscape as string

  return (
    <details class="graph-story">
      <summary class="graph-story-header">Semantic Landscape</summary>
      <div class="gs-landscape">
        {landscape.split("\n\n").map((para, i) => (
          <p key={i}>{para.trim()}</p>
        ))}
      </div>
    </details>
  )
}

GraphStory.css = style

export default (() => GraphStory) satisfies QuartzComponentConstructor
