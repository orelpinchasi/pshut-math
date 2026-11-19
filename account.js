/* הכרטיס שלי – התקדמות אישית וחשבון תלמיד (לא חובה).
   • ההתקדמות (סרטונים שנצפו) נשמרת תמיד במכשיר, בלי הרשמה.
   • אם מוגדר Firebase (firebase-config.js) – אפשר להירשם עם Google או במייל, וההתקדמות נשמרת בכל מכשיר.
   מפתחות במכשיר: pshut-done {id:זמן}, pshut-undone {id:זמן}, pshut-days [תאריכים], pshut-last {id,title} */
(function(){
"use strict";
const CFG = window.PSHUT_FIREBASE || null;
const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
const st = {get:k=>{try{return localStorage.getItem(k)}catch(e){return null}}, set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}, del:k=>{try{localStorage.removeItem(k)}catch(e){}}};
const jget = (k,d)=>{try{const v=JSON.parse(st.get(k));return v==null?d:v}catch(e){return d}};
const esc = s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const dayOf = t=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jerusalem"}).format(t?new Date(t):new Date());
const GRADES = ["ז׳","ח׳","ט׳","י׳","י״א","י״ב"];
const HIGH = ["י׳","י״א","י״ב"];

/* ---------- התקדמות במכשיר ---------- */
function load(){
  const done = jget("pshut-done",{}), undone = jget("pshut-undone",{});
  for(const k in done){ if(done[k]===true) done[k]=1; else if(!done[k]) delete done[k]; }  // מהגרסה הקודמת: true/false
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
  if(on && !user && CFG && watched().length>=1) nudge();
}
function changed(){ dispatchEvent(new CustomEvent("pshut-sync")); decorateGrid(); if(panel.classList.contains("on")) renderPanel(); }
window.PSHUT = { mark, done:()=>{const o={};for(const k in P.done)o[k]=true;return o;}, open:()=>openPanel() };

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
if(typeof window.openModal==="function"){ const om=window.openModal; window.openModal=function(id,title){ mark(id,true,title); return om.apply(this,arguments); }; }
document.addEventListener("click",e=>{ const a=e.target.closest("#grid a.card"); if(a){ const id=idFromCard(a); if(id) mark(id,true,(a.querySelector("h3")||{}).textContent); } },true);
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
function paintNav(){ navBtn.innerHTML = user&&prof ? `<span class="av">${esc((prof.name||"?").trim()[0]||"?")}</span><span class="t"> ${esc(prof.name)}</span>` : `👤<span class="t"> הכרטיס שלי</span>`; }

const panel = document.createElement("div");
panel.className="acct"; panel.id="acct"; panel.setAttribute("role","dialog"); panel.setAttribute("aria-modal","true");
panel.innerHTML=`<div class="acct-box"><button class="acct-x" type="button" aria-label="סגירה">✕</button><div id="acctBody"></div></div>`;
document.body.appendChild(panel);
const body = panel.querySelector("#acctBody");
panel.addEventListener("click",e=>{ if(e.target===panel||e.target.closest(".acct-x")) closePanel(); });
document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&panel.classList.contains("on")) closePanel(); });
let view="card", msg="";
function openPanel(v){ view=v||(user&&!prof?"profile":"card"); msg=""; panel.classList.add("on"); document.body.style.overflow="hidden"; renderPanel(); paths().then(()=>{ if(panel.classList.contains("on")&&view==="card") renderPanel(); }); }
function closePanel(){ panel.classList.remove("on"); document.body.style.overflow=""; if(location.hash==="#me") history.replaceState(null,"",location.pathname+location.search); }
function go(v){ view=v; msg=""; renderPanel(); panel.querySelector(".acct-box").scrollTop=0; }

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

