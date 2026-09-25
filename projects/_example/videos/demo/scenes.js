// ---------- Loopa demo: habits that check in ----------
const LINES=[
 {t:'You downloaded a habit app too?',hl:[3,4]},
 {caps:[{t:'Day three...',hl:[1],f:[0,.35]},{t:'you forgot it even existed.',hl:[2],f:[.35,1]}]},
 {caps:[{t:'Loopa texts you instead.',hl:[0],f:[0,.5]},{t:'Just reply yes or no.',hl:[2,4],f:[.5,1]}]},
 {t:'No streaks. No guilt. Just a nudge.',red:[1,3],hl:[6]},
 {t:'',nocap:true},
];
const S={
 // a grid of abandoned app icons, one lights up
 hook(lt,t,o){
  const [l]=o.l;
  const icons=['🏃','💧','📚','🧘','🥗','😴','💪','✍️','🎸'];
  let h=bg(t)+`<div class="abs" style="left:150px;right:150px;top:330px;display:grid;grid-template-columns:repeat(3,1fr);gap:50px;transform:scale(${punch(lt,.1,.25)})">`;
  icons.forEach((e,i)=>{const p=pop(lt,l[0]+i*.06,.25);const on=i===4;
   h+=`<div style="aspect-ratio:1;border-radius:56px;background:${on?'var(--brand)':'#fff'};box-shadow:0 20px 50px ${mix('var(--brand)',on?40:12)};display:flex;align-items:center;justify-content:center;font-size:120px;transform:scale(${.3+.7*p});opacity:${clamp(p*3)}">${e}</div>`});
  h+='</div>';
  return h+o.caps.map(c=>caption(lt,c[0],c[1],c[2],{...c[3],y:1300})).join('');
 },
 // the app icon fades and gathers dust
 forgot(lt,t,o){
  const [l]=o.l, d=l[1]-l[0], gone=lin(lt,l[0]+d*.4,l[0]+d*.9);
  let h=bg(t);
  h+=sticker(lt,l[0]+.05,'Day 3',{y:220,rot:-4,bg:'var(--ink)',fg:'#fff'});
  h+=`<div class="abs" style="left:0;right:0;top:520px;display:flex;justify-content:center"><div style="width:360px;height:360px;border-radius:90px;background:#fff;box-shadow:0 30px 80px rgba(0,0,0,.12);display:flex;align-items:center;justify-content:center;font-size:200px;filter:grayscale(${gone});opacity:${1-.7*gone};transform:${shake(lt,l[0]+d*.9,l[0]+d*.9+.4)} rotate(${-8*gone}deg)">🥗</div></div>`;
  return h+o.caps.map(c=>caption(lt,c[0],c[1],c[2],{...c[3],y:1150})).join('');
 },
 // SMS thread: question, reply, check
 sms(lt,t,o){
  const [l]=o.l, d=l[1]-l[0], at=f=>l[0]+d*f;
  const bubble=(txt,me,when)=>{if(lt<when)return '';const p=pop(lt,when,.25);
   return `<div style="display:flex;justify-content:${me?'flex-end':'flex-start'};margin:22px 0;transform:scale(${.4+.6*p});transform-origin:${me?'right':'left'} center;opacity:${clamp(p*3)}"><div style="max-width:620px;padding:28px 36px;border-radius:44px;font:700 50px var(--font);${me?'background:var(--brand);color:#fff;border-bottom-right-radius:12px':'background:#fff;color:var(--ink);border-bottom-left-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.08)'}">${txt}</div></div>`};
  let h=bg(t)+flash(lt,'var(--brand)',.12);
  h+=`<div class="abs" style="left:90px;right:90px;top:300px">
   <div style="text-align:center;font:800 34px var(--font);color:var(--mut);margin-bottom:20px">Loopa · SMS</div>
   ${bubble('Did you eat something green today? 🥗',false,at(.05))}
   ${bubble('yes',true,at(.62))}
   ${bubble('Nice. See you tomorrow ✓',false,at(.85))}</div>`;
  return h+o.caps.map(c=>caption(lt,c[0],c[1],c[2],{...c[3],y:1250})).join('');
 },
 nope(lt,t,o){
  const [l]=o.l, M=o.M, s=M.streak??l[0];
  let h=bg(t)+`<div class="abs" style="inset:0;transform:${shake(lt,s+.1,s+.4)}">`;
  h+=sticker(lt,s,'🔥 0 day streak',{y:420,rot:-6,bg:'#fff',fg:'var(--red)',size:80});
  const x=pop(lt,s+.45,.25);
  if(lt>s+.45) h+=`<div class="abs" style="left:0;right:0;top:330px;text-align:center;font:900 300px var(--font);color:var(--red);transform:scale(${.3+.7*x});opacity:${clamp(x*3)}">✕</div>`;
  h+='</div>';
  return h+o.caps.map(c=>caption(lt,c[0],c[1],c[2],{...c[3],y:1150})).join('');
 },
 cta(lt,t,o){
  const [l]=o.l, hp=pop(lt,l[0]-.05,.3);
  let h=bg(t,'brand')+flash(lt,'#fff',.1);
  h+=`<div class="abs display" style="left:0;right:0;top:600px;text-align:center;color:#fff;transform:scale(${(.4+.6*hp)*punch(lt,.06)});opacity:${clamp(hp*3)}">
   <div style="font-size:200px;font-weight:900;letter-spacing:-8px">Loopa</div>
   <div style="font:800 60px var(--font);margin-top:10px;opacity:.95">Habits that check in.</div>
   <div style="display:inline-block;margin-top:60px;background:#fff;color:var(--brand);font:900 54px var(--font);padding:24px 48px;border-radius:999px">loopa.example/start</div></div>`;
  h+=`<div class="abs" style="left:0;right:0;top:${1500+14*Math.sin(lt*8)}px;text-align:center;font:900 110px var(--font);color:#fff;opacity:${fade(lt,l[0]+.6,l[0]+.9)}">↓</div>`;
  return h;
 },
};
const SPEC=[
 ['hook',[0,0],{sfx:{pop:o=>frac(o,[0,.05,.1,.15,.2])}}],
 ['forgot',[1,1],{sfx:{impact:o=>frac(o,[.9])}}],
 ['sms',[2,2],{sfx:{pop:o=>frac(o,[.05]),dm:o=>frac(o,[.62]),ok:o=>frac(o,[.85])}}],
 ['nope',[3,3],{sfx:{skip:o=>[o.M.streak??0].map(x=>x+.45)}}],
 ['cta',[4,4],{sfx:{cta:o=>frac(o,[0])}}],
];
