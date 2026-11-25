# מרכיב את index.html מ-index.src.html + base.css (עיצוב הבסיס, קבוע); הסקריפטים יוצאים לקבצים נפרדים (nk.js ו-app.js) כדי שה-CSP לא יצטרך unsafe-inline
import re
src=open('index.src.html',encoding='utf-8').read()
base=open('base.css',encoding='utf-8').read()
nk=open('nikud.js',encoding='utf-8').read()
js=open('app.js',encoding='utf-8').read()
V=re.search(r'APP_VERSION = "[^"]*\(v(\d+)\)"',js).group(1)   # מספר הגרסה (v25 וכו') משמש כפרמטר ?v= בכתובות הסקריפטים, כדי שהדפדפן לא יגיש קובץ ישן מהמטמון
open('../index.html','w',encoding='utf-8').write(src.replace('/*BASE*/',base).replace('@V@',V))
open('../nk.js','w',encoding='utf-8').write(nk)
open('../app.js','w',encoding='utf-8').write(js)
print('ok v'+V)
