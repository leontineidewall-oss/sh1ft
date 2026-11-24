// sh1ft · shared: helpers, the api, the clock, the sound, the wallet (read only) and the terminal
(function(){
const H = window.SH = {};
H.$ = (s, r) => (r || document).querySelector(s); H.$$ = (s, r) => [...(r || document).querySelectorAll(s)];
H.esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
H.short = (a, n) => a ? a.slice(0, n || 4) + "…" + a.slice(-(n || 4)) : "—";
H.num = (v, d) => v == null || isNaN(v) ? "—" : Number(v).toLocaleString("en-US", { maximumFractionDigits: d == null ? 2 : d, minimumFractionDigits: 0 });
H.big = v => v == null ? "—" : v >= 1e9 ? (v / 1e9).toFixed(2) + "B" : v >= 1e6 ? (v / 1e6).toFixed(2) + "M" : v >= 1e3 ? (v / 1e3).toFixed(1) + "K" : H.num(v, 0);
H.sol = (v, d) => v == null || isNaN(v) ? "—" : Number(v).toFixed(d == null ? 3 : d) + " SOL";
H.usd = v => v == null || isNaN(v) ? "—" : "$" + (v >= 1 ? H.num(v, 2) : Number(v).toPrecision(3));
H.pct = v => v == null || isNaN(v) ? "—" : (v * 100).toFixed(v < .01 ? 2 : 1) + "%";
H.left = ms => { ms = Math.max(0, ms); const s = Math.floor(ms / 1000); return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(x => String(x).padStart(2, "0")).join(":"); };
H.ago = t => { const s = Math.max(0, (Date.now() - t) / 1000); return s < 60 ? Math.floor(s) + "s ago" : s < 3600 ? Math.floor(s / 60) + "m ago" : s < 86400 ? Math.floor(s / 3600) + "h ago" : Math.floor(s / 86400) + "d ago"; };
H.utc = t => new Date(t).toISOString().slice(11, 16) + " utc";
H.scan = (k, v) => "https://solscan.io/" + k + "/" + v;
H.isAddr = s => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s || "");
// the clock is the same everywhere: 00–08 graveyard, 08–16 day, 16–24 swing (utc)
H.SHIFT = 8 * 3600e3; H.NAMES = ["graveyard", "day", "swing"];
H.shift = t => { t = t || Date.now(); const n = Math.floor(t / H.SHIFT); return { n, start: n * H.SHIFT, end: (n + 1) * H.SHIFT, name: H.NAMES[n % 3], no: n % 3 + 1 }; };
H.api = async (action, qs, opt) => { const r = await fetch("/api/shift?action=" + action + (qs ? "&" + qs : ""), Object.assign({ headers: { accept: "application/json" } }, opt || {})); let j; try { j = await r.json(); } catch (e) { j = { error: "unavailable right now" }; } if (!r.ok && !j.error) j.error = "unavailable right now"; return j; };
H.state = null; H.load = async () => { try { H.state = await H.api("state"); } catch (e) { H.state = { error: "offline" }; } document.dispatchEvent(new CustomEvent("sh:state", { detail: H.state })); return H.state; };
H.copy = (txt, el) => { try { navigator.clipboard.writeText(txt); } catch (e) {} if (el) { const o = el.textContent; el.textContent = "copied"; setTimeout(() => { el.textContent = o; }, 1100); } };
H.toast = (msg) => { let t = H.$("#toast"); if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t); } t.textContent = msg; t.classList.add("on"); clearTimeout(H._tt); H._tt = setTimeout(() => t.classList.remove("on"), 2600); };
// a wallet, read only: sh1ft never asks you to sign anything
H.wallet = null;
H.connect = async () => { const p = window.phantom && window.phantom.solana || window.solana || (window.solflare && window.solflare.isSolflare ? window.solflare : null) || (window.backpack && window.backpack.solana);
  if (!p) throw new Error("no solana wallet found in this browser. paste your address instead"); const r = await p.connect(); H.wallet = (r && r.publicKey || p.publicKey).toString(); document.dispatchEvent(new CustomEvent("sh:wallet")); return H.wallet; };

