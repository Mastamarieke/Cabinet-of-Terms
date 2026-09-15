import fs from "fs"
import path from "path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative, FullSlug } from "../util/path"
// @ts-ignore
import script from "./scripts/attentionChart.inline"
import style from "./styles/attentionChart.scss"

// A third block under an entry's graph: when the word drew attention. Drawn at build time
// from a dated data file beside the entry (attention.json for Term/index.md, or
// attention-<file>.json beside a flat Term.md), written by scripts/attention.py. No file,
// no block. Each series is indexed to its own peak, so the lines share one scale without
// pretending that page views and papers are the same kind of number.
type Series = { label: string; source: string; values: Record<string, number>; period?: "month" | "year" }
type Attention = {
  term: string
  retrieved: string
  years: number[]
  months?: string[]
  enough?: boolean
  checked?: string[]
  note?: string
  series: Series[]
}

function dataFileFor(filePath: string | undefined): string | null {
  if (!filePath) return null
  const dir = path.dirname(filePath)
  const base = path.basename(filePath, ".md")
  const candidate = base === "index" ? path.join(dir, "attention.json") : path.join(dir, `attention-${base}.json`)
  return fs.existsSync(candidate) ? candidate : null
}

// One field, one axis of months: the public sources (Wikipedia, Trends) as translucent
// monthly shapes, each indexed to its own peak (= 100) so that they share a canvas and mix
// where they overlap; research, a yearly figure, as light blocks behind them, one per
// year. The peak of each carries its real figure, and for a monthly line the month.
const W = 640
const L = 34
const R = 22
const TOP = 10
const PLOT = 150
const AXIS = 24
const H = TOP + PLOT + AXIS

// "2026-09-15" as it is written in the file, "15 September 2026" under the chart
const longDate = (iso: string) => {
  const d = new Date(iso + "T00:00:00")
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
}

// The moments: curated in the entry's frontmatter (attention_moments: month, note, source),
// not in the data file the script overwrites. A numbered mark on the month, the same
// number in a list under the legend; the reader who cannot hover still has the list.
type Moment = { month: string; note: string; source?: string; url?: string }
const WIKI = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/

// "2024-04" as the file writes it, "Apr 2024" in the legend
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const monthName = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`

const fmt = (v: number, label: string) => {
  if (/per million/i.test(label)) return `${v.toFixed(1)} per million`
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`
  return String(Math.round(v))
}

