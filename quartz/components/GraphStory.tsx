import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import script from "./scripts/graphStory.inline"
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
  const cluster = typeof fm.cluster === "string" ? (fm.cluster as string) : ""
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
      <div class="gs-landscape" data-term={term} data-cluster={cluster}>
        <button type="button" class="gs-save" aria-label="Save this landscape as a text file" title="Save as text">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 4v11" />
            <path d="M7.5 10.5 12 15l4.5-4.5" />
            <path d="M5 19h14" />
          </svg>
        </button>
        {landscape.split("\n\n").map((para, i) => (
          <p key={i}>{parseBold(para.trim())}</p>
        ))}
        <script type="text/plain" class="gs-source" dangerouslySetInnerHTML={{ __html: landscape.replace(/</g, "\\u003c") }}></script>
      </div>
    </details>
  )
}

GraphStory.css = style
GraphStory.afterDOMLoaded = script

export default (() => GraphStory) satisfies QuartzComponentConstructor
