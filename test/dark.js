// before launch: no secret, no coin. everything reads "—" and nothing breaks
const { chromium } = require("playwright"); process.env.DARK = "1"; const { srv } = require("./server");
let ok = 0, bad = 0; const t = (c, n) => { c ? ok++ : (bad++, console.log("FAIL", n)); };
srv.listen(4431, async () => { const b = await chromium.launch(), errs = []; const p = await b.newPage(); p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
  await p.addInitScript(() => sessionStorage.setItem("sh1ft.intro", "1")); await p.goto("http://localhost:4431/"); await p.waitForTimeout(1500);
  t((await p.textContent("#s-on")) === "—" && (await p.textContent("#s-pay")) === "—" && /opens at launch/.test(await p.textContent("#s-livet")), "status reads —");
  await p.keyboard.press("2"); await p.waitForTimeout(600); t(/opens when \$SH1FT launches/.test(await p.textContent("#panel")), "payroll room: closed note");
  await p.keyboard.press("Escape"); await p.keyboard.press("3"); await p.waitForTimeout(800); t(/opens when/.test(await p.textContent("#dl")), "desks closed");
  await p.goto("http://localhost:4431/home"); await p.waitForTimeout(1200); t((await p.textContent("#h-on")) === "—" && /posted at launch/.test(await p.textContent("#a-ca")), "story reads —");
  t(!errs.length, "no errors " + errs.join(";")); console.log(ok + " pass, " + bad + " fail"); await b.close(); srv.close(); process.exit(bad ? 1 : 0); });
