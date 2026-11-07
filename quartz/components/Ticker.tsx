import fs from "fs"
import path from "path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative, FullSlug } from "../util/path"
// @ts-ignore
import script from "./scripts/ticker.inline"
import style from "./styles/ticker.scss"

// One line per change, newest first, read from content/changelog.md at build time. The
// changelog page itself may be a draft; the band does not depend on it being published.
// A line reads `- **RUBRIC** · text`, and the first wikilink in it is where the line leads.
// `[[Term#curve]]` leads to that part of the entry (08-10, Marieke: "naar het betreffende
// onderdeel"): the link carries #news-curve, and only a #news- fragment opens a panel, so a
// link shared from the page itself still starts at the top of the text (the 16-09 revert).
type Line = { rubric: string; text: string; target?: string; part?: string }

const LINE = /^-\s+\*\*([A-Z]+)\*\*\s+·\s+(.+)$/
const WIKI = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g

function readLines(limit: number): Line[] {
  let raw = ""
  try {
    raw = fs.readFileSync(path.join("content", "changelog.md"), "utf8")
  } catch {
    return []
  }
  // Lines about the drawings and the site outnumber the rest; the band keeps at most two
  // of each, so that what the Cabinet now says differently is what runs past.
  const quota: Record<string, number> = { GRAPH: 2, SITE: 2, CURVE: 3 }
  const lines: Line[] = []
  for (const row of raw.split("\n")) {
    const m = LINE.exec(row.trim())
    if (!m) continue
    const rubric = m[1]
    if (rubric in quota) {
      if (quota[rubric] === 0) continue
      quota[rubric]--
    }
    let target: string | undefined
    let part: string | undefined
    const text = m[2].replace(WIKI, (_, link: string, shown?: string) => {
      const [name, anchor] = link.split("#")
      if (target === undefined) {
        target = name
        part = anchor
      }
      return shown ?? name
    })
    lines.push({ rubric, text: text.replace(/\*/g, ""), target, part })
    if (lines.length >= limit) break
  }
  return lines
}

export default ((opts?: { limit?: number }) => {
  const Ticker: QuartzComponent = ({ fileData, allFiles }: QuartzComponentProps) => {
    if (fileData.slug !== "index") return null
    const lines = readLines(opts?.limit ?? 8)
    if (lines.length === 0) return null

    // a term's name is its file stem, or its folder for Term/index.md; the map for the rest
    // and by its title, which is how a cluster is named ("Gender & Identity")
    const slugOf = new Map<string, string>()
    for (const f of allFiles) {
      const slug = f.slug ?? ""
      const parts = slug.split("/")
      const name = parts[parts.length - 1] === "index" ? parts[parts.length - 2] : parts[parts.length - 1]
      if (name) slugOf.set(name.replace(/-/g, " ").toLowerCase(), slug)
      const title = f.frontmatter?.title
      if (typeof title === "string") slugOf.set(title.toLowerCase(), slug)
    }
    const hrefFor = (line: Line) => {
      const key = line.target?.toLowerCase()
      const slug = key ? slugOf.get(key) ?? slugOf.get(key.replace(/-/g, " ")) : undefined
      const to = (slug ?? "Cabinet-of-Digital-Terms/index") as FullSlug
      return resolveRelative(fileData.slug!, to) + (slug && line.part ? `#news-${line.part}` : "")
    }
    const allChanges = resolveRelative(fileData.slug!, "changelog" as FullSlug)

    return (
      <div class="ticker" aria-label="What changed, newest first">
        {/* the station above the news (29-10, Marieke): a pink strip across the whole band,
            letters the size of the news, and stars that glow up one after the other */}
        <div class="ticker-cap">
          {[0, 1, 2].map((i) => (
            <span class="ticker-star" style={`--i:${i}`} data-blocks="*" data-ink="white"></span>
          ))}
          <span class="ticker-cap-name" data-blocks="DIGITAL ALERTNESS NEWS" data-ink="white"></span>
          {[2, 1, 0].map((i) => (
            <span class="ticker-star" style={`--i:${i}`} data-blocks="*" data-ink="white"></span>
          ))}
        </div>
        <div class="ticker-track">
          <div class="ticker-reel">
            {[0, 1].map((copy) => (
              <span class="ticker-run" aria-hidden={copy === 1 ? "true" : undefined}>
                {lines.map((line) => (
                  <>
                    <a
                      class="ticker-item"
                      href={hrefFor(line)}
                      data-rubric={line.rubric}
                      data-text={line.text}
                      aria-label={`${line.rubric}: ${line.text}`}
                    >
                      <span class="ticker-fallback">
                        <b>{line.rubric}</b> {line.text}
                      </span>
                    </a>
                    <span class="ticker-sep" aria-hidden="true">
                      ·
                    </span>
                  </>
                ))}
                <a class="ticker-item ticker-all" href={allChanges} data-rubric="ALL" data-text="CHANGES →" aria-label="All changes">
                  <span class="ticker-fallback">
                    <b>ALL</b> CHANGES →
                  </span>
                </a>
                <span class="ticker-sep" aria-hidden="true">
                  ·
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    )
  }
  Ticker.css = style
  Ticker.afterDOMLoaded = script
  return Ticker
}) satisfies QuartzComponentConstructor
