import re
p='app.js'; s=open(p,encoding='utf-8').read()
def rep(a,b):
    global s
    assert s.count(a)==1,('NOT UNIQUE/FOUND',a[:80],s.count(a)); s=s.replace(a,b)

block=open('up_block.js',encoding='utf-8').read()
rep('const APP_VERSION =', block+'const APP_VERSION =')

# ריענון: בדיקת חיבור אמיתית לפני מחיקת המטמון
rep('''  if (!navigator.onLine) { toast("צריך חיבור לאינטרנט כדי לרענן"); return; }
  toast("מרענן לגרסה החדשה…");''','''  toast("בודק חיבור…");
  try { const r = await fetch(location.pathname + "?r=" + Date.now(), { cache: "no-store" }); if (!r.ok) throw 0; }   // בדיקה אמיתית: onLine מחזיר true גם ב-Wi-Fi בלי אינטרנט
  catch (e) { toast("אין חיבור לאינטרנט - הריענון בוטל, האפליקציה נשארת כמו שהיא"); return; }
  toast("מרענן לגרסה החדשה…");''')

# מניעת לולאת טעינה אינסופית אחרי כשל (טקסט, מלבי"ם, שטיינזלץ)
rep('  if (TX || txLoading) return; txLoading = true; txFail = false;','  if (TX || txLoading || txFail) return; txLoading = true;   // אחרי כשל לא מנסים שוב אוטומטית (אחרת לולאה בלי הפסקה); ניסיון חוזר: כפתור או חזרת חיבור')
rep('  if (MAL[c] || MAL[c] === null) return; MAL[c] = null;','  if (MAL[c] || MAL[c] === null || (malFail[c] && Date.now() - malFail[c] < 20000)) return; delete malFail[c]; MAL[c] = null;')
rep('.catch(() => { delete MAL[c]; malFail[c] = 1; })','.catch(() => { delete MAL[c]; malFail[c] = Date.now(); })')
rep('  if (ST[c] || stLoad[c]) return; stLoad[c] = 1; delete stFail[c];','  if (ST[c] || stLoad[c] || stFail[c]) return; stLoad[c] = 1;')

# גיבוי: הגבלת גודל וחלונית שחזור
rep('const fromCode = c => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(c), ch => ch.charCodeAt(0))));','const fromCode = c => { if (c.length > 200000) throw 0; return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(c), ch => ch.charCodeAt(0)))); };')
rep('r.onload = () => { try { applyBackup(JSON.parse(r.result)); }','r.onload = () => { try { if (r.result.length > 400000) throw 0; applyBackup(JSON.parse(r.result)); }')
rep('''    const c = prompt("הדבק כאן את קוד הגיבוי:"); if (!c) return;
    try { applyBackup(fromCode(c.trim())); } catch (e) { toast("הקוד לא תקין"); }''','''    openSheet(`<button class="x" data-close aria-label="סגור">✕</button><h3 class="sh" style="margin-top:4px">שחזור מקוד</h3><p style="margin:0 0 8px;color:var(--mute);font-size:14px">הדביקו כאן את קוד הגיבוי ולחצו ״שחזר״.</p><textarea id="bkcode" dir="ltr" rows="5" style="width:100%;box-sizing:border-box;border:1px solid var(--line);border-radius:10px;padding:10px;font-size:14px;background:var(--bg);color:var(--ink)"></textarea><div class="nav"><button class="p" data-bkdo>שחזר</button></div>`);
    setTimeout(() => { const t = $("#bkcode"); if (t) t.focus(); }, 50);''')

# מלכודת פוקוס
rep('''document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeSheet();''','''document.addEventListener("keydown", e => {
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
  }''')

# לשונית חיפוש, ניתוב ורינדור
rep('const on = ["progress"].includes(route.v) ? "p" : "d",','const on = ["progress"].includes(route.v) ? "p" : route.v === "search" ? "s" : "d",')
rep('data-go="home">${I.home}<span>דף הבית</span></button>${navFwd()}</nav>`;','data-go="home">${I.home}<span>דף הבית</span></button><button class="${on === "s" ? "on" : ""}" data-go="search" ${on === "s" ? \'aria-current="page"\' : ""}>${I.search}<span>חיפוש</span></button>${navFwd()}</nav>`;')
rep('["chapters", "books", "days", "weeks", "needs", "progress"].includes(v)','["chapters", "books", "days", "weeks", "needs", "progress", "search"].includes(v)')
rep('needs: needsView, progress: progressView };','needs: needsView, progress: progressView, search: searchView };')
rep('''  app.innerHTML = (V[route.v] || homeView)();
  if (route.v === "read") {''','''  app.innerHTML = (V[route.v] || homeView)();
  if (route.v === "search") { searchInit(); route.keep = false; return; }
  if (route.v === "read") {''')
rep("  chart: '<svg","  search: '<svg viewBox=\"0 0 24 24\"><circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"M16.5 16.5L21 21\"/></svg>',\n  chart: '<svg")