function renderPanel(){
  paintNav();
  if(view==="card" && user && !prof) view="profile";
  let h="";
  if(view==="card"){
    if(user&&prof){
      h=`<div class="acct-id"><span class="av big">${esc((prof.name||"?").trim()[0])}</span><div><h2>היי ${esc(prof.name)} 👋</h2><p>כיתה ${esc(prof.grade)}${prof.units?` · ${esc(prof.units)}`:""}${prof.school?` · ${esc(prof.school)}`:""}</p></div></div>
      ${statsHTML()}
      <p class="acct-ok">☁️ ההתקדמות שלך נשמרת בחשבון – אפשר להמשיך מכל מכשיר.</p>
      <div class="acct-row">
        <label class="acct-sw"><input type="checkbox" data-act="updates" ${prof.updates?"checked":""}> לקבל במייל עדכונים על סרטונים חדשים</label>
      </div>
      <div class="acct-links"><button type="button" data-act="edit">עריכת פרטים</button><button type="button" data-act="logout">יציאה</button><a href="privacy.html">פרטיות</a><button type="button" data-act="delask" class="danger">מחיקת החשבון</button></div>`;
    } else {
      h=`<div class="acct-id"><span class="av big">🪪</span><div><h2>הכרטיס שלי</h2><p>כל סרטון שאתם רואים מסומן ✓, ופה רואים כמה התקדמתם.</p></div></div>
      ${statsHTML()}
      ${CFG?`<div class="acct-cta"><b>ההתקדמות נשמרת כרגע רק במכשיר הזה.</b><span>רוצים לשמור אותה ולהמשיך מכל מכשיר? ההרשמה בחינם ולא חובה.</span><button type="button" class="acct-btn gold" data-act="signin">שמירת ההתקדמות בחשבון</button></div>`
      :`<p class="acct-note">ההתקדמות נשמרת במכשיר ובדפדפן האלה.</p>`}`;
    }
  }
  else if(view==="signin"){
    h=`<h2>שמירת ההתקדמות</h2><p class="acct-sub">נכנסים פעם אחת, וההתקדמות נשמרת בכל מכשיר. בלי סיסמה.</p>
    <button type="button" class="acct-google" data-act="google">${GLOGO} המשך עם Google</button>
    ${window.PSHUT_EMAIL_LINK?`<div class="acct-or">או בקישור למייל</div>
    <form data-form="email"><input type="email" name="email" placeholder="האימייל שלכם" autocomplete="email" required dir="ltr"><button class="acct-btn" type="submit">שלחו לי קישור</button></form>`:""}
    <p class="acct-err">${esc(msg)}</p><button type="button" class="acct-back" data-act="card">→ חזרה</button>`;
  }
  else if(view==="sent"){
    h=`<div class="acct-id"><span class="av big">📬</span><div><h2>שלחנו לכם קישור</h2><p>פתחו את המייל (${esc(st.get("pshut-email")||"")}) ולחצו על הקישור – תיכנסו אוטומטית. לא הגיע? בדקו גם בספאם.</p></div></div><button type="button" class="acct-back" data-act="card">→ חזרה</button>`;
  }
  else if(view==="needEmail"){
    h=`<h2>כמעט שם</h2><p class="acct-sub">פתחתם את הקישור במכשיר אחר. הקלידו שוב את המייל שאליו נשלח הקישור:</p>
    <form data-form="finish"><input type="email" name="email" required dir="ltr" autocomplete="email"><button class="acct-btn" type="submit">כניסה</button></form><p class="acct-err">${esc(msg)}</p>`;
  }
  else if(view==="profile"){
    const p=prof||{name:(user&&user.displayName||"").split(" ")[0]||"", grade:"", units:"", school:"", phone:"", updates:false};
    h=`<h2>${prof?"עריכת פרטים":"עוד רגע – כמה פרטים"}</h2><p class="acct-sub">כדי שנראה לכם את המסלול המתאים. ${user&&user.email?`נכנסתם בתור <span dir="ltr">${esc(user.email)}</span>`:""}</p>
    <form data-form="profile" class="acct-form">
      <label>שם פרטי<input name="name" value="${esc(p.name)}" required maxlength="40" autocomplete="given-name"></label>
      <div class="two"><label>כיתה<select name="grade" required><option value="">בחרו</option>${GRADES.map(g=>`<option ${p.grade===g?"selected":""}>${g}</option>`).join("")}</select></label>
      <label>מסלול<select name="units"><option value="">—</option>${["3 יח״ל","4 יח״ל","5 יח״ל"].map(u=>`<option ${p.units===u?"selected":""}>${u}</option>`).join("")}</select></label></div>
      <label><span>בית ספר <em>רשות</em></span><input name="school" value="${esc(p.school)}" maxlength="60"></label>
      <label><span>טלפון <em>רשות</em></span><input name="phone" type="tel" value="${esc(p.phone)}" maxlength="20" dir="ltr" autocomplete="tel"></label>
      <label class="chk"><input type="checkbox" name="updates" ${p.updates?"checked":""}><span>אשמח לקבל במייל עדכונים על סרטונים וחומרים חדשים. אפשר להסיר את עצמי בכל רגע.</span></label>
      ${prof?"":`<label class="chk"><input type="checkbox" name="terms" required><span>קראתי את <a href="privacy.html" target="_blank">מדיניות הפרטיות</a>. אם אני מתחת לגיל 18 – ההורים שלי יודעים שנרשמתי.</span></label>`}
      <p class="acct-err">${esc(msg)}</p>
      <button class="acct-btn gold wide" type="submit">${prof?"שמירה":"סיום ושמירת ההתקדמות"}</button>
    </form>${prof?`<button type="button" class="acct-back" data-act="card">→ חזרה</button>`:`<button type="button" class="acct-back" data-act="logout">ביטול ויציאה</button>`}`;
  }
  else if(view==="delask"){
    h=`<h2>מחיקת החשבון</h2><p class="acct-sub">כל הפרטים שלכם וההתקדמות השמורה בחשבון יימחקו לצמיתות. ההתקדמות במכשיר הזה תישאר.</p>
    <p class="acct-err">${esc(msg)}</p><div class="acct-links"><button type="button" class="danger" data-act="delete">כן, למחוק</button><button type="button" data-act="card">ביטול</button></div>`;
  }
  body.innerHTML=h;
}
const GLOGO='<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

