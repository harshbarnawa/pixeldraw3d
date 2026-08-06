// Reproduce the Razorpay subscription checkout the app opens, capture console
// errors + the modal's rendered content so we can see why payment won't proceed.
const { chromium } = require("playwright")

const KEY = "rzp_live_TM8z4vmBPfmltO"
const SUB_ID = process.env.SUB_ID || "sub_TMVDnb6MZJdHXq" // today's pro-monthly sub

;(async () => {
  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

  const logs = []
  page.on("console", (m) => logs.push(`[console.${m.type()}] ${m.text()}`))
  page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`))
  page.on("requestfailed", (r) => logs.push(`[reqfail] ${r.url()} -> ${r.failure()?.errorText}`))

  const html = `<!doctype html><html><head><meta charset="utf-8">
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script></head>
    <body><h1>Razorpay repro</h1>
    <button id="open">open checkout</button>
    <pre id="out" style="white-space:pre-wrap"></pre>
    <script>
    const out = (s) => { document.getElementById('out').textContent += s + '\\n' }
    document.getElementById('open').addEventListener('click', () => {
      window.rzp = new Razorpay({
        key: ${JSON.stringify(KEY)},
        subscription_id: ${JSON.stringify(SUB_ID)},
        name: "PixelDraw3D",
        description: "PRO · monthly",
        prefill: { name: "Test", email: "test@test.com" },
        theme: { color: "#8b7cf6" },
        handler: (resp) => out("HANDLER: " + JSON.stringify(resp)),
        modal: { ondismiss: () => out("MODAL DISMISSED") },
      })
      rzp.on("payment.failed", (r) => out("PAYMENT.FAILED: " + JSON.stringify(r?.error || r)))
      try { rzp.open(); out("rzp.open() returned without throwing") }
      catch (e) { out("rzp.open() THREW: " + e.message) }
    })
    </script></body></html>`

  await page.setContent(html)
  // Let checkout.js load
  await page.waitForFunction(() => window.Razorpay !== undefined, null, { timeout: 20000 })
  await page.click("#open")
  await page.waitForTimeout(6000)

  // Grab what's in the modal now
  const state = await page.evaluate(() => {
    const frames = []
    for (const f of document.querySelectorAll("iframe")) {
      frames.push({ src: f.src && f.src.slice(0, 200), w: f.offsetWidth, h: f.offsetHeight })
    }
    return {
      razorpayGlobal: typeof window.Razorpay,
      openReturned: document.getElementById("out").textContent,
      frames,
      hasModal: !!document.querySelector(".razorpay-container, .razorpay-backdrop, .razorpay-modal"),
      modalText: (document.querySelector(".razorpay-container, .razorpay-backdrop, .razorpay-modal") || {}).innerText
        ?.slice(0, 500),
    }
  })
  console.log("=== MODAL STATE ===")
  console.log(JSON.stringify(state, null, 2))
  console.log("=== LOGS ===")
  console.log(logs.join("\n"))

  await page.screenshot({ path: "C:/Users/harsh/Files/codey/pixeldraw3d/$CLAUDE_JOB_DIR/rzp-modal.png" })
  await browser.close()
})().catch((e) => {
  console.error("FATAL", e)
  process.exit(1)
})
