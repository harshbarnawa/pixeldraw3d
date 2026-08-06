const { chromium } = require("playwright")
const KEY = "rzp_live_TM8z4vmBPfmltO"
const SUB_ID = process.argv[2] || "sub_TMVxjDs7CHlF5P" // most recent subscription

;(async () => {
  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const logs = []
  page.on("console", m => logs.push(`[${m.type()}] ${m.text()}`))
  page.on("pageerror", e => logs.push(`[PAGE_ERR] ${e.message}`))

  await page.setContent(`<!doctype html><html><head><meta charset="utf-8">
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script></head>
    <body><h1>debug</h1>
    <pre id="out" style="white-space:pre-wrap"></pre>
    <script>
    const out = (s) => { document.getElementById('out').textContent += s + '\\n' }
    out("waiting for Razorpay...")
    const poll = setInterval(() => {
      if (window.Razorpay) {
        clearInterval(poll)
        out("Razorpay loaded, opening checkout...")
        const rzp = new Razorpay({
          key: ${JSON.stringify(KEY)},
          subscription_id: ${JSON.stringify(SUB_ID)},
          name: "PixelDraw3D",
          description: "PLUS monthly",
          prefill: { name: "Test", email: "test@test.com", contact: "9876543210" },
          theme: { color: "#8b7cf6" },
          handler: r => out("HANDLER: " + JSON.stringify(r)),
          modal: { ondismiss: () => out("MODAL DISMISSED") },
        })
        rzp.on("payment.failed", r => out("PAYMENT.FAILED: " + JSON.stringify(r?.error)))
        try { rzp.open(); out("rzp.open() OK") }
        catch(e) { out("rzp.open() ERROR: " + e.message) }
      }
    }, 200)
    setTimeout(() => { clearInterval(poll); out("TIMEOUT: Razorpay never loaded after 15s") }, 15000)
    </script></body></html>`)

  await page.waitForTimeout(12000)

  const state = await page.evaluate(() => ({
    hasRazorpay: typeof window.Razorpay,
    out: document.getElementById("out")?.textContent,
    hasIframe: !!document.querySelector("iframe"),
    hasModal: !!document.querySelector(".razorpay-container"),
    modalInnerText: (document.querySelector(".razorpay-container") || {}).innerText?.slice(0, 800),
  }))
  console.log("=== STATE ===")
  console.log(JSON.stringify(state, null, 2))
  console.log("=== LOGS ===")
  console.log(logs.filter(l => !l.includes("parser-blocking")).join("\n"))

  await page.screenshot({ path: "C:/Users/harsh/Files/codey/pixeldraw3d/$CLAUDE_JOB_DIR/rzp-debug.png" })
  await browser.close()
})().catch(e => { console.error("FATAL", e.message); process.exit(1) })
