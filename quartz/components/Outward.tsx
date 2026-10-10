import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { FullSlug, SimpleSlug, resolveRelative, simplifySlug } from "../util/path"
import style from "./styles/outward.scss"
// @ts-ignore
import script from "./scripts/outward.inline"

// A collapsible block on a cluster's About page (2026-10-10), folding like Semantic field
// and Attention curve. Three columns: on the left the clusters whose terms point into this
// cluster (its backlinks), in the middle the cluster's own terms, on the right the clusters
// its terms point to. One line per cluster and term, per direction: solid when the text that
// points argues the relation, dashed when it only lists it in Related terms. First made for
// entries (as "naar buiten" from the relation analysis); moved to the cluster pages after
// Marieke saw that on an entry the ring of the graph already shows the same per term.
// Drawn at build time from what LinkProcessing records (links, relatedLinks).

// Kept in step with clusterColor in scripts/graph.inline.ts.
function clusterColor(id: string): string {
  if (id.includes("Platform-Mechanisms")) return "#D94A4A"
  if (id.includes("AI-Specific")) return "#0E9272"
  if (id.includes("AI-and-Energy")) return "#3F51B5"
  if (id.includes("Gender")) return "#C56A1A"
  if (id.includes("Parents")) return "#B88900"
  if (id.includes("Relationships")) return "#168AAD"
  if (id.includes("Beauty")) return "#C653A0"
  if (id.includes("Counter-Movements")) return "#9B3A6D"
  if (id.includes("Design-Philosophy")) return "#6A8F1F"
  if (id.includes("SF-as-Ideology")) return "#0097A7"
  if (id.includes("Culture-Wars")) return "#C44536"
  if (id.includes("Society-and-Power")) return "#228B4E"
  if (id.includes("Privacy")) return "#2F80C0"
  if (id.includes("Inclusion")) return "#607D8B"
  if (id.includes("Manifestos")) return "#7B3FA1"
  if (id.includes("Statements-as")) return "#455A64"
  if (id.includes("End-Times")) return "#C62828"
  if (id.includes("New-Digital-Professions")) return "#1976D2"
  if (id.includes("Subcultural")) return "#8D6E63"
  if (id.includes("Consequences")) return "#00897B"
  return "#888888"
}

const shortTitles: Record<string, string> = {
  "Beauty,-Influencers--and--Self-Image": "Beauty & Self-Image",
  "Consequences-of-Digital-Behaviour": "Consequences",
  "Culture-Wars-and-Political-Language": "Culture Wars",
  "Design-Philosophy-and-Ethical-Design": "Ethical Design",
  "End-Times-Thinking-and-Elite-Survivalism": "End-Times Thinking",
  "Inclusion,-Accessibility-and-Ageing": "Inclusion & Ageing",
  "New-Digital-Professions": "Digital Professions",
  "Platform-Mechanisms--and--Economics": "Platform Mechanisms",
  "Privacy,-Data-and-Control": "Privacy & Data",
  "Statements-as-Analytical-Object": "Statements",
  "Subcultural-Vocabulary-and-Platform-Language": "Subcultural Vocabulary",
}

const clusterOf = (id: string) => id.split("/").filter(Boolean)[1] ?? null
const isTermSlug = (id: string) =>
  id.split("/").filter(Boolean).length >= 3 && !id.includes("/Sources/") && !id.endsWith("/Sources")

