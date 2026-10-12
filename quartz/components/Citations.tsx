import { QuartzComponent, QuartzComponentConstructor } from "./types"
// @ts-ignore
import script from "./scripts/citations.inline"
// @ts-ignore
import style from "./styles/citations.scss"

// Sources as a mark (11-10, after De Correspondent): a citation in brackets in the running text,
// "(Eurostat, 2025)", becomes a small asterisk; tapping it shows the source under the paragraph.
// Links to other terms stay as links, so they are what stands out in the text. The markdown is
// unchanged (CLAUDE.md's citation rule and the checks still apply); only the page shows it so.
const Citations: QuartzComponent = () => null

Citations.css = style
Citations.afterDOMLoaded = script

export default (() => Citations) satisfies QuartzComponentConstructor
