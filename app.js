"use strict";
/* ---------- נתונים ---------- */
const T = window.TH;
if (!T || !Array.isArray(T.vc)) {
  document.getElementById("app").innerHTML = '<div style="text-align:center;padding:60px 20px;font-size:18px"><b>לא ניתן לטעון את נתוני האפליקציה</b><div style="margin:8px 0 16px;opacity:.75">בדוק את החיבור לאינטרנט ורענן את הדף.</div><button onclick="location.reload()" style="padding:10px 22px;border-radius:12px;border:0;background:#14305a;color:#fff;font-size:17px">רענן</button></div>';
  throw new Error("META data is missing");
}
const VC = T.vc;                                   // מספר פסוקים בכל פרק
/* יחידות מעקב: כל פרק הוא יחידה, ופרק קיט מחולק לשתיים (כמו בחלוקה לימי החודש) - 151 יחידות */
const UNITS = {}, ULIST = [];
for (let c = 1; c <= 150; c++) {
  if (c === 119) { UNITS["119a"] = { c, a: 0, z: 95 }; UNITS["119b"] = { c, a: 96, z: 175 }; ULIST.push("119a", "119b"); }
  else { UNITS[c] = { c, a: 0, z: VC[c - 1] - 1 }; ULIST.push(String(c)); }
}
const TOTAL = ULIST.length;
const unitsOf = k => k === "119" ? ["119a", "119b"] : [k];
const tgt = k => k === "119" ? { c: 119, a: 0, z: 175 } : UNITS[k];
const validK = k => k === "119" || !!UNITS[k];
const BOOKS = [["ספר ראשון", 1, 41, "בראשית"], ["ספר שני", 42, 72, "שמות"], ["ספר שלישי", 73, 89, "ויקרא"], ["ספר רביעי", 90, 106, "במדבר"], ["ספר חמישי", 107, 150, "דברים"]];
const bookOf = c => BOOKS.findIndex(b => c >= b[1] && c <= b[2]);
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => String(a + i));
const MONTH = [[1, 9], [10, 17], [18, 22], [23, 28], [29, 34], [35, 38], [39, 43], [44, 48], [49, 54], [55, 59], [60, 65], [66, 68], [69, 71], [72, 76], [77, 78], [79, 82], [83, 87], [88, 89], [90, 96], [97, 103], [104, 105], [106, 107], [108, 112], [113, 118], "119a", "119b", [120, 134], [135, 139], [140, 144], [145, 150]]
  .map(x => Array.isArray(x) ? range(x[0], x[1]) : [x]);
const WEEK = [[1, 29], [30, 50], [51, 72], [73, 89], [90, 106], [107, 119], [120, 150]].map(([a, b]) => range(a, b));
const WD = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת קודש"];
const CAT = T.cat;
/* קישורי שמע: הרב מוטי פרנקו (Spotify) - "מספר פרק": "מזהה פרק". פרק בלי מזהה לא מציג כפתור שמע. */
const SPOTIFY_EP = {"1": "4mbg774sBiXfdONLg7h0gc", "2": "1iSJd4dwoI9MiFxh4fJ0Je", "3": "7f9Ti4xlzgvAuHdrV8dcQM", "4": "3e8I8ylLrVdqIwXCZ06Cn1", "5": "2LGr3KkyF2OyGEpKr0OsUu", "6": "3zmkcunw8rzgi17P9u64CQ"};

/* ---------- מצב ---------- */
const KEY = "tehillim.v1";
let S = { v: 1, done: {}, bm: null, round: Date.now(), rounds: 0, fin: [], fs: 28, taamim: true, theme: "light", sunset: true, mode: "m", nk: true, comm: "", hintBm: false, pv: "d", remT: "07:00", remShab: true };
try {
  const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
  if (raw && typeof raw === "object" && !Array.isArray(raw)) Object.assign(S, raw, { v: 1 });
} catch (e) {}
{ // אימות
  const d = {}; if (S.done && typeof S.done === "object") for (const k in S.done) if (UNITS[k] && Number.isFinite(S.done[k])) d[k] = S.done[k]; S.done = d;
  if (!(S.bm && validK(S.bm.k) && Number.isInteger(S.bm.v) && S.bm.v >= tgt(S.bm.k).a && S.bm.v <= tgt(S.bm.k).z)) S.bm = null;
  if (!(Number.isFinite(S.fs) && S.fs >= 16 && S.fs <= 48)) S.fs = 28;
  if (!["light", "sepia", "dark", "auto"].includes(S.theme)) S.theme = "light";
  if (!["m", "w"].includes(S.mode)) S.mode = "m";
  S.comm = "";   // מצב הפירוש לא נשמר - כל כניסה לפרק מתחילה ב"ללא"
  if (!["d", "w", "m", "r"].includes(S.pv)) S.pv = "d";
  if (!Number.isFinite(S.round)) S.round = Date.now();
  if (!Number.isInteger(S.rounds) || S.rounds < 0) S.rounds = 0;
  S.fin = Array.isArray(S.fin) ? S.fin.filter(Number.isFinite) : [];
  if (!/^\d\d:\d\d$/.test(S.remT || "")) S.remT = "07:00";
  S.nk = S.nk !== false;
  S.sunset = S.sunset !== false; S.taamim = S.taamim !== false; S.remShab = S.remShab !== false;
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
const darkMQ = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
function applyTheme() { document.documentElement.dataset.theme = S.theme === "auto" ? (darkMQ && darkMQ.matches ? "dark" : "light") : S.theme; }
applyTheme();
const applyNk = () => document.documentElement.classList.toggle("nk-off", !S.nk);
applyNk();
if (darkMQ) (darkMQ.addEventListener ? darkMQ.addEventListener("change", applyTheme) : darkMQ.addListener(applyTheme));

/* ---------- עזרים ---------- */
function heb(n) {
  const L = [[400, "ת"], [300, "ש"], [200, "ר"], [100, "ק"], [90, "צ"], [80, "פ"], [70, "ע"], [60, "ס"], [50, "נ"], [40, "מ"], [30, "ל"], [20, "כ"], [10, "י"], [9, "ט"], [8, "ח"], [7, "ז"], [6, "ו"], [5, "ה"], [4, "ד"], [3, "ג"], [2, "ב"], [1, "א"]];
  let s = ""; if (n >= 100) { const h = n - n % 100; for (const [v, l] of L) while (n >= v && v >= 100) { s += l; n -= v; } }
  if (n === 15) return s + "טו"; if (n === 16) return s + "טז";
  for (const [v, l] of L) while (n >= v) { s += l; n -= v; }
  return s;
}
const gem = n => { const h = heb(n); return h.length > 1 ? h.slice(0, -1) + "״" + h.slice(-1) : h + "׳"; };
const kName = k => k === "119a" ? "פרק קי״ט (א–מ)" : k === "119b" ? "פרק קי״ט (נ–ת)" : "פרק " + gem(+k);
const kShort = k => k === "119a" ? "קי״ט א–מ" : k === "119b" ? "קי״ט נ–ת" : gem(+k);
const segOf = c => T.seg[c] || "";
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
const hebParts = new Intl.DateTimeFormat("he-u-ca-hebrew", { day: "numeric", month: "long", year: "numeric" });
const hebOf = d => { const p = {}; hebParts.formatToParts(d).forEach(x => p[x.type] = x.value); const num = v => /^\d+$/.test(v); return { y: p.year, m: p.month, d: +p.day, yt: num(p.year) ? gem(+p.year % 1000) : p.year, dt: num(p.day) ? gem(+p.day) : p.day }; };
const hebFmt = d => { const h = hebOf(d); return `${h.dt} ב${h.m} ${h.yt}`; };
const wdFmt = new Intl.DateTimeFormat("he-IL", { weekday: "long" });
const pad = n => String(n).padStart(2, "0");
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);
/* היום העברי מתחיל בשקיעה (לפי ירושלים) */
const JER = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" });
function sunsetMs(y, m, d, lat = 31.778, lon = 35.235) {          // m מ-0; אלגוריתם NOAA
  const R = Math.PI / 180, JD = Date.UTC(y, m, d, 12) / 864e5 + 2440587.5, T2 = (JD - 2451545) / 36525;
  const L0 = (280.46646 + T2 * (36000.76983 + T2 * 0.0003032)) % 360, M = 357.52911 + T2 * (35999.05029 - 0.0001537 * T2), e = 0.016708634 - T2 * (0.000042037 + 0.0000001267 * T2);
  const C = Math.sin(M * R) * (1.914602 - T2 * (0.004817 + 0.000014 * T2)) + Math.sin(2 * M * R) * (0.019993 - 0.000101 * T2) + Math.sin(3 * M * R) * 0.000289;
  const om = 125.04 - 1934.136 * T2, lam = L0 + C - 0.00569 - 0.00478 * Math.sin(om * R);
  const e0 = 23 + (26 + (21.448 - T2 * (46.815 + T2 * (0.00059 - T2 * 0.001813))) / 60) / 60, eps = e0 + 0.00256 * Math.cos(om * R);
  const dec = Math.asin(Math.sin(eps * R) * Math.sin(lam * R)), y2 = Math.tan(eps * R / 2) ** 2;
  const eq = 4 * (y2 * Math.sin(2 * L0 * R) - 2 * e * Math.sin(M * R) + 4 * e * y2 * Math.sin(M * R) * Math.cos(2 * L0 * R) - 0.5 * y2 * y2 * Math.sin(4 * L0 * R) - 1.25 * e * e * Math.sin(2 * M * R)) / R;
  const ha = Math.acos(Math.cos(90.833 * R) / (Math.cos(lat * R) * Math.cos(dec)) - Math.tan(lat * R) * Math.tan(dec)) / R;
  return Date.UTC(y, m, d) + (720 - 4 * (lon - ha) - eq) * 60000;
}
let todayShifted = false;
const today = () => {
  const [y, m, d] = JER.format(new Date()).split("-").map(Number);
  todayShifted = S.sunset && Date.now() >= sunsetMs(y, m - 1, d);
  return new Date(y, m - 1, d + (todayShifted ? 1 : 0), 12);
};
const startOf = d => S.sunset ? sunsetMs(d.getFullYear(), d.getMonth(), d.getDate() - 1) : new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const dayStart = () => startOf(today());
const weekStart = () => { const d = today(); return startOf(addDays(d, -d.getDay())); };
const monthStart = () => { const d = today(); return startOf(addDays(d, 1 - hebOf(d).d)); };
const monthLen = d => hebOf(addDays(d, 30 - hebOf(d).d)).d === 30 ? 30 : 29;
const $ = s => document.querySelector(s);
function toast(t, act) {
  const e = $("#toast"); e.textContent = t; e.style.pointerEvents = act ? "auto" : "none";
  if (act) { const b = document.createElement("button"); b.textContent = act; b.setAttribute("data-undo", ""); e.appendChild(b); }
  e.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => { e.classList.remove("show"); e.style.pointerEvents = "none"; }, act ? 7000 : 1800);
}
const I = {
  home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/></svg>',
  chart: '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/></svg>',
  openbook: '<svg viewBox="0 0 24 24"><path d="M12 6.5C9.8 5 7 4.5 3.5 4.5v13c3.5 0 6.3.5 8.5 2 2.2-1.5 5-2 8.5-2v-13C17 4.5 14.2 5 12 6.5z"/><path d="M12 6.5v13"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 1112 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 21h4"/></svg>'
};
const BMI = '<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z"/></svg>';

/* ---------- חלוקות (מנות) ---------- */
/* מזהה מנה: m1..m30 (ימי החודש), m29s (כ״ט בחודש חסר), w0..w6 (ימי השבוע), b0..b4 (ספרים), c0.. (בקשות) */
function portion(p) {
  if (!p) return null;
  const t = p[0], n = +p.slice(1).replace("s", "");
  const rng = ks => { const a = ks[0], z = ks[ks.length - 1]; return a === z ? kName(a) : `פרקים ${kShort(a)}–${kShort(z)}`; };
  if (t === "m" && p === "m29s") { const ks = MONTH[28].concat(MONTH[29]); return { id: p, title: "יום כ״ט לחודש", sub: rng(ks) + " · חודש חסר – כולל יום ל׳", ks, since: monthStart }; }
  if (t === "m" && n >= 1 && n <= 30) { const ks = MONTH[n - 1]; return { id: p, title: `יום ${gem(n)} לחודש`, sub: n === 25 ? "פרק קי״ט, אותיות א–מ (פסוקים א–צו)" : n === 26 ? "פרק קי״ט, אותיות נ–ת (פסוקים צז–קעו)" : rng(ks), ks, since: monthStart }; }
  if (t === "w" && n >= 0 && n <= 6) { const ks = WEEK[n]; return { id: p, title: `יום ${WD[n]}`, sub: rng(ks), ks, since: weekStart }; }
  if (t === "b" && BOOKS[n]) { const b = BOOKS[n]; return { id: p, title: b[0], sub: `פרקים ${gem(b[1])}–${gem(b[2])} · כנגד ספר ${b[3]}`, ks: range(b[1], b[2]), since: () => S.round }; }
  if (t === "c" && CAT[n]) { return { id: p, title: CAT[n][0] + " " + CAT[n][1], sub: CAT[n][3] ? `${CAT[n][2].length} פרקים · ${CAT[n][3]}` : `${CAT[n][2].length} פרקים לפי ספר שמוש תהלים`, ks: CAT[n][2].map(String), since: () => S.round }; }
  return null;
}
function todayPid() {
  const d = today();
  if (S.mode === "w") return "w" + d.getDay();
  const hd = hebOf(d).d; return hd === 29 && monthLen(d) === 29 ? "m29s" : "m" + hd;
}
const isDoneK = (k, since) => unitsOf(k).every(u => (S.done[u] || 0) >= since);
const cntSince = (since, ks) => (ks ? ks.flatMap(unitsOf) : ULIST).filter(u => (S.done[u] || 0) >= since).length;
const sizeOf = ks => ks.flatMap(unitsOf).length;
const pctP = P => Math.round(cntSince(P.since(), P.ks) / sizeOf(P.ks) * 100);
const roundPct = () => Math.round(cntSince(S.round) / TOTAL * 100);

