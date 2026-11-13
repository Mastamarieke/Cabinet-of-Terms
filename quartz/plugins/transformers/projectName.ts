import { QuartzTransformerPlugin } from "../types"

// Wording in the closing line of every entry, changed at build time (08-11 and 13-11-2026).
// The 261 entries and a few source files still carry the old words in their files. Changing
// those files would move the date at the top of every entry to the day of the change (the date
// comes from git), so the words are replaced here, and the files follow when each entry is
// revised.
//   - the project's name in English (Marieke, 08-11: "Digitale Alertheid moet niet. alles in
//     het engels"); addresses (digitale-alertheid.nl) are lower case with a hyphen, untouched
//   - the language model as a directed generator, not an assistant (decided 10-11 for the
//     articles, applied to the Cabinet 13-11), and a comma for the dash in that line
const REPLACE: [string, string][] = [
  ["Digitale Alertheid", "Digital Alertness"],
  ["Created with AI assistance (", "Created with a language model as directed generator ("],
  [" using cartographic prompting — a research method", " using cartographic prompting, a research method"],
]

export const ProjectName: QuartzTransformerPlugin = () => ({
  name: "ProjectName",
  textTransform(_ctx, src) {
    let text = src.toString()
    for (const [from, to] of REPLACE) {
      if (text.includes(from)) text = text.replaceAll(from, to)
    }
    return text
  },
})
