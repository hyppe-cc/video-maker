// ---------- style: ANTHEM (manifesto / brand film) ----------
// Dramatic movement films: giant uppercase type that slams in word by word, text scramble,
// wide-tracked labels, red strikes, strobes, documentary footage in black & white or red duotone,
// breathing red glow. Headlines use the project's display font; one accent color (--brand).
const ANTHEM=(()=>{
  document.head.insertAdjacentHTML('beforeend',`<style>
  .an{font-family:var(--font-display),var(--font),sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:-.045em;word-spacing:.16em;line-height:.86}
  .an-w{display:inline-block;white-space:nowrap;transform-origin:50% 60%}
  .an-lab{font-family:var(--font),sans-serif;font-weight:500;text-transform:uppercase;letter-spacing:.32em}
  .an-sub{font-family:var(--font),sans-serif;font-weight:600;letter-spacing:-.01em;line-height:1.18;text-shadow:0 4px 24px rgba(0,0,0,.9)}
  </style>`);
  const rnd=i=>{const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x)};
  const expo=x=>x>=1?1:1-Math.pow(2,-10*clamp(x));

  // near-black field with a breathing brand glow (rate in breaths per second) and a vignette
  function bg(t,{glow=22,rate=.25,y=45,color='var(--brand)'}={}){
    const b=.5+.5*Math.sin(t*Math.PI*2*rate);
    return `<div class="abs" style="inset:0;background:var(--ink)"></div>
      <div class="abs" style="inset:0;background:radial-gradient(${60+b*14}% ${38+b*8}% at 50% ${y}%,${mix(color,glow*(.6+.4*b))},transparent 72%)"></div>
      <div class="abs" style="inset:0;background:radial-gradient(130% 95% at 50% 45%,transparent 50%,rgba(0,0,0,.75))"></div>`;
  }
  // documentary footage (video asset or image): black & white, red duotone or natural, slow push,
  // darkened for type. tone: 'bw' | 'red' | 'natural'. start = seconds into the clip.
  // grad = top/bottom shade so type stays readable
  function footage(name,lt,{start=0,tone='bw',dark=.45,push=[1.04,1.14],dur=5,x=0,y=0,w=W,h=H,pos='50% 50%',blur=0,op=1,grad=true}={}){
    const k=clamp(lt/Math.max(.1,dur)), s=push[0]+(push[1]-push[0])*k;
    const f=tone==='natural'?`contrast(1.08) saturate(.9) brightness(.9)`:`grayscale(1) contrast(1.35) brightness(.85)`;
    const media=assetInfo(name).frames?clip(name,lt+start,{x:0,y:0,w,h,style:`object-position:${pos}`}):image(name,{x:0,y:0,w,h,pos});
    // red duotone that keeps the picture: hue from the brand, luminance from the footage
    const red=tone==='red'?`<div class="abs" style="inset:0;background:var(--brand);mix-blend-mode:color"></div><div class="abs" style="inset:0;background:var(--brand);mix-blend-mode:multiply;opacity:.35"></div>`:'';
    return `<div class="abs" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;overflow:hidden;opacity:${op}">
      <div class="abs" style="inset:0;transform:scale(${s});filter:${f}${blur?` blur(${blur}px)`:''}">${media}</div>${red}
      <div class="abs" style="inset:0;background:rgba(0,0,0,${dark})"></div>
      ${grad?'<div class="abs" style="inset:0;background:linear-gradient(180deg,rgba(5,5,5,.7),transparent 26%,transparent 60%,rgba(5,5,5,.92))"></div>':''}</div>`;
  }
  // giant uppercase words that slam in one by one (scale down from `from`, blur to sharp).
  // lines: string with '\n' for line breaks. red = word indexes in the brand color. out = time to fade.
  function slam(lt,at,lines,{x=64,y=600,w=W-128,size=150,align='left',color='#fff',red=[],stagger=.13,d=.16,from=1.7,out=null,ghost=false,times=null}={}){
    if(lt<at-.01) return '';
    let i=0;
    const html=lines.split('\n').map(line=>line.split(' ').map(word=>{
      const t0=times?times[i]??at:at+i*stagger, c=red.includes(i)?'var(--brand)':color; i++;
      if(lt<t0) return `<span class="an-w" style="visibility:hidden">${esc(word)}</span>`;
      const k=expo(lin(lt,t0,t0+d)), s=from+(1-from)*k;
      const st=ghost?`color:transparent;-webkit-text-stroke:3px ${c}`:`color:${c}`;
      return `<span class="an-w" style="${st};transform:scale(${s});opacity:${clamp(k*3)};filter:blur(${(1-k)*14}px)">${esc(word)}</span>`;
    }).join(' ')).join('<br>');
    const op=out!=null?1-lin(lt,out,out+.25):1;
    return `<div class="abs an" style="left:${x}px;top:${y}px;width:${w}px;font-size:${size}px;text-align:${align};opacity:${op}">${html}</div>`;
  }
  // hacker-style decode: glyphs resolve left to right over d seconds
  function scramble(lt,at,text,{x=64,y=600,w=W-128,size=110,d=.7,color='#fff',align='left',cls='an',out=null,style=''}={}){
    if(lt<at) return '';
    const G='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*';
    const n=text.length, k=lin(lt,at,at+d), tick=Math.floor(lt*28);
    const s=[...text].map((ch,i)=>{
      if(ch===' '||ch==='\n') return ch==='\n'?'<br>':' ';
      if(i/n<k) return esc(ch);
      return `<span style="color:var(--brand);opacity:.85">${G[Math.floor(rnd(i*31+tick)*G.length)]}</span>`;
    }).join('');
    const op=out!=null?1-lin(lt,out,out+.25):1;
    return `<div class="abs ${cls}" style="left:${x}px;top:${y}px;width:${w}px;font-size:${size}px;text-align:${align};color:${color};opacity:${op};${style}">${s}</div>`;
  }
  // wide-tracked label with a red rule that draws first (site kicker style)
  function label(lt,at,text,{x=64,y=300,size=30,color='rgba(255,255,255,.62)',rule=70,w=W-128,align='left'}={}){
    if(lt<at) return '';
    const k=expo(lin(lt,at,at+.4)), n=Math.floor(lin(lt,at+.2,at+.2+text.length/38)*text.length);
    const r=rule?`<span style="display:inline-block;width:${rule*k}px;height:3px;background:var(--brand);vertical-align:.32em;margin-right:${rule?24:0}px"></span>`:'';
    return `<div class="abs an-lab" style="left:${x}px;top:${y}px;width:${w}px;font-size:${size}px;color:${color};text-align:${align}">${r}${esc(text.slice(0,n))}</div>`;
  }
  // red bar that swipes across (strike-through, underline) from the left
  function strike(lt,at,{x=64,y=700,w=600,h=16,d=.28,color='var(--brand)',rot=-2}={}){
    if(lt<at) return '';
    const k=expo(lin(lt,at,at+d));
    return `<div class="abs" style="left:${x}px;top:${y}px;width:${w*k}px;height:${h}px;background:${color};transform:rotate(${rot}deg);transform-origin:left center;box-shadow:0 0 30px ${mix(color,60)}"></div>`;
  }
  // flash / strobe frames at a time (not only at scene start)
  function flashAt(lt,at,{color='#fff',d=.12,max=.9}={}){
    if(lt<at||lt>at+d) return '';
    return `<div class="abs" style="inset:0;background:${color};opacity:${max*(1-lin(lt,at,at+d))}"></div>`;
  }
  function strobe(lt,at,{n=3,gap=.07,color='var(--brand)'}={}){
    let h='';for(let i=0;i<n;i++) h+=flashAt(lt,at+i*gap*2,{color,d:gap,max:.85});return h;
  }
  // camera shake for a wrapper's transform, decaying over d
  function shake(lt,at,{amp=18,d=.4}={}){
    if(lt<at||lt>at+d) return '';
    const k=1-lin(lt,at,at+d);
    return `transform:translate(${Math.sin(lt*91)*amp*k}px,${Math.cos(lt*77)*amp*k}px);`;
  }
  // black frame that covers everything between a and b (fades out over f)
  function black(lt,a,b,{f=.12}={}){
    if(lt<a||lt>b+f) return '';
    return `<div class="abs" style="inset:0;background:#000;opacity:${lt>b?1-lin(lt,b,b+f):1}"></div>`;
  }
  // "DE <from>" gets struck, then "A <to>" slams in red
  function fromTo(lt,at,from,to,{y=560,size=128,swap=null,x=64}={}){
    if(lt<at) return '';
    const sw=swap??at+.9;
    let h=label(lt,at,'de',{x,y:y-70,rule:0,size:34,color:'rgba(255,255,255,.5)'});
    h+=slam(lt,at+.05,from,{x,y,size,color:lt>=sw?'rgba(255,255,255,.35)':'#fff',stagger:.1});
    const lines=from.split('\n').length;
    h+=strike(lt,sw,{x:x-10,y:y+size*.45,w:W-2*x+20,h:14});
    if(lt>=sw+.15){
      const y2=y+lines*size*.9+90;
      h+=label(lt,sw+.15,'a',{x,y:y2-70,rule:0,size:34,color:'rgba(255,255,255,.5)'});
      h+=slam(lt,sw+.2,to,{x,y:y2,size:size*1.08,color:'var(--brand)',stagger:.1});
    }
    return h;
  }
  // endless band of uppercase text (outline or solid)
  function marquee(t,text,{y=1500,size=150,speed=180,color='rgba(255,255,255,.14)',outline=true,rot=0,dir=-1}={}){
    const unit=`${esc(text)} &nbsp;•&nbsp; `, span=size*text.length*.62+size;
    const off=((t*speed)%span)*dir;
    const st=outline?`color:transparent;-webkit-text-stroke:2px ${color}`:`color:${color}`;
    return `<div class="abs an" style="left:0;top:${y}px;white-space:nowrap;font-size:${size}px;${st};transform:rotate(${rot}deg) translateX(${off-span}px)">${unit.repeat(6)}</div>`;
  }
  // documentary subtitle for o.caps: words rise in, hl words in red. Use: o.caps.map(c=>ANTHEM.subtitle(lt,c))
  function subtitle(lt,c,{y=1440,size=54}={}){
    const [s,e,text,o]=c; if(lt<s||lt>=e) return '';
    const out=1-lin(lt,e-.15,e);
    const html=text.split(' ').map((w,i)=>{
      const t0=s+i*.06, k=expo(lin(lt,t0,t0+.3));
      return `<span style="display:inline-block;opacity:${k};transform:translateY(${(1-k)*18}px);${o.hl.includes(i)?'color:var(--brand)':''}">${esc(w)}</span>`;
    }).join(' ');
    return `<div class="abs an-sub" style="left:80px;right:80px;top:${o.y&&o.y!==1400?o.y:y}px;text-align:center;font-size:${o.size&&o.size!==84?o.size:size}px;color:#fff;opacity:${out}">${html}</div>`;
  }
  return {bg,footage,slam,scramble,label,strike,flashAt,strobe,shake,black,fromTo,marquee,subtitle,expo};
})();