body.addEventListener("click",e=>{
  const b=e.target.closest("[data-act]"); if(!b) return;
  const a=b.dataset.act;
  if(a==="card"||a==="signin") go(a);
  else if(a==="edit") go("profile");
  else if(a==="delask") go("delask");
  else if(a==="play"){ const id=b.dataset.id; closePanel(); if(typeof window.openModal==="function") window.openModal(id,TITLES[id]||""); }
  else if(a==="google") googleSignIn();
  else if(a==="logout") fb().then(f=>f.auth().signOut()).then(()=>{ prof=null; go("card"); });
  else if(a==="delete") deleteAccount();
});
body.addEventListener("change",e=>{ if(e.target.dataset.act==="updates"&&prof){ prof.updates=e.target.checked; saveProfile({updates:prof.updates, updatesAt:Date.now()}); toast(prof.updates?"נרשמתם לעדכונים":"הוסרתם מהעדכונים"); } });
body.addEventListener("submit",e=>{
  e.preventDefault(); const f=e.target, k=f.dataset.form, d=Object.fromEntries(new FormData(f));
  if(k==="email") emailLink(d.email.trim());
  else if(k==="finish") finishEmail(d.email.trim());
  else if(k==="profile"){
    if(!d.name.trim()||!d.grade){ msg="צריך שם וכיתה"; return renderPanel(); }
    const np={name:d.name.trim().slice(0,40), grade:d.grade, units:HIGH.includes(d.grade)?(d.units||""):"", school:(d.school||"").trim().slice(0,60), phone:(d.phone||"").trim().slice(0,20), updates:!!d.updates};
    const first=!prof; if(first){ np.consentAt=Date.now(); np.updatesAt=Date.now(); } else if(np.updates!==prof.updates) np.updatesAt=Date.now();
    prof=Object.assign({},prof||{},np);
    if(prof.grade){ const pp=PATHS&&pathFor(prof); if(pp) st.set("pshut-path",pp.id); }
    saveProfile(np,first).then(()=>{ go("card"); toast(first?`ברוכים הבאים, ${prof.name}! ההתקדמות נשמרה ☁️`:"הפרטים נשמרו"); }).catch(()=>{ msg="לא הצלחנו לשמור. בדקו את החיבור ונסו שוב."; renderPanel(); });
  }
});

/* ---------- תזכורת עדינה להירשם (פעם אחת) ---------- */
let nudged=false;
function nudge(){
  if(nudged||st.get("pshut-nudge")) return; nudged=true; st.set("pshut-nudge","1");
  const n=document.createElement("div"); n.className="acct-nudge";
  n.innerHTML=`<span>✓ סומן! ההתקדמות נשמרת במכשיר הזה. <b>רוצים לשמור אותה בכל מכשיר?</b></span><button type="button" class="acct-btn gold">לשמירה</button><button type="button" class="x" aria-label="סגירה">✕</button>`;
  document.body.appendChild(n); requestAnimationFrame(()=>n.classList.add("on"));
  const bye=()=>{n.classList.remove("on");setTimeout(()=>n.remove(),400);};
  n.querySelector(".acct-btn").onclick=()=>{bye();openPanel("signin");}; n.querySelector(".x").onclick=bye; setTimeout(bye,12000);
}
function toast(t){ const n=document.createElement("div"); n.className="acct-toast"; n.textContent=t; document.body.appendChild(n); requestAnimationFrame(()=>n.classList.add("on")); setTimeout(()=>{n.classList.remove("on");setTimeout(()=>n.remove(),400);},2800); }

