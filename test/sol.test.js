const s = require("../api/_sol"); const crypto = require("crypto"); let ok = 0, bad = 0; const t = (c, n) => { c ? ok++ : (bad++, console.log("FAIL", n)); };
// base58 round trip
const k = s.keypair(s.sha("x")); t(s.b58e(s.b58d(k.pub)).toString() === k.pub, "b58");
t(s.b58e(Buffer.alloc(32)) === "11111111111111111111111111111111", "zeros");
// known PDA: associated token account of a known wallet+mint (from the spl docs)
t(s.onCurve(s.key(k.pub)) === true, "pubkey on curve");
const ata = s.pda([s.key("4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T"), s.key("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), s.key("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")], "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
t(s.onCurve(s.key(ata)) === false, "pda off curve");
console.log("ata", ata);
// sign + verify a transfer message
const to = s.keypair(s.sha("y")).pub;
const { msg, nSig } = s.message(k.pub, [s.transfer(k.pub, to, 12345), s.memo("heir:1:checkin:abc")], "11111111111111111111111111111111");
const sig = s.sign(k.priv, msg);
const pubDer = Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), s.key(k.pub)]);
t(crypto.verify(null, msg, crypto.createPublicKey({ key: pubDer, format: "der", type: "spki" }), sig), "verify");
t(nSig === 1 && msg[0] === 1 && msg[1] === 0 && msg[2] === 2, "header " + [...msg.subarray(0, 3)]);
const full = s.tx(msg, nSig, [sig]); t(full.length === 1 + 64 + msg.length, "tx len");
console.log(ok + " pass, " + bad + " fail");
