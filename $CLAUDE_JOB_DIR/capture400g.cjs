const { chromium } = require("playwright");
const KEY = "rzp_live_TM8z4vmBPfmltO";
const SUB_ID = process.argv[2] || "sub_TNL2WSFQIJeRWy";

(async () => {
  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const events = [];
  page.on("request", (req) => {
    if (/api\.razorpay/i.test(req.url())) {
      events.push(["REQ", req.method(), req.url().slice(0, 200), (req.postData()||"").slice(0, 1500)]);
    }
  });
  page.on("response", async (resp) => {
    if (/api\.razorpay/i.test(resp.url())) {
      let body = ""; try { body = (await resp.text()).slice(0, 1500); } catch (e) { body = "<err>"; }
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

  try { await page.waitForSelector('iframe[src*="api.razorpay"]', { timeout: 15000 }); } catch {}
  await page.waitForTimeout(4000);
  const frame = page.frames().find(f => /api\.razorpay\.com\/v1\/checkout/.test(f.url()));
  console.log("frame:", !!frame);

  if (frame) {
    // Inspect + click the UPI radio input inside the LABEL
    const upi = await frame.evaluate(() => {
      const label = [...document.querySelectorAll('label')].find(l => (l.textContent||"").trim().includes("UPI"));
      if (!label) return { err: "no UPI label" };
      const radio = label.querySelector('input[type="radio"], input[type="checkbox"]');
      const info = { hasRadio: !!radio, radioId: radio ? radio.id : null, labelFor: label.htmlFor, labelCls: label.className.slice(0,40) };
      if (radio) { radio.click(); return { ...info, clickedRadio: true }; }
      label.click(); return { ...info, clickedLabel: true };
    });
    console.log("UPI radio:", JSON.stringify(upi));

    // Click Continue button
    const cont = frame.locator('button:has-text("Continue")').first();
    try { await cont.click({ timeout: 3000 }); console.log("Continue clicked"); } catch(e) { console.log("Continue miss:", e.message.slice(0,80)); }

    await page.waitForTimeout(6000);
    const texts = await frame.evaluate(() => {
      const out=[];
      for (const el of document.querySelectorAll('button,[role="button"],li,label,span,div,a,input')) {
        const t=(el.textContent||"").trim();
        if (t && t.length<45 && el.children.length===0) out.push(t);
      }
      return [...new Set(out)].slice(0,80);
    });
    console.log("AFTER CONTINUE:", JSON.stringify(texts));
    await page.screenshot({ path: "$CLAUDE_JOB_DIR/cap-after-continue.png" });

    // If a QR / UPI id screen appeared, look for pay/QR actions
    for (const t of ["QR","Scan","Pay","Enter UPI ID","UPI ID"]) {
      try { await frame.getByText(t, {exact:false}).first().click({timeout:1200}); console.log("clicked:",t); } catch {}
    }
  }

  await page.waitForTimeout(12000);
  console.log("\n=== EVENTS ===");
  for (const e of events) console.log(JSON.stringify(e));
  if (!events.length) console.log("(none)");
  await browser.close();
})().catch(e => { console.error("FATAL", e.message); process.exit(1); });
