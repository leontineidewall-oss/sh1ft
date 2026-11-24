// sh1ft · the office: the intro, the world, its rooms, and the console that runs inside each room
(function(){
const H = window.SH, $ = H.$, $$ = H.$$, REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches, LOW = (navigator.hardwareConcurrency || 8) < 4 || innerWidth < 700;
const cv = $("#world"), W = new window.SH1FT_World(cv, { rows: LOW ? 6 : 10, scale: LOW ? .75 : 1 });
const BASE = { x: 1.3, y: 2.45, z: -2.6, pitch: .1, yaw: 0 }, OPEN = { x: 4.2, y: 2.6, z: -3.6, pitch: .12, yaw: -.06 };
W.cam.cy = .44; Object.assign(W.cam, BASE); W.target = Object.assign({}, BASE);
W.setLights(.4, 11);
// film grain, drawn once
(function(){ const g = $("#grain"); if (!g) return; g.width = 256; g.height = 256; const c = g.getContext("2d"), im = c.createImageData(256, 256); for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } c.putImageData(im, 0, 0); g.style.width = "100%"; g.style.height = "100%"; g.style.imageRendering = "pixelated"; })();

// ---------------------------------------------------------------- the loop: the world, the sign over the aisle, the tag on the desk you point at
let last = 0, lastSec = -1, hoverDesk = null, mx = -1, my = -1, curShift = H.shift().n;
const sign = $("#sign"), signL = $("#signl"), signD = $("#signd"), tag = $("#tag");
function loop(now){
  requestAnimationFrame(loop); if (document.hidden) return; if (LOW && now - last < 33) return; last = now;
  if (!W.sel && !H.intro) { W.target.yaw = (W.panelOpen ? OPEN.yaw : 0) + Math.sin(now / 9000) * .035; }
  W.frame(now);
  const p = W.P(1.5, 3.25, 11); if (p[2] > .5) { sign.style.left = p[0] + "px"; sign.style.top = p[1] + "px"; sign.style.opacity = H.intro ? 0 : 1; }
  const s = H.shift(), sec = Math.floor(Date.now() / 1000);
  if (sec !== lastSec) { lastSec = sec; signL.textContent = "shift #" + s.n + " · " + s.name + " · payroll in"; signD.textContent = H.left(s.end - Date.now());
    $("#clock").innerHTML = '<i class="dot"></i><span class="nm">' + s.name + ' shift ·</span> <b>' + H.left(s.end - Date.now()) + "</b>"; $("#utc").textContent = new Date().toISOString().slice(11, 19); $("#s-next").textContent = H.shift(s.end + 1).name + " at " + H.utc(s.end);
    if (s.n !== curShift) { curShift = s.n; H.tick(); H.toast("shift #" + (s.n - 1) + " is over. payroll is open."); H.load(); } }
  // the tag follows whatever desk is under the pointer (or the selected one)
  const pk = mx >= 0 ? W.pick(mx, my) : null; hoverDesk = pk ? pk.d : null; W.hover = hoverDesk; cv.classList.toggle("pt", !!pk);
  const show = pk || (W.sel ? (W.screen || []).find(x => x.d === W.sel) : null);
  if (show && show.d.w) { const d = show.d, on = d.state === "on", inf = d.info || {};
    tag.className = "tag" + (on ? "" : " red"); tag.style.left = show.x + "px"; tag.style.top = (show.y - show.r * .4) + "px"; tag.style.opacity = 1;
    tag.innerHTML = "<b>" + (on ? "desk " + String(d.i + 1).padStart(3, "0") + " · on shift" : "fired") + "</b><span>" + H.short(d.w, 4) + (on ? " · " + H.big(inf.bag) + " · " + H.pct(inf.share) : " · desk cleared " + (inf.at ? H.ago(inf.at) : "")) + "</span>"; }
  else tag.style.opacity = 0;
}
requestAnimationFrame(loop);
cv.addEventListener("pointermove", e => { mx = e.clientX; my = e.clientY; });
cv.addEventListener("pointerleave", () => { mx = my = -1; });
cv.addEventListener("click", e => { const pk = W.pick(e.clientX, e.clientY); if (pk && pk.d.w) { select(pk.d); room("me", pk.d.w); } else if (W.sel) { select(null); } });
function select(d){ W.desks.forEach(x => { x.sel = 0; }); W.sel = d; if (d) { d.sel = 1; W.target = { x: d.x + (W.panelOpen && innerWidth > 980 ? 2.6 : 0), y: 2.1, z: d.z - 3.2, pitch: .2, yaw: 0 }; W.ease = .05; } else { W.target = Object.assign({}, W.panelOpen && innerWidth > 980 ? OPEN : BASE); W.ease = .04; } }

// ---------------------------------------------------------------- data: the office fills with real people
document.addEventListener("sh:state", e => { const s = e.detail || {};
  const o = s.office && !s.office.error ? s.office : null;
  W.setData(o ? o.desks : [], o ? o.boxes : []);
  W.setLights(s.live ? Math.min(.85, .3 + (o ? o.onShift / 140 : 0)) : .3, 11);
  $("#s-sol").textContent = H.usd(s.sol); $("#s-coin").textContent = s.coin ? H.usd(s.coin.price) : "—";
  $("#s-on").textContent = o ? o.onShift : "—"; $("#s-fired").textContent = o ? o.fired : "—"; $("#s-pay").textContent = s.live ? H.sol(s.payable) : "—";
  $("#s-live").className = "dot" + (s.live ? "" : " off"); $("#s-livet").textContent = s.live ? "live" : "opens at launch";
  if (W.room) render(W.room); });
document.addEventListener("sh:paid", () => { W.drop(120); });
H.load(); setInterval(() => { if (!document.hidden) H.load(); }, 30000);

// ---------------------------------------------------------------- rooms: a glass panel opens, its console runs the command
const ROOM = {
  office: { no: "01", nick: "the floor", lead: "everyone holding through this shift sits at a desk. sell before it ends and your desk gets boxed up.", acts: [["me", "am i on shift?"], ["run", "run payroll"], ["desks", "the roster"], ["shift", "the clock"]] },
  payroll: { no: "02", nick: "the wallet", lead: "every creator fee lands in one public wallet. when a shift ends, it pays everyone who worked it, split by bag.", acts: [["run", "run payroll", "warm"], ["payroll", "payroll"], ["ledger", "ledger"]] },
  desks: { no: "03", nick: "the roster", lead: "the top 100 holders who held since the shift started and never sold. their bag at clock-in sets their wage.", acts: [["desks", "print roster"], ["me", "am i on shift?"]] },
  me: { no: "04", nick: "the badge", lead: "paste any wallet, or connect one to read it. sh1ft never asks you to sign anything.", acts: [["connect", "connect wallet"], ["me", "check"]] },
  ledger: { no: "05", nick: "the books", lead: "every fee that landed in payroll and every payroll that went out, straight from the chain.", acts: [["ledger", "ledger"], ["payroll", "payroll"]] },
  rules: { no: "06", nick: "the handbook", lead: "the same rules for everyone, written in the code. no staking, no claiming, no forms.", acts: [["rules", "rules"], ["home", "the story"], ["docs", "the manual"]] },
  terminal: { no: "07", nick: "the prompt", lead: "the whole office in one prompt. type help, or press / anywhere.", acts: [["help", "help"], ["ls", "ls"], ["coffee", "coffee"]] },
};
const panel = $("#panel"); let T = null, deskView = "now", meWallet = null;
function room(name, arg){
  if (!ROOM[name]) return; const R = ROOM[name]; W.room = name; W.panelOpen = true; if (!W.sel) { W.target = Object.assign({}, innerWidth > 980 ? OPEN : BASE); W.ease = .04; }
  if (name === "me" && arg) meWallet = arg;
  panel.innerHTML = '<div class="ph"><button class="ib x" id="px" aria-label="close">✕</button><div class="ey">' + R.no + " · " + R.nick + "</div><h1>" + name + '</h1><p class="lead">' + R.lead + '</p><div class="acts">' + R.acts.map(a => '<button class="pa ' + (a[2] || "") + '" data-cmd="' + a[0] + '">' + a[1] + "</button>").join("") + '</div></div><div class="pb"><div id="rc"></div>' + H.termWin() + "</div>";
  panel.classList.add("on"); const term = $(".term", panel); if (name === "terminal") term.classList.add("full"); T = H.term(term);
  $("#px").onclick = close; $$("[data-cmd]", panel).forEach(b => b.onclick = () => { H.tick(); const c = b.dataset.cmd; T.run(c === "me" && meWallet ? "me " + meWallet : c); });
  setRooms(name); render(name);
  const first = { office: "office", payroll: "payroll", desks: null, me: meWallet ? "me " + meWallet : null, ledger: null, rules: null, terminal: "help" }[name]; if (first) T.run(first);
  if (location.hash !== "#/" + name) history.replaceState(null, "", "#/" + name);
  if (name === "terminal") setTimeout(() => $("input", term).focus(), 300);
}
function close(){ panel.classList.remove("on"); W.room = null; W.panelOpen = false; select(null); setRooms(null); history.replaceState(null, "", location.pathname); }
H.room = room;
function setRooms(name){ const pill = $(".rooms .pill"); let on = null; $$(".rooms a, .mnav a").forEach(a => { const m = a.dataset.room === name; a.classList.toggle("on", m); if (m && a.closest(".rooms")) on = a; });
  if (pill) { if (on) { pill.style.left = on.offsetLeft + "px"; pill.style.width = on.offsetWidth + "px"; pill.style.opacity = 1; } else pill.style.opacity = 0; } }
$$(".rooms a, .mnav a").forEach(a => a.addEventListener("click", e => { e.preventDefault(); H.tick(); if (W.room === a.dataset.room) close(); else room(a.dataset.room); }));

const s0 = () => H.state || {};
const cell = (k, v, cls) => '<div><div class="k">' + k + '</div><div class="v ' + (cls || "") + '">' + v + "</div></div>";
const addr = a => a ? '<a href="' + H.scan("account", a) + '" target="_blank" rel="noopener">' + H.short(a, 6) + '</a> <u data-copy="' + a + '">copy</u>' : "—";
const txl = s => '<a href="' + H.scan("tx", s) + '" target="_blank" rel="noopener">' + H.short(s, 5) + "</a>";
const closedNote = '<div class="empty">the office opens when $SH1FT launches. until then every number here reads —.</div>';
async function render(name){
  const rc = $("#rc"); if (!rc) return; const s = s0(), o = s.office && !s.office.error ? s.office : null, sh = H.shift();
  if (name === "office") rc.innerHTML = '<div class="cells">' + cell("shift", "#" + sh.n + "<small>" + sh.name + "</small>") + cell("payroll in", '<span data-left="' + sh.end + '">' + H.left(sh.end - Date.now()) + "</span>", "warm") + cell("payroll", H.sol(s.payable)) + cell("on shift", (o ? o.onShift : "—") + "<small>/ 100</small>") + cell("fired", o ? o.fired : "—") + cell("$SH1FT", s.coin ? H.usd(s.coin.price) : "—") + "</div>" + (s.live ? "" : closedNote) + (s.office && s.office.error ? '<div class="empty">' + H.esc(s.office.error) + "</div>" : "");
  if (name === "payroll") rc.innerHTML = '<div class="cells">' + cell("balance", H.sol(s.balance)) + cell("payable", H.sol(s.payable), "warm") + cell("next payroll", '<span data-left="' + sh.end + '">' + H.left(sh.end - Date.now()) + "</span>") + "</div>" +
    '<div class="box"><h3>payroll wallet <span>public</span></h3><dl class="kv"><dt>address</dt><dd>' + addr(s.payroll) + "</dd><dt>last payroll</dt><dd>" + (s.last ? "shift #" + s.last.shift + " · " + H.sol(s.last.sent, 4) + " · " + s.last.wallets + " wallets · " + H.ago(s.last.t) : "—") + "</dd><dt>paid in total</dt><dd>" + (s.live ? H.sol(s.paid, 4) : "—") + "</dd><dt>last shift</dt><dd>" + (s.live ? (s.prevPaid ? "paid" : '<span class="warm">waiting. anyone can run it</span>') : "—") + "</dd></dl></div>" +
    '<div class="box"><h3>how a payroll goes</h3><div style="color:var(--fg2);font-size:12.5px;line-height:1.8">shift ends → anyone presses run payroll (and once a day it runs by itself)<br>→ the roster is read from the chain → the wallet pays everyone on it, by bag<br>→ each payout carries the note <span class="warm">sh1ft:1:pay:&lt;shift&gt;</span>, so it can only happen once</div></div>' + (s.live ? "" : closedNote);
  if (name === "desks") { rc.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div class="seg"><button data-v="now" class="' + (deskView === "now" ? "on" : "") + '">this shift</button><button data-v="last" class="' + (deskView === "last" ? "on" : "") + '">last shift</button></div><span class="dim" style="font-size:12px" id="dmeta"></span></div><div id="dl"><div class="empty">reading the chain…</div></div>';
    $$(".seg button", rc).forEach(b => b.onclick = () => { deskView = b.dataset.v; render("desks"); });
    if (!s.live) { $("#dl").innerHTML = closedNote; return; }
    const j = await H.api("desks", "n=" + (deskView === "last" ? sh.n - 1 : sh.n)); if (W.room !== "desks" || !$("#dl")) return; if (j.error) { $("#dl").innerHTML = '<div class="empty">' + H.esc(j.error) + "</div>"; return; }
    $("#dmeta").textContent = "shift #" + j.n + " · " + j.name + " · " + (j.closed ? "closed" : "open");
    const pay = s.payable || 0, me = H.wallet || meWallet;
    $("#dl").innerHTML = '<div class="box" style="padding:6px 6px 2px"><table class="tbl"><thead><tr><th>desk</th><th>wallet</th><th class="r">bag</th><th class="r">share</th><th class="r">' + (j.closed ? "" : "wage now") + "</th></tr></thead><tbody>" +
      (j.workers.length ? j.workers.map((w, i) => '<tr class="' + (w.w === me ? "me" : "") + '"><td>' + String(i + 1).padStart(3, "0") + '</td><td><a href="' + H.scan("account", w.w) + '" target="_blank" rel="noopener">' + H.short(w.w, 5) + '</a></td><td class="r">' + H.big(w.bag) + '</td><td class="r">' + H.pct(w.share) + '</td><td class="r warm">' + (j.closed ? "" : H.sol(pay * w.share, 4)) + "</td></tr>").join("") : '<tr><td colspan="5" class="empty">-- nobody on shift yet.</td></tr>') + "</tbody></table></div>" +
      '<div class="box"><h3>fired this shift <span>' + j.fired.length + "</span></h3>" + (j.fired.length ? '<table class="tbl"><tbody>' + j.fired.map(f => '<tr><td class="red">boxed</td><td>' + H.short(f.w, 5) + '</td><td class="r">sold ' + H.big(f.sold) + '</td><td class="r">' + H.ago(f.at) + "</td><td>" + txl(f.sig) + "</td></tr>").join("") + "</tbody></table>" : '<div class="empty" style="padding:4px 0">-- nobody fired. yet.</div>') + "</div>" +
      '<div class="note">' + j.checked + " of " + j.holders + " holders checked · minimum bag " + (j.minTokens ? H.big(j.minTokens) + " ($" + j.minUsd + ")" : "—") + " · " + j.late + " clocked in late</div>"; }
  if (name === "me") { rc.innerHTML = '<div class="inp"><input id="mw" placeholder="paste a wallet address" value="' + H.esc(meWallet || H.wallet || "") + '"><button class="pa" id="mgo">check</button></div><div id="mres"></div>';
    const go = () => { const v = $("#mw").value.trim(); if (!H.isAddr(v)) return H.toast("that isn't a Solana address"); meWallet = v; check(v); T.run("me " + v); };
    $("#mgo").onclick = go; $("#mw").onkeydown = e => { if (e.key === "Enter") go(); }; if (meWallet || H.wallet) check(meWallet || H.wallet); }
  if (name === "ledger") { rc.innerHTML = '<div id="ll"><div class="empty">reading the books…</div></div>'; const j = await H.api("ledger"); if (W.room !== "ledger" || !$("#ll")) return;
    if (!j.live) { $("#ll").innerHTML = closedNote; return; }
    $("#ll").innerHTML = '<div class="box"><h3>payrolls <span>' + j.payrolls.length + "</span></h3>" + (j.payrolls.length ? '<table class="tbl"><thead><tr><th>shift</th><th></th><th class="r">paid</th><th class="r">wallets</th><th class="r">when</th><th>tx</th></tr></thead><tbody>' + j.payrolls.map(p => "<tr><td>#" + p.shift + "</td><td>" + p.name + '</td><td class="r warm">' + H.sol(p.sent, 4) + '</td><td class="r">' + p.wallets + '</td><td class="r">' + H.ago(p.t) + "</td><td>" + txl(p.sigs[0]) + "</td></tr>").join("") + "</tbody></table>" : '<div class="empty" style="padding:4px 0">-- no payroll yet. the first one runs after the first shift with fees.</div>') + "</div>" +
      '<div class="box"><h3>fees in <span>' + j.inflow.length + "</span></h3>" + (j.inflow.length ? '<table class="tbl"><tbody>' + j.inflow.slice(0, 30).map(f => '<tr><td class="warm">+' + H.sol(f.sol, 4) + '</td><td class="r">' + H.ago(f.t) + "</td><td>" + txl(f.sig) + "</td></tr>").join("") + "</tbody></table>" : '<div class="empty" style="padding:4px 0">-- quiet so far.</div>') + "</div>"; }
  if (name === "rules") rc.innerHTML = '<div class="cells">' + cell("a shift", "8h") + cell("desks", "100") + cell("clock in", "$50") + cell("fired if", "you sell") + cell("wage", "by bag") + cell("sh1ft's cut", "0", "warm") + "</div>" +
    '<div class="box"><h3>the handbook</h3><div style="color:var(--fg2);font-size:12.5px;line-height:1.9">01 · shifts start at 00:00, 08:00 and 16:00 utc: graveyard, day, swing.<br>02 · you clock in by holding at least $50 of $SH1FT when the shift starts.<br>03 · the office has 100 desks: the top 100 holders who clocked in.<br>04 · sell or send any $SH1FT before the shift ends and you\'re fired for that shift.<br>05 · buying more is fine. your wage uses the bag you clocked in with.<br>06 · when the shift ends, payroll pays everyone who worked it, split by bag.<br>07 · you have to still be holding when payroll runs.<br>08 · pools, programs and the payroll wallet never get a desk.</div></div>';
  if (name === "terminal") rc.innerHTML = "";
  $$("[data-left]", rc).forEach(el => { const end = +el.dataset.left; const tick = () => { if (!el.isConnected) return; el.textContent = H.left(end - Date.now()); setTimeout(tick, 1000); }; tick(); });
}
async function check(w){ const r = $("#mres"); if (!r) return; r.innerHTML = '<div class="empty">checking…</div>'; const j = await H.api("me", "w=" + w); if (!$("#mres")) return;
  if (j.error) { r.innerHTML = '<div class="empty">' + H.esc(j.error) + "</div>"; return; }
  if (!j.live) { r.innerHTML = closedNote; return; }
  const big = { on: "on shift", fired: "fired", late: "clocked in late", off: "off the clock" }[j.status] || j.status;
  r.innerHTML = '<div class="status-card ' + j.status + '"><div class="k">' + H.short(w, 6) + '</div><div class="big" style="margin:8px 0">' + big + '</div><div style="color:var(--fg2);font-size:12.5px">' + H.esc(j.detail) + "</div>" + (j.status === "on" ? '<dl class="kv" style="margin-top:12px"><dt>desk</dt><dd>' + String(j.desk).padStart(3, "0") + "</dd><dt>bag at clock-in</dt><dd>" + H.big(j.bag) + "</dd><dt>share of payroll</dt><dd>" + H.pct(j.share) + '</dd><dt>wage if paid now</dt><dd class="warm">' + H.sol(j.wage, 4) + "</dd></dl>" : "") + "</div>";
  const d = W.desks.find(x => x.w === w); if (d) select(d); }
document.addEventListener("sh:wallet", () => { meWallet = H.wallet; if (W.room === "me") render("me"); });

// ---------------------------------------------------------------- keys
addEventListener("keydown", e => { if (e.target.closest("input,textarea")) { if (e.key === "Escape") e.target.blur(); return; }
  if (H.intro) return; const n = +e.key; if (n >= 1 && n <= 7) { room(H.ROOMS[n - 1]); e.preventDefault(); }
  else if (e.key === "/") { e.preventDefault(); room("terminal"); } else if (e.key === "Escape") { if (W.sel) select(null); else close(); } });
$("#slash").onclick = () => room("terminal");

// ---------------------------------------------------------------- the intro: it starts by itself, once per tab
function enter(){ document.body.classList.remove("intro-on"); H.intro = false; const ov = $(".intro"); if (ov) { ov.style.transition = "opacity .8s"; ov.style.opacity = 0; setTimeout(() => ov.remove(), 900); }
  try { sessionStorage.setItem("sh1ft.intro", "1"); } catch (e) {} W.target = Object.assign({}, BASE); W.ease = .03; if (H.sound.on && H.sound.ctx) H.hum(true);
  const r = (location.hash.match(/^#\/(\w+)/) || [])[1]; if (r && ROOM[r]) room(r); }
function intro(){
  let seen = false; try { seen = sessionStorage.getItem("sh1ft.intro") === "1"; } catch (e) {}
  const ov = $(".intro"); if (seen || REDUCED || location.hash.length > 2) { if (ov) ov.remove(); document.body.classList.remove("intro-on"); H.intro = false; enter(); return; }
  H.intro = true; document.body.classList.add("intro-on");
  W.lights.forEach(L => { L.want = 0; L.on = 0; }); Object.assign(W.cam, { x: 0, y: 3.0, z: -10, pitch: .2, yaw: 0 }); W.target = { x: 0, y: 3.0, z: -10, pitch: .2, yaw: 0 };
  const s = H.shift(), ty = $(".intro .type"), lines = [new Date().toISOString().slice(11, 16) + " utc · " + s.name + " shift", "the office never closes."]; let txt = "", i = 0, j = 0;
  const type = () => { if (!H.intro) return; if (i >= lines.length) return; if (j <= lines[i].length) { ty.textContent = txt + lines[i].slice(0, j++); if (j % 2) H.tick(); setTimeout(type, 38); } else { txt += lines[i] + "\n"; i++; j = 0; setTimeout(type, 260); } };
  setTimeout(type, 300);
  // the breaker: tubes strike on from the front of the room to the back
  setTimeout(() => { if (!H.intro) return; ty.style.opacity = 0; $(".intro .black").style.opacity = 0; let k = 0;
    W.lights.slice().sort((a, b) => a.z - b.z).forEach(L => { const want = Math.random() < .45 || Math.abs(L.x) < 3; if (!want) return; const d = (L.z * 55 + Math.random() * 250); setTimeout(() => { L.want = 1; L.flick = Math.random() < .08; if (k++ < 9) H.strike(); }, d); });
    W.target = Object.assign({}, BASE, { yaw: .02 }); W.ease = .012; }, 2300);
  setTimeout(() => { if (H.intro) $(".intro").classList.add("show"); }, 5600);
  const auto = setTimeout(() => { if (H.intro) enter(); }, 12000);
  $(".intro .skip").onclick = () => { clearTimeout(auto); enter(); };
  $(".intro .go").onclick = () => { clearTimeout(auto); H.audio(); H.strike(); enter(); setTimeout(() => H.toast("clocked in · " + new Date().toISOString().slice(11, 16) + " utc · " + H.shift().name + " shift"), 700); };
  addEventListener("pointerdown", function once(){ removeEventListener("pointerdown", once); if (H.sound.on) { H.audio(); $(".intro .tap") && ($(".intro .tap").textContent = "sound on"); } }, { once: true });
  addEventListener("keydown", function k(e){ if (!H.intro) return removeEventListener("keydown", k); if (e.key === "Enter" || e.key === "Escape" || e.key === " ") { clearTimeout(auto); H.audio(); enter(); } });
}
intro();
H.$$("[data-sound]").forEach(b => b.classList.toggle("off", !H.sound.on));
})();
