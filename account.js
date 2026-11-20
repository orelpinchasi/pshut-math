/* הכרטיס שלי – התקדמות אישית, חשבון תלמיד, סטטיסטיקה אנונימית.
   • ההתקדמות (סרטונים שנצפו) נשמרת במכשיר.
   • אחרי FREE סרטונים בלי חשבון – צריך להירשם (Google או מייל+סיסמה) כדי להמשיך לצפות.
   • כל ביקור/צפייה נספרים אנונימית (בלי פרטים מזהים) – לדף המורה admin.html.
   מפתחות במכשיר: pshut-done {id:זמן}, pshut-undone {id:זמן}, pshut-days [תאריכים], pshut-last {id,title}, pshut-acct (יש חשבון במכשיר) */
(function(){
"use strict";
const CFG = window.PSHUT_FIREBASE || null;
const FREE = 3;                                   // כמה סרטונים אפשר לראות בלי הרשמה
const LESSON_AT = 6;                              // אחרי כמה סרטונים להציע שיעור פרטי (פעם אחת)
const WA = "972506702628";
const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
const st = {get:k=>{try{return localStorage.getItem(k)}catch(e){return null}}, set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}, del:k=>{try{localStorage.removeItem(k)}catch(e){}}};
const jget = (k,d)=>{try{const v=JSON.parse(st.get(k));return v==null?d:v}catch(e){return d}};
const esc = s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const dayOf = t=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jerusalem"}).format(t?new Date(t):new Date());
const GRADES = ["ז׳","ח׳","ט׳","י׳","י״א","י״ב"];
const HIGH = ["י׳","י״א","י״ב"];

/* ---------- סטטיסטיקה אנונימית (Firestore REST, בלי לטעון את Firebase) ---------- */
function track(inc){
  if(!CFG||!CFG.projectId) return;
  try{
    const root=`projects/${CFG.projectId}/databases/(default)/documents`;
    const fp=k=>k.split(".").map(p=>/^[A-Za-z_][A-Za-z_0-9]*$/.test(p)?p:"`"+p.replace(/[`\\]/g,"")+"`").join(".");
    const body={writes:[{update:{name:`${root}/daily/${dayOf()}`,fields:{}},updateMask:{fieldPaths:[]},
      updateTransforms:Object.keys(inc).map(k=>({fieldPath:fp(k),increment:{integerValue:String(inc[k])}}))}]};
    fetch(`https://firestore.googleapis.com/v1/${root}:commit?key=${CFG.apiKey}`,{method:"POST",keepalive:true,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}).catch(()=>{});
  }catch(e){}
}
function source(){
  const p=new URLSearchParams(location.search), u=(p.get("src")||p.get("utm_source")||"").toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,20);
  if(u) return u;
  let h=""; try{h=document.referrer?new URL(document.referrer).hostname:""}catch(e){}
  if(!h||h===location.hostname) return "direct";
  for(const [k,re] of [["google",/google\./],["youtube",/youtube\.|youtu\.be/],["whatsapp",/whatsapp|wa\.me/],["instagram",/instagram/],["facebook",/facebook|fb\./],["tiktok",/tiktok/],["bing",/bing\./]]) if(re.test(h)) return k;
  return "other";
}
(function visit(){
  const d=dayOf(); if(st.get("pshut-visit")===d) return;
  const first=!st.get("pshut-visit"); st.set("pshut-visit",d);
  const inc={visits:1}; if(first) inc.newVisitors=1; inc["src."+source()]=1; track(inc);
})();
function once(key,inc){ const d=dayOf(); if(st.get(key)===d) return; st.set(key,d); track(inc); }

/* ---------- התקדמות במכשיר ---------- */
function load(){
  const done = jget("pshut-done",{}), undone = jget("pshut-undone",{});
  for(const k in done){ if(done[k]===true) done[k]=1; else if(!done[k]) delete done[k]; }
  return {done, undone, days: jget("pshut-days",[]), last: jget("pshut-last",null)};
}
let P = load();
function persist(){ st.set("pshut-done",JSON.stringify(P.done)); st.set("pshut-undone",JSON.stringify(P.undone)); st.set("pshut-days",JSON.stringify(P.days.slice(-120))); if(P.last) st.set("pshut-last",JSON.stringify(P.last)); }
persist();
const watched = ()=>Object.keys(P.done);
function streak(){ const s=new Set(P.days); let n=0, t=Date.now(); if(!s.has(dayOf(t))) t-=864e5; while(s.has(dayOf(t))){n++;t-=864e5;} return n; }

function mark(id, on, title){
  if(!id) return;
  const now = Date.now();
  if(on){ P.done[id]=now; delete P.undone[id]; const d=dayOf(now); if(!P.days.includes(d)) P.days.push(d); P.last={id,title:title||(P.last&&P.last.id===id?P.last.title:"")}; }
  else { delete P.done[id]; P.undone[id]=now; }
  persist(); changed(); cloudSave();
}
function changed(){ dispatchEvent(new CustomEvent("pshut-sync")); decorateGrid(); if(panel.classList.contains("on")&&view==="card") renderPanel(); }

/* ---------- חסימה אחרי FREE סרטונים ---------- */
const hasAcct = ()=>!!(user||st.get("pshut-acct"));
function gated(id){ return !!CFG && !hasAcct() && !P.done[id] && watched().length>=FREE; }
let pending=null;
/* מחזיר true אם הצפייה נחסמה (ואז נפתח חלון ההרשמה) */
function gate(id,title){
  if(!gated(id)) return false;
  pending={id,title}; once("pshut-gate",{gate:1}); openPanel("gate"); return true;
}
function played(id,title){
  track({plays:1,["v."+id]:1});
  mark(id,true,title);
  const n=watched().length;
  if(CFG && !hasAcct() && n===FREE-1) toast(`נשאר עוד סרטון אחד בחינם – אחריו נבקש להירשם (בחינם) 🙂`);
  if(n>=LESSON_AT && !st.get("pshut-lesson-pop")){ st.set("pshut-lesson-pop","1"); setTimeout(lessonPop,1500); }
}
window.PSHUT = { mark, gate, done:()=>{const o={};for(const k in P.done)o[k]=true;return o;}, open:v=>openPanel(v) };

/* ---------- סימון ✓ בכרטיסי הסרטונים בעמוד הבית ---------- */
const idFromCard = c => c.dataset.play || ((c.getAttribute("href")||"").match(/[?&]v=([\w-]{11})/)||[])[1];
function decorateGrid(){
  document.querySelectorAll("#grid .card").forEach(c=>{
    const id=idFromCard(c); if(!id) return;
    const on=!!P.done[id]; c.classList.toggle("seen",on);
    let b=c.querySelector(".seen-b");
    if(on&&!b){ b=document.createElement("span"); b.className="seen-b"; b.textContent="✓ צפיתי"; (c.querySelector(".thumb")||c).appendChild(b); }
    else if(!on&&b) b.remove();
  });
}
if(typeof window.renderGrid==="function"){ const og=window.renderGrid; window.renderGrid=function(){ const r=og.apply(this,arguments); decorateGrid(); return r; }; }
if(typeof window.openModal==="function"){ const om=window.openModal; window.openModal=function(id,title){ if(gate(id,title)) return; played(id,title); return om.apply(this,arguments); }; }
document.addEventListener("click",e=>{ const a=e.target.closest("#grid a.card"); if(!a) return; const id=idFromCard(a); if(!id) return;
  const t=(a.querySelector("h3")||{}).textContent; if(gate(id,t)){ e.preventDefault(); e.stopPropagation(); return; } played(id,t); },true);
decorateGrid();

/* ---------- מסלולי הלמידה (לחישוב "הסרטון הבא") ---------- */
let PATHS=null, TITLES={};
function paths(){ if(PATHS) return Promise.resolve(PATHS);
  return fetch("learn-data.json").then(r=>r.json()).then(d=>{ PATHS=d.paths;
    if(typeof VIDEOS!=="undefined") VIDEOS.forEach(v=>{ if(v.id) TITLES[v.id]=v.title; });
    return PATHS; }).catch(()=>PATHS=[]); }
function pathFor(prof){
  if(!PATHS||!PATHS.length) return null;
  let id = st.get("pshut-path");
  if(prof&&prof.grade){ const c=PATHS.filter(p=>p.grade===prof.grade); const lv=(prof.units||"").replace(/\D/g,"");
    const m=c.find(p=>p.level===lv)||c.find(p=>p.level==="5")||c[0]; if(m&&!(id&&c.some(p=>p.id===id))) id=m.id; }
  return PATHS.find(p=>p.id===id)||PATHS[0];
}
function pathStats(p){
  const all=[]; p.units.forEach(u=>[...u.v,...u.q].forEach(i=>{ if(!all.includes(i)) all.push(i); }));
  const n=all.filter(i=>P.done[i]).length;
  let next=null, unit=null;
  for(const u of p.units){ const i=[...u.v,...u.q].find(x=>!P.done[x]); if(i){ next=i; unit=u.t; break; } }
  const full=p.units.filter(u=>{const a=[...u.v,...u.q];return a.length&&a.every(i=>P.done[i]);}).length;
  return {n, total:all.length, pct: all.length?Math.round(100*n/all.length):0, next, unit, full, units:p.units.length};
}

/* ---------- ממשק: כפתור בתפריט + חלונית ---------- */
const nav = document.querySelector("nav.links");
const navBtn = document.createElement("a");
navBtn.href="#me"; navBtn.className="me"; navBtn.setAttribute("aria-label","הכרטיס שלי");
if(nav){ const cta=nav.querySelector(".cta"); nav.insertBefore(navBtn, cta||null); }
navBtn.addEventListener("click",e=>{ e.preventDefault(); openPanel(); });
function paintNav(){ navBtn.innerHTML = user&&prof ? `<span class="av">${esc((prof.name||"?").trim()[0]||"?")}</span><span class="t"> ${esc(prof.name)}</span>` : (CFG&&!hasAcct() ? `👤<span class="t"> הרשמה / כניסה</span>` : `👤<span class="t"> הכרטיס שלי</span>`); }

const panel = document.createElement("div");
panel.className="acct"; panel.id="acct"; panel.setAttribute("role","dialog"); panel.setAttribute("aria-modal","true");
panel.innerHTML=`<div class="acct-box"><button class="acct-x" type="button" aria-label="סגירה">✕</button><div id="acctBody"></div></div>`;
document.body.appendChild(panel);
const body = panel.querySelector("#acctBody");
panel.addEventListener("click",e=>{ if(e.target===panel||e.target.closest(".acct-x")) closePanel(); });
document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&panel.classList.contains("on")) closePanel(); });
let view="card", msg="", busy=false;
function openPanel(v){
  view=v||(user&&!prof?"profile":"card"); msg=""; busy=false;
  if(["gate","signup","login"].includes(view)) boot();
  panel.classList.add("on"); document.body.style.overflow="hidden"; renderPanel();
  paths().then(()=>{ if(panel.classList.contains("on")&&view==="card") renderPanel(); });
}
function closePanel(){ panel.classList.remove("on"); document.body.style.overflow=""; if(/^#(me|join)$/.test(location.hash)) history.replaceState(null,"",location.pathname+location.search); }
function go(v){ view=v; msg=""; busy=false; renderPanel(); panel.querySelector(".acct-box").scrollTop=0; }
function fail(t){ msg=t; busy=false; renderPanel(); }

function statsHTML(){
  const p=pathFor(prof), s=p?pathStats(p):null;
  const cont = s&&s.next ? `<div class="acct-next"><div><small>הסרטון הבא שלך · ${esc(p.title)}</small><b>${esc(TITLES[s.next]||"")}</b><small>${esc(s.unit)}</small></div><button type="button" class="acct-btn gold" data-act="play" data-id="${s.next}">להמשיך ▶</button></div>`
    : (s&&s.total ? `<div class="acct-next"><b>סיימת את כל המסלול של ${esc(p.title)} 🎉</b></div>` : "");
  return `<div class="acct-stats">
    <div><b>${watched().length}</b><span>סרטונים שצפית</span></div>
    <div><b>${streak()}${streak()?" 🔥":""}</b><span>ימים ברצף</span></div>
    ${s?`<div><b>${s.pct}%</b><span>מהמסלול ${esc(p.grade)}${p.level?` · ${p.level} יח״ל`:""}</span></div><div><b>${s.full}/${s.units}</b><span>נושאים שהשלמת</span></div>`:""}
  </div>${s?`<div class="acct-bar"><i style="width:${s.pct}%"></i></div>`:""}${cont}`;
}
const lessonLink = ()=>`https://wa.me/${WA}?text=${encodeURIComponent(`היי אוראל 👋 הגעתי מהאתר "פשוט להצליח" ואשמח לשמוע על שיעור פרטי${prof?` – ${prof.name}, כיתה ${prof.grade}${prof.units?" "+prof.units:""}`:""}`)}`;
const lessonBox = ()=>`<a class="acct-lesson" href="${lessonLink()}" target="_blank" rel="noopener" data-lesson><span>🎓</span><div><b>רוצה ללמוד אישית עם אוראל?</b><small>שיעור פרטי בכל רמה והכנה לבגרות · מדברים בוואטסאפ</small></div><i>←</i></a>`;
const authBtns = ()=>`<button type="button" class="acct-google" data-act="google">${GLOGO} המשך עם Google</button><div class="acct-or">או עם מייל וסיסמה</div>`;
const pwForm = (kind)=>`<form data-form="${kind}" class="acct-form">
    <label>אימייל<input type="email" name="email" required dir="ltr" autocomplete="email" value="${esc(lastEmail)}"></label>
    <label><span>סיסמה${kind==="signup"?" <em>לפחות 6 תווים</em>":""}</span><span class="pw"><input type="password" name="pw" required dir="ltr" autocomplete="${kind==="signup"?"new-password":"current-password"}"><button type="button" class="eye" data-act="eye" aria-label="הצגת הסיסמה">👁</button></span></label>
    <p class="acct-err">${esc(msg)}</p>
    <button class="acct-btn ${kind==="signup"?"gold ":""}wide" type="submit" ${busy?"disabled":""}>${busy?"רגע…":kind==="signup"?"הרשמה בחינם":"כניסה"}</button>
  </form>`;
let lastEmail="";

function renderPanel(){
  paintNav();
  if(view==="card" && user && !prof) view="profile";
  if(["gate","signup","login"].includes(view) && user && prof){ view="card"; }
  let h="";
  if(view==="card"){
    if(user&&prof){
      h=`<div class="acct-id"><span class="av big">${esc((prof.name||"?").trim()[0])}</span><div><h2>היי ${esc(prof.name)} 👋</h2><p>כיתה ${esc(prof.grade)}${prof.units?` · ${esc(prof.units)}`:""}${prof.school?` · ${esc(prof.school)}`:""}</p></div></div>
      ${statsHTML()}
      <p class="acct-ok">☁️ ההתקדמות שלך שמורה בחשבון – אפשר להמשיך מכל מכשיר.</p>
      ${lessonBox()}
      <div class="acct-row"><label class="acct-sw"><input type="checkbox" data-act="updates" ${prof.updates?"checked":""}> לקבל במייל עדכונים על סרטונים חדשים</label></div>
      <div class="acct-links"><button type="button" data-act="edit">עריכת פרטים</button><button type="button" data-act="logout">יציאה</button><a href="privacy.html">פרטיות</a><button type="button" data-act="delask" class="danger">מחיקת החשבון</button></div>`;
    } else {
      const left=Math.max(0,FREE-watched().length);
      h=`<div class="acct-id"><span class="av big">🪪</span><div><h2>הכרטיס שלי</h2><p>כל סרטון שאתם רואים מסומן ✓, ופה רואים כמה התקדמתם.</p></div></div>
      ${statsHTML()}
      ${CFG?`<div class="acct-cta"><b>${left?`עוד ${left===1?"סרטון אחד":left+" סרטונים"} בחינם בלי הרשמה.`:"כדי להמשיך לצפות צריך להירשם."}</b><span>ההרשמה בחינם, לוקחת דקה, וההתקדמות שלכם נשמרת בכל מכשיר.</span>
        <div class="acct-two"><button type="button" class="acct-btn gold" data-act="signup">הרשמה בחינם</button><button type="button" class="acct-btn ghost" data-act="login">כבר רשום? כניסה</button></div></div>`
      :`<p class="acct-note">ההתקדמות נשמרת במכשיר ובדפדפן האלה.</p>`}`;
    }
  }
  else if(view==="gate"){
    h=`<div class="acct-gate"><div class="big">🎉</div><h2>כל הכבוד! ראית כבר ${watched().length} סרטונים</h2>
      <p>כדי להמשיך לצפות – הירשמו <b>בחינם</b>. ככה גם כל ההתקדמות נשמרת ותוכלו להמשיך מכל מכשיר.</p>
      <ul><li>✓ כל הסרטונים, בלי הגבלה</li><li>✓ מסלול למידה אישי לפי הכיתה</li><li>✓ הכרטיס שלי – רואים כמה התקדמתם</li></ul></div>
      ${authBtns()}${pwForm("signup")}
      <button type="button" class="acct-back" data-act="login">כבר רשומים? כניסה ←</button>`;
  }
  else if(view==="signup"){
    h=`<h2>הרשמה בחינם</h2><p class="acct-sub">דקה אחת, והסרטונים פתוחים בלי הגבלה. ההתקדמות נשמרת בכל מכשיר.</p>
    ${authBtns()}${pwForm("signup")}<button type="button" class="acct-back" data-act="login">כבר רשומים? כניסה ←</button>`;
  }
  else if(view==="login"){
    h=`<h2>כניסה</h2><p class="acct-sub">ברוכים השבים 👋</p>
    ${authBtns()}${pwForm("login")}
    <div class="acct-links"><button type="button" data-act="forgot">שכחתי סיסמה</button><button type="button" data-act="signup">עוד לא רשומים? הרשמה</button></div>`;
  }
  else if(view==="forgot"){
    h=`<h2>איפוס סיסמה</h2><p class="acct-sub">נשלח לכם מייל עם קישור לבחירת סיסמה חדשה.</p>
    <form data-form="forgot" class="acct-form"><label>אימייל<input type="email" name="email" required dir="ltr" autocomplete="email" value="${esc(lastEmail)}"></label><p class="acct-err">${esc(msg)}</p><button class="acct-btn wide" type="submit" ${busy?"disabled":""}>שליחה</button></form>
    <button type="button" class="acct-back" data-act="login">→ חזרה לכניסה</button>`;
  }
  else if(view==="sent"){
    h=`<div class="acct-id"><span class="av big">📬</span><div><h2>שלחנו לכם מייל</h2><p>פתחו את המייל (<span dir="ltr">${esc(lastEmail)}</span>), בחרו סיסמה חדשה וחזרו לכאן להיכנס. לא הגיע? בדקו בספאם.</p></div></div><button type="button" class="acct-back" data-act="login">→ לכניסה</button>`;
  }
  else if(view==="profile"){
    const p=prof||{name:(user&&user.displayName||"").split(" ")[0]||"", grade:"", units:"", school:"", phone:"", updates:false};
    h=`<h2>${prof?"עריכת פרטים":"עוד רגע – כמה פרטים"}</h2><p class="acct-sub">כדי שנתאים לכם את המסלול. ${user&&user.email?`נכנסתם בתור <span dir="ltr">${esc(user.email)}</span>`:""}</p>
    <form data-form="profile" class="acct-form">
      <label>שם פרטי<input name="name" value="${esc(p.name)}" required maxlength="40" autocomplete="given-name"></label>
      <div class="two"><label>כיתה<select name="grade" required><option value="">בחרו</option>${GRADES.map(g=>`<option ${p.grade===g?"selected":""}>${g}</option>`).join("")}</select></label>
      <label>מסלול<select name="units"><option value="">—</option>${["3 יח״ל","4 יח״ל","5 יח״ל"].map(u=>`<option ${p.units===u?"selected":""}>${u}</option>`).join("")}</select></label></div>
      <label><span>בית ספר <em>רשות</em></span><input name="school" value="${esc(p.school)}" maxlength="60"></label>
      <label><span>טלפון <em>רשות</em></span><input name="phone" type="tel" value="${esc(p.phone)}" maxlength="20" dir="ltr" autocomplete="tel"></label>
      <label class="chk"><input type="checkbox" name="updates" ${p.updates?"checked":""}><span>אשמח לקבל במייל עדכונים על סרטונים וחומרים חדשים. אפשר להסיר את עצמי בכל רגע.</span></label>
      ${prof?"":`<label class="chk"><input type="checkbox" name="terms" required><span>קראתי את <a href="privacy.html" target="_blank">מדיניות הפרטיות</a>. אם אני מתחת לגיל 18 – ההורים שלי יודעים שנרשמתי.</span></label>`}
      <p class="acct-err">${esc(msg)}</p>
      <button class="acct-btn gold wide" type="submit" ${busy?"disabled":""}>${prof?"שמירה":pending?"סיום – ולהמשיך לצפות ▶":"סיום ההרשמה"}</button>
    </form>${prof?`<button type="button" class="acct-back" data-act="card">→ חזרה</button>`:`<button type="button" class="acct-back" data-act="logout">ביטול ויציאה</button>`}`;
  }
  else if(view==="lesson"){
    h=`<div class="acct-gate"><div class="big">🎓</div><h2>${prof?esc(prof.name)+", ":""}רואים שאתם רציניים!</h2>
      <p>כבר ${watched().length} סרטונים 👏 רוצים להתקדם עוד יותר מהר? בשיעור פרטי עובדים בדיוק על מה שקשה לכם, בקצב שלכם.</p></div>
      <a class="acct-btn gold wide wa" href="${lessonLink()}" target="_blank" rel="noopener" data-lesson>💬 לקביעת שיעור בוואטסאפ</a>
      <button type="button" class="acct-back" data-act="close">אולי אחר כך</button>`;
  }
  else if(view==="delask"){
    h=`<h2>מחיקת החשבון</h2><p class="acct-sub">כל הפרטים שלכם וההתקדמות השמורה בחשבון יימחקו לצמיתות. ההתקדמות במכשיר הזה תישאר.</p>
    <p class="acct-err">${esc(msg)}</p><div class="acct-links"><button type="button" class="danger" data-act="delete">כן, למחוק</button><button type="button" data-act="card">ביטול</button></div>`;
  }
  body.innerHTML=h;
}
const GLOGO='<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

body.addEventListener("click",e=>{
  if(e.target.closest("[data-lesson]")) track({lesson:1});
  const b=e.target.closest("[data-act]"); if(!b) return;
  const a=b.dataset.act;
  if(["card","signup","login","forgot"].includes(a)){ const em=body.querySelector('input[name=email]'); if(em&&em.value) lastEmail=em.value.trim(); if(a!=="card") boot(); go(a); }
  else if(a==="edit") go("profile");
  else if(a==="delask") go("delask");
  else if(a==="close") closePanel();
  else if(a==="eye"){ const i=b.previousElementSibling; i.type=i.type==="password"?"text":"password"; }
  else if(a==="play"){ const id=b.dataset.id; closePanel(); if(typeof window.openModal==="function") window.openModal(id,TITLES[id]||""); }
  else if(a==="google") googleSignIn();
  else if(a==="logout"){ clearTimeout(saveT); saveT=null; } if(a==="logout") fb().then(f=>f.auth().signOut()).then(()=>{ st.del("pshut-acct"); user=null; prof=null; pending=null; go("card"); });
  else if(a==="delete") deleteAccount();
});
body.addEventListener("change",e=>{ if(e.target.dataset.act==="updates"&&prof){ prof.updates=e.target.checked; saveProfile({updates:prof.updates, updatesAt:Date.now()}); toast(prof.updates?"נרשמתם לעדכונים":"הוסרתם מהעדכונים"); } });
body.addEventListener("submit",e=>{
  e.preventDefault(); if(busy) return; const f=e.target, k=f.dataset.form, d=Object.fromEntries(new FormData(f));
  if(d.email) lastEmail=d.email.trim();
  if(k==="signup"||k==="login") pwAuth(k,lastEmail,d.pw||"");
  else if(k==="forgot") forgot(lastEmail);
  else if(k==="profile"){
    if(!d.name.trim()||!d.grade) return fail("צריך שם וכיתה");
    const np={name:d.name.trim().slice(0,40), grade:d.grade, units:HIGH.includes(d.grade)?(d.units||""):"", school:(d.school||"").trim().slice(0,60), phone:(d.phone||"").trim().slice(0,20), updates:!!d.updates};
    const first=!prof; if(first){ np.consentAt=Date.now(); np.updatesAt=Date.now(); } else if(np.updates!==prof.updates) np.updatesAt=Date.now();
    busy=true; renderPanel();
    saveProfile(np,first).then(()=>{
      prof=Object.assign({},prof||{},np); paintNav();
      const pp=PATHS&&pathFor(prof); if(pp) st.set("pshut-path",pp.id);
      if(first) track({signups:1});
      busy=false;
      if(first&&pending){ const p=pending; pending=null; closePanel(); toast(`ברוכים הבאים, ${prof.name}! 🎉`); if(typeof window.openModal==="function") window.openModal(p.id,p.title); }
      else { go("card"); toast(first?`ברוכים הבאים, ${prof.name}! ההתקדמות נשמרה ☁️`:"הפרטים נשמרו"); }
    }).catch(()=>fail("לא הצלחנו לשמור. בדקו את החיבור ונסו שוב."));
  }
});

/* ---------- חלונות קופצים ---------- */
function lessonPop(){ if(panel.classList.contains("on")) return; openPanel("lesson"); }
function toast(t){ const n=document.createElement("div"); n.className="acct-toast"; n.textContent=t; document.body.appendChild(n); requestAnimationFrame(()=>n.classList.add("on")); setTimeout(()=>{n.classList.remove("on");setTimeout(()=>n.remove(),400);},3200); }

/* ---------- Firebase (נטען רק כשצריך) ---------- */
let user=null, prof=null, _fb=null, booted=false, saveT=null;
function script(src){ return new Promise((ok,no)=>{ const s=document.createElement("script"); s.src=src; s.onload=ok; s.onerror=no; document.head.appendChild(s); }); }
function fb(){
  if(!CFG) return Promise.reject(new Error("no config"));
  if(_fb) return _fb;
  _fb = script(SDK+"firebase-app-compat.js").then(()=>Promise.all([script(SDK+"firebase-auth-compat.js"),script(SDK+"firebase-firestore-compat.js")]))
    .then(()=>{ if(!firebase.apps.length) firebase.initializeApp(CFG); firebase.auth().languageCode="he"; return firebase; });
  _fb.catch(()=>{ _fb=null; });
  return _fb;
}
const docRef = ()=>firebase.firestore().collection("users").doc(user.uid);
const ERR = {"auth/email-already-in-use":"המייל הזה כבר רשום – נסו \"כניסה\"","auth/invalid-email":"נראה שהמייל לא תקין","auth/weak-password":"הסיסמה צריכה להיות לפחות 6 תווים",
  "auth/invalid-credential":"מייל או סיסמה לא נכונים","auth/wrong-password":"מייל או סיסמה לא נכונים","auth/user-not-found":"לא מצאנו חשבון עם המייל הזה – נסו \"הרשמה\"",
  "auth/too-many-requests":"יותר מדי ניסיונות. חכו כמה דקות ונסו שוב.","auth/network-request-failed":"אין חיבור לאינטרנט. נסו שוב.","auth/user-disabled":"החשבון הזה הושבת.",
  "auth/account-exists-with-different-credential":"המייל הזה כבר רשום בדרך אחרת – נסו להיכנס עם Google או עם סיסמה."};
const errMsg = (e,d)=>ERR[e&&e.code]||d;

function googleSignIn(){
  busy=true;
  fb().then(f=>{ const pr=new f.auth.GoogleAuthProvider(); pr.setCustomParameters({prompt:"select_account"});
    const standalone=matchMedia("(display-mode: standalone)").matches||navigator.standalone;
    if(pending) st.set("pshut-pending",JSON.stringify(pending));
    return standalone ? f.auth().signInWithRedirect(pr) : f.auth().signInWithPopup(pr).catch(err=>{ if(/popup-blocked|operation-not-supported/.test(err.code)) return f.auth().signInWithRedirect(pr); throw err; });
  }).then(()=>{ busy=false; }).catch(err=>{ busy=false; if(err&&/popup-closed|cancelled-popup/.test(err.code)) return; fail(errMsg(err,"ההתחברות לא הצליחה. נסו שוב.")); });
}
function pwAuth(kind,email,pw){
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("נראה שהמייל לא תקין");
  if(pw.length<6) return fail("הסיסמה צריכה להיות לפחות 6 תווים");
  busy=true; msg=""; renderPanel();
  fb().then(f=> kind==="signup" ? f.auth().createUserWithEmailAndPassword(email,pw) : f.auth().signInWithEmailAndPassword(email,pw))
    .catch(err=>fail(errMsg(err,"משהו השתבש. נסו שוב.")));
}
function forgot(email){
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("נראה שהמייל לא תקין");
  busy=true; renderPanel();
  fb().then(f=>f.auth().sendPasswordResetEmail(email,{url:location.origin+location.pathname+"#me"})).then(()=>go("sent"))
    .catch(err=>{ if(err&&err.code==="auth/user-not-found") return go("sent"); fail(errMsg(err,"לא הצלחנו לשלוח. נסו שוב בעוד רגע.")); });
}

/* מיזוג: לכל סרטון – הפעולה האחרונה (צפיתי / ביטלתי) מנצחת */
function merge(cloud){
  const cd=cloud.done||{}, cu=cloud.undone||{};
  const ids=new Set([...Object.keys(P.done),...Object.keys(P.undone),...Object.keys(cd),...Object.keys(cu)]);
  const done={}, undone={};
  ids.forEach(i=>{ const on=Math.max(P.done[i]||0,cd[i]||0), off=Math.max(P.undone[i]||0,cu[i]||0); if(on>off) done[i]=on; else if(off) undone[i]=off; });
  P.done=done; P.undone=undone; P.days=[...new Set([...(P.days||[]),...(cloud.days||[])])].sort().slice(-120);
  if(!P.last&&cloud.last) P.last=cloud.last;
  persist(); changed();
}
function progressDoc(){ return {done:P.done, undone:P.undone, days:P.days.slice(-120), last:P.last||null, doneCount:watched().length, lastSeen:firebase.firestore.FieldValue.serverTimestamp()}; }
function cloudSave(){ if(!user||!prof) return; clearTimeout(saveT); saveT=setTimeout(()=>{ saveT=null; if(user&&prof) docRef().set(progressDoc(),{merge:true}).catch(()=>{}); },1500); }
function saveProfile(fields,first){
  const data=Object.assign({},fields);
  if(first) Object.assign(data,{email:user.email||"", createdAt:firebase.firestore.FieldValue.serverTimestamp()},progressDoc());
  return docRef().set(data,{merge:true});
}
function deleteAccount(){
  docRef().delete().then(()=>user.delete()).then(()=>{ st.del("pshut-acct"); prof=null; go("card"); toast("החשבון נמחק"); })
    .catch(err=>{ if(err&&err.code==="auth/requires-recent-login") msg="הפרטים נמחקו. כדי למחוק גם את הכניסה – צאו, היכנסו שוב ומחקו שוב."; else msg="המחיקה לא הצליחה. נסו שוב."; renderPanel(); });
}
addEventListener("pagehide",()=>{ if(saveT&&user&&prof){ clearTimeout(saveT); docRef().set(progressDoc(),{merge:true}).catch(()=>{}); } });

function boot(){
  if(!CFG||booted) return; booted=true;
  fb().then(f=>{
    const a=f.auth();
    a.getRedirectResult().catch(()=>{});
    a.onAuthStateChanged(u=>{
      user=u; prof=null;
      if(!u){ st.del("pshut-acct"); paintNav(); if(panel.classList.contains("on")&&["card","profile"].includes(view)) go("card"); return; }
      st.set("pshut-acct","1");
      if(!pending){ const pp=jget("pshut-pending",null); if(pp) pending=pp; } st.del("pshut-pending");
      docRef().get().then(s=>{
        if(s.exists){ const d=s.data(); prof={name:d.name,grade:d.grade,units:d.units||"",school:d.school||"",phone:d.phone||"",updates:!!d.updates}; merge(d); cloudSave(); }
        paintNav();
        if(!prof) openPanel("profile");
        else if(pending){ const p=pending; pending=null; closePanel(); toast(`היי ${prof.name}! ממשיכים 🎬`); if(typeof window.openModal==="function") window.openModal(p.id,p.title); }
        else if(panel.classList.contains("on")&&["gate","signup","login","card","profile"].includes(view)){ if(view!=="card") toast(`היי ${prof.name}! 👋`); go("card"); }
      }).catch(()=>{ paintNav(); });
    });
  }).catch(()=>{ booted=false; });
}

if(CFG && st.get("pshut-acct")) boot();
paintNav();
if(location.hash==="#me") openPanel();
else if(location.hash==="#join") openPanel(hasAcct()?"card":"signup");
})();
