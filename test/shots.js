const { chromium } = require("playwright"); const { srv } = require("./server"); const O = process.argv[2]; require("fs").mkdirSync(O, { recursive: true });
srv.listen(4430, async () => { const b = await chromium.launch({ args: ["--use-gl=swiftshader", "--autoplay-policy=no-user-gesture-required"] }), errs = [];
  const p = await b.newPage({ viewport: { width: 1440, height: 860 } }); p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
  await p.goto("http://localhost:4430/"); await p.waitForTimeout(1500); await p.screenshot({ path: O + "i1.png" }); await p.waitForTimeout(2500); await p.screenshot({ path: O + "i2.png" }); await p.waitForTimeout(3000); await p.screenshot({ path: O + "i3.png" });
  await p.click(".intro .go"); await p.waitForTimeout(2500); await p.screenshot({ path: O + "world.png" });
  for (const r of ["office", "payroll", "desks", "me", "ledger", "rules", "terminal"]) { await p.keyboard.press(String(["office", "payroll", "desks", "me", "ledger", "rules", "terminal"].indexOf(r) + 1)); await p.waitForTimeout(1600); await p.screenshot({ path: O + "r_" + r + ".png" }); await p.keyboard.press("Escape"); await p.waitForTimeout(300); }
  await p.mouse.move(720, 600); await p.waitForTimeout(500);
  const m = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true }); m.on("pageerror", e => errs.push("m:" + e.message)); await m.goto("http://localhost:4430/#/office"); await m.waitForTimeout(2500); await m.screenshot({ path: O + "m_office.png" });
  console.log(errs.join("\n") || "no errors"); await b.close(); srv.close(); });
