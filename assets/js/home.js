// sh1ft · the story: one office behind the page; each section moves it to a new moment
(function(){
const H = window.SH, $ = H.$, $$ = H.$$, REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches, LOW = (navigator.hardwareConcurrency || 8) < 4 || innerWidth < 700;
const W = new window.SH1FT_World($("#world"), { rows: LOW ? 6 : 9, scale: LOW ? .7 : .9 });
(function(){ const g = $("#grain"); g.width = g.height = 256; const c = g.getContext("2d"), im = c.createImageData(256, 256); for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } c.putImageData(im, 0, 0); g.style.width = g.style.height = "100%"; })();
// an illustration of the rules, not live data: the live office is one click away
const people = n => Array.from({ length: n }, () => ({}));
const STATES = {
  0: { cam: { x: 3.4, y: 2.9, z: -5, pitch: .14, yaw: -.12 }, light: .35, on: 40, fired: 0 },
  1: { cam: { x: 1.3, y: 2.5, z: -3, pitch: .1, yaw: .05 }, light: .55, on: 70, fired: 0 },
  2: { cam: { x: -1.2, y: 2.2, z: 2.5, pitch: -.02, yaw: .12 }, light: .6, on: 70, fired: 0 },
  3: { cam: { x: 1.8, y: 2.0, z: -1.2, pitch: .2, yaw: -.08 }, light: .5, on: 69, fired: 1 },
  4: { cam: { x: 1.3, y: 3.0, z: -4, pitch: .2, yaw: 0 }, light: .7, on: 69, fired: 1, drop: 1 },
  5: { cam: { x: 2.6, y: 3.1, z: -6, pitch: .16, yaw: -.1 }, light: .35, on: 60, fired: 0 },
};
W.cam.cy = .46; Object.assign(W.cam, STATES[0].cam); W.target = Object.assign({}, STATES[0].cam); W.ease = .03; W.setLights(.22, 5);
let cur = -1; const sign = $("#sign");
function go(s){ if (s === cur) return; cur = s; const st = STATES[s]; W.target = Object.assign({}, st.cam); W.setLights(st.light, 5);
  const on = Math.min(st.on, W.desks.length - 2), ws = people(on); W.setData(ws, st.fired ? [{}] : []);
  // the fired desk is a near one, so you see it happen
  if (st.fired) { W.desks[1].state = "fired"; W.desks[on].state = "on"; }
  if (st.drop) { W.drop(160); clearInterval(go.di); go.di = setInterval(() => { if (cur === 4 && !document.hidden) W.drop(40); }, 1400); }
  sign.style.display = s === 2 || s === 4 ? "" : "none"; }
go(0);
const lv = $$(".lvl");
function onScroll(){ const y = innerHeight * .5; let s = 0; const hero = $(".hero").getBoundingClientRect(); if (hero.bottom < innerHeight * .6) s = 1;
  lv.forEach(el => { const r = el.getBoundingClientRect(), on = r.top < y && r.bottom > y; el.classList.toggle("on", on); if (on) s = +el.dataset.s; });
  if ($("#levels").getBoundingClientRect().bottom < y) s = 5; go(s); }
addEventListener("scroll", onScroll, { passive: true }); onScroll();
let last = 0, lastSec = -1;
function loop(now){ requestAnimationFrame(loop); if (document.hidden || (LOW && now - last < 40)) return; last = now; W.frame(now);
  const p = W.P(1.5, 3.25, 11); if (p[2] > .5) { sign.style.left = p[0] + "px"; sign.style.top = p[1] + "px"; }
  const tg = $("#tag"); if (cur === 3) { const d = W.desks[1], q = W.P(d.x - .05, 1.15, d.z + .2); tg.style.left = q[0] + "px"; tg.style.top = q[1] + "px"; tg.style.opacity = d.box > .5 ? 1 : 0; } else tg.style.opacity = 0;
  const s = H.shift(), sec = Math.floor(Date.now() / 1000); if (sec !== lastSec) { lastSec = sec; $("#signl").textContent = "shift #" + s.n + " · " + s.name + " · payroll in"; $("#signd").textContent = H.left(s.end - Date.now());
    $("#clock").innerHTML = '<i class="dot"></i><span class="nm">' + s.name + " shift ·</span> <b>" + H.left(s.end - Date.now()) + "</b>"; } }
if (!REDUCED) requestAnimationFrame(loop); else W.frame(performance.now());

// live numbers in the hero and the addresses, "—" until they're real
document.addEventListener("sh:state", e => { const s = e.detail || {}, o = s.office && !s.office.error ? s.office : null, sh = H.shift();
  $("#h-shift").textContent = "#" + sh.n; $("#h-on").textContent = o ? o.onShift + " / 100" : "—"; $("#h-pay").textContent = s.live ? H.sol(s.payable) : "—"; $("#h-paid").textContent = s.live ? H.sol(s.paid) : "—";
  const link = a => '<a href="' + H.scan("account", a) + '" target="_blank" rel="noopener">' + H.short(a, 6) + '</a> <u data-copy="' + a + '">copy</u>';
  $("#a-ca").innerHTML = s.mint ? link(s.mint) : "— (posted at launch)"; $("#a-pay").innerHTML = s.payroll ? link(s.payroll) : "—"; });
H.load();

// the wage calculator: payroll × your bag ÷ everyone's bag on shift
const lg = (v, a, b) => a * Math.pow(b / a, v / 1000);
function calc(){ const pay = lg(+$("#c-p").value, .05, 50), bag = lg(+$("#c-b").value, 50, 50000), tot0 = lg(+$("#c-t").value, 5000, 2000000), tot = Math.max(tot0, bag);
  ["#c-p", "#c-b", "#c-t"].forEach(s => { const e = $(s); e.style.setProperty("--p", (e.value / 10) + "%"); });
  const share = bag / tot, wage = Math.max(0, pay - .002) * share;
  $("#c-pv").textContent = H.sol(pay, pay < 1 ? 3 : 1); $("#c-bv").textContent = "$" + H.big(bag); $("#c-tv").textContent = "$" + H.big(tot);
  $("#c-out").innerHTML = (wage < .001 ? "0" : wage.toFixed(wage < 1 ? 4 : 2)) + "<small>SOL</small>"; $("#c-day").textContent = H.sol(wage * 3, 3); $("#c-week").textContent = H.sol(wage * 21, 2); $("#c-share").textContent = H.pct(share);
  $("#c-note").textContent = wage < .001 ? "under 0.001 SOL: that wage drops and its share goes to the rest." : "if every shift paid the same. they won't: payroll is whatever the fees were."; }
["#c-p", "#c-b", "#c-t"].forEach(s => $(s).addEventListener("input", calc)); calc();
})();
