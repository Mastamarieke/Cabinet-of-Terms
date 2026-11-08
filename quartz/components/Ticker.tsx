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
type Line = { rubric: string; text: string; target?: string; part?: string; date?: string; day?: number; heading?: string }

// Since 08-11-2026 (Marieke: "news and notes"): a rubric may be more than one word (NEW TERM,
// START), every line carries the date of its heading, and the band mixes the newest news with
// a few older lines, so that a milestone such as the day the Cabinet went online also runs past.
// A line has to fit in the band as a whole, topic on the left and its end on the right, so the
// text stays short: the form in werk/ (nieuwsbalk-formulier.html) counts the characters.
const LINE = /^-\s+\*\*([A-Z][A-Z ]*[A-Z])\*\*\s+·\s+(.+)$/
const WIKI = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g
const HEAD = /^##\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\s*$/
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

function readAll(): Line[] {
  let raw = ""
  try {
    raw = fs.readFileSync(path.join("content", "changelog.md"), "utf8")
  } catch {
    return []
  }
  const lines: Line[] = []
  let date: string | undefined
  let day: number | undefined
  let heading: string | undefined
  for (const row of raw.split("\n")) {
    const h = HEAD.exec(row.trim())
    if (h) {
      const month = MONTHS.indexOf(h[2])
      date = month >= 0 ? `${Number(h[1])} ${MONTHS[month].slice(0, 3)}` : undefined
      day = month >= 0 ? Date.UTC(Number(h[3]), month, Number(h[1])) / 86400000 : undefined
      // the anchor Quartz gives the heading on the changelog page: "7 November 2026" -> 7-november-2026
      heading = `${Number(h[1])}-${h[2].toLowerCase()}-${h[3]}`
      continue
    }
    const m = LINE.exec(row.trim())
    if (!m) continue
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
    // a QUESTION or a WORD (08-11-2026) shows no date: a question or a meaning does not grow old
    lines.push({ rubric: m[1], text: text.replace(/\*/g, ""), target, part, date: m[1] === "QUESTION" || m[1] === "WORD" ? undefined : date, day, heading })
  }
  return lines
}

// A line fits the band as a whole at about 55 characters, topic, text and date together: the
// band is 630 px wide in a 1280 px window, and a character of the light board about 10 px
// (measured 08-11-2026). Old lines are only taken when they fit; a new line that is longer
// still runs, and the build says so.
export const MAX_LINE = 55
const lengthOf = (l: Line) => `${l.rubric} ${l.text}${l.date ? ` (${l.date})` : ""}`.length

// the newest news, at most two or three of the rubrics that outnumber the rest, plus a few
// lines older than a month; which old lines run past changes from day to day
function readLines(news: number, old: number): Line[] {
  const all = readAll()
  const quota: Record<string, number> = { GRAPH: 2, SITE: 2, CURVE: 3, QUESTION: 1, WORD: 1 }
  const picked: Line[] = []
  const evergreen = all.filter((l) => l.rubric === "WORD" || l.rubric === "QUESTION")
  for (const line of all) {
    if (evergreen.includes(line)) continue
    if (line.rubric in quota) {
      if (quota[line.rubric] === 0) continue
      quota[line.rubric]--
    }
    picked.push(line)
    if (picked.length >= news) break
  }
  const newest = all.find((l) => l.day !== undefined)?.day ?? 0
  for (const l of picked) if (lengthOf(l) > MAX_LINE) console.warn(`news band: line longer than ${MAX_LINE} characters: ${l.rubric} · ${l.text}`)
  const older = all.filter(
    (l) => !picked.includes(l) && l.day !== undefined && newest - l.day! > 30 && lengthOf(l) <= MAX_LINE,
  )
  const today = Math.floor(Date.now() / 86400000)
  for (let i = 0; i < old && older.length; i++) {
    const at = (today * 7 + i * 13) % older.length
    picked.push(older.splice(at, 1)[0])
  }
  // one word and one question a day, from all there are: meanings for readers who do not know
  // the terms yet (08-11-2026, Marieke: "meeste mensen snappen de termen nog niet")
  for (const kind of ["WORD", "QUESTION"]) {
    const pool = evergreen.filter((l) => l.rubric === kind && lengthOf(l) <= MAX_LINE)
    if (pool.length) picked.splice(Math.min(2, picked.length), 0, pool[today % pool.length])
  }
  return picked
}

export default ((opts?: { limit?: number }) => {
  const Ticker: QuartzComponent = ({ fileData, allFiles }: QuartzComponentProps) => {
    if (fileData.slug !== "index") return null
    const lines = readLines(opts?.limit ?? 6, 2)
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
    const allChanges = resolveRelative(fileData.slug!, "changelog" as FullSlug)
    // a line without a wikilink, or with one that finds no page, leads to its own date on the
    // changelog (08-11-2026, a reader's note: five lines led to the general cluster index)
    const hrefFor = (line: Line) => {
      const key = line.target?.toLowerCase()
      const slug = key ? slugOf.get(key) ?? slugOf.get(key.replace(/-/g, " ")) : undefined
      if (!slug) return allChanges + (line.heading ? `#${line.heading}` : "")
      return resolveRelative(fileData.slug!, slug as FullSlug) + (line.part ? `#news-${line.part}` : "")
    }

    return (
      <div class="ticker" aria-label="News and notes: what changed, newest first, and a few older notes">
        {/* the station above the news (29-10, Marieke): a pink strip across the whole band,
            letters the size of the news, and stars that glow up one after the other */}
        <div class="ticker-cap">
          {[0, 1, 2].map((i) => (
            <span class="ticker-star" style={`--i:${i}`} data-blocks="*" data-ink="white"></span>
          ))}
          <span class="ticker-cap-name" data-blocks="NEWS AND NOTES" data-ink="white"></span>
          {[2, 1, 0].map((i) => (
            <span class="ticker-star" style={`--i:${i}`} data-blocks="*" data-ink="white"></span>
          ))}
        </div>
        <div class="ticker-track">
          <div class="ticker-reel">
            {/* the second run only makes the loop seamless: hidden from screen readers and out of the
                tab order (08-11-2026, a reader's note: its links could still be reached with Tab) */}
            {[0, 1].map((copy) => (
              <span class="ticker-run" aria-hidden={copy === 1 ? "true" : undefined}>
                {lines.map((line) => (
                  <>
                    <a
                      class="ticker-item"
                      href={hrefFor(line)}
                      tabIndex={copy === 1 ? -1 : undefined}
                      data-rubric={line.rubric}
                      data-text={line.date ? `${line.text} (${line.date})` : line.text}
                      aria-label={`${line.rubric}: ${line.text}${line.date ? `, ${line.date}` : ""}`}
                    >
                      <span class="ticker-fallback">
                        <b>{line.rubric}</b> {line.text}
                        {line.date ? ` (${line.date})` : ""}
                      </span>
                    </a>
                    <span class="ticker-sep" aria-hidden="true" data-blocks="*" data-ink="red"></span>
                  </>
                ))}
                <a class="ticker-item ticker-all" href={allChanges} tabIndex={copy === 1 ? -1 : undefined} data-rubric="ALL" data-text="CHANGES →" aria-label="All changes">
                  <span class="ticker-fallback">
                    <b>ALL</b> CHANGES →
                  </span>
                </a>
                <span class="ticker-sep" aria-hidden="true" data-blocks="*" data-ink="red"></span>
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
