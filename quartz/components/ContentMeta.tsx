import { Date, getDate } from "./Date"
import { QuartzComponentConstructor, QuartzComponentProps } from "./types"
import readingTime from "reading-time"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"
import { JSX } from "preact"
import style from "./styles/contentMeta.scss"
import { simplifySlug, resolveRelative, FullSlug } from "../util/path"
import fs from "fs"
import path from "path"

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

// Stage (2026-10-17, curator: "kunnen we niet bij elke term zeggen welke versie hij is?"): a
// reader who lands on an entry from a search never sees the front page, so the entry says
// itself how far it has been revised. Same rules as scripts/build_layers_table.py, which
// builds the table "Where each entry stands" on the front page, so the two cannot drift:
// a cluster in FULL_METHOD -> Third version; any layer (Sources folder, semantic landscape,
// attention curve, Narrative Typography image) -> Second version; otherwise First version
// (renamed 07-11-2026 from Full method / Earlier round / First form, the same names as the
// table on the front page). Keep FULL_METHOD equal in both files.
const FULL_METHOD = ["Privacy, Data and Control"]
function stageOf(fileData: QuartzComponentProps["fileData"]): string | null {
  const fp = fileData.filePath as string | undefined
  if (!fp || !fileData.slug) return null
  const parts = fp.split(/[\\/]/)
  const v = parts.indexOf("Cabinet of Digital Terms")
  if (v < 0 || parts.includes("Sources")) return null
  const rest = parts.slice(v + 1)
  const isFolder = rest[rest.length - 1] === "index.md"
  if (rest.length < 2 || (isFolder && rest.length < 3)) return null // the vault page or a cluster's About page
  if ((fileData.frontmatter?.tags as string[] | undefined)?.includes("source")) return null
  if (FULL_METHOD.includes(rest[0])) return "Third version"
  const fm = fileData.frontmatter ?? {}
  const dir = path.dirname(fp)
  const name = isFolder ? path.basename(dir) : path.basename(fp, ".md")
  const curve = isFolder ? path.join(dir, "attention.json") : path.join(dir, `attention-${name}.json`)
  const layered =
    "semantic_landscape" in fm ||
    "entry_image" in fm ||
    (isFolder && fs.existsSync(path.join(dir, "Sources"))) ||
    fs.existsSync(curve)
  return layered ? "Second version" : "First version"
}

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

      const stage = stageOf(fileData)
      if (stage) {
        const href = resolveRelative(fileData.slug!, "how-an-entry-grows" as FullSlug) + "#where-each-entry-stands"
        // first on the line (08-11-2026, Marieke): the version says how far the entry is, the date
        // and the reading time are secondary
        segments.unshift(
          <a class="stage" data-version={stage.startsWith("Third") ? "3" : stage.startsWith("Second") ? "2" : "1"} href={href} title="How far this entry has been revised: see A living lab">
            {stage}
          </a>,
        )
      }

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
