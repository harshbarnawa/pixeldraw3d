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

  // Capture ALL requests + responses, tag the interesting ones
  page.on("request", req => {
    const u = req.url()
    if (u.includes("ajax") || u.includes("mandate") || u.includes("api.razorpay") || u.includes("auth") || u.includes("token") || u.includes("checkout/public")) {
      net.push({ kind: "REQ", url: u.slice(0, 400), method: req.method(), postData: req.postData()?.slice(0, 3000) })
    }
  })
  page.on("response", async res => {
    const u = res.url()
    if (u.includes("ajax") || u.includes("mandate") || u.includes("api.razorpay") || u.includes("auth") || u.includes("token")) {
      let body = ""
      try { body = await res.text() } catch {}
      net.push({ kind: "RESP", url: u.slice(0, 400), status: res.status(), body: body.slice(0, 5000) })
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

  // Wait for the real checkout UI to mount in ANY frame (poll for input elements)
  let target = null
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000)
    const frames = page.frames()
    for (const f of frames) {
      if (!f.url().includes("razorpay")) continue
      try {
        const hasInput = await f.evaluate(() => !!document.querySelector("input, button, .payment-options, [class*=pay]"))
        if (hasInput) { target = f; console.log("UI ready in frame:", f.url().slice(0, 120)); break }
      } catch {}
    }
    if (target) break
  }

  if (!target) {
    console.log("UI never mounted. Frames:", page.frames().map(f => f.url().slice(0, 100)))
    console.log("Nested frames:", JSON.stringify(page.frames().map(f => ({ u: f.url().slice(0,120), children: f.childFrames().map(c => c.url().slice(0,100)) }))))
  } else {
    await page.waitForTimeout(1500)
    await page.screenshot({ path: "C:/Users/harsh/Files/codey/pixeldraw3d/$CLAUDE_JOB_DIR/s0.png" })

    // Dump DOM
    const dump = await target.evaluate(() => {
      const inputs = [...document.querySelectorAll("input")].map(i => ({ type: i.type, name: i.name, ph: i.placeholder, cls: String(i.className).slice(0,60), checked: i.checked }))
      const labels = [...document.querySelectorAll("label")].map(l => ({ for: l.htmlFor, text: (l.innerText || "").trim().slice(0, 60), cls: String(l.className).slice(0,60) }))
      const btns = [...document.querySelectorAll("button")].map(b => ({ text: (b.innerText || "").trim().slice(0, 50), cls: String(b.className).slice(0,60) }))
      const tabs = [...document.querySelectorAll("[class*=tab], [role=tab]")].map(t => (t.innerText || "").trim().slice(0,40))
      const bodyText = (document.body.innerText || "").slice(0, 1200)
      return { inputs, labels, btns, tabs, bodyText }
    })
    console.log("=== DOM ===")
    console.log(JSON.stringify(dump, null, 2))

    // Click the element whose text is exactly "UPI" (or contains it) using JS
    const clickRes = await target.evaluate(() => {
      const all = [...document.querySelectorAll("div,span,label,li,a,p,button,[class*=option]")]
      const exact = all.filter(el => el.children.length === 0 && el.innerText && el.innerText.trim() === "UPI")
      if (exact.length) { const e = exact[0]; e.click(); return "clicked exact UPI on " + e.tagName + "." + String(e.className).slice(0,60) }
      const cont = all.find(el => el.children.length === 0 && el.innerText && el.innerText.trim().toLowerCase().includes("upi"))
      if (cont) { cont.click(); return "clicked contains-UPI: '" + cont.innerText.trim() + "' on " + cont.tagName }
      return "UPI not found"
    })
    logs.push("[AUTO] " + clickRes)
    await page.waitForTimeout(3000)
    await page.screenshot({ path: "C:/Users/harsh/Files/codey/pixeldraw3d/$CLAUDE_JOB_DIR/s1.png" })

    // Now look for "UPI QR" or QR section
    const qrRes = await target.evaluate(() => {
      const all = [...document.querySelectorAll("div,span,label,li,a,p,button")]
      const qr = all.find(el => el.children.length === 0 && el.innerText && el.innerText.trim().toLowerCase().includes("qr"))
      if (qr) { qr.click(); return "clicked: '" + qr.innerText.trim() + "'" }
      return "no QR element"
    })
    logs.push("[AUTO] " + qrRes)
    await page.waitForTimeout(4000)
    await page.screenshot({ path: "C:/Users/harsh/Files/codey/pixeldraw3d/$CLAUDE_JOB_DIR/s2.png" })
  }

  console.log("=== NETWORK (interesting) ===")
  console.log(JSON.stringify(net, null, 2))
  console.log("\n=== LOGS ===")
  console.log(logs.filter(l => !l.includes("parser-blocking")).join("\n"))
  await browser.close()
})().catch(e => { console.error("FATAL", e.message); process.exit(1) })
