import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative, FullSlug } from "../util/path"

// The pages about the Cabinet, under one folded heading below the Explorer (08-11-2026,
// Marieke: option 2). They used to stand loose under the clusters, as if left there by
// accident; the Explorer now leaves them out (filterFn in quartz.layout.ts) and lists them here.
const PAGES: [string, string][] = [
  ["how-it-is-made", "How it is made"],
  ["how-an-entry-grows", "How an entry grows"],
  ["Reading-the-graph", "Reading the graph"],
  ["Disclaimer-of-the-Cabinet-of-Digital-Terms", "Disclaimer"],
]

const AboutPages: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  const here = fileData.slug ?? ""
  const open = PAGES.some(([slug]) => here === slug)
  return (
    <details class={`about-pages ${displayClass ?? ""}`} open={open}>
      <summary>
        {/* the same chevron as the folders in the Explorer (All Clusters) */}
        <svg class="about-icon" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="5 8 14 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
        <span>About the Cabinet</span>
      </summary>
      <ul>
        {PAGES.map(([slug, title]) => (
          <li>
            <a href={resolveRelative(here as FullSlug, slug as FullSlug)} class={here === slug ? "active" : ""}>
              {title}
            </a>
          </li>
        ))}
      </ul>
    </details>
  )
}

AboutPages.css = `
.about-pages { margin: 0.4rem 0 0; }
.about-pages summary { display: flex; align-items: center; cursor: pointer; list-style: none; user-select: none; }
.about-pages summary::-webkit-details-marker { display: none; }
.about-pages .about-icon { margin-right: 5px; color: var(--secondary); transform: rotate(-90deg); transition: transform 0.3s ease; flex-shrink: 0; }
.about-pages[open] .about-icon { transform: none; }
.about-pages summary span { font-family: var(--headerFont); font-size: 0.95rem; font-weight: 600; line-height: 1.2; padding: 0.2rem 0; color: var(--secondary); }
.about-pages summary:hover span, .about-pages summary:hover .about-icon { color: var(--tertiary); }
.about-pages ul { list-style: none; margin: 0.2rem 0 0 17px; padding: 0; }
.about-pages li { position: relative; margin: 0.25rem 0; padding-left: 0.85rem; line-height: 1.3; }
/* bullets as in the table of contents: a small grey square, red for the page you are on */
.about-pages li::before { content: ""; position: absolute; left: 0; top: 0.5em; width: 0.32rem; height: 0.32rem; background: var(--gray); }
.about-pages li:has(a.active)::before { background: var(--han-red); }
.about-pages a { font-size: 0.95rem; color: var(--darkgray) !important; background: none !important; text-decoration: none; }
.about-pages a:hover, .about-pages a.active { color: var(--han-red) !important; }
`

export default (() => AboutPages) satisfies QuartzComponentConstructor
