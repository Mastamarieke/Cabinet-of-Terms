import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import script from "./scripts/graph.inline"
import style from "./styles/graph.scss"
import { i18n } from "../i18n"
import { classNames } from "../util/lang"

export interface D3Config {
  drag: boolean
  zoom: boolean
  depth: number
  scale: number
  repelForce: number
  centerForce: number
  linkDistance: number
  fontSize: number
  opacityScale: number
  removeTags: string[]
  showTags: boolean
  focusOnHover?: boolean
  enableRadial?: boolean
}

interface GraphOptions {
  localGraph: Partial<D3Config> | undefined
  globalGraph: Partial<D3Config> | undefined
}

const defaultOptions: GraphOptions = {
  localGraph: {
    drag: true,
    zoom: true,
    depth: 1,
    scale: 1.1,
    repelForce: 0.5,
    centerForce: 0.3,
    linkDistance: 60,
    fontSize: 0.8,
    opacityScale: 1,
    showTags: true,
    removeTags: [],
    focusOnHover: false,
    enableRadial: false,
  },
  globalGraph: {
    drag: true,
    zoom: true,
    depth: -1,
    scale: 0.9,
    repelForce: 0.5,
    centerForce: 0.2,
    linkDistance: 30,
    fontSize: 0.8,
    opacityScale: 1,
    showTags: true,
    removeTags: [],
    focusOnHover: true,
    enableRadial: true,
  },
}

