const { chromium } = require("playwright");
const KEY = "rzp_live_TM8z4vmBPfmltO";
const SUB_ID = process.argv[2] || "sub_TNL2WSFQIJeRWy";

(async () => {
  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const events = [];
  page.on("request", (req) => {
    if (/api\.razorpay/i.test(req.url())) {
      events.push(["REQ", req.method(), req.url().slice(0, 220), (req.postData()||"").slice(0, 1200)]);
    }
  });
  page.on("response", async (resp) => {
    if (/api\.razorpay/i.test(resp.url())) {
      let body = ""; try { body = (await resp.text()).slice(0, 1200); } catch (e) { body = "<err>"; }
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

  try { await page.waitForSelector('iframe[src*="api.razorpay"]', { timeout: 15000 }); } catch {}
  await page.waitForTimeout(4000);
  const frame = page.frames().find(f => /api\.razorpay\.com\/v1\/checkout/.test(f.url()));
  console.log("frame:", frame ? "yes" : "no");

  async function tryClick(desc, locator) {
    try { await locator.click({ timeout: 2500 }); console.log("OK clicked:", desc); return true; } catch (e) { console.log("miss:", desc, "->", e.message.slice(0,60)); return false; }
  }

  if (frame) {
    // Click the UPI method option via JS to find its clickable ancestor first
    const upiInfo = await frame.evaluate(() => {
      const els = [...document.querySelectorAll('*')].filter(el => (el.textContent||"").trim() === "UPI");
      return els.slice(0,5).map(el => {
        let node = el;
        let path = [];
        for (let i=0; i<6 && node; i++) {
          path.push(node.tagName + (node.className && typeof node.className === "string" ? "." + String(node.className).trim().replace(/\s+/g,".") : "") + (node.dataset ? "[" + Object.keys(node.dataset).map(k=>`data-${k}`).join(",") + "]" : ""));
          node = node.parentElement;
        }
        return path.join(" < ");
      });
    });
    console.log("UPI element paths:", JSON.stringify(upiInfo, null, 1));

    // Click via the most specific selector
    let clicked = await tryClick("UPI text", frame.getByText("UPI", { exact: true }).first());
    if (!clicked) clicked = await tryClick("UPI role", frame.locator('[role="button"]', { hasText: "UPI" }).first());
    if (!clicked) clicked = await tryClick("UPI any", frame.locator('text=UPI').first());
    if (!clicked) {
      // JS click on the UPI element
      await frame.evaluate(() => {
        const el = [...document.querySelectorAll('*')].find(e => (e.textContent||"").trim() === "UPI");
        if (el) { el.click(); return el.tagName + " clicked"; }
        return "not found";
      }).then(r => console.log("JS click:", r));
    }
    await page.screenshot({ path: "$CLAUDE_JOB_DIR/cap-upi-step.png" });
  }

  await page.waitForTimeout(10000);

  // After UPI step, dump what's on screen now + click any QR/continue options
  if (frame) {
    const texts2 = await frame.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('button,[role="button"],li,label,span,div,a')) {
        const t=(el.textContent||"").trim();
        if (t && t.length<40 && el.children.length===0) out.push(t);
      }
      return [...new Set(out)].slice(0,70);
    });
    console.log("AFTER UPI TEXTS:", JSON.stringify(texts2));
    for (const t of ["QR","Scan to pay","Pay via QR","qr","Continue","Pay ₹99"]) {
      try { await frame.getByText(t, {exact:false}).first().click({timeout:1500}); console.log("clicked after-step:", t); } catch {}
    }
  }

  await page.waitForTimeout(10000);
  console.log("\n=== api.razorpay EVENTS ===");
  for (const e of events) console.log(JSON.stringify(e));
  if (!events.length) console.log("(none)");
  await browser.close();
})().catch(e => { console.error("FATAL", e.message); process.exit(1); });
