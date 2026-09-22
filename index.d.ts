declare module "*.scss" {
  const content: string
  export = content
}

// dom custom event
interface CustomEventMap {
  prenav: CustomEvent<{}>
  nav: CustomEvent<{ url: FullSlug }>
  themechange: CustomEvent<{ theme: "light" | "dark" }>
  readermodechange: CustomEvent<{ mode: "on" | "off" }>
  // the reading voice (voice.inline.ts): the bar's stop, and the term the landscape is speaking
  "voice-stop": CustomEvent<{}>
  "graph-speak": CustomEvent<{ id: string | null }>
}

// the reading voice of an entry, set up by voice.inline.ts
interface CabinetVoice {
  supported: boolean
  speak: (
    text: string,
    opts?: {
      label?: string
      lang?: string
      rate?: number
      onStart?: () => void
      onBoundary?: (charIndex: number) => void
    },
  ) => Promise<{ cancelled: boolean }>
  stop: () => void
  speaking: () => boolean
  hold: (label: string) => void
  release: () => void
}

type ContentIndex = Record<FullSlug, ContentDetails>
declare const fetchData: Promise<ContentIndex>
