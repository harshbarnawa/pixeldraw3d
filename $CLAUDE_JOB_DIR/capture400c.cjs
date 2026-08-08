const { chromium } = require("playwright");
const KEY = "rzp_live_TM8z4vmBPfmltO";
const SUB_ID = process.argv[2] || "sub_TNL2WSFQIJeRWy";

(async () => {
  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const events = [];
  page.on("request", (req) => {
    if (/api\.razorpay/i.test(req.url())) {
      events.push(["REQ", req.method(), req.url().slice(0, 180), (req.postData()||"").slice(0, 500)]);
    }
  });
  page.on("response", async (resp) => {
    if (/api\.razorpay/i.test(resp.url())) {
      let body = ""; try { body = (await resp.text()).slice(0, 600); } catch {}
      events.push(["RESP", resp.status(), resp.url().slice(0, 180), body]);
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
        rzp.open();
      }
    }, 200);
    </script></body></html>`);

  await page.waitForTimeout(9000);

  const state = await page.evaluate(() => {
    const frames = [...document.querySelectorAll('iframe')].map(f => f.src.slice(0, 150));
    // find shadow roots + containers
    const containers = [...document.querySelectorAll('.razorpay-container, .razorpay-backdrop, .razorpay-modal, [class*="rzp"], [class*="Razorpay"]')]
      .slice(0, 5).map(el => ({ cls: el.className, id: el.id }));
    // dump body text bottom
    return { frames, containers, bodyEnd: document.body.innerText.slice(-1200) };
  });
  console.log("=== DOM STATE ===");
  console.log(JSON.stringify(state, null, 2));
  await browser.close();
})().catch(e => { console.error("FATAL", e.message); process.exit(1); });
