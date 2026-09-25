// ---------- video-kit engine primitives ----------
// Everything here is a pure function of time that returns an HTML string.
// Project data lives in window.VK (injected by the page builder):
//   VK.brand   {primary, secondary, ink, paper, ok, red, muted, font, display}
//   VK.strings {chips:{no,ok,skip}, now, phone:{thumb,text,header,rule}, warm}
//   VK.avatars {'@handle': [color, letter]}
//   VK.format  {width, height, fps}
//   VK.assets  url prefix for projects/<slug>/assets/
const $=document.getElementById('stage');
const W=VK.format.width, H=VK.format.height;
const BRAND=VK.brand, STR=VK.strings, ASSETS=VK.assets;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const lin=(t,a,b)=>clamp((t-a)/(b-a));
const eo=x=>1-Math.pow(1-x,3);
const back=x=>{const c=1.9;x=clamp(x);return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2)};
const pop=(t,at,d=.22)=>back(lin(t,at,at+d));
const fade=(t,a,b)=>eo(lin(t,a,b));
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
// color-mix shortcut: mix('var(--brand)',20) -> brand at 20% over transparent
const mix=(c,pct,other='transparent')=>`color-mix(in srgb,${c} ${pct}%,${other})`;

// kinetic caption: words pop in one by one. hl = highlighted word indices, red = wavy-underlined
function caption(t,start,end,text,{y=1330,hl=[],size=86,red=[]}={}){
  if(t<start||t>=end) return '';
  const words=text.split(' ');
  const out=Math.min(1,lin(t,end-.12,end));
  const html=words.map((w,i)=>{
    const p=pop(t,start+i*.075,.18);
    const s=.4+.6*p; const o=clamp(p*3);
    let cls='w'; if(hl.includes(i)) cls+=' hl';
    let style=`transform:scale(${s}) translateY(${(1-p)*30}px);opacity:${o};`;
    if(red.includes(i)) style+='color:#fff;text-decoration:underline wavy var(--red);text-decoration-thickness:8px;text-underline-offset:18px;';
    return `<span class="${cls}" style="${style}">${esc(w)}</span>`}).join(' ');
  return `<div class="cap" style="top:${y}px;font-size:${size}px;opacity:${1-out}">${html}</div>`;
}
function sticker(t,at,text,{x=W/2,y=200,rot=-4,bg='#fff',fg='var(--ink)',size=62,until=99}={}){
  if(t<at||t>until) return '';
  const p=pop(t,at,.25);
  return `<div class="sticker" style="left:${x}px;top:${y}px;background:${bg};color:${fg};font-size:${size}px;transform:translate(-50%,0) rotate(${rot}deg) scale(${.3+.7*p});opacity:${clamp(p*3)}">${text}</div>`;
}
const AV=VK.avatars||{};
// social comment row. c = {u, text, at, st:'no'|'ok'|'skip', stAt, glow}
function comment(t,c){
  if(t<c.at) return '';
  const p=pop(t,c.at,.24);
  let chip='';
  if(c.st && t>=c.stAt){
    const q=pop(t,c.stAt,.22);
    const lab=STR.chips[c.st];
    chip=`<div class="chip ${c.st}" style="transform:scale(${.3+.7*q});transform-origin:left center;opacity:${clamp(q*3)}">${lab}</div>`;
  }
  const glow=c.glow&&t<c.at+1.4?`box-shadow:inset 8px 0 0 var(--brand);background:${mix('var(--brand)',18*(1-lin(t,c.at+.6,c.at+1.4)))}`:'';
  const [col,l]=AV[c.u]||['#555',(c.u||'?').replace('@','').charAt(0).toUpperCase()];
  return `<div class="cm" style="transform:translateX(${(1-p)*-120}px) scale(${.85+.15*p});opacity:${clamp(p*2)};${glow}">
   <div class="av" style="background:${col}">${l}</div>
   <div><div class="cu">${c.u} · ${STR.now}</div><div class="ct">${c.text}</div>${chip}</div></div>`;
}
// phone mock with a post + comment list. Post copy defaults to VK.strings.phone.
function phone(t,{top=330,comments=[],extra='',scale=1,rule=false,height=1080,thumb=STR.phone.thumb,text=STR.phone.text}={}){
  const list=comments.map(c=>comment(t,c)).join('');
  return `<div class="phone" style="top:${top}px;height:${height}px;transform:scale(${scale});transform-origin:center top">
   <div class="post"><div class="thumb">${thumb}</div><div class="ptext">${text}</div></div>
   <div class="hdr"><span>${STR.phone.header}</span>${rule?`<span style="color:var(--brand)">${STR.phone.rule}</span>`:''}</div>
   ${list}${extra}</div>`;
}
// backgrounds: default (animated brand glow), 'brand' (solid brand gradient), 'black'
function bg(t,kind){
  if(kind==='brand'||kind==='pink') return `<div class="abs" style="inset:0;background:radial-gradient(120% 80% at 50% 20%,${mix('var(--brand)',70,'#fff')},var(--brand) 45%,${mix('var(--brand)',72,'#000')})"></div>`;
  if(kind==='black') return `<div class="abs" style="inset:0;background:#000"></div>`;
  const a=Math.sin(t*1.3)*80;
  if(window.LIGHT) return `<div class="abs" style="inset:0;background:radial-gradient(70% 45% at ${50+a/20}% 28%,${mix('var(--brand)',16)},transparent 70%),radial-gradient(60% 40% at 85% 95%,${mix('var(--brand2)',12)},transparent 70%),var(--paper)"></div>`;
  return `<div class="abs" style="inset:0;background:radial-gradient(70% 45% at ${50+a/20}% 30%,${mix('var(--brand)',28)},transparent 70%),radial-gradient(60% 40% at 80% 95%,${mix('var(--brand2)',18)},transparent 70%),var(--ink)"></div>`;
}
function grain(t){const x=(Math.floor(t*30)*37)%200,y=(Math.floor(t*30)*91)%200;
  return `<svg class="grain" style="left:${-x}px;top:${-y}px;width:${W+400}px;height:${H+400}px"><rect width="100%" height="100%" filter="url(#n)"/></svg>`}
