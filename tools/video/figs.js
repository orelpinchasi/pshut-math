
const NS='direction="ltr"';
function plot(F){
  const W=F.w||580,H=F.h||520,P=F.pad||44;
  const [x0,x1]=F.X,[y0,y1]=F.Y;
  let sx=(W-2*P)/(x1-x0), sy=(H-2*P)/(y1-y0);
  if(F.eq){const s=Math.min(sx,sy);sx=sy=s}
  const ox=P-x0*sx, oy=H-P+y0*sy;
  const X=x=>ox+x*sx, Y=y=>oy-y*sy;
  let s=`<rect width="${W}" height="${H}" rx="14" fill="#fff" opacity=".93"/>`;
  if(F.axes!==false){
    if(F.gx){for(let x=Math.ceil(x0/F.gx)*F.gx;x<=x1+1e-9;x+=F.gx)s+=`<line x1="${X(x)}" y1="${Y(y0)}" x2="${X(x)}" y2="${Y(y1)}" stroke="#e9edf5"/>`}
    if(F.gy){for(let y=Math.ceil(y0/F.gy)*F.gy;y<=y1+1e-9;y+=F.gy)s+=`<line x1="${X(x0)}" y1="${Y(y)}" x2="${X(x1)}" y2="${Y(y)}" stroke="#e9edf5"/>`}
    const ax=Math.min(Math.max(0,x0),x1), ay=Math.min(Math.max(0,y0),y1);
    s+=`<line x1="${X(x0)}" y1="${Y(ay)}" x2="${X(x1)+10}" y2="${Y(ay)}" stroke="#5a6278" stroke-width="2.5"/><line x1="${X(ax)}" y1="${Y(y0)}" x2="${X(ax)}" y2="${Y(y1)-10}" stroke="#5a6278" stroke-width="2.5"/>`;
    s+=`<text x="${X(x1)+8}" y="${Y(ay)+28}" font-size="22" font-style="italic" fill="#5a6278" ${NS}>${F.xl||'x'}</text><text x="${X(ax)+10}" y="${Y(y1)-4}" font-size="22" font-style="italic" fill="#5a6278" ${NS}>${F.yl||'y'}</text>`;
    (F.tx||[]).forEach(v=>s+=`<text x="${X(v)}" y="${Y(ay)+24}" font-size="17" text-anchor="middle" fill="#8a91a5" ${NS}>${v}</text>`);
    (F.ty||[]).forEach(v=>s+=`<text x="${X(ax)-8}" y="${Y(v)+6}" font-size="17" text-anchor="end" fill="#8a91a5" ${NS}>${v}</text>`);
  }
  (F.poly||[]).forEach(p=>s+=`<polygon points="${p.p.map(q=>X(q[0])+','+Y(q[1])).join(' ')}" fill="${p.fill||'#34b27b'}" fill-opacity="${p.op||.3}" stroke="${p.st||'none'}" stroke-width="3"/>`);
  (F.vl||[]).forEach(v=>s+=`<line x1="${X(v.x)}" y1="${Y(y0)}" x2="${X(v.x)}" y2="${Y(y1)}" stroke="${v.c||'#c8242f'}" stroke-width="2.5" stroke-dasharray="8 7"/>`);
  (F.hl||[]).forEach(v=>s+=`<line x1="${X(x0)}" y1="${Y(v.y)}" x2="${X(x1)}" y2="${Y(v.y)}" stroke="${v.c||'#c8242f'}" stroke-width="2.5" stroke-dasharray="8 7"/>`);
  (F.circ||[]).forEach(c=>s+=`<circle cx="${X(c.x)}" cy="${Y(c.y)}" r="${c.r*sx}" fill="none" stroke="${c.c||'#2f55c8'}" stroke-width="3.5"/>`);
  (F.fns||[]).forEach(fn=>{const f=new Function('x','return '+fn.f);const a=fn.a??x0,b=fn.b??x1;let d='',pen=false;
    for(let i=0;i<=900;i++){const x=a+(b-a)*i/900;let y;try{y=f(x)}catch(e){y=NaN}
      if(!isFinite(y)||y<y0-(y1-y0)||y>y1+(y1-y0)||(fn.br||[]).some(q=>Math.abs(x-q)<(b-a)/400)){pen=false;continue}
      d+=(pen?'L':'M')+X(x).toFixed(1)+','+Y(y).toFixed(1);pen=true}
    s+=`<clipPath id="cp"><rect x="0" y="0" width="${W}" height="${H}"/></clipPath><path clip-path="url(#cp)" d="${d}" fill="none" stroke="${fn.c||'#2f55c8'}" stroke-width="4"/>`;
    if(fn.lbl)s+=`<text x="${X(fn.lx)}" y="${Y(fn.ly)}" font-size="22" font-style="italic" font-weight="700" fill="${fn.c||'#2f55c8'}" ${NS}>${fn.lbl}</text>`});
  (F.segs||[]).forEach(g=>{const q=g.p;s+=`<line x1="${X(q[0])}" y1="${Y(q[1])}" x2="${X(q[2])}" y2="${Y(q[3])}" stroke="${g.c||'#1d2a6b'}" stroke-width="${g.w||3.5}" ${g.dash?'stroke-dasharray="9 7"':''}/>`;
    if(g.t)s+=`<text x="${(X(q[0])+X(q[2]))/2+(g.dx||0)}" y="${(Y(q[1])+Y(q[3]))/2+(g.dy||0)}" font-size="22" font-weight="700" fill="${g.c||'#1d2a6b'}" text-anchor="middle" ${NS}>${g.t}</text>`});
  (F.pts||[]).forEach(p=>{if(!p.nod)s+=`<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="${p.r||7}" fill="${p.c||'#1d2a6b'}"/>`;
    if(p.t)s+=`<text x="${X(p.x)+(p.dx??10)}" y="${Y(p.y)+(p.dy??-12)}" font-size="${p.fs||22}" font-weight="700" fill="${p.tc||p.c||'#1d2a6b'}" text-anchor="${p.an||'start'}" ${NS}>${p.t}</text>`});
  (F.txt||[]).forEach(t=>s+=`<text x="${X(t.x)}" y="${Y(t.y)}" font-size="${t.fs||24}" font-weight="700" fill="${t.c||'#16824f'}" text-anchor="middle" ${NS}>${t.t}</text>`);
  return [W,H,s];
}
function bell(F){
  const W=580,H=420,X=z=>290+z*82,Y=v=>330-v*250,f=z=>Math.exp(-z*z/2);
  let p='';for(let z=-3.3;z<=3.31;z+=0.05)p+=(p?'L':'M')+X(z).toFixed(1)+','+Y(f(z)).toFixed(1);
  let s=`<rect width="${W}" height="${H}" rx="14" fill="#fff" opacity=".93"/>`;
  if(F.from!=null){const A=Math.max(F.from,-3.3),B=Math.min(F.to,3.3);let a='M'+X(A)+','+Y(0);for(let z=A;z<=B+1e-9;z+=0.02)a+='L'+X(z).toFixed(1)+','+Y(f(z)).toFixed(1);a+='L'+X(B)+','+Y(0)+'Z';s+=`<path d="${a}" fill="#34b27b" opacity=".35"/>`}
  s+=`<line x1="20" y1="${Y(0)}" x2="560" y2="${Y(0)}" stroke="#555" stroke-width="2"/><path d="${p}" fill="none" stroke="#2f55c8" stroke-width="4"/><line x1="${X(0)}" y1="${Y(0)}" x2="${X(0)}" y2="${Y(1)}" stroke="#999" stroke-dasharray="6 6"/>`;
  (F.lbls||[]).forEach(l=>s+=`<line x1="${X(l.z)}" y1="${Y(0)-8}" x2="${X(l.z)}" y2="${Y(0)+8}" stroke="#c8242f" stroke-width="3"/><text x="${X(l.z)}" y="${Y(0)+34}" font-size="22" text-anchor="middle" fill="#c8242f" font-weight="700" ${NS}>${l.t}</text>`);
  if(F.note)s+=`<text x="${F.nx}" y="${F.ny}" font-size="26" text-anchor="middle" fill="#16824f" font-weight="700" ${NS}>${F.note}</text>`;
  return [W,H,s];
}
function tree(F){
  const W=580,H=520;let s=`<rect width="${W}" height="${H}" rx="14" fill="#fff" opacity=".93"/>`;
  const R=[545,345,150],n0=[R[0],H/2];
  s+=`<text x="${R[1]}" y="34" font-size="19" fill="#8a91a5" text-anchor="middle">${F.c1||"בדיקה 1"}</text><text x="${R[2]}" y="34" font-size="19" fill="#8a91a5" text-anchor="middle">${F.c2||"בדיקה 2"}</text>`;
  const pill=(x,y,t,hl)=>`<rect x="${x-46}" y="${y-18}" width="92" height="36" rx="18" fill="${hl?'#fff1a8':'#eef2fb'}" stroke="${hl?'#f5b83d':'#c9d3ee'}" stroke-width="2"/><text x="${x}" y="${y+8}" font-size="20" font-weight="700" fill="#1d2a6b" text-anchor="middle">${t}</text>`;
  let L='',N='';
  F.br.forEach((b,i)=>{const n1=[R[1],i?H*0.73:H*0.27];
    L+=`<line x1="${n0[0]}" y1="${n0[1]}" x2="${n1[0]}" y2="${n1[1]}" stroke="#2f55c8" stroke-width="3"/><text x="${(n0[0]+n1[0])/2+(i?8:8)}" y="${(n0[1]+n1[1])/2+(i?26:-12)}" font-size="22" font-weight="700" fill="#c8242f" text-anchor="middle" ${NS}>${b.p}</text>`;
    N+=pill(n1[0],n1[1],b.t);
    b.kids.forEach((k,j)=>{const n2=[R[2],n1[1]+(j?62:-62)];
      L+=`<line x1="${n1[0]}" y1="${n1[1]}" x2="${n2[0]}" y2="${n2[1]}" stroke="${k.hl?'#f5b83d':'#2f55c8'}" stroke-width="${k.hl?7:3}"/><text x="${(n1[0]+n2[0])/2}" y="${(n1[1]+n2[1])/2+(j?26:-12)}" font-size="21" font-weight="700" fill="#c8242f" text-anchor="middle" ${NS}>${k.p}</text>`;
      N+=pill(n2[0],n2[1],k.t,k.hl);
      if(k.res)N+=`<text x="${n2[0]-60}" y="${n2[1]+8}" font-size="22" font-weight="700" fill="${k.hl?'#16824f':'#8a91a5'}" text-anchor="end" ${NS}>${k.res}</text>`;})});
  N+=`<circle cx="${n0[0]}" cy="${n0[1]}" r="9" fill="#1d2a6b"/>`;
  return [W,H,s+L+N];
}