export default ((opts?: Partial<GraphOptions>) => {
  const Graph: QuartzComponent = ({ displayClass, cfg, fileData }: QuartzComponentProps) => {
    // One door, the same on every page, instead of an explanation under every graph.
    // One line naming what the visitor sees: the ring is the term's field, the block under it its landscape.
    const fm = fileData.frontmatter as Record<string, unknown> | undefined
    const term = typeof fm?.term === "string" ? (fm.term as string) : undefined
    // A cluster's About page sits directly under the vault folder; its graph shows the cluster's terms.
    const parts = (fileData.slug ?? "").split("/")
    const isClusterPage =
      parts[0] === "Cabinet-of-Digital-Terms" &&
      (parts.length === 2 || (parts.length === 3 && parts[2] === "index"))
    const cluster = isClusterPage && typeof fm?.title === "string" ? (fm.title as string) : undefined
    const subject = term ?? cluster
    const possessive = subject ? (subject.endsWith("s") ? `${subject}'` : `${subject}'s`) : ""
    const localGraph = { ...defaultOptions.localGraph, ...opts?.localGraph }
    const globalGraph = { ...defaultOptions.globalGraph, ...opts?.globalGraph }
    return (
      <div class={classNames(displayClass, "graph", subject ? "graph-card" : "")}>
        {subject ? (
          <h3 class="graph-title">
            <span class="graph-title-name">Semantic field</span>
            <span class="graph-title-rest">
              {" "}
              — the map of <strong>{possessive}</strong> {term ? "related terms" : "terms"} (the graph)
            </span>
          </h3>
        ) : (
          <h3>{i18n(cfg.locale).components.graph.title}</h3>
        )}
        <div class="graph-outer">
          <div class="graph-container" data-cfg={JSON.stringify(localGraph)}></div>
          <div class="graph-toggles">
            <details class="source-toggle" open>
              <summary>Sources</summary>
            </details>
            <details class="cluster-toggle">
              <summary>Cluster</summary>
            </details>
            <details class="backlinks-toggle" open>
              <summary>Backlinks</summary>
            </details>
          </div>
          <button class="expand-graph-icon" aria-label="Enlarge this graph">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="10.5" cy="10.5" r="6.5" />
              <line x1="15.5" y1="15.5" x2="21" y2="21" />
              <line x1="10.5" y1="7.5" x2="10.5" y2="13.5" />
              <line x1="7.5" y1="10.5" x2="13.5" y2="10.5" />
            </svg>
          </button>
          <button class="global-graph-icon" aria-label="Global Graph">
            <svg
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              xmlnsXlink="http://www.w3.org/1999/xlink"
              x="0px"
              y="0px"
              viewBox="0 0 55 55"
              fill="currentColor"
              xmlSpace="preserve"
            >
              <path
                d="M49,0c-3.309,0-6,2.691-6,6c0,1.035,0.263,2.009,0.726,2.86l-9.829,9.829C32.542,17.634,30.846,17,29,17
                s-3.542,0.634-4.898,1.688l-7.669-7.669C16.785,10.424,17,9.74,17,9c0-2.206-1.794-4-4-4S9,6.794,9,9s1.794,4,4,4
                c0.74,0,1.424-0.215,2.019-0.567l7.669,7.669C21.634,21.458,21,23.154,21,25s0.634,3.542,1.688,4.897L10.024,42.562
                C8.958,41.595,7.549,41,6,41c-3.309,0-6,2.691-6,6s2.691,6,6,6s6-2.691,6-6c0-1.035-0.263-2.009-0.726-2.86l12.829-12.829
                c1.106,0.86,2.44,1.436,3.898,1.619v10.16c-2.833,0.478-5,2.942-5,5.91c0,3.309,2.691,6,6,6s6-2.691,6-6c0-2.967-2.167-5.431-5-5.91
                v-10.16c1.458-0.183,2.792-0.759,3.898-1.619l7.669,7.669C41.215,39.576,41,40.26,41,41c0,2.206,1.794,4,4,4s4-1.794,4-4
                s-1.794-4-4-4c-0.74,0-1.424,0.215-2.019,0.567l-7.669-7.669C36.366,28.542,37,26.846,37,25s-0.634-3.542-1.688-4.897l9.665-9.665
                C46.042,11.405,47.451,12,49,12c3.309,0,6-2.691,6-6S52.309,0,49,0z M11,9c0-1.103,0.897-2,2-2s2,0.897,2,2s-0.897,2-2,2
                S11,10.103,11,9z M6,51c-2.206,0-4-1.794-4-4s1.794-4,4-4s4,1.794,4,4S8.206,51,6,51z M33,49c0,2.206-1.794,4-4,4s-4-1.794-4-4
                s1.794-4,4-4S33,46.794,33,49z M29,31c-3.309,0-6-2.691-6-6s2.691-6,6-6s6,2.691,6,6S32.309,31,29,31z M47,41c0,1.103-0.897,2-2,2
                s-2-0.897-2-2s0.897-2,2-2S47,39.897,47,41z M49,10c-2.206,0-4-1.794-4-4s1.794-4,4-4s4,1.794,4,4S51.206,10,49,10z"
              />
            </svg>
          </button>
        </div>
        <div class="expanded-graph-outer">
          <div class="expanded-graph-container" data-cfg={JSON.stringify(localGraph)}></div>
          <div class="graph-controls">
            <label>
              <span>Node spacing</span>
              <output data-control-value="spacing">1.00</output>
              <input type="range" min="0.5" max="3" step="0.05" value="1" data-control="spacing" />
            </label>
            <label>
              <span>Node size</span>
              <output data-control-value="nodeSize">1.00</output>
              <input type="range" min="0.5" max="3" step="0.05" value="1" data-control="nodeSize" />
            </label>
            <label>
              <span>Label size</span>
              <output data-control-value="labelSize">1.00</output>
              <input type="range" min="0.5" max="2" step="0.05" value="1" data-control="labelSize" />
            </label>
            <button type="button" class="graph-controls-reset">Reset</button>
          </div>
          <div class="graph-legend"></div>
          <div class="graph-overlay-actions">
            <button type="button" class="graph-shot" aria-label="Save this graph as an image">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
                <circle cx="12" cy="13" r="3.4" />
              </svg>
            </button>
            <button type="button" class="graph-close" aria-label="Close this graph">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
                stroke-linecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>
        <div class="global-graph-outer">
          <div class="global-graph-container" data-cfg={JSON.stringify(globalGraph)}></div>
        </div>
      </div>
    )
  }

  Graph.css = style
  Graph.afterDOMLoaded = script

  return Graph
}) satisfies QuartzComponentConstructor
