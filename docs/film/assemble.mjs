// Serves the frames and an assembler page; Chrome plays the frames on a canvas at their film
// times and records the canvas with MediaRecorder; the result is posted back and written.
import http from "http"; import fs from "fs"; import path from "path"
const DIR = path.dirname(new URL(import.meta.url).pathname)
const OUTFILE = process.argv[2] || path.join(DIR, "cabinet-tour.mp4")
const PAGE = `<!doctype html><canvas id=c width=1920 height=1080></canvas><script>
(async () => {
  const tl = await (await fetch("/frames/timeline.json")).json()
  const F = tl.frames, total = tl.total
  const types = ["video/mp4;codecs=avc1.640028", "video/mp4;codecs=avc1.42E01F", "video/mp4", "video/webm;codecs=vp9"]
  const mime = types.find((t) => MediaRecorder.isTypeSupported(t))
  document.title = "mime:" + mime
  const c = document.getElementById("c"), g = c.getContext("2d")
  const cache = new Map()
  const load = (i) => { if (i >= F.length || cache.has(i)) return; cache.set(i, fetch("/frames/" + F[i].f).then((r) => r.blob()).then(createImageBitmap)) }
  for (let i = 0; i < 40; i++) load(i)
  g.drawImage(await cache.get(0), 0, 0, 1920, 1080)
  const rec = new MediaRecorder(c.captureStream(30), { mimeType: mime, videoBitsPerSecond: 9000000 })
  const parts = []; rec.ondataavailable = (e) => parts.push(e.data)
  rec.onstop = async () => { const b = new Blob(parts, { type: mime }); await fetch("/done?type=" + encodeURIComponent(mime), { method: "POST", body: b }); document.title = "done" }
  rec.start(1000)
  const t0 = performance.now(); let i = 0, shown = -1
  const tick = async () => {
    const T = (performance.now() - t0) / 1000
    while (i + 1 < F.length && F[i + 1].T <= T) i++
    if (i !== shown) {
      for (let k = i; k < i + 40; k++) load(k)
      try { const bmp = await cache.get(i); g.drawImage(bmp, 0, 0, 1920, 1080) } catch (e) {}
      for (const k of [...cache.keys()]) if (k < i) { cache.get(k).then((b) => b.close && b.close()).catch(() => {}); cache.delete(k) }
      shown = i
      document.title = "T=" + T.toFixed(1) + " i=" + i
    }
    if (T < total + 1.0) setTimeout(tick, 8); else rec.stop()
  }
  tick()
})()
</script>`
const srv = http.createServer((req, res) => {
  if (req.url === "/") { res.writeHead(200, { "content-type": "text/html" }); return res.end(PAGE) }
  if (req.url.startsWith("/frames/")) { const f = path.join(DIR, req.url); if (fs.existsSync(f)) { res.writeHead(200); return fs.createReadStream(f).pipe(res) } res.writeHead(404); return res.end() }
  if (req.url.startsWith("/done")) { const chunks = []; req.on("data", (d) => chunks.push(d)); req.on("end", () => { fs.writeFileSync(OUTFILE, Buffer.concat(chunks)); console.log("written", OUTFILE, decodeURIComponent(req.url.split("type=")[1]), Buffer.concat(chunks).length); res.end("ok"); setTimeout(() => process.exit(0), 300) }); return }
  res.writeHead(404); res.end()
})
srv.listen(9400, async () => {
  const t = await (await fetch("http://127.0.0.1:9335/json/new?" + encodeURIComponent("http://127.0.0.1:9400/"), { method: "PUT" })).json()
  console.log("assembling in tab", t.id)
})