/* ---------- ניתוב ---------- */
let route = { v: "home" };
let lastHash = null, booted = false, navIdx = 0, navMax = 0;
try { if (/[?&]r=\d+/.test(location.search)) history.replaceState(history.state, "", location.pathname + location.hash); } catch (e) {}
if (history.state && Number.isInteger(history.state.i)) navIdx = navMax = history.state.i; else try { history.replaceState({ i: 0 }, ""); } catch (e) {}
const urlOf = r => "#" + r.v + (r.k ? "/" + r.k : "") + (r.p ? "/" + r.p : "");
function go(r, replace) {
  if (r.v === "read" && route.v !== "read") S.comm = "";   // כניסה לפרק מבחוץ - בלי פירוש
  route = r;
  if (replace) history.replaceState({ i: navIdx }, "", urlOf(r)); else { navIdx++; navMax = navIdx; history.pushState({ i: navIdx }, "", urlOf(r)); }
  lastHash = location.hash; closeSheet(); render();
}
function fromHash() {
  if (location.hash === lastHash) return; booted = true; lastHash = location.hash;
  const [v, a, b] = location.hash.slice(1).split("/");
  if (v === "read" && validK(a)) { if (route.v !== "read") S.comm = ""; route = { v, k: a, p: portion(b) ? b : null }; }
  else if (v === "p" && portion(a)) route = { v, p: a };
  else if (["chapters", "books", "days", "weeks", "needs", "progress", "search"].includes(v)) route = { v };
  else route = { v: "home" };
  closeSheet(); render();
}
window.addEventListener("popstate", e => { navIdx = e.state && Number.isInteger(e.state.i) ? e.state.i : 0; lastHash = null; fromHash(); });
window.addEventListener("hashchange", fromHash);
const navBack = () => `<button class="nv" data-navback aria-label="חזרה אחורה" ${navIdx > 0 ? "" : "disabled"}><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>`;
const navFwd = () => `<button class="nv" data-navfwd aria-label="קדימה" ${navIdx < navMax ? "" : "disabled"}><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>`;

/* ---------- טעינת טקסט ופירושים ---------- */
let TX = null, txFail = false, txLoading = false;
function loadText() {
  if (TX || txLoading || txFail) return; txLoading = true;   // אחרי כשל לא מנסים שוב אוטומטית (אחרת לולאה בלי הפסקה); ניסיון חוזר: כפתור או חזרת חיבור
  fetch("text.json").then(r => { if (!r.ok) throw 0; return r.json(); }).then(j => { TX = j; }).catch(() => { txFail = true; })
    .finally(() => { txLoading = false; if (route.v === "read" || (route.v === "home" && S.bm)) { route.keep = true; render(); } });
}
const MAL = {}, malFail = {}, ST = {}, stFail = {}, stLoad = {};
function loadMal(c) {
  if (MAL[c] || MAL[c] === null || (malFail[c] && Date.now() - malFail[c] < 20000)) return; delete malFail[c]; MAL[c] = null;
  fetch("mal/" + c + ".json").then(r => { if (!r.ok) throw 0; return r.json(); }).then(j => { MAL[c] = j; })
    .catch(() => { delete MAL[c]; malFail[c] = Date.now(); }).finally(() => { if (route.v === "read" && tgt(route.k).c === c) { route.keep = true; render(); } });
}
/* פירוש שטיינזלץ נטען ישירות מספריא (זכויות: מרכז שטיינזלץ), ונשמר במכשיר לשימוש בלי חיבור */
function loadSt(c) {
  if (ST[c] || stLoad[c] || stFail[c]) return; stLoad[c] = 1;
  fetch("https://www.sefaria.org/api/v3/texts/Steinsaltz_on_Psalms." + c + "?version=primary").then(r => { if (!r.ok) throw 0; return r.json(); })
    .then(j => { const t = j && j.versions && j.versions[0] && j.versions[0].text; if (!Array.isArray(t)) throw 0; ST[c] = t; })
    .catch(() => { stFail[c] = 1; }).finally(() => { delete stLoad[c]; if (route.v === "read" && tgt(route.k).c === c) { route.keep = true; render(); } });
}
window.addEventListener("online", () => { txFail = false; for (const k in stFail) delete stFail[k]; for (const k in malFail) delete malFail[k]; if (route.v === "read") { route.keep = true; render(); } });
/* ניקוי תוכן חיצוני (ספריא): פירוק ב-DOMParser (מסמך אינרטי, בלי הרצת קוד), ושמירה רק של טקסט ושל <b>. כל שאר התגיות והמאפיינים נמחקים, והטקסט עובר escape. */
const escH = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function clean(s) {
  const body = new DOMParser().parseFromString("<body>" + String(s || "") + "</body>", "text/html").body;
  const walk = n => {
    let o = "";
    for (const c of n.childNodes) {
      if (c.nodeType === 3) o += escH(c.nodeValue.replace(/ /g, " ").replace(/ /g, ""));
      else if (c.nodeType === 1) {
        const t = c.tagName.toLowerCase();
        if (t === "script" || t === "style" || t === "template") continue;
        o += t === "b" ? "<b>" + walk(c) + "</b>" : walk(c);
      }
    }
    return o;
  };
  return walk(body);
}
function malFullHTML(c, t) {                    // פירוש המלבי"ם המלא לפרק (או לחצי פרק קי"ט), בקטע נגלל
  if (!MAL[c]) return `<div class="cmn">${malFail[c] ? "לא הצלחנו לטעון את פירוש המלבי״ם. נדרש חיבור לאינטרנט." : "טוען את פירוש המלבי״ם…"}</div>`;
  let h = "";
  for (let i = t.a; i <= t.z; i++) { const cs = MAL[c][i]; if (cs && cs.length) h += `<div class="mv"><b class="mvn">פסוק ${gem(i + 1)}</b>${cs.map(x => `<p>${clean(x)}</p>`).join("")}</div>`; }
  return (h || '<div class="cmn">אין פירוש למלבי״ם בפרק זה.</div>') + '<div class="srcnote">פירוש המלבי״ם: נחלת הכלל, באמצעות ספריא.</div>';
}

