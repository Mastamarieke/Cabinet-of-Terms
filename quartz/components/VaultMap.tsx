import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import script from "./scripts/vaultMap.inline"
import style from "./styles/vaultMap.scss"

// The front door and the folder pages show the map in the page. On an entry it is built but
// folded away, waiting behind the button that used to open the old global graph — there the
// entry's own graph is the right picture and a second one would compete with it.
// The map belongs on the pages that are about the whole vault: the folder root and the tag
// pages. Everything else that reaches the list layout — a cluster's About page, a term that
// lives in its own folder with Sources/, a Sources/ overview — is about one thing and keeps
// its own graph. Testing for "whole vault" rather than for "cluster" is what makes this hold
// for folder entries too, which the earlier cluster test missed.
export const isWholeVaultPage = (slug: string) => {
  const s = slug.replace(/\/index$/, "")
  return s === "Cabinet-of-Digital-Terms" || s === "tags" || s.startsWith("tags/")
}

export default ((opts?: { showPanel?: boolean }) => {
const VaultMap: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  // A cluster's About page uses the same list layout as the folder root, but it is about one
  // cluster and keeps its own graph; the map opens only on pages that are about the whole.
  const open = (opts?.showPanel && isWholeVaultPage(fileData.slug ?? "")) || fileData.slug === "index"
  return (
    <div class={open ? "vault-map-outer" : "vault-map-outer folded"} id="vault-map">
      <h3 class="vault-map-title">
        <span class="vault-map-title-name">Semantic field</span>
        <span class="vault-map-title-rest">
          {" "}
          — the map of the <strong>Cabinet of Digital Terms</strong>: twenty clusters, every link
          between them
        </span>
      </h3>
      <div class="vault-map-inner"></div>
      <p class="vault-map-foot">Point at a circle to see its reach · enlarge to read the names</p>
      <button class="vault-map-expand" aria-label="Enlarge this map">
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
      <div class="vault-map-overlay">
        <div class="vault-map-stage"></div>
        <div class="vault-map-controls">
          <label>
            <span>Cluster spacing</span>
            <output data-control-value="spacing">1.00</output>
            <input type="range" min="0.6" max="1.7" step="0.02" value="1" data-control="spacing" />
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
          <button type="button" class="vault-map-controls-reset">Reset</button>
        </div>
        <div class="vault-map-actions">
          <button type="button" class="vault-map-shot" aria-label="Save this map as an image">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
              <circle cx="12" cy="13" r="3.4" />
            </svg>
          </button>
          <button type="button" class="vault-map-reset" aria-label="Fit the map to the screen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </svg>
          </button>
          <button type="button" class="vault-map-close" aria-label="Close this map">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
              stroke-linecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <p class="vault-map-hint">Scroll to zoom · drag to move · click a term to open it</p>
      </div>
    </div>
  )
}

VaultMap.css = style
VaultMap.afterDOMLoaded = script

return VaultMap
}) satisfies QuartzComponentConstructor
