const { chromium } = require("playwright");
const KEY = "rzp_live_TM8z4vmBPfmltO";
const SUB_ID = "sub_TMVDnb6MZJdHXq";

(async () => {
  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("pageerror", e => console.log("PAGE_ERR:", e.message));

  const html = `<!doctype html><html><head><meta charset="utf-8">
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script></head>
    <body><h1>prefill test</h1>
    <pre id="out" style="white-space:pre-wrap"></pre>
    <script>
    const out = (s) => { document.getElementById('out').textContent += s + '\n' }
    const rzp = new Razorpay({
      key: ${JSON.stringify(KEY)},
      subscription_id: ${JSON.stringify(SUB_ID)},
      name: "PixelDraw3D",
      description: "PRO · monthly",
      prefill: { name: "Test User", email: "test@test.com", contact: "9876543210" },
      theme: { color: "#8b7cf6" },
      handler: (resp) => out("HANDLER: " + JSON.stringify(resp)),
      modal: { ondismiss: () => out("MODAL DISMISSED") },
    });
    rzp.on("payment.failed", r => out("FAILED: " + JSON.stringify(r?.error)));
    try { rzp.open(); out("opened ok"); } catch(e) { out("THREW: " + e.message); }
    </script></body></html>`;

  await page.setContent(html);
  await page.waitForFunction(() => window.Razorpay !== undefined, null, { timeout: 20000 });
  await page.waitForTimeout(5000);

  const state = await page.evaluate(() => {
    const modal = document.querySelector(".razorpay-container, .razorpay-backdrop, .razorpay-modal");
    return {
      hasContactPopup: !!document.querySelector("input[type='tel'], input[placeholder*='obile'], .razorpay-contact-popup"),
      modalText: (modal || {}).innerText?.slice(0, 1000),
      bodyText: document.body.innerText?.slice(0, 2000),
    };
  });
  console.log("=== RESULT (prefill contact=9876543210) ===");
  console.log(JSON.stringify(state, null, 2));
  await page.screenshot({ path: "C:/Users/harsh/Files/codey/pixeldraw3d/$CLAUDE_JOB_DIR/rzp-prefill.png" });
  await browser.close();
})().catch(e => { console.error("FATAL", e); process.exit(1); });
