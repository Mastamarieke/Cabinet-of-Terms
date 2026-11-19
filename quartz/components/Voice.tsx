import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import script from "./scripts/voice.inline"
// @ts-ignore
import style from "./styles/voice.scss"

// The reading voice of an entry: a bar at the foot of the window that appears while
// something is being read (the definition, a moment of the curve, the landscape), with the
// voice to choose and a stop. The speaking itself is in voice.inline.ts; the buttons that
// start it sit where the text is (beside the quote, on the curve, on the landscape).
const Voice: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  const fm = fileData.frontmatter as Record<string, unknown>
  if (!fm?.term) return null
  const term = fm.term as string
  return (
    <div class="voice-bar" data-term={term} hidden>
      <button type="button" class="voice-stop" aria-label="Stop reading" title="Stop">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="1.5" />
        </svg>
      </button>
      <span class="voice-label">Reading</span>
      <span class="voice-now"></span>
      {/* man or woman (17-11-2026, Marieke): picks the best voice of that kind on this machine */}
      <span class="voice-who" role="group" aria-label="Woman or man">
        <button type="button" data-who="f" aria-pressed="false">
          Woman
        </button>
        <button type="button" data-who="m" aria-pressed="false">
          Man
        </button>
      </span>
      <label class="voice-choice">
        <span>Voice</span>
        <select class="voice-pick" aria-label="Choose a voice"></select>
      </label>
    </div>
  )
}

Voice.css = style
Voice.afterDOMLoaded = script

export default (() => Voice) satisfies QuartzComponentConstructor
