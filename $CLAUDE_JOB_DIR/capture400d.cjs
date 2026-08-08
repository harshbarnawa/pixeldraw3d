const { chromium } = require("playwright");
const KEY = "rzp_live_TM8z4vmBPfmltO";
const SUB_ID = process.argv[2] || "sub_TNL2WSFQIJeRWy";

(async () => {
  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const events = [];
  page.on("request", (req) => {
    if (/api\.razorpay/i.test(req.url()) && req.method() === "POST") {
      events.push(["REQ", req.method(), req.url().slice(0, 200), (req.postData()||"").slice(0, 800)]);
    }
  });
  page.on("response", async (resp) => {
    if (/api\.razorpay/i.test(resp.url())) {
      let body = ""; try { body = (await resp.text()).slice(0, 900); } catch {}
      events.push(["RESP", resp.status(), resp.url().slice(0, 200), body]);
    }
  });

  await page.setContent(`<!doctype html><html><head><meta charset="utf-8">
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script></head>
    <body><h1>capture</h1>
    <script>
    const poll = setInterval(() => {
      if (window.Razorpay) {
        clearInterval(poll);
        const rzp = new Razorpay({
          key: ${JSON.stringify(KEY)},
          subscription_id: ${JSON.stringify(SUB_ID)},
          name: "PixelDraw3D", description: "PLUS monthly",
          prefill: { name: "Test", email: "test@test.com", contact: "9876543210" },
          theme: { color: "#8b7cf6" },
          handler: () => {}, modal: { ondismiss: () => {} },
        });
        rzp.on("payment.failed", () => {});
        rzp.open();
      }
    }, 200);
    </script></body></html>`);

  await page.waitForTimeout(10000);

  // Get the checkout iframe (api.razorpay.com/v1/checkout)
  const frame = page.frames().find(f => /api\.razorpay\.com\/v1\/checkout/.test(f.url()));
  console.log("frame:", frame ? frame.url().slice(0,80) : "NOT FOUND");
  if (frame) {
    // Dump visible leaf texts
    const texts = await frame.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('button, [role="button"], [role="tab"], li, label, .Lakshmi-* , div')) {
        const t = (el.textContent||"").trim();
        if (t && t.length < 40 && el.children.length === 0) out.push(t);
      }
      return [...new Set(out)].slice(0, 80);
    });
    console.log("IFRAME LEAF TEXTS:", JSON.stringify(texts));

    // Try clicking an element whose text includes 'UPI' or 'upi'
    let clicked = false;
    for (const txt of ["UPI", "UPI QR", "Pay using UPI"]) {
      const loc = frame.getByText(txt, { exact: false }).first();
      try { await loc.click({ timeout: 2000 }); console.log("clicked UPI:", txt); clicked = true; break; } catch {}
    }
    if (!clicked) {
      // Try data attributes
      for (const sel of ['[data-method="upi"]','[data-testid="upi"]','input[value="upi"]','[data-payment-method="upi"]']) {
        const loc = frame.locator(sel).first();
        try { await loc.click({ timeout: 1500 }); console.log("clicked sel:", sel); clicked = true; break; } catch {}
      }
    }
    if (!clicked) console.log("could not find UPI option");
  }

  await page.waitForTimeout(12000);
  console.log("\n=== api.razorpay EVENTS ===");
  for (const e of events) console.log(JSON.stringify(e));
  if (!events.length) console.log("(no api.razorpay req/resp)");
  await browser.close();
})().catch(e => { console.error("FATAL", e.message); process.exit(1); });
