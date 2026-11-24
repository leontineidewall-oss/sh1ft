// the api against the mock chain
const M = require("./mock")({ paidPrev: process.env.PAID === "1" }); const H = require("../api/shift"), S = require("../api/_sol"), L = require("../api/_lib");
let ok = 0, bad = 0; const t = (c, n) => { c ? ok++ : (bad++, console.log("FAIL", n)); };
const call = (qs, method) => new Promise(res => { const out = { statusCode: 0, h: {} }; H({ url: "/api/shift?" + qs, method: method || "GET" }, { set statusCode(v){ out.statusCode = v; }, get statusCode(){ return out.statusCode; }, setHeader(k, v){ out.h[k] = v; }, end(b){ res({ code: out.statusCode, body: JSON.parse(b), h: out.h }); } }); });
(async () => {
  let r = await call("action=config"); t(r.code === 200 && r.body.live && r.body.payroll === M.PAY && r.body.desks === 100, "config");
  t(r.body.shift.end - r.body.shift.start === 8 * 3600e3 && ["graveyard", "day", "swing"].includes(r.body.shift.name), "clock");
  r = await call("action=state"); const o = r.body.office;
  t(r.code === 200 && r.body.balance === 1.24 && Math.abs(r.body.payable - 1.238) < 1e-9, "payroll balance");
  t(o.minTokens === 1000000, "min is $100 at the coin's price");
  const desk = w => o.desks.findIndex(d => d.w === w);
  t(desk(M.H[0].w) === 0, "top holder at desk 1");
  t(desk(M.H[1].w) < 0 && o.boxes.some(b => b.w === M.H[1].w && b.sig === "sell1"), "seller fired, desk boxed");
  t(desk(M.H[2].w) >= 0 && o.desks[desk(M.H[2].w)].bag === Number((M.H[2].amt - 2000000n * 1000000n) / 1000000n), "buyer keeps desk, wage on starting bag");
  t(desk(M.H[3].w) < 0 && o.late >= 1, "newcomer is late");
  t(desk(M.H[4].w) >= 0, "last shift's seller is back on shift now");
  t(desk(M.H[55].w) < 0, "under the minimum: no desk");
  t(Math.abs(o.desks.reduce((s, d) => s + d.share, 0) - 1) < 0.001, "shares add to 1");
  r = await call("action=desks&n=" + (M.cur.n - 1)); t(r.code === 200 && r.body.closed && r.body.fired.some(f => f.w === M.H[4].w) && r.body.workers.some(w => w.w === M.H[1].w), "last shift roster");
  r = await call("action=desks&n=" + (M.cur.n - 20)); t(r.code === 400, "old shifts refused");
  r = await call("action=me&w=" + M.H[0].w); t(r.body.status === "on" && r.body.desk === 1 && r.body.wage > 0, "me: on shift with a wage");
  r = await call("action=me&w=" + M.H[1].w); t(r.body.status === "fired", "me: fired");
  r = await call("action=me&w=" + M.H[3].w); t(r.body.status === "late", "me: late");
  r = await call("action=me&w=" + M.kp("nobody")); t(r.body.status === "off", "me: off");
  r = await call("action=me&w=nope"); t(r.code === 400, "me: bad address");
  r = await call("action=ledger"); const p2 = r.body.payrolls.find(p => p.shift === M.cur.n - 2); t(p2 && Math.abs(p2.sent - 0.6) < 1e-9 && p2.wallets === 2 && r.body.inflow.length === 2 && r.body.payrolls[0].shift >= p2.shift, "ledger");
  r = await call("action=pay"); t(r.code === 405, "pay needs POST");
  r = await call("action=pay", "POST");
  if (process.env.PAID === "1") t(r.code === 409 && /already paid/.test(r.body.error), "no double payroll");
  else {
    t(r.code === 200 && r.body.shift === M.cur.n - 1 && r.body.workers > 0 && M.sent.length === Math.ceil(r.body.workers / 16), "payroll runs for the last shift");
    const raw = Buffer.from(M.sent[0], "base64"); t(raw.toString("utf8").indexOf("sh1ft:1:pay:" + (M.cur.n - 1) + ":1/") > 0, "payroll tx carries the shift note");
    t(Math.abs(r.body.sent - (1.24e9 - 2e6 - 5000 * M.sent.length) / 1e9) < 0.001, "pays out the balance minus the reserve");
    const prevRoster = await L.workforce(M.cur.n - 1); t(!prevRoster.workers.some(w => w.w === M.H[4].w), "last shift's seller gets no wage");
  }
  t(L.split([{ w: "a", share: .999 }, { w: "b", share: .001 }], 1e8).length === 1, "tiny cuts drop");
  t(L.shiftOf(Date.UTC(2026, 0, 1, 7, 59)).name === "graveyard" && L.shiftOf(Date.UTC(2026, 0, 1, 8, 0)).name === "day" && L.shiftOf(Date.UTC(2026, 0, 1, 16, 0)).name === "swing", "shift names");
  console.log(ok + " pass, " + bad + " fail"); process.exit(bad ? 1 : 0);
})();
