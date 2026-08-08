const { chromium } = require("playwright")
const KEY = "rzp_live_TM8z4vmBPfmltO"
const SUB_ID = process.argv[2] || "sub_TNL2WSFQIJeRWy"

;(async () => {
  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const logs = []
  const net = []

  page.on("console", m => logs.push(`[${m.type()}] ${m.text()}`))
  page.on("pageerror", e => logs.push(`[PAGE_ERR] ${e.message}`))

  // Capture ALL network requests + responses, esp. the ajax call
  page.on("request", req => {
    const u = req.url()
    if (u.includes("api.razorpay.com") || u.includes("ajax") || u.includes("mandate")) {
      net.push({
        kind: "REQ",
        url: u,
        method: req.method(),
        postData: req.postData()?.slice(0, 2000),
      })
    }
  })
  page.on("response", async res => {
    const u = res.url()
    if (u.includes("api.razorpay.com") && (u.includes("ajax") || u.includes("mandate") || u.includes("payment") || u.includes("session") || u.includes("token"))) {
      let body = ""
      try { body = await res.text() } catch {}
      net.push({
        kind: "RESP",
        url: u,
        status: res.status(),
        body: body.slice(0, 3000),
      })
    }
  })

  await page.setContent(`<!doctype html><html><head><meta charset="utf-8">
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script></head>
    <body><h1>debug</h1>
    <pre id="out" style="white-space:pre-wrap"></pre>
    <script>
    const out = (s) => { document.getElementById('out').textContent += s + '\n' }
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

  await page.waitForTimeout(8000)

  // Find the checkout iframe
  const frames = page.frames()
  const checkout = frames.find(f => f.url().includes("api.razorpay.com/v1/checkout"))
  if (!checkout) { console.log("FRAME NOT FOUND. Frames:", frames.map(f => f.url())); }
  else {
    console.log("Found checkout iframe:", checkout.url())

    // Try to find and click the phone/contact field inside the modal
    const fillContact = async () => {
      try {
        const phoneInput = await checkout.waitForSelector('input[type="tel"], input[placeholder*="mobile" i], input[placeholder*="phone" i], input[name*="phone" i]', { timeout: 6000 })
        if (phoneInput) {
          await phoneInput.click()
          await phoneInput.fill("9876543210")
          logs.push("[AUTO] filled phone input")
          // Find continue/submit button
          const btns = await checkout.$$("button")
          for (const b of btns) {
            const t = ((await b.innerText()) || "").toLowerCase()
            if (t.includes("continue") || t.includes("proceed") || t.includes("verify") || t.includes("send otp")) {
              await b.click()
              logs.push("[AUTO] clicked: " + t)
              return
            }
          }
        }
      } catch (e) { logs.push("[AUTO] contact fill failed: " + e.message) }
    }

    await fillContact()
    await page.waitForTimeout(3000)

    // Now click UPI payment option
    try {
      const upiLabel = await checkout.waitForSelector('label:has(input[value="upi"]), [data-method="upi"], [data-method="upi_qr"], text=UPI QR', { timeout: 5000 })
      await upiLabel.click({ force: true }).catch(() => {})
      logs.push("[AUTO] clicked UPI option")
    } catch (e) { logs.push("[AUTO] UPI click failed: " + e.message) }

    await page.waitForTimeout(2000)

    // Click UPI QR sub-option if present
    try {
      const qrOpt = await checkout.waitForSelector('text=UPI QR', { timeout: 4000 })
      await qrOpt.click({ force: true }).catch(() => {})
      logs.push("[AUTO] clicked UPI QR")
    } catch (e) { logs.push("[AUTO] UPI QR click skipped: " + e.message) }

    await page.waitForTimeout(3000)
  }

  const state = await page.evaluate(() => ({
    hasRazorpay: typeof window.Razorpay,
    out: document.getElementById("out")?.textContent,
    hasModal: !!document.querySelector(".razorpay-container"),
    modalInnerText: (document.querySelector(".razorpay-container") || {}).innerText?.slice(0, 1200),
  }))

  console.log("=== STATE ===")
  console.log(JSON.stringify(state, null, 2))
  console.log("\n=== NETWORK ===")
  console.log(JSON.stringify(net, null, 2))
  console.log("\n=== LOGS ===")
  console.log(logs.filter(l => !l.includes("parser-blocking")).join("\n"))

  await page.screenshot({ path: "C:/Users/harsh/Files/codey/pixeldraw3d/$CLAUDE_JOB_DIR/cap400.png" })
  await browser.close()
})().catch(e => { console.error("FATAL", e.message); process.exit(1) })