// sound: written in code, no files. the hum of the tubes, a strike when one comes on, a tick, a chime for payroll
H.sound = { on: true, ctx: null, hum: null };
try { H.sound.on = localStorage.getItem("sh1ft.sound") !== "off"; } catch (e) {}
H.audio = () => { const S = H.sound; if (!S.on) return null; if (!S.ctx) { try { S.ctx = new (window.AudioContext || window.webkitAudioContext)(); S.out = S.ctx.createGain(); S.out.gain.value = .5; S.out.connect(S.ctx.destination); } catch (e) { return null; } } if (S.ctx.state === "suspended") S.ctx.resume(); return S.ctx; };
H.hum = (on) => { const a = H.audio(), S = H.sound; if (!a) return; if (on && !S.hum) { const g = a.createGain(); g.gain.value = 0; g.connect(S.out); const fs = [60, 120, 180, 240.4].map((f, i) => { const o = a.createOscillator(); o.type = i ? "sine" : "triangle"; o.frequency.value = f; const og = a.createGain(); og.gain.value = [.05, .03, .012, .008][i]; o.connect(og); og.connect(g); o.start(); return o; });
    g.gain.linearRampToValueAtTime(.5, a.currentTime + 2); S.hum = { g, fs }; } else if (!on && S.hum) { const h = S.hum; h.g.gain.linearRampToValueAtTime(0, a.currentTime + .4); setTimeout(() => h.fs.forEach(o => o.stop()), 500); S.hum = null; } };
H.strike = (d) => { const a = H.audio(); if (!a) return; const t = a.currentTime + (d || 0), n = a.createBufferSource(), buf = a.createBuffer(1, a.sampleRate * .06, a.sampleRate), ch = buf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
  n.buffer = buf; const ng = a.createGain(); ng.gain.value = .12; n.connect(ng); ng.connect(H.sound.out); n.start(t);
  const o = a.createOscillator(), g = a.createGain(); o.frequency.value = 1800 + Math.random() * 900; g.gain.setValueAtTime(.05, t + .04); g.gain.exponentialRampToValueAtTime(.0001, t + .9); o.connect(g); g.connect(H.sound.out); o.start(t + .04); o.stop(t + 1); };
H.tick = () => { const a = H.audio(); if (!a) return; const o = a.createOscillator(), g = a.createGain(), t = a.currentTime; o.type = "square"; o.frequency.value = 2400; g.gain.setValueAtTime(.025, t); g.gain.exponentialRampToValueAtTime(.0001, t + .03); o.connect(g); g.connect(H.sound.out); o.start(t); o.stop(t + .05); };
H.chime = () => { const a = H.audio(); if (!a) return; [523.25, 659.25, 783.99].forEach((f, i) => { const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + i * .12; o.frequency.value = f; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.06, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + 1.2); o.connect(g); g.connect(H.sound.out); o.start(t); o.stop(t + 1.3); }); };
H.setSound = v => { H.sound.on = v; try { localStorage.setItem("sh1ft.sound", v ? "on" : "off"); } catch (e) {} if (!v) H.hum(false); H.$$("[data-sound]").forEach(b => b.classList.toggle("off", !v)); document.dispatchEvent(new CustomEvent("sh:sound")); };

