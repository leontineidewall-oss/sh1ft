// sh1ft core: the clock, the payroll wallet, who held the whole shift (read from chain history), and payroll
const S = require("./_sol");
const TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", TOKEN22 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const PUMP = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
const SHIFT = 8 * 3600e3, DESKS = 100, CANDIDATES = 140, MAX_MOVES = 25;
const RESERVE = 2000000, MIN_CUT = 1000000, MIN_PAYROLL = 10000000, FEE = 5000, PER_TX = 16, LAMPORTS = 1e9;
const NOTE = "sh1ft:1:pay:";
const NAMES = ["graveyard", "day", "swing"]; // 00–08, 08–16, 16–24 utc

function cfg(){
  const seed = process.env.SHIFT_SEED || "", mint = process.env.SHIFT_MINT || "";
  return { seed, mint: S.isAddr(mint) ? mint : "", rpc: process.env.RPC_URL || "https://solana-rpc.publicnode.com",
    minUsd: +(process.env.SHIFT_MIN_USD || 50), skip: (process.env.SHIFT_SKIP || "").split(",").map(s => s.trim()).filter(S.isAddr),
    payroll: seed ? S.keypair(S.sha("sh1ft:v1:payroll:" + seed)).pub : null, live: !!(seed && S.isAddr(mint)) };
}
function payrollKey(){ const c = cfg(); if (!c.seed) throw new Error("sh1ft is not live yet"); return S.keypair(S.sha("sh1ft:v1:payroll:" + c.seed)); }
// the clock: shift n runs from n*8h to (n+1)*8h, utc
function shiftOf(t){ const n = Math.floor(t / SHIFT); return { n, start: n * SHIFT, end: (n + 1) * SHIFT, name: NAMES[n % 3], no: (n % 3) + 1 }; }

async function get(url, ms){ const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), ms || 8000);
  try { const r = await fetch(url, { signal: ctl.signal, headers: { accept: "application/json" } }); if (!r.ok) throw new Error("http " + r.status); return await r.json(); } finally { clearTimeout(to); } }
let rid = 0;
async function rpc(method, params, tries){
  const c = cfg(); let last;
  for (let i = 0; i < (tries || 3); i++) {
    try { const r = await fetch(c.rpc, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: ++rid, method, params }) });
      if (r.status === 429 || r.status >= 500) throw new Error("rpc busy");
      const j = await r.json(); if (j.error) { const e = new Error(j.error.message || "rpc error"); e.rpc = 1; throw e; } return j.result;
    } catch (e) { last = e; if (e.rpc) throw e; await new Promise(r => setTimeout(r, 300 * (i + 1))); }
  }
  throw last;
}
async function pool(items, n, fn){ const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; try { out[k] = await fn(items[k]); } catch (e) { out[k] = { error: e.message }; } } }));
  return out; }
const memo = new Map();
async function cached(key, ms, fn){ const m = memo.get(key); if (m && Date.now() - m.t < ms) return m.v; const v = await fn(); memo.set(key, { t: Date.now(), v }); return v; }

async function sol(){ return cached("sol", 30000, async () => {
  try { const j = await get("https://lite-api.jup.ag/price/v3?ids=So11111111111111111111111111111111111111112", 5000); const v = j && j.So11111111111111111111111111111111111111112; if (v && v.usdPrice) return +v.usdPrice; } catch (e) {}
  try { const j = await get("https://api.dexscreener.com/tokens/v1/solana/So11111111111111111111111111111111111111112", 5000); const p = (j || []).find(x => x.quoteToken && /USD/.test(x.quoteToken.symbol)); if (p) return +p.priceUsd; } catch (e) {} return null; }); }
// the coin: price, market cap, name from dexscreener
async function coin(){ const c = cfg(); if (!c.mint) return null; return cached("coin", 30000, async () => {
  try { const j = await get("https://api.dexscreener.com/tokens/v1/solana/" + c.mint, 7000); let best = null;
    (j || []).forEach(p => { if (!best || ((p.liquidity && p.liquidity.usd) || 0) > ((best.liquidity && best.liquidity.usd) || 0)) best = p; });
    if (!best) return null; return { sym: best.baseToken.symbol, name: best.baseToken.name, price: +best.priceUsd || null, mcap: best.marketCap || best.fdv || null, img: (best.info && best.info.imageUrl) || null, url: best.url };
  } catch (e) { return null; } }); }

