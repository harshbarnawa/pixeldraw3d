const { chromium } = require("playwright");
const KEY = "rzp_live_TM8z4vmBPfmltO";
const SUB_ID = process.argv[2] || "sub_TNL2WSFQIJeRWy";

(async () => {
  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const events = [];
  page.on("request", (req) => {
    if (/razorpay/i.test(req.url())) {
      events.push(["REQ", req.method(), req.url().slice(0, 150), (req.postData()||"").slice(0, 400)]);
    }
  });
  page.on("response", async (resp) => {
    if (/razorpay/i.test(resp.url()) && resp.status() >= 400) {
      let body = ""; try { body = (await resp.text()).slice(0, 600); } catch {}
      events.push(["RESP", resp.status(), resp.url().slice(0, 150), body]);
    }
  });

  await page.setContent(`<!doctype html><html><head><meta charset="utf-8">
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script></head>
    <body><h1>capture</h1><pre id="out" style="white-space:pre-wrap"></pre>
    <script>
    const out = (s) => { document.getElementById('out').textContent += s + '\n' }
    const poll = setInterval(() => {
      if (window.Razorpay) {
        clearInterval(poll);
        out("opening...");
        const rzp = new Razorpay({
          key: ${JSON.stringify(KEY)},
          subscription_id: ${JSON.stringify(SUB_ID)},
          name: "PixelDraw3D", description: "PLUS monthly",
          prefill: { name: "Test", email: "test@test.com", contact: "9876543210" },
          theme: { color: "#8b7cf6" },
          handler: r => out("HANDLER: " + JSON.stringify(r)),
          modal: { ondismiss: () => out("DISMISSED") },
        });
        rzp.on("payment.failed", r => out("FAILED: " + JSON.stringify(r?.error || r)));
        try { rzp.open(); out("opened OK"); } catch(e) { out("OPEN ERR: " + e.message); }
      }
    }, 200);
    </script></body></html>`);

  await page.waitForTimeout(8000);

  // Find the checkout iframe and dump + interact
  const frames = page.frames().filter(f => /checkout\.razorpay/i.test(f.url()));
  console.log("iframe count:", frames.length);
  if (frames.length) {
    const f = frames[0];
    // Dump clickable text to find UPI option
    const options = await f.evaluate(() => {
      const all = [...document.querySelectorAll('*')];
      return all.filter(el => el.children.length === 0 && el.textContent && el.textContent.trim().length < 60)
        .map(el => el.textContent.trim()).filter((v,i,a) => a.indexOf(v) === i).slice(0, 60);
    });
    console.log("visible texts:", JSON.stringify(options, null, 0));

    // Try to find + click UPI
    for (const sel of ['[data-method="upi"]', '[data-payment-method="upi"]', 'text=UPI', 'text=upi']) {
      const el = f.locator(sel).first();
      try { await el.click({ timeout: 1500 }); console.log("clicked:", sel); break; } catch {}
    }
  }

  await page.waitForTimeout(10000);
  console.log("\n=== EVENTS ===");
  for (const e of events) console.log(JSON.stringify(e));
  if (!events.length) console.log("(no razorpay req/resp captured)");
  await browser.close();
})().catch(e => { console.error("FATAL", e.message); process.exit(1); });
