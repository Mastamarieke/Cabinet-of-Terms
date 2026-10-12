import { QuartzComponent, QuartzComponentConstructor } from "./types"
// @ts-ignore
import script from "./scripts/relatedTerms.inline"
// @ts-ignore
import style from "./styles/relatedTerms.scss"

// Related terms with their reasons (10-10): the names stay on one line, the reason after each
// folds away and opens under the line when a name's small button is tapped; one button opens
// them all, one per line. Renders nothing itself: the line is made by links.ts (class rt-line),
// the script adds the buttons and the panel.
const RelatedTerms: QuartzComponent = () => null

RelatedTerms.css = style
RelatedTerms.afterDOMLoaded = script

export default (() => RelatedTerms) satisfies QuartzComponentConstructor
