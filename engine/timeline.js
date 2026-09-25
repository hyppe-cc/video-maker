// ---------- video-kit timeline ----------
// Scene files define:
//   S     {name(lt, t, o) -> html}   scene renderers (lt = time since scene start)
//   LINES [{t, hl, caps:[{t,hl,f:[from,to],y,size,red}], nocap}]  one per voice line
//   SPEC  [[sceneName, [firstLine,lastLine], opts]]  opts.sfx = {event: o => [times]}
// Cues (from cues.json): L = [[start,end]] per line, D = total duration, kw = named marks.
let TL=[], EV={};
function build(L,D){
  TL=[];EV={cut:[],ok:[],skip:[],pop:[],impact:[],dm:[],price:[],cta:[]};
  const starts=SPEC.map(([,[f]],i)=>i===0?0:Math.max(0,L[f][0]-.12));
  SPEC.forEach(([name,[f,l],opts={}],i)=>{
    const a=starts[i], b=i+1<SPEC.length?starts[i+1]:D;
    const lr=[];for(let k=f;k<=l;k++) lr.push([L[k][0]-a,L[k][1]-a]);
    const caps=[];
    for(let k=f;k<=l;k++){
      const [s,e]=[L[k][0]-a,L[k][1]-a], nxt=(k+1<L.length?L[k+1][0]:D)-a;
      const parts=LINES[k].caps||[{t:LINES[k].t,hl:LINES[k].hl||[]}];
      parts.forEach((p,j)=>{
        const f0=p.f?p.f[0]:j/parts.length, f1=p.f?p.f[1]:(j+1)/parts.length;
        const cs=s+(e-s)*f0, ce=j===parts.length-1?Math.min(e+.35,nxt-.02,b-a):s+(e-s)*f1;
        if(!LINES[k].nocap) caps.push([Math.max(0,cs-.05),ce,p.t,{y:p.y||opts.capY||1400,hl:p.hl||[],size:p.size||opts.capSize||84,red:p.red||[]}]);
      });
    }
    const M={};for(const [k,v] of Object.entries(window.MK||{})) M[k]=v-a;
    const o={...opts,l:lr,caps,dur:b-a,M};
    TL.push([name,a,b,o]);
    EV.cut.push(a);
    if(opts.sfx) for(const [k,fn] of Object.entries(opts.sfx)) for(const x of fn(o)) (EV[k]||=[]).push(a+x);
  });
}
window.setCues=function(L,D,mk){window.MK=mk&&!Array.isArray(mk)?mk:{};window.DUR=D;build(L,D)};
window.events=function(){return EV};
// scene list for the preview UI: [{name, start, end}]
window.scenes=function(){return TL.map(([name,a,b])=>({name,start:a,end:b}))};
window.render=function(t){
  let sc=TL[TL.length-1];
  for(const s of TL){if(t>=s[1]&&t<s[2]){sc=s;break}}
  const [name,a,,o]=sc;
  if(!S[name]) { $.innerHTML=`<div class="cap" style="top:${H/2-60}px;color:var(--red)">missing scene: ${esc(name)}</div>`; return; }
  let h=S[name](t-a,t,o);
  h=h.replace(/(\p{Extended_Pictographic})️?/gu,(m,e)=>`<img src="node_modules/@twemoji/svg/${e.codePointAt(0).toString(16)}.svg" style="height:1em;width:1em;vertical-align:-0.12em;margin:0 .06em">`);
  $.innerHTML=h+grain(t);
};
window.warm=function(){ $.innerHTML=`<div class="display">${esc(VK.brand.name||'')}</div><div>${STR.warm||''}</div>`; };
window.setLight=function(on){window.LIGHT=!!on;document.body.classList.toggle('light',!!on)};