// the terminal: every room is also a command
H.ROOMS = ["office", "payroll", "desks", "me", "ledger", "rules", "terminal"];
H.cmds = {};
H.def = (name, help, fn) => { H.cmds[name] = { help, fn }; };
H.termWin = (prompt) => '<div class="term"><div class="tbody"></div><label class="tline"><span class="pr">' + (prompt || "sh1ft:~$") + '</span><input spellcheck="false" autocomplete="off" aria-label="terminal"></label></div>';
H.term = (root) => { const body = H.$(".tbody", root), inp = H.$("input", root), hist = []; let hi = 0;
  const T = { root, print(html, cls){ const d = document.createElement("div"); d.className = "tl " + (cls || ""); d.innerHTML = html; body.appendChild(d); body.scrollTop = body.scrollHeight; return d; }, clear(){ body.innerHTML = ""; },
    async run(line, echo){ line = String(line || "").trim(); if (!line) return; if (echo !== false) T.print('<span class="pr">' + H.esc(root.dataset.prompt || "sh1ft:~$") + "</span> " + H.esc(line), "echo"); hist.push(line); hi = hist.length;
      const [c, ...args] = line.split(/\s+/), k = H.cmds[c.toLowerCase()]; if (!k) return T.print("not a command: " + H.esc(c) + '. type <u data-run="help">help</u>', "dim");
      const t0 = performance.now(); try { await k.fn(args, T); } catch (e) { T.print(H.esc(e.message || "failed"), "err"); } const ms = Math.round(performance.now() - t0); if (ms > 120) T.print("✓ " + ms + "ms", "dim ms"); } };
  inp.addEventListener("keydown", e => { if (e.key === "Enter") { const v = inp.value; inp.value = ""; T.run(v); }
    else if (e.key === "ArrowUp") { hi = Math.max(0, hi - 1); inp.value = hist[hi] || ""; e.preventDefault(); } else if (e.key === "ArrowDown") { hi = Math.min(hist.length, hi + 1); inp.value = hist[hi] || ""; e.preventDefault(); }
    else if (e.key === "Tab") { e.preventDefault(); const v = inp.value.toLowerCase(), m = Object.keys(H.cmds).filter(k => k.startsWith(v)); if (m.length === 1) inp.value = m[0] + " "; else if (m.length) T.print(m.join("  "), "dim"); } });
  body.addEventListener("click", e => { const u = e.target.closest("[data-run]"); if (u) T.run(u.dataset.run); else if (!getSelection().toString()) inp.focus(); });
  root.T = T; return T; };

// the shared commands
const S = () => H.state || {};
const row = (k, v) => '<span class="k">' + k.padEnd(16, ".") + "</span> " + v;
H.def("help", "this list", (a, T) => { T.print(Object.entries(H.cmds).map(([k, v]) => '<u data-run="' + k + '">' + k.padEnd(10) + "</u> " + H.esc(v.help)).join("\n"), "pre"); });
H.def("clear", "clear the screen", (a, T) => T.clear());
H.def("shift", "the clock: which shift, and how long until payroll", (a, T) => { const s = H.shift(); T.print([row("shift", "#" + s.n + " · " + s.name + " (" + s.no + "/3)"), row("started", H.utc(s.start)), row("payroll in", H.left(s.end - Date.now())), row("next", H.shift(s.end + 1).name + " at " + H.utc(s.end))].join("\n"), "pre"); });
H.def("office", "who is on shift right now", async (a, T) => { const s = await H.load(); if (!s.live) return T.print("the office opens when $SH1FT launches. desks: —", "dim"); const o = s.office || {}; if (o.error) return T.print(H.esc(o.error), "err");
  T.print([row("on shift", (o.onShift == null ? "—" : o.onShift) + " / 100 desks"), row("fired", o.fired == null ? "—" : String(o.fired)), row("clocked in late", o.late == null ? "—" : String(o.late)), row("minimum bag", o.minTokens ? H.big(o.minTokens) + " ($" + o.minUsd + ")" : "—"), row("payroll", H.sol(s.payable)), row("holders checked", o.checked == null ? "—" : o.checked + " of " + o.holders)].join("\n"), "pre"); });
