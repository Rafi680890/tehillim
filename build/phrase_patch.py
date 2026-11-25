import re,sys
# מחיל על קובץ JS אחד: חיפוש רצף מילים (לפי הסדר, עד שתי מילים ביניהן) וצורת בסיס "חשופה" בלי אותיות שימוש
OLD_MK = r'''function mkMatch(q, full) {
  const bases = [q]; if ("ובהכלמ".includes(q[0]) && q.length >= 5 || ("וה".includes(q[0]) && q.length >= 4)) bases.push(q.slice(1));   // בהיותם -> גם היותם
  const set = new Set(); for (const x of bases) (full ? variants(x) : [x]).forEach(y => set.add(y)); const nd = [...set];
  if (SQ.part) return w => nd.some(n => w.includes(n));
  return w => { for (let i = 0; i <= 2; i++) { if (i > 0 && !PRE.includes(w[i - 1])) break; const x = w.slice(i); if (x.length < 2) break; if (set.has(x)) return true; } return false; };
}'''
NEW_MK = r'''function seqOK(ws, ms) {                                  // כמה מילים בחיפוש: לפי הסדר, ולא יותר משתי מילים ביניהן (אשרי האיש, משה ואהרן)
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
}'''
OLD_AND = 'for (let k = 0; k < ms.length; k++) { if (!ws.some(ms[k])) { ok = false; break; } }'
NEW_AND = 'ok = seqOK(ws, ms);'
for f in sys.argv[1:]:
    s=open(f,encoding='utf-8').read()
    assert s.count(OLD_MK)==1,(f,'mkMatch',s.count(OLD_MK))
    assert s.count(OLD_AND)==1,(f,'and-loop',s.count(OLD_AND))
    s=s.replace(OLD_MK,NEW_MK).replace(OLD_AND,NEW_AND)
    open(f,'w',encoding='utf-8').write(s)
    print('patched',f)