export default (() => {
  const Outward: QuartzComponent = ({ fileData, allFiles, displayClass }: QuartzComponentProps) => {
    const slug = fileData.slug as FullSlug
    const parts = simplifySlug(slug).split("/").filter(Boolean)
    // only on a cluster's About page: Cabinet-of-Digital-Terms/<cluster>/index
    if (parts.length !== 2 || parts[0] !== "Cabinet-of-Digital-Terms") return null
    const own = parts[1]

    type Info = { title: string; links: Set<string>; inText: Set<string> }
    const info = new Map<string, Info>()
    for (const f of allFiles) {
      if (!f.slug) continue
      const id = simplifySlug(f.slug)
      if (!isTermSlug(id) || (f.frontmatter?.tags as string[] | undefined)?.includes("source")) continue
      const links = new Set<string>(f.links ?? [])
      const side = new Set<string>(f.relatedLinks ?? [])
      info.set(id, {
        title: (f.frontmatter?.title as string) ?? id.split("/").filter(Boolean).pop() ?? id,
        links,
        inText: new Set([...links].filter((l) => !side.has(l))),
      })
    }
    const terms = [...info.keys()].filter((id) => clusterOf(id) === own).sort((a, b) => info.get(a)!.title.localeCompare(info.get(b)!.title))
    if (terms.length === 0) return null
    const inCluster = new Set(terms)

    type Tally = { argued: number; named: number }
    const outPair = new Map<string, "argued" | "named">() // term|cluster
    const inPair = new Map<string, "argued" | "named">() // cluster|term
    const outC = new Map<string, Tally>()
    const inC = new Map<string, Tally>()
    const add = (m: Map<string, Tally>, c: string, argued: boolean) => {
      const t = m.get(c) ?? { argued: 0, named: 0 }
      if (argued) t.argued++
      else t.named++
      m.set(c, t)
    }
    const mark = (m: Map<string, "argued" | "named">, k: string, argued: boolean) => {
      if (argued) m.set(k, "argued")
      else if (!m.has(k)) m.set(k, "named")
    }
    for (const t of terms) {
      for (const u of info.get(t)!.links) {
        if (!info.has(u) || inCluster.has(u)) continue
        const argued = info.get(t)!.inText.has(u)
        add(outC, clusterOf(u)!, argued)
        mark(outPair, `${t}|${clusterOf(u)}`, argued)
      }
    }
    for (const [u, d] of info) {
      if (inCluster.has(u)) continue
      for (const t of d.links) {
        if (!inCluster.has(t)) continue
        const argued = d.inText.has(t)
        add(inC, clusterOf(u)!, argued)
        mark(inPair, `${clusterOf(u)}|${t}`, argued)
      }
    }
    const sorted = (m: Map<string, Tally>) => [...m.entries()].sort((a, b) => b[1].argued + b[1].named - (a[1].argued + a[1].named))
    const ins = sorted(inC)
    const outs = sorted(outC)
    const sum = (m: Map<string, Tally>) => [...m.values()].reduce((n, v) => ({ argued: n.argued + v.argued, named: n.named + v.named }), { argued: 0, named: 0 })
    const tin = sum(inC)
    const tout = sum(outC)
    const niceTitle = (c: string) =>
      shortTitles[c] ?? (allFiles.find((f) => f.slug === `Cabinet-of-Digital-Terms/${c}/index`)?.frontmatter?.title as string) ?? c.replaceAll("--and--", " & ").replaceAll("-", " ")

    const W = 760
    const top = 40
    const stepT = 18
    const stepC = 22
    const plotH = Math.max(terms.length * stepT, ins.length * stepC, outs.length * stepC)
    // the cluster's own terms share the full height, so their names do not sit on each other
    const spreadT = terms.length > 1 ? Math.max(stepT, (plotH - stepT) / (terms.length - 1)) : stepT
    const H = top + plotH + 10
    const xIn = 200
    const xMid = 380
    const xOut = 560
    const yT = (i: number) => top + (plotH - spreadT * (terms.length - 1)) / 2 + i * spreadT
    const yC = (n: number, i: number) => top + (plotH - stepC * (n - 1)) / 2 + i * stepC
    const termY = new Map(terms.map((t, i) => [t, yT(i)]))
    const inY = new Map(ins.map(([c], i) => [c, yC(ins.length, i)]))
    const outY = new Map(outs.map(([c], i) => [c, yC(outs.length, i)]))
    const curve = (x1: number, y1: number, x2: number, y2: number) => {
      const m = (x1 + x2) / 2
      return `M${x1},${y1.toFixed(1)} C${m},${y1.toFixed(1)} ${m},${y2.toFixed(1)} ${x2},${y2.toFixed(1)}`
    }
    const ownColour = clusterColor(own)
    const link = (target: string) => resolveRelative(slug, target as SimpleSlug)

    return (
      <details class={`graph-story outward ${displayClass ?? ""}`}>
        <summary class="graph-story-header">
          <span class="graph-title-name">Outward</span>
          <span class="graph-title-rest">
            {" "}
            — <strong>{niceTitle(own)}</strong> and the other clusters: who points in, where it points out
          </span>
        </summary>
        <div class="outward-body">
          <p class="outward-sum">
            Its terms point to terms in other clusters {tout.argued + tout.named} times ({tout.argued} argued in the text), and terms elsewhere point to it {tin.argued + tin.named} times ({tin.argued} argued).
          </p>
          <svg viewBox={`0 0 ${W} ${H}`} class="outward-svg" role="img" aria-label={`Relations of ${niceTitle(own)} with other clusters, both directions`}>
            <text x={xIn} y={16} text-anchor="middle" class="outward-head">pointing in</text>
            <text x={xMid} y={16} text-anchor="middle" class="outward-head">{niceTitle(own)}</text>
            <text x={xOut} y={16} text-anchor="middle" class="outward-head">pointing out</text>
            {[...inPair.entries()].map(([k, kind]) => {
              const cut = k.indexOf("|")
              const c = k.slice(0, cut)
              const t = k.slice(cut + 1)
              return <path d={curve(xIn + 5, inY.get(c)!, xMid - 5, termY.get(t)!)} class={`outward-line ${kind}`} stroke={clusterColor(c)} data-c={`in:${c}`} data-t={t} />
            })}
            {[...outPair.entries()].map(([k, kind]) => {
              const cut = k.lastIndexOf("|")
              const t = k.slice(0, cut)
              const c = k.slice(cut + 1)
              return <path d={curve(xMid + 5, termY.get(t)!, xOut - 5, outY.get(c)!)} class={`outward-line ${kind}`} stroke={clusterColor(c)} data-c={`out:${c}`} data-t={t} />
            })}
            {ins.map(([c, v], i) => (
              <g class="outward-node" data-key={`in:${c}`} data-tip={`${niceTitle(c)} → ${niceTitle(own)}: ${v.argued} argued in the text · ${v.named} only in Related terms`}>
                <circle cx={xIn} cy={yC(ins.length, i).toFixed(1)} r={5} fill={clusterColor(c)} />
                <text x={xIn - 10} y={(yC(ins.length, i) + 4).toFixed(1)} text-anchor="end" class="outward-cluster">
                  <a href={link(`Cabinet-of-Digital-Terms/${c}/`)} class="outward-link">
                    <tspan class="outward-go">↗ </tspan>
                  </a>
                  <tspan class="outward-count">{`${v.argued} · ${v.named}  `}</tspan>
                  {niceTitle(c)}
                </text>
              </g>
            ))}
            {terms.map((t, i) => {
              const oi = [...outPair.entries()].filter(([k]) => k.startsWith(`${t}|`))
              const ii = [...inPair.entries()].filter(([k]) => k.endsWith(`|${t}`))
              const a = oi.filter(([, x]) => x === "argued").length + ii.filter(([, x]) => x === "argued").length
              const n = oi.length + ii.length - a
              return (
                <g class="outward-node" data-key={`t:${t}`} data-tip={`${info.get(t)!.title}: ${a} cluster links argued · ${n} only listed`}>
                  <circle cx={xMid} cy={yT(i).toFixed(1)} r={3.5} fill={ownColour} />
                  <a href={link(t)} class="outward-link">
                    <text x={xMid} y={(yT(i) - 5).toFixed(1)} text-anchor="middle" class="outward-term">
                      {info.get(t)!.title}
                    </text>
                  </a>
                </g>
              )
            })}
            {outs.map(([c, v], i) => (
              <g class="outward-node" data-key={`out:${c}`} data-tip={`${niceTitle(own)} → ${niceTitle(c)}: ${v.argued} argued in the text · ${v.named} only in Related terms`}>
                <circle cx={xOut} cy={yC(outs.length, i).toFixed(1)} r={5} fill={clusterColor(c)} />
                <text x={xOut + 10} y={(yC(outs.length, i) + 4).toFixed(1)} class="outward-cluster">
                  {niceTitle(c)}
                  <tspan class="outward-count">{`  ${v.argued} · ${v.named}`}</tspan>
                  <a href={link(`Cabinet-of-Digital-Terms/${c}/`)} class="outward-link">
                    <tspan class="outward-go"> ↗</tspan>
                  </a>
                </text>
              </g>
            ))}
          </svg>
          <p class="outward-tip" aria-live="polite">Point at a cluster or a term to see its lines; click to keep them highlighted, ↗ opens the cluster.</p>
          <p class="outward-key">
            <em class="line argued" /> argued in the text that points <em class="line named" /> only in its Related terms · numbers: argued · only listed
          </p>
        </div>
      </details>
    )
  }
  Outward.css = style
  Outward.afterDOMLoaded = script
  return Outward
}) satisfies QuartzComponentConstructor
