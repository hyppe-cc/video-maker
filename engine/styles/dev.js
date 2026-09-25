// ---------- style: DEV (developer tools) ----------
// Terminal typing, editor windows with syntax highlighting, git diffs, pull requests, CI checks,
// rubber stamps, cursor clicks. Mono: JetBrains Mono; headlines use the project's display font.
const DEV=(()=>{
  document.head.insertAdjacentHTML('beforeend',`<style>
  .dv{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;letter-spacing:-.01em}
  .dv-d{font-family:var(--font-display),'Space Grotesk',var(--font),sans-serif;word-spacing:.12em}
  .dv-win{background:color-mix(in srgb,var(--ink) 92%,#fff);border:2px solid rgba(255,255,255,.09);border-radius:30px;overflow:hidden;box-shadow:0 50px 120px rgba(0,0,0,.55),0 0 0 1px rgba(0,0,0,.6)}
  .dv-bar{height:74px;display:flex;align-items:center;gap:14px;padding:0 30px;border-bottom:2px solid rgba(255,255,255,.07);background:rgba(255,255,255,.025)}
  .dv-bar i{width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.14)}
  .dv-bar span{flex:1;text-align:center;margin-right:84px;font:500 28px 'JetBrains Mono',monospace;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .dv-ln{white-space:pre;min-height:1.5em}
  .dv-row{display:flex;align-items:center;white-space:pre;overflow:hidden;position:relative}
  .dv-g{width:64px;flex:none;text-align:center;font-weight:700}
  .dv-caret{display:inline-block;width:.58em;height:1.08em;vertical-align:-.16em;background:var(--brand);margin-left:.04em}
  .dv-pill{display:inline-flex;align-items:center;gap:.36em;border-radius:999px;font-family:var(--font),sans-serif;font-weight:600;padding:.36em .8em;color:#fff}
  .dv-chip{display:inline-flex;align-items:center;gap:14px;border-radius:999px;border:2px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);padding:16px 30px;font-weight:700;white-space:nowrap}
  </style>`);
  // syntax colors (GitHub-dark-like, recognisable to developers)
  const C={kw:'#ff7b72',str:'#a5d6ff',num:'#79c0ff',fn:'#d2a8ff',tag:'#7ee787',com:'#8b949e',p:'#c9d1d9',tx:'#e6edf3'};
  const KW=new Set('const let var function return if else import from export new await async true false null undefined delete type interface class extends throw of in for while'.split(' '));
  const sp=(c,s)=>`<span style="color:${c}">${esc(s)}</span>`;
  // highlight one line of JS/TS/JSX
  function hi(src){
    const re=/(\/\/.*$)|("[^"]*"?|'[^']*'?|`[^`]*`?)|(\b\d[\d_.,]*\b)|(<\/?[A-Za-z][\w.]*|\/?>)|([A-Za-z_$][\w$]*)(?=\s*\()|([A-Za-z_$][\w$]*)|(\s+)|([\s\S])/g;
    let out='',m;
    while((m=re.exec(src))){
      const [s,com,str,num,tag,fn,word,ws]=m;
      out+=com?sp(C.com,s):str?sp(C.str,s):num?sp(C.num,s):tag?sp(C.tag,s):fn?sp(C.fn,s):word?sp(KW.has(word)?C.kw:C.tx,s):ws?s:sp(C.p,s);
    }
    return out;
  }
  // highlight a shell command: program, flags, strings
  function sh(src){
    let first=true;
    return src.split(/(\s+|"[^"]*"?)/).map(tok=>{
      if(!tok) return '';
      if(/^\s+$/.test(tok)) return tok;
      if(tok[0]==='"') return sp(C.str,tok);
      if(first){first=false;return sp(C.fn,tok);}
      if(tok[0]==='-') return sp(C.num,tok);
      return sp(C.tx,tok);
    }).join('');
  }
  const typed=(lt,at,text,cps=30)=>lt<at?'':text.slice(0,Math.floor((lt-at)*cps));
  const caret=(lt,solid=false)=>`<span class="dv-caret" style="opacity:${solid||Math.floor(lt*2.4)%2===0?1:0}"></span>`;
  // entrance: returns CSS (opacity + rise + scale) for something appearing at `at`
  function enter(lt,at,{d=.35,rise=50,from=.94}={}){
    const k=eo(lin(lt,at,at+d));
    return `opacity:${clamp(k*2.5)};transform:translateY(${(1-k)*rise}px) scale(${from+(1-from)*k});`;
  }

  // background: ink, slow brand glow, panning dot grid, vignette
  function bg(t,{glow=26,grid=true,color='var(--brand)'}={}){
    const a=Math.sin(t*.7)*6, o=(t*14)%48;
    return `<div class="abs" style="inset:0;background:radial-gradient(80% 42% at ${50+a}% 8%,${mix(color,glow)},transparent 70%),radial-gradient(70% 40% at ${30-a}% 100%,${mix(color,glow*.45)},transparent 70%),var(--ink)"></div>`+
      (grid?`<div class="abs" style="inset:-48px;background-image:radial-gradient(rgba(255,255,255,.09) 2.5px,transparent 3px);background-size:48px 48px;transform:translate(${-o}px,${-o}px);-webkit-mask-image:radial-gradient(90% 70% at 50% 45%,#000,transparent)"></div>`:'')+
      `<div class="abs" style="inset:0;background:radial-gradient(120% 90% at 50% 45%,transparent 55%,rgba(0,0,0,.55))"></div>`;
  }
  // window chrome (editor / terminal / browser). lt+at make it pop in.
  function win(inner,{x=60,y=400,w=W-120,h=null,title='',lt=null,at=0,pad=38,style=''}={}){
    const e=lt==null?'':enter(lt,at);
    return `<div class="abs dv-win" style="left:${x}px;top:${y}px;width:${w}px;${h?`height:${h}px;`:''}${e}transform-origin:center top;${style}">
      <div class="dv-bar"><i></i><i></i><i></i><span>${esc(title)}</span></div><div style="padding:${pad}px">${inner}</div></div>`;
  }
  // terminal: rows = [{cmd:'git push'} | {out:'text', color, html, wait, d}]. Commands type at cps, outputs follow.
  function termEnd(at,rows,{cps=34,gap=.18}={}){
    let tt=at; for(const r of rows) tt=r.cmd!=null?tt+r.cmd.length/cps+gap:tt+(r.wait||0)+(r.d??.12); return tt;
  }
  function term(lt,at,rows,{cps=34,gap=.18,prompt='$',size=36,idle=true,...w}={}){
    let tt=at,html='',busy=false;
    for(const r of rows){
      if(lt<tt){busy=true;break;}
      if(r.cmd!=null){
        const d=r.cmd.length/cps, typing=lt<tt+d;
        html+=`<div class="dv-ln"><span style="color:var(--brand2)">${prompt}</span> ${sh(typed(lt,tt,r.cmd,cps))}${typing?caret(lt,true):''}</div>`;
        tt+=d+gap; if(typing){busy=true;break;}
      } else {
        const t0=tt+(r.wait||0); if(lt<t0){busy=true;break;}
        html+=`<div class="dv-ln" style="color:${r.color||'var(--mut)'};opacity:${fade(lt,t0,t0+.1)}">${r.html??esc(r.out)}</div>`;
        tt=t0+(r.d??.12);
      }
    }
    if(!busy&&idle) html+=`<div class="dv-ln"><span style="color:var(--brand2)">${prompt}</span> ${caret(lt)}</div>`;
    return win(`<div class="dv" style="font-size:${size}px;line-height:1.5;color:${C.tx}">${html}</div>`,{title:'zsh',...w,lt:w.lt??lt,at:w.at??at-.35});
  }
  // editor: lines of code appear one by one (stagger) or all at once; typeLine = index typed at typeAt
  function code(lt,at,lines,{size=34,stagger=.1,num=1,typeLine=-1,typeAt=0,cps=32,marks={},...w}={}){
    const rows=lines.map((src,i)=>{
      const t0=at+i*stagger; if(lt<t0) return '';
      const s=i===typeLine?typed(lt,typeAt,src,cps):src, typing=i===typeLine&&lt>=typeAt&&s.length<src.length;
      const mk=marks[i]?`background:${marks[i]};`:'';
      return `<div class="dv-row" style="height:${size*1.55}px;${mk}opacity:${fade(lt,t0,t0+.15)}"><span class="dv-g" style="color:rgba(255,255,255,.28);font-weight:400">${num+i}</span>${hi(s)}${typing?caret(lt,true):''}</div>`;
    }).join('');
    return win(`<div class="dv" style="font-size:${size}px;margin:0 -20px">${rows}</div>`,{pad:24,...w,lt:w.lt??lt,at:w.at??at-.3});
  }
  // git diff: rows = [{op:'-'|'+'|' '|'@', t:'code', at, kill, gone}]
  //   at   = when the row appears (default at + i*stagger); '+' rows type in from `at`
  //   kill = when a '-' row gets struck through; gone = when the row collapses away
  function diff(lt,at,rows,{size=36,stagger=.22,cps=42,...w}={}){
    const rh=size*1.62;
    const html=rows.map((r,i)=>{
      const ra=r.at??at+i*stagger; if(lt<ra) return '';
      let h=rh*eo(lin(lt,ra,ra+.16)); if(r.gone!=null) h*=1-eo(lin(lt,r.gone,r.gone+.25));
      if(h<.5) return '';
      const col=r.op==='-'?'var(--red)':r.op==='+'?'var(--ok)':r.op==='@'?C.num:'rgba(255,255,255,.3)';
      const bgc=r.op==='-'?mix('var(--red)',16):r.op==='+'?mix('var(--ok)',15):r.op==='@'?'rgba(121,192,255,.08)':'transparent';
      const s=r.op==='+'?typed(lt,ra,r.t,cps):r.t, typing=r.op==='+'&&s.length<r.t.length;
      const kill=r.kill!=null?eo(lin(lt,r.kill,r.kill+.3)):0;
      const strike=kill>0?`<div class="abs" style="left:64px;top:50%;height:5px;margin-top:-2px;width:${kill*(r.t.length*size*.6+10)}px;background:var(--red);border-radius:4px"></div>`:'';
      const body=r.op==='@'?sp(C.num,s):hi(s);
      return `<div class="dv-row" style="height:${h}px;background:${bgc}"><span class="dv-g" style="color:${col}">${r.op===' '?'':r.op==='@'?'@@':r.op}</span><span style="opacity:${1-kill*.5}">${body}</span>${typing?caret(lt,true):''}${strike}</div>`;
    }).join('');
    return win(`<div class="dv" style="font-size:${size}px;margin:0 -24px">${html}</div>`,{pad:24,...w,lt:w.lt??lt,at:w.at??at-.3});
  }
  const ICON={
    pr:c=>`<svg width="1em" height="1em" viewBox="0 0 16 16" fill="${c}"><path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354Z"/></svg>`,
    merge:c=>`<svg width="1em" height="1em" viewBox="0 0 16 16" fill="${c}"><path d="M5.45 5.154A4.25 4.25 0 0 0 9.25 7.5h1.378a2.251 2.251 0 1 1 0 1.5H9.25A5.734 5.734 0 0 1 5 7.123v3.505a2.25 2.25 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.95-.218ZM4.25 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm8.5-4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM5 3.25a.75.75 0 1 0 0 .005V3.25Z"/></svg>`,
    check:c=>`<svg width="1em" height="1em" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="${c}"/><path d="M6.5 12.5l3.6 3.6 7.4-8" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    x:c=>`<svg width="1em" height="1em" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="${c}"/><path d="M8 8l8 8M16 8l-8 8" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  };
  const spinner=(lt,c='#d29922')=>`<svg width="1em" height="1em" viewBox="0 0 24 24" style="transform:rotate(${lt*420}deg)"><circle cx="12" cy="12" r="9" fill="none" stroke="${mix(c,25)}" stroke-width="3.2"/><path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="${c}" stroke-width="3.2" stroke-linecap="round"/></svg>`;
  // pull request header. state flips to merged at mergeAt
  function pr(lt,at,{num=1,title='',branch='fix/main',base='main',author='you',add=0,del=0,mergeAt=null,x=60,y=300,w=W-120,size=58}={}){
    if(lt<at) return '';
    const merged=mergeAt!=null&&lt>=mergeAt, p=merged?pop(lt,mergeAt,.3):1;
    const pill=merged?`<span class="dv-pill" style="font-size:${size*.55}px;background:var(--brand);transform:scale(${p})">${ICON.merge('#fff')} Merged</span>`:`<span class="dv-pill" style="font-size:${size*.55}px;background:#238636">${ICON.pr('#fff')} Open</span>`;
    return `<div class="abs" style="left:${x}px;top:${y}px;width:${w}px;${enter(lt,at)}">
      <div style="font:600 ${size}px/1.12 var(--font),sans-serif;color:#fff;letter-spacing:-.02em">${esc(title)} <span style="color:var(--mut);font-weight:400">#${num}</span></div>
      <div style="display:flex;align-items:center;gap:22px;margin-top:26px;flex-wrap:wrap">${pill}
        <span class="dv" style="font-size:${size*.48}px;color:var(--mut)"><b style="color:#e6edf3">${esc(author)}</b> ${merged?'merged':'wants to merge'} into <span style="color:${C.num};background:rgba(121,192,255,.1);padding:4px 12px;border-radius:10px">${esc(base)}</span> from <span style="color:${C.num};background:rgba(121,192,255,.1);padding:4px 12px;border-radius:10px">${esc(branch)}</span></span></div>
      ${add||del?`<div class="dv" style="font-size:${size*.52}px;margin-top:22px;font-weight:700"><span style="color:var(--ok)">+${add}</span> <span style="color:var(--red)">−${del}</span></div>`:''}</div>`;
  }
  // CI checks: items = ['name', …] or [{name, fail}]; each spins then resolves. Summary after the last one.
  function checks(lt,at,items,{stagger=.3,d=.5,size=36,summary='All checks have passed',...w}={}){
    const rows=items.map((it,i)=>{
      const o=typeof it==='string'?{name:it}:it, t0=at+i*stagger; if(lt<t0) return '';
      const done=lt>=t0+d, ic=done?(o.fail?ICON.x('var(--red)'):ICON.check('var(--ok)')):spinner(lt);
      const s=done?pop(lt,t0+d,.22):1;
      return `<div style="display:flex;align-items:center;gap:26px;padding:16px 0;${enter(lt,t0,{d:.2,rise:20,from:1})}"><span style="display:inline-flex;font-size:${size*1.25}px;transform:scale(${s})">${ic}</span><span class="dv" style="font-size:${size}px;color:${done?'#e6edf3':'var(--mut)'}">${esc(o.name)}</span><span class="dv" style="margin-left:auto;font-size:${size*.72}px;color:var(--mut)">${done?(o.fail?'failed':'passed'):'running'}</span></div>`;
    }).join('');
    const ta=at+(items.length-1)*stagger+d+.15;
    const sum=summary&&lt>=ta?`<div style="display:flex;align-items:center;gap:22px;margin-top:20px;padding-top:26px;border-top:2px solid rgba(255,255,255,.08);${enter(lt,ta,{d:.25,rise:16})}"><span style="display:inline-flex;font-size:${size*1.4}px">${ICON.check('var(--ok)')}</span><span style="font:600 ${size*1.1}px var(--font),sans-serif;color:#fff">${esc(summary)}</span></div>`:'';
    return win(rows+sum,{title:'checks',...w,lt:w.lt??lt,at:w.at??at-.3});
  }
  const checksEnd=(at,n,{stagger=.3,d=.5}={})=>at+(n-1)*stagger+d+.15;
  // reaction chips: items = [{k:'LGTM', icon:'html', n:12}]; hot = {index: time} fills a chip with brand at that time
  function chips(lt,at,items,{x=60,y=800,w=W-120,size=40,stagger=.12,gap=22,hot={},align='center'}={}){
    const html=items.map((it,i)=>{
      const t0=it.at??at+i*stagger; if(lt<t0) return '';
      const p=pop(lt,t0,.26), h=hot[i]!=null&&lt>=hot[i]?pop(lt,hot[i],.3):0;
      const on=h>0?`background:var(--brand);border-color:var(--brand);box-shadow:0 0 ${60*h}px ${mix('var(--brand)',60)};`:'';
      return `<span class="dv-chip dv" style="font-size:${size}px;transform:scale(${(.4+.6*p)*(1+.18*h)});opacity:${clamp(p*3)};${on}">${it.icon||''}${esc(it.k)}${it.n!=null?`<span style="opacity:.6;font-weight:400">${it.n}</span>`:''}</span>`;
    }).join('');
    return `<div class="abs" style="left:${x}px;top:${y}px;width:${w}px;display:flex;flex-wrap:wrap;gap:${gap}px;justify-content:${align==='center'?'center':'flex-start'}">${html}</div>`;
  }
  // rubber stamp that slams in (with a small shake)
  function stamp(lt,at,text,{x=W/2,y=900,rot=-9,color='var(--red)',size=150,d=.16}={}){
    if(lt<at) return '';
    const k=eo(lin(lt,at,at+d)), s=2.3-1.3*k, sh=lt<at+d+.25?Math.sin(lt*90)*10*(1-lin(lt,at+d,at+d+.25)):0;
    return `<div class="abs dv-d" style="left:${x}px;top:${y}px;transform:translate(-50%,-50%) translate(${sh}px,${sh*.6}px) rotate(${rot}deg) scale(${s});opacity:${clamp(k*3)};font-size:${size}px;font-weight:700;line-height:1;letter-spacing:.02em;text-transform:uppercase;color:${color};border:${size*.07}px solid ${color};border-radius:${size*.14}px;padding:${size*.12}px ${size*.22}px ${size*.08}px;white-space:nowrap;background:${mix('var(--ink)',55)};-webkit-mask-image:repeating-linear-gradient(${rot+70}deg,#000 0 7px,rgba(0,0,0,.78) 7px 9px)">${esc(text)}</div>`;
  }
  // mouse pointer along keyframes [[t,x,y],…]; clicks = [t,…] show a press + ring
  function cursor(lt,keys,{clicks=[],size=70}={}){
    if(lt<keys[0][0]) return '';
    let x=keys[0][1],y=keys[0][2];
    for(let i=1;i<keys.length;i++){const [t0,x0,y0]=keys[i-1],[t1,x1,y1]=keys[i];if(lt>=t0){const k=eo(lin(lt,t0,t1));x=x0+(x1-x0)*k;y=y0+(y1-y0)*k;}}
    let ring='',press=1;
    for(const c of clicks){if(lt>=c&&lt<c+.45){const k=lin(lt,c,c+.45);ring+=`<div class="abs" style="left:${x-60*k-10}px;top:${y-60*k-10}px;width:${120*k+20}px;height:${120*k+20}px;border-radius:50%;border:5px solid rgba(255,255,255,${.8*(1-k)})"></div>`;press=Math.min(press,.82+.18*lin(lt,c+.05,c+.2));}}
    return ring+`<svg class="abs" style="left:${x-6}px;top:${y-4}px;width:${size}px;height:${size}px;transform:scale(${press});transform-origin:6px 4px;filter:drop-shadow(0 8px 14px rgba(0,0,0,.5))" viewBox="0 0 24 24"><path d="M3 2l17 10.5-7.4 1.4 4.3 7.6-3.3 1.8-4.3-7.7L3 20.5z" fill="#fff" stroke="#000" stroke-width="1.3" stroke-linejoin="round"/></svg>`;
  }
  // chromatic glitch filter for a wrapper's style (decays over d)
  function glitch(lt,at=0,{d=.22,amp=16}={}){
    if(lt<at||lt>at+d) return '';
    const k=1-lin(lt,at,at+d), a=(Math.sin(lt*173)*.5+.5)*amp*k+2*k, j=Math.sin(lt*97)*amp*.6*k;
    return `filter:drop-shadow(${a}px 0 0 rgba(255,40,70,.85)) drop-shadow(${-a}px 0 0 rgba(0,220,255,.75));transform:translateX(${j}px);`;
  }
  // typed headline in the display font. hl = word indexes on a brand selection block
  function type(lt,at,text,{x=70,y=300,w=W-140,size=110,cps=34,hl=[],align='left',color='#fff',hlColor='var(--brand)',weight=600,lh=1.04,caretOn=true,until=null}={}){
    if(lt<at) return '';
    const n=Math.floor((lt-at)*cps), typing=n<text.length;
    const cr=caretOn&&(typing||until==null||lt<until)?caret(lt,typing):'';
    // hidden chars keep the final layout stable; the caret sits right after the last visible char
    let c=0;
    const words=text.split(' ').map((wd,wi)=>{
      const vis=c<n;
      const chars=[...wd].map(ch=>{const i=c++;return `<span style="${i<n?'':'visibility:hidden'}">${esc(ch)}</span>${typing&&i===n-1?cr:''}`}).join('');
      c++;
      const h=hl.includes(wi)&&vis?`background:${hlColor};box-shadow:.1em 0 0 ${hlColor},-.1em 0 0 ${hlColor};border-radius:.08em;color:#fff`:'';
      const sp=hl.includes(wi)&&hl.includes(wi+1)&&c<=n?`<span style="background:${hlColor}"> </span>`:' ';
      return `<span style="white-space:nowrap;${h}">${typing&&n===0&&wi===0?cr:''}${chars}</span>`+(wi<text.split(' ').length-1?sp:'');
    }).join('');
    const op=until!=null?1-lin(lt,until,until+.12):1;
    return `<div class="abs dv-d" style="left:${x}px;top:${y}px;width:${w}px;font-size:${size}px;font-weight:${weight};line-height:${lh};letter-spacing:-.025em;text-align:${align};color:${color};opacity:${op};text-shadow:0 6px 30px rgba(0,0,0,.45)">${words}${typing?'':cr}</div>`;
  }
  // spoken-line caption that types in fast. Use: o.caps.map(c=>DEV.caption(lt,c))
  function caption(lt,c,{y=1360,size=82,align='center',x=70,w=W-140}={}){
    const [s,e,text,o]=c; if(lt<s||lt>=e) return '';
    const cps=Math.max(38,text.length/Math.max(.25,(e-s)*.45));
    return type(lt,s,text,{x,y:o.y&&o.y!==1400?o.y:y,w,size:o.size&&o.size!==84?o.size:size,cps,hl:o.hl,align,until:e-.12,caretOn:true});
  }
  // small mono label, e.g. a `// comment` or a file path
  function label(lt,at,text,{x=70,y=200,size=32,color='var(--mut)',align='left',w=W-140}={}){
    if(lt<at) return '';
    return `<div class="abs dv" style="left:${x}px;top:${y}px;width:${w}px;text-align:${align};font-size:${size}px;color:${color};opacity:${fade(lt,at,at+.2)}">${esc(typed(lt,at,text,60))}</div>`;
  }
  // scanline reveal of html at scene start (brand line sweeps down)
  function scan(lt,html,{at=0,d=.32,color='var(--brand)'}={}){
    const k=eo(lin(lt,at,at+d)); if(k>=1) return html;
    return `<div class="abs" style="inset:0;clip-path:inset(0 0 ${(1-k)*100}% 0)">${html}</div><div class="abs" style="left:0;right:0;top:${k*H-3}px;height:6px;background:${color};box-shadow:0 0 40px 10px ${mix(color,60)}"></div>`;
  }
  return {C,hi,sh,typed,caret,enter,bg,win,term,termEnd,code,diff,pr,checks,checksEnd,chips,stamp,cursor,glitch,type,caption,label,scan,ICON};
})();