# אירועים
rep('[data-refresh],[data-prayer]','[data-refresh],[data-offline],[data-newver-update],[data-newver-later],[data-bkdo],[data-sr],[data-smore],[data-sfull],[data-prayer]')
rep('  else if (t.hasAttribute("data-refresh")) hardRefresh();','''  else if (t.hasAttribute("data-refresh")) hardRefresh();
  else if (t.hasAttribute("data-offline")) offlineDownload();
  else if (t.hasAttribute("data-newver-update")) hardRefresh();
  else if (t.hasAttribute("data-newver-later")) { const b = $("#newver"); if (b) { verDismissed = b.dataset.v; b.remove(); } }
  else if (t.hasAttribute("data-bkdo")) { const c = ($("#bkcode").value || "").trim(); if (!c) return; closeSheet(); try { applyBackup(fromCode(c)); } catch (er) { toast("הקוד לא תקין"); } }
  else if (t.hasAttribute("data-smore")) { SQ.shown += 100; drawResults(); }
  else if (t.hasAttribute("data-sfull")) { SQ.full = true; SQ.shown = 100; const cb = $("#sfull"); if (cb) cb.checked = true; runSearch(); }
  else if (D.sr) { const [c, i] = D.sr.split(":").map(Number); SQ.scroll = window.scrollY; go({ v: "read", k: unitFor(c, i), p: null, scrollV: i }); }''')

# כפתור הורדה לאופליין בתחתית
rep('<div class="vernote">הריענון מוריד את הגרסה העדכנית. ההתקדמות והסימניות שלך נשמרות.</div>','<div class="vernote">הריענון מוריד את הגרסה העדכנית. ההתקדמות והסימניות שלך נשמרות.</div><button class="offbtn" data-offline>📥 הורדה ללימוד אופליין</button><div class="vernote" id="offst">${offStatus()}</div>')

# בדיקת גרסה חדשה
rep('document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") checkDayRoll(); });','document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { checkDayRoll(); checkNewVersion(); } });')
rep('setInterval(checkDayRoll, 30000);','setInterval(checkDayRoll, 30000);\nsetInterval(checkNewVersion, 30 * 60000); setTimeout(checkNewVersion, 5000);')

s=re.sub(r'APP_VERSION = "[^"]*"','APP_VERSION = "2026.11.25 (v26)"',s,1)
open(p,'w',encoding='utf-8').write(s)
print('app.js patched')

# CSS (נוסף ל-index.src.html לפני </style> הראשון, כי base.css קבוע)
h=open('index.src.html',encoding='utf-8').read()
css='''
/* חיפוש, הודעת גרסה חדשה והורדה לאופליין */
.sq{width:100%;box-sizing:border-box;height:48px;border:2px solid var(--line);background:var(--card);border-radius:14px;padding:0 14px;font-size:18px;color:var(--ink);font-family:inherit}
.sq:focus{outline:none;border-color:var(--accent)}
.sopts{display:flex;gap:8px;align-items:center;margin:10px 0 4px;flex-wrap:wrap;font-size:14px;color:var(--mute)}
.sopts select{height:38px;font-size:15px;width:auto;flex:1;min-width:130px}
.sopts label{display:flex;align-items:center;gap:6px;font-weight:600;cursor:pointer}
.ssum{font-size:14px;color:var(--mute);margin:10px 4px 6px;font-weight:700}
.sres{display:block;width:100%;text-align:right;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:10px 12px;margin:6px 0;color:var(--ink);font-family:inherit}
.sres .sref{font-size:13px;font-weight:800;color:var(--accent);margin-bottom:4px}
.sres .stx{font-family:"TanachFont",serif;font-size:21px;line-height:1.75;direction:rtl}
.sres .stx.sg{font-size:18px}
mark.hit{background:var(--mark);color:inherit;border-radius:5px;padding:0 2px}
.smore{display:block;margin:10px auto;border:2px solid var(--accent);background:var(--card);color:var(--accent);border-radius:999px;padding:10px 24px;font-weight:800;font-size:15px}
.newver{position:fixed;top:calc(8px + env(safe-area-inset-top));inset-inline:12px;max-width:520px;margin:0 auto;z-index:35;background:var(--accent);color:var(--card);border-radius:16px;padding:10px 12px;display:flex;align-items:center;gap:10px;box-shadow:0 8px 24px rgba(0,0,0,.3);font-weight:700;font-size:15px}
.newver span{flex:1;line-height:1.3}
.newver .nvu{border:0;background:var(--card);color:var(--accent);border-radius:999px;padding:8px 14px;font-weight:800;font-size:14px;white-space:nowrap}
.newver .nvx{border:0;background:none;color:inherit;font-size:20px;padding:4px 8px;opacity:.85}
.offbtn{display:block;margin:12px auto 0;border:2px solid var(--ok);background:var(--card);color:var(--ok);border-radius:12px;padding:10px 18px;font-weight:800;font-size:15px}
.offbtn:disabled{opacity:.6}
'''
assert h.count('</style>')==1
h=h.replace('</style>',css+'</style>')
open('index.src.html','w',encoding='utf-8').write(h)
print('css added')
