import fs from "fs"
import path from "path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import style from "./styles/attentionChart.scss"

// A third block under an entry's graph: when the word drew attention. Drawn at build time
// from a dated data file beside the entry (attention.json for Term/index.md, or
// attention-<file>.json beside a flat Term.md), written by scripts/attention.py. No file,
// no block. Each series is indexed to its own peak, so the lines share one scale without
// pretending that page views and papers are the same kind of number.
type Series = { label: string; source: string; values: Record<string, number> }
type Attention = {
  term: string
  retrieved: string
  years: number[]
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

// One field, three translucent shapes: each source indexed to its own peak (= 100) so the
// three can share a canvas, filled so that where they overlap the colours mix and the
// reader sees the years the sources agree. The peak of each carries its real figure.
const W = 640
const L = 34
const R = 22
const TOP = 10
const PLOT = 150
const AXIS = 24
const H = TOP + PLOT + AXIS

const fmt = (v: number, label: string) => {
  if (/per million/i.test(label)) return `${v.toFixed(1)} per million`
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`
  return String(Math.round(v))
}

export default (() => {
  const AttentionChart: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
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
            <span class="graph-title-name">Semantic attention</span>
            <span class="graph-title-rest">
              {" "}
              — no curve yet for the term <strong>{term}</strong>
            </span>
          </summary>
          <div class="attention-body">
            <p class="attention-note attention-none">
              Too little to draw: attention is only shown where at least two independent sources record it.
              Checked {data.retrieved}: {(data.checked ?? []).join("; ")}.
            </p>
          </div>
        </details>
      )
    }
    // the two Wikipedias with the most views, and the research line; the rest is in the note
    const wiki = data.series.filter((s) => !/^research/i.test(s.label)).slice(0, 2)
    const research = data.series.filter((s) => /^research/i.test(s.label)).slice(0, 1)
    const series = [...wiki, ...research]
    const x = (i: number) => L + (i * (W - L - R)) / (years.length - 1)
    const base = TOP + PLOT
    const y = (v: number) => base - (v / 100) * PLOT
    const colours = ["var(--han-red)", "var(--secondary)", "var(--tertiary)"]
    const shortLabel = (label: string) =>
      /^research/i.test(label) ? "Research (OpenAlex)" : label.split(",")[0].replace(/\s*\(.*\)$/, "")

    const shapes = series.map((s, k) => {
      const vals = years.map((yr) => s.values[String(yr)] ?? 0)
      const max = Math.max(...vals) || 1
      const peakAt = vals.indexOf(max)
      const pts = vals.map((v, i) => [x(i), y((v / max) * 100)] as const)
      const line = pts.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(" ")
      const area = `M${x(0).toFixed(1)},${base} L${line.replace(/ /g, " L")} L${x(years.length - 1).toFixed(1)},${base} Z`
      return { s, k, pts, line, area, peakAt, max, colour: colours[k] }
    })

    return (
      <details class="graph-story attention">
        <summary class="graph-story-header">
          <span class="graph-title-name">Semantic attention</span>
          <span class="graph-title-rest">
            {" "}
            — the rise and fall of the term <strong>{term}</strong>
          </span>
        </summary>
        <div class="attention-body">
          <svg viewBox={`0 0 ${W} ${H}`} class="attention-svg" role="img" aria-label={`Attention to ${term} by year, three sources`}>
            {[50, 100].map((g) => (
              <line x1={L} y1={y(g)} x2={W - R} y2={y(g)} class="attention-grid" />
            ))}
            <line x1={L} y1={base} x2={W - R} y2={base} class="attention-base" />
            {[0, 50, 100].map((g) => (
              <text x={L - 6} y={y(g) + 4} text-anchor="end" class="attention-tick">
                {g}
              </text>
            ))}
            {shapes.map(({ area, colour }) => (
              <path d={area} fill={colour} class="attention-area" />
            ))}
            {shapes.map(({ line, colour }) => (
              <polyline points={line} fill="none" stroke={colour} stroke-width="1.6" stroke-linejoin="round" class="attention-line" />
            ))}
            {shapes.map(({ pts, peakAt, colour }) => (
              <circle cx={pts[peakAt][0].toFixed(1)} cy={pts[peakAt][1].toFixed(1)} r="3.4" fill={colour} />
            ))}
            {years.map((yr, i) => (
              <text x={x(i)} y={H - 6} text-anchor="middle" class="attention-year">
                {yr}
                {i === years.length - 1 ? "*" : ""}
              </text>
            ))}
          </svg>
          <ul class="attention-legend">
            {shapes.map(({ s, colour, max, peakAt }) => (
              <li>
                <i style={`background:${colour}`}></i>
                {shortLabel(s.label)}
                <span class="attention-peak">
                  {fmt(max, s.label)} · {years[peakAt]}
                </span>
              </li>
            ))}
          </ul>
          <p class="attention-note">
            Attention to the term, not use of it. Each source indexed to its own peak (= 100), the peak marked with
            the real figure; * the current year is partial. Retrieved {data.retrieved}.{" "}
            {series.map((s, k) => (
              <span class="attention-source">
                {k + 1}. {s.source}.{" "}
              </span>
            ))}
            {data.checked && data.checked.length > 0 && (
              <span class="attention-source">Also checked: {data.checked.join("; ")}.</span>
            )}
          </p>
        </div>
      </details>
    )
  }
  AttentionChart.css = style
  return AttentionChart
}) satisfies QuartzComponentConstructor
