const { chromium } = require("playwright");
const KEY = "rzp_live_TM8z4vmBPfmltO";
const SUB_ID = process.argv[2] || "sub_TNL2WSFQIJeRWy";

(async () => {
  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const events = [];
  page.on("request", (req) => {
    if (/api\.razorpay|checkout\.razorpay/i.test(req.url())) {
      events.push(["REQ", req.method(), req.url().slice(0, 220), (req.postData()||"").slice(0, 900)]);
    }
  });
  page.on("response", async (resp) => {
    if (/api\.razorpay|checkout\.razorpay/i.test(resp.url()) && resp.status() >= 400) {
      let body = ""; try { body = (await resp.text()).slice(0, 900); } catch (e) { body = "<err " + e.message + ">"; }
      events.push(["RESP", resp.status(), resp.url().slice(0, 220), body]);
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

  // Wait for the checkout iframe to appear in DOM
  try { await page.waitForSelector('iframe[src*="api.razorpay"]', { timeout: 15000 }); } catch {}
  await page.waitForTimeout(4000);

  console.log("ALL FRAMES:", page.frames().map(f => f.url().slice(0, 90)).join(" | "));

  const frame = page.frames().find(f => /api\.razorpay\.com\/v1\/checkout/.test(f.url()));
  if (!frame) {
    console.log("frame not found; screenshot:");
    await page.screenshot({ path: "$CLAUDE_JOB_DIR/cap-no-frame.png" });
  } else {
    console.log("FOUND frame:", frame.url().slice(0, 100));
    await page.waitForTimeout(3000);
    const texts = await frame.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('button, [role="button"], [role="tab"], li, label, a, span, div')) {
        const t = (el.textContent||"").trim();
        if (t && t.length < 30 && el.children.length === 0) out.push(t);
      }
      return [...new Set(out)].slice(0, 90);
    });
    console.log("IFRAME TEXTS:", JSON.stringify(texts));

    let clicked = false;
    for (const t of ["UPI", "UPI QR", "Pay using UPI", "upi"]) {
      try { await frame.getByText(t, { exact: false }).first().click({ timeout: 2000 }); console.log("clicked:", t); clicked = true; break; } catch {}
    }
    if (!clicked) {
      for (const sel of ['[data-method="upi"]','[data-testid="upi"]','[data-payment-method="upi"]','[data-option="upi"]']) {
        try { await frame.locator(sel).first().click({ timeout: 1500 }); console.log("clicked sel:", sel); clicked = true; break; } catch {}
      }
    }
    if (!clicked) console.log("UPI option not found");
    await page.screenshot({ path: "$CLAUDE_JOB_DIR/cap-after-click.png" });
  }

  await page.waitForTimeout(15000);
  console.log("\n=== EVENTS ===");
  for (const e of events) console.log(JSON.stringify(e));
  if (!events.length) console.log("(none)");
  await browser.close();
})().catch(e => { console.error("FATAL", e.message); process.exit(1); });