/* ---------- קישורים ---------- */
/* שמע: שיעורי הרב מוטי פרנקו בישיבת הגולן - מזמור -> כתובת השיעור (נבדק שכל דף כולל נגן ושהכותרת תואמת) */
const YG_BASE = "https://ygolan.org/שיעורים/";
const YG = {"1": "תהילים-מזמור-א/", "2": "תהילים-מזמור-ב/", "3": "תהילים-מזמור-ג/", "4": "תהילים-מזמור-ד/", "5": "תהילים-מזמור-ה/", "6": "תהילים-מזמור-ו/", "7": "תהילים-מזמור-ז/", "8": "תהילים-מזמור-ח/", "9": "תהילים-מזמור-ט/", "10": "תהילים-מזמור-י/", "11": "תהילים-מזמור-יא/", "12": "תהילים-מזמור-יב/", "13": "תהילים-מזמור-יג/", "14": "תהילים-מזמור-יד/", "15": "תהילים-מזמור-טו/", "16": "תהילים-מזמור-טז/", "17": "תהילים-מזמור-יז/", "18": "תהילים-מזמור-יח/", "19": "תהילים-מזמור-יט/", "20": "תהילים-מזמור-כ/", "21": "תהילים-מזמור-כא/", "22": "תהילים-מזמור-כב/", "23": "תהילים-מזמור-כג/", "24": "תהילים-מזמור-כד/", "25": "תהילים-מזמור-כה/", "26": "תהילים-מזמור-כו/", "27": "תהילים-מזמור-כח/", "28": "תהילים-מזמור-כח-2/", "29": "תהילים-מזמור-כט/", "30": "תהילים-מזמור-ל/", "31": "תהילים-מזמור-לא/", "32": "תהילים-מזמור-לב/", "33": "תהילים-מזמור-לג/", "34": "תהילים-מזמור-לד/", "35": "תהילים-מזמור-לה/", "36": "תהילים-מזמור-לו/", "37": "תהילים-מזמור-לז/", "38": "תהילים-מזמור-לח/", "39": "תהילים-מזמור-לט/", "40": "תהילים-מזמור-מ/", "41": "תהילים-מזמור-מא/", "42": "תהילים-מזמור-מבמג/", "44": "תהילים-מזמור-מד/", "45": "תהילים-מזמור-מה/", "46": "תהילים-מזמור-מו/", "47": "תהילים-מזמור-מז/", "48": "תהילים-מזמור-מח/", "49": "תהילים-מזמור-מט/", "50": "תהילים-מזמור-נ/", "51": "תהילים-מזמור-נא/", "52": "תהילים-מזמור-נב/", "53": "תהילים-מזמור-נג/", "54": "תהילים-מזמור-נד/", "55": "תהילים-מזמור-נה/", "56": "תהילים-מזמור-נו/", "57": "תהילים-מזמור-נז/", "58": "תהילים-מזמור-נח/", "59": "תהילים-מזמור-נט/", "60": "תהילים-מזמור-ס/", "61": "תהילים-מזמור-סא/", "62": "תהילים-מזמור-סב/", "63": "תהילים-מזמור-סג/", "64": "תהילים-מזמור-סד/", "65": "תהילים-מזמור-סה/", "66": "תהילים-מזמור-סו/", "67": "תהילים-מזמור-סז/", "68": "תהילים-מזמור-סח/", "69": "תהילים-מזמור-סט/", "70": "תהילים-מזמור-עעא/", "72": "תהילים-מזמור-עב/", "73": "תהילים-מזמור-עג/", "74": "תהילים-מזמור-עד/", "75": "תהילים-מזמור-עה/", "76": "תהילים-מזמור-עו/", "77": "תהילים-מזמור-עז/", "78": "תהילים-מזמור-עח/", "79": "תהילים-מזמור-עט/", "80": "תהילים-מזמור-פ/", "81": "תהילים-מזמור-פא/", "82": "תהילים-מזמור-פב/", "83": "תהילים-מזמור-פג/", "84": "תהילים-מזמור-פד/", "85": "תהילים-מזמור-פה/", "86": "תהילים-מזמור-פו/", "88": "תהילים-מזמור-פח/", "89": "תהילים-מזמור-פט/", "90": "תהילים-מזמור-צ/", "91": "תהילים-מזמור-צא/", "92": "תהילים-מזמור-צב/", "93": "תהילים-מזמור-צג/", "94": "תהילים-מזמור-צד/", "95": "תהילים-מזמור-צה/", "96": "תהילים-מזמור-צו/", "97": "תהילים-מזמור-צז/", "98": "תהילים-מזמור-צח/", "99": "תהילים-מזמור-צט/", "100": "תהילים-מזמור-ק/", "101": "תהילים-מזמור-קא/", "102": "תהילים-מזמור-קב/", "103": "תהילים-מזמור-קג/", "104": "תהילים-מזמור-קד/", "105": "תהילים-מזמור-קה/", "106": "תהילים-מזמור-קו/", "107": "תהילים-מזמור-קז/", "108": "תהילים-מזמור-קח/", "109": "תהילים-מזמור-קט/", "110": "תהילים-מזמור-קי/", "111": "תהילים-מזמור-קיא/", "112": "תהילים-מזמור-קיב/", "113": "תהילים-מזמור-קיג/", "114": "תהילים-מזמור-קיד/", "115": "תהילים-מזמור-קטו/", "118": "תהילים-מזמור-קיח/", "129": "תהילים-מזמור-קכט/", "130": "תהילים-מזמור-קל/", "131": "תהילים-מזמור-קלא/", "132": "תהילים-מזמור-קלב/", "133": "תהילים-מזמור-קלג/", "134": "תהילים-מזמור-קלד/", "135": "תהילים-מזמור-קלה/", "136": "תהילים-מזמור-קלו/", "137": "תהילים-מזמור-קלז/", "138": "תהילים-מזמור-קלח/", "139": "תהילים-מזמור-קלט/", "140": "תהילים-מזמור-קמ/", "141": "תהילים-מזמור-קמא/", "43": "תהילים-מזמור-מבמג/", "71": "תהילים-מזמור-עעא/", "116": "תהילים-מזמורים-קטז-קיז/", "117": "תהילים-מזמורים-קטז-קיז/", "123": "תהלים-מזמורים-קכג-קכד/", "124": "תהלים-מזמורים-קכג-קכד/", "87": "תהילילם-מזמור-פז/", "120": "תהלים-מזמור-קכ/", "121": "תהלים-מזמור-קכא/", "122": "תהלים-מזמור-קכב/", "125": "תהלים-מזמור-קכה/", "126": "תהלים-מזמור-קכו/", "127": "תהלים-מזמור-קכז/", "128": "תהלים-מזמור-קכח/", "142": "תהלים-מזמור-קמב/", "143": "תהלים-מזמור-קמג/", "144": "תהלים-מזמור-קמד/", "145": "תהלים-מזמור-קמה/", "146": "תהלים-מזמור-קמו/", "147": "תהלים-מזמור-קמז/", "148": "תהלים-מזמור-קמח/", "149": "תהלים-מזמור-קמט/", "150": "תהלים-מזמור-קנ/", "119:א-ד": "תהילים-מזמור-קיט-אותיות-א-ד/", "119:ה-ט": "תהילים-מזמור-קיט-אותיות-ה-ט/", "119:י-נ": "תהילים-מזמור-קיט-אותיות-י-נ/", "119:ס-צ": "תהילים-מזמור-קיט-אותיות-ס-צ/", "119:ק-ת": "תהילים-מזמור-קיט-אותיות-ק-ת/"};
const P119 = [["א-ד", 0, 31], ["ה-ט", 32, 71], ["י-נ", 72, 111], ["ס-צ", 112, 143], ["ק-ת", 144, 175]];
function audioLinks(k) {
  const t = tgt(k), c = t.c, out = [], a = (u, txt) => `<a class="rl yg" href="${YG_BASE + u}" target="_blank" rel="noopener">${txt}</a>`;
  if (c === 119) P119.forEach(([l, x, z]) => { if (z >= t.a && x <= t.z && YG["119:" + l]) out.push(a(YG["119:" + l], "🎧 שמע · אותיות " + l.replace("-", "–"))); });
  else if (YG[c]) out.push(a(YG[c], "🎧 שמע: הרב מוטי פרנקו"));
  if (SPOTIFY_EP[c]) out.push(`<a class="rl sp" href="https://open.spotify.com/episode/${SPOTIFY_EP[c]}" target="_blank" rel="noopener">Spotify</a>`);
  return out.join("");
}
const SHARE_URL = "https://rafi680890.github.io/tehillim/";
const SHARE_TEXT = "📖 ספר תהילים: למה אומרים כל פרק, סיכום הפרק על פי המלבי״ם, פירוש שטיינזלץ, חלוקה לימי החודש והשבוע ומעקב התקדמות - בחינם וללא פרסומות.";
async function shareApp(kind) {
  const full = SHARE_TEXT + " " + SHARE_URL, e = encodeURIComponent;
  if (kind === "wa") { window.open("https://wa.me/?text=" + e(full), "_blank", "noopener"); return; }
  if (kind === "fb") { window.open("https://www.facebook.com/sharer/sharer.php?u=" + e(SHARE_URL), "_blank", "noopener"); return; }
  if (kind === "tg") { window.open("https://t.me/share/url?url=" + e(SHARE_URL) + "&text=" + e(SHARE_TEXT), "_blank", "noopener"); return; }
  const copy = async () => {
    try { await navigator.clipboard.writeText(full); }
    catch (er) { const t = document.createElement("textarea"); t.value = full; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); } catch (e2) {} t.remove(); }
    toast("הקישור הועתק ✓");
  };
  if (kind === "copy") { await copy(); return; }
  try { if (navigator.share) { await navigator.share({ title: "תהילים", text: SHARE_TEXT, url: SHARE_URL }); return; } }
  catch (er) { if (er && er.name === "AbortError") return; }
  await copy();
}
const shareCard = () => `<div class="card sharecard"><div class="shh"><svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4"/></svg>שתפו עם חברים ומשפחה</div><p class="shs">הקישור יישלח עם הסבר קצר על האפליקציה</p><div class="sgrid">
<button class="sb wa" data-share="wa"><svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.4.1.6-.1l.8-1c.2-.2.3-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.8-.1 1.3z"/></svg>ווטסאפ</button>
<button class="sb fb" data-share="fb"><svg viewBox="0 0 24 24"><path d="M13.5 22v-8.2h2.8l.5-3.3h-3.3V8.4c0-1 .4-1.7 1.8-1.7H17V3.8c-.3-.1-1.3-.2-2.4-.2-2.5 0-4.1 1.5-4.1 4.2v2.7H7.7v3.3h2.8V22z"/></svg>פייסבוק</button>
<button class="sb tg" data-share="tg"><svg viewBox="0 0 24 24"><path d="M21.5 3.5 2.7 10.8c-.9.3-.9 1.2 0 1.5l4.8 1.5 1.8 5.7c.2.6.9.8 1.4.4l2.6-2.2 4.7 3.5c.6.4 1.3.1 1.5-.6l3.2-15.2c.2-.9-.6-1.6-1.2-1.4zM9.7 14.3l8.2-5.1-6.5 6.2-.3 3.1z"/></svg>טלגרם</button>
<button class="sb cp" data-share="copy"><svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1"/></svg>העתקת קישור</button></div>
<button class="more" data-share="more"><svg viewBox="0 0 24 24"><path d="M12 15V3M7.5 7.5 12 3l4.5 4.5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>שתפו באפשרויות נוספות</button>
<button class="help" data-installhelp>מופיעה אזהרה בהתקנה באנדרואיד? לחצו כאן</button></div>`;
const installHelpHTML = () => `<button class="x" data-close aria-label="סגור">✕</button><h3 class="sh" style="margin-top:4px">בעיה בהתקנה באנדרואיד</h3>
<p style="margin:0 0 10px">אם מופיעה הודעה <b>״Google Play Protect: אפליקציה לא בטוחה נחסמה״</b> - זו אזהרה כללית של אנדרואיד על אפליקציות אינטרנט, והאפליקציה עצמה בטוחה (היא אתר, בלי קבצים מסוכנים). אפשר להמשיך כך:</p>
<ol class="help-steps"><li>בהודעה לחצו על <b>״פרטים נוספים״</b> ואז על <b>״התקן בכל זאת״</b>.</li>
<li>אם אין כפתור כזה: ב-Chrome פתחו את התפריט ⋮ ובחרו <b>״הוסף למסך הבית״</b>, ואז <b>״צור קיצור דרך״</b>.</li>
<li>או פשוט המשיכו להשתמש באתר דרך הדפדפן, בלי להתקין.</li></ol>`;
/* ---------- הודעת "יש גרסה חדשה" ---------- */
let verDismissed = "", verChecked = 0;
async function checkNewVersion(force) {
  if (!force && Date.now() - verChecked < 60000) return; verChecked = Date.now();
  if (!navigator.onLine) return;
  try {
    const r = await fetch("app.js", { cache: "no-store" }); if (!r.ok) return;
    const m = /APP_VERSION\s*=\s*"([^"]+)"/.exec(await r.text());
    if (m && m[1] !== APP_VERSION && m[1] !== verDismissed) showNewVer(m[1]);
  } catch (e) {}
}
function showNewVer(v) {
  if ($("#newver")) return;
  const d = document.createElement("div"); d.id = "newver"; d.className = "newver"; d.setAttribute("role", "status"); d.dataset.v = v;
  d.innerHTML = '<span>יש גרסה חדשה של האפליקציה</span><button class="nvu" data-newver-update>עדכנו עכשיו</button><button class="nvx" data-newver-later aria-label="סגירה">✕</button>';
  document.body.appendChild(d);
}

