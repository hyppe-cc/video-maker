// ---------- style: STORY (cinematic storytelling) ----------
// Full-bleed photos/clips with slow Ken Burns, letterbox, serif chapter cards,
// quiet subtitles, dips to black, light leaks. Font: Playfair Display.
const STORY=(()=>{
  document.head.insertAdjacentHTML('beforeend',`<style>
  .st-serif{font-family:'Playfair Display',Georgia,serif}
  .st-sub{position:absolute;left:90px;right:90px;text-align:center;color:#fff;font-weight:600;line-height:1.25;text-shadow:0 2px 3px rgba(0,0,0,.6),0 0 30px rgba(0,0,0,.45)}
  .st-sub b,.st-sub .hl{background:none;color:inherit;padding:0;font-weight:800;border-bottom:4px solid var(--brand)}
  </style>`);

  // photo with Ken Burns + readable bottom gradient. dark = overall dim 0..1
  function photo(name,lt,dur,{from=[1.05,0,0],to=[1.16,-2,-2],dark=.15,grad=.65,pos='50% 50%',filter=''}={}){
    let h=kenburns(name,lt,dur,{from,to,pos,style:filter?`filter:${filter}`:''});
    h+=`<div class="abs" style="inset:0;background:linear-gradient(180deg,rgba(0,0,0,${grad*.6}) 0%,rgba(0,0,0,0) 28%,rgba(0,0,0,0) 55%,rgba(0,0,0,${grad}) 100%),rgba(0,0,0,${dark})"></div>`;
    return h;
  }
  // cinematic bars sliding in
  function letterbox(lt,{h=200,d=.7,color='#000'}={}){
    const k=eo(lin(lt,0,d)), s=h*k;
    return `<div class="abs" style="left:0;right:0;top:0;height:${s}px;background:${color}"></div><div class="abs" style="left:0;right:0;bottom:0;height:${s}px;background:${color}"></div>`;
  }
  function vignette(strength=.55){
    return `<div class="abs" style="inset:0;background:radial-gradient(120% 90% at 50% 45%,transparent 50%,rgba(0,0,0,${strength}) 100%)"></div>`;
  }
  // fade in from black at scene start / fade to black before `end`
  function dip(lt,{d=.5,color='#000'}={}){const o=1-lin(lt,0,d);return o>0?`<div class="abs" style="inset:0;background:${color};opacity:${o}"></div>`:''}
  function dipOut(lt,end,{d=.5,color='#000'}={}){const o=lin(lt,end-d,end);return o>0?`<div class="abs" style="inset:0;background:${color};opacity:${o}"></div>`:''}
  // warm light leak sweeping across (screen blend)
  function leak(t,{color='255,170,90',strength=.35,speed=.25}={}){
    const x=50+Math.sin(t*speed)*45, y=30+Math.cos(t*speed*.7)*25;
    return `<div class="abs" style="inset:0;mix-blend-mode:screen;background:radial-gradient(45% 35% at ${x}% ${y}%,rgba(${color},${strength}),transparent 70%),radial-gradient(30% 25% at ${100-x}% ${90-y*.5}%,rgba(${color},${strength*.5}),transparent 70%)"></div>`;
  }
  // chapter card: small kicker + big italic serif title
  function chapter(lt,at,{kicker='',title='',y=760,size=120,color='#fff'}={}){
    if(lt<at) return '';
    const k=eo(lin(lt,at,at+.9)), k2=eo(lin(lt,at+.25,at+1.2));
    return `<div class="abs" style="left:90px;right:90px;top:${y}px;text-align:center;color:${color}">
      <div style="font:700 34px var(--font);letter-spacing:${.35+.25*(1-k)}em;text-transform:uppercase;opacity:${k*.85}">${esc(kicker)}</div>
      <div class="st-serif" style="margin-top:28px;font-size:${size}px;font-style:italic;font-weight:400;line-height:1.05;opacity:${k2};transform:translateY(${(1-k2)*30}px)">${title}</div>
      <div style="margin:40px auto 0;width:${120*k2}px;height:3px;background:var(--brand)"></div></div>`;
  }
  // quiet subtitle for spoken lines. Use: o.caps.map(c=>STORY.subtitle(lt,c))
  function subtitle(lt,c,{y=H-470,size=56}={}){
    const [s,e,text,o]=c; if(lt<s||lt>=e) return '';
    const op=Math.min(lin(lt,s,s+.18),1-lin(lt,e-.18,e));
    const words=text.split(' ').map((w,i)=>o.hl&&o.hl.includes(i)?`<b>${esc(w)}</b>`:esc(w)).join(' ');
    return `<div class="st-sub" style="top:${y}px;font-size:${size}px;opacity:${op}">${words}</div>`;
  }
  // big pull quote
  function quote(lt,at,text,{author='',y=560,size=92,color='#fff'}={}){
    if(lt<at) return '';
    const k=eo(lin(lt,at,at+1));
    return `<div class="abs st-serif" style="left:100px;right:100px;top:${y}px;color:${color};opacity:${k};transform:translateY(${(1-k)*24}px)">
      <div style="font-size:${size*2}px;line-height:.6;color:var(--brand)">“</div>
      <div style="font-size:${size}px;font-style:italic;line-height:1.15">${text}</div>
      ${author?`<div style="margin-top:40px;font:600 36px var(--font);letter-spacing:.2em;text-transform:uppercase;opacity:.8">${esc(author)}</div>`:''}</div>`;
  }
  // typewriter place/date stamp, e.g. "OAXACA · 2019"
  function stamp(lt,at,text,{x=90,y=250,size=38,color='#fff',cps=18}={}){
    if(lt<at) return '';
    const n=Math.floor((lt-at)*cps), shown=[...text].slice(0,n).join('');
    const caret=Math.floor(lt*2)%2===0&&n<text.length+10?'▍':'';
    return `<div class="abs" style="left:${x}px;top:${y}px;font:500 ${size}px 'IBM Plex Mono',monospace;letter-spacing:.12em;color:${color};text-shadow:0 2px 10px rgba(0,0,0,.5)">${esc(shown)}<span style="opacity:.8">${caret}</span></div>`;
  }
  // end card: serif brand line + url
  function end(lt,at,{title=VK.brand.name,sub='',color='#fff'}={}){
    if(lt<at) return '';
    const k=eo(lin(lt,at,at+1));
    return `<div class="abs" style="left:0;right:0;top:${H/2-160}px;text-align:center;color:${color};opacity:${k}">
      <div class="st-serif" style="font-size:150px;font-weight:700;letter-spacing:-2px">${esc(title)}</div>
      ${sub?`<div style="margin-top:24px;font:600 44px var(--font);letter-spacing:.08em;opacity:.85">${esc(sub)}</div>`:''}</div>`;
  }
  return {photo,letterbox,vignette,dip,dipOut,leak,chapter,subtitle,quote,stamp,end};
})();
