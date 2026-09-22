import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative, simplifySlug, FullSlug } from "../util/path"
// @ts-ignore
import script from "./scripts/graphStory.inline"
// @ts-ignore
import style from "./styles/graphStory.scss"

// The landscape is written with the terms in bold. At build time each bold name is looked up
// among the vault's terms and clusters: a match becomes a link, the same as in the entry, so
// that the tour can be walked; what does not match stays bold, and says by that that it is
// not (yet) a place in the Cabinet (Lifestyle Brand, a whole sentence, a coined phrase).
type Lookup = Map<string, string>

function buildLookup(allFiles: QuartzComponentProps["allFiles"]): Lookup {
  const map: Lookup = new Map()
  for (const f of allFiles) {
    const slug = f.slug ?? ""
    if (!slug.startsWith("Cabinet-of-Digital-Terms/") || slug.includes("/Sources/")) continue
    const parts = slug.split("/")
    const isIndex = parts[parts.length - 1] === "index"
    const stem = isIndex ? parts[parts.length - 2] : parts[parts.length - 1]
    if (!stem || (isIndex && parts.length === 3)) {
      // a cluster's About page: the cluster name links there
      if (stem) map.set(stem.replace(/-/g, " ").replace(/\s+/g, " ").replace(/ and /g, " & ").toLowerCase(), slug)
      continue
    }
    const name = (typeof f.frontmatter?.term === "string" ? (f.frontmatter.term as string) : stem.replace(/-/g, " ")).toLowerCase()
    map.set(name, slug)
    // "SMV (Sexual Market Value)" answers to "SMV" as well
    const short = name.replace(/\s*\(.*\)$/, "")
    if (short !== name && !map.has(short)) map.set(short, slug)
  }
  return map
}

// *italic* in the running text (the shirts' slogans) becomes em; the source keeps its marks
function parseItalic(text: string) {
  const parts = text.split(/\*([^*]+)\*/g)
  return parts.map((part, i) => (i % 2 === 1 ? <em>{part}</em> : part))
}

function parseBold(text: string, lookup: Lookup, from: FullSlug) {
  const parts = text.split(/\*\*([^*]+)\*\*/g)
  return parts.map((part, i) => {
    if (i % 2 === 0) return parseItalic(part)
    const key = part.trim().toLowerCase()
    const slug = lookup.get(key) ?? lookup.get(key.replace(/ and /g, " & "))
    // the entry's own name stays bold: a link to the page you are on leads nowhere
    if (slug && slug !== from) {
      return (
        <a href={resolveRelative(from, slug as FullSlug)} class="internal" data-slug={simplifySlug(slug as FullSlug)}>
          {part}
        </a>
      )
    }
    return <strong>{part}</strong>
  })
}

const GraphStory: QuartzComponent = ({ fileData, allFiles }: QuartzComponentProps) => {
  const fm = fileData.frontmatter as Record<string, unknown>
  if (!fm?.term || !fm?.semantic_landscape) return null
  const lookup = buildLookup(allFiles)

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
        <button type="button" class="gs-speak" aria-label="Read this landscape aloud" title="Read aloud">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" />
            <path d="M15.5 9a4 4 0 0 1 0 6" />
            <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
          </svg>
        </button>
        <button type="button" class="gs-save" aria-label="Save this landscape as a text file" title="Save as text">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 4v11" />
            <path d="M7.5 10.5 12 15l4.5-4.5" />
            <path d="M5 19h14" />
          </svg>
        </button>
        {landscape.split("\n\n").map((para, i) => (
          <p key={i}>{parseBold(para.trim(), lookup, fileData.slug!)}</p>
        ))}
        <script type="text/plain" class="gs-source" dangerouslySetInnerHTML={{ __html: landscape.replace(/</g, "\\u003c") }}></script>
      </div>
    </details>
  )
}

GraphStory.css = style
GraphStory.afterDOMLoaded = script

export default (() => GraphStory) satisfies QuartzComponentConstructor
