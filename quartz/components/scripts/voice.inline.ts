// One voice for the whole page. The browser's own speech (speechSynthesis) reads what it is
// handed: the definition, the moments of the attention curve, the landscape. The voices are
// the ones the visitor's machine has; a small bar at the foot of the window shows what is
// being read, lets them pick another voice, and stops it. Nothing is recorded, nothing leaves
// the machine. The choice of voice is kept in localStorage.

// the shape of window.cabinetVoice is declared in index.d.ts / globals.d.ts
type SpeakOptions = NonNullable<Parameters<CabinetVoice["speak"]>[1]>
type SpeakResult = { cancelled: boolean }

const STORE = "cabinet-voice"
// British first (Marieke, 21-09: "een net Engels accent"), the better editions of a voice
// before the compact one, then the rest of the English-speaking world
const PREFERRED = [
  /Serena.*(Premium|Enhanced)/i,
  /Daniel.*(Premium|Enhanced)/i,
  /(Kate|Oliver|Jamie|Stephanie).*(Premium|Enhanced)/i,
  /Google UK English (Male|Female)/i,
  /Microsoft (Ryan|Sonia|Libby|Thomas)/i,
  /Serena/i,
  /Daniel/i,
  /Kate|Oliver|Jamie/i,
  /Moira|Karen|Tessa|Rishi/i,
  /Ava.*(Premium|Enhanced)|Zoe.*(Premium|Enhanced)|Samantha.*Enhanced/i,
  /Samantha/i,
]
// the machine's joke voices are English too; nobody wants a definition from Bad News
const NOVELTY =
  /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Wobble|Fred|Good News|Jester|Junior|Kathy|Organ|Superstar|Ralph|Trinoids|Whisper|Zarvox|Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley)\b/i

const supported = typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window

function voicesNow(): SpeechSynthesisVoice[] {
  if (!supported) return []
  return speechSynthesis.getVoices()
}

// Chrome hands over an empty list until "voiceschanged"; Safari has them at once.
function voicesReady(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const now = voicesNow()
    if (now.length > 0) return resolve(now)
    if (!supported) return resolve([])
    let done = false
    const finish = () => {
      if (done) return
      done = true
      speechSynthesis.removeEventListener("voiceschanged", finish)
      resolve(voicesNow())
    }
    speechSynthesis.addEventListener("voiceschanged", finish)
    setTimeout(finish, 1500)
  })
}

function englishVoices(all: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const en = all.filter((v) => v.lang.toLowerCase().startsWith("en") && !NOVELTY.test(v.name))
  // British first, then the machine's own voices (they keep speaking past fifteen seconds;
  // the networked ones in Chrome do not), then by name
  const gb = (v: SpeechSynthesisVoice) => Number(/en[-_]gb/i.test(v.lang))
  return en.sort((a, b) => gb(b) - gb(a) || Number(b.localService) - Number(a.localService) || a.name.localeCompare(b.name))
}

function chooseDefault(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  let saved: string | null = null
  try {
    saved = localStorage.getItem(STORE)
  } catch {}
  if (saved) {
    const hit = voices.find((v) => v.voiceURI === saved || v.name === saved)
    if (hit) return hit
  }
  for (const re of PREFERRED) {
    const hit = voices.find((v) => re.test(v.name))
    if (hit) return hit
  }
  return voices[0]
}

// The dash of the entries is a pause when read, not a word; the voices differ on it.
function forSpeech(text: string): string {
  return text
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/\*\*?/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

let current: SpeechSynthesisUtterance | null = null
let currentStop: (() => void) | null = null
let chosen: SpeechSynthesisVoice | undefined
let held = false
let lastCancel = 0

function bar(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".voice-bar")
}

function showBar(label: string) {
  const b = bar()
  if (!b) return
  const now = b.querySelector<HTMLElement>(".voice-now")
  if (now) now.textContent = label
  b.hidden = false
}

function hideBar() {
  const b = bar()
  if (b) b.hidden = true
}

function stop() {
  const s = currentStop
  currentStop = null
  current = null
  held = false
  if (supported) speechSynthesis.cancel()
  lastCancel = performance.now()
  s?.()
  hideBar()
  document.dispatchEvent(new CustomEvent<{}>("voice-stop"))
}

function hold(label: string) {
  held = true
  showBar(label)
}

function release() {
  held = false
  if (!current) hideBar()
}

