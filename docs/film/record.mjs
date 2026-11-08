// Records a guided tour of the Cabinet (local devserver) as JPEG frames with timestamps.
// A visible cursor and English captions are drawn into the page itself, so they are in the
// frames. Run with Chrome already listening on port 9335.
import fs from "fs"
const OUT = new URL("./frames/", import.meta.url).pathname
const BASE = "http://localhost:8080/"
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true })

const target = await (await fetch("http://127.0.0.1:9335/json/new?about:blank", { method: "PUT" })).json()
const ws = new WebSocket(target.webSocketDebuggerUrl)
let id = 0; const pend = new Map(); const meta = []
ws.onmessage = (m) => {
  const d = JSON.parse(m.data)
  if (d.id && pend.has(d.id)) { pend.get(d.id)(d.result ?? d.error); pend.delete(d.id) }
  if (d.method === "Page.screencastFrame") {
    const n = String(meta.length).padStart(5, "0")
    fs.writeFileSync(OUT + n + ".jpg", Buffer.from(d.params.data, "base64"))
    meta.push({ f: n + ".jpg", t: d.params.metadata.timestamp })
    send("Page.screencastFrameAck", { sessionId: d.params.sessionId })
  }
}
await new Promise((r) => (ws.onopen = r))
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }))?.result?.value
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const sleep = wait
const segs = []
async function seg(want, fn) { const s = Date.now() / 1000; await fn(); segs.push({ s, e: Date.now() / 1000, want: want / 1000 }) }

// overlay: caption bar and cursor, on <html> so a page change inside the site keeps them
const OVERLAY = `(() => {
  if (window.__tour) return
  window.__tour = true
  const install = () => {
    if (document.getElementById("tour-cap")) return
    const st = document.createElement("style")
    st.textContent = \`#tour-cap{position:fixed;left:50%;bottom:34px;transform:translateX(-50%);max-width:74%;padding:12px 22px;background:rgba(11,11,13,.86);color:#f7f7f2;font:500 21px/1.35 -apple-system,"Helvetica Neue",Arial,sans-serif;border-radius:6px;z-index:2147483646;opacity:0;transition:opacity .45s;text-align:center;pointer-events:none;border-left:4px solid #e50056}
    #tour-cap.on{opacity:1}
    #tour-cur{position:fixed;left:0;top:0;width:22px;height:22px;z-index:2147483647;pointer-events:none;transform:translate(-3px,-2px)}
    #tour-cur.down svg{transform:scale(.86)}
    #tour-end{position:fixed;inset:0;background:#0b0b0d;color:#f7f7f2;display:grid;place-content:center;gap:14px;text-align:center;z-index:2147483645;font:400 22px/1.4 -apple-system,"Helvetica Neue",Arial,sans-serif;opacity:0;transition:opacity .8s}
    #tour-end.on{opacity:1} .popover{display:none!important} #tour-end b{font-size:46px;color:#e50056;font-weight:700} #tour-end small{color:#bdbdb8;font-size:17px}\`
    document.documentElement.appendChild(st)
    const cap = document.createElement("div"); cap.id = "tour-cap"; document.documentElement.appendChild(cap)
    const cur = document.createElement("div"); cur.id = "tour-cur"
    cur.innerHTML = '<svg viewBox="0 0 22 22" width="22" height="22"><path d="M2 1 L2 18 L6.5 14 L9.5 20.5 L12.5 19 L9.6 12.8 L15.5 12.8 Z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>'
    document.documentElement.appendChild(cur)
    document.addEventListener("mousemove", (e) => { cur.style.left = e.clientX + "px"; cur.style.top = e.clientY + "px" }, true)
    document.addEventListener("mousedown", () => cur.classList.add("down"), true)
    document.addEventListener("mouseup", () => cur.classList.remove("down"), true)
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install); else install()
  window.__cap = (t) => { const c = document.getElementById("tour-cap"); if (!c) return; if (!t) { c.classList.remove("on"); return } c.classList.remove("on"); setTimeout(() => { c.textContent = t; c.classList.add("on") }, 250) }
})()`

await send("Page.enable")
await send("Runtime.enable")
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1.5, mobile: false })
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] })
await send("Page.addScriptToEvaluateOnNewDocument", { source: OVERLAY })

