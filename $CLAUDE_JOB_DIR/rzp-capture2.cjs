const { chromium } = require("playwright")
const KEY = "rzp_live_TM8z4vmBPfmltO"
const SUB_ID = process.argv[2] || "sub_TNL2WSFQIJeRWy"

;(async () => {
  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" })
  const page = await browser.newPage({ viewport: { width: 1280, height: 950 } })
  const logs = []
  const net = []

  page.on("console", m => logs.push(`[${m.type()}] ${m.text()}`))
  page.on("pageerror", e => logs.push(`[PAGE_ERR] ${e.message}`))

  page.on("request", req => {
    const u = req.url()
    if (u.includes("api.razorpay.com") || u.includes("checkout.razorpay") || u.includes("ajax")) {
      net.push({ kind: "REQ", url: u, method: req.method(), postData: req.postData()?.slice(0, 2500) })
    }
  })
  page.on("response", async res => {
    const u = res.url()
    if (u.includes("api.razorpay.com") || u.includes("checkout.razorpay")) {
      let body = ""
      try { body = await res.text() } catch {}
      net.push({ kind: "RESP", url: u, status: res.status(), body: body.slice(0, 4000) })
    }
  })

  await page.setContent(`<!doctype html><html><head><meta charset="utf-8">
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script></head>
    <body><pre id="out" style="white-space:pre-wrap"></pre>
    <script>
    const out = (s) => { document.getElementById('out').textContent += s + '\n' }
    out("waiting for Razorpay...")
    const poll = setInterval(() => {
      if (window.Razorpay) {
        clearInterval(poll)
        out("opening checkout...")
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
        try { rzp.open(); out("rzp.open() OK") } catch(e) { out("open ERROR: " + e.message) }
      }
    }, 200)
    setTimeout(() => { clearInterval(poll); out("TIMEOUT") }, 15000)
    </script></body></html>`)

  await page.waitForTimeout(9000)

  const frames = page.frames()
  const checkout = frames.find(f => f.url().includes("api.razorpay.com/v1/checkout"))
  if (!checkout) { console.log("FRAME NOT FOUND. Frames:", frames.map(f => f.url())); }
  else {
    console.log("Checkout frame:", checkout.url())
    await checkout.waitForLoadState("load").catch(() => {})
    await page.waitForTimeout(3000)

    // Screenshot current state
    await page.screenshot({ path: "C:/Users/harsh/Files/codey/pixeldraw3d/$CLAUDE_JOB_DIR/step0-initial.png" })

    // Dump all input fields + buttons in the checkout frame to know the DOM
    const dump = await checkout.evaluate(() => {
      const inputs = [...document.querySelectorAll("input")].map(i => ({ type: i.type, name: i.name, ph: i.placeholder, id: i.id, cls: i.className, val: i.value }))
      const labels = [...document.querySelectorAll("label")].map(l => ({ for: l.htmlFor, text: (l.innerText || "").slice(0, 80), cls: l.className }))
      const btns = [...document.querySelectorAll("button")].map(b => ({ text: (b.innerText || "").slice(0, 60), cls: b.className, type: b.type }))
      const bodyText = document.body.innerText.slice(0, 1500)
      return { inputs, labels, btns, bodyText }
    })
    console.log("=== DOM DUMP ===")
    console.log(JSON.stringify(dump, null, 2))

    // Try clicking UPI using robust JS approach
    const upiClick = await checkout.evaluate(() => {
      // find element containing "UPI" text
      const all = [...document.querySelectorAll("div,span,label,button,li,a")]
      const upiEl = all.find(el => el.children.length === 0 && el.innerText && el.innerText.trim() === "UPI")
      if (upiEl) { upiEl.click(); return "clicked text=UPI on " + upiEl.tagName + "." + upiEl.className }
      const upiQrEl = all.find(el => el.children.length === 0 && el.innerText && el.innerText.trim() === "UPI QR")
      if (upiQrEl) { upiQrEl.click(); return "clicked text=UPI QR on " + upiQrEl.tagName + "." + upiQrEl.className }
      return "not found"
    })
    logs.push("[AUTO] " + upiClick)
    await page.waitForTimeout(2500)
    await page.screenshot({ path: "C:/Users/harsh/Files/codey/pixeldraw3d/$CLAUDE_JOB_DIR/step1-upi.png" })
  }

  console.log("=== NETWORK ===")
  console.log(JSON.stringify(net, null, 2))
  console.log("\n=== LOGS ===")
  console.log(logs.filter(l => !l.includes("parser-blocking")).join("\n"))
  await browser.close()
})().catch(e => { console.error("FATAL", e.message); process.exit(1) })
