import { Date, getDate } from "./Date"
import { QuartzComponentConstructor, QuartzComponentProps } from "./types"
import readingTime from "reading-time"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"
import { JSX } from "preact"
import style from "./styles/contentMeta.scss"
import { simplifySlug } from "../util/path"

// Crossroads (2026-10-10): an entry with many neighbours says so beside its reading time, so
// a long text explains itself. Counted at build time from the same links as the graph (the
// running text and Related terms, both directions, no source files), so it never goes stale.
const CROSSROADS = 30
const clusterOf = (id: string) => id.split("/").filter(Boolean)[1] ?? null
const isTermSlug = (id: string) =>
  id.startsWith("Cabinet-of-Digital-Terms/") &&
  id.split("/").filter(Boolean).length >= 3 &&
  !id.includes("/Sources/") &&
  !id.endsWith("/Sources")

interface ContentMetaOptions {
  /**
   * Whether to display reading time
   */
  showReadingTime: boolean
  showComma: boolean
}

const defaultOptions: ContentMetaOptions = {
  showReadingTime: true,
  showComma: true,
}

export default ((opts?: Partial<ContentMetaOptions>) => {
  // Merge options with defaults
  const options: ContentMetaOptions = { ...defaultOptions, ...opts }

  function crossroads(fileData: QuartzComponentProps["fileData"], allFiles: QuartzComponentProps["allFiles"]) {
    if (!fileData.slug) return null
    const self = simplifySlug(fileData.slug)
    if (!isTermSlug(self)) return null
    const terms = new Map<string, Set<string>>()
    for (const f of allFiles) {
      if (!f.slug) continue
      const id = simplifySlug(f.slug)
      if (!isTermSlug(id) || (f.frontmatter?.tags as string[] | undefined)?.includes("source")) continue
      terms.set(id, new Set<string>(f.links ?? []))
    }
    if (!terms.has(self)) return null
    const near = new Set<string>()
    for (const l of terms.get(self)!) if (l !== self && terms.has(l)) near.add(l)
    for (const [id, links] of terms) if (id !== self && links.has(self as never)) near.add(id)
    if (near.size < CROSSROADS) return null
    const clusters = new Set([...near].map(clusterOf).filter(Boolean))
    return (
      <span class="crossroads" title="Entries this term links to or that link to it, in the running text or in Related terms">
        crossroads: {near.size} entries in {clusters.size} clusters
      </span>
    )
  }

  function ContentMetadata({ cfg, fileData, allFiles, displayClass }: QuartzComponentProps) {
    const text = fileData.text

    if (text) {
      const segments: (string | JSX.Element)[] = []

      if (fileData.dates) {
        segments.push(<Date date={getDate(cfg, fileData)!} locale={cfg.locale} />)
      }

      // Display reading time if enabled
      if (options.showReadingTime) {
        const { minutes, words: _words } = readingTime(text)
        const displayedTime = i18n(cfg.locale).components.contentMeta.readingTime({
          minutes: Math.ceil(minutes),
        })
        segments.push(<span>{displayedTime}</span>)
      }

      const cross = crossroads(fileData, allFiles)
      if (cross) segments.push(cross)

      return (
        <p show-comma={options.showComma} class={classNames(displayClass, "content-meta")}>
          {segments}
        </p>
      )
    } else {
      return null
    }
  }

  ContentMetadata.css = style

  return ContentMetadata
}) satisfies QuartzComponentConstructor
