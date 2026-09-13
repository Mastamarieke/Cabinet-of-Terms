import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import style from "./styles/graphStory.scss"

function parseBold(text: string) {
  const parts = text.split(/\*\*([^*]+)\*\*/g)
  return parts.map((part, i) => (i % 2 === 1 ? <strong>{part}</strong> : part))
}

const GraphStory: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  const fm = fileData.frontmatter as Record<string, unknown>
  if (!fm?.term || !fm?.semantic_landscape) return null

  const landscape = fm.semantic_landscape as string
  const term = fm.term as string
  const possessive = term.endsWith("s") ? `${term}'` : `${term}'s`

  return (
    <details class="graph-story">
      <summary class="graph-story-header">
        <span class="graph-title-name">Semantic landscape</span>
        <span class="graph-title-rest">
          {" "}
          — the tour through <strong>{possessive}</strong> landscape
        </span>
      </summary>
      <div class="gs-landscape">
        {landscape.split("\n\n").map((para, i) => (
          <p key={i}>{parseBold(para.trim())}</p>
        ))}
      </div>
    </details>
  )
}

GraphStory.css = style

export default (() => GraphStory) satisfies QuartzComponentConstructor
