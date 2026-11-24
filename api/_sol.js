// solana bits with no dependencies: base58, ed25519 keys from a seed, PDAs, legacy transactions
const crypto = require("crypto");
const A = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function b58e(bytes){ let n = 0n, s = ""; for (const b of bytes) n = n * 256n + BigInt(b); while (n > 0n) { s = A[Number(n % 58n)] + s; n /= 58n; } for (const b of bytes) { if (b) break; s = "1" + s; } return s; }
function b58d(str){ let n = 0n; for (const c of String(str)) { const i = A.indexOf(c); if (i < 0) throw new Error("bad base58"); n = n * 58n + BigInt(i); } const out = []; while (n > 0n) { out.unshift(Number(n % 256n)); n /= 256n; } for (const c of String(str)) { if (c !== "1") break; out.unshift(0); } return Buffer.from(out); }
function key(str){ const b = b58d(str); if (b.length !== 32) throw new Error("bad address"); return b; }
const isAddr = s => { try { return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s) && key(s).length === 32; } catch (e) { return false; } };
// ed25519: is this 32-byte string a point on the curve? (PDAs and pool vaults are off it)
const P = 2n ** 255n - 19n;
const md = (a) => ((a % P) + P) % P;
function pw(b, e){ let r = 1n; b = md(b); while (e > 0n) { if (e & 1n) r = r * b % P; b = b * b % P; e >>= 1n; } return r; }
const D = md(-121665n * pw(121666n, P - 2n));
const I = pw(2n, (P - 1n) / 4n);
function onCurve(b32){
  const b = Buffer.from(b32); const y = BigInt("0x" + Buffer.from(b).reverse().toString("hex")) & ((1n << 255n) - 1n);
  if (y >= P) return false;
  const u = md(y * y - 1n), v = md(D * y * y + 1n);
  let x = md(u * pw(v, 3n) * pw(u * pw(v, 7n), (P - 5n) / 8n));
  const vx2 = md(v * x * x);
  if (vx2 === u) return true;
  if (vx2 === md(-u)) return true;
  return false;
}
function pda(seeds, program){
  const pid = key(program);
  for (let bump = 255; bump >= 0; bump--) {
    const h = crypto.createHash("sha256").update(Buffer.concat([...seeds.map(s => Buffer.from(s)), Buffer.from([bump]), pid, Buffer.from("ProgramDerivedAddress")])).digest();
    if (!onCurve(h)) return b58e(h);
  }
  throw new Error("no pda");
}
// a signing key from 32 seed bytes
function keypair(seed32){
  const der = Buffer.concat([Buffer.from("302e020100300506032b657004220420", "hex"), Buffer.from(seed32)]);
  const priv = crypto.createPrivateKey({ key: der, format: "der", type: "pkcs8" });
  const pub = crypto.createPublicKey(priv).export({ format: "der", type: "spki" }).subarray(-32);
  return { priv, pub: b58e(pub) };
}
const sha = (s) => crypto.createHash("sha256").update(s).digest();
// compact-u16
function cu16(n){ const o = []; for (;;) { let b = n & 127; n >>= 7; if (n) o.push(b | 128); else { o.push(b); return o; } } }
const SYS = "11111111111111111111111111111111";
const MEMO = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
function u64(n){ const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; }
const transfer = (from, to, lamports) => ({ program: SYS, keys: [{ k: from, s: 1, w: 1 }, { k: to, s: 0, w: 1 }], data: Buffer.concat([Buffer.from([2, 0, 0, 0]), u64(lamports)]) });
const memo = (text) => ({ program: MEMO, keys: [], data: Buffer.from(text, "utf8") });
// legacy message: payer first, then signers, writable before readonly
function message(payer, ixs, blockhash){
  const m = new Map(); const add = (k, s, w) => { const o = m.get(k) || { s: 0, w: 0 }; o.s |= s; o.w |= w; m.set(k, o); };
  add(payer, 1, 1); ixs.forEach(ix => { ix.keys.forEach(a => add(a.k, a.s, a.w)); add(ix.program, 0, 0); });
  const all = [...m.entries()], rank = ([k, o]) => (k === payer ? 0 : o.s && o.w ? 1 : o.s ? 2 : o.w ? 3 : 4);
  all.sort((a, b) => rank(a) - rank(b));
  const keys = all.map(e => e[0]), nSig = all.filter(e => e[1].s).length, nRoSig = all.filter(e => e[1].s && !e[1].w).length, nRo = all.filter(e => !e[1].s && !e[1].w).length;
  const out = [Buffer.from([nSig, nRoSig, nRo]), Buffer.from(cu16(keys.length)), ...keys.map(key), key(blockhash), Buffer.from(cu16(ixs.length))];
  ixs.forEach(ix => { out.push(Buffer.from([keys.indexOf(ix.program)]), Buffer.from(cu16(ix.keys.length)), Buffer.from(ix.keys.map(a => keys.indexOf(a.k))), Buffer.from(cu16(ix.data.length)), ix.data); });
  return { msg: Buffer.concat(out), nSig };
}
// a full transaction: signatures (empty ones are zeros) then the message
function tx(msg, nSig, sigs){ const s = []; for (let i = 0; i < nSig; i++) s.push(sigs && sigs[i] ? sigs[i] : Buffer.alloc(64)); return Buffer.concat([Buffer.from(cu16(nSig)), ...s, msg]); }
const sign = (priv, msg) => crypto.sign(null, msg, priv);
module.exports = { b58e, b58d, key, isAddr, onCurve, pda, keypair, sha, transfer, memo, message, tx, sign, SYS, MEMO };
