// one endpoint, many actions: /api/shift?action=config|state|desks|me|ledger|pay|cron
const L = require("./_lib"), S = require("./_sol");
function send(res, code, body, age){ res.statusCode = code; res.setHeader("content-type", "application/json; charset=utf-8"); res.setHeader("cache-control", age ? "public, s-maxage=" + age + ", stale-while-revalidate=" + age * 3 : "no-store"); res.end(JSON.stringify(body)); }
const q = (req, k) => { const u = new URL(req.url, "http://x"); return (u.searchParams.get(k) || "").trim(); };
const clock = () => { const s = L.shiftOf(Date.now()); return { n: s.n, name: s.name, no: s.no, start: s.start, end: s.end, prev: s.n - 1 }; };
const dark = () => ({ live: false, shift: clock(), t: Date.now() });
const tok = (s, d) => s == null ? null : Number(BigInt(s) * 1000n / 10n ** BigInt(d)) / 1000;
const A = {
  async config(){ const c = L.cfg(); return [200, { live: c.live, mint: c.mint || null, payroll: c.payroll, minUsd: c.minUsd, desks: L.DESKS, hours: 8, reserve: L.RESERVE / L.LAMPORTS, minCut: L.MIN_CUT / L.LAMPORTS, minPayroll: L.MIN_PAYROLL / L.LAMPORTS, shift: clock(), sol: await L.sol(), t: Date.now() }, 30]; },
  // everything the office needs in one call
  async state(){
    const c = L.cfg(); if (!c.live) return [200, Object.assign(dark(), { sol: await L.sol() }), 20];
    const sh = clock();
    const [sol, cn, bal, led, wf] = await Promise.all([L.sol(), L.coin(), L.balance().catch(() => null), L.ledger().catch(() => ({ inflow: [], payrolls: [] })), L.workforce(sh.n).catch(e => ({ error: e.message }))]);
    const payable = bal != null ? Math.max(0, bal - L.RESERVE) / L.LAMPORTS : null;
    const d = wf.decimals || 6;
    return [200, { live: true, t: Date.now(), shift: sh, sol, coin: cn, mint: c.mint, payroll: c.payroll, balance: bal != null ? bal / L.LAMPORTS : null, payable,
      office: wf.error ? { error: wf.error } : { holders: wf.holders, checked: wf.checked, onShift: wf.workers.length, fired: wf.fired.length, late: wf.late, minTokens: tok(wf.minTokens, d), minUsd: wf.minUsd,
        desks: wf.workers.map(x => ({ w: x.w, bag: tok(x.bag, d), share: x.share })), boxes: wf.fired.map(x => ({ w: x.w, at: x.at, sig: x.sig })) },
      last: led.payrolls[0] || null, paid: led.payrolls.reduce((s, p) => s + p.sent, 0), payrolls: led.payrolls.length, prevPaid: led.payrolls.some(p => p.shift === sh.prev) }, 15];
  },
  // the full roster of one shift (default: now)
  async desks(req){
    if (!L.cfg().live) return [200, dark(), 20];
    const now = clock(), n = q(req, "n") ? +q(req, "n") : now.n; if (!(n <= now.n && n > now.n - 9)) return [400, { error: "only the last 8 shifts are on file here" }];
    const wf = await L.workforce(n), d = wf.decimals;
    return [200, { live: true, n, name: wf.name, start: wf.start, end: wf.end, closed: wf.closed, minTokens: tok(wf.minTokens, d), minUsd: wf.minUsd, holders: wf.holders, checked: wf.checked,
      workers: wf.workers.map(x => ({ w: x.w, bag: tok(x.bag, d), share: x.share })), fired: wf.fired.map(x => ({ w: x.w, bag: tok(x.bag, d), at: x.at, sig: x.sig, sold: tok(x.sold, d) })), late: wf.late }, wf.closed ? 300 : 20];
  },
  // am i on shift?
  async me(req){
    const w = q(req, "w"); if (!S.isAddr(w)) return [400, { error: "that isn't a Solana address" }];
    if (!L.cfg().live) return [200, Object.assign(dark(), { w, status: "closed" }), 10];
    const sh = clock(), [wf, bal] = await Promise.all([L.workforce(sh.n), L.balance().catch(() => null)]), d = wf.decimals;
    const i = wf.workers.findIndex(x => x.w === w), f = wf.fired.find(x => x.w === w), payable = bal != null ? Math.max(0, bal - L.RESERVE) / L.LAMPORTS : null;
    let status = "off", detail = "this wallet isn't holding enough to clock in (top " + L.DESKS + " holders, at least $" + wf.minUsd + ").";
    if (i >= 0) { status = "on"; detail = "on shift at desk " + (i + 1) + ". hold until " + new Date(sh.end).toISOString().slice(11, 16) + " utc to get paid."; }
    else if (f) { status = "fired"; detail = "sold during this shift. fired. clock back in next shift by holding from the start."; }
    else { const h = (await L.holders()).list.find(x => x.w === w); if (h && BigInt(wf.minTokens) <= h.amt) { status = "late"; detail = "holding, but not since this shift started. you clock in at the next one."; } }
    const row = i >= 0 ? wf.workers[i] : null;
    return [200, { live: true, w, status, detail, desk: i >= 0 ? i + 1 : null, bag: row ? tok(row.bag, d) : null, share: row ? row.share : null, wage: row && payable != null ? payable * row.share : null, shift: sh }, 10];
  },
  async ledger(){ if (!L.cfg().live) return [200, Object.assign(dark(), { inflow: [], payrolls: [] }), 20]; const l = await L.ledger(); return [200, Object.assign({ live: true, t: Date.now() }, l), 15]; },
  async pay(req){ if (req.method !== "POST") return [405, { error: "POST" }]; try { return [200, await L.payroll()]; } catch (e) { return [409, { error: e.message }]; } },
  // vercel cron, once a day: same as pressing run payroll
  async cron(){ try { return [200, await L.payroll()]; } catch (e) { return [200, { skip: e.message }]; } },
};
module.exports = async (req, res) => {
  const a = A[q(req, "action")]; if (!a) return send(res, 400, { error: "unknown action" });
  try { const [code, body, age] = await a(req); send(res, code, body, code === 200 ? age : 0); }
  catch (e) { send(res, 502, { error: (e && e.message) || "unavailable right now" }); }
};