let mx = 640, my = 400
const point = async (x, y, type = "mouseMoved") => send("Input.dispatchMouseEvent", { type, x, y, button: type === "mouseMoved" ? "none" : "left", clickCount: 1 })
async function move(x, y, ms = 900) {
  await seg(ms, async () => {
    const sx = mx, sy = my, steps = Math.max(12, Math.round(ms / 40))
    for (let i = 1; i <= steps; i++) {
      const k = i / steps, e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
      await point(sx + (x - sx) * e, sy + (y - sy) * e); await sleep(10)
    }
  })
  mx = x; my = y
}
async function click() { await seg(300, async () => { await point(mx, my, "mousePressed"); await sleep(90); await point(mx, my, "mouseReleased"); await sleep(120) }) }
async function hold(ms) { await seg(ms, () => wait(ms)) }
async function where(js) {
  return ev(`(() => { const e = (${js}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, top: r.top, h: r.height } })()`)
}
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2)
async function scrollBy(dy, ms) {
  await seg(ms, async () => {
    const steps = Math.max(12, Math.round(ms / 40))
    for (let i = 1; i <= steps; i++) { await ev(`window.scrollBy(0, ${(dy * (ease(i / steps) - ease((i - 1) / steps))).toFixed(2)})`); await sleep(10) }
  })
}
async function scrollTo(js, offset = 90, ms = 1400) { const r = await where(js); if (!r) return; await scrollBy(r.top - offset, ms) }
const cap = async (t) => { await ev(`window.__cap && window.__cap(${JSON.stringify(t)})`) }
const read = (t) => 1900 + t.length * 52   // time to read a caption
async function say(t) { await cap(t); await hold(read(t)) }
const byText = (sel, text) => `[...document.querySelectorAll(${JSON.stringify(sel)})].find((e) => e.textContent.trim().startsWith(${JSON.stringify(text)}))`
async function go(url) { await seg(900, async () => { await send("Page.navigate", { url }); await sleep(4500); await ev(OVERLAY); await point(mx, my) }) }

// ---------------- the tour ----------------
await go(BASE)
await send("Page.startScreencast", { format: "jpeg", quality: 82, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 })
await hold(800)
await say("The Cabinet of Digital Terms maps the words that shape digital culture.")

let r = await where(`document.querySelector(".ticker")`)
if (r) { await move(r.x + 120, r.y, 1100); await say("The news band shows what changed. Rest your pointer on it and it stops.") }

r = await where(`document.querySelector("#vault-map canvas, .vault-map-outer canvas, .vault-map-outer svg")`)
if (r) {
  await move(r.x - 150, r.y - 60, 1200)
  await cap("Each circle on the map is a cluster of terms. Point at one to see what it reaches.")
  await move(r.x - 120, r.y + 40, 1600); await hold(1200)
  await move(r.x + 140, r.y - 90, 1800); await hold(2200)
}

r = await where(byText(".explorer .folder-title, .explorer a", "Gender & Identity"))
await cap("Pick a cluster in the sidebar, then a term.")
if (r) { await move(r.x, r.y, 1300); await hold(300); await click(); await hold(2600) }
r = await where(byText(".explorer .folder-title, .explorer a", "Hypergamy"))
if (r) { await move(r.x, r.y, 1000); await hold(300); await click(); await hold(3200) }
if (!(await ev("location.pathname")).includes("Hypergamy")) await go(BASE + "Cabinet-of-Digital-Terms/Gender--and--Identity/Hypergamy/")
await ev(OVERLAY)

await scrollTo(`document.querySelector(".graph-outer")`, 70, 1200)
r = await where(`document.querySelector(".graph-outer")`)
if (r) { await move(r.x + 60, r.y, 1200) }
await say("Every term has a graph: the term in the middle, its neighbours on a ring, grouped by cluster. Books are its sources.")
await scrollTo(`document.querySelector("details.graph-story:not(.attention) > summary")`, 120, 1000)
r = await where(`document.querySelector("details.graph-story:not(.attention) > summary")`)
if (r) {
  await move(r.x - 180, r.y, 1000); await click(); await hold(600)
  await move(1230, 300, 700)
  await say("The semantic landscape tells how the word travels. Every name in red is a link to another term.")
  await scrollBy(200, 1400); await hold(1200)
}