function punch(lt,amt=.08,d=.18){return 1+amt*(1-eo(lin(lt,0,d)))}
function shake(t,a,b,amp=14){if(t<a||t>b)return 'translate(0,0)';const k=1-lin(t,a,b);return `translate(${Math.sin(t*97)*amp*k}px,${Math.cos(t*83)*amp*k}px)`}
function flash(lt,color='#fff',d=.1){const o=1-lin(lt,0,d);return o>0?`<div class="abs" style="inset:0;background:${color};opacity:${o}"></div>`:''}
// when each word of `text` is spoken (scene-relative), matched in order against the voice's word
// timing o.w[line] (accents, case and punctuation ignored). Words not in the voice get the previous
// time + gap. Use as times for word-by-word reveals: slam(lt, at, text, {times: said(o, text)}).
const said=(o,text,line=0,{gap=.12,from=0}={})=>{
  const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9ñ]/g,'');
  const spoken=(o.w&&o.w[line])||[]; let j=from, last=spoken.length?spoken[0][0]-gap:(o.l[line]||[0])[0];
  return text.split(/\s+/).filter(Boolean).map(word=>{
    const n=norm(word);
    for(let k=j;k<spoken.length;k++) if(norm(spoken[k][2])===n){j=k+1;return last=spoken[k][0];}
    return last=last+gap;
  });
};
// fraction helper used by most scenes: times at fractions of the scene's first line
const frac=(o,fs)=>{const [l]=o.l,d=l[1]-l[0];return fs.map(f=>l[0]+d*f)};