H.def("desks", "the roster: desks [last]", async (a, T) => { const s = H.shift(), n = a[0] === "last" ? s.n - 1 : s.n, j = await H.api("desks", "n=" + n); if (!j.live) return T.print("no desks yet. the office opens when $SH1FT launches.", "dim"); if (j.error) return T.print(H.esc(j.error), "err");
  T.print("shift #" + j.n + " · " + j.name + (j.closed ? " · closed" : " · open") + "\n" + (j.workers.length ? j.workers.slice(0, 25).map((w, i) => String(i + 1).padStart(3, "0") + "  " + H.short(w.w, 5) + "  " + H.big(w.bag).padStart(8) + "  " + H.pct(w.share)).join("\n") : "-- nobody on shift") + (j.workers.length > 25 ? "\n… " + (j.workers.length - 25) + " more" : "") + (j.fired.length ? "\nfired: " + j.fired.map(f => H.short(f.w, 4)).join(", ") : ""), "pre"); });
H.def("me", "am i on shift? me <wallet>", async (a, T) => { const w = a[0] || H.wallet; if (!w) return T.print('paste a wallet: me <address>, or <u data-run="connect">connect</u>', "dim"); if (!H.isAddr(w)) return T.print("that isn't a Solana address", "err");
  const j = await H.api("me", "w=" + w); if (j.error) return T.print(H.esc(j.error), "err"); if (!j.live) return T.print("the office opens when $SH1FT launches.", "dim");
  T.print([row("wallet", H.short(w, 6)), row("status", j.status.toUpperCase()), j.desk ? row("desk", String(j.desk).padStart(3, "0")) : "", j.bag != null ? row("bag at clock-in", H.big(j.bag)) : "", j.wage != null ? row("wage if paid now", H.sol(j.wage, 4)) : "", H.esc(j.detail)].filter(Boolean).join("\n"), "pre"); });
H.def("check", "same as me, for any wallet", (a, T) => H.cmds.me.fn(a, T));
H.def("payroll", "the payroll wallet and the last payroll", async (a, T) => { const s = await H.load(); if (!s.live) return T.print("payroll opens when $SH1FT launches. balance: —", "dim");
  T.print([row("wallet", s.payroll ? H.short(s.payroll, 6) : "—"), row("balance", H.sol(s.balance)), row("payable", H.sol(s.payable)), row("next payroll", H.utc(s.shift.end) + " (" + H.left(s.shift.end - Date.now()) + ")"), row("last payroll", s.last ? "shift #" + s.last.shift + " · " + H.sol(s.last.sent) + " to " + s.last.wallets + " · " + H.ago(s.last.t) : "—"), row("paid so far", H.sol(s.paid))].join("\n"), "pre"); });
H.def("run", "run payroll for the last shift (anyone can)", async (a, T) => { T.print("running payroll for shift #" + (H.shift().n - 1) + "…", "dim"); const j = await H.api("pay", "", { method: "POST" }); if (j.error) return T.print(H.esc(j.error), "err");
  H.chime(); T.print("paid " + H.sol(j.sent, 4) + " to " + j.workers + " workers · " + j.sigs.map(s => '<a href="' + H.scan("tx", s) + '" target="_blank" rel="noopener">' + H.short(s, 5) + "</a>").join(" "), "ok"); document.dispatchEvent(new CustomEvent("sh:paid", { detail: j })); H.load(); });
H.def("ledger", "every payroll and every fee that landed", async (a, T) => { const j = await H.api("ledger"); if (!j.live) return T.print("-- quiet so far. the ledger starts with the first fee.", "dim");
  T.print("payrolls\n" + (j.payrolls.length ? j.payrolls.map(p => "#" + p.shift + " " + p.name.padEnd(9) + H.sol(p.sent, 4).padStart(14) + "  " + p.wallets + " wallets  " + H.ago(p.t)).join("\n") : "-- none yet") + "\nfees in\n" + (j.inflow.length ? j.inflow.slice(0, 12).map(f => "+" + H.sol(f.sol, 4).padStart(13) + "  " + H.ago(f.t)).join("\n") : "-- none yet"), "pre"); });
