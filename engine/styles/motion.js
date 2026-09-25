// ---------- style: MOTION (motion graphics / kinetic typography) ----------
// Flat color fields, masked word reveals, counters, charts, shape wipes. Font: Space Grotesk.
const MOTION=(()=>{
  document.head.insertAdjacentHTML('beforeend',`<style>
  .mo{font-family:'Space Grotesk',var(--font),sans-serif;letter-spacing:-.03em}
  .mo-m{display:inline-block;overflow:hidden;vertical-align:top;padding:.04em .02em .08em;margin:-.04em 0 -.08em}
  .mo-m>span{display:inline-block;will-change:transform}
  </style>`);
  // deterministic pseudo-random in [0,1)
  const rnd=i=>{const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x)};
  const lerp=(a,b,k)=>a+(b-a)*k;

  // flat background. kind: 'ink' | 'brand' | 'paper' | any CSS color
  function bg(kind='ink'){
    const c={ink:'var(--ink)',brand:'var(--brand)',brand2:'var(--brand2)',paper:'var(--paper)'}[kind]||kind;
    return `<div class="abs" style="inset:0;background:${c}"></div>`;
  }
  // slowly panning dot/line grid
  function grid(t,{color='rgba(255,255,255,.08)',size=90,speed=12}={}){
    const o=(t*speed)%size;
    return `<div class="abs" style="inset:-${size}px;background-image:linear-gradient(${color} 2px,transparent 2px),linear-gradient(90deg,${color} 2px,transparent 2px);background-size:${size}px ${size}px;transform:translate(${-o}px,${-o}px)"></div>`;
  }
  // masked word-by-word reveal (words slide up from behind a mask). by:'word'|'char'
  // out = time the text leaves (slides up out of the mask)
  function words(lt,at,text,{x=90,y=600,w=W-180,size=150,weight=700,lh=.98,align='left',color='currentColor',hl=[],hlColor='var(--brand)',stagger=.06,d=.5,by='word',out=null,upper=false}={}){
    if(lt<at-.01) return '';
    const count=by==='char'?text.replace(/ /g,'').length:text.split(' ').length;
    // fully exited: render nothing (masked glyph descenders/accents would otherwise leave slivers)
    if(out!=null&&lt>out+count*stagger*.5+d*.8+.02) return '';
    // hl indexes words in both modes; in char mode each word's letters stay together (no mid-word wraps)
    let n=0;
    const unit=(ch,i,col)=>{
      const k=eo(lin(lt,at+i*stagger,at+i*stagger+d));
      const ko=out!=null?eo(lin(lt,out+i*stagger*.5,out+i*stagger*.5+d*.8)):0;
      // fade at both ends so no sliver shows while hidden below/above the mask
      const op=clamp(k*5)*clamp((1-ko)*5);
      return `<span class="mo-m"><span style="transform:translateY(${(1-k)*110-ko*110}%);opacity:${op};color:${col}">${esc(ch)}</span></span>`;
    };
    const html=text.split(' ').map((word,wi)=>{
      const col=hl.includes(wi)?hlColor:color;
      if(by!=='char') return unit(word,n++,col);
      return `<span style="white-space:nowrap">${[...word].map(ch=>unit(ch,n++,col)).join('')}</span>`;
    }).join(' ');
    return `<div class="abs mo" style="left:${x}px;top:${y}px;width:${w}px;font-size:${size}px;font-weight:${weight};line-height:${lh};text-align:${align};${upper?'text-transform:uppercase;':''}">${html}</div>`;
  }
  // animated number. fmt: thousands separators, decimals
  function counter(lt,at,to,{from=0,d=1.1,prefix='',suffix='',decimals=0,x=0,y=600,w=W,size=300,weight=700,align='center',color='currentColor',sufSize=.4}={}){
    if(lt<at-.01) return '';
    const k=eo(lin(lt,at,at+d)), v=lerp(from,to,k);
    const n=v.toLocaleString('en-US',{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
    const p=pop(lt,at,.3);
    return `<div class="abs mo" style="left:${x}px;top:${y}px;width:${w}px;text-align:${align};font-size:${size}px;font-weight:${weight};line-height:1;color:${color};transform:scale(${.6+.4*p});opacity:${clamp(p*3)}">${esc(prefix)}${n}<span style="font-size:${sufSize}em;letter-spacing:0">${esc(suffix)}</span></div>`;
  }
  // horizontal bar chart that grows in. rows: [{label, value, color?}]
  function bars(lt,at,rows,{x=90,y=520,w=W-180,rowH=120,gap=46,max=null,suffix='',stagger=.14,d=.8,labelSize=40,color='var(--brand)',track='rgba(127,127,127,.15)'}={}){
    if(lt<at-.01) return '';
    const m=max??Math.max(...rows.map(r=>r.value));
    return rows.map((r,i)=>{
      const k=eo(lin(lt,at+i*stagger,at+i*stagger+d)), v=r.value*k;
      const top=y+i*(rowH+gap);
      return `<div class="abs mo" style="left:${x}px;top:${top}px;width:${w}px">
        <div style="display:flex;justify-content:space-between;font-size:${labelSize}px;font-weight:700;margin-bottom:12px;opacity:${clamp(k*3)}"><span>${esc(r.label)}</span><span>${Math.round(v).toLocaleString('en-US')}${esc(suffix)}</span></div>
        <div style="height:${rowH-labelSize-12}px;border-radius:${rowH}px;background:${track};overflow:hidden"><div style="height:100%;width:${(v/m)*100}%;border-radius:${rowH}px;background:${r.color||color}"></div></div></div>`;
    }).join('');
  }
  // full-screen panel that uncovers the scene at its start (use at lt=0)
  function reveal(lt,{color='var(--brand)',d=.45,dir='up',delay=0}={}){
    const k=eo(lin(lt,delay,delay+d)); if(k>=1) return '';
    const tr={up:`translateY(${-k*100}%)`,down:`translateY(${k*100}%)`,left:`translateX(${-k*100}%)`,right:`translateX(${k*100}%)`}[dir];
    return `<div class="abs" style="inset:0;background:${color};transform:${tr}"></div>`;
  }
  // panel that covers the screen before the next scene (at = seconds into the scene)
  function cover(lt,at,{color='var(--brand)',d=.35,dir='up'}={}){
    if(lt<at) return '';
    const k=eo(lin(lt,at,at+d));
    const tr={up:`translateY(${(1-k)*100}%)`,down:`translateY(${-(1-k)*100}%)`,left:`translateX(${(1-k)*100}%)`,right:`translateX(${-(1-k)*100}%)`}[dir];
    return `<div class="abs" style="inset:0;background:${color};transform:${tr}"></div>`;
  }
  // circle clip reveal of any HTML, centered at x,y
  function circleIn(lt,at,html,{x=W/2,y=H/2,d=.6,r=Math.hypot(W,H)}={}){
    if(lt<at) return '';
    const k=eo(lin(lt,at,at+d));
    return `<div class="abs" style="inset:0;clip-path:circle(${k*r}px at ${x}px ${y}px)">${html}</div>`;
  }
  // soft animated gradient mesh: large blurred color fields drifting slowly (calm, premium texture)
  // base = background color, colors = 2-4 CSS colors, alpha = strength
  function mesh(t,{base='var(--paper)',colors=['var(--brand)','var(--brand2)'],alpha=.35,speed=.18,blur=90}={}){
    const spots=[[18,22,62],[82,30,55],[30,82,58],[78,78,50]];
    const g=spots.slice(0,Math.max(2,colors.length+1)).map(([x,y,r],i)=>{
      const c=colors[i%colors.length], ph=i*1.7;
      const dx=Math.sin(t*speed+ph)*8, dy=Math.cos(t*speed*.8+ph)*6;
      return `radial-gradient(${r}% ${r*.62}% at ${x+dx}% ${y+dy}%,${mix(c,alpha*100)},transparent 70%)`;
    }).join(',');
    return `<div class="abs" style="inset:0;background:${base}"></div><div class="abs" style="inset:-${blur}px;background:${g};filter:blur(${blur}px)"></div>`;
  }
  // floating geometric shapes (circles, rings, squares, pills) for texture
  function shapes(t,{n=7,colors=['var(--brand)','var(--brand2)','rgba(255,255,255,.14)'],size=[60,220],alpha=1}={}){
    let h='';
    for(let i=0;i<n;i++){
      const s=lerp(size[0],size[1],rnd(i+1)), x=rnd(i+10)*W, y=rnd(i+20)*H, sp=.2+rnd(i+30)*.5, ph=rnd(i+40)*6.28;
      const dx=Math.sin(t*sp+ph)*40, dy=Math.cos(t*sp*.8+ph)*60, rot=t*20*(rnd(i+50)-.5);
      const kind=Math.floor(rnd(i+60)*4), c=colors[i%colors.length];
      const shape=kind===0?`border-radius:50%;background:${c}`:kind===1?`border-radius:50%;border:${Math.round(s*.12)}px solid ${c}`:kind===2?`border-radius:${s*.18}px;background:${c}`:`border-radius:999px;background:${c};height:${s*.38}px`;
      h+=`<div class="abs" style="left:${x-s/2}px;top:${y-s/2}px;width:${s}px;height:${s}px;${shape};opacity:${alpha};transform:translate(${dx}px,${dy}px) rotate(${rot}deg)"></div>`;
    }
    return h;
  }
  // giant scrolling text band
  function marquee(t,text,{y=1480,size=220,speed=260,color='currentColor',outline=false,weight=700,rot=0,dir=-1}={}){
    const unit=`${esc(text)}&nbsp;·&nbsp;`, rep=unit.repeat(8);
    const off=((t*speed)%(size*text.length*.62+size))*dir;
    const st=outline?`color:transparent;-webkit-text-stroke:4px ${color}`:`color:${color}`;
    return `<div class="abs mo" style="left:0;top:${y}px;white-space:nowrap;font-size:${size}px;font-weight:${weight};line-height:1;${st};transform:rotate(${rot}deg) translateX(${off - size*4}px)">${rep}</div>`;
  }
  // growing accent bar (underline, divider)
  function bar(lt,at,{x=90,y=900,w=300,h=18,color='var(--brand)',d=.5,from='left'}={}){
    if(lt<at) return '';
    const k=eo(lin(lt,at,at+d));
    return `<div class="abs" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:${h}px;background:${color};transform:scaleX(${k});transform-origin:${from}"></div>`;
  }
  // big kinetic caption for spoken lines (mask style). Use: o.caps.map(c=>MOTION.caption(lt,c))
  function caption(lt,c,{y=1320,size=84,color='currentColor',hlColor='var(--brand)'}={}){
    const [s,e,text,o]=c; if(lt<s||lt>=e) return '';
    const fadeOut=1-lin(lt,e-.15,e);
    return `<div style="opacity:${fadeOut}">${words(lt,s,text,{x:90,y:o.y&&o.y!==1400?o.y:y,w:W-240,size:o.size&&o.size!==84?o.size:size,align:'center',hl:o.hl,color,hlColor,stagger:.05,d:.35})}</div>`;
  }
  return {bg,grid,mesh,words,counter,bars,reveal,cover,circleIn,shapes,marquee,bar,caption};
})();
