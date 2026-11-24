// end to end in a real browser against the mock chain
const { chromium } = require("playwright"); const { srv, M } = require("./server");
let ok = 0, bad = 0; const t = (c, n) => { c ? ok++ : (bad++, console.log("FAIL", n)); };
srv.listen(4430, async () => {
  const b = await chromium.launch(), errs = [];
  const page = async (url, skip) => { const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); p.on("pageerror", e => errs.push(url + " " + e.message)); p.on("console", m => { if (m.type() === "error") errs.push(url + " console " + m.text()); });
    if (skip) await p.addInitScript(() => sessionStorage.setItem("sh1ft.intro", "1")); await p.goto("http://localhost:4430" + url); await p.waitForTimeout(1600); return p; };
  // the intro plays once, then the office
  let p = await page("/"); t(await p.isVisible(".intro .type"), "intro plays"); await p.click(".intro .skip"); await p.waitForTimeout(1200);
  t(!(await p.$(".intro")), "intro gone after skip"); t((await p.textContent("#s-on")) === "48" && (await p.textContent("#s-fired")) === "1", "status bar live counts");
  t(/\d\d:\d\d:\d\d/.test(await p.textContent("#signd")), "the shift clock runs");
  const desks = await p.evaluate(() => { const W = document.querySelector("#world"); return null; });
  await p.keyboard.press("2"); await p.waitForTimeout(800); t(/1\.240 SOL/.test(await p.textContent("#panel")) && /waiting/.test(await p.textContent("#panel")), "payroll room");
  await p.click('[data-cmd="run"]'); await p.waitForTimeout(1200); t(/paid .* SOL to \d+ workers/.test(await p.textContent(".term")) && M.sent.length > 0, "run payroll from the room");
  await p.keyboard.press("Escape"); await p.keyboard.press("3"); await p.waitForTimeout(1200); t((await p.$$("#dl tbody tr")).length >= 48 && /boxed/.test(await p.textContent("#dl")), "desks room: roster and fired");
  await p.click('.seg button[data-v="last"]'); await p.waitForTimeout(800); t(/closed/.test(await p.textContent("#dmeta")), "last shift roster");
  await p.keyboard.press("Escape"); await p.keyboard.press("4"); await p.waitForTimeout(500); await p.fill("#mw", M.H[0].w); await p.click("#mgo"); await p.waitForTimeout(900);
  t(/on shift/.test(await p.textContent("#mres")) && /desk/.test(await p.textContent("#mres")), "me: on shift");
  await p.fill("#mw", M.H[1].w); await p.click("#mgo"); await p.waitForTimeout(900); t(/fired/.test(await p.textContent("#mres")), "me: fired");
  await p.keyboard.press("Escape"); await p.keyboard.press("5"); await p.waitForTimeout(900); t(/#\d+/.test(await p.textContent("#ll")) && /fees in/.test(await p.textContent("#ll")), "ledger room");
  await p.keyboard.press("Escape"); await p.keyboard.press("/"); await p.waitForTimeout(600);
  const run = async c => { await p.fill(".term input", c); await p.press(".term input", "Enter"); await p.waitForTimeout(500); return p.textContent(".term .tbody"); };
  t(/payroll in/.test(await run("shift")), "terminal: shift"); t(/48 \/ 100/.test(await run("office")), "terminal: office"); t(/ON/.test(await run("me " + M.H[0].w)), "terminal: me");
  t(/can't quit/.test(await run("quit")), "terminal: quit"); t(/CA /.test(await run("ca")), "terminal: ca");
  // click a desk in the world opens its badge
  await p.keyboard.press("Escape"); await p.waitForTimeout(500); const hit = await p.evaluate(() => { const c = document.querySelector("#world"); return null; });
  // deep link to a room skips the intro
  p = await page("/#/rules"); t(await p.isVisible("#panel.on") && /handbook/.test(await p.textContent("#panel")), "deep link opens a room");
  // the story
  p = await page("/home"); t((await p.textContent("#h-on")) === "48 / 100", "story: live strip"); t(/SOL/.test(await p.textContent("#c-out")), "story: wage calculator");
  await p.evaluate(() => document.querySelector('.lvl[data-s="3"]').scrollIntoView({ block: "center" })); await p.waitForTimeout(1500); t(await p.$eval('.lvl[data-s="3"]', e => e.classList.contains("on")), "story: level reveals");
  p = await page("/docs"); t(/HONEST LIMITS/.test(await p.textContent("body")), "docs");
  t(errs.length === 0, "no page errors:\n" + errs.join("\n"));
  console.log(ok + " pass, " + bad + " fail"); await b.close(); srv.close(); process.exit(bad ? 1 : 0);
});
