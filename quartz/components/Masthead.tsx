import { QuartzComponent, QuartzComponentConstructor } from "./types"
// @ts-ignore
import script from "./scripts/masthead.inline"

// The masthead (07-11-2026, Marieke): a red band with the name of the Cabinet on every page,
// always in view, so a reader who lands on an entry knows where they are; the name is the way
// home. Under it the title of the page, centred over the text column, with its cluster above;
// on a phone the title row shrinks to one line when you scroll. Built by the script, because
// it has to read where the columns are; the styles are in custom.scss ("Masthead").
// The same script turns the cluster cards on the front page (Browse by cluster).
const Masthead: QuartzComponent = () => null

Masthead.afterDOMLoaded = script

export default (() => Masthead) satisfies QuartzComponentConstructor
