/* מסלול הלמידה – רכיב משותף. דורש <section id="path"> בעמוד. */
(function(){
const root=document.getElementById("path"); if(!root) return;
const q=s=>root.querySelector(s), esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const GR=["ז׳","ח׳","ט׳","י׳","י״א","י״ב"], SHOW=12, MOE="https://pop.education.gov.il/tchumey_daat/matmatika/chativat-beynayim/teaching-mathematics/question-files/";
const st={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}};
let D,VID={},cur,done={};try{done=JSON.parse(st.get("pshut-done")||"{}")}catch(e){}
root.innerHTML=`<div class="p-hd"><span class="p-kick">לפי תוכנית הלימודים של משרד החינוך</span><h2 class="p-h1" id="pH1">מסלול הלמידה שלי</h2>
<p>מה לומדים בכל שלב של השנה, באיזה סדר לראות את הסרטונים, ודפי עבודה לתרגול. מתקדמים תחנה אחרי תחנה – כל סרטון שראיתם מסומן ✓.</p>
<div class="p-tabs" id="pGr"></div><div class="p-tabs p-lv" id="pLv" hidden></div></div>
<div class="p-prog"><div class="p-ttl" id="pTtl"></div><div class="row"><b id="pPt"></b><div class="p-bar"><i id="pPb"></i></div></div></div>
<div class="p-units" id="pUnits"></div><div class="practice" id="pPr"></div><div class="p-note" id="pNote"></div>`;
function save(){st.set("pshut-done",JSON.stringify(done))}
function vrow(id,n,rest){const r=VID[id];if(!r)return"";return `<div class="v${done[id]?" done":""}${rest?" rest":""}" data-vid="${id}" role="button" tabindex="0"><span class="n">${n}</span><img loading="lazy" src="t/${id}.webp" alt="" onerror="this.onerror=null;this.src='https://i.ytimg.com/vi/${id}/mqdefault.jpg'"><span class="vt">${esc(r.title)}</span><button class="ck" type="button" aria-label="סימון צפיתי">✓</button></div>`}
function mat(m){if(!Array.isArray(m))return mbm(m);return `<a class="m" href="${m[1]}" target="_blank" rel="noopener"><span class="ft">${esc(m[2])}</span>${esc(m[0])}<span class="src">משרד החינוך</span></a>`}
function mbm(m,rest){const pm=m.t.match(/^(פרק(?:ים)? [\d-]+) · (.*)$/);return `<div class="m mb${rest?" rest":""}"><span class="ft">PDF</span><span class="mt">${pm?`<b>${esc(pm[2])}</b> <small>${esc(pm[1])} · תשפ״ז</small>`:esc(m.t)}</span><span class="lk">${m.l.map(([l,u])=>`<a href="${u}" target="_blank" rel="noopener">${esc(l)}</a>`).join("")}</span></div>`}
function mats(u,p){const a=u.mats.filter(Array.isArray),b=u.mats.filter(x=>!Array.isArray(x));if(!a.length&&!b.length)return `<div class="none">${p.practice?"דפי עבודה לתרגול – בהמשך העמוד":"תרגלו עם הסרטונים, ואם נתקעתם – צלמו שאלה 📸"}</div>`;
let o=a.map(mat).join("");if(b.length){const S=5;o+=`<div class="mbh">דפי עבודה להדפסה · <span>משבצת</span></div>`+b.map((m,i)=>mbm(m,i>=S)).join("")+(b.length>S?`<button type="button" class="mball">עוד ${b.length-S} דפים ▾</button>`:"")}return o}
const ids=u=>[...u.v,...u.q];
function firstOpen(p){for(let k=0;k<p.units.length;k++){if(ids(p.units[k]).some(i=>!done[i]))return k}return 0}
function render(){
  const p=cur;q("#pH1").textContent="מסלול הלמידה שלי · "+p.title;
  q("#pGr").innerHTML=GR.map(g=>`<button type="button" data-gr="${g}" class="${g===p.grade?"on":""}">${g}</button>`).join("");
  const hs=D.paths.filter(x=>x.grade===p.grade&&x.level);q("#pLv").hidden=!hs.length;
  q("#pLv").innerHTML=hs.map(x=>`<button type="button" data-pid="${x.id}" class="${x.id===p.id?"on":""}">${x.level} יח״ל</button>`).join("");
  const fo=firstOpen(p);
  q("#pUnits").innerHTML=p.units.map((u,k)=>{
    const all=ids(u),dn=all.filter(i=>done[i]).length,full=all.length&&dn===all.length;
    let vids=u.v.map((i,n)=>vrow(i,n+1,n>=SHOW)).join("");
    if(u.q.length)vids+=`<div class="sub">📝 בוחן עצמי – נסו לבד, ואז בדקו בסרטון</div>`+u.q.map(i=>vrow(i,"✎")).join("");
    if(!all.length)vids=`<div class="gap">🎬 הסרטונים לנושא הזה בדרך. בינתיים אפשר לתרגל עם חומרי העבודה, או <a href="solve.html">לצלם שאלה</a> ולקבל הסבר.</div>`;
    const more=u.v.length>SHOW?`<button type="button" class="showall">הצגת כל ${u.v.length} הסרטונים לפי הסדר ▾</button>`:"";
    const mts=mats(u,p);
    return `<div class="unit${k===fo?" open":""}${full?" full":""}" data-k="${k}"><div class="dot">${full?"✓":k+1}</div><div class="card">
<div class="uh"><h3>${esc(u.t)}</h3>${u.m?`<span class="mo">${esc(u.m)}</span>`:""}<span class="cnt">${all.length?`${dn}/${all.length} סרטונים`:""}</span><button class="tg" type="button" aria-label="פתיחה">▾</button></div>
<div class="body"><div class="cols"><div><h4>מה לומדים</h4><ul>${u.learn.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div><div><h4>חומרי עבודה</h4>${mts}</div></div>
<h4>🎬 הסרטונים לפי הסדר</h4><div class="vs">${vids}</div>${more}</div></div></div>`}).join("");
  q("#pPr").innerHTML=p.practice?`<div class="card"><div class="uh"><h3>📄 ${esc(p.practice[0])}</h3><span class="mo">משרד החינוך</span></div><p class="none" style="margin:8px 0 12px">דפי עבודה ותרגול של משרד החינוך, לחזרה ולתרגול נוסף לאורך השנה.</p><div class="grid2">${p.practice[1].map(mat).join("")}</div></div>`:"";
  q("#pNote").innerHTML=`סדר הנושאים לפי <a href="${p.src[1]}" target="_blank" rel="noopener">${esc(p.src[0])}</a> של משרד החינוך. דפי העבודה וחומרי התרגול הם של משרד החינוך (<a href="${MOE}" target="_blank" rel="noopener">המרחב הפדגוגי</a>), והקישורים מובילים לקבצים המקוריים באתר המשרד.`;
  prog();
}
function prog(){const s=new Set();cur.units.forEach(u=>ids(u).forEach(i=>s.add(i)));const a=[...s],n=a.filter(i=>done[i]).length;q("#pTtl").textContent=cur.title;q("#pPt").textContent=`${n} מתוך ${a.length} סרטונים`;q("#pPb").style.width=(a.length?100*n/a.length:0)+"%"}
function pick(id,scroll){cur=D.paths.find(x=>x.id===id)||D.paths[0];st.set("pshut-path",cur.id);const h="#p-"+cur.id;if(location.hash!==h&&(location.hash===""||location.hash.startsWith("#p-")||scroll))history.replaceState(null,"",h);render();if(scroll)root.scrollIntoView({behavior:"smooth"});}
function setDone(id,v){if(window.PSHUT){window.PSHUT.mark(id,!!v,VID[id]&&VID[id].title);return}done[id]=v;save();refresh()}
/* account.js מודיע כשההתקדמות משתנה (סימון בעמוד הבית, או סנכרון מהחשבון) */
addEventListener("pshut-sync",()=>{if(window.PSHUT)done=window.PSHUT.done();if(cur)refresh()});
function refresh(){root.querySelectorAll(".v[data-vid]").forEach(e=>e.classList.toggle("done",!!done[e.dataset.vid]));
  root.querySelectorAll(".unit").forEach(s=>{const u=cur.units[s.dataset.k],a=ids(u),dn=a.filter(i=>done[i]).length,f=a.length&&dn===a.length;s.querySelector(".cnt").textContent=a.length?`${dn}/${a.length} סרטונים`:"";s.classList.toggle("full",!!f);s.querySelector(".dot").textContent=f?"✓":(+s.dataset.k+1)});prog();}
function play(id){setDone(id,true);const t=VID[id]?VID[id].title:"";if(typeof window.openModal==="function")window.openModal(id,t);else window.open("https://www.youtube.com/watch?v="+id,"_blank","noopener");}
root.addEventListener("click",e=>{
  const g=e.target.closest("[data-gr]");if(g){const c=D.paths.filter(x=>x.grade===g.dataset.gr);const pref=st.get("pshut-lv")||"5";pick((c.find(x=>x.level===pref)||c.find(x=>x.level==="4")||c[0]).id);return}
  const l=e.target.closest("[data-pid]");if(l){const p=D.paths.find(x=>x.id===l.dataset.pid);st.set("pshut-lv",p.level);pick(p.id);return}
  const ck=e.target.closest(".ck");if(ck){e.stopPropagation();const id=ck.closest(".v").dataset.vid;setDone(id,!done[id]);return}
  const v=e.target.closest(".v");if(v){play(v.dataset.vid);return}
  const mb=e.target.closest(".mball");if(mb){const c=mb.parentElement;c.classList.toggle("mbopen");mb.textContent=c.classList.contains("mbopen")?"הצגת פחות ▴":`עוד ${c.querySelectorAll(".mb.rest").length} דפים ▾`;return}
  const sa=e.target.closest(".showall");if(sa){const vs=sa.previousElementSibling;vs.classList.toggle("all");sa.textContent=vs.classList.contains("all")?"הצגת פחות ▴":sa.textContent.replace("▴","▾").replace("הצגת פחות",`הצגת כל ${vs.querySelectorAll(".v:not(.rest)").length+vs.querySelectorAll(".rest").length} הסרטונים לפי הסדר`);return}
  const h=e.target.closest(".uh");if(h){h.closest(".unit").classList.toggle("open");return}
});
root.addEventListener("keydown",e=>{const v=e.target.closest&&e.target.closest(".v");if(v&&e.key==="Enter")play(v.dataset.vid)});
/* קישורים חיצוניים לכיתה: <a href="#p-z"> */
document.addEventListener("click",e=>{const a=e.target.closest('a[href^="#p-"]');if(!a||!D)return;e.preventDefault();pick(a.getAttribute("href").slice(3),true)});
addEventListener("hashchange",()=>{const h=location.hash;if(D&&h.startsWith("#p-")&&h.slice(3)!==cur.id)pick(h.slice(3),true)});
const vsrc=(typeof VIDEOS!=="undefined"&&Array.isArray(VIDEOS))?Promise.resolve(VIDEOS):fetch("videos.json").then(r=>r.json()).then(a=>a.map(r=>({id:r[0],title:r[3]})));
Promise.all([fetch("learn-data.json").then(r=>r.json()),vsrc]).then(([d,v])=>{
  D=d;v.forEach(r=>VID[r.id]=r);const h=location.hash.startsWith("#p-")?location.hash.slice(3):"";
  pick(D.paths.some(x=>x.id===h)?h:(st.get("pshut-path")||"z"),!!h);
}).catch(()=>{q("#pUnits").innerHTML='<div class="gap">לא הצלחתי לטעון את מסלול הלמידה. נסו לרענן את הדף.</div>'});
})();