H.def("rules", "the rules, as numbers", (a, T) => T.print([row("a shift", "8 hours: 00, 08, 16 utc"), row("desks", "the top 100 holders"), row("clock in", "hold at least $50 of $SH1FT when the shift starts"), row("fired", "sell or send any $SH1FT during the shift"), row("wage", "payroll split by the bag you clocked in with"), row("payroll", "every creator fee, minus 0.002 SOL kept for rent"), row("smallest wage", "0.001 SOL, smaller ones go back to the rest"), row("sh1ft's cut", "0")].join("\n"), "pre"));
H.def("price", "SOL and $SH1FT", async (a, T) => { const s = H.state || await H.load(); T.print([row("SOL", H.usd(s.sol)), row("$SH1FT", s.coin ? H.usd(s.coin.price) : "—"), row("market cap", s.coin && s.coin.mcap ? "$" + H.big(s.coin.mcap) : "—")].join("\n"), "pre"); });
H.def("ca", "the contract address", async (a, T) => { const s = H.state || await H.load(); if (!s.mint) return T.print("CA: — (posted here the minute it launches)", "dim"); T.print("CA " + s.mint + '  <u data-copy="' + s.mint + '">copy</u>  <a href="https://pump.fun/coin/' + s.mint + '" target="_blank" rel="noopener">pump.fun</a>'); });
H.def("connect", "connect a wallet to read it (no signing, ever)", async (a, T) => { const w = await H.connect(); T.print("connected " + H.short(w, 6) + ". type <u data-run=\"me\">me</u>", "ok"); });
H.def("goto", "goto <room>: " + H.ROOMS.join(", "), (a, T) => { const r = (a[0] || "").toLowerCase(); if (!H.ROOMS.includes(r)) return T.print("rooms: " + H.ROOMS.join(", "), "dim"); if (H.room) H.room(r); else location.href = "/#/" + r; });
H.def("home", "the story of sh1ft", () => { location.href = "/home"; });
H.def("docs", "the manual", () => { location.href = "/docs"; });
H.def("intro", "play the intro again", () => { try { sessionStorage.removeItem("sh1ft.intro"); } catch (e) {} location.href = "/"; });
H.def("sound", "sound on|off", (a, T) => { const v = a[0] ? a[0] !== "off" : !H.sound.on; H.setSound(v); if (v && H.hum) H.hum(true); T.print("sound " + (v ? "on" : "off"), "dim"); });
H.def("date", "the time, in utc", (a, T) => T.print(new Date().toUTCString()));
H.def("ls", "list files", (a, T) => T.print("rules.txt  payroll.log  handbook.txt  resignation.txt", "pre"));
H.def("cat", "read a file", (a, T) => { const f = { "rules.txt": "hold from the start of the shift. don't sell. get paid at the end. that's it.", "payroll.log": '-- type <u data-run="ledger">ledger</u> for the real one', "handbook.txt": "1. clock in. 2. hold. 3. there is no step 3.", "resignation.txt": "there's no resign button. selling is how you quit." }[a[0]]; T.print(f ? H.esc(f).replace(/&lt;u data-run=&quot;ledger&quot;&gt;ledger&lt;\/u&gt;/, '<u data-run="ledger">ledger</u>') : "cat: no such file", f ? "" : "err"); });
H.def("coffee", "the machine", (a, T) => T.print("the machine is broken. it has always been broken.", "dim"));
H.def("quit", "leave", (a, T) => T.print("you can't quit. you can only sell. selling is how you get fired.", "dim"));
H.def("about", "what sh1ft is", (a, T) => T.print("sh1ft: an office that never closes. hold $SH1FT through a whole 8-hour shift and the coin's creator fees pay you, split by bag. sell during it and you're fired. no signing, no staking, no claiming.", ""));

document.addEventListener("click", e => { const c = e.target.closest("[data-copy]"); if (c) { e.preventDefault(); H.copy(c.dataset.copy, c); } const s = e.target.closest("[data-sound]"); if (s) { H.setSound(!H.sound.on); if (H.sound.on) H.hum(true); } });
})();
