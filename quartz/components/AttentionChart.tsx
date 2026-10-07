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
type Series = { label: string; source: string; values: Record<string, number>; raw?: Record<string, number>; period?: "month" | "year"; kind?: "use" }
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

// Every line gets a figure a person can hold, beside the one that makes years comparable
// (23-09, after the 0–100 of Google Trends was read as a count of searches). Page views by
// the day rather than the month; research as articles as well as a share; and Trends no
// figure at all, because Google publishes none — there the peak is a date.
const isIndex = (label: string) => /trends/i.test(label)
const perDay = (v: number, key: string) => {
  const days = key.length === 7 ? new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0).getDate() : 365
  return Math.round(v / days)
}
const human = (v: number, label: string, key: string, raw?: number) => {
  if (isIndex(label)) return null
  if (/per million/i.test(label)) return raw ? `${raw} ${raw === 1 ? "article" : "articles"}` : null
  const d = perDay(v, key)
  return d >= 10 ? `${d.toLocaleString("en")} a day` : null
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
    // Too little to draw: no block to open, one line that says what the gap means (07-10, after
    // "is het dan wel relevant?"). A word with no article and no research lives on platforms
    // that cannot be counted; a word that means something else elsewhere cannot be counted at
    // all. Either way the absence is a finding, and the line points to a curve that is drawn.
    if (data.enough === false || data.series.length < 2) {
      const checked = data.checked ?? []
      const ambiguous = checked.some((c) => /means something else/i.test(c))
      const why = ambiguous
        ? "the word means other things too, in games, in research or in everyday English, so a count would not be a count of this word."
        : "no Wikipedia article and almost no research yet. The word lives on platforms where attention cannot be counted, and search interest alone is too little to compare."
      const example = "Cabinet-of-Digital-Terms/Gender--and--Identity/Incel/index" as FullSlug
      const guide = "Reading-the-graph" as FullSlug
      return (
        <div class="graph-story attention attention-empty">
          <p class="attention-note">
            <span class="graph-title-name">Attention curve</span> not drawn for <strong>{term}</strong>: {why}{" "}
            Looked on {longDate(data.retrieved)}.{" "}
            <a href={resolveRelative(fileData.slug!, guide) + "#the-attention-curve"} class="internal">
              What the curve shows
            </a>{" "}
            · a drawn curve:{" "}
            <a href={resolveRelative(fileData.slug!, example)} class="internal">
              Incel
            </a>
          </p>
        </div>
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
        return { s, k, yearly, blocks, pts: [] as (readonly [number, number])[], line: "", area: "", peakAt, max, peakKey: String(years[peakAt]), peakLabel: `${years[peakAt]}${peakAt === years.length - 1 ? "*" : ""}`, colour: colours[k] }
      }
      // A month the file does not carry is a month with no article, not a month with no
      // readers (26-09): the Dutch Tradwife article was written in May 2024, and drawing
      // zeros before it said "nobody looked" where the truth is "there was nothing to look
      // at". The line therefore starts where the figures start, and breaks wherever they do.
      const vals = months.map((m) => (m in s.values ? s.values[m] : null))
      const present = vals.filter((v): v is number => v !== null)
      const max = Math.max(...present, 0) || 1
      const peakAt = vals.indexOf(max)
      const pts = vals.map((v, i) => (v === null ? null : ([x(i), y((v / max) * 100)] as const)))
      // one run per stretch of months that have figures
      const runs: (readonly [number, number])[][] = []
      let run: (readonly [number, number])[] = []
      pts.forEach((p) => {
        if (p) run.push(p)
        else if (run.length) { runs.push(run); run = [] }
      })
      if (run.length) runs.push(run)
      const line = runs.map((r) => r.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(" ")).join(" ")
      const area = runs
        .filter((r) => r.length > 1)
        .map((r) => `M${r[0][0].toFixed(1)},${base} L${r.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(" L")} L${r[r.length - 1][0].toFixed(1)},${base} Z`)
        .join(" ")
      return { s, k, yearly, blocks: [] as { x0: number; x1: number; top: number }[], pts: pts.filter((p): p is readonly [number, number] => p !== null), runs, line, area, peakAt, max, peakKey: months[peakAt], peakLabel: monthName(months[peakAt]), colour: colours[k] }
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
        // the highest line of that month, among the series that have a figure for it — a
        // series whose article did not exist yet has no point there and cannot carry a mark
        const tops = shapes
          .filter((sh) => !sh.yearly)
          .map((sh) => (sh.s.values[m.month] === undefined ? null : y((sh.s.values[m.month] / sh.max) * 100)))
          .filter((v): v is number => v !== null)
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
    // two marks in neighbouring months at the same height would cover each other: the later
    // one moves up a step (Looksmaxxing, March and April 2026)
    for (let k = 1; k < moments.length; k++) {
      const a = moments[k - 1]
      const b = moments[k]
      if (Math.abs(b.x - a.x) < 18 && Math.abs(b.y - a.y) < 18) {
        if (Math.min(a.y, b.y) - 18 >= TOP + 8) b.y = Math.min(a.y, b.y) - 18
        else a.y = Math.max(a.y, b.y) + 18 // both at the ceiling: the earlier one hangs below
      }
    }

    // The stack, after Tufte ("a stack allows fast effective parallel comparisons", 26-09):
    // the same series one under the other, each on its own scale, on one shared axis of
    // months, with the moments as dotted lines through every row. Shown only in the loupe
    // (07-10, Marieke: "bij elkaar, en als je het vergroot onder elkaar"); the panel keeps
    // the compact overlay. Each row ends in its peak with its own unit and month, so the
    // order of the peaks reads from left to right.
    const SW = 900
    const SL = 180
    const SR = 96
    const ROW = 46
    const GAP = 14
    const STOP = 42
    const sx = (i: number) => SL + (i * (SW - SL - SR)) / (months.length - 1)
    const rows = shapes.map((sh, r) => {
      const top = STOP + r * (ROW + GAP)
      const bottom = top + ROW
      const sy = (frac: number) => bottom - frac * ROW
      if (sh.yearly) {
        const vals = years.map((yr) => sh.s.values[String(yr)] ?? 0)
        const max = Math.max(...vals) || 1
        const half = (SW - SL - SR) / (months.length - 1) / 2
        const blocks = years
          .map((yr, i) => {
            const sp = span(yr)
            if (!sp || !vals[i]) return null
            return { x0: sx(sp[0]) - half + 1, x1: sx(sp[1]) + half - 1, top: sy(vals[i] / max) }
          })
          .filter((b): b is { x0: number; x1: number; top: number } => b !== null)
        return { sh, top, bottom, blocks, runs: [] as string[], peak: null as null | readonly [number, number] }
      }
      const pts = months.map((m, i) => (m in sh.s.values ? ([sx(i), sy(sh.s.values[m] / sh.max)] as const) : null))
      const runs: string[] = []
      let run: string[] = []
      pts.forEach((p) => {
        if (p) run.push(`${p[0].toFixed(1)},${p[1].toFixed(1)}`)
        else if (run.length) { runs.push(run.join(" ")); run = [] }
      })
      if (run.length) runs.push(run.join(" "))
      return { sh, top, bottom, blocks: [] as { x0: number; x1: number; top: number }[], runs, peak: pts[sh.peakAt] }
    })
    const SH = STOP + shapes.length * (ROW + GAP) + 10
    // numbers of moments in neighbouring months would sit on top of each other: those
    // closer than one badge to the previous one go up a step (Tradwife, April and May 2024)
    const badgeY: number[] = []
    moments.forEach((m, k) => {
      const prev = k ? moments[k - 1] : null
      badgeY.push(prev && sx(m.i) - sx(prev.i) < 18 && badgeY[k - 1] === STOP - 14 ? STOP - 30 : STOP - 14)
    })

    // what the reader's pointer reads out, month by month: the real figures of every series
    const readout = {
      months,
      series: shapes.map((sh) => ({
        label: shortLabel(sh.s.label),
        colour: sh.colour,
        yearly: sh.yearly,
        unit: /per million/i.test(sh.s.label) ? "per million" : isIndex(sh.s.label) ? "index" : "",
        values: sh.yearly ? years.map((yr) => sh.s.values[String(yr)] ?? 0) : months.map((m) => sh.s.values[m] ?? 0),
        // the figure a person can hold: articles for research, views a day for page views
        held: sh.yearly
          ? years.map((yr) => human(sh.s.values[String(yr)] ?? 0, sh.s.label, String(yr), sh.s.raw?.[String(yr)]))
          : months.map((m) => human(sh.s.values[m] ?? 0, sh.s.label, m, sh.s.raw?.[m])),
      })),
      years,
      moments: moments.map((m) => ({ i: m.i, n: m.n, note: m.note, month: m.month, source: m.sourceText ?? "", url: m.sourceHref ?? "" })),
      term,
      retrieved: data.retrieved,
      // the source line of each series, so that a downloaded file says where its figures came from
      sources: series.map((s) => s.source),
      checked: data.checked ?? [],
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
          <button type="button" class="attention-data-save" aria-label="Save the figures as a spreadsheet" title="Save the figures (.csv)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 3.5h9l5 5V20.5H5z" />
              <path d="M14 3.5V9h5" />
              <path d="M8 13h8M8 16.5h8" />
            </svg>
          </button>
          <button type="button" class="attention-play" aria-label="Read the moments aloud, in order" title="Read the moments aloud (or tap a numbered mark for one)">
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M7 5.5v13l11-6.5z" />
            </svg>
          </button>
          <button type="button" class="attention-loupe" aria-label="Enlarge this curve" title="Enlarge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M20 20l-4.2-4.2" />
              <path d="M11 8.5v5M8.5 11h5" />
            </svg>
          </button>
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
              .map(({ runs, colour, s }) =>
                // one polyline per run, or a single one would bridge the gap it is meant to show;
                // a line of use (4chan) is dashed, so that it does not pass for attention
                (runs ?? []).map((r) => (
                  <polyline
                    points={r.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(" ")}
                    fill="none"
                    stroke={colour}
                    stroke-width="1.4"
                    stroke-linejoin="round"
                    stroke-dasharray={s.kind === "use" ? "3 2" : undefined}
                    class="attention-line"
                  />
                )),
              )}
            {shapes
              .filter((sh) => !sh.yearly)
              .map(({ peakAt, colour }) => (
                // the peak is the month at peakAt, and a peak is by definition the top of its own scale
                <circle cx={x(peakAt).toFixed(1)} cy={y(100).toFixed(1)} r="3.2" fill={colour} />
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
          <svg viewBox={`0 0 ${SW} ${SH}`} class="attention-stack" role="img" aria-label={`Attention to ${term}, one row per source, each on its own scale`}>
            {moments.map((m, k) => (
              <g class="attention-stack-moment" data-moment={m.n}>
                <line x1={sx(m.i).toFixed(1)} y1={badgeY[k] + 8} x2={sx(m.i).toFixed(1)} y2={SH - 18} class="attention-stack-dots" />
                <circle cx={sx(m.i).toFixed(1)} cy={badgeY[k]} r="8" class="attention-moment-dot" />
                <text x={sx(m.i).toFixed(1)} y={badgeY[k] + 3.4} text-anchor="middle" class="attention-moment-num">
                  {m.n}
                </text>
              </g>
            ))}
            {rows.map(({ sh, top, bottom, blocks, runs, peak }) => (
              <g class="attention-stack-row">
                <line x1={SL} y1={bottom} x2={SW - SR} y2={bottom} class="attention-base" />
                <text x={SL - 12} y={(top + bottom) / 2 + 4} text-anchor="end" class="attention-stack-label">
                  {shortLabel(sh.s.label)}
                </text>
                {sh.s.kind === "use" && (
                  <text x={SL - 12} y={(top + bottom) / 2 + 17} text-anchor="end" class="attention-stack-sub">
                    use, not attention
                  </text>
                )}
                {blocks.map((b) => (
                  <rect x={b.x0.toFixed(1)} y={b.top.toFixed(1)} width={(b.x1 - b.x0).toFixed(1)} height={(bottom - b.top).toFixed(1)} fill={sh.colour} class="attention-block" />
                ))}
                {runs.map((r) => (
                  <>
                    <polygon points={`${r.split(" ")[0].split(",")[0]},${bottom} ${r} ${r.split(" ").slice(-1)[0].split(",")[0]},${bottom}`} fill={sh.colour} class="attention-area" />
                    <polyline points={r} fill="none" stroke={sh.colour} stroke-width="1.4" stroke-linejoin="round" stroke-dasharray={sh.s.kind === "use" ? "3 2" : undefined} class="attention-line" />
                  </>
                ))}
                {peak && <circle cx={peak[0].toFixed(1)} cy={peak[1].toFixed(1)} r="3" fill={sh.colour} />}
                <text x={SW - SR + 10} y={top + 12} class="attention-stack-peak" fill={sh.colour}>
                  {isIndex(sh.s.label) ? "100" : sh.s.kind === "use" ? `${sh.max.toFixed(1)} per 10k` : fmt(sh.max, sh.s.label)}
                </text>
                <text x={SW - SR + 10} y={top + 25} class="attention-stack-when">
                  {sh.peakLabel}
                </text>
              </g>
            ))}
            {months.map((m, i) =>
              m.endsWith("-01") ? (
                <text x={(sx(i) + 3).toFixed(1)} y={SH - 4} class="attention-year">
                  {m.slice(0, 4)}
                </text>
              ) : null,
            )}
          </svg>
          <div class="attention-readout" hidden></div>
          <ul class="attention-legend">
            {shapes.map(({ s, colour, max, peakKey, peakLabel, yearly }) => {
              const held = human(max, s.label, peakKey, s.raw?.[peakKey])
              return (
                <li>
                  <i style={`background:${colour}`} class={yearly ? "attention-swatch-block" : ""}></i>
                  {shortLabel(s.label)}
                  <span class="attention-peak">
                    {isIndex(s.label) ? `index, peak ${peakLabel}` : `${fmt(max, s.label)} · ${peakLabel}`}
                    {held && <span class="attention-held"> ({held})</span>}
                  </span>
                </li>
              )
            })}
          </ul>
          {moments.length > 0 && (
            <ol class="attention-moments">
              {moments.map((m) => (
                <li data-moment={m.n}>
                  <b class="attention-moment-nr" title="Read this moment aloud">{m.n}</b> <span class="attention-moment-month">{monthName(m.month)}</span> {m.note}
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
            {series.some((s) => s.kind === "use")
              ? "Attention to the term, and, in the dashed line, its use on one forum. "
              : "Attention to the term, not use of it. "}
            Enlarged, the sources stand one under the other, each on its own scale. Where the field and the landscape are curated, the curve is
            computed. Two of the lines are counts and one is not: page views and articles are measured,
            while Google Trends is an index from 0 to 100 against its own busiest month, because Google
            publishes no figures. The sources cannot be compared in size, only in shape and timing: each is drawn on its
            own scale, its peak (= 100) marked with the real figure. {monthlyNames.join(" and ")} by month, up to{" "}
            {monthName(months[months.length - 1])}
            {hasYearly ? `; ${yearlyNames.join(" and ")} as one block per year` : ""}.
            {hasYearly ? ` * ${lastYear} is not complete for a yearly figure, and research indexing lags months behind.` : ""}{" "}
            {series.map((s, k) => (
              <span class="attention-source">
                {k + 1}. {s.source}.{" "}
              </span>
            ))}
            {data.checked && data.checked.length > 0 && (
              <span class="attention-source">Not drawn: {data.checked.join("; ")}. </span>
            )}
            <span class="attention-retrieved">Retrieved {longDate(data.retrieved)}.</span>
          </p>
        </div>
        <div class="attention-overlay" aria-hidden="true">
          <div class="attention-overlay-card">
            <div class="attention-overlay-head">
              <span class="graph-title-name">Attention curve</span>
              <span class="graph-title-rest">
                {" "}
                — the rise and fall of the term <strong>{term}</strong>
              </span>
              <button type="button" class="attention-overlay-close" aria-label="Close">×</button>
            </div>
          </div>
        </div>
      </details>
    )
  }
  AttentionChart.css = style
  AttentionChart.afterDOMLoaded = script
  return AttentionChart
}) satisfies QuartzComponentConstructor