export default (() => {
  const AttentionChart: QuartzComponent = ({ fileData, allFiles }: QuartzComponentProps) => {
    const fm = fileData.frontmatter as Record<string, unknown> | undefined
    const term = typeof fm?.term === "string" ? (fm.term as string) : undefined
    if (!term) return null
    const file = dataFileFor(fileData.filePath)
    if (!file) return null
    let data: Attention
    try {
      data = JSON.parse(fs.readFileSync(file, "utf8"))
    } catch {
      return null
    }
    const years = data.years
    // Too little to draw: the block still appears, and says what was looked for and not found.
    // A term that is everywhere on the platforms and nowhere in the record says so by that.
    if (data.enough === false || data.series.length < 2) {
      return (
        <details class="graph-story attention">
          <summary class="graph-story-header">
            <span class="graph-title-name">Attention curve</span>
            <span class="graph-title-rest">
              {" "}
              — no curve yet for the term <strong>{term}</strong>
            </span>
          </summary>
          <div class="attention-body">
            <p class="attention-note attention-none">
              Too little to draw: attention is only shown where at least two independent sources record it.
              Looked on {longDate(data.retrieved)}.{" "}
              {data.series.map((s, k) => (
                <span class="attention-source">
                  {k + 1}. {s.source}.{" "}
                </span>
              ))}
              {data.checked && data.checked.length > 0 && (
                <span class="attention-source">Not drawn: {data.checked.join("; ")}.</span>
              )}
            </p>
          </div>
        </details>
      )
    }
    // in the order the script wrote them: Wikipedia together, Dutch alone, research, then
    // YouTube and Google Trends where the curator added them; five at most
    const series = data.series.slice(0, 5)
    const months = data.months ?? years.map((yr) => `${yr}-07`)
    const lastYear = years[years.length - 1]
    const x = (i: number) => L + (i * (W - L - R)) / (months.length - 1)
    const base = TOP + PLOT
    const y = (v: number) => base - (v / 100) * PLOT
    const colours = ["var(--han-red)", "var(--secondary)", "var(--tertiary)", "#c98a1c", "#6b4c9a"]
    const shortLabel = (label: string) =>
      /^research/i.test(label) ? "Research (OpenAlex)" : label.split(",")[0].replace(/\s*\(.*\)$/, "") + (/languages?\)/.test(label) ? ` (${label.match(/\((\d+) language/)?.[1] ?? ""} languages)` : "")
    // a year's span on the axis: its first month to its last month present
    const span = (yr: number) => {
      const idx = months.map((m, i) => (m.startsWith(String(yr)) ? i : -1)).filter((i) => i >= 0)
      return idx.length ? ([idx[0], idx[idx.length - 1]] as const) : null
    }

    const shapes = series.map((s, k) => {
      const yearly = s.period === "year" || !months.some((m) => m in s.values)
      if (yearly) {
        const vals = years.map((yr) => s.values[String(yr)] ?? 0)
        const max = Math.max(...vals) || 1
        const peakAt = vals.indexOf(max)
        const blocks = years
          .map((yr, i) => {
            const sp = span(yr)
            if (!sp || !vals[i]) return null
            const [a, b] = sp
            const half = (W - L - R) / (months.length - 1) / 2
            return { x0: x(a) - half, x1: x(b) + half, top: y((vals[i] / max) * 100) }
          })
          .filter((b): b is { x0: number; x1: number; top: number } => b !== null)
        return { s, k, yearly, blocks, pts: [] as (readonly [number, number])[], line: "", area: "", peakAt, max, peakLabel: `${years[peakAt]}${peakAt === years.length - 1 ? "*" : ""}`, colour: colours[k] }
      }
      const vals = months.map((m) => s.values[m] ?? 0)
      const max = Math.max(...vals) || 1
      const peakAt = vals.indexOf(max)
      const pts = vals.map((v, i) => [x(i), y((v / max) * 100)] as const)
      const line = pts.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(" ")
      const area = `M${x(0).toFixed(1)},${base} L${line.replace(/ /g, " L")} L${x(months.length - 1).toFixed(1)},${base} Z`
      return { s, k, yearly, blocks: [] as { x0: number; x1: number; top: number }[], pts, line, area, peakAt, max, peakLabel: monthName(months[peakAt]), colour: colours[k] }
    })
    const hasYearly = shapes.some((sh) => sh.yearly)
    const monthlyNames = shapes.filter((sh) => !sh.yearly).map((sh) => shortLabel(sh.s.label))
    const yearlyNames = shapes.filter((sh) => sh.yearly).map((sh) => shortLabel(sh.s.label))

    // the moments, in the order of the months, each on the highest monthly line of its month
    const raw = Array.isArray(fm?.attention_moments) ? (fm!.attention_moments as Moment[]) : []
    const moments = raw
      .filter((m) => m && typeof m.month === "string" && months.includes(m.month) && typeof m.note === "string")
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((m, n) => {
        const i = months.indexOf(m.month)
        const tops = shapes.filter((sh) => !sh.yearly).map((sh) => sh.pts[i][1])
        const top = tops.length ? Math.min(...tops) : base
        // a wikilink in the source becomes a link to that file: a Sources bundle, or another entry
        let sourceText: string | undefined
        let sourceHref: string | undefined
        const w = m.source ? WIKI.exec(m.source) : null
        if (w) {
          sourceText = w[2] ?? w[1]
          const key = w[1].replace(/-/g, " ").toLowerCase()
          const hit = allFiles.find((f) => {
            const parts = (f.slug ?? "").split("/")
            const stem = parts[parts.length - 1] === "index" ? parts[parts.length - 2] : parts[parts.length - 1]
            return (stem ?? "").replace(/-/g, " ").toLowerCase() === key
          })
          if (hit?.slug) sourceHref = resolveRelative(fileData.slug!, hit.slug as FullSlug)
        } else if (m.source) {
          sourceText = m.source
          if (typeof m.url === "string" && /^https?:\/\//.test(m.url)) sourceHref = m.url
        }
        return { n: n + 1, i, month: m.month, note: m.note, x: x(i), y: Math.max(TOP + 8, top - 12), sourceText, sourceHref }
      })

    // what the reader's pointer reads out, month by month: the real figures of every series
    const readout = {
      months,
      series: shapes.map((sh) => ({
        label: shortLabel(sh.s.label),
        colour: sh.colour,
        yearly: sh.yearly,
        unit: /per million/i.test(sh.s.label) ? "per million" : "",
        values: sh.yearly ? years.map((yr) => sh.s.values[String(yr)] ?? 0) : months.map((m) => sh.s.values[m] ?? 0),
      })),
      years,
      moments: moments.map((m) => ({ i: m.i, n: m.n, note: m.note })),
    }

    return (
      <details class="graph-story attention">
        <summary class="graph-story-header">
          <span class="graph-title-name">Attention curve</span>
          <span class="graph-title-rest">
            {" "}
            — the rise and fall of the term <strong>{term}</strong>
          </span>
        </summary>
        <div class="attention-body" data-term={term}>
          <button type="button" class="attention-shot" aria-label="Save this chart as an image" title="Save as image">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
              <circle cx="12" cy="13" r="3.4" />
            </svg>
          </button>
          <svg viewBox={`0 0 ${W} ${H}`} class="attention-svg" role="img" aria-label={`Attention to ${term} by month, ${series.length} sources`}>
            {[50, 100].map((g) => (
              <line x1={L} y1={y(g)} x2={W - R} y2={y(g)} class="attention-grid" />
            ))}
            <line x1={L} y1={base} x2={W - R} y2={base} class="attention-base" />
            {[0, 50, 100].map((g) => (
              <text x={L - 6} y={y(g) + 4} text-anchor="end" class="attention-tick">
                {g}
              </text>
            ))}
            {shapes
              .filter((sh) => sh.yearly)
              .map(({ blocks, colour }) =>
                blocks.map((b) => (
                  <rect x={b.x0.toFixed(1)} y={b.top.toFixed(1)} width={(b.x1 - b.x0).toFixed(1)} height={(base - b.top).toFixed(1)} fill={colour} class="attention-block" />
                )),
              )}
            {shapes
              .filter((sh) => !sh.yearly)
              .map(({ area, colour }) => (
                <path d={area} fill={colour} class="attention-area" />
              ))}
            {shapes
              .filter((sh) => !sh.yearly)
              .map(({ line, colour }) => (
                <polyline points={line} fill="none" stroke={colour} stroke-width="1.4" stroke-linejoin="round" class="attention-line" />
              ))}
            {shapes
              .filter((sh) => !sh.yearly)
              .map(({ pts, peakAt, colour }) => (
                <circle cx={pts[peakAt][0].toFixed(1)} cy={pts[peakAt][1].toFixed(1)} r="3.2" fill={colour} />
              ))}
            {shapes
              .filter((sh) => sh.yearly)
              .map(({ blocks, peakAt, colour }) => {
                const b = blocks[Math.min(peakAt, blocks.length - 1)]
                return b ? <circle cx={((b.x0 + b.x1) / 2).toFixed(1)} cy={b.top.toFixed(1)} r="3.2" fill={colour} /> : null
              })}
            {moments.map((m) => (
              <g class="attention-moment" data-moment={m.n} transform={`translate(${m.x.toFixed(1)} ${m.y.toFixed(1)})`}>
                <line x1="0" y1="7" x2="0" y2={(base - m.y).toFixed(1)} class="attention-moment-stem" />
                <circle r="7" class="attention-moment-dot" />
                <text y="3.2" text-anchor="middle" class="attention-moment-num">
                  {m.n}
                </text>
              </g>
            ))}
            {months.map((m, i) =>
              m.endsWith("-01") ? (
                <>
                  <line x1={x(i).toFixed(1)} y1={base} x2={x(i).toFixed(1)} y2={base + 4} class="attention-base" />
                  <text x={(x(i) + 3).toFixed(1)} y={H - 6} class="attention-year">
                    {m.slice(0, 4)}
                    {hasYearly && Number(m.slice(0, 4)) === lastYear ? "*" : ""}
                  </text>
                </>
              ) : null,
            )}
          </svg>
          <div class="attention-readout" hidden></div>
          <ul class="attention-legend">
            {shapes.map(({ s, colour, max, peakLabel, yearly }) => (
              <li>
                <i style={`background:${colour}`} class={yearly ? "attention-swatch-block" : ""}></i>
                {shortLabel(s.label)}
                <span class="attention-peak">
                  {fmt(max, s.label)} · {peakLabel}
                </span>
              </li>
            ))}
          </ul>
          {moments.length > 0 && (
            <ol class="attention-moments">
              {moments.map((m) => (
                <li data-moment={m.n}>
                  <b>{m.n}</b> <span class="attention-moment-month">{monthName(m.month)}</span> {m.note}
                  {m.sourceText && (
                    <>
                      {" "}
                      {m.sourceHref ? (
                        <a href={m.sourceHref} class={/^https?:/.test(m.sourceHref) ? "external" : "internal"} target={/^https?:/.test(m.sourceHref) ? "_blank" : undefined} rel={/^https?:/.test(m.sourceHref) ? "noopener" : undefined}>
                          {m.sourceText}
                        </a>
                      ) : (
                        <span>{m.sourceText}</span>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ol>
          )}
          <script type="application/json" class="attention-data" dangerouslySetInnerHTML={{ __html: JSON.stringify(readout).replace(/</g, "\\u003c") }}></script>
          <p class="attention-note">
            Attention to the term, not use of it. Where the field and the landscape are curated, the curve is
            computed. The sources cannot be compared in size, only in shape and timing: each is drawn on its
            own scale, its peak (= 100) marked with the real figure. {monthlyNames.join(" and ")} by month, up to{" "}
            {monthName(months[months.length - 1])}
            {hasYearly ? `; ${yearlyNames.join(" and ")} as one block per year` : ""}. Retrieved {longDate(data.retrieved)}.
            {hasYearly ? ` * ${lastYear} is not complete for a yearly figure, and research indexing lags months behind.` : ""}{" "}
            {series.map((s, k) => (
              <span class="attention-source">
                {k + 1}. {s.source}.{" "}
              </span>
            ))}
            {data.checked && data.checked.length > 0 && (
              <span class="attention-source">Not drawn: {data.checked.join("; ")}.</span>
            )}
          </p>
        </div>
      </details>
    )
  }
  AttentionChart.css = style
  AttentionChart.afterDOMLoaded = script
  return AttentionChart
}) satisfies QuartzComponentConstructor