r = await where(`document.querySelector("details.attention > summary")`)
if (r) {
  await move(r.x - 100, r.y, 1000); await click(); await hold(600)
  await scrollTo(`document.querySelector("details.attention")`, 60, 1200)
  await say("The attention curve shows when the word drew attention: Wikipedia, research and Google searches, month by month.")
  const s = await ev(`(() => { const e = document.querySelector("details.attention .attention-svg"); const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })()`)
  if (s) {
    await move(s.x + s.w * 0.08, s.y + s.h * 0.55, 900)
    await cap("Point at a month to read the figures.")
    await move(s.x + s.w * 0.52, s.y + s.h * 0.55, 3200); await hold(800)
  }
  r = await where(`[...document.querySelectorAll("details.attention .attention-moment")].pop()`)
  if (r) { await move(r.x, r.y, 1100); await hold(300); await click() }
  await say("Numbered moments explain the peaks. In June 2026 it was a TikTok meme.")
  r = await where(`document.querySelector("details.attention .attention-loupe")`)
  if (r) {
    await move(r.x, r.y, 900); await click(); await cap("Enlarged, each source gets its own line."); await hold(4600)
    r = await where(`document.querySelector(".attention-overlay.active .attention-overlay-close")`)
    if (r) { await move(r.x, r.y, 900); await click() }
    await hold(700)
  }
}

r = await where(byText("article p", "Literal meaning"))
if (r) {
  await scrollTo(byText("article p", "Literal meaning"), 140, 1500)
  await move(820, 360, 900)
  await say("Below the panels, the entry itself: what the word says, where it comes from, why it appeals, and where it rubs.")
  await scrollBy(420, 3800); await hold(900)
}
r = await where(byText("article p", "Read more"))
if (r) {
  await scrollTo(byText("article p", "Read more"), 160, 1600)
  await say("Read more lists the sources. Each one has its own page.")
  r = await where(`(() => { const p = ${byText("article p", "Read more")}; let n = p; for (let i = 0; i < 6 && n; i++) { n = n.nextElementSibling; const a = n && n.querySelector("a.internal"); if (a) return a } return null })()`)
  if (r) { await move(r.x, r.y, 1000); await hold(300); await click(); await hold(3600) }
}

await go(BASE)
r = await where(`document.querySelector(".ticker .ticker-track")`)
if (r) {
  await move(r.x - 60, r.y, 1200); await hold(900)
  await cap("A line in the news band takes you straight to the part it is about.")
  const item = await ev(`(() => { const t = document.querySelector(".ticker .ticker-track").getBoundingClientRect(); const it = [...document.querySelectorAll(".ticker-item")].find((a) => { const r = a.getBoundingClientRect(); return r.right > t.left + 80 && r.left < t.right - 60 && !a.classList.contains("ticker-all") }); if (!it) return null; const r = it.getBoundingClientRect(); return { x: Math.max(r.left, t.left) + 60, y: r.top + r.height / 2 } })()`)
  if (item) { await move(item.x, item.y, 900); await hold(1200); await click(); await hold(5200) }
}

await ev(`(() => { for (const id of ["tour-cap", "tour-cur"]) { const x = document.getElementById(id); if (x) x.style.display = "none" } const e = document.createElement("div"); e.id = "tour-end"; e.innerHTML = "<b>Cabinet of Digital Terms</b><div>mastamarieke.github.io/Cabinet-of-Terms</div><small>Project Digitale Alertheid · HAN University of Applied Sciences</small>"; document.documentElement.appendChild(e); requestAnimationFrame(() => e.classList.add("on")) })()`)
await hold(4500)
await send("Page.stopScreencast")
await hold(500)
fs.writeFileSync(OUT + "meta.json", JSON.stringify(meta))
fs.writeFileSync(OUT + "segs.json", JSON.stringify(segs))
console.log("film seconds:", segs.reduce((a, b) => a + b.want, 0).toFixed(1))
console.log("frames:", meta.length, "seconds:", ((meta.at(-1).t - meta[0].t)).toFixed(1))
process.exit(0)
