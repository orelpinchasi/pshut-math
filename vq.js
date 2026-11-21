// "הבנת?" — עוצר את סרטון הפתרון בסוף כל סעיף ושואל את התלמיד אם הבין.
// לא הבנתי → הסבר בדרך אחרת + אפשרות לראות שוב את הסעיף.
// שימוש: vqAttach(videoElement, [{l:'א', t0:12.3, t1:80.1, alt:'...'}], renderMath)
(function(){
  const css=`.vqw{position:relative}.vqo{position:absolute;inset:0;background:#141b3aee;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:18px;border-radius:12px;text-align:center;z-index:5;overflow:auto}
.vqo[hidden]{display:none}.vqo h4{font-size:clamp(18px,3.4vw,30px);margin:0;color:#ffd77a}.vqo .alt{background:#fff;color:#1d2a6b;border-radius:12px;padding:12px 16px;max-width:760px;text-align:right;line-height:1.7;font-size:clamp(14px,2.2vw,19px)}
.vqo .bt{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}.vqo button{font:inherit;font-weight:700;border:0;border-radius:999px;padding:10px 20px;cursor:pointer;font-size:clamp(14px,2.2vw,18px)}
.vqo .y{background:#1aa36b;color:#fff}.vqo .n{background:#ffd77a;color:#141b3a}.vqo .r{background:#fff;color:#141b3a}`;
  const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
  window.vqAttach=function(v,CH,MM){
    if(!v||!CH||!CH.length)return;MM=MM||(x=>x);
    const w=document.createElement('div');w.className='vqw';v.parentNode.insertBefore(w,v);w.appendChild(v);
    const o=document.createElement('div');o.className='vqo';o.hidden=true;w.appendChild(o);
    const asked=new Set();let last=0;
    function ask(i){const c=CH[i];v.pause();
      if(document.fullscreenElement)document.exitFullscreen().catch(()=>0);
      if(v.webkitDisplayingFullscreen&&v.webkitExitFullscreen)v.webkitExitFullscreen();
      o.innerHTML=`<h4>הבנת את סעיף ${c.l}?</h4><div class="bt"><button class="y">✅ הבנתי, ממשיכים</button><button class="n">🤔 לא הבנתי</button></div>`;o.hidden=false;
      o.querySelector('.y').onclick=()=>{o.hidden=true;v.play()};
      o.querySelector('.n').onclick=()=>{
        o.innerHTML=`<h4>בוא ננסה בדרך אחרת · סעיף ${c.l}</h4>${c.alt?`<div class="alt">${MM(c.alt)}</div>`:''}<div class="bt"><button class="r">🔁 לראות שוב את הסעיף</button><button class="y">✅ עכשיו הבנתי, ממשיכים</button></div>`;
        o.querySelector('.r').onclick=()=>{o.hidden=true;asked.delete(i);v.currentTime=c.t0;v.play()};
        o.querySelector('.y').onclick=()=>{o.hidden=true;v.play()};
      };
    }
    v.addEventListener('timeupdate',()=>{const t=v.currentTime;
      CH.forEach((c,i)=>{if(t<c.t0-0.5)asked.delete(i);
        if(!asked.has(i)&&last<c.t1-0.05&&t>=c.t1-0.3&&t-last<2){asked.add(i);ask(i)}});
      last=t});
    v.addEventListener('seeked',()=>{last=v.currentTime});
    v.addEventListener('play',()=>{o.hidden=true});
  };
})();