/* ---------- קריאה אופליין בלחיצה אחת ---------- */
const OFF_KEY = "tehillim.offline";
const offStatus = () => { try { const d = localStorage.getItem(OFF_KEY); return d ? "✓ הורד בתאריך " + d + ". אפשר לאמר תהילים ולקרוא את המלבי״ם בלי אינטרנט (פירוש שטיינזלץ נשמר אחרי שפותחים אותו פעם אחת)." : "מוריד את התהילים ופירוש המלבי״ם למכשיר, כדי ללמוד גם בלי קליטה (נסיעה, שבת)."; } catch (e) { return ""; } };
async function offlineDownload() {
  if (!window.caches) { toast("הדפדפן לא תומך בשמירה לקריאה אופליין"); return; }
  const btn = $("[data-offline]"); if (btn) btn.disabled = true;
  const files = ["text.json"].concat(Array.from({ length: 150 }, (_, i) => "mal/" + (i + 1) + ".json")); let done = 0, fail = 0;
  const say = t => { const e = $("#offst"); if (e) e.textContent = t; };
  const cacheName = async () => { const ks = (await caches.keys()).filter(k => /^tehillim-v\d+/.test(k)).sort((a, b) => (parseInt(b.split("-v")[1]) || 0) - (parseInt(a.split("-v")[1]) || 0)); return ks[0] || "tehillim-offline"; };
  say("מוריד… 0 מתוך " + files.length);
  const q = files.slice();
  const worker = async () => {
    while (q.length) {
      const u = q.shift();
      try {
        if (!(await caches.match(u))) {
          const r = await fetch(u, { cache: "no-store" });
          if (!r.ok) throw 0;
          if (!(await caches.match(u))) { const c = await caches.open(await cacheName()); await c.put(u, r.clone()); }
        }
      } catch (e) { fail++; }
      done++; say("מוריד… " + done + " מתוך " + files.length);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  if (btn) btn.disabled = false;
  if (fail) { say("ההורדה לא הושלמה (" + fail + " קבצים נכשלו). בדקו חיבור ונסו שוב."); toast("ההורדה לא הושלמה, נסו שוב"); return; }
  try { localStorage.setItem(OFF_KEY, new Date().toLocaleDateString("he-IL")); } catch (e) {}
  say(offStatus()); toast("✓ הכול הורד, אפשר ללמוד בלי אינטרנט");
}

/* ---------- חיפוש חופשי ---------- */
const SQ = { q: "", scope: "t", full: false, part: false, bk: "", shown: 100, scroll: 0 };
const NWD = {}, PRE = "ובהכלמש", NIKR = /[֑-ׇ͏]/g, TAAM = /[֑-֯]/g;
const nw = s => s.replace(/[־\-]/g, " ").replace(NIKR, "").replace(/[^א-ת\s]/g, "").replace(/\s+/g, " ").trim();
const sk = s => s.replace(/[וי]/g, "");
const malText = x => (Array.isArray(x) ? x.join(" ") : x || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const srcStr = (c, i, scope) => scope === "t" ? (TX[c - 1][i] || "").replace(/\n/g, " ") : malText(MAL[c] && MAL[c][i]);
async function loadAllData(scope, onProg) {
  const jobs = [];
  if (!TX) jobs.push(["text.json", null]);
  if (scope === "m") for (let c = 1; c <= 150; c++) if (!MAL[c]) jobs.push(["mal/" + c + ".json", c]);
  const total = jobs.length; let n = 0, fail = 0;
  const w = async () => { while (jobs.length) { const [u, c] = jobs.shift(); try { const r = await fetch(u); if (!r.ok) throw 0; const j = await r.json(); if (c === null) TX = j; else MAL[c] = j; } catch (e) { fail++; } n++; if (onProg) onProg(n, total); } };
  await Promise.all([w(), w(), w(), w()]);
  return fail === 0;
}
const wordsOf = (c, scope) => { const k = scope + c; return NWD[k] || (NWD[k] = (scope === "t" ? TX[c - 1] : (MAL[c] || [])).map((_, i) => nw(srcStr(c, i, scope)).split(" "))); };
function variants(q) {                                    // כתיב מלא/חסר: הוספה או הסרה של ו/י אחת
  const s = new Set([q]);
  for (let i = 0; i < q.length; i++) if ("וי".includes(q[i])) { const r = q.slice(0, i) + q.slice(i + 1); if (r.length >= 3) s.add(r); }
  for (let i = 1; i < q.length; i++) { s.add(q.slice(0, i) + "ו" + q.slice(i)); s.add(q.slice(0, i) + "י" + q.slice(i)); }
  return s;
}
function mkMatch(q, full) {
  const bases = [q]; if ("ובהכלמ".includes(q[0]) && q.length >= 5 || ("וה".includes(q[0]) && q.length >= 4)) bases.push(q.slice(1));   // בהיותם -> גם היותם
  const set = new Set(); for (const x of bases) (full ? variants(x) : [x]).forEach(y => set.add(y)); const nd = [...set];
  if (SQ.part) return w => nd.some(n => w.includes(n));
  return w => { for (let i = 0; i <= 2; i++) { if (i > 0 && !PRE.includes(w[i - 1])) break; const x = w.slice(i); if (x.length < 2) break; if (set.has(x)) return true; } return false; };
}
const unitFor = (c, i) => c === 119 ? (i <= 95 ? "119a" : "119b") : String(c);   // פרק קיט מחולק לשתי יחידות
function searchView() {
  const bopts = '<option value="">כל התהילים</option>' + BOOKS.map((b, i) => `<option value="${i}" ${String(SQ.bk) === String(i) ? "selected" : ""}>${b[0]} (מזמורים ${b[1]}-${b[2]})</option>`).join("");
  const sopts = [["t", "בתהילים"], ["m", "בפירוש המלבי״ם"]].map(([k, n]) => `<option value="${k}" ${SQ.scope === k ? "selected" : ""}>${n}</option>`).join("");
  return `<header class="rh" style="margin-bottom:12px"><button class="home" data-go="home">${I.home}<span>דף הבית</span></button><div class="rt">חיפוש</div></header>
  <input id="sq" class="sq" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" placeholder="חפשו מילה או ביטוי (בלי ניקוד)" aria-label="חיפוש" value="${escH(SQ.q)}">
  <div class="sopts"><select id="ssc" aria-label="איפה לחפש">${sopts}</select><select id="sbk" aria-label="היקף החיפוש">${bopts}</select></div>
  <div class="sopts"><label><input type="checkbox" id="sfull" ${SQ.full ? "checked" : ""}> כולל כתיב מלא/חסר (דוד ↔ דויד)</label><label><input type="checkbox" id="spart" ${SQ.part ? "checked" : ""}> גם חלק ממילה</label></div>
  <div id="sres" aria-live="polite"></div>${footer(false)}${tabs()}`;
}
function searchInit() {
  window.scrollTo(0, 0);
  if (SQ.q) { runSearch(); if (SQ.scroll) { const y = SQ.scroll; SQ.scroll = 0; setTimeout(() => window.scrollTo(0, y), 30); } }
  else { const i = $("#sq"); if (i && !/iphone|ipad|ipod/i.test(navigator.userAgent)) i.focus(); $("#sres").innerHTML = `<div class="ssum" style="font-weight:600">מחפשים בכל 150 המזמורים. אפשר לחפש מילה או כמה מילים, בלי ניקוד וטעמים, בטקסט התהילים או בפירוש המלבי״ם. (פירוש שטיינזלץ נטען מהרשת ולכן אינו נכלל בחיפוש.)</div>`; }
}
let sTimer = 0;
function runSearch() {
  const box = $("#sres"); if (!box) return;
  const qn = nw(SQ.q), words = qn.split(" ").filter(Boolean);
  if (qn.replace(/ /g, "").length < 2) { box.innerHTML = `<div class="ssum" style="font-weight:600">${SQ.q ? "כתבו לפחות שתי אותיות." : ""}</div>`; return; }
  const scope = SQ.scope;
  const needLoad = !TX || (scope === "m" && Array.from({ length: 150 }, (_, i) => i + 1).some(c => !MAL[c]));
  if (needLoad) {
    box.innerHTML = `<div class="ssum" id="sload">טוען את הטקסט לחיפוש…</div>`;
    const my = SQ.q + scope;
    loadAllData(scope, (n, t) => { const e = $("#sload"); if (e) e.textContent = `טוען את הטקסט לחיפוש… ${n} מתוך ${t}`; }).then(ok => {
      if (route.v !== "search" || SQ.q + SQ.scope !== my) return;
      if (!ok) { const e = $("#sres"); if (e) e.innerHTML = `<div class="ssum">לא כל הטקסט נטען. בדקו חיבור (או הורידו לקריאה אופליין מתחתית הדף) ונסו שוב.</div>`; return; }
      runSearch();
    });
    return;
  }
  const chs = SQ.bk === "" ? Array.from({ length: 150 }, (_, i) => i + 1) : range(BOOKS[+SQ.bk][1], BOOKS[+SQ.bk][2]).map(Number);
  const find = full => {
    const ms = words.map(w => mkMatch(w, full)), out = [];
    for (const c of chs) {
      const W = wordsOf(c, scope);
      for (let i = 0; i < W.length; i++) {
        const ws = W[i]; let ok = true;
        for (let k = 0; k < ms.length; k++) { if (!ws.some(ms[k])) { ok = false; break; } }
        if (ok) out.push([c, i]);
      }
    }
    return { out, ms };
  };
  const r = find(SQ.full); SQ.hits = r.out; SQ.words = words; SQ.ms = r.ms;
  SQ.extra = SQ.full ? 0 : Math.max(0, find(true).out.length - r.out.length);   // כמה תוצאות נוספות יש בכתיב מלא/חסר
  drawResults();
}
function hiText(raw, scope) {
  const ms = SQ.ms; let toks = raw.split(/(\s+)/);
  if (scope === "m") {                                    // פירוש המלבי״ם ארוך: מציגים רק חלון סביב המילה שנמצאה
    const ws = toks.filter(x => x.trim()); let at = ws.findIndex(t => nw(t).split(" ").some(w => ms.some(m => m(w))));
    if (at < 0) at = 0; const from = Math.max(0, at - 12), to = Math.min(ws.length, at + 28);
    toks = (from > 0 ? ["… "] : []).concat(ws.slice(from, to).flatMap(t => [t, " "])).concat(to < ws.length ? ["…"] : []);
  }
  return toks.map(tok => {
    if (!tok.trim() || tok === "…" || tok === "… ") return escH(tok);
    const ws = nw(tok).split(" ").filter(Boolean);
    return ms.some(m => ws.some(m)) ? `<mark class="hit">${escH(tok)}</mark>` : escH(tok);
  }).join("");
}
function drawResults() {
  const box = $("#sres"); if (!box) return; const hits = SQ.hits || [], scope = SQ.scope;
  const more = SQ.extra ? `<button class="smore" data-sfull style="margin:6px 0 10px">הצג גם ${SQ.extra} תוצאות בכתיב מלא/חסר</button>` : "";
  if (!hits.length) { box.innerHTML = `<div class="ssum">לא נמצאו תוצאות ל״${escH(SQ.q.trim())}״ בכתיב הזה.</div>${more}<div class="ssum" style="font-weight:600">אפשר לנסות פחות מילים או לסמן ״גם חלק ממילה״.</div>`; return; }
  const show = hits.slice(0, SQ.shown);
  box.innerHTML = `<div class="ssum">${hits.length} תוצאות${SQ.bk === "" ? "" : " ב" + BOOKS[+SQ.bk][0]}${hits.length > show.length ? " (מוצגות " + show.length + ")" : ""}</div>` + more +
    show.map(([c, i]) => `<button class="sres" data-sr="${c}:${i}"><div class="sref">תהילים ${gem(c)} · פסוק ${gem(i + 1)}</div><div class="stx ${scope === "m" ? "sg" : ""}">${hiText(scope === "t" ? srcStr(c, i, "t").replace(TAAM, "") : srcStr(c, i, scope), scope)}</div></button>`).join("") +
    (hits.length > show.length ? `<button class="smore" data-smore>הצג עוד</button>` : "");
}
document.addEventListener("input", e => {
  if (e.target.id === "sq") { SQ.q = e.target.value; SQ.shown = 100; clearTimeout(sTimer); sTimer = setTimeout(runSearch, 250); }
});
document.addEventListener("change", e => {
  if (e.target.id === "sbk") { SQ.bk = e.target.value; SQ.shown = 100; runSearch(); }
  else if (e.target.id === "ssc") { SQ.scope = e.target.value; SQ.shown = 100; runSearch(); }
  else if (e.target.id === "sfull") { SQ.full = e.target.checked; SQ.shown = 100; runSearch(); }
  else if (e.target.id === "spart") { SQ.part = e.target.checked; SQ.shown = 100; runSearch(); }
});
const APP_VERSION = "2026.11.25 (v26)";
async function hardRefresh() {
  toast("בודק חיבור…");
  try { const r = await fetch(location.pathname + "?r=" + Date.now(), { cache: "no-store" }); if (!r.ok) throw 0; }   // בדיקה אמיתית: onLine מחזיר true גם ב-Wi-Fi בלי אינטרנט
  catch (e) { toast("אין חיבור לאינטרנט - הריענון בוטל, האפליקציה נשארת כמו שהיא"); return; }
  toast("מרענן לגרסה החדשה…");
  try {
    if (navigator.serviceWorker) { const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(r => r.unregister())); }
    if (window.caches) { const ks = await caches.keys(); await Promise.all(ks.filter(k => k !== "tehillim-ext").map(k => caches.delete(k))); }
  } catch (e) {}
  location.replace(location.pathname + "?r=" + Date.now() + location.hash);
}
function footer(src) {
  return `<footer class="ft"><div class="cp">© רפאל בטיט · כל הזכויות שמורות על עיצוב ופיתוח האפליקציה</div><div class="cp" style="margin-top:4px">אפליקציה חינמית, ללא פרסומות</div><div class="ver">גרסה ${APP_VERSION}</div><button class="refbtn" data-refresh>🔄 ריענון לגירסה חדשה</button><div class="vernote">הריענון מוריד את הגרסה העדכנית. ההתקדמות והסימניות שלך נשמרות.</div><button class="offbtn" data-offline>📥 הורדה ללימוד אופליין</button><div class="vernote" id="offst">${offStatus()}</div>${src ? `<div class="src">נוסח המקרא: מקרא על פי המסורה (MAM), ברישיון CC-BY-SA, באמצעות ספריא. פירוש המלבי״ם: נחלת הכלל, באמצעות ספריא. פירוש הרב עדין שטיינזלץ (תנ״ך קורן שטיינזלץ המבואר): כל הזכויות למרכז שטיינזלץ, נטען מאתר ספריא. ״למה הפרק״: על פי ספר שמוש תהלים (ויקיטקסט), ובפרקים שחסרים בנוסח זה – על פי תרגום ג. זליג (1788). תמצית הפרק היא ניסוח מקוצר על פי דברי המלבי״ם, ואינה ציטוט. שמע: שיעורי הרב מוטי פרנקו, ישיבת הגולן (ygolan.org) ו-Spotify.</div>` : ""}</footer>`;
}
function tabs() {
  const on = ["progress"].includes(route.v) ? "p" : route.v === "search" ? "s" : "d", pct = route.v === "progress" ? roundPct() : pctP(portion(todayPid()));
  return `<nav class="tabs">${navBack()}<button class="hl" data-go="progress" ${on === "p" ? 'aria-current="page"' : ""}><i>${pct}%</i>${I.chart}<span>התקדמות שלי</span></button><button class="${on === "d" ? "on" : ""}" data-go="home">${I.home}<span>דף הבית</span></button><button class="${on === "s" ? "on" : ""}" data-go="search" ${on === "s" ? 'aria-current="page"' : ""}>${I.search}<span>חיפוש</span></button>${navFwd()}</nav>`;
}
const hdr = (title, back = "home") => `<header class="rh" style="margin-bottom:12px"><button class="home" data-go="${back}">${back === "home" ? I.home + "<span>דף הבית</span>" : I.chart + "<span>חזרה</span>"}</button><div class="rt">${title}</div></header>`;

/* ---------- תצוגות ---------- */
function portionCard(P, isToday) {
  const pct = pctP(P), since = P.since();
  const first = P.ks.find(k => !isDoneK(k, since)) || P.ks[0];
  const chips = P.ks.map(k => `<button class="${isDoneK(k, since) ? "on" : ""} ${S.bm && S.bm.k === k ? "bm" : ""}" data-read="${k}" data-p="${P.id}">${kShort(k)}</button>`).join("");
  return `<div class="card today"><small>${isToday ? (S.mode === "w" ? "השיעור היומי · לפי ימי השבוע" : "השיעור היומי · לפי ימי החודש") : "השיעור"}</small><h2>${P.title}</h2><div class="sub">${P.sub}</div>
  <div class="mini"><span>${pct}%</span><div class="bar"><i style="width:${pct}%"></i></div><span>${cntSince(since, P.ks)}/${sizeOf(P.ks)}</span></div>
  <div class="chips">${chips}</div>
  <div class="row2"><button class="btn read" data-read="${first}" data-p="${P.id}"><span class="ic">${I.openbook}</span>${pct === 100 ? "לאמירה חוזרת" : pct > 0 ? "המשך לומר ‹" : "התחל לומר ‹"}</button></div>
  <div class="row2"><button class="pbtn" data-prayer="before">🙏 תפילה לפני האמירה</button><button class="pbtn" data-prayer="after" data-pp="${P.id}">🙏 תפילה לאחר האמירה</button></div></div>`;
}
function homeView() {
  const d = today(), P = portion(todayPid());
  let bm = "";
  if (S.bm) {
    loadText(); const t = tgt(S.bm.k), vt = TX && TX[t.c - 1][S.bm.v] ? stripT(TX[t.c - 1][S.bm.v]).trim().split(/\s+/).slice(0, 7).join(" ") + " …" : "";
    bm = `<div class="card bmcard"><div class="ico">${BMI}</div><div class="tx"><small>המשך מהמקום שעצרת</small><b>${kName(S.bm.k)} · פסוק ${gem(S.bm.v + 1)}</b>${vt ? `<span>${vt}</span>` : ""}</div><button class="go" data-read="${S.bm.k}" data-v="${S.bm.v}" ${S.bm.p ? `data-p="${S.bm.p}"` : ""} data-resume>המשך לומר ‹</button></div>`;
  }
  const rp = roundPct();
  return `<div class="hero"><div class="htop"><div class="logo"><img src="logo.png" alt="קהילת אבני החושן"></div><div class="hded"><div><small>לעילוי נשמת</small><b>ר׳ אברהם בן ברכה</b></div><i></i><div><small>ולעילוי נשמת</small><b>חנה בת חג׳ילה</b></div><i></i><div><small>ולעילוי נשמת</small><b>שלום שלומי בן חנה</b></div></div></div><h1>ספר <b>תהילים</b></h1><p>למה אומרים כל פרק · סיכום המלבי״ם · פירוש שטיינזלץ</p><div class="orn">✦</div></div>
  <div class="card datecard"><div class="he">${hebFmt(d)}</div><div class="gr">${wdFmt.format(d)} · ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}</div>${todayShifted ? `<div class="gr" style="margin-top:6px;font-size:14px">🌙 היום העברי החל בשקיעה</div>` : ""}
  <div class="swrow"><span>היום מתחלף:</span><button class="sg ${S.sunset ? "on" : ""}" data-sunset="1">🌙 בשקיעה</button><button class="sg ${!S.sunset ? "on" : ""}" data-sunset="0">🕛 בחצות</button></div><div class="swrow" style="margin-top:10px">חלוקה יומית:</div><div class="modes" style="margin-top:4px"><button class="sg ${S.mode === "m" ? "on" : ""}" data-mode="m">📅 לפי ימי החודש</button><button class="sg ${S.mode === "w" ? "on" : ""}" data-mode="w">🗓️ לפי ימי השבוע</button></div></div>
  ${bm}${portionCard(P, true)}
  <div class="card prog" data-go="progress" role="button" tabindex="0" style="cursor:pointer"><div class="ring" style="--p:${rp}"><i>${rp}%</i></div><div style="flex:1"><b style="font-size:18px">הסבב שלי בספר תהילים</b>${trophy()}<div style="color:var(--mute);margin:2px 0 8px">${cntSince(S.round)} מתוך ${TOTAL} פרקים בסבב ${gem(S.rounds + 1)}</div><div class="bar"><i style="width:${rp}%"></i></div></div></div>
  <div class="card"><h3 class="sh">📖 בחירת פרקים</h3><div class="choose">
   <button data-go="days"><i>📅</i><b>לפי ימי החודש</b><span>30 ימים בחודש</span></button>
   <button data-go="weeks"><i>🗓️</i><b>לפי ימי השבוע</b><span>שבעה ימים</span></button>
   <button data-go="chapters"><i>🔢</i><b>לפי פרקים</b><span>כל 150 הפרקים</span></button>
   <button data-go="books"><i>📚</i><b>לפי ספרים</b><span>חמשת ספרי התהילים</span></button>
   <button class="wide" data-go="needs"><i>🙏</i><b>חיפוש לפי בקשה</b><span>רפואה, לידה, פרנסה, דרך, שלום בית ועוד</span></button></div></div>
  ${reminderCard()}${shareCard()}${footer(true)}${tabs()}`;
}
function reminderCard() {
  return `<div class="card"><h3 class="sh">${I.bell} תזכורת יומית</h3><div style="color:var(--mute);font-size:14px;margin-bottom:10px">מוסיפה ליומן שלך אירוע חוזר בכל יום עם התראה, וקישור ישיר לאפליקציה.</div>
  <div class="remrow"><input type="time" id="remT" value="${S.remT}" aria-label="שעת התזכורת"><label><input type="checkbox" id="remShab" ${S.remShab ? "checked" : ""}> בלי שבת</label><button class="btn" data-remind>הוסף ליומן</button></div></div>`;
}
function chaptersView() {
  let g = ""; for (let c = 1; c <= 150; c++) { const k = String(c), on = isDoneK(k, S.round); g += `<button class="${on ? "on" : ""} ${S.bm && tgt(S.bm.k).c === c ? "bm" : ""}" data-read="${k}" aria-label="פרק ${gem(c)}${segOf(c) ? " - " + esc(segOf(c)) : ""}">${gem(c)}</button>`; }
  return hdr("לפי פרקים") + `<div class="card"><div class="bkhead">בחרו פרק</div><div class="grid">${g}</div><div style="color:var(--mute);font-size:13px;margin-top:10px">ירוק = נאמר בסבב הנוכחי · מסגרת זהב = סימניה</div></div>` + footer(false) + tabs();
}
const lrow = (P, cur) => { const pct = pctP(P); return `<button class="lrow ${cur ? "cur" : ""}" data-gop="${P.id}"><div class="t"><b>${P.title}${cur ? " · היום" : ""}</b><span>${P.sub}</span></div><span class="ck ${pct === 100 ? "on" : ""}" aria-label="${pct}%">${pct === 100 ? "✓" : pct ? pct + "%" : ""}</span></button>`; };
function booksView() { return hdr("לפי ספרים") + BOOKS.map((_, i) => lrow(portion("b" + i))).join("") + footer(false) + tabs(); }
function daysView() {
  const tp = S.mode === "m" ? todayPid() : (hebOf(today()).d === 29 && monthLen(today()) === 29 ? "m29s" : "m" + hebOf(today()).d);
  let h = ""; for (let n = 1; n <= 30; n++) h += lrow(portion("m" + n), tp === "m" + n);
  if (monthLen(today()) === 29) h += lrow(portion("m29s"), tp === "m29s");
  return hdr("לפי ימי החודש") + `<div style="color:var(--mute);font-size:14px;margin:0 4px 6px">החלוקה המקובלת לשלושים ימי החודש. בחודש חסר (29 יום) אומרים ביום כ״ט גם את פרקי יום ל׳.</div>` + h + footer(false) + tabs();
}
function weeksView() { const td = today().getDay(); let h = ""; for (let n = 0; n < 7; n++) h += lrow(portion("w" + n), n === td); return hdr("לפי ימי השבוע") + h + footer(false) + tabs(); }
function needsView() {
  return hdr("חיפוש לפי בקשה") + `<div style="color:var(--mute);font-size:14px;margin:0 4px 6px">בחרו את הבקשה, וקבלו את הפרקים שנזכרו לה בספר ״שמוש תהלים״.</div>` +
    CAT.map((c, i) => `<button class="lrow" data-gop="c${i}"><span style="font-size:28px">${c[0]}</span><div class="t"><b>${c[1]}</b><span>פרקים ${c[2].map(gem).join(", ")}</span>${c[3] ? `<span style="color:var(--c1);font-weight:700">${c[3]}</span>` : ""}</div></button>`).join("") + footer(false) + tabs();
}
function portionView() {
  const P = portion(route.p), since = P.since();
  const rows = P.ks.map(k => { const c = tgt(k).c, on = isDoneK(k, since), sg = T.seg[c] || "";
    return `<div class="lrow"><button class="ck ${on ? "on" : ""}" data-toggle="${k}" data-p="${P.id}" aria-label="${on ? "בטל סימון" : "סמן כנאמר"}">${on ? "✓" : ""}</button><div class="t" data-read="${k}" data-p="${P.id}" role="button" tabindex="0" style="cursor:pointer"><b>${kName(k)}</b><span>${sg ? "🔹 " + esc(sg) : ""}</span></div><button class="go2" data-read="${k}" data-p="${P.id}">לאמירה ‹</button></div>`; }).join("");
  const back = route.p[0] === "b" ? "books" : route.p[0] === "w" ? "weeks" : route.p[0] === "c" ? "needs" : "days";
  return `<header class="rh" style="margin-bottom:12px"><button class="home" data-go="${back}"><span>‹ חזרה</span></button><div class="rt">${P.title}</div></header>${portionCard(P, false)}${rows}${footer(false)}${tabs()}`;
}
function progressView() {
  let h = hdr("ההתקדמות שלי"), body = "";
  const seg = [["d", "היום"], ["w", "השבוע"], ["m", "החודש"], ["r", "סבב שלם"]].map(([k, n]) => `<button class="${S.pv === k ? "on" : ""}" data-pv="${k}">${n}</button>`).join("");
  const ring = (pct, title, sub) => `<div class="card prog stick"><div class="ring" style="--p:${pct}"><i>${pct}%</i></div><div style="flex:1"><b style="font-size:18px">${title}</b><div style="color:var(--mute);margin:2px 0 8px">${sub}</div><div class="bar"><i style="width:${pct}%"></i></div></div></div>`;
  if (S.pv === "d") {
    const P = portion(todayPid()), pct = pctP(P);
    body = ring(pct, "השיעור של היום", `${P.title} · ${cntSince(P.since(), P.ks)} מתוך ${sizeOf(P.ks)} פרקים`) + portionCard(P, true);
  } else if (S.pv === "w") {
    const ws = weekStart(), pct = Math.round(cntSince(ws) / TOTAL * 100), td = today().getDay();
    body = ring(pct, "השבוע", `${cntSince(ws)} מתוך ${TOTAL} פרקים נאמרו מיום ראשון`) + `<div class="card"><h3 class="sh">ימי השבוע</h3><div class="dgrid">${WEEK.map((ks, n) => `<button class="${isAll(ks, ws) ? "on" : ""} ${n === td ? "cur" : ""}" data-gop="w${n}">${["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש״ק"][n]}<small>${kShort(ks[0])}–${kShort(ks[ks.length - 1])}</small></button>`).join("")}</div></div>`;
  } else if (S.pv === "m") {
    const ms = monthStart(), pct = Math.round(cntSince(ms) / TOTAL * 100), hd = hebOf(today()).d;
    body = ring(pct, "החודש", `${cntSince(ms)} מתוך ${TOTAL} פרקים נאמרו מראש החודש`) + `<div class="card"><h3 class="sh">ימי החודש</h3><div class="dgrid">${MONTH.map((ks, i) => `<button class="${isAll(ks, ms) ? "on" : ""} ${i + 1 === hd ? "cur" : ""}" data-gop="m${i + 1}">${gem(i + 1)}<small>${kShort(ks[0])}${ks.length > 1 ? "–" + kShort(ks[ks.length - 1]) : ""}</small></button>`).join("")}</div></div>`;
  } else {
    const pct = roundPct();
    body = (S.rounds ? `<div class="card fincard">${trophy()}<div class="finlist">${S.fin.map((ts, i) => `<div>סיום ${gem(i + 1)} · ${hebFmt(new Date(ts))} (${new Date(ts).toLocaleDateString("he-IL")})</div>`).join("")}</div></div>` : "") + ring(pct, `סבב ${gem(S.rounds + 1)} בספר תהילים`, `${cntSince(S.round)} מתוך ${TOTAL} פרקים · התחלת ב-${new Date(S.round).toLocaleDateString("he-IL")}`);
    body += BOOKS.map((b, i) => { const ks = range(b[1], b[2]), k = cntSince(S.round, ks), n = sizeOf(ks); return `<button class="book" data-gop="b${i}"><div class="r"><b>${b[0]}</b><span>${k} / ${n}</span></div><div class="bar"><i style="width:${k / n * 100}%;background:var(--c${i % 3 + 1})"></i></div></button>`; }).join("");
    body += `<div style="color:var(--mute);font-size:13px;text-align:center;margin:10px 4px">כשמסיימים את כל 151 הפרקים (קי״ט בשני חלקים), הסיום נרשם והסבב מתחיל מחדש אוטומטית.</div><div class="nav"><button data-newround>↺ איפוס הסבב הנוכחי</button></div>`;
  }
  h += `<div class="pseg">${seg}</div>${body}`;
  h += `<div class="card"><h3 class="sh">💾 גיבוי ושחזור</h3><div style="color:var(--mute);font-size:14px;margin-bottom:8px">ההתקדמות נשמרת רק במכשיר הזה. כדאי לשמור גיבוי, כדי לא לאבד אותה כשעוברים למכשיר אחר.</div><div class="nav" style="justify-content:flex-start"><button data-bk="copy">העתק קוד גיבוי</button><button data-bk="file">שמור גיבוי לקובץ</button><button data-bk="restore">שחזר מקוד</button><button data-bk="load">שחזר מקובץ</button></div><input type="file" id="bkf" accept=".json,application/json" hidden></div>`;
  return h + footer(false) + tabs();
}
const isAll = (ks, since) => ks.every(k => isDoneK(k, since));
const stripT = s => s.replace(/[\u0591-\u05AF\u05C0]/g, "");
const SEG119 = ["לרעד הגוף; למי שרוצה לקיים מצוה", "לשכחה ולפתיחת הלב", "לחשישת עין ימין", "לחשישת עין שמאל; כשקשה לו עצה", "להישמר מן החטא", "בכעס מושל על אדם", "לטחול; כשמסיתים אותו לעצה רעה", "לבטן העליונה", "לכאב הכליות", "לחסד – לאומרו אחר תפילת שחרית", "לנפיחות בצד ימין של האף", "לדין – לאומרו אחר תפילת מנחה", "לכאב יד ימין", "ליוצא לדרך – להינצל מכל צרה", "לפני בקשה – לאומרו ואחר כך לבקש", "לכאב יד שמאל", "לנפיחות בצד שמאל של האף", "", "לכאב רגל שמאל", "לכאב אוזן ימין", "לכאב ראש", "לכאב אוזן שמאל"];
const LETTERS = "אבגדהוזחטיכלמנסעפצקרשת", LNAME = ["אָלֶף", "בֵּית", "גִּימֶל", "דָּלֶת", "הֵא", "וָו", "זַיִן", "חֵית", "טֵית", "יוֹד", "כַּף", "לָמֶד", "מֵם", "נוּן", "סָמֶךְ", "עַיִן", "פֵּא", "צָדִי", "קוֹף", "רֵישׁ", "שִׁין", "תָּו"];
const markV = k => S.bm && S.bm.k === k ? S.bm.v : (route.resume && route.resume.k === k ? route.resume.v : null);
const bmAt = (k, v) => S.bm && S.bm.k === k && S.bm.v === v;
function seqOf() { const P = portion(route.p); return P ? P.ks : null; }
function neighbors() {
  const seq = seqOf(), k = route.k;
  /* פרק סמוך לפי המספר (גם כשיוצאים מגבולות המנה) */
  const c = tgt(k).c, cp = k === "119b" ? "119a" : c > 1 ? String(c - 1) : null, cn = k === "119a" ? "119b" : c < 150 ? String(c + 1) : null;
  if (seq) {
    const i = seq.indexOf(k), last = i === seq.length - 1;
    return { prev: i > 0 ? seq[i - 1] : cp, prevP: i > 0 ? route.p : null, next: i >= 0 && !last ? seq[i + 1] : cn, nextP: i >= 0 && !last ? route.p : null, last };
  }
  return { prev: cp, prevP: null, next: cn, nextP: null, last: false };
}
const chapNav = nb => `<div class="chnav">${nb.prev ? `<button data-gok="${nb.prev}" ${nb.prevP ? `data-p="${nb.prevP}"` : ""}>› ${kName(nb.prev)}<small>הפרק הקודם</small></button>` : "<span></span>"}${nb.next ? `<button class="n" data-gok="${nb.next}" ${nb.nextP ? `data-p="${nb.nextP}"` : ""}>${kName(nb.next)} ‹<small>הפרק הבא</small></button>` : "<span></span>"}</div>`;
function readView() {
  const k = route.k, t = tgt(k), c = t.c, P = portion(route.p), since = P ? P.since() : S.round;
  loadText(); loadMal(c); if (S.comm === "st") loadSt(c);
  const head = `<header class="rh">${`<button class="home" data-go="home">${I.home}<span>דף הבית</span></button>`}${navBack()}${navFwd()}<span class="spacer"></span><button class="gear" data-set aria-label="הגדרות תצוגה">Aa</button><div class="rt2">תהילים ${kName(k)}${P ? `<div style="font-size:13px;font-weight:600;opacity:.85">${P.title}</div>` : ""}</div></header>`;
  if (!TX) return head + (txFail ? `<div class="card" style="text-align:center;margin-top:24px"><div style="font-size:18px;font-weight:700">לא הצלחנו לטעון את הטקסט</div><div style="color:var(--mute);margin:6px 0 12px">בדוק את החיבור לאינטרנט ונסה שוב.</div><button class="btn read" style="margin:auto" data-retry>נסה שוב</button></div>` : `<div class="cmn" style="margin-top:40px;font-size:18px">טוען את הפרק…</div>`) + footer(true);
  const sg = segOf(c);
  const mo = !!route.mo, malBox = `<div class="mal-box"><div class="mal-sum">${esc(T.sum[c] || "")}</div><button class="mal-tgl ${mo ? "on" : ""}" data-malfull aria-expanded="${mo}">📜 פירוש המלבי״ם המלא <span class="chev">${mo ? "▴" : "▾"}</span></button>${mo ? `<div class="mal-full">${malFullHTML(c, t)}</div>` : ""}</div>`;
  const segLine = sg ? `<div class="segline">${esc(sg)}</div>` : "";
  const al = audioLinks(k), tools = (al ? `<div class="tools">${al}</div>` : "") + `<div class="cmsel2"><div class="cmlbl">פירוש לכל פסוק</div><div class="cmseg">
   <button class="cmb n ${S.comm === "" ? "on" : ""}" data-comm="" aria-pressed="${S.comm === ""}"><i>📖</i><span>מקרא</span></button>
   <button class="cmb s ${S.comm === "st" ? "on" : ""}" data-comm="st" aria-pressed="${S.comm === "st"}"><i>📗</i><span>שטיינזלץ</span></button>
   <button class="cmb m ${S.comm === "ml" ? "on" : ""}" data-comm="ml" aria-pressed="${S.comm === "ml"}"><i>📘</i><span>מלבי״ם</span></button></div></div>`;
  const first = P && P.ks[0] === k ? `<div style="text-align:center;margin:4px 0"><button class="pbtn" data-prayer="before">🙏 תפילה לפני האמירה</button></div>` : "";
  const hint = !S.hintBm && !S.bm ? `<div class="hint"><div>💡 <b>עצרתם באמצע?</b> לחצו על מספר <b>הפסוק הבא</b> שעוד לא אמרתם. הקו יסמן עד היכן הגעתם, ובפעם הבאה תמשיכו בדיוק משם.</div><button data-hint>הבנתי</button></div>` : "";
  let cmNote = "";
  if (S.comm === "st" && !ST[c]) cmNote = `<div class="cmn">${stFail[c] ? "פירוש שטיינזלץ נטען מאתר ספריא ודורש חיבור לאינטרנט (אחרי טעינה ראשונה הוא נשמר במכשיר). <button class='pbtn' data-retryst>נסה שוב</button>" : "טוען את פירוש שטיינזלץ…"}</div>`;
  if (S.comm === "ml" && !MAL[c]) cmNote = `<div class="cmn">${malFail[c] ? "לא הצלחנו לטעון את פירוש המלבי״ם." : "טוען את פירוש המלבי״ם…"}</div>`;
  const vs = TX[c - 1]; let tx = "";
  for (let i = t.a; i <= t.z; i++) {
    const v = vs[i] || ""; const pb = v.endsWith("\n");
    if (c === 119 && i % 8 === 0) tx += `<span class="lh">${LETTERS[i / 8]} · ${LNAME[i / 8]}${SEG119[i / 8] ? `<small class="lseg">🔹 ${SEG119[i / 8]}</small>` : ""}</span>`;
    if (markV(k) === i) tx += bmAt(k, i) ? `<div class="bmline" id="bmline"><span>🔖 עד כאן אמרתי</span><button data-bmclear>הסר</button></div>` : `<div class="bmline" id="bmline"><span>🔖 כאן עצרת בפעם הקודמת</span></div>`;
    tx += `<span class="v ${markV(k) === i ? "bm" : ""} ${route.pulseV === i && Date.now() < route.pulseUntil ? "pulse" : ""}" id="v${i}"><button class="vn ${bmAt(k, i) ? "on" : ""}" data-bm="${i}" aria-pressed="${bmAt(k, i)}" aria-label="סימניה: עד כאן אמרתי, לפני פסוק ${gem(i + 1)}">${gem(i + 1)}${BMI}</button>${NK.html(v.trim(), S.taamim)} </span>`;
    if (S.comm === "st" && ST[c] && ST[c][i]) tx += `<span class="cm">${clean(ST[c][i])}</span>`;
    else if (S.comm === "ml" && MAL[c] && MAL[c][i] && MAL[c][i].length) tx += `<span class="cm ml">${MAL[c][i].map(x => `<p>${clean(x)}</p>`).join("")}</span>`;
    else if (pb) tx += '<span class="pb"></span>';
  }
  const done = isDoneK(k, since), nb = neighbors();
  const endCard = (!P || nb.last) ? `<div class="card donecard"><b>${P ? "סיימתם את " + P.title + "! חזק וברוך" : "סיימתם את הפרק"}</b>${!done ? `<button class="btn chk" data-toggle="${k}" ${P ? `data-p="${P.id}"` : ""}>${I.check} סמן כנאמר</button> ` : ""}<button class="pbtn" data-prayer="after" ${P ? `data-pp="${P.id}"` : ""}>🙏 תפילה לאחר האמירה</button></div>` : "";
  return head + malBox + tools + first + hint + cmNote + segLine + `<div class="text" style="--fs:${S.fs}px">${tx}</div>` + endCard + chapNav(nb) + footer(true) +
    `<div class="rbar"><button data-prevk ${nb.prev ? "" : "disabled"}>› הקודם<small>${nb.prev ? kShort(nb.prev) : ""}</small></button><button class="learn ${done ? "on" : ""}" data-toggle="${k}" ${P ? `data-p="${P.id}"` : ""}>${done ? "✓ נאמר" : "סמן כנאמר"}</button><button class="next" data-nextk ${nb.next ? "" : "disabled"}>הבא ‹<small>${nb.next ? kShort(nb.next) : ""}</small></button></div>`;
}
let lastBm = null;
function pulseVerse(v, el) { route.pulseV = v; route.pulseUntil = Date.now() + 2800; el.classList.remove("pulse"); void el.offsetWidth; el.classList.add("pulse"); }
function render() {
  const sy = window.scrollY, app = $("#app"), V = { read: readView, p: portionView, chapters: chaptersView, books: booksView, days: daysView, weeks: weeksView, needs: needsView, progress: progressView, search: searchView };
  app.innerHTML = (V[route.v] || homeView)();
  if (route.v === "search") { searchInit(); route.keep = false; return; }
  if (route.v === "read") {
    const t = route.scrollV != null ? route.scrollV : markV(route.k), el = t != null ? $("#v" + t) : null;
    if (route.keep) window.scrollTo(0, sy); else if (el) { el.scrollIntoView({ block: "center" }); pulseVerse(t, el); } else window.scrollTo(0, 0);
    route.keep = false; route.scrollV = null;
  } else if (route.keep) { window.scrollTo(0, sy); route.keep = false; } else window.scrollTo(0, 0);
}

/* ---------- תפילות (נוסח ספרדי מקובל) ---------- */
const BEFORE = `<h4>קודם אמירת תהילים</h4><p>לְכוּ נְרַנְּנָה לַה׳ נָרִיעָה לְצוּר יִשְׁעֵנוּ: נְקַדְּמָה פָנָיו בְּתוֹדָה בִּזְמִרוֹת נָרִיעַ לוֹ: כִּי אֵל גָּדוֹל ה׳ וּמֶלֶךְ גָּדוֹל עַל כָּל אֱלֹהִים:</p>
<h4>יהי רצון קודם אמירת תהילים</h4><p>יְהִי רָצוֹן מִלְּפָנֶיךָ ה׳ אֱלֹהֵינוּ וֵאלֹהֵי אֲבוֹתֵינוּ, הַבּוֹחֵר בְּדָוִד עַבְדּוֹ וּבְזַרְעוֹ אַחֲרָיו, וְהַבּוֹחֵר בְּשִׁירוֹת וְתִשְׁבָּחוֹת, שֶׁתֵּפֶן בְּרַחֲמִים אֶל קְרִיאַת מִזְמוֹרֵי תְהִלִּים שֶׁאֶקְרָא, כְּאִלּוּ אֲמָרָם דָּוִד הַמֶּלֶךְ עָלָיו הַשָּׁלוֹם בְּעַצְמוֹ, זְכוּתוֹ יָגֵן עָלֵינוּ. וְיַעֲמוֹד לָנוּ זְכוּת פְּסוּקֵי תְהִלִּים וּזְכוּת תֵּבוֹתֵיהֶם וְאוֹתִיּוֹתֵיהֶם וּנְקֻדּוֹתֵיהֶם וְטַעֲמֵיהֶם, וְהַשֵּׁמוֹת הַיּוֹצְאִים מֵהֶם מֵרָאשֵׁי תֵבוֹת וּמִסּוֹפֵי תֵבוֹת, לְכַפֵּר פְּשָׁעֵינוּ וַעֲוֹנוֹתֵינוּ וְחַטֹּאתֵינוּ, וּלְזַמֵּר עָרִיצִים וּלְהַכְרִית כָּל הַחוֹחִים וְהַקּוֹצִים הַסּוֹבְבִים אֶת הַשּׁוֹשַׁנָּה הָעֶלְיוֹנָה, וּלְחַבֵּר אֵשֶׁת נְעוּרִים עִם דּוֹדָהּ בְּאַהֲבָה וְאַחֲוָה וְרֵעוּת. וּמִשָּׁם יִמָּשֵׁךְ לָנוּ שֶׁפַע לְנֶפֶשׁ רוּחַ וּנְשָׁמָה, לְטַהֲרֵנוּ מֵעֲוֹנוֹתֵינוּ וְלִסְלֹחַ חַטֹּאתֵינוּ וּלְכַפֵּר פְּשָׁעֵינוּ, כְּמוֹ שֶׁסָּלַחְתָּ לְדָוִד שֶׁאָמַר מִזְמוֹרִים אֵלּוּ לְפָנֶיךָ, כְּמוֹ שֶׁנֶּאֱמַר: גַּם ה׳ הֶעֱבִיר חַטָּאתְךָ לֹא תָמוּת. וְאַל תִּקָּחֵנוּ מֵהָעוֹלָם הַזֶּה קֹדֶם זְמַנֵּנוּ, עַד מְלֹאת שְׁנוֹתֵינוּ בָּהֶם שִׁבְעִים שָׁנָה, בְּאֹפֶן שֶׁנּוּכַל לְתַקֵּן אֵת אֲשֶׁר שִׁחַתְנוּ. וּזְכוּת דָּוִד הַמֶּלֶךְ עָלָיו הַשָּׁלוֹם יָגֵן עָלֵינוּ וּבַעֲדֵנוּ, שֶׁתַּאֲרִיךְ אַפְּךָ עַד שׁוּבֵנוּ אֵלֶיךָ בִּתְשׁוּבָה שְׁלֵמָה לְפָנֶיךָ, וּמֵאוֹצַר מַתְּנַת חִנָּם חָנֵּנוּ, כְּדִכְתִיב: וְחַנֹּתִי אֶת אֲשֶׁר אָחֹן וְרִחַמְתִּי אֶת אֲשֶׁר אֲרַחֵם. וּכְשֵׁם שֶׁאָנוּ אוֹמְרִים לְפָנֶיךָ שִׁירָה בָּעוֹלָם הַזֶּה, כָּךְ נִזְכֶּה לוֹמַר לְפָנֶיךָ ה׳ אֱלֹהֵינוּ שִׁיר וּשְׁבָחָה לָעוֹלָם הַבָּא. וְעַל יְדֵי אֲמִירַת תְּהִלִּים תִּתְעוֹרֵר חֲבַצֶּלֶת הַשָּׁרוֹן, וְלָשִׁיר בְּקוֹל נָעִים בְּגִילַת וְרַנֵּן, כְּבוֹד הַלְּבָנוֹן נִתַּן לָהּ, הוֹד וְהָדָר בְּבֵית אֱלֹהֵינוּ, בִּמְהֵרָה בְיָמֵינוּ, אָמֵן סֶלָה.</p>`;
const ORD = ["רִאשׁוֹן", "שֵׁנִי", "שְׁלִישִׁי", "רְבִיעִי", "חֲמִישִׁי"], AGAINST = ["בְּרֵאשִׁית", "שְׁמוֹת", "וַיִּקְרָא", "בְּמִדְבַּר", "דְּבָרִים"];
const AFTER = b => `<h4>לאחר אמירת תהילים</h4><p>מִי יִתֵּן מִצִּיּוֹן יְשׁוּעַת יִשְׂרָאֵל בְּשׁוּב ה׳ שְׁבוּת עַמּוֹ יָגֵל יַעֲקֹב יִשְׂמַח יִשְׂרָאֵל: וּתְשׁוּעַת צַדִּיקִים מֵה׳ מָעוּזָּם בְּעֵת צָרָה: וַיַּעְזְרֵם ה׳ וַיְפַלְּטֵם יְפַלְּטֵם מֵרְשָׁעִים וְיוֹשִׁיעֵם כִּי חָסוּ בוֹ:</p>
<h4>יהי רצון לאחר אמירת ${["ספר ראשון", "ספר שני", "ספר שלישי", "ספר רביעי", "ספר חמישי"][b]}</h4><p>יְהִי רָצוֹן מִלְּפָנֶיךָ ה׳ אֱלֹהֵינוּ וֵאלֹהֵי אֲבוֹתֵינוּ, בִּזְכוּת סֵפֶר ${ORD[b]} שֶׁבַּתְּהִלִּים שֶׁקָּרִינוּ לְפָנֶיךָ, שֶׁהוּא כְּנֶגֶד סֵפֶר ${AGAINST[b]}, בִּזְכוּת מִזְמוֹרָיו, וּבִזְכוּת פְּסוּקָיו, וּבִזְכוּת תֵּבוֹתָיו, וּבִזְכוּת אוֹתִיּוֹתָיו, וּבִזְכוּת נְקֻדּוֹתָיו, וּבִזְכוּת טְעָמָיו, וּבִזְכוּת שְׁמוֹתֶיךָ הַקְּדוֹשִׁים וְהַטְּהוֹרִים הַיּוֹצְאִים מִמֶּנּוּ, שֶׁתְּכַפֵּר לָנוּ עַל כָּל חַטֹּאתֵינוּ, וְתִסְלַח לָנוּ עַל כָּל עֲוֹנוֹתֵינוּ, וְתִמְחַל לָנוּ עַל כָּל פְּשָׁעֵינוּ שֶׁחָטָאנוּ וְשֶׁעָוִינוּ וְשֶׁפָּשַׁעְנוּ לְפָנֶיךָ, וְהַחֲזִירֵנוּ בִּתְשׁוּבָה שְׁלֵמָה לְפָנֶיךָ, וְהַדְרִיכֵנוּ לַעֲבוֹדָתֶךָ, וְתִפְתַּח לִבֵּנוּ בְּתַלְמוּד תּוֹרָתֶךָ, וְתִשְׁלַח רְפוּאָה שְׁלֵמָה לְחוֹלֵי עַמֶּךָ, וְתִקְרָא לִשְׁבוּיִים דְּרוֹר וְלַאֲסוּרִים פְּקַח קוֹחַ, וּלְכָל הוֹלְכֵי דְרָכִים וְעוֹבְרֵי יַמִּים וּנְהָרוֹת מֵעַמְּךָ יִשְׂרָאֵל תַּצִּילֵם מִכָּל צַעַר וָנֵזֶק, וְתַגִּיעֵם לִמְחוֹז חֶפְצָם לְחַיִּים וּלְשָׁלוֹם, וְתִפְקֹד לְכָל חֲשׂוּכֵי בָנִים בְּזֶרַע שֶׁל קַיָּמָא לַעֲבוֹדָתֶךָ וּלְיִרְאָתֶךָ, וְהַנָּשִׁים הַמְעֻבָּרוֹת שֶׁל עַמְּךָ בֵּית יִשְׂרָאֵל תַּצִּילֵן שֶׁלֹּא תַפֵּלְנָה וַלְדוֹתֵיהֶן, וְהַיּוֹשְׁבוֹת עַל הַמַּשְׁבֵּר לֹא יֶאֱרַע לָהֶן שׁוּם צַעַר וָנֵזֶק, וְהַמֵּינִיקוֹת לֹא יֶחְסַר לָהֶן חָלָב, וְאַל יִשְׁלוֹט אַסְכָּרָא וְשֵׁדִין וְרוּחִין וְלִילִין וְכָל פְּגָעִים וּמַרְעִין בִּישִׁין בְּכָל יַלְדֵי עַמְּךָ בֵּית יִשְׂרָאֵל, וּתְגַדְּלֵם לְתוֹרָתֶךָ לִלְמוֹד תּוֹרָה לִשְׁמָהּ, וְתַצִּילֵם מֵעַיִן הָרָע וּמִדֶּבֶר וּמִמַּגֵּפָה וּמִשָּׂטָן וּמִיֵּצֶר הָרָע, וּתְבַטֵּל מֵעָלֵינוּ וּמִכָּל עַמְּךָ בֵּית יִשְׂרָאֵל בְּכָל מָקוֹם שֶׁהֵם כָּל גְּזֵרוֹת קָשׁוֹת וְרָעוֹת, וְתַטֶּה לֵב הַמַּלְכוּת עָלֵינוּ לְטוֹבָה, וְתִגְזוֹר עָלֵינוּ גְּזֵרוֹת טוֹבוֹת, וְתִשְׁלַח בְּרָכָה וְהַצְלָחָה בְּכָל מַעֲשֵׂה יָדֵינוּ, וְהָכֵן פַּרְנָסָתֵנוּ מִיָּדְךָ הַטּוֹבָה וְהָרְחָבָה, וְלֹא נִצְטָרֵךְ לִידֵי מַתְּנַת בָּשָׂר וָדָם וְלֹא לִידֵי הַלְוָאָתָם, וְתֵן לְכָל אִישׁ וָאִישׁ דֵּי פַרְנָסָתוֹ, וּלְכָל גְּוִיָּה וּגְוִיָּה דֵּי מַחְסוֹרָהּ, וּתְמַהֵר וְתָחִישׁ לְגָאֳלֵנוּ, וְתִבְנֶה בֵּית מִקְדָּשֵׁנוּ וְתִפְאַרְתֵּנוּ. וּבִזְכוּת שְׁלֹשׁ עֶשְׂרֵה מִדּוֹתֶיךָ שֶׁל רַחֲמִים הַכְּתוּבוֹת בְּתוֹרָתֶךָ, כְּמוֹ שֶׁנֶּאֱמַר: ה׳ ה׳ אֵל רַחוּם וְחַנּוּן אֶרֶךְ אַפַּיִם וְרַב חֶסֶד וֶאֱמֶת: נֹצֵר חֶסֶד לָאֲלָפִים נֹשֵׂא עָוֹן וָפֶשַׁע וְחַטָּאָה וְנַקֵּה. שֶׁאֵינָן חוֹזְרוֹת רֵיקָם מִלְּפָנֶיךָ, עָזְרֵנוּ אֱלֹהֵי יִשְׁעֵנוּ עַל דְּבַר כְּבוֹד שְׁמֶךָ, וְהַצִּילֵנוּ וְכַפֵּר עַל חַטֹּאתֵינוּ לְמַעַן שְׁמֶךָ. בָּרוּךְ ה׳ לְעוֹלָם אָמֵן וְאָמֵן.</p>`;
function prayerHTML(kind, b) {
  const sel = kind === "after" ? `<div class="seg" style="flex-wrap:wrap;margin:8px 0">${BOOKS.map((x, i) => `<button class="${i === b ? "on" : ""}" data-prayer="after" data-pb="${i}">${x[0]}</button>`).join("")}</div><div style="font-size:13px;color:var(--mute)">בחרו את הספר שממנו אמרתם (נבחר אוטומטית לפי הפרק האחרון)</div>` : "";
  return `<button class="x" data-close aria-label="סגור">✕</button><h3 class="sh" style="margin-top:4px">🙏 ${kind === "before" ? "תפילה לפני אמירת תהילים" : "תפילה לאחר אמירת תהילים"}</h3>${sel}<div class="prayer" style="--fs:${S.fs}px">${kind === "before" ? BEFORE : AFTER(b)}</div><div class="srcnote">נוסח ספרדי מקובל, כפי שנדפס בספרי תהילים.</div>`;
}

/* ---------- חלונות קופצים ---------- */
let prevFocus = null;
function closeSheet() {
  const ov = $("#ov"), was = ov.classList.contains("show");
  ov.classList.remove("show"); document.body.style.overflow = ""; $("#app").removeAttribute("aria-hidden"); $("#app").removeAttribute("inert");
  if (was && prevFocus && document.contains(prevFocus)) prevFocus.focus();
  prevFocus = null;
}
function openSheet(html) {
  const ov = $("#ov"); if (!ov.classList.contains("show")) prevFocus = document.activeElement;
  $("#sheet").innerHTML = html; ov.classList.add("show"); document.body.style.overflow = "hidden"; $("#app").setAttribute("aria-hidden", "true"); $("#app").setAttribute("inert", "");
  ($("#sheet .x") || $("#sheet")).focus(); $("#sheet").scrollTop = 0;
}
function settingsHTML() {
  const th = [["auto", "אוטומטי", "linear-gradient(90deg,#f4efe4 50%,#12161c 50%)"], ["light", "יום", "#f4efe4"], ["sepia", "קלף", "#efe2c3"], ["dark", "לילה", "#12161c"]];
  const sw = (k, on) => `<button class="sw ${on ? "on" : ""}" data-sw="${k}" role="switch" aria-checked="${on}"></button>`;
  return `<button class="x" data-close aria-label="סגור">✕</button><h3 class="sh" style="margin-top:4px">הגדרות תצוגה</h3>
  <div class="row"><span>גודל הכתב</span><div class="seg"><button data-fs="-2">א−</button><button class="on" disabled>${S.fs}</button><button data-fs="2">א+</button></div></div>
  <div class="row"><span>טעמי המקרא</span>${sw("taamim", S.taamim)}</div>
  <div class="row"><span>סימון מיוחד לשוא נע, לקמץ קטן ולדגש חזק</span>${sw("nk", S.nk)}</div>
  <div class="nklg"><span><i class="nk-s">בְ</i><small>שוא נע</small></span><span><i class="nk-q">מׇ</i><small>קמץ קטן</small></span><span><i class="nk-d">נּ</i><small>דגש חזק</small></span></div>
  <div class="srcnote" style="margin:0 0 6px">שוא נע מוצג כשוא מודגש, קמץ קטן כ-T מודגש, ודגש חזק כמעוין. קמץ קטן מזוהה לפי הנוסח; שוא נע ודגש חזק – אוטומטית לפי כללי הדקדוק.</div>
  <div class="row"><span>היום מתחלף בשקיעה <small style="color:var(--mute)">(כמו התאריך העברי)</small></span>${sw("sunset", S.sunset)}</div>
  <div style="margin-top:12px;font-weight:700">מצב תצוגה</div>
  <div class="themes" style="margin-top:8px">${th.map(([k, n, c]) => `<button class="${S.theme === k ? "on" : ""}" data-th="${k}"><i style="background:${c}"></i>${n}</button>`).join("")}</div>`;
}

/* ---------- תזכורת ביומן (קובץ ics) ---------- */
function remind() {
  const tm = ($("#remT") && $("#remT").value) || S.remT, noShab = $("#remShab") ? $("#remShab").checked : S.remShab;
  S.remT = tm; S.remShab = noShab; save();
  const n = new Date(), [hh, mm] = tm.split(":"), ds = `${n.getFullYear()}${pad(n.getMonth() + 1)}${pad(n.getDate())}T${hh}${mm}00`;
  const st = n.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//tehillim-app//HE", "CALSCALE:GREGORIAN", "BEGIN:VEVENT", "UID:tehillim-" + Date.now() + "@tehillim-app", "DTSTAMP:" + st, "DTSTART:" + ds, "DURATION:PT15M",
    "RRULE:FREQ=DAILY" + (noShab ? ";BYDAY=SU,MO,TU,WE,TH,FR" : ""), "SUMMARY:📖 אמירת תהילים", "DESCRIPTION:השיעור היומי בספר תהילים: " + SHARE_URL, "URL:" + SHARE_URL,
    "BEGIN:VALARM", "TRIGGER:PT0M", "ACTION:DISPLAY", "DESCRIPTION:זמן לומר תהילים", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const name = "tehillim-reminder.ics", f = typeof File === "function" ? new File([ics], name, { type: "text/calendar" }) : null;
  if (f && navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f], title: "תזכורת תהילים" }).catch(() => {}); return; }
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" })), a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000); toast("נוצר קובץ תזכורת – פתחו אותו כדי להוסיף ליומן");
}