function speak(text: string, opts: SpeakOptions = {}): Promise<SpeakResult> {
  // no engine, or an engine without a single voice (headless, some Linux builds): nothing to
  // say, so say it is said, and the curve can play on in silence
  if (!supported || voicesNow().length === 0) return Promise.resolve({ cancelled: false })
  // one at a time: a new request ends the previous one without ringing its stop
  if (current) {
    const s = currentStop
    currentStop = null
    current = null
    speechSynthesis.cancel()
    lastCancel = performance.now()
    s?.()
  }
  const cutIn = performance.now() - lastCancel < 250
  const u = new SpeechSynthesisUtterance(forSpeech(text))
  if (chosen) u.voice = chosen
  u.lang = opts.lang ?? chosen?.lang ?? "en-GB"
  u.rate = opts.rate ?? 0.95
  u.pitch = 1
  current = u
  return new Promise((resolve) => {
    let settled = false
    const finish = (cancelled: boolean) => {
      if (settled) return
      settled = true
      if (current === u) {
        current = null
        currentStop = null
        if (!held) hideBar()
      }
      resolve({ cancelled })
    }
    currentStop = () => finish(true)
    u.onstart = () => {
      showBar(opts.label ?? "")
      opts.onStart?.()
    }
    u.onboundary = (e) => {
      if (opts.onBoundary && (e.name === "word" || e.name === "sentence" || !e.name)) opts.onBoundary(e.charIndex)
    }
    u.onend = () => finish(false)
    u.onerror = (e) => finish(e.error === "interrupted" || e.error === "canceled")
    showBar(opts.label ?? "")
    // Chrome drops an utterance that follows a cancel too closely: give it a moment. And an
    // engine that stalls would otherwise hold the page forever: past the time the text could
    // possibly take, give up on it.
    setTimeout(() => {
      if (settled || current !== u) return
      const guard = setTimeout(() => {
        if (!settled) {
          speechSynthesis.cancel()
          finish(false)
        }
      }, 4000 + u.text.length * 120)
      u.addEventListener("end", () => clearTimeout(guard))
      u.addEventListener("error", () => clearTimeout(guard))
      speechSynthesis.resume()
      speechSynthesis.speak(u)
    }, cutIn ? 180 : 0)
  })
}

window.cabinetVoice = {
  supported,
  speak,
  stop,
  speaking: () => current !== null,
  hold,
  release,
}

async function fillPicker(select: HTMLSelectElement) {
  const voices = englishVoices(await voicesReady())
  select.replaceChildren()
  if (voices.length === 0) {
    const o = document.createElement("option")
    o.textContent = "no English voice on this machine"
    select.appendChild(o)
    select.disabled = true
    return
  }
  chosen = chooseDefault(voices)
  for (const v of voices) {
    const o = document.createElement("option")
    o.value = v.voiceURI
    o.textContent = `${v.name.replace(/\s*\(.*?\)\s*/g, " ").trim()} · ${v.lang}`
    if (chosen && v.voiceURI === chosen.voiceURI) o.selected = true
    select.appendChild(o)
  }
  select.disabled = false
}

// The definition is the first quote of the entry. A small speaker beside it reads it, with
// the term in front, so that the listener knows what is being defined.
function wireDefinition(term: string) {
  const quotes = [...document.querySelectorAll<HTMLElement>("blockquote")].filter((q) => q.offsetParent !== null)
  const quote = quotes[0]
  if (!quote || quote.querySelector(".voice-def")) return
  const btn = document.createElement("button")
  btn.type = "button"
  btn.className = "voice-def"
  btn.title = "Read the definition aloud"
  btn.setAttribute("aria-label", "Read the definition aloud")
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6"/><path d="M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>'
  const handler = () => {
    if (window.cabinetVoice.speaking() && quote.classList.contains("is-spoken")) {
      window.cabinetVoice.stop()
      return
    }
    const text = quote.textContent ?? ""
    quote.classList.add("is-spoken")
    void window.cabinetVoice
      .speak(`${term}. ${text}`, { label: `Definition of ${term}` })
      .then(() => quote.classList.remove("is-spoken"))
  }
  btn.addEventListener("click", handler)
  quote.classList.add("has-voice")
  quote.appendChild(btn)
  window.addCleanup(() => {
    btn.removeEventListener("click", handler)
    btn.remove()
    quote.classList.remove("has-voice", "is-spoken")
  })
}

document.addEventListener("nav", () => {
  const b = bar()
  if (!b) return
  b.hidden = true
  const term = b.dataset.term ?? ""
  const select = b.querySelector<HTMLSelectElement>(".voice-pick")
  const stopBtn = b.querySelector<HTMLButtonElement>(".voice-stop")
  if (select) {
    void fillPicker(select)
    const onPick = () => {
      chosen = voicesNow().find((v) => v.voiceURI === select.value) ?? chosen
      try {
        if (chosen) localStorage.setItem(STORE, chosen.voiceURI)
      } catch {}
      // a new voice mid-sentence: stop, the listener presses play again
      if (window.cabinetVoice.speaking()) stop()
    }
    select.addEventListener("change", onPick)
    window.addCleanup(() => select.removeEventListener("change", onPick))
  }
  if (stopBtn) {
    stopBtn.addEventListener("click", stop)
    window.addCleanup(() => stopBtn.removeEventListener("click", stop))
  }
  if (term) wireDefinition(term)
  window.addCleanup(() => stop())
})
