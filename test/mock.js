// a fake Solana + DexScreener + Jupiter so sh1ft runs end to end offline
module.exports = function(opts){
  opts = opts || {};
  if (!opts.dark) { process.env.SHIFT_SEED = "test-seed"; process.env.SHIFT_MIN_USD = "100"; }
  const S = require("../api/_sol"), kp = s => S.keypair(S.sha(s)).pub;
  const MINT = kp("mint"); if (!opts.dark) process.env.SHIFT_MINT = MINT;
  const L = require("../api/_lib"), SH = L.SHIFT, now = Date.now(), cur = L.shiftOf(now), prev = L.shiftOf(now - SH);
  const PAY = opts.dark ? null : L.cfg().payroll, U = 1000000n; // 6 decimals
  // 60 holders: bags fall with rank; a few with stories
  const H = Array.from({ length: 60 }, (_, i) => ({ w: kp("h" + i), acct: kp("a" + i), amt: BigInt(Math.floor(5e7 / (i + 1))) * U }));
  const tx = {}, sigsOf = {};
  const move = (i, t, pre, post, sig) => { const h = H[i]; tx[sig] = { blockTime: Math.floor(t / 1000), meta: { err: null, preTokenBalances: pre == null ? [] : [{ accountIndex: 1, mint: MINT, owner: h.w, uiTokenAmount: { amount: String(pre) } }], postTokenBalances: [{ accountIndex: 1, mint: MINT, owner: h.w, uiTokenAmount: { amount: String(post) } }], preBalances: [1, 1], postBalances: [1, 1], logMessages: [] }, transaction: { message: { accountKeys: [h.w, h.acct] } } };
    (sigsOf[h.acct] = sigsOf[h.acct] || []).unshift({ signature: sig, err: null, blockTime: Math.floor(t / 1000) }); };
  // h1 sells part of its bag in this shift: fired
  move(1, cur.start + 60000, H[1].amt + 1000n * U, H[1].amt, "sell1");
  // h2 buys more in this shift: still on shift, wage on what it held at the start
  move(2, cur.start + 90000, H[2].amt - 2000000n * U, H[2].amt, "buy2");
  // h3 only arrived in this shift: late
  move(3, cur.start + 120000, null, H[3].amt, "new3");
  // h4 sold in the last shift, then sat still: fired then, on shift now
  move(4, prev.start + 3600e3, H[4].amt + 500n * U, H[4].amt, "sell4");
  // the payroll wallet: fees landing, and one payroll two shifts back
  const payTx = {}; const paySigs = [];
  if (PAY) { [[now - 7200e3, 0.42e9], [now - 3600e3, 0.31e9]].forEach(([t, amt], i) => { const s = "fee" + i; payTx[s] = { blockTime: Math.floor(t / 1000), meta: { err: null, preBalances: [5e9, 1e8], postBalances: [5e9 - amt, 1e8 + amt], logMessages: [] }, transaction: { message: { accountKeys: [kp("pump"), PAY] } } }; paySigs.unshift({ signature: s, err: null, blockTime: Math.floor(t / 1000) }); });
    if (!opts.paidPrev) {} else { const s = "paid" + (cur.n - 1); payTx[s] = { blockTime: Math.floor((cur.start + 600e3) / 1000), meta: { err: null, preBalances: [9e8, 0, 0, 1, 1], postBalances: [3e8, 3e8, 3e8, 1, 1], logMessages: ['Program log: Memo (len 20): "sh1ft:1:pay:' + (cur.n - 1) + ':1/1"'] }, transaction: { message: { accountKeys: [PAY, H[0].w, H[2].w, "11111111111111111111111111111111", S.MEMO] } } }; paySigs.unshift({ signature: s, err: null, blockTime: payTx[s].blockTime }); }
    const s = "paid" + (cur.n - 2); payTx[s] = { blockTime: Math.floor((prev.start + 600e3) / 1000), meta: { err: null, preBalances: [8e8, 0, 0, 1, 1], postBalances: [2e8, 3e8, 3e8, 1, 1], logMessages: ['Program log: Memo (len 20): "sh1ft:1:pay:' + (cur.n - 2) + ':1/1"'] }, transaction: { message: { accountKeys: [PAY, H[0].w, H[5].w, "11111111111111111111111111111111", S.MEMO] } } }; paySigs.push({ signature: s, err: null, blockTime: payTx[s].blockTime }); }
  const sent = []; let balance = 1.24e9;
  global.fetch = async (url, o) => {
    const ok = j => ({ ok: true, status: 200, json: async () => j });
    if (/jup\.ag/.test(url)) return ok({ So11111111111111111111111111111111111111112: { usdPrice: 141.37 } });
    if (/dexscreener/.test(url)) return ok(url.indexOf(MINT) >= 0 ? [{ baseToken: { address: MINT, symbol: "SH1FT", name: "sh1ft" }, priceUsd: "0.0001", marketCap: 98400, liquidity: { usd: 5000 }, url: "https://dexscreener.com/solana/" + MINT }] : []);
    const b = JSON.parse(o.body), p = b.params; let r = null;
    switch (b.method) {
      case "getAccountInfo": r = { value: { owner: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", lamports: 1 } }; break;
      case "getTokenSupply": r = { value: { decimals: 6 } }; break;
      case "getProgramAccounts": r = H.map(h => { const d = Buffer.alloc(40); S.key(h.w).copy(d, 0); d.writeBigUInt64LE(h.amt, 32); return { pubkey: h.acct, account: { data: [d.toString("base64")] } }; }); break;
      case "getSignaturesForAddress": r = p[0] === PAY ? paySigs : (sigsOf[p[0]] || []); break;
      case "getTransaction": r = tx[p[0]] || payTx[p[0]] || null; break;
      case "getBalance": r = { value: balance }; break;
      case "getLatestBlockhash": r = { value: { blockhash: "11111111111111111111111111111111" } }; break;
      case "sendTransaction": sent.push(p[0]); r = "5ig" + sent.length; break;
    }
    return ok({ result: r });
  };
  return { MINT, PAY, H, sent, cur, prev, kp };
};
