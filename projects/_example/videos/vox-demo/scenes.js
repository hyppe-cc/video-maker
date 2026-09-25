// ---------- Loopa · explainer demo (style: vox) ----------
const LINES=[
 {t:'',nocap:true},
 {t:'Most new apps are abandoned within a week.',hl:[4,6,7]},
 {caps:[{t:"The problem isn't willpower.",hl:[4],f:[0,.45]},{t:"It's that the app waits for you.",hl:[4,5],f:[.45,1]}]},
 {t:'Loopa checks in by text, so the habit comes to you.',hl:[3,4]},
 {t:'',nocap:true},
];
const cap=(lt,o,y)=>o.caps.map(c=>VOX.caption(lt,c,{y})).join('');
const S={
 question(lt,t,o){
  const [l]=o.l;
  let h=VOX.paper(t);
  h+=VOX.title(lt,l[0],`Why do habit apps ${VOX.mark(lt,l[0]+.7,'fail?')}`,{kicker:'Explainer · 01',y:620,size:140});
  h+=VOX.underline(lt,l[0]+1.1,{x:95,y:1080,w:420});
  return h;
 },
 clipping(lt,t,o){
  const [l]=o.l;
  let h=VOX.paper(t);
  h+=VOX.clipping(lt,l[0],{headline:'Most new apps are abandoned within a week',source:'Example Research Journal',date:'Mar 2019',body:'Researchers followed thousands of new installs. Usage fell sharply after the first days, and by day seven most people had stopped opening the app at all. Reminders helped a little; conversation helped more.',y:300,rot:-2});
  h+=VOX.circle(lt,l[0]+(l[1]-l[0])*.6,{x:560,y:640,w:760,h:190,seed:3});
  h+=VOX.source('Example Research Journal (fictional, for the demo)');
  return h+cap(lt,o,1380);
 },
 screen(lt,t,o){
  const [l]=o.l, d=l[1]-l[0];
  let h=VOX.paper(t);
  h+=screen('real-app-screen',lt,{x:380,y:200,w:500,rot:-3,scroll:[0,.25,l[0]+d*.5,l[1]]});
  h+=VOX.label(lt,l[0]+d*.45,'the app waits…',{x:640,y:520,rot:3});
  h+=VOX.arrow(lt,l[0]+d*.55,{from:[760,590],to:[560,760],curve:-.3});
  return h+cap(lt,o,1380);
 },
 timeline(lt,t,o){
  const [l]=o.l, d=l[1]-l[0];
  let h=VOX.paper(t);
  h+=VOX.title(lt,l[0],'Loopa texts you first',{kicker:'The fix',y:300,size:96});
  const active=lt<l[0]+d*.5?-1:3;
  h+=VOX.timeline(lt,l[0]+.2,[{label:'Day 1',sub:'✓ yes'},{label:'Day 3',sub:'✓ yes'},{label:'Day 7',sub:'✓ yes'},{label:'Day 30',sub:'still going'}],{y:900,active});
  h+=VOX.pin(lt,l[0]+d*.6,{x:W-110,y:660,label:'habit sticks'});
  return h+cap(lt,o,1380);
 },
 end(lt,t,o){
  const [l]=o.l;
  let h=VOX.paper(t,{dark:true});
  h+=VOX.title(lt,l[0],`Loopa. ${VOX.mark(lt,l[0]+.6,'Habits that check in.',{color:'#ffe45c',fg:'#1b1a17'})}`,{kicker:'loopa.example/start',y:720,size:120,color:'#f2ede3',align:'center'});
  return h;
 },
};
const SPEC=[
 ['question',[0,0],{sfx:{pop:o=>frac(o,[.4])}}],
 ['clipping',[1,1],{sfx:{camera:o=>[.1],swipe:o=>frac(o,[.6])}}],
 ['screen',[2,2],{sfx:{swipe:o=>frac(o,[.55])}}],
 ['timeline',[3,3],{sfx:{pop:o=>[.5,.85,1.2,1.55].map(x=>x+o.l[0][0])}}],
 ['end',[4,4],{sfx:{cta:o=>frac(o,[.2])}}],
];