// every token account of the coin: account, owner, amount; pools, programs, the payroll wallet and the curve never get a desk
async function holders(){ const c = cfg(); return cached("holders", 20000, async () => {
  const mi = await rpc("getAccountInfo", [c.mint, { encoding: "base64", dataSlice: { offset: 0, length: 0 } }]);
  if (!mi || !mi.value) throw new Error("the coin isn't on chain yet");
  const prog = mi.value.owner === TOKEN22 ? TOKEN22 : TOKEN;
  const filters = [{ memcmp: { offset: 0, bytes: c.mint } }]; if (prog === TOKEN) filters.unshift({ dataSize: 165 });
  const accs = await rpc("getProgramAccounts", [prog, { encoding: "base64", filters, dataSlice: { offset: 32, length: 40 } }], 2);
  const decimals = await rpc("getTokenSupply", [c.mint]).then(r => r.value.decimals).catch(() => 6);
  const curve = S.pda([Buffer.from("bonding-curve"), S.key(c.mint)], PUMP), skip = new Set([curve, c.payroll, ...c.skip]);
  let supply = 0n; const by = new Map();
  for (const a of accs) { const d = Buffer.from(a.account.data[0], "base64"); if (d.length < 40) continue; const amt = d.readBigUInt64LE(32); if (amt === 0n) continue; supply += amt;
    const owner = S.b58e(d.subarray(0, 32)); if (skip.has(owner) || !S.onCurve(S.key(owner))) continue;
    const o = by.get(owner); if (!o || amt > o.amt) by.set(owner, { w: owner, acct: a.pubkey, amt }); }
  const list = [...by.values()].sort((a, b) => (b.amt > a.amt ? 1 : b.amt < a.amt ? -1 : 0));
  return { list, count: list.length, supply, decimals, prog };
}); }

// one token account's moves since a moment: newest first from the chain, oldest first here
async function movesSince(acct, since){
  let out = [], before; for (let p = 0; p < 3; p++) {
    const r = await rpc("getSignaturesForAddress", [acct, Object.assign({ limit: 100 }, before ? { before } : {})]);
    out = out.concat(r); if (r.length < 100 || (r.length && (r[r.length - 1].blockTime || 0) * 1000 < since)) break; before = r[r.length - 1].signature; }
  return out.filter(s => !s.err && (s.blockTime || 0) * 1000 >= since).reverse();
}
// the owner's balance of the coin just before and just after one transaction
function balIn(tx, owner, mint){
  const f = arr => (arr || []).filter(b => b.mint === mint && b.owner === owner).reduce((s, b) => s + BigInt(b.uiTokenAmount.amount), 0n);
  return { pre: f(tx.meta.preTokenBalances), post: f(tx.meta.postTokenBalances) };
}
const txCache = new Map();
async function getTx(sig){ if (txCache.has(sig)) return txCache.get(sig); const t = await rpc("getTransaction", [sig, { encoding: "json", maxSupportedTransactionVersion: 0, commitment: "confirmed" }]); if (t) txCache.set(sig, t); if (txCache.size > 4000) txCache.clear(); return t; }

// who worked a shift: held at least the minimum when it started, and never sold during it
async function workforce(n, fresh){
  const c = cfg(), sh = shiftOf(n * SHIFT), now = Date.now(), closed = now >= sh.end, end = Math.min(now, sh.end);
  return cached("wf:" + n, fresh ? 0 : closed ? 600000 : 45000, async () => {
    const [h, cn] = await Promise.all([holders(), coin()]);
    const unit = 10n ** BigInt(h.decimals), price = cn && cn.price;
    const minTokens = price ? BigInt(Math.ceil(c.minUsd / price)) * unit : 0n;
    const cands = h.list.slice(0, CANDIDATES);
    const rows = await pool(cands, 8, async x => {
      const moves = await movesSince(x.acct, sh.start);
      if (!moves.length) return { w: x.w, start: x.amt, sold: null, now: x.amt };
      const inShift = moves.filter(m => (m.blockTime || 0) * 1000 < end);
      if (inShift.length > MAX_MOVES) return { w: x.w, busy: true, now: x.amt };
      const first = await getTx(moves[0].signature); if (!first || !first.meta) return { w: x.w, unknown: true, now: x.amt };
      const startBal = balIn(first, x.w, c.mint).pre; let sold = null;
      for (const m of inShift) { const t = m.signature === moves[0].signature ? first : await getTx(m.signature); if (!t || !t.meta) continue;
        const b = balIn(t, x.w, c.mint); if (b.post < b.pre) { sold = { at: (m.blockTime || 0) * 1000, sig: m.signature, amt: (b.pre - b.post).toString() }; break; } }
      return { w: x.w, start: startBal, sold, now: x.amt };
    });
    const ok = rows.filter(r => r && !r.error);
    const onShift = ok.filter(r => r.start != null && r.start > 0n && r.start >= minTokens && !r.sold).sort((a, b) => (b.start > a.start ? 1 : b.start < a.start ? -1 : 0)).slice(0, DESKS);
    const tot = onShift.reduce((s, r) => s + r.start, 0n);
    const workers = onShift.map(r => ({ w: r.w, bag: r.start.toString(), share: tot ? Number(r.start * 1000000n / tot) / 1e6 : 0 }));
    const fired = ok.filter(r => r.sold && r.start >= minTokens && r.start > 0n).map(r => ({ w: r.w, bag: r.start.toString(), at: r.sold.at, sig: r.sold.sig, sold: r.sold.amt }));
    const late = ok.filter(r => r.start === 0n || (r.start != null && r.start < minTokens && r.now >= minTokens)).map(r => ({ w: r.w, now: r.now.toString() }));
    return { n, name: sh.name, no: sh.no, start: sh.start, end: sh.end, closed, checked: ok.length, holders: h.count, decimals: h.decimals,
      minTokens: minTokens.toString(), minUsd: c.minUsd, price, workers, fired, late: late.length, errors: rows.length - ok.length };
  });
}