// ---------- assets (projects/<p>/assets, see `bun vk asset`) ----------
// asset('name') -> URL. Requested-but-missing assets resolve to a striped placeholder
// that shows what is needed, so scenes can be built before the real file exists.
const AM=VK.assetMap||{};
function asset(name){
  const a=AM[name]; if(a) return a.url;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080"><rect width="100%" height="100%" fill="#fde8e8"/><text x="50%" y="50%" text-anchor="middle" font-family="sans-serif" font-size="56" font-weight="700" fill="#c0392b">missing asset: ${name}</text></svg>`;
  return 'data:image/svg+xml;base64,'+btoa(svg);
}
const assetInfo=name=>AM[name]||{};
// positioned image. fit: cover|contain. Extra CSS via style.
function image(name,{x=0,y=0,w=W,h=H,fit='cover',radius=0,style='',pos='50% 50%'}={}){
  return `<img class="abs" src="${asset(name)}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;object-fit:${fit};object-position:${pos};border-radius:${radius}px;${style}">`;
}
// slow zoom/pan over an image. from/to = [scale, xShift%, yShift%]
function kenburns(name,lt,dur,{from=[1.06,0,0],to=[1.18,-2,-3],x=0,y=0,w=W,h=H,pos='50% 50%',style=''}={}){
  const k=clamp(lt/Math.max(.01,dur)), e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
  const s=from[0]+(to[0]-from[0])*e, tx=from[1]+(to[1]-from[1])*e, ty=from[2]+(to[2]-from[2])*e;
  return `<div class="abs" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;overflow:hidden;${style}"><img src="${asset(name)}" style="width:100%;height:100%;object-fit:cover;object-position:${pos};transform:scale(${s}) translate(${tx}%,${ty}%)"></div>`;
}
// generic phone frame (no brand logos). inner = HTML for the screen. Height = w * 2.1667 (19.5:9).
function device(inner,{x=W/2,y=240,w=640,rot=0,scale=1,frame='#111',shadow=true,island=true}={}){
  const h=Math.round(w*2.1667), b=Math.round(w*.035), r=Math.round(w*.14);
  return `<div class="abs" style="left:${x-w/2}px;top:${y}px;width:${w}px;height:${h}px;border-radius:${r}px;background:${frame};padding:${b}px;transform:rotate(${rot}deg) scale(${scale});transform-origin:center top;${shadow?'box-shadow:0 50px 120px rgba(0,0,0,.35),0 0 0 2px rgba(255,255,255,.06) inset':''}">
   <div style="position:relative;width:100%;height:100%;border-radius:${r-b}px;overflow:hidden;background:#fff">${inner}
   ${island?`<div style="position:absolute;left:50%;top:${Math.round(w*.03)}px;width:${Math.round(w*.3)}px;height:${Math.round(w*.085)}px;margin-left:-${Math.round(w*.15)}px;border-radius:999px;background:#000"></div>`:''}</div></div>`;
}
// a screenshot inside a phone frame. scroll: [fromFrac, toFrac, t0, t1] scrolls a tall screenshot.
function screen(name,lt,{scroll=null,...o}={}){
  const a=assetInfo(name), w=(o.w||640)*(1-.07), vh=w*2.1667*(1-.0), ih=a.w&&a.h?w*a.h/a.w:vh;
  let off=0; if(scroll){const [f0,f1,t0,t1]=scroll;const k=eo(lin(lt,t0,t1));off=(f0+(f1-f0)*k)*Math.max(0,ih-vh);}
  return device(`<img src="${asset(name)}" style="display:block;width:100%;transform:translateY(${-off}px)">`,o);
}
// frame-accurate video clip (frames pre-extracted by `vk asset add` at the project fps)
function clip(name,t,{start=0,loop=false,x=0,y=0,w=W,h=H,fit='cover',radius=0,style=''}={}){
  const a=assetInfo(name); if(!a.frames) return image(name,{x,y,w,h,fit,radius,style});
  let i=Math.floor(Math.max(0,t-start)*a.frames.fps); i=loop?i%a.frames.count:Math.min(i,a.frames.count-1);
  return `<img class="abs" src="${a.frames.url}${String(i+1).padStart(5,'0')}.jpg" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;object-fit:${fit};border-radius:${radius}px;${style}">`;
}