/* ---------- סימון ---------- */
const trophy = () => S.rounds ? `<div class="trophy">🏆 סיימת את ספר תהילים ${S.rounds === 1 ? "פעם אחת" : S.rounds === 2 ? "פעמיים" : S.rounds + " פעמים"}</div>` : "";
function finishRound() {                        // סיום הספר: נרשם, והסבב מתאפס
  S.rounds++; S.fin.push(Date.now()); S.round = Date.now() + 1;
  setTimeout(() => openSheet(`<button class="x" data-close aria-label="סגור">✕</button><div style="text-align:center;padding:10px 4px"><div style="font-size:56px">🏆</div><h3 class="sh" style="justify-content:center;font-size:24px">מזל טוב! סיימתם את ספר תהילים</h3><div class="sumtxt" style="text-align:center">זה הסיום ${["הראשון", "השני", "השלישי", "הרביעי", "החמישי", "השישי", "השביעי", "השמיני", "התשיעי", "העשירי"][S.rounds - 1] || "ה-" + S.rounds} שלכם – חזק וברוך!<br>הסבב התאפס, ואפשר להתחיל סבב ${gem(S.rounds + 1)}.</div><div class="row2" style="justify-content:center;margin-top:14px"><button class="pbtn" data-prayer="after" data-pb="4">🙏 תפילה לאחר האמירה</button></div></div>`), 400);
}
function toggleK(k, p) {
  const P = portion(p), since = P ? P.since() : S.round, us = unitsOf(k);
  if (isDoneK(k, since)) { us.forEach(u => delete S.done[u]); toast("הסימון בוטל"); }
  else {
    const was = cntSince(S.round); us.forEach(u => S.done[u] = Date.now());
    if (P && isAll(P.ks, since)) toast("🎉 סיימתם את " + P.title + "!"); else toast("סומן כנאמר ✓");
    if (was < TOTAL && cntSince(S.round) === TOTAL) { finishRound(); save(); route.keep = true; render(); return; }
  }
  save(); route.keep = true; render();
}

