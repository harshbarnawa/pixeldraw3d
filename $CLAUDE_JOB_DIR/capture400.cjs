const { chromium } = require("playwright");
const KEY = "rzp_live_TM8z4vmBPfmltO";
const SUB_ID = process.argv[2] || "sub_TNL2WSFQIJeRWy"; // fresh sub from DEPLOYED fn (total_count=600)

(async () => {
  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const failing = [];
  const all = [];
  page.on("request", (req) => {
    const u = req.url();
    if (/razorpay/i.test(u) && (req.method() === "POST")) {
      all.push({ method: req.method(), url: u.slice(0, 160), post: (req.postData() || "").slice(0, 500) });
    }
  });
  page.on("response", async (resp) => {
    const u = resp.url();
    if (/razorpay/i.test(u) && resp.status() >= 400) {
      let body = "";
      try { body = await resp.text(); } catch {}
      failing.push({ status: resp.status(), url: u.slice(0, 160), body: body.slice(0, 800) });
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
        out("Razorpay loaded, opening checkout...");
        const rzp = new Razorpay({
          key: ${JSON.stringify(KEY)},
          subscription_id: ${JSON.stringify(SUB_ID)},
          name: "PixelDraw3D",
          description: "PLUS monthly",
          prefill: { name: "Test", email: "test@test.com", contact: "9876543210" },
          theme: { color: "#8b7cf6" },
          handler: r => out("HANDLER: " + JSON.stringify(r)),
          modal: { ondismiss: () => out("MODAL DISMISSED") },
        });
        rzp.on("payment.failed", r => out("PAYMENT.FAILED: " + JSON.stringify(r?.error || r)));
        try { rzp.open(); out("rzp.open() OK"); } catch(e) { out("rzp.open() ERROR: " + e.message); }
      }
    }, 200);
    setTimeout(() => { clearInterval(poll); out("TIMEOUT 20s"); }, 20000);
    </script></body></html>`);

  await page.waitForTimeout(15000);

  console.log("=== ALL RAZORPAY POST REQUESTS ===");
  for (const r of all) console.log(JSON.stringify(r));
  console.log("\n=== FAILING (>=400) RESPONSES ===");
  if (failing.length === 0) console.log("(none captured yet — checkout may need UPI selected first)");
  for (const f of failing) {
    console.log(`\n[${f.status}] ${f.url}`);
    console.log("BODY:", f.body);
  }
  await browser.close();
})().catch(e => { console.error("FATAL", e); process.exit(1); });
