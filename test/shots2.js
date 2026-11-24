const { chromium } = require("playwright"); const { srv } = require("./server"); const O = process.argv[2]; require("fs").mkdirSync(O, { recursive: true });
srv.listen(4430, async () => { const b = await chromium.launch(), errs = [];
  const p = await b.newPage({ viewport: { width: 1440, height: 860 } }); p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
  await p.goto("http://localhost:4430/home"); await p.waitForTimeout(2500); await p.screenshot({ path: O + "h0.png" });
  for (const id of ["problem", "l1", "l2", "l3", "l4", "wage", "rules", "check", "faq"]) { await p.evaluate(id => { const e = id[0] === "l" && id.length === 2 ? document.querySelector('.lvl[data-s="' + id[1] + '"]') : document.getElementById(id); scrollTo(0, e.offsetTop + (id[0] === "l" && id.length === 2 ? e.offsetHeight / 2 - innerHeight / 2 : -40)); }, id); await p.waitForTimeout(1800); await p.screenshot({ path: O + "h_" + id + ".png" }); }
  await p.goto("http://localhost:4430/docs"); await p.waitForTimeout(800); await p.screenshot({ path: O + "docs.png" });
  console.log(errs.join("\n") || "no errors"); await b.close(); srv.close(); });
