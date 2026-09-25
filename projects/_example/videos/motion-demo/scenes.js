// ---------- Loopa · motion graphics demo (style: motion) ----------
const LINES=[
 {t:'',nocap:true},
 {t:'',nocap:true},
 {t:'',nocap:true},
 {t:'',nocap:true},
 {t:'',nocap:true},
];
const S={
 // giant counter "3 days" with masked headline
 three(lt,t,o){
  const [l]=o.l;
  let h=MOTION.bg('ink')+MOTION.grid(t)+MOTION.shapes(t,{n:6,alpha:.5});
  h+=MOTION.words(lt,l[0],'Most habit apps lose you in',{y:330,size:104,color:'#fff'});
  h+=MOTION.counter(lt,l[0]+.9,3,{from:30,d:1.2,y:640,size:520,suffix:' days',color:'var(--brand2)'});
  h+=MOTION.bar(lt,l[0]+1.6,{x:90,y:1230,w:900,h:22,color:'var(--brand)'});
  return h;
 },
 // retention bar chart
 chart(lt,t,o){
  const [l]=o.l;
  let h=MOTION.bg('paper')+MOTION.reveal(lt,{color:'var(--brand)',dir:'up'});
  h+=`<div style="color:var(--ink)">`+MOTION.words(lt,l[0]+.1,'80% quit in week one',{y:300,size:120,hl:[0],hlColor:'var(--brand)'});
  h+=MOTION.bars(lt,l[0]+.6,[{label:'Day 1',value:100},{label:'Day 3',value:42},{label:'Day 7',value:20,color:'var(--red)'}],{y:720,suffix:'%'});
  h+='</div>';
  return h;
 },
 // brand panel flips the story
 flip(lt,t,o){
  const [l]=o.l, d=l[1]-l[0];
  let h=MOTION.bg('brand')+MOTION.shapes(t,{n:8,colors:['rgba(255,255,255,.18)','var(--brand2)','rgba(0,0,0,.12)']});
  h+=MOTION.words(lt,l[0],'Loopa flips it.',{y:520,size:150,color:'#fff'});
  h+=MOTION.words(lt,l[0]+d*.45,'It checks in with you.',{y:900,size:118,color:'var(--ink)',hl:[1,2],hlColor:'#fff'});
  h+=MOTION.reveal(lt,{color:'var(--ink)',dir:'left'});
  return h;
 },
 // three beats + marquee
 beats(lt,t,o){
  const [l]=o.l, d=l[1]-l[0];
  let h=MOTION.bg('ink');
  h+=MOTION.marquee(t,'NO STREAKS · NO GUILT',{y:1420,size:190,outline:true,color:'rgba(255,255,255,.25)'});
  ['Two taps.','No streaks.','No guilt.'].forEach((w,i)=>{
   const at=l[0]+d*(i/3);
   h+=MOTION.words(lt,at,w,{y:430+i*240,size:150,color:i===0?'var(--brand2)':'#fff',by:'char',stagger:.025,d:.35});
  });
  h+=MOTION.reveal(lt,{color:'var(--brand)',dir:'down'});
  return h;
 },
 end(lt,t,o){
  const [l]=o.l;
  let h=MOTION.bg('brand')+MOTION.shapes(t,{n:5,colors:['rgba(255,255,255,.2)']});
  h+=MOTION.circleIn(lt,l[0]-.1,MOTION.bg('ink')+MOTION.words(lt,l[0]+.2,'Loopa',{y:640,size:260,align:'center',x:0,w:W,color:'#fff'})+MOTION.words(lt,l[0]+.6,'Habits that check in.',{y:960,size:80,align:'center',x:0,w:W,color:'var(--brand2)'}),{y:1000});
  return h;
 },
};
const SPEC=[
 ['three',[0,0],{sfx:{pop:o=>frac(o,[.3])}}],
 ['chart',[1,1],{sfx:{swipe:o=>[0],impact:o=>frac(o,[.4]),pop:o=>frac(o,[.3,.4,.5])}}],
 ['flip',[2,2],{sfx:{swipe:o=>[0],ok:o=>frac(o,[.5])}}],
 ['beats',[3,3],{sfx:{swipe:o=>[0],pop:o=>frac(o,[0,.33,.66])}}],
 ['end',[4,4],{sfx:{cta:o=>frac(o,[.2])}}],
];
