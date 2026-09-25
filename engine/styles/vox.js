// ---------- style: VOX (explainer journalism) ----------
// Paper texture, highlighter sweeps, newspaper clippings, hand-drawn circles and arrows,
// timelines, map-style pins, cited sources. Fonts: Playfair Display (heads), IBM Plex Mono (labels).
const VOX=(()=>{
  document.head.insertAdjacentHTML('beforeend',`<style>
  .vx-serif{font-family:'Playfair Display',Georgia,serif}
  .vx-mono{font-family:'IBM Plex Mono',ui-monospace,monospace}
  .vx-ink{color:#1b1a17}
  .vx-cap{position:absolute;left:80px;right:80px;text-align:center;font:700 64px var(--font);line-height:1.2;color:#1b1a17}
  </style>`);
  const INKC='#1b1a17', HL='#ffe45c';
  // deterministic jitter
  const rnd=i=>{const x=Math.sin(i*91.7+17.3)*43758.5453;return x-Math.floor(x)};

  // warm paper with fibers + soft vignette
  function paper(t,{tone='#f2ede3',dark=false}={}){
    const base=dark?'#1c1b19':tone;
    return `<div class="abs" style="inset:0;background:${base}"></div>
    <svg class="abs" style="inset:0;width:${W}px;height:${H}px;opacity:${dark?.18:.35};mix-blend-mode:multiply"><filter id="vxp"><feTurbulence type="fractalNoise" baseFrequency=".012 .9" numOctaves="3" seed="3"/><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .4  0 0 0 0 .32  0 0 0 .55 0"/></filter><rect width="100%" height="100%" filter="url(#vxp)"/></svg>
    <div class="abs" style="inset:0;background:radial-gradient(130% 90% at 50% 40%,transparent 55%,rgba(60,45,20,${dark?.5:.22}) 100%)"></div>`;
  }
  // inline highlighter: wrap words in a marker sweep. Use inside any text block.
  function mark(lt,at,text,{color=HL,d=.45,h=.62,fg=null}={}){
    const k=eo(lin(lt,at,at+d));
    const ink=fg&&k>.02?`color:${fg};`:'';
    return `<span style="${ink}background:linear-gradient(${color},${color}) no-repeat 0 88%/${k*100}% ${h*100}%;padding:0 .08em;box-decoration-break:clone;-webkit-box-decoration-break:clone">${text}</span>`;
  }
  // headline with mono kicker
  function title(lt,at,text,{kicker='',x=90,y=300,w=W-180,size=112,color=INKC,align='left'}={}){
    if(lt<at) return '';
    const k=eo(lin(lt,at,at+.6)), k2=eo(lin(lt,at+.15,at+.8));
    return `<div class="abs" style="left:${x}px;top:${y}px;width:${w}px;text-align:${align};color:${color}">
      ${kicker?`<div class="vx-mono" style="font-size:34px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--brand);opacity:${k}">${esc(kicker)}</div>`:''}
      <div class="vx-serif" style="margin-top:18px;font-size:${size}px;font-weight:900;line-height:1.02;letter-spacing:-.01em;opacity:${k2};transform:translateY(${(1-k2)*24}px)">${text}</div></div>`;
  }
  // newspaper clipping card. image = asset name (optional)
  function clipping(lt,at,{headline='',source='',date='',body='',image:img=null,x=W/2,y=420,w=860,rot=-2.5}={}){
    if(lt<at) return '';
    const p=pop(lt,at,.35), s=1.08-.08*eo(lin(lt,at,at+.35));
    const lines=body?`<div style="columns:2;column-gap:28px;font:400 25px/1.45 Georgia,serif;color:#4a463e;margin-top:22px;text-align:justify">${body}</div>`:'';
    return `<div class="abs" style="left:${x-w/2}px;top:${y}px;width:${w}px;background:#fbf8f1;padding:44px 48px 48px;transform:rotate(${rot}deg) scale(${s});opacity:${clamp(p*3)};box-shadow:0 30px 60px rgba(40,30,10,.22),0 2px 0 rgba(0,0,0,.05);clip-path:polygon(0 1%,4% 0,11% 1.2%,19% .2%,28% 1%,37% 0,46% 1.3%,55% .3%,64% 1.1%,73% 0,82% 1%,91% .2%,100% 1%,99.5% 99%,93% 100%,84% 98.8%,75% 100%,66% 99%,57% 100%,48% 98.9%,39% 100%,30% 99.1%,21% 100%,12% 98.8%,3% 100%,0 99%)">
      <div class="vx-mono" style="display:flex;justify-content:space-between;font-size:24px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:#7b746a;border-bottom:2px solid #d9d2c3;padding-bottom:14px"><span>${esc(source)}</span><span>${esc(date)}</span></div>
      <div class="vx-serif" style="margin-top:22px;font-size:62px;font-weight:900;line-height:1.05;color:${INKC}">${headline}</div>
      ${img?`<img src="${asset(img)}" style="display:block;width:100%;height:${w*.5}px;object-fit:cover;margin-top:26px;filter:grayscale(.85) contrast(1.05)">`:''}
      ${lines}</div>`;
  }
  // hand-drawn ellipse around something (x,y = center)
  function circle(lt,at,{x=W/2,y=H/2,w=420,h=180,color='var(--red)',d=.6,stroke=10,seed=1}={}){
    if(lt<at) return '';
    const k=eo(lin(lt,at,at+d)), pts=[];
    const a0=-.35, a1=Math.PI*2+.45;
    for(let i=0;i<=48;i++){const a=a0+(a1-a0)*i/48, j=1+(rnd(seed*50+i)-.5)*.06+ i/48*.06;pts.push(`${(x+Math.cos(a)*w/2*j).toFixed(1)},${(y+Math.sin(a)*h/2*j).toFixed(1)}`)}
    const len=Math.PI*(w+h)/2*1.15;
    return `<svg class="abs" style="left:0;top:0;width:${W}px;height:${H}px;overflow:visible"><polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${len}" stroke-dashoffset="${len*(1-k)}" transform="rotate(-4 ${x} ${y})"/></svg>`;
  }
  // hand-drawn curved arrow from -> to
  function arrow(lt,at,{from=[200,400],to=[600,800],color='var(--red)',d=.5,stroke=10,curve=.25}={}){
    if(lt<at) return '';
    const k=eo(lin(lt,at,at+d)), [x1,y1]=from, [x2,y2]=to;
    const mx=(x1+x2)/2-(y2-y1)*curve, my=(y1+y2)/2+(x2-x1)*curve;
    const len=Math.hypot(x2-x1,y2-y1)*1.25;
    const ang=Math.atan2(y2-my,x2-mx), hs=stroke*4.2, hk=lin(lt,at+d*.85,at+d);
    const hx1=x2-Math.cos(ang-.5)*hs, hy1=y2-Math.sin(ang-.5)*hs, hx2=x2-Math.cos(ang+.5)*hs, hy2=y2-Math.sin(ang+.5)*hs;
    return `<svg class="abs" style="left:0;top:0;width:${W}px;height:${H}px;overflow:visible"><path d="M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${len}" stroke-dashoffset="${len*(1-k)}"/><path d="M${hx1} ${hy1} L${x2} ${y2} L${hx2} ${hy2}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" opacity="${hk}"/></svg>`;
  }
  // marker underline drawn left to right
  function underline(lt,at,{x=90,y=700,w=500,color='var(--red)',d=.4,stroke=9}={}){
    if(lt<at) return '';
    const k=eo(lin(lt,at,at+d));
    return `<svg class="abs" style="left:0;top:0;width:${W}px;height:${H}px;overflow:visible"><path d="M${x} ${y} C${x+w*.3} ${y-8},${x+w*.6} ${y+10},${x+w} ${y-4}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${w*1.1}" stroke-dashoffset="${w*1.1*(1-k)}"/></svg>`;
  }
  // map-style pin with label
  function pin(lt,at,{x=W/2,y=900,label='',color='var(--red)'}={}){
    if(lt<at) return '';
    const p=pop(lt,at,.35), drop=(1-eo(lin(lt,at,at+.3)))*-120;
    const lp=pop(lt,at+.25,.3);
    return `<div class="abs" style="left:${x}px;top:${y}px;transform:translate(-50%,-100%) translateY(${drop}px) scale(${.5+.5*p});opacity:${clamp(p*3)};transform-origin:50% 100%">
      <svg width="70" height="96" viewBox="0 0 70 96"><path d="M35 94C35 94 4 58 4 35a31 31 0 1 1 62 0c0 23-31 59-31 59z" fill="${color}"/><circle cx="35" cy="35" r="12" fill="#fff"/></svg></div>
      ${label?`<div class="abs vx-mono" style="${x>W*.6?`right:${W-x+48}px`:`left:${x+48}px`};top:${y-86}px;background:${INKC};color:#f2ede3;font-size:30px;font-weight:500;padding:10px 18px;letter-spacing:.06em;transform:scale(${.4+.6*lp});transform-origin:${x>W*.6?'right':'left'} center;opacity:${clamp(lp*3)}">${esc(label)}</div>`:''}`;
  }
  // horizontal timeline: items [{label, sub}], active index gets brand color
  function timeline(lt,at,items,{y=980,x0=110,x1=W-110,stagger=.35,active=-1,color=INKC}={}){
    if(lt<at) return '';
    const k=eo(lin(lt,at,at+.6)), n=items.length, step=n>1?(x1-x0)/(n-1):0;
    let h=`<div class="abs" style="left:${x0}px;top:${y}px;width:${(x1-x0)*k}px;height:6px;background:${color};border-radius:3px"></div>`;
    items.forEach((it,i)=>{
      const s=at+.3+i*stagger, p=pop(lt,s,.3), x=x0+i*step, on=i===active;
      if(lt<s) return;
      h+=`<div class="abs" style="left:${x-22}px;top:${y-19}px;width:44px;height:44px;border-radius:50%;background:${on?'var(--brand)':'#f2ede3'};border:6px solid ${on?'var(--brand)':color};transform:scale(${p})"></div>
      <div class="abs" style="left:${x-130}px;width:260px;top:${i%2?y+60:y-150}px;text-align:center;color:${color};opacity:${clamp(p*2)}">
        <div class="vx-serif" style="font-size:54px;font-weight:900;${on?'color:var(--brand)':''}">${esc(it.label)}</div>
        ${it.sub?`<div class="vx-mono" style="font-size:24px;letter-spacing:.06em;margin-top:6px;opacity:.75">${esc(it.sub)}</div>`:''}</div>`;
    });
    return h;
  }
  // zoom into an image region. from/to = [scale, cx, cy] (cx,cy = 0..1 focus point)
  function zoom(name,lt,dur,{from=[1,.5,.5],to=[1.8,.5,.4],x=80,y=380,w=W-160,h=1000,rot=0,frame=true,gray=0}={}){
    const k=eo(lin(lt,0,dur)), s=from[0]+(to[0]-from[0])*k, cx=from[1]+(to[1]-from[1])*k, cy=from[2]+(to[2]-from[2])*k;
    return `<div class="abs" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;overflow:hidden;transform:rotate(${rot}deg);${frame?'border:14px solid #fbf8f1;box-shadow:0 30px 60px rgba(40,30,10,.25);':''}">
      <img src="${asset(name)}" style="width:100%;height:100%;object-fit:cover;transform-origin:${cx*100}% ${cy*100}%;transform:scale(${s});filter:grayscale(${gray})"></div>`;
  }
  // typewritten annotation label
  function label(lt,at,text,{x=90,y=200,rot=0,bg=INKC,fg='#f2ede3',size=32}={}){
    if(lt<at) return '';
    const n=Math.floor((lt-at)*28), shown=[...text].slice(0,n).join('');
    return `<div class="abs vx-mono" style="left:${x}px;top:${y}px;background:${bg};color:${fg};font-size:${size}px;font-weight:500;padding:10px 18px;letter-spacing:.05em;transform:rotate(${rot}deg)">${esc(shown)}&#8203;</div>`;
  }
  // source citation
  function source(text,{y=H-350,color='#7b746a'}={}){
    return `<div class="abs vx-mono" style="left:90px;right:180px;top:${y}px;font-size:24px;letter-spacing:.06em;color:${color}">SOURCE: ${esc(text)}</div>`;
  }
  // explainer caption (static, highlighted words get the marker). Use: o.caps.map(c=>VOX.caption(lt,c))
  function caption(lt,c,{y=1380,size=62,color=INKC}={}){
    const [s,e,text,o]=c; if(lt<s||lt>=e) return '';
    const op=Math.min(lin(lt,s,s+.15),1-lin(lt,e-.15,e));
    const html=text.split(' ').map((w,i)=>o.hl&&o.hl.includes(i)?mark(lt,s+.1+i*.06,esc(w)):esc(w)).join(' ');
    return `<div class="vx-cap" style="top:${o.y&&o.y!==1400?o.y:y}px;font-size:${size}px;color:${color};opacity:${op}">${html}</div>`;
  }
  return {paper,mark,title,clipping,circle,arrow,underline,pin,timeline,zoom,label,source,caption};
})();