// the payroll wallet's history: fees in, wages out (each payroll carries a note naming its shift)
function parseMemo(logs){ for (const l of logs || []) { const m = /Memo \(len \d+\): "(.*)"$/.exec(l); if (m) return m[1].replace(/\\"/g, '"'); } return null; }
async function ledger(fresh){ const c = cfg(); if (!c.payroll) return { inflow: [], payrolls: [] };
  return cached("ledger", fresh ? 0 : 20000, async () => {
    const sigs = (await rpc("getSignaturesForAddress", [c.payroll, { limit: 60 }])).filter(s => !s.err);
    const txs = await pool(sigs, 6, s => getTx(s.signature));
    const inflow = [], pays = new Map();
    txs.forEach((t, i) => { if (!t || t.error || !t.meta) return; const keys = t.transaction.message.accountKeys.map(k => typeof k === "string" ? k : k.pubkey), vi = keys.indexOf(c.payroll); if (vi < 0) return;
      const d = t.meta.postBalances[vi] - t.meta.preBalances[vi], at = (t.blockTime || sigs[i].blockTime || 0) * 1000, note = parseMemo(t.meta.logMessages);
      if (note && note.indexOf(NOTE) === 0) { const id = +note.slice(NOTE.length).split(":")[0]; const p = pays.get(id) || { shift: id, t: at, sent: 0, wallets: 0, sigs: [] };
        p.sent += -d; p.wallets += Math.max(0, keys.length - 3); p.sigs.push(sigs[i].signature); p.t = Math.min(p.t, at); pays.set(id, p); }
      else if (d > 0) inflow.push({ t: at, sig: sigs[i].signature, sol: d / LAMPORTS }); });
    const payrolls = [...pays.values()].sort((a, b) => b.shift - a.shift).map(p => Object.assign(p, { sent: p.sent / LAMPORTS, name: NAMES[p.shift % 3] }));
    return { inflow, payrolls };
  }); }
async function balance(){ const c = cfg(); if (!c.payroll) return null; return (await rpc("getBalance", [c.payroll, { commitment: "confirmed" }])).value; }

// split the payable SOL by bag; cuts under the minimum drop and their share goes back to the rest
function split(list, payable){
  let rows = list.map(x => Object.assign({}, x)); for (let r = 0; r < 80; r++) {
    const tot = rows.reduce((s, x) => s + x.share, 0); if (!tot) return [];
    rows.forEach(x => { x.lamports = Math.floor(payable * x.share / tot); });
    const keep = rows.filter(x => x.lamports >= MIN_CUT); if (keep.length === rows.length) return rows; rows = keep; }
  return rows;
}
async function send(priv, payer, ixs){
  const bh = await rpc("getLatestBlockhash", [{ commitment: "confirmed" }]);
  const { msg, nSig } = S.message(payer, ixs, bh.value.blockhash);
  return rpc("sendTransaction", [S.tx(msg, nSig, [S.sign(priv, msg)]).toString("base64"), { encoding: "base64", preflightCommitment: "confirmed", maxRetries: 3 }], 1);
}
let LOCK = 0;
// payroll for the last closed shift: once per shift, to everyone who worked it, by bag
async function payroll(){
  const c = cfg(); if (!c.live) throw new Error("sh1ft is not live yet");
  if (LOCK && Date.now() - LOCK < 90000) throw new Error("payroll is already running");
  LOCK = Date.now();
  try {
    const n = shiftOf(Date.now()).n - 1, led = await ledger(true);
    if (led.payrolls.some(p => p.shift === n)) throw new Error("shift " + n + " is already paid");
    const wf = await workforce(n, true); if (!wf.workers.length) throw new Error("nobody worked shift " + n + ". the wages roll into the next one");
    const k = payrollKey(), bal = await balance(), batches = Math.ceil(wf.workers.length / PER_TX), payable = bal - RESERVE - FEE * batches;
    if (payable < MIN_PAYROLL) throw new Error("under 0.01 SOL in payroll. the wages roll into the next shift");
    const rows = split(wf.workers, payable), sigs = [];
    for (let i = 0, b = 0; i < rows.length; i += PER_TX, b++) { const part = rows.slice(i, i + PER_TX);
      sigs.push(await send(k.priv, k.pub, [S.memo(NOTE + n + ":" + (b + 1) + "/" + Math.ceil(rows.length / PER_TX)), ...part.map(x => S.transfer(k.pub, x.w, x.lamports))])); }
    memo.delete("ledger");
    return { shift: n, name: wf.name, workers: rows.length, sent: rows.reduce((s, x) => s + x.lamports, 0) / LAMPORTS, sigs };
  } finally { LOCK = 0; }
}
module.exports = { cfg, shiftOf, rpc, get, pool, sol, coin, holders, workforce, ledger, balance, split, payroll, payrollKey, SHIFT, DESKS, RESERVE, MIN_CUT, MIN_PAYROLL, LAMPORTS, NOTE, NAMES, PUMP };
