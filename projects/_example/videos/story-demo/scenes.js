// ---------- Loopa · storytelling demo (style: story) ----------
const LINES=[
 {t:'Maya downloaded her fifth habit app on a rainy Sunday.',hl:[4]},
 {t:'By Wednesday, she had forgotten it existed.',hl:[4]},
 {caps:[{t:'Then one morning, a text.',f:[0,.4]},{t:'',f:[.4,1]}]},
 {t:'She replied yes. And the next day. And the next.',hl:[2]},
 {t:'',nocap:true},
];
const sub=(lt,o)=>o.caps.filter(c=>c[2]).map(c=>STORY.subtitle(lt,c)).join('');
const S={
 rain(lt,t,o){
  let h=STORY.photo('story-rain',lt,o.dur,{from:[1.12,0,-2],to:[1.02,0,2],dark:.25});
  h+=STORY.leak(t,{color:'120,150,255',strength:.18});
  h+=STORY.chapter(lt,.3,{kicker:'Chapter one',title:'The fifth app',y:520});
  h+=STORY.stamp(lt,1.2,'SUNDAY · 11:48 PM',{y:260});
  return h+STORY.vignette(.6)+STORY.letterbox(lt)+sub(lt,o)+STORY.dip(lt,{d:.8});
 },
 coffee(lt,t,o){
  let h=STORY.photo('story-coffee',lt,o.dur,{from:[1.05,2,0],to:[1.2,-2,-2],dark:.2,filter:'saturate(.6)'});
  h+=STORY.stamp(lt,.4,'WEDNESDAY',{y:260});
  return h+STORY.vignette(.6)+STORY.letterbox(lt,{d:.01})+sub(lt,o);
 },
 text(lt,t,o){
  const [l]=o.l, d=l[1]-l[0];
  let h=`<div class="abs" style="inset:0;background:#0b0b10"></div>`+STORY.leak(t,{strength:.25});
  // incoming message bubble
  const at=l[0]+d*.4, p=pop(lt,at,.35);
  if(lt>=at) h+=`<div class="abs" style="left:120px;right:120px;top:760px;transform:scale(${.6+.4*p});opacity:${clamp(p*3)}">
   <div style="font:600 34px var(--font);color:rgba(255,255,255,.55);margin-bottom:18px;letter-spacing:.06em">LOOPA · 7:02 AM</div>
   <div style="display:inline-block;background:#fff;color:#111;border-radius:48px 48px 48px 14px;padding:40px 48px;font:600 64px var(--font);line-height:1.2">Did you drink water today? 💧</div></div>`;
  return h+STORY.letterbox(lt,{d:.01})+sub(lt,o)+STORY.dip(lt,{d:.4});
 },
 sunrise(lt,t,o){
  let h=STORY.photo('story-sunrise',lt,o.dur,{from:[1.02,0,3],to:[1.18,0,-3],dark:.1});
  h+=STORY.leak(t,{strength:.35});
  const [l]=o.l, d=l[1]-l[0];
  ['Day 1','Day 2','Day 3'].forEach((x,i)=>h+=STORY.stamp(lt,l[0]+d*(i*.33),`${x} ✓`,{y:230+i*70,cps:30}));
  return h+STORY.vignette(.5)+STORY.letterbox(lt,{d:.01})+sub(lt,o)+STORY.dipOut(lt,o.dur,{d:.35});
 },
 end(lt,t,o){
  const [l]=o.l;
  let h=`<div class="abs" style="inset:0;background:#000"></div>`;
  return h+STORY.end(lt,l[0],{title:'Loopa',sub:'Habits that check in.'})+STORY.dip(lt,{d:.5});
 },
};
const SPEC=[
 ['rain',[0,0],{}],
 ['coffee',[1,1],{sfx:{camera:o=>[.2]}}],
 ['text',[2,2],{sfx:{dm:o=>frac(o,[.4])}}],
 ['sunrise',[3,3],{sfx:{ok:o=>frac(o,[0,.33,.66])}}],
 ['end',[4,4],{}],
];