/* ---------- Firebase (רק אם מוגדר) ---------- */
let user=null, prof=null, _fb=null, saveT=null;
function script(src){ return new Promise((ok,no)=>{ const s=document.createElement("script"); s.src=src; s.onload=ok; s.onerror=no; document.head.appendChild(s); }); }
function fb(){
  if(!CFG) return Promise.reject(new Error("no config"));
  if(_fb) return _fb;
  _fb = script(SDK+"firebase-app-compat.js").then(()=>Promise.all([script(SDK+"firebase-auth-compat.js"),script(SDK+"firebase-firestore-compat.js")]))
    .then(()=>{ firebase.initializeApp(CFG); firebase.auth().languageCode="he"; return firebase; });
  return _fb;
}
const docRef = ()=>firebase.firestore().collection("users").doc(user.uid);

function googleSignIn(){
  fb().then(f=>{ const pr=new f.auth.GoogleAuthProvider(); pr.setCustomParameters({prompt:"select_account"});
    const standalone=matchMedia("(display-mode: standalone)").matches||navigator.standalone;
    return standalone ? f.auth().signInWithRedirect(pr) : f.auth().signInWithPopup(pr).catch(err=>{ if(/popup-blocked|operation-not-supported/.test(err.code)) return f.auth().signInWithRedirect(pr); throw err; });
  }).catch(err=>{ if(err&&/popup-closed|cancelled-popup/.test(err.code)) return; msg="ההתחברות לא הצליחה. נסו שוב."; renderPanel(); });
}
function emailLink(email){
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ msg="נראה שהמייל לא תקין"; return renderPanel(); }
  fb().then(f=>f.auth().sendSignInLinkToEmail(email,{url:location.origin+location.pathname+"#me",handleCodeInApp:true}))
    .then(()=>{ st.set("pshut-email",email); go("sent"); })
    .catch(()=>{ msg="לא הצלחנו לשלוח את המייל. נסו שוב בעוד רגע."; renderPanel(); });
}
function finishEmail(email){
  fb().then(f=>f.auth().signInWithEmailLink(email,location.href)).then(()=>{ st.del("pshut-email"); history.replaceState(null,"",location.pathname); })
    .catch(()=>{ msg="הקישור לא תקין או שפג תוקפו. בקשו קישור חדש."; view="signin"; renderPanel(); });
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
function cloudSave(){ if(!user||!prof) return; clearTimeout(saveT); saveT=setTimeout(()=>{ docRef().set(progressDoc(),{merge:true}).catch(()=>{}); },1500); }
function saveProfile(fields,first){
  const data=Object.assign({},fields);
  if(first) Object.assign(data,{email:user.email||"", createdAt:firebase.firestore.FieldValue.serverTimestamp()},progressDoc());
  return docRef().set(data,{merge:true});
}
function deleteAccount(){
  docRef().delete().then(()=>user.delete()).then(()=>{ prof=null; go("card"); toast("החשבון נמחק"); })
    .catch(err=>{ if(err&&err.code==="auth/requires-recent-login"){ msg="הפרטים נמחקו. כדי למחוק גם את הכניסה עצמה – צאו, היכנסו שוב ומחקו שוב."; } else msg="המחיקה לא הצליחה. נסו שוב."; renderPanel(); });
}
addEventListener("beforeunload",()=>{ if(saveT&&user&&prof){ clearTimeout(saveT); docRef().set(progressDoc(),{merge:true}).catch(()=>{}); } });

if(CFG){
  navBtn.classList.add("cfg");
  fb().then(f=>{
    const a=f.auth();
    if(a.isSignInWithEmailLink(location.href)){ const em=st.get("pshut-email"); if(em) finishEmail(em); else openPanel("needEmail"); }
    a.getRedirectResult().catch(()=>{});
    a.onAuthStateChanged(u=>{
      user=u; prof=null;
      if(!u){ paintNav(); if(panel.classList.contains("on")&&!["signin","sent","needEmail"].includes(view)) go("card"); return; }
      docRef().get().then(s=>{
        if(s.exists){ const d=s.data(); prof={name:d.name,grade:d.grade,units:d.units||"",school:d.school||"",phone:d.phone||"",updates:!!d.updates}; merge(d); cloudSave(); }
        paintNav();
        if(!prof) openPanel("profile"); else if(panel.classList.contains("on")) go("card");
      }).catch(()=>{ paintNav(); });
    });
  }).catch(()=>{ navBtn.classList.remove("cfg"); });
}
paintNav();
if(location.hash==="#me") openPanel();
})();
