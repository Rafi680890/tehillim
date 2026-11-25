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
function seqOK(ws, ms) {                                  // כמה מילים בחיפוש: לפי הסדר, ולא יותר משתי מילים ביניהן (אשרי האיש, משה ואהרן)
  const rec = (k, from) => { if (k === ms.length) return true; const to = k === 0 ? ws.length : Math.min(ws.length, from + 3); for (let j = from; j < to; j++) if (ms[k](ws[j]) && rec(k + 1, j + 1)) return true; return false; };
  return rec(0, 0);
}
function mkMatch(q, full) {
  const set = new Set(), bare = new Set(), mk = x => full ? variants(x) : [x];
  mk(q).forEach(y => set.add(y));                         // המילה כפי שנכתבה, עם אותיות שימוש אפשריות לפניה
  if ("ובהכלמ".includes(q[0]) && q.length >= 5 || ("וה".includes(q[0]) && q.length >= 4)) mk(q.slice(1)).forEach(y => bare.add(y));   // בהיותם -> גם היותם (רק חשופה, בלי אות שימוש נוספת)
  const nd = [...set, ...bare];
  if (SQ.part) return w => nd.some(n => w.includes(n));
  return w => { if (bare.has(w)) return true; for (let i = 0; i <= 2; i++) { if (i > 0 && !PRE.includes(w[i - 1])) break; const x = w.slice(i); if (x.length < 2) break; if (set.has(x)) return true; } return false; };
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
        ok = seqOK(ws, ms);
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
