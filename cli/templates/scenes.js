// ---------- {{title}} ----------
// One LINES entry per line in script.md (same order). Captions pop word by word;
// hl = indices of highlighted words. Use caps:[...] with f:[from,to] to split a line.
const LINES=[
 {t:'Hook line that stops the scroll',hl:[3]},
 {t:'The problem, in their words',hl:[1]},
 {t:'The turn: what changes',hl:[3]},
 {t:'Proof or demo in one sentence',hl:[0]},
 {t:'',nocap:true},
];
// Scene renderers: S.name(lt, t, o) -> html. lt = seconds since scene start,
// o.l = this scene's line windows [[start,end]], o.caps = captions, o.dur, o.M = kw marks.
const S={
 title(lt,t,o){
  const [l]=o.l, p=pop(lt,l[0],.3);
  let h=bg(t)+flash(lt,'var(--brand)',.12);
  h+=`<div class="abs" style="left:80px;right:80px;top:520px;text-align:center;transform:scale(${(.4+.6*p)*punch(lt,.08)});opacity:${clamp(p*3)}">
   <div style="font-weight:900;font-size:150px;letter-spacing:-5px;line-height:.95;color:var(--brand)">${esc(o.big||VK.brand.name)}</div></div>`;
  return h+o.caps.map(c=>caption(lt,c[0],c[1],c[2],{...c[3],y:1250})).join('');
 },
 point(lt,t,o){
  const [l]=o.l;
  let h=bg(t);
  h+=sticker(lt,l[0]+.1,o.tag||'',{y:260,rot:o.rot??-4,bg:'var(--ink)',fg:'#fff'});
  if(o.emoji) { const p=pop(lt,l[0]+.2,.35); h+=`<div class="abs" style="left:0;right:0;top:560px;text-align:center;font-size:360px;transform:scale(${.3+.7*p}) rotate(${(1-p)*-20}deg);opacity:${clamp(p*3)}">${o.emoji}</div>`; }
  return h+o.caps.map(c=>caption(lt,c[0],c[1],c[2],{...c[3],y:1150})).join('');
 },
 cta(lt,t,o){
  const [l]=o.l, hp=pop(lt,l[0]-.05,.3);
  let h=bg(t,'brand')+flash(lt,'#fff',.1);
  h+=`<div class="abs display" style="left:0;right:0;top:640px;text-align:center;color:#fff;transform:scale(${.4+.6*hp});opacity:${clamp(hp*3)}">
   <div style="font-size:150px;font-weight:900;letter-spacing:-4px">${esc(VK.brand.name)}</div>
   <div style="font:800 56px var(--font);margin-top:30px;opacity:.9">${esc(o.sub||'')}</div></div>`;
  h+=`<div class="abs" style="left:0;right:0;top:${1500+14*Math.sin(lt*8)}px;text-align:center;font:900 110px var(--font);color:#fff;opacity:${fade(lt,l[0]+.4,l[0]+.7)}">↓</div>`;
  return h;
 },
};
// Scenes -> line ranges. sfx: {pop|ok|skip|impact|dm|price|cta: o => [times relative to scene]}
// The first "impact" drives the music drop. frac(o,[.5]) = time at 50% of the scene's first line.
const SPEC=[
 ['title',[0,0],{big:'Hook',sfx:{pop:o=>frac(o,[0])}}],
 ['point',[1,1],{tag:'The problem',emoji:'😩',sfx:{pop:o=>frac(o,[.1]),impact:o=>frac(o,[.9])}}],
 ['point',[2,2],{tag:'The turn',emoji:'✨',rot:4,sfx:{ok:o=>frac(o,[.3])}}],
 ['point',[3,3],{tag:'Proof',emoji:'✅',sfx:{ok:o=>frac(o,[.3])}}],
 ['cta',[4,4],{sub:'your-site.com',sfx:{cta:o=>frac(o,[.3])}}],
];