/* ---------- אירועים ---------- */
document.addEventListener("click", e => {
  if (e.target.id === "ov") return closeSheet();
  const t = e.target.closest("[data-go],[data-gop],[data-read],[data-toggle],[data-mode],[data-bm],[data-fs],[data-set],[data-sw],[data-th],[data-close],[data-nextk],[data-prevk],[data-gok],[data-hint],[data-undo],[data-share],[data-installhelp],[data-bmclear],[data-retry],[data-retryst],[data-bk],[data-navback],[data-navfwd],[data-refresh],[data-offline],[data-newver-update],[data-newver-later],[data-bkdo],[data-sr],[data-smore],[data-sfull],[data-prayer],[data-malfull],[data-comm],[data-sunset],[data-pv],[data-newround],[data-remind]");
  if (!t) return;
  const D = t.dataset;
  if (t.hasAttribute("data-close")) closeSheet();
  else if (t.hasAttribute("data-set")) openSheet(settingsHTML());
  else if (D.sw) { S[D.sw] = !S[D.sw]; save(); if (D.sw === "sunset") checkDayRoll(); if (D.sw === "nk") applyNk(); t.classList.toggle("on", S[D.sw]); t.setAttribute("aria-checked", S[D.sw]); route.keep = true; render(); }
  else if (D.th) { S.theme = D.th; applyTheme(); save(); document.querySelectorAll("#sheet [data-th]").forEach(b => b.classList.toggle("on", b.dataset.th === S.theme)); }
  else if (D.fs && t.closest("#sheet")) { S.fs = Math.min(48, Math.max(16, S.fs + +D.fs)); save(); const tx = $(".text"); if (tx) tx.style.setProperty("--fs", S.fs + "px"); const lb = t.parentElement.querySelector(".on"); if (lb) lb.textContent = S.fs; }
  else if (t.hasAttribute("data-refresh")) hardRefresh();
  else if (t.hasAttribute("data-offline")) offlineDownload();
  else if (t.hasAttribute("data-newver-update")) hardRefresh();
  else if (t.hasAttribute("data-newver-later")) { const b = $("#newver"); if (b) { verDismissed = b.dataset.v; b.remove(); } }
  else if (t.hasAttribute("data-bkdo")) { const c = ($("#bkcode").value || "").trim(); if (!c) return; closeSheet(); try { applyBackup(fromCode(c)); } catch (er) { toast("הקוד לא תקין"); } }
  else if (t.hasAttribute("data-smore")) { SQ.shown += 100; drawResults(); }
  else if (t.hasAttribute("data-sfull")) { SQ.full = true; SQ.shown = 100; const cb = $("#sfull"); if (cb) cb.checked = true; runSearch(); }
  else if (D.sr) { const [c, i] = D.sr.split(":").map(Number); SQ.scroll = window.scrollY; go({ v: "read", k: unitFor(c, i), p: null, scrollV: i }); }
  else if (t.hasAttribute("data-navback")) { if (navIdx > 0) history.back(); }
  else if (t.hasAttribute("data-navfwd")) { if (navIdx < navMax) history.forward(); }
  else if (D.prayer) { const pp = D.pp ? portion(D.pp) : null, last = pp ? pp.ks[pp.ks.length - 1] : (route.v === "read" ? route.k : "150"); const b = D.pb != null ? +D.pb : Math.max(0, bookOf(tgt(last).c)); openSheet(prayerHTML(D.prayer, b)); }
  else if (t.hasAttribute("data-malfull")) { route.mo = !route.mo; route.keep = true; render(); }
  else if (D.comm != null) { S.comm = D.comm; route.keep = true; render(); }
  else if (D.sunset != null) { S.sunset = D.sunset === "1"; save(); checkDayRoll(); toast(S.sunset ? "היום מתחלף בשקיעה" : "היום מתחלף בחצות"); route.keep = true; render(); }
  else if (D.pv) { S.pv = D.pv; save(); route.keep = true; render(); }
  else if (D.mode) { S.mode = D.mode; save(); toast(S.mode === "m" ? "חלוקה לפי ימי החודש" : "חלוקה לפי ימי השבוע"); route.keep = true; render(); }
  else if (t.hasAttribute("data-newround")) { if (confirm("לאפס את הסבב הנוכחי בלי לרשום סיום? הסיומים הקודמים יישמרו.")) { S.round = Date.now(); save(); toast("הסבב אופס – בהצלחה!"); route.keep = true; render(); } }
  else if (t.hasAttribute("data-remind")) remind();
  else if (t.hasAttribute("data-share")) shareApp(D.share);
  else if (t.hasAttribute("data-installhelp")) openSheet(installHelpHTML());
  else if (t.hasAttribute("data-hint")) { S.hintBm = true; save(); route.keep = true; render(); }
  else if (t.hasAttribute("data-bmclear")) { S.bm = null; save(); toast("הסימניה הוסרה"); route.keep = true; render(); }
  else if (t.hasAttribute("data-retry")) { txFail = false; render(); }
  else if (t.hasAttribute("data-retryst")) { delete stFail[tgt(route.k).c]; route.keep = true; render(); }
  else if (D.bk) backup(D.bk);
  else if (D.go) go({ v: D.go });
  else if (D.gop) go({ v: "p", p: D.gop });
  else if (t.hasAttribute("data-undo")) { if (lastBm) { S.bm = lastBm; lastBm = null; save(); $("#toast").classList.remove("show"); route.resume = null; route.keep = true; render(); } }
  else if (D.toggle != null) toggleK(D.toggle, D.p || (route.v === "read" ? route.p : null));
  else if (D.read != null) {
    const r = { v: "read", k: D.read, p: D.p && portion(D.p) ? D.p : null, scrollV: D.v != null ? +D.v : null };
    if (t.hasAttribute("data-resume") && S.bm) { lastBm = S.bm; r.resume = S.bm; S.bm = null; save(); toast("הסימניה הוסרה - ממשיכים הלאה", "ביטול"); }
    go(r);
  }
  else if (D.bm != null) { const v = +D.bm; if (bmAt(route.k, v)) { S.bm = null; toast("הסימניה הוסרה"); } else { S.bm = { k: route.k, v, p: route.p || null }; route.resume = null; toast(`🔖 סומן: עד כאן אמרתי, לפני פסוק ${gem(v + 1)}`); S.hintBm = true; } save(); route.keep = true; render(); }
  else if (t.hasAttribute("data-nextk") || t.hasAttribute("data-prevk")) { const nb = neighbors(), nx = t.hasAttribute("data-nextk"), k = nx ? nb.next : nb.prev; if (k) go({ v: "read", k, p: nx ? nb.nextP : nb.prevP }, true); }
  else if (D.gok) go({ v: "read", k: D.gok, p: D.p && portion(D.p) ? D.p : null }, true);
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeSheet();
  if (e.key === "Tab" && $("#ov").classList.contains("show")) {   // מלכודת פוקוס: Tab לא יוצא מהחלונית לשורת הכתובת של הדפדפן
    const sh = $("#sheet"), fs = [...sh.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(x => x.offsetParent !== null || x === document.activeElement);
    if (!fs.length) { e.preventDefault(); sh.focus(); }
    else {
      const first = fs[0], last = fs[fs.length - 1], ae = document.activeElement;
      if (!sh.contains(ae) || ae === sh) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
      else if (e.shiftKey && ae === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && ae === last) { e.preventDefault(); first.focus(); }
    }
  }
  if ((e.key === "Enter" || e.key === " ") && e.target.getAttribute && e.target.getAttribute("role") === "button") { e.preventDefault(); e.target.click(); }
});
/* ---------- גיבוי ושחזור ---------- */
const bkData = () => ({ app: "tehillim", v: 1, done: S.done, bm: S.bm, round: S.round, rounds: S.rounds, fin: S.fin });
const toCode = o => { const b = new TextEncoder().encode(JSON.stringify(o)); let s = ""; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode.apply(null, b.subarray(i, i + 8192)); return btoa(s); };
const fromCode = c => { if (c.length > 200000) throw 0; return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(c), ch => ch.charCodeAt(0)))); };
function applyBackup(o) {
  if (!o || o.app !== "tehillim" || !o.done || typeof o.done !== "object") throw 0;
  for (const k of Object.keys(o.done)) if (UNITS[k] && Number.isFinite(o.done[k])) S.done[k] = Math.max(S.done[k] || 0, o.done[k]);
  if (o.bm && validK(o.bm.k) && Number.isInteger(o.bm.v) && o.bm.v >= tgt(o.bm.k).a && o.bm.v <= tgt(o.bm.k).z) S.bm = { k: o.bm.k, v: o.bm.v, p: portion(o.bm.p) ? o.bm.p : null };
  if (Number.isFinite(o.round)) S.round = Math.min(S.round, o.round);
  if (Number.isInteger(o.rounds)) S.rounds = Math.max(S.rounds, o.rounds);
  if (Array.isArray(o.fin)) S.fin = [...new Set(S.fin.concat(o.fin.filter(Number.isFinite)))].sort((a, b) => a - b);
  save(); toast("הגיבוי שוחזר ✓"); route.keep = true; render();
}
function backup(kind) {
  if (kind === "copy") {
    const c = toCode(bkData());
    (navigator.clipboard ? navigator.clipboard.writeText(c).then(() => toast("הקוד הועתק - שמור אותו במקום בטוח")) : Promise.reject()).catch(() => prompt("העתק את הקוד ושמור אותו:", c));
  } else if (kind === "file") {
    const json = JSON.stringify(bkData()), d = today(), name = `tehillim-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
    const f = typeof File === "function" ? new File([json], name, { type: "application/json" }) : null;
    if (f && navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f] }).catch(() => {}); return; }
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" })), a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  } else if (kind === "restore") {
    openSheet(`<button class="x" data-close aria-label="סגור">✕</button><h3 class="sh" style="margin-top:4px">שחזור מקוד</h3><p style="margin:0 0 8px;color:var(--mute);font-size:14px">הדביקו כאן את קוד הגיבוי ולחצו ״שחזר״.</p><textarea id="bkcode" dir="ltr" rows="5" style="width:100%;box-sizing:border-box;border:1px solid var(--line);border-radius:10px;padding:10px;font-size:14px;background:var(--bg);color:var(--ink)"></textarea><div class="nav"><button class="p" data-bkdo>שחזר</button></div>`);
    setTimeout(() => { const t = $("#bkcode"); if (t) t.focus(); }, 50);
  } else if (kind === "load") $("#bkf").click();
}
document.addEventListener("change", e => {
  if (e.target.id === "bkf" && e.target.files[0]) { const r = new FileReader(); r.onload = () => { try { if (r.result.length > 400000) throw 0; applyBackup(JSON.parse(r.result)); } catch (x) { toast("הקובץ לא תקין"); } }; r.readAsText(e.target.files[0]); e.target.value = ""; }
  if (e.target.id === "remT") { S.remT = e.target.value; save(); }
  if (e.target.id === "remShab") { S.remShab = e.target.checked; save(); }
});
let shownPid = todayPid();
function checkDayRoll() { const p = todayPid(); if (p === shownPid) return; shownPid = p; if (route.v !== "read") { route.keep = true; render(); } }
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { checkDayRoll(); checkNewVersion(); } });
window.addEventListener("pageshow", checkDayRoll); window.addEventListener("focus", checkDayRoll);
setInterval(checkDayRoll, 30000);
setInterval(checkNewVersion, 30 * 60000); setTimeout(checkNewVersion, 5000);
fromHash();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(err => console.error("SW registration failed:", err));
