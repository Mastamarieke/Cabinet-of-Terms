import { QuartzTransformerPlugin } from "../types"

// The project's name in English on the site (08-11-2026, Marieke: "Digitale Alertheid moet niet.
// alles in het engels"). The site pages were changed in their files; the 261 entries and five
// source files still carry the Dutch name in their closing line. Changing those files would move
// the date at the top of every entry to the day of the change (the date comes from git), so the
// name is translated here, at build time, and the files follow when each entry is revised.
// Addresses (digitale-alertheid.nl) are written in lower case with a hyphen and are not touched.
export const ProjectName: QuartzTransformerPlugin = () => ({
  name: "ProjectName",
  textTransform(_ctx, src) {
    const text = src.toString()
    return text.includes("Digitale Alertheid") ? text.replaceAll("Digitale Alertheid", "Digital Alertness") : text
  },
})
