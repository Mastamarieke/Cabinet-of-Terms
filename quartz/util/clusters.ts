// The colour and the icon of each cluster, in one list (15-11-2026). The icons are those on the
// front of the D.Alert game cards (Dr-Alert-Game-iconen, the filled version), in
// quartz/static/cluster-icons; the game took its colours from this palette. Used by the menu on
// the left (explorer.inline.ts, colour only: icons there were too much, Marieke 15-11) and the
// preview (popover.inline.ts, colour and icon). The graph and the Outward
// block still keep their own copy of the colours; keep them in step.

const VAULT = "Cabinet-of-Digital-Terms"

// [part of the cluster's folder name, colour, icon file]
const CLUSTERS: [string, string, string][] = [
  ["Platform-Mechanisms", "#D94A4A", "platform-mechanisms-economics"],
  ["AI-Specific", "#0E9272", "ai-specific-terms"],
  ["AI-and-Energy", "#3F51B5", "ai-and-energy"],
  ["Gender", "#C56A1A", "gender-identity"],
  ["Parents", "#B88900", "parents-children"],
  ["Relationships", "#168AAD", "behaviour-relationships"],
  ["Beauty", "#C653A0", "beauty-influencers-self-image"],
  ["Counter-Movements", "#9B3A6D", "counter-movements"],
  ["Design-Philosophy", "#6A8F1F", "design-philosophy-and-ethical-design"],
  ["SF-as-Ideology", "#0097A7", "sf-as-ideology"],
  ["Culture-Wars", "#C44536", "culture-wars-and-political-language"],
  ["Society-and-Power", "#228B4E", "society-and-power"],
  ["Privacy", "#2F80C0", "privacy-data-and-control"],
  ["Inclusion", "#607D8B", "inclusion-accessibility-and-ageing"],
  ["Manifestos", "#7B3FA1", "manifestos"],
  ["Statements-as", "#455A64", "statements-as-analytical-object"],
  ["End-Times", "#C62828", "end-times-thinking-and-elite-survivalism"],
  ["New-Digital-Professions", "#1976D2", "new-digital-professions"],
  ["Subcultural", "#B83280", "subcultural-vocabulary-and-platform-language"],
  ["Consequences", "#00897B", "consequences-of-digital-behaviour"],
]

export interface ClusterStyle {
  color: string
  /** path from the site root, e.g. static/cluster-icons/gender-identity.svg */
  icon: string
  /** true when the path is the cluster itself, not a term or folder inside it */
  isCluster: boolean
}

/** The cluster a slug or URL path belongs to, read from the folder right under the vault. */
export function clusterOf(path: string): ClusterStyle | null {
  let decoded = path
  try {
    decoded = decodeURIComponent(path)
  } catch {}
  const parts = decoded.split(/[?#]/)[0].split("/").filter((p) => p && p !== "index")
  const i = parts.indexOf(VAULT)
  const folder = i >= 0 ? parts[i + 1] : undefined
  if (!folder) return null
  const hit = CLUSTERS.find(([key]) => folder.includes(key))
  if (!hit) return null
  return { color: hit[1], icon: `static/cluster-icons/${hit[2]}.svg`, isCluster: parts.length === i + 2 }
}

/** A small icon in the colour of the text around it (CSS mask, see .cluster-icon). */
export function clusterIcon(src: string): HTMLSpanElement {
  const span = document.createElement("span")
  span.className = "cluster-icon"
  span.setAttribute("aria-hidden", "true")
  span.style.setProperty("-webkit-mask-image", `url("${src}")`)
  span.style.setProperty("mask-image", `url("${src}")`)
  return span
}
