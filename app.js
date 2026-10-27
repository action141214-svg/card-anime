/* ===== Card Duel – app.js (เมนู / เซฟ / สอนเล่น / ด่าน / กาชา) ===== */
const RARITY={R:'#7aa2ff',S:'#ff6b6b',SR:'#ff7ad9',SSR:'#4de6c8',UR:'#ff8a3d',USR:'#ffd34d',LTD:'#c27bff'};
const MAX_TEAM=4;
/* ตู้กาชา: สุ่มได้ทุกใบรวมถึงตัวซ้ำ (น้ำหนัก = % ที่ออก) — ปรับทีหลังได้ */
const GACHA={cost:100,cost10:900,
  /* การ์ดที่สุ่มได้ในตู้ (LTD ยังไม่เปิดให้สุ่ม — ซาสึเกะจะหาวิธีได้รับภายหลัง) */
  pool:['goku','zenitsu','yuji','naruto','sasukekid','gekko','ino','ichigo','kirito','megumi','gil','kurapika'],
  /* เรทออก % : base = ปกติ, up = ตอนเป็นการ์ดเรทอัป (การ์ด R ที่เหลือแบ่งเท่าๆ กัน) */
  rates:{base:{kirito:15,ichigo:15,megumi:5,gil:2,kurapika:0.1},up:{kirito:30,ichigo:30,megumi:10,gil:5,kurapika:0.5}},
  dup:{R:20,S:40,SR:55,SSR:70,UR:90,USR:130,LTD:180},
  /* ตู้เดียว เรทอัปเปลี่ยนทุก 1 ชั่วโมง (เวลาไทย) วนตามลำดับนี้: c = การ์ดตรงกลาง, s = การ์ดข้างๆ (เรทปกติ) */
  rotation:[{c:'kurapika',s:['yuji','kirito']},{c:'gil',s:['zenitsu','kirito']},{c:'kirito',s:['goku','gil']},
            {c:'kurapika',s:['yuji','gil']},{c:'gil',s:['goku','kirito']},{c:'kirito',s:['zenitsu','kurapika']},
            {c:'megumi',s:['zenitsu','gil']},{c:'megumi',s:['yuji','kurapika']},
            {c:'ichigo',s:['zenitsu','kirito']},{c:'ichigo',s:['yuji','gil']}]};
const TH_OFFSET=7*3600000,HOUR=3600000;
const slotNow=()=>Math.floor((Date.now()+TH_OFFSET)/HOUR)%GACHA.rotation.length;
const thClock=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
/* ===== อีเว้นท์ฮาโลวีน (แก้เวลาจบ / เรท / ด่านได้ที่นี่) ===== */
const HW={end:Date.UTC(2026,10,1)-7*3600000,   /* จบเที่ยงคืนวันที่ 1 พ.ย. 2026 (เวลาไทย) */
  pool:['hutao','luffy','gengar','alucard','isaac','okarun'],   /* การ์ดอีเว้นท์ (ออกจากตู้ฮาโลวีน + หมุนเป็นบอสรายวัน) */
  rates:{base:{},up:{}},   /* (ไม่ใช้แล้ว — เรทตู้ฮาโลวีนคำนวณจาก eventRate / upShare ด้านล่าง) */
  rPool:Object.keys(CARDS).filter(id=>CARDS[id].rar==='R'),   /* การ์ดระดับ R ที่อยู่ในตู้ */
  eventRate:1,   /* % รวมของการ์ดอีเว้นท์ (ที่เหลือ = การ์ด R แบ่งเท่าๆ กัน) */
  upShare:.5,    /* สัดส่วนของ eventRate ที่การ์ดหน้าตู้ได้ (0.5 = ครึ่งหนึ่ง · 1/6 = ทุกใบเท่ากัน) */
  pity:1000,     /* การันตีการ์ดหน้าตู้ที่การสุ่มครั้งที่ ... (นับตั้งแต่ได้การ์ดอีเว้นท์ครั้งล่าสุด) */
  cost:100,cost10:900,   /* ราคาสุ่มเป็นลูกอม 🍬 */
  stages:[]};
const hwOpen=()=>Date.now()<HW.end;
const hwLeft=()=>{const l=Math.max(0,HW.end-Date.now()),d=Math.floor(l/864e5),h=Math.floor(l%864e5/36e5),m=Math.floor(l%36e5/6e4);return d+' วัน '+h+' ชม. '+m+' นาที'};
let gMode='main',sMode='main';   /* โหมดตู้กาชา / หน้าเลือกด่าน: main = ปกติ, hw = ฮาโลวีน */
const gcfg=()=>gMode==='hw'?{pool:[...HW.rPool,...HW.pool],rates:HW.rates}:{pool:GACHA.pool,rates:GACHA.rates};
/* ตู้ฮาโลวีนใช้ลูกอม 🍬 / ตู้ปกติใช้เงิน 💰 */
const gcost=n=>gMode==='hw'?(n===1?HW.cost:HW.cost10):(n===1?GACHA.cost:GACHA.cost10);
const gbal=()=>gMode==='hw'?SV.candy:SV.coins;
const gico=()=>gMode==='hw'?'🍬':'💰';
const stageList=()=>sMode==='hw'?HW.stages:STAGES;
const sGo=()=>sMode==='hw'?'hwstages':'stages';
const inPool=id=>GACHA.pool.includes(id);
const lockTxt=id=>CARDS[id].evo?'ได้จากการอีโว (เควสพัฒนา)':HW.pool.includes(id)?'ได้จากตู้ฮาโลวีน (อีเว้นท์)':inPool(id)?(HW.rPool.includes(id)?'ได้จากตู้กาชา / ตู้ฮาโลวีน':'ได้จากตู้กาชา'):'ยังไม่เปิดให้ได้รับ';   // เงินคืนเมื่อได้การ์ดซ้ำ แยกตามระดับ
/* ด่าน: first = รางวัลชนะครั้งแรก, repeat = รางวัลเล่นซ้ำ */
const STAGES=[
  {id:1,name:'ด่าน 1 · บททดสอบแรก',enemy:['goku'],elv:[1],first:{coins:150,exp:100},repeat:{coins:30,exp:20}},
  {id:2,name:'ด่าน 2 · สายฟ้ากับดาบดำ',enemy:['zenitsu','kirito'],elv:[3,3],first:{coins:300,exp:200},repeat:{coins:60,exp:40}},
  {id:3,name:'ด่าน 3 · สี่ยอดนักสู้',enemy:['naruto','goku','yuji','zenitsu'],elv:[5,5,5,5],first:{coins:500,exp:350},repeat:{coins:100,exp:70}}
];
let KEY='cardduel_save_v1';   /* ออนไลน์: เปลี่ยนเป็นคีย์ของไอดีที่ล็อคอิน (online.js) */
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
let SV;

/* ---------- เซฟ ---------- */
function fresh(){return{v:1,coins:300,exp:0,curve:2,owned:[],count:{},lv:{},lvClaimed:{},raid:{slot:null,boss:0,hp:null,used:0,dealt:0,claimed:{}},chal:{slot:null,cleared:{}},autoSell:false,team:[],cleared:{},started:false,candy:0,ev:{day:null,hp:null,dealt:0,runs:0,candy:0},evg:{pity:0},items:{},evoQ:{},star:{}}}
function load(){try{SV=JSON.parse(localStorage.getItem(KEY))}catch(e){SV=null}if(!SV||SV.v!==1)SV=fresh();SV.count=SV.count||{};SV.lv=SV.lv||{};SV.lvClaimed=SV.lvClaimed||{};SV.raid=SV.raid||{slot:null,boss:0,hp:null,used:0,dealt:0,claimed:{}};SV.chal=SV.chal||{slot:null,cleared:{}};SV.owned.forEach(id=>{SV.count[id]=SV.count[id]||1});SV.autoSell=!!SV.autoSell;SV.auto=SV.auto||'off';SV.candy=SV.candy||0;SV.ev=SV.ev||{day:null,hp:null,dealt:0,runs:0,candy:0};SV.evg=SV.evg||{pity:0};SV.items=SV.items||{};SV.evoQ=SV.evoQ||{};SV.star=SV.star||{};
  if(SV.curve!==2){SV.exp=0;SV.curve=2;save()}   /* สูตร EXP ใหม่: รีเซ็ตเลเวลผู้เล่นเป็น Lv.1 (เงิน การ์ด และด่านที่ผ่านยังอยู่) */
}
function save(){try{SV.savedAt=Date.now();localStorage.setItem(KEY,JSON.stringify(SV))}catch(e){}if(window.Online)Online.onSave()}
/* เลเวลผู้เล่น: EXP ที่ต้องใช้อัปเลเวลถัดไปเพิ่มขึ้นเรื่อยๆ (Lv.1→2 = 100, Lv.10→11 ≈ 236, Lv.30→31 ≈ 1,586) */
const needExp=l=>Math.round(100*Math.pow(1.1,l-1));
function lvInfo(exp){let l=1,e=exp;while(e>=needExp(l)){e-=needExp(l);l++}return{lv:l,cur:e,need:needExp(l)}}
const lvOf=x=>lvInfo(x).lv;
/* รางวัลเลเวลผู้เล่น: ทุกๆ 5 เลเวล (Lv.5, 10, … 100) ได้เงิน = 100 × (เลเวล ÷ 5), Lv.50 ได้ซาสึเกะ (LTD) เพิ่ม */
const LVR_STEP=5,LVR_MAX=100;
const LVR_LIST=Array.from({length:LVR_MAX/LVR_STEP},(_,i)=>(i+1)*LVR_STEP);
const lvReward=l=>l===50?{coins:500,card:'sasuke'}:{coins:100*(l/LVR_STEP)};
const lvrReady=()=>LVR_LIST.filter(l=>lvOf(SV.exp)>=l&&!SV.lvClaimed[l]);
const clv=id=>SV.lv[id]||1;
const cstar=id=>Math.min(STAR_MAX,Math.max(1,SV.star[id]||1));
const starTxt=n=>'★'.repeat(n)+'☆'.repeat(STAR_MAX-n);
const starCost=id=>STAR_COST[cstar(id)-1];
const cardStat=id=>{const s=statAt(id,clv(id),cstar(id));return 'Lv.'+clv(id)+' · '+cstar(id)+'★ · POWER '+s.p+' · HP '+s.hp};
/* ราคาอัปเลเวล: เริ่ม 20 เงิน เพิ่ม ~4.5% ต่อเลเวล คูณตามระดับการ์ด */
const UP_RM={R:1,S:1.5,SR:1.75,SSR:2,UR:2.25,USR:2.5,LTD:3};
/* เรียงการ์ดตามระดับ จากน้อยไปมาก (R > S > SR > SSR > UR > USR > LTD) */
const SORTED=Object.keys(CARDS).sort((x,y)=>rIdx(CARDS[x].rar)-rIdx(CARDS[y].rar));
const upCost=id=>Math.round(20*Math.pow(1.045,clv(id)-1)*UP_RM[CARDS[id].rar]);
function upPlan(id,n){let l=clv(id),c=0,k=0;while(k<n&&l<LV_MAX){c+=Math.round(20*Math.pow(1.045,l-1)*UP_RM[CARDS[id].rar]);l++;k++}return{k,c}}
function upAffordable(id,n){let l=clv(id),c=0,k=0;while(k<n&&l<LV_MAX){const x=Math.round(20*Math.pow(1.045,l-1)*UP_RM[CARDS[id].rar]);if(c+x>SV.coins)break;c+=x;l++;k++}return{k,c}}
const refund=id=>GACHA.dup[CARDS[id].rar];
const extra=id=>Math.max(0,(SV.count[id]||0)-1);
const rarTag=id=>`<i class="rar" style="--r:${RARITY[CARDS[id].rar]}">${CARDS[id].rar}</i>`;

/* ---------- ทั่วไป ---------- */
let toastT;
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>e.classList.remove('on'),2200)}
function modal(html){$('#mdlBody').innerHTML=html;$('#mdl').classList.remove('hidden');return $('#mdlBody')}
function closeModal(){$('#mdl').classList.add('hidden');$('#mdlBody').innerHTML=''}
function hud(){
  $$('.coinN').forEach(e=>e.textContent=SV.coins.toLocaleString());
  $$('.candyN').forEach(e=>e.textContent=(SV.candy||0).toLocaleString());
  const l=$('#lvN');if(l){const rd=lvrReady().length,dt=$('#lvrDot');if(dt){dt.classList.toggle('hidden',!rd);dt.textContent=rd}
    const li=lvInfo(SV.exp);l.textContent='Lv.'+li.lv;$('#xpFill').style.width=(li.cur/li.need*100)+'%';$('#xpTxt').textContent=li.cur+' / '+li.need+' EXP'}
}
function fan(el,ids){const n=ids.length;el.innerHTML=ids.map((id,i)=>`<img src="${CARDS[id].img}" alt="${CARDS[id].name}" style="--i:${i-(n-1)/2}">`).join('')}
function go(name){clearAuto();
  const m={play:'playScr',raid:'raidScr',chal:'chalScr',home:'homeScr',team:'teamScr',stages:'stagesScr',gacha:'gachaScr',inv:'invScr',up:'upScr',lvr:'lvrScr',event:'eventScr',hwstages:'stagesScr',hwgacha:'gachaScr',evboss:'evbossScr',evo:'evoScr',sell:'sellScr',online:'onlineScr',room:'roomScr',friends:'friendsScr',chat:'chatScr'};
  if(name==='up')upSel=null;if(name==='evo'){if(!evoKeep)evoSel=null;evoKeep=false}if(name==='stages')sMode='main';if(name==='hwstages')sMode='hw';if(name==='gacha')gMode='main';if(name==='hwgacha')gMode='hw';
  closeModal();show(m[name]);hud();
  ({evo:renderEvo,sell:renderSell,play:renderPlay,raid:renderRaid,chal:renderChal,home:renderHome,team:renderTeam,stages:renderStages,gacha:renderGacha,inv:renderInv,up:renderUp,lvr:renderLvr,event:renderEvent,hwstages:renderStages,hwgacha:renderGacha,evboss:renderEvBoss,online:()=>Online.hub(),room:()=>Online.room(),friends:()=>Online.friends(),chat:()=>Online.chat()})[name]();
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(b)go(b.dataset.go)});

/* ---------- หน้าแรก / หน้าหลัก ---------- */
fan($('#titleFan'),SORTED.filter(()=>1).map(id=>[Math.random(),id]).sort((a,b)=>a[0]-b[0]).slice(0,3).map(x=>x[1]).sort((a,b)=>SORTED.indexOf(a)-SORTED.indexOf(b)));   /* หน้าแรกโชว์ 3 การ์ดสุ่ม */
function enterGame(){
  if(SV.started){go('home');return}
  go('home');
  modal(`<h2>ยินดีต้อนรับ!</h2><p>ต้องการให้สอนวิธีเล่นก่อนไหม?</p><div class="two"><button id="tutYes">สอนเล่น</button><button class="sec" id="tutNo">ข้ามไปก่อน</button></div>`);
  $('#tutYes').onclick=()=>{SV.started=true;save();closeModal();tutorial(true)};
  $('#tutNo').onclick=()=>{SV.started=true;save();closeModal();gift()};
}
/* หน้าแรก: ถ้าตั้งค่าเซิร์ฟเวอร์ออนไลน์ไว้ ต้องล็อคอินก่อนเข้าเกม (ไม่ได้ตั้งค่า = เล่นออฟไลน์เหมือนเดิม) */
$('#titleScr').onclick=()=>{if(window.Online)Online.gate(enterGame);else enterGame()};
function renderHome(){
  const t=SV.team.filter(x=>SV.owned.includes(x));
  fan($('#heroes'),t);   /* ทีมว่าง = ไม่แสดงการ์ดเลย (ไม่บัง UI) */
  $('#teamSub').textContent='ทีม '+t.length+'/'+MAX_TEAM+' ใบ';
}
$('#howBtn').onclick=()=>tutorial(false);
/* ---------- โค้ดของขวัญ ---------- */
const GIFT_CODES={
  DEV:()=>{SV.coins=(SV.coins||0)+99999999;SV.candy=(SV.candy||0)+999999999;let n=0;
    Object.keys(CARDS).forEach(id=>{if(!SV.owned.includes(id)){SV.owned.push(id);SV.count[id]=1;n++}});
    return 'เงิน +99,999,999 · ลูกอม +999,999,999 · ปลดล็อคการ์ดใหม่ '+n+' ใบ'}
};
function codeModal(){
  modal(`<h2>🎁 ใส่โค้ดรับของขวัญ</h2><form class="auth" id="cdF"><input id="cdI" placeholder="พิมพ์โค้ดที่นี่" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="30"><p class="aerr" id="cdE"></p><p class="mute" id="cdOk"></p><div class="two"><button type="submit">รับของขวัญ</button><button type="button" class="sec" id="cdX">ปิด</button></div></form>`);
  $('#cdX').onclick=closeModal;
  $('#cdF').onsubmit=e=>{e.preventDefault();
    const c=$('#cdI').value.trim().toUpperCase(),f=GIFT_CODES[c];
    SV.codes=SV.codes||{};
    if(!c){$('#cdE').textContent='กรุณาพิมพ์โค้ด';return}
    if(!f){$('#cdE').textContent='โค้ดไม่ถูกต้อง';return}
    if(SV.codes[c]){$('#cdE').textContent='โค้ดนี้ใช้ไปแล้ว';return}
    SV.codes[c]=1;const msg=f();save();hud();
    if(typeof renderHome==='function')renderHome();
    $('#cdE').textContent='';$('#cdOk').textContent='✅ รับสำเร็จ: '+msg;$('#cdI').value='';toast('รับของขวัญสำเร็จ!')};
  setTimeout(()=>{const i=$('#cdI');if(i)i.focus()},50);
}
$('#codeBtn').onclick=codeModal;
$('#logoutBtn').onclick=()=>{if(window.Online)Online.logout()};
if($('#tuneOk'))$('#tuneOk').onclick=()=>{$('#tune').classList.add('hidden');if(!$('#teamScr').classList.contains('hidden'))renderTeam()};
$('#devMoney').onclick=()=>{SV.coins+=1000;save();hud();toast('เพิ่มเงิน +1,000 แล้ว')};
$('#devCandy').onclick=()=>{SV.candy+=1000;save();hud();toast('เพิ่มลูกอม +1,000 แล้ว')};
$('#devExp').onclick=()=>{SV.exp+=1000;save();hud();if(!$('#lvrScr').classList.contains('hidden'))renderLvr();toast('เพิ่ม EXP +1,000 แล้ว (Lv.'+lvOf(SV.exp)+')')};
$('#devReset').onclick=()=>{if(confirm('ลบเซฟทั้งหมดและเริ่มใหม่?')){try{localStorage.removeItem(KEY)}catch(e){}location.reload()}};

/* ---------- สอนเล่น (coach mark) ---------- */
const TUT=[
  {t:'ยินดีต้อนรับสู่ Card Duel',x:'เกมการ์ดต่อสู้แบบผลัดกันโจมตี การ์ดจะสู้กันเองอัตโนมัติ หน้าที่ของคุณคือจัดทีมและสะสมการ์ดให้แข็งแกร่ง'},
  {t:'กติกาการต่อสู้',x:'แต่ละฝั่งมีการ์ดได้สูงสุด 4 ใบ ใบหน้าสุดสู้ก่อน เมื่อ HP หมดการ์ดใบถัดไปจะลงสนาม ฝั่งไหนการ์ดหมดก่อนเป็นฝ่ายแพ้ และการ์ดแต่ละใบมีความสามารถไม่เหมือนกัน'},
  {sel:'.hud',t:'ระดับและเงิน',x:'ตรงนี้แสดงระดับ EXP และเงินของคุณ ได้จากการชนะด่าน'},
  {sel:'[data-go=play]',t:'เล่น',x:'เลือกโหมดต่อสู้: เล่นด่าน, ลงเรดรุมบอส หรือชาเลนจ์ภารกิจพิเศษ ชนะครั้งแรกจะได้รางวัลเยอะที่สุด เล่นซ้ำจะได้น้อยลง'},
  {sel:'[data-go=team]',t:'จัดทีม',x:'เลือกการ์ดที่มีลงทีมได้สูงสุด 4 ใบ ถ้ามีน้อยกว่า 4 ก็ใส่เท่าที่มี ลำดับซ้ายไปขวาคือลำดับการลงสนาม'},
  {sel:'[data-go=gacha]',t:'ตู้กาชา',x:'ใช้เงินสุ่มการ์ดใหม่ การ์ดที่ยังล็อกอยู่ต้องหาจากตู้นี้ ถ้าได้ซ้ำจะเก็บเข้าคลัง หรือตั้งให้ขายคืนเงินอัตโนมัติก็ได้'},
  {sel:'[data-go=up]',t:'อัพเกรด',x:'อัพเลเวลการ์ดด้วยเงิน (สูงสุด Lv.100) หรืออัพดาวด้วยการ์ดซ้ำ (สูงสุด 6 ดาว) เพิ่ม POWER และ HP ของการ์ดใบนั้น'},
  {sel:'[data-go=inv]',t:'คลังการ์ด',x:'ดูจำนวนการ์ดที่มี และขายใบที่ซ้ำเพื่อรับเงินคืน (เก็บไว้อย่างน้อย 1 ใบเสมอ)'},
  {t:'พร้อมแล้ว!',x:'เรามีการ์ดเริ่มต้นแจกให้ฟรี ไปรับกันเลย'}
];
function tutorial(withGift){
  closeModal();show('homeScr');renderHome();hud();
  let i=0;const c=document.createElement('div');c.className='coach';
  c.innerHTML='<div class="spot"></div><div class="tip"><h3></h3><p></p><div class="two"><button class="sec small" id="cSkip">ข้าม</button><button class="small" id="cNext">ถัดไป</button></div></div>';
  document.body.appendChild(c);
  const end=()=>{c.remove();window.removeEventListener('resize',draw);if(withGift)gift()};
  function draw(){
    const st=TUT[i],sp=$('.spot',c),tip=$('.tip',c);
    $('h3',c).textContent=st.t;$('p',c).textContent=st.x;$('#cNext').textContent=i===TUT.length-1?(withGift?'รับของขวัญ':'จบ'):'ถัดไป';
    const el=st.sel&&document.querySelector('#homeScr '+st.sel);
    if(el){const r=el.getBoundingClientRect(),pd=8;
      sp.style.cssText=`display:block;left:${r.left-pd}px;top:${r.top-pd}px;width:${r.width+pd*2}px;height:${r.height+pd*2}px`;
      const below=r.bottom+tip.offsetHeight+24<innerHeight;
      tip.style.cssText=`left:${Math.max(10,Math.min(innerWidth-tip.offsetWidth-10,r.left+r.width/2-tip.offsetWidth/2))}px;top:${below?r.bottom+16:Math.max(10,r.top-tip.offsetHeight-16)}px;transform:none`;
    }else{sp.style.display='none';tip.style.cssText='left:50%;top:50%;transform:translate(-50%,-50%)'}
  }
  window.addEventListener('resize',draw);
  $('#cNext').onclick=()=>{if(++i>=TUT.length)end();else draw()};
  $('#cSkip').onclick=end;draw();
}

/* ---------- แจกการ์ดเริ่มต้น ---------- */
function gift(){
  const ids=Object.keys(CARDS).filter(k=>CARDS[k].starter);
  ids.forEach(id=>{if(!SV.owned.includes(id))SV.owned.push(id);SV.count[id]=SV.count[id]||1});
  SV.team=SV.owned.slice(0,MAX_TEAM);save();
  modal(`<h2>ของขวัญต้อนรับ 🎁</h2><p>รับการ์ดเริ่มต้นฟรี ${ids.length} ใบ</p><div class="giftrow">${ids.map(id=>`<div class="gmini" style="--c:${CARDS[id].color}"><img src="${CARDS[id].img}" alt=""><b>${CARDS[id].name}</b></div>`).join('')}</div><p class="mute">การ์ดอื่นๆ ล็อกอยู่ ต้องสุ่มจากตู้กาชา · คุณมีเงินเริ่มต้น 💰 ${SV.coins}</p><button id="gOk">รับการ์ด</button>`);
  $('#gOk').onclick=()=>{closeModal();go('home');toast('ใส่การ์ดเข้าทีมให้แล้ว ลองไปเล่นด่าน 1 ได้เลย!')};
}

/* ---------- จัดทีม ---------- */
function renderTeam(){
  SV.team=SV.team.filter(x=>SV.owned.includes(x)).slice(0,MAX_TEAM);
  $('#tcount').textContent='ทีมของคุณ '+SV.team.length+' / '+MAX_TEAM;
  $('#tslots').innerHTML=Array.from({length:MAX_TEAM},(_,i)=>{const id=SV.team[i];
    return id?`<div class="tslot full" style="--c:${CARDS[id].color}"><img src="${CARDS[id].img}" alt=""><div><b>${i+1}. ${CARDS[id].name}</b><small>Lv.${clv(id)}</small><span><button class="sec mini" data-mv="${i},-1" aria-label="เลื่อนซ้าย">◀</button><button class="sec mini" data-mv="${i},1" aria-label="เลื่อนขวา">▶</button><button class="sec mini" data-rm="${i}">✕</button></span></div></div>`
      :`<div class="tslot"><span>ช่องว่าง</span></div>`}).join('');
  const g=$('#gallery');g.innerHTML='';g.className='cgrid';
  for(const id of SORTED){
    const c=CARDS[id],own=SV.owned.includes(id),pos=SV.team.indexOf(id),l=clv(id),s=statAt(id,l,cstar(id));
    const d=document.createElement('div');d.className='ctile'+(own?'':' locked')+(pos>=0?' sel':'');d.style.setProperty('--c',c.color);
    d.tabIndex=0;d.setAttribute('role','button');d.setAttribute('aria-label',c.name);
    d.innerHTML=`<div class="cimg"><img src="${c.img}" alt="${c.name}">${pos>=0?`<span class="tag">ลำดับ ${pos+1}</span>`:''}${own?'':`<span class="lockov">🔒<small>${lockTxt(id)}</small></span>`}<button class="ibtn" data-info="${id}" aria-label="ดูความสามารถของ ${c.name}">i</button></div>
      <div class="cinfo"><b>${c.name}</b><div class="cmeta">${rarTag(id)} <span>Lv.${l}</span>${own?` <em class="stars">${cstar(id)}★</em>`:''}${own&&SV.count[id]>1?` <em class="cnt">×${SV.count[id]}</em>`:''}</div><div class="cstat">POWER ${s.p} · HP ${s.hp}</div></div>`;
    const act=()=>{
      if(!own)return toast(HW.pool.includes(id)?'การ์ดนี้ได้จากตู้ฮาโลวีน (อีเว้นท์) เท่านั้น':inPool(id)?'การ์ดนี้ยังล็อกอยู่ ต้องสุ่มจากตู้กาชา'+(HW.rPool.includes(id)?' หรือตู้ฮาโลวีน':''):'การ์ดนี้ยังไม่เปิดให้ได้รับ (จะมีวิธีได้รับภายหลัง)');
      if(pos>=0)SV.team.splice(pos,1);else if(SV.team.length<MAX_TEAM)SV.team.push(id);else return toast('ทีมเต็ม '+MAX_TEAM+' ใบแล้ว');
      save();renderTeam()};
    d.onclick=e=>{if(e.target.closest('[data-info]')){e.stopPropagation();showInfo(id)}else act()};
    d.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&!e.target.closest('[data-info]')){e.preventDefault();act()}};
    g.appendChild(d);
  }
}
/* ปุ่ม i: ดูความสามารถของการ์ด */
const MORE={sasukecurse:['ทุกครั้งที่โจมตี ศัตรูจะติดสถานะ "ชาขั้นรุนแรง" (⚡) นาน 3 เทิร์น (ต่ออายุทุกครั้งที่โจมตี)','ต้นเทิร์นของศัตรู: ถูกไฟฟ้าช็อต เสีย HP 10% ของ HP สูงสุดของศัตรู 1 ครั้ง','และมีโอกาส 50% ที่ศัตรูจะโจมตีไม่ได้ในเทิร์นนั้น','ลบสถานะได้ด้วยนิ้วนางของคุราปิก้า (โอคารุนไม่ได้รับผล)'],sasukekid:['ทุกครั้งที่โจมตี ปล่อยคาถาเพลิง ลูกไฟสร้างความเสียหาย 20% ของ POWER ปัจจุบัน','ศัตรูติดสถานะ "เผาไหม้" (🔥) เสีย HP 10% ของ HP สูงสุดของศัตรู ต้นเทิร์นทุกเทิร์น นาน 3 เทิร์น','ลบสถานะได้ด้วยนิ้วนางของคุราปิก้า'],ino:['ทุกๆ 2 เทิร์นของอิโนะ (เทิร์นที่ 2, 4, 6 …) จะย้ายร่างศัตรู','ศัตรูที่ถูกย้ายร่างโจมตีตัวเอง เสีย HP 2 เท่าของ POWER ปัจจุบันของตัวมันเอง','ใช้หลังการโจมตีปกติ · ถูกผนึกความสามารถแล้วใช้ไม่ได้'],gekko:['เมื่อโจมตี จะสร้างสถานะ "เลือดไหล" และ "ติดพิษ" ใส่ศัตรู','แต่ละสถานะทำให้เสีย HP 10% ของ POWER ปัจจุบันของเก็กโค ต่อเทิร์น (ต้นเทิร์นของศัตรู)','ไม่ซ้อนทับ — โจมตีซ้ำเพียงอัปเดตดาเมจให้เท่ากับค่าสูงสุด · หายเมื่อถูกล้างสถานะ'],naruto:['เมื่อถูกกำจัดครั้งแรก จะเรียกร่างแยกลงสนามแทนทันที (ฟื้น HP เต็มตามสเตตัสร่างแยก)','ร่างแยกมี POWER และ HP ลดลง 10% ของสเตตัสทั้งหมด (ปรับได้ในหน้าปรับค่าทดลอง)','ร่างแยกถูกกำจัดแล้วไม่เรียกซ้ำอีก'],okarun:['มีโอกาส 30% หลบการโจมตี (รวมการโจมตีจากผู้ช่วยหรือความสามารถของศัตรู) หลบแล้วไม่โดนดาเมจ','ไม่ได้รับผลของสถานะด้านลบทุกชนิด (ชา ผนึก สายฟ้า เผาไหม้ เข้าสิง เลือดไหล ฯลฯ)','เมื่อโจมตีจะติดสัญลักษณ์เทอร์โบ (⚡) ทำให้การโจมตีครั้งถัดไปดาเมจเพิ่ม 30% ของ POWER ปัจจุบัน'],isaac:['ทุกครั้งที่โจมตีสุ่ม 1 ใน 3 รูปแบบ (ตั้งค่าโอกาสได้ในหน้าปรับค่าทดลอง ค่าเริ่มต้นประมาณ 1 ใน 3 เท่ากัน)','โจมตีปกติ: ดาเมจเท่า POWER','โจมตีเฉียดจุดตาย: ดาเมจ 2 เท่าของ POWER ปัจจุบัน','โจมตีจุดตาย: ศัตรูตายทันที'],alucard:['โจมตีได้ 2 ครั้งใน 1 เทิร์น (ครั้งที่ 2 ต่อจากครั้งแรกทันที)','เมื่อโจมตี ศัตรูติดสถานะ "เลือดไหล" (🩸) เสีย HP 5% ของ HP สูงสุดของศัตรู ต้นเทิร์นทุกเทิร์น จนกว่าจะถูกลบสถานะหรือตาย'],gengar:['เมื่อติดสถานะด้านลบ (ชา / ผนึก / สายฟ้า / สับสน / เผาไหม้ / เข้าสิง) จะล้างสถานะนั้นทันที','ทุกสถานะที่ล้างได้ เพิ่ม POWER ให้ตัวเอง 10% ของ POWER ปัจจุบัน'],luffy:['ทุกครั้งที่โจมตี ศัตรูจะติดสถานะ "เข้าสิง" (ป้าย 👻)','ในเทิร์นถัดไปของศัตรู มีโอกาส 50% ที่จะโจมตีตัวเอง (ดาเมจเท่า POWER ของตัวเอง) แทนการโจมตีปกติ','สถานะหมดลงเมื่อถึงเทิร์นของศัตรู ไม่ว่าจะโจมตีตัวเองหรือไม่'],hutao:['ทุกครั้งที่โจมตี เรียกผีเมาช่วยโจมตี สุ่ม 1 ใน 2 รูปแบบ (50%)','เผาไหม้: ติดสถานะเผาไหม้ เสีย HP ต้นเทิร์นของศัตรู 15% ของ HP สูงสุดของศัตรู นาน 3 เทิร์น','ผีตัวเล็ก: โจมตี 2 ครั้ง ครั้งละ 10% ของ POWER ปัจจุบัน'],ichigo:['ทุกๆ 2 เทิร์น การโจมตีครั้งถัดไป (ครั้งที่ 3, 6, 9 …) สร้างดาเมจ 3 เท่าของ POWER ปัจจุบัน','การ์ดจะมีป้าย "พลังสะสม ×3" เมื่อการโจมตีครั้งหน้าคือท่าไม้ตาย (เกตสึกะ เท็นโช)'],megumi:['สุนัข (Divine Dogs): สร้างดาเมจ 50% ของ POWER ปัจจุบัน','นกฮูก (Nue): มีโอกาส 50% ทำให้ศัตรูติดชาในเทิร์นนั้น','กบ (Toad): ลิ้นพันศัตรู ทำให้โจมตีได้อีกครั้ง','คชสาร (Max Elephant): สร้างดาเมจ 2 เท่าของ POWER ปัจจุบัน','กระต่าย (Rabbit Escape): มีโอกาส 50% ทำให้ศัตรูโจมตีไม่โดน','ทุกเทิร์นสุ่มเรียก 1 ตัว ตัวละ 20% เท่ากัน'],kurapika:['นิ้วโป้ง: ฟื้นฟู HP 10% ของ HP ทั้งหมด','นิ้วชี้: ขโมยความสามารถของการ์ดศัตรูมาใช้ในเทิร์นนั้น','นิ้วกลาง: ผนึกความสามารถของศัตรู (ใช้ไม่ได้ในเทิร์นของเขา)','นิ้วนาง: ลบสถานะด้านลบ','นิ้วก้อย: โจมตีซ้ำ ดาเมจ 2 เท่าของ POWER','ทุกครั้งที่โจมตีสุ่มนิ้วที่ใช้ นิ้วละ 20% เท่ากัน']};
function showInfo(id){
  const c=CARDS[id],own=SV.owned.includes(id),l=clv(id),s=statAt(id,l,cstar(id));
  modal(`<div class="info"><div class="iimg" style="--c:${c.color}"><img src="${c.img}" alt="${c.name}"></div><div class="itxt"><h2>${c.name} ${rarTag(id)}</h2>
    <div class="istat"><span>Lv.${l}</span>${own?`<span>${cstar(id)}★</span>`:''}<span>POWER ${s.p}</span><span>HP ${s.hp}</span></div>
    <h3>ความสามารถ</h3><p>${c.desc}</p>${MORE[id]?`<ul>${MORE[id].map(t=>`<li>${t}</li>`).join('')}</ul>`:''}
    ${own?'':`<p class="mute">🔒 ${lockTxt(id)}</p>`}<button id="iClose">ปิด</button></div></div>`);
  $('#iClose').onclick=closeModal;
}
$('#tslots').onclick=e=>{
  const m=e.target.closest('[data-mv]'),r=e.target.closest('[data-rm]');
  if(m){const[i,d]=m.dataset.mv.split(',').map(Number),j=i+d;if(j>=0&&j<SV.team.length){[SV.team[i],SV.team[j]]=[SV.team[j],SV.team[i]];save();renderTeam()}}
  if(r){SV.team.splice(+r.dataset.rm,1);save();renderTeam()}
};

/* ---------- ด่าน ---------- */
function renderStages(){
  const team=SV.team.filter(x=>SV.owned.includes(x));
  $('#stgTeam').innerHTML=team.length?team.map(id=>`<img class="th" src="${CARDS[id].img}" alt="${CARDS[id].name}" title="${CARDS[id].name}">`).join(''):'<small>ยังไม่มีการ์ดในทีม</small>';
  const L=stageList(),hw=sMode==='hw';$('#sTitle').textContent=hw?'ด่านอีเว้นท์ฮาโลวีน 🎃':'เลือกด่าน';$('#sBack').dataset.go=hw?'event':'play';
  $('#stgList').innerHTML=L.map((st,i)=>{
    const cleared=!!SV.cleared[st.id],open=(!hw||hwOpen())&&(i===0||SV.cleared[L[i-1].id]);
    return `<div class="stg${open?'':' off'}"><div class="sh"><h2>${st.name}</h2><span class="st${cleared?' ok':''}">${!open?(hw&&!hwOpen()?'⏱ อีเว้นท์จบแล้ว':'🔒 ผ่านด่านก่อนหน้าก่อน'):cleared?'✔ ผ่านแล้ว':'ยังไม่ผ่าน'}</span></div>
      <div class="en" style="--n:${st.enemy.length}">${st.enemy.map(id=>`<div class="gmini sm" style="--c:${CARDS[id].color}"><img src="${CARDS[id].img}" alt=""><b>${CARDS[id].name}</b><small>Lv.${st.elv[st.enemy.indexOf(id)]||1}</small></div>`).join('')}</div>
      <div class="rw"><div class="${cleared?'dim':'hot'}">ชนะครั้งแรก: 💰${st.first.coins} · EXP ${st.first.exp}${cleared?' (รับแล้ว)':''}</div><div>เล่นซ้ำ: 💰${st.repeat.coins} · EXP ${st.repeat.exp}</div></div>
      <button data-st="${st.id}" ${open?'':'disabled'}>เข้าด่าน</button></div>`}).join('');
}
$('#stgList').onclick=e=>{const b=e.target.closest('[data-st]');if(b)startStage(stageList().find(s=>s.id==b.dataset.st))};
function startStage(st){
  if(sMode==='hw'&&!hwOpen())return toast('อีเว้นท์จบแล้ว');
  const team=SV.team.filter(x=>SV.owned.includes(x));
  if(!team.length){toast('ต้องมีการ์ดในทีมอย่างน้อย 1 ใบ');return go('team')}
  clearAuto();setAutoBtn();Battle.start({auto:true,a:team,la:team.map(clv),sa:team.map(cstar),b:st.enemy,lb:st.elv,title:st.name,first:$('#first').value==='b'?'b':'a',
    onExit:()=>go(sGo()),onEnd:r=>finishStage(st,r)});
}
function finishStage(st,r){
  const L=stageList(),idx=L.indexOf(st),next=L[idx+1];
  if(!r.win){
    modal(`<h2>แพ้แล้ว…</h2><p>ลองปรับลำดับการ์ด หรือสุ่มการ์ดใหม่จากตู้กาชาแล้วกลับมาสู้อีกครั้ง</p>${SV.auto!=='off'?'<p class="mute">ออโต้หยุดเพราะแพ้ — จัดทีมหรือลองใหม่ได้เลย</p>':''}<div class="two"><button id="rAgain">ลองใหม่</button><button class="sec" id="rTeam">จัดทีม</button><button class="sec" id="rBack">กลับ</button></div>`);
    $('#rAgain').onclick=()=>{closeModal();startStage(st)};$('#rTeam').onclick=()=>go('team');$('#rBack').onclick=()=>go(sGo());return}
  const first=!SV.cleared[st.id],rw=first?st.first:st.repeat,lv0=lvOf(SV.exp),au=SV.auto!=='off',nxt=SV.auto==='next'&&next;
  SV.coins+=rw.coins;SV.exp+=rw.exp;SV.cleared[st.id]=true;save();
  const up=lvOf(SV.exp)>lv0;
  modal(`<h2>ชนะ! 🎉</h2><p>${first?'ผ่านด่านครั้งแรก — ได้รางวัลเต็ม!':'เล่นซ้ำ — รางวัลลดลง'} · ใช้ ${r.turns} เทิร์น</p>
    <div class="reward"><div>💰 +${rw.coins}</div><div>EXP +${rw.exp}</div></div>${up?`<p class="lvup">⬆ เลเวลอัป! Lv.${lvOf(SV.exp)}</p>`:''}${lvrReady().length?`<p class="lvup">🎁 มีรางวัลเลเวลรอรับ ${lvrReady().length} รายการ</p>`:''}${first&&next?`<p class="mute">ปลดล็อก ${next.name}</p>`:''}
    ${au?'<p class="mute" id="autoLine"></p>':''}<div class="two">${next?'<button id="rNext">ด่านถัดไป</button>':''}<button class="${next?'sec':''}" id="rAgain">เล่นอีกครั้ง</button>${au?'<button class="sec" id="autoStop">หยุดออโต้</button>':''}<button class="sec" id="rBack">กลับ</button></div>`);
  if(next)$('#rNext').onclick=()=>{closeModal();startStage(next)};
  $('#rAgain').onclick=()=>{closeModal();startStage(st)};$('#rBack').onclick=()=>go(sGo());
  if(au){$('#autoStop').onclick=autoStop;autoRun(nxt?'ไปด่านถัดไป':'เล่นอีกครั้ง',()=>startStage(nxt?next:st))}
}

/* ---------- ตู้กาชา (แบนเนอร์เรทอัป) ---------- */
let pulling=false,lastSlot=-1;
/* ตู้ฮาโลวีน: การ์ดหน้าตู้เปลี่ยนทุก 1 ชั่วโมง (เวลาไทย) วนตาม HW.pool */
const evBanner=()=>{const n=HW.pool.length,i=hourKey()%n;return{c:HW.pool[i],s:[HW.pool[(i+1)%n],HW.pool[(i+2)%n]]}};
const curB=()=>gMode==='hw'?evBanner():GACHA.rotation[slotNow()];
const curSlot=()=>gMode==='hw'?hourKey():slotNow();
/* เรทตู้ฮาโลวีน: การ์ด R แบ่งกัน (100 - eventRate)% · การ์ดอีเว้นท์รวม eventRate% โดยการ์ดหน้าตู้ได้ upShare ของก้อนนี้ */
function evRates(b){
  const r={},ep=HW.pool,tot=HW.eventRate,up=tot*HW.upShare,others=ep.filter(id=>id!==b.c);
  HW.rPool.forEach(id=>r[id]=(100-tot)/HW.rPool.length);
  ep.forEach(id=>r[id]=id===b.c?up:(tot-up)/(others.length||1));
  return r;
}
function bannerRates(b){
  if(gMode==='hw')return evRates(b);
  const{pool,rates:R}=gcfg(),r={};let used=0;
  pool.forEach(id=>{const v=id===b.c?R.up[id]:R.base[id];if(v!==undefined){r[id]=v;used+=v}});
  const rs=pool.filter(id=>r[id]===undefined);rs.forEach(id=>r[id]=(100-used)/rs.length);
  return r;
}
const pct=v=>+v.toFixed(v<1?2:1)+'%';
function updTimer(){
  if(gMode==='hw'){$('#bTimer').innerHTML=hwOpen()?`⏱ เปลี่ยนการ์ดหน้าตู้ใน <b>${hourLeft()}</b> · 🎃 อีเว้นท์เหลือเวลา <b>${hwLeft()}</b>`:'⏱ อีเว้นท์ฮาโลวีนจบแล้ว';return}
  const left=HOUR-((Date.now()+TH_OFFSET)%HOUR),m=Math.floor(left/60000),s=Math.floor(left%60000/1000);
  $('#bTimer').innerHTML=`⏱ เปลี่ยนการ์ดเรทอัปใน <b>${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}</b> · เวลาไทย ${thClock.format(Date.now())}`;
}
function renderGacha(){
  const hw=gMode==='hw';$('#gCandy').classList.toggle('hidden',!hw);$('#gachaScr').classList.toggle('hw',hw);$('#gTitle').textContent=hw?'ตู้สุ่มฮาโลวีน 🎃':'ตู้กาชา';$('#gBack').dataset.go=hw?'event':'home';$('#bRt').textContent=hw?'HALLOWEEN!!!':'RATE UP!!!';
  const b=curB(),r=bannerRates(b);lastSlot=curSlot();
  $('#bBoost').textContent=hw?'การ์ดฮาโลวีนสุดพิเศษ!':'การ์ดตรงกลาง เรทออกเพิ่มขึ้น!';
  $('#bCards').innerHTML=[b.s[0],b.c,b.s[1]].filter(Boolean).map(id=>{const main=id===b.c,c=CARDS[id],upd=main&&(hw||gcfg().rates.up[id]!==gcfg().rates.base[id]);
    return `<div class="bc${main?' main':''}" style="--c:${RARITY[c.rar]};--k:${main?1:.8}"><div class="bcimg"><img src="${c.img}" alt="${c.name}">${upd?'<span class="rib">เรทอัป ⬆</span>':''}${SV.owned.includes(id)?`<span class="own">มี ×${SV.count[id]}</span>`:''}</div><b>${c.name}</b><div>${rarTag(id)} <em>${pct(r[id])}</em>${upd&&!hw?` <small class="was">ปกติ ${pct(gcfg().rates.base[id])}</small>`:''}</div></div>`}).join('');
  $('#bDesc').textContent=hw?'ตู้พิเศษอีเว้นท์ฮาโลวีน! ใช้ลูกอม 🍬 สุ่ม · การ์ดอีเว้นท์รวม '+HW.eventRate+'% · การันตีที่ '+HW.pity+' ครั้ง (สุ่มมาแล้ว '+SV.evg.pity+'/'+HW.pity+') · แตะแบนเนอร์เพื่อดูเรททั้งหมด':'ใช้เงินสุ่มการ์ดใหม่! การ์ดตรงกลางมีโอกาสออกสูงกว่าปกติ · แตะแบนเนอร์เพื่อดูรายละเอียดและเรททั้งหมด';
  updTimer();
  $('#pullBtn').textContent='สุ่ม 1 ครั้ง · '+gico()+gcost(1);$('#pull10Btn').textContent='สุ่ม 10 ครั้ง · '+gico()+gcost(10);
  const off=hw&&!hwOpen();$('#pullBtn').disabled=pulling||off||gbal()<gcost(1);$('#pull10Btn').disabled=pulling||off||gbal()<gcost(10);
  $('#autoSell').checked=SV.autoSell;
}
function roll(){
  const b=curB(),hw=gMode==='hw';
  if(hw){const E=SV.evg;E.pity=(E.pity||0)+1;if(E.pity>=HW.pity){E.pity=0;return b.c}}   /* การันตี: ครบ HW.pity ครั้งได้การ์ดหน้าตู้ */
  const e=Object.entries(bannerRates(b)),tot=e.reduce((s,x)=>s+x[1],0);let x=Math.random()*tot,pick=e[0][0];
  for(const [id,w] of e){if((x-=w)<0){pick=id;break}}
  if(hw&&HW.pool.includes(pick))SV.evg.pity=0;
  return pick;
}
/* นาฬิกา: อัปเดตทุกวินาที และเปลี่ยนแบนเนอร์เมื่อครบชั่วโมง */
setInterval(()=>{
  if($('#gachaScr').classList.contains('hidden')||pulling)return;
  if(curSlot()!==lastSlot){renderGacha();toast(gMode==='hw'?'การ์ดหน้าตู้ฮาโลวีนเปลี่ยนแล้ว!':'การ์ดเรทอัปเปลี่ยนแล้ว!')}else updTimer();
},1000);
function grant(id){
  const dup=SV.owned.includes(id),back=GACHA.dup[CARDS[id].rar];let sold=false;
  if(!dup){SV.owned.push(id);SV.count[id]=1}else if(SV.autoSell){SV.coins+=back;sold=true}else SV.count[id]++;
  return{id,dup,sold,back};
}
function pull(n){
  const hw=gMode==='hw',cost=gcost(n);
  if(pulling)return;if(hw&&!hwOpen())return toast('อีเว้นท์จบแล้ว');if(gbal()<cost)return toast(hw?'ลูกอมไม่พอ':'เงินไม่พอ');
  if(hw)SV.candy-=cost;else SV.coins-=cost;const res=[];for(let i=0;i<n;i++)res.push(grant(roll()));save();hud();
  pulling=true;renderGacha();
  const box=$('#bbox'),im=$('.bc.main img'),ids=gcfg().pool;
  box.classList.add('shake');let k=0;const cyc=setInterval(()=>{im.src=CARDS[ids[k++%ids.length]].img},90);
  setTimeout(()=>{clearInterval(cyc);box.classList.remove('shake');pulling=false;renderGacha();showPull(res,n)},1000);
}
function showPull(res,n){
  const again=()=>{closeModal();pull(n)};
  if(n===1){
    const r=res[0],c=CARDS[r.id];
    modal(`<div class="reveal" style="--c:${RARITY[c.rar]}"><div class="glow"></div><img src="${c.img}" alt="${c.name}"></div><h2>${c.name} ${rarTag(r.id)}</h2><p>${r.dup?(r.sold?`ได้การ์ดซ้ำ — ขายอัตโนมัติ ได้เงินคืน 💰${r.back}`:`ได้การ์ดซ้ำ — เก็บเข้าคลังแล้ว (มี ×${SV.count[r.id]} ใบ)`):'<b class="new">NEW!</b> ปลดล็อกการ์ดใหม่แล้ว'}</p><div class="two"><button id="pAgain" ${gbal()<gcost(1)?'disabled':''}>สุ่มอีก (${gico()}${gcost(1)})</button><button class="sec" id="pClose">ปิด</button></div>`);
  }else{
    const back=res.filter(r=>r.sold).reduce((s,r)=>s+r.back,0),nw=res.filter(r=>!r.dup).length;
    modal(`<div class="wide"><h2>ผลการสุ่ม ×${n}</h2><div class="r10">${res.map(r=>{const c=CARDS[r.id];return `<div class="rt10" style="--c:${RARITY[c.rar]}"><img src="${c.img}" alt="${c.name}"><b>${c.name}</b><small>${r.dup?(r.sold?'+💰'+r.back:'เข้าคลัง'):'<span class="new">NEW!</span>'}</small></div>`}).join('')}</div><p>การ์ดใหม่ ${nw} ใบ${back?` · ขายซ้ำอัตโนมัติได้ 💰${back}`:''}${gMode==='hw'?` · การันตีการ์ดอีเว้นท์อีก ${HW.pity-SV.evg.pity} ครั้ง`:''}</p><div class="two"><button id="pAgain" ${gbal()<gcost(10)?'disabled':''}>สุ่ม ×10 อีก (${gico()}${gcost(10)})</button><button class="sec" id="pClose">ปิด</button></div></div>`);
  }
  $('#pAgain').onclick=again;$('#pClose').onclick=()=>{closeModal();renderGacha()};
}
function showRates(){
  const b=curB(),r=bannerRates(b);
  modal(`<div class="wide"><h2>รายละเอียดและเรท</h2><p>${gMode==='hw'?'':`เรทอัปตอนนี้: <b>${CARDS[b.c].name}</b> (${pct(gcfg().rates.base[b.c])} → ${pct(gcfg().rates.up[b.c])}) `}${gMode==='hw'?'ตู้ฮาโลวีน (เฉพาะช่วงอีเว้นท์) · ใช้ลูกอม 🍬 · การ์ดอีเว้นท์รวม '+HW.eventRate+'% (การ์ดหน้าตู้ '+pct(HW.eventRate*HW.upShare)+') · การันตีที่ '+HW.pity+' ครั้ง (สุ่มมาแล้ว '+SV.evg.pity+')':'เปลี่ยนทุก 1 ชั่วโมงตามเวลาไทย · การ์ดระดับ LTD ยังไม่เปิดให้สุ่ม'} · การ์ดซ้ำเก็บเข้าคลังหรือขายคืนเงิน (${Object.entries(GACHA.dup).map(([k,v])=>k+' 💰'+v).join(' · ')})</p>
    <div class="pool">${gcfg().pool.map(id=>`<div class="pt${SV.owned.includes(id)?'':' lk'}" style="--c:${CARDS[id].color}"><div class="pi"><img src="${CARDS[id].img}" alt="${CARDS[id].name}">${SV.owned.includes(id)?'':'<span>🔒</span>'}</div><b>${CARDS[id].name}</b><div>${rarTag(id)} <em>${pct(r[id])}${id===b.c?' ⬆':''}</em></div></div>`).join('')}</div><button id="rClose" style="margin-top:12px">ปิด</button></div>`);
  $('#rClose').onclick=closeModal;
}
$('#pullBtn').onclick=()=>pull(1);$('#pull10Btn').onclick=()=>pull(10);$('#rateBtn').onclick=showRates;
$('#bbox').onclick=showRates;$('#bbox').onkeydown=e=>{if(e.key==='Enter'||e.key===' ')showRates()};

/* ---------- เลือกโหมด / เรด / ชาเลนจ์ ---------- */
const RAID_ATTEMPTS=3,RAID_TURNS=30;
/* เรด: ms = รางวัลตามดาเมจสะสม (% ของ HP บอส) — ใส่บอสจริงทีหลังได้ที่นี่ */
const RAIDS=[
  {name:'เรดบอส I',card:'zenitsu',lv:10,maxHp:5000,ms:{25:{coins:150},50:{coins:300},75:{coins:450},100:{coins:800,exp:300}}},
  {name:'เรดบอส II',card:'kirito',lv:15,maxHp:8000,ms:{25:{coins:250},50:{coins:450},75:{coins:650},100:{coins:1200,exp:500}}},
  {name:'เรดบอส III',card:'gil',lv:20,maxHp:12000,ms:{25:{coins:400},50:{coins:700},75:{coins:1000},100:{coins:2000,exp:800}}}];
/* ชาเลนจ์: สุ่มชุดใหม่ทุกครั้งที่รีเซ็ต (ทุก 30 นาที) จากเลขรอบเวลา — ทุกคนเห็นชุดเดียวกัน 3 ภารกิจ: ง่าย / ปานกลาง / ยาก
   rule = { max: ใช้การ์ดได้กี่ใบ, rar: ระดับที่ใช้ได้, turns: ต้องชนะภายในกี่เทิร์น } */
const DIFFS=[
  {k:'easy',label:'ง่าย',star:1,n:1,elv:[3,6],pool:id=>rIdx(CARDS[id].rar)<=1,rules:[{},{turns:40},{max:2}],first:{coins:120,exp:80},repeat:{coins:30,exp:20}},
  {k:'mid',label:'ปานกลาง',star:2,n:2,elv:[8,14],pool:id=>!CARDS[id].evo,rules:[{max:1},{rar:['R']},{turns:30}],first:{coins:250,exp:160},repeat:{coins:60,exp:40}},
  {k:'hard',label:'ยาก',star:3,n:3,elv:[16,26],pool:id=>rIdx(CARDS[id].rar)>=1&&!CARDS[id].evo,rules:[{max:2},{rar:['R'],turns:34},{turns:24}],first:{coins:500,exp:320},repeat:{coins:120,exp:80}}];
const mulberry=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
let chCache={key:null,list:[]};
function chList(){
  const key=chalKey();if(chCache.key===key)return chCache.list;
  const rng=mulberry(key*7919+13),pk=arr=>arr[Math.floor(rng()*arr.length)];
  const list=DIFFS.map((d,i)=>{
    const pool=Object.keys(CARDS).filter(d.pool),en=[];
    while(en.length<Math.min(d.n,pool.length)){const c=pk(pool);if(!en.includes(c))en.push(c)}
    return{id:'c'+key+'_'+i,slot:key,diff:d,name:'ชาเลนจ์ '+(i+1),rule:pk(d.rules),enemy:en,elv:en.map(()=>d.elv[0]+Math.floor(rng()*(d.elv[1]-d.elv[0]+1))),first:d.first,repeat:d.repeat}});
  chCache={key,list};return list;
}
const ruleText=r=>[r.max?'ลงสนามได้ '+r.max+' ใบ':'',r.rar?'ใช้ได้เฉพาะระดับ '+r.rar.join('/'):'',r.turns?'ต้องชนะภายใน '+r.turns+' เทิร์น':''].filter(Boolean).join(' · ')||'ไม่มีเงื่อนไขพิเศษ';
/* เรดรีเซ็ตทุก 1 ชั่วโมง (สลับบอส HP เต็ม โอกาสเต็ม) / ชาเลนจ์รีเซ็ตทุก 30 นาที (ล้างสถานะผ่านแล้ว ได้รางวัลครั้งแรกอีกครั้ง) — นับตามเวลาไทย ตรงต้นชั่วโมง/ครึ่งชั่วโมง */
const CHAL_MS=30*60000;
const chalKey=()=>Math.floor((Date.now()+TH_OFFSET)/CHAL_MS);
const chalLeft=()=>{const l=CHAL_MS-((Date.now()+TH_OFFSET)%CHAL_MS),m=Math.floor(l/60000),s=Math.floor(l%60000/1000);return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')};
const hourKey=()=>Math.floor((Date.now()+TH_OFFSET)/HOUR);
const hourLeft=()=>{const l=HOUR-((Date.now()+TH_OFFSET)%HOUR),m=Math.floor(l/60000),s=Math.floor(l%60000/1000);return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')};
function raidState(){
  const R=SV.raid,slot=hourKey();
  if(R.slot!==slot){
    if(R.slot!=null){   /* จบรอบเรดเก่า: ส่งรางวัลที่ได้แต่ยังไม่รับให้อัตโนมัติ */
      const ob=RAIDS[R.boss%RAIDS.length],dp=ob?(ob.maxHp-(R.hp==null?ob.maxHp:R.hp))/ob.maxHp*100:0;let coins=0,exp=0;
      if(ob)Object.entries(ob.ms).forEach(([m,r])=>{if(dp>=m-1e-9&&!R.claimed[m]){coins+=r.coins||0;exp+=r.exp||0}});
      if(coins||exp){SV.coins+=coins;SV.exp+=exp;setTimeout(()=>{hud();toast('รอบเรดที่แล้วจบแล้ว ได้รับรางวัลอัตโนมัติ 💰'+coins+(exp?' · EXP '+exp:''))},0)}
    }
    R.slot=slot;R.boss=slot%RAIDS.length;R.hp=null;R.used=0;R.dealt=0;R.claimed={};save();
  }
  const b=RAIDS[R.boss];if(R.hp==null||R.hp>b.maxHp)R.hp=b.maxHp;return{R,b};
}
function chalState(){const C=SV.chal;if(C.slot!==chalKey()){C.slot=chalKey();C.cleared={};save()}return C}
function renderPlay(){
  const{R}=raidState();
  $('#mdStages').textContent='ผ่านแล้ว '+STAGES.filter(s=>SV.cleared[s.id]).length+'/'+STAGES.length+' ด่าน';
  $('#mdRaid').textContent='โอกาสชั่วโมงนี้ '+(RAID_ATTEMPTS-R.used)+'/'+RAID_ATTEMPTS+' · รีเซ็ต '+hourLeft();
  $('#mdChal').textContent='ผ่านแล้ว '+chList().filter(c=>chalState().cleared[c.id]).length+'/'+chList().length+' · รีเซ็ต '+chalLeft();
}
/* --- เรด --- */
const pctDealt=(R,b)=>(b.maxHp-R.hp)/b.maxHp*100;
function renderRaid(){
  const{R,b}=raidState(),c=CARDS[b.card],dead=R.hp<=0,team=SV.team.filter(x=>SV.owned.includes(x)),dp=pctDealt(R,b);
  $('#rbImg').src=c.img;$('#rbName').textContent=b.name+' · '+c.name+' Lv.'+b.lv;
  $('#rbFill').style.width=Math.max(0,R.hp/b.maxHp*100)+'%';
  $('#rbHp').textContent=dead?'บอสถูกกำจัดแล้ว!':'HP '+Math.ceil(R.hp).toLocaleString()+' / '+b.maxHp.toLocaleString();
  $('#rbDealt').textContent='ดาเมจที่ทำได้ '+Math.round(R.dealt).toLocaleString()+' ('+Math.min(100,Math.floor(dp))+'%)';
  $('#rbAtt').textContent='โอกาสชั่วโมงนี้ '+(RAID_ATTEMPTS-R.used)+'/'+RAID_ATTEMPTS+' · จำกัด '+RAID_TURNS+' เทิร์น/รอบ';
  updRaidTimer();
  $('#rbMs').innerHTML=Object.entries(b.ms).map(([m,r])=>{const ok=dp>=m-1e-9,got=!!R.claimed[m];
    return `<div class="ms${ok?' ok':''}${got?' got':''}"><b>${m}%</b><span>💰${r.coins}${r.exp?' · EXP '+r.exp:''}</span><button class="small${ok&&!got?'':' sec'}" data-ms="${m}" ${ok&&!got?'':'disabled'}>${got?'✔':ok?'รับ':'🔒'}</button></div>`}).join('');
  $('#rbTeam').innerHTML=team.length?team.map(id=>`<img class="th" src="${CARDS[id].img}" alt="${CARDS[id].name}">`).join(''):'<small>ยังไม่มีการ์ดในทีม</small>';
  $('#rbGo').textContent=dead?'บอสถูกกำจัดแล้ว — รอรอบหน้า':'โจมตีบอส';$('#rbGo').disabled=dead||R.used>=RAID_ATTEMPTS||!team.length;
}
function updRaidTimer(){const e=$('#rbReset');if(e)e.textContent='⏱ เรดรอบใหม่ (บอสใหม่ HP เต็ม) ใน '+hourLeft()+' · รางวัลที่ยังไม่รับจะได้อัตโนมัติ'}
function updChalTimer(){const e=$('#chInfo');if(e)e.textContent='⏱ ชาเลนจ์รีเซ็ตทุก 30 นาที · เหลือ '+chalLeft()+' · รีเซ็ตแล้วรับรางวัลครั้งแรกได้อีกครั้ง'}
/* นาฬิกา: อัปเดตทุกวินาที และรีเฟรชหน้าเมื่อข้ามชั่วโมง */
let lastHour=hourKey(),lastChal=chalKey();
setInterval(()=>{
  const vis=id=>!$('#'+id).classList.contains('hidden'),h=hourKey(),c=chalKey();
  if(vis('raidScr'))updRaidTimer();if(vis('chalScr'))updChalTimer();if(vis('playScr'))renderPlay();
  if(h!==lastHour){lastHour=h;
    if(vis('raidScr')){renderRaid();toast('เริ่มรอบเรดใหม่แล้ว!')}
    else if(vis('playScr'))toast('เรดรีเซ็ตแล้ว บอสใหม่มาแล้ว!')}
  if(c!==lastChal){lastChal=c;
    if(vis('chalScr')){renderChal();toast('ชาเลนจ์รีเซ็ตแล้ว!')}
    else if(vis('playScr'))toast('ชาเลนจ์รีเซ็ตแล้ว!')}
},1000);
function giveRw(rw){const lv0=lvOf(SV.exp);SV.coins+=rw.coins||0;SV.exp+=rw.exp||0;save();hud();return lvOf(SV.exp)>lv0}
function claimMs(list){
  const{R,b}=raidState(),dp=pctDealt(R,b);let coins=0,exp=0;
  list.forEach(m=>{if(R.claimed[m]||dp<m-1e-9)return;const r=b.ms[m];R.claimed[m]=true;coins+=r.coins||0;exp+=r.exp||0});
  if(!coins&&!exp)return;giveRw({coins,exp});renderRaid();toast('รับรางวัลเรด 💰'+coins+(exp?' · EXP '+exp:''));
}
$('#rbMs').onclick=e=>{const b=e.target.closest('[data-ms]');if(b)claimMs([b.dataset.ms])};
$('#rbGo').onclick=startRaid;
function startRaid(){
  const{R,b}=raidState(),team=SV.team.filter(x=>SV.owned.includes(x));
  if(R.hp<=0)return toast('บอสถูกกำจัดแล้ว รอรอบเรดใหม่');
  if(R.used>=RAID_ATTEMPTS)return toast('โอกาสชั่วโมงนี้หมดแล้ว รอรอบใหม่');
  if(!team.length){toast('ต้องมีการ์ดในทีมอย่างน้อย 1 ใบ');return go('team')}
  R.used++;save();const s0=R.slot;
  Battle.start({a:team,la:team.map(clv),sa:team.map(cstar),b:[b.card],lb:[b.lv],bossHp:{max:b.maxHp,cur:R.hp},maxTurns:RAID_TURNS,title:b.name,first:'a',
    onExit:()=>go('raid'),onEnd:r=>finishRaid(r,s0)});
}
function finishRaid(r,s0){
  const{R,b}=raidState();
  if(R.slot!==s0){modal('<h2>รอบเรดเปลี่ยนแล้ว</h2><p>ครบชั่วโมงระหว่างต่อสู้ ดาเมจรอบนี้จึงไม่ถูกนับ บอสใหม่ปรากฏตัวแล้ว!</p><button id="rBack">ไปหน้าเรด</button>');$('#rBack').onclick=()=>go('raid');return}
  const dmg=Math.max(0,R.hp-r.bossHp);R.hp=r.bossHp;R.dealt+=dmg;save();
  const dead=R.hp<=0,left=RAID_ATTEMPTS-R.used;
  modal(`<h2>${dead?'กำจัดบอสสำเร็จ! 🎉':'จบรอบเรด'}</h2><p>รอบนี้สร้างดาเมจ <b>${Math.round(dmg).toLocaleString()}</b>${dead?'':' · บอสเหลือ HP '+Math.ceil(R.hp).toLocaleString()}${r.timeout?' (หมดเวลา)':''}</p><p class="mute">รางวัลตามดาเมจรับได้ที่หน้าเรด (ถ้าไม่รับ จะได้อัตโนมัติเมื่อครบรอบ) · โอกาสเหลือ ${left}/${RAID_ATTEMPTS}</p><div class="two">${!dead&&left>0?'<button id="rAgain">ลงเรดอีกรอบ</button>':''}<button class="sec" id="rBack">ไปหน้าเรด</button></div>`);
  if($('#rAgain'))$('#rAgain').onclick=()=>{closeModal();startRaid()};
  $('#rBack').onclick=()=>go('raid');
}
$('#devRaid').onclick=()=>{const{R}=raidState();R.used=0;R.hp=null;R.dealt=0;R.claimed={};SV.chal.cleared={};SV.ev.day=null;save();if(!$('#raidScr').classList.contains('hidden'))renderRaid();if(!$('#chalScr').classList.contains('hidden'))renderChal();toast('รีเซ็ตเรดและชาเลนจ์แล้ว')};
/* --- ชาเลนจ์ --- */
function renderChal(){
  const CS=chalState();updChalTimer();
  $('#chalList').innerHTML=chList().map(c=>{const cl=!!CS.cleared[c.id],d=c.diff;
    return `<div class="stg d-${d.k}"><div class="sh"><h2>${c.name} <span class="diff d-${d.k}">${'★'.repeat(d.star)}${'☆'.repeat(3-d.star)} ${d.label}</span></h2><span class="st${cl?' ok':''}">${cl?'✔ ผ่านแล้ว':'ยังไม่ผ่าน'}</span></div>
      <div class="rule">⚠ ${ruleText(c.rule)}</div>
      <div class="en" style="--n:${c.enemy.length}">${c.enemy.map((id,i)=>`<div class="gmini sm" style="--c:${CARDS[id].color}"><img src="${CARDS[id].img}" alt=""><b>${CARDS[id].name}</b><small>Lv.${c.elv[i]||1}</small></div>`).join('')}</div>
      <div class="rw"><div class="${cl?'dim':'hot'}">ชนะครั้งแรกของรอบ: 💰${c.first.coins} · EXP ${c.first.exp}${cl?' (รับแล้ว)':''}</div><div>เล่นซ้ำ: 💰${c.repeat.coins} · EXP ${c.repeat.exp}</div></div>
      <button data-ch="${c.id}">ท้าทาย</button></div>`}).join('');
}
$('#chalList').onclick=e=>{const b=e.target.closest('[data-ch]');if(b)openPicker(chList().find(c=>c.id===b.dataset.ch))};
function openPicker(ch){
  const maxN=ch.rule.max||MAX_TEAM,ok=SORTED.filter(id=>SV.owned.includes(id)&&(!ch.rule.rar||ch.rule.rar.includes(CARDS[id].rar)));
  let sel=SV.team.filter(id=>ok.includes(id)).slice(0,maxN);
  if(!ok.length){modal(`<h2>${ch.name}</h2><p>เงื่อนไข: ${ruleText(ch.rule)}</p><p class="mute">คุณยังไม่มีการ์ดที่เข้าเงื่อนไข</p><button id="pkX">ปิด</button>`);$('#pkX').onclick=closeModal;return}
  const draw=()=>{
    modal(`<div class="wide"><h2>${ch.name} <span class="diff d-${ch.diff.k}">${ch.diff.label}</span></h2><p>เงื่อนไข: ${ruleText(ch.rule)}</p><div class="pick">${ok.map(id=>{const i=sel.indexOf(id);return `<button class="pk${i>=0?' on':''}" data-pk="${id}" style="--c:${CARDS[id].color}"><img src="${CARDS[id].img}" alt="${CARDS[id].name}">${i>=0?`<i class="pn">${i+1}</i>`:''}<b>${CARDS[id].name}</b><small>Lv.${clv(id)}</small></button>`}).join('')}</div>
      <p class="mute">เลือกแล้ว ${sel.length}/${maxN} ใบ · ลำดับที่เลือก = ลำดับลงสนาม</p><div class="two"><button id="pkGo" ${sel.length?'':'disabled'}>เริ่มต่อสู้</button><button class="sec" id="pkX">ยกเลิก</button></div></div>`);
    $('#pkX').onclick=closeModal;
    $('#pkGo').onclick=()=>{closeModal();startChal(ch,sel.slice())};
    $$('[data-pk]').forEach(b=>b.onclick=()=>{const id=b.dataset.pk,i=sel.indexOf(id);if(i>=0)sel.splice(i,1);else if(sel.length<maxN)sel.push(id);else if(maxN===1)sel=[id];else toast('เลือกได้สูงสุด '+maxN+' ใบ');draw()});
  };
  draw();
}
function startChal(ch,ids){
  Battle.start({a:ids,la:ids.map(clv),sa:ids.map(cstar),b:ch.enemy,lb:ch.elv,maxTurns:ch.rule.turns,title:ch.name,first:'a',
    onExit:()=>go('chal'),onEnd:r=>finishChal(ch,ids,r)});
}
function finishChal(ch,ids,r){
  if(!r.win){
    modal(`<h2>ชาเลนจ์ไม่สำเร็จ…</h2><p>${r.timeout?'หมดเวลาก่อนชนะ':'การ์ดของคุณพ่ายแพ้'} · เงื่อนไข: ${ruleText(ch.rule)}</p><div class="two"><button id="rAgain">ลองใหม่</button><button class="sec" id="rBack">กลับ</button></div>`);
    $('#rAgain').onclick=()=>{closeModal();startChal(ch,ids)};$('#rBack').onclick=()=>go('chal');return}
  const CS=chalState(),live=ch.slot===chalKey(),first=live&&!CS.cleared[ch.id],rw=first?ch.first:ch.repeat;if(live)CS.cleared[ch.id]=true;save();const up=giveRw(rw);
  modal(`<h2>ผ่านชาเลนจ์! 🏆</h2><p>${first?'ผ่านครั้งแรกของรอบนี้ — ได้รางวัลเต็ม!':live?'เล่นซ้ำในรอบนี้ — รางวัลลดลง':'ชาเลนจ์หมดรอบแล้ว — ได้รางวัลเล่นซ้ำ'} · ใช้ ${r.turns} เทิร์น</p><div class="reward"><div>💰 +${rw.coins}</div><div>EXP +${rw.exp}</div></div>${up?`<p class="lvup">⬆ เลเวลอัป! Lv.${lvOf(SV.exp)}</p>`:''}${lvrReady().length?`<p class="lvup">🎁 มีรางวัลเลเวลรอรับ ${lvrReady().length} รายการ</p>`:''}<div class="two"><button id="rAgain">ท้าทายอีกครั้ง</button><button class="sec" id="rBack">กลับ</button></div>`);
  $('#rAgain').onclick=()=>{closeModal();startChal(ch,ids)};$('#rBack').onclick=()=>go('chal');
}

/* ---------- รางวัลเลเวลผู้เล่น ---------- */
function renderLvr(){
  const L=lvOf(SV.exp),ready=lvrReady();
  $('#lvrNow').textContent='เลเวลของคุณ Lv.'+L+' · รางวัลทุกๆ '+LVR_STEP+' เลเวล';
  $('#lvrAll').textContent=ready.length?'รับทั้งหมด ('+ready.length+')':'ไม่มีรางวัลที่รับได้';$('#lvrAll').disabled=!ready.length;
  $('#lvrList').innerHTML=LVR_LIST.map(l=>{
    const r=lvReward(l),got=!!SV.lvClaimed[l],can=!got&&L>=l,sp=!!r.card;
    return `<div class="rtile${sp?' special':''}${got?' got':''}${can?' can':''}"><div class="rthumb">${sp?`<img src="${CARDS[r.card].img}" alt="${CARDS[r.card].name}">`:'💰'}</div>
      <b class="rl">Lv.${l}</b><div class="rr">${r.coins.toLocaleString()} เหรียญ${sp?`<br><span class="rcard">+ ${CARDS[r.card].name} ${rarTag(r.card)}</span>`:''}</div>
      <button class="small${can?'':' sec'}" data-claim="${l}" ${can?'':'disabled'}>${got?'✔ รับแล้ว':can?'รับรางวัล':'🔒 ถึง Lv.'+l}</button></div>`}).join('');
}
function claimLv(list){
  let coins=0;const cards=[];
  list.forEach(l=>{if(SV.lvClaimed[l]||lvOf(SV.exp)<l)return;const r=lvReward(l);SV.lvClaimed[l]=true;SV.coins+=r.coins;coins+=r.coins;
    if(r.card){if(SV.owned.includes(r.card))SV.count[r.card]=(SV.count[r.card]||1)+1;else{SV.owned.push(r.card);SV.count[r.card]=1}cards.push(r.card)}});
  if(!coins&&!cards.length)return;
  save();hud();renderLvr();
  if(cards.length){const c=CARDS[cards[0]];
    modal(`<h2>รางวัลเลเวล 🎉</h2><div class="reveal" style="--c:${RARITY[c.rar]}"><div class="glow"></div><img src="${c.img}" alt="${c.name}"></div><h2>${c.name} ${rarTag(cards[0])}</h2><p>ได้รับการ์ดใหม่ + 💰${coins.toLocaleString()}</p><button id="rwOk">ตกลง</button>`);
    $('#rwOk').onclick=closeModal}
  else toast('รับรางวัลเลเวล 💰'+coins.toLocaleString()+' แล้ว');
}
$('#lvrList').onclick=e=>{const b=e.target.closest('[data-claim]');if(b)claimLv([+b.dataset.claim])};
$('#lvrAll').onclick=()=>claimLv(lvrReady());

/* ---------- อัปเลเวลการ์ด ---------- */
/* หน้าเปล่า → แตะช่องเพื่อเลือกการ์ด → แสดงการ์ดใบเดียว + ปุ่มอัป (แตะการ์ดอีกครั้งเพื่อเปลี่ยนใบ) */
let upSel=null;
/* ออโต้: off = ปิด · again = เล่นอีกครั้ง · next = ไปด่านถัดไป (ด่านสุดท้าย/บอสอีเว้นท์ = เล่นซ้ำ) — เริ่มรอบใหม่เองหลังชนะ 3 วินาที */
const AUTO_LBL={off:'ปิด',again:'เล่นซ้ำ',next:'ด่านถัดไป'},AUTO_ORDER=['off','again','next'];
let autoTimer=null;
const clearAuto=()=>{if(autoTimer){clearInterval(autoTimer);autoTimer=null}};
function setAutoBtn(){const b=$('#autoBtn');if(b)b.textContent='ออโต้: '+AUTO_LBL[SV.auto||'off']}
function autoStop(){SV.auto='off';save();setAutoBtn();clearAuto();const el=$('#autoLine');if(el)el.textContent='หยุดออโต้แล้ว'}
function autoRun(label,fn){
  clearAuto();let n=3;
  const tick=()=>{const el=$('#autoLine');
    if(!el||$('#mdl').classList.contains('hidden')||SV.auto==='off'){clearAuto();return}
    if(n<=0){clearAuto();closeModal();fn();return}
    el.textContent='⏳ ออโต้: '+label+'ใน '+n+' วินาที…';n--};
  tick();autoTimer=setInterval(tick,1000);
}
$('#autoBtn').onclick=()=>{SV.auto=AUTO_ORDER[(AUTO_ORDER.indexOf(SV.auto||'off')+1)%3];save();setAutoBtn()};
function openUpPicker(){
  const ids=SORTED.filter(k=>SV.owned.includes(k));
  modal(`<div class="wide"><h2>เลือกการ์ดที่จะอัพเกรด</h2><div class="pick">${ids.map(id=>{const c=CARDS[id],l=clv(id);return `<button class="pk${id===upSel?' on':''}" data-pk="${id}" style="--c:${c.color}"><img src="${c.img}" alt="${c.name}"><b>${c.name}</b><small>Lv.${l}${l>=LV_MAX?' MAX':''} · ${cstar(id)}★</small></button>`}).join('')}</div><div class="two"><button class="sec" id="pkX">ปิด</button></div></div>`);
  $('#pkX').onclick=closeModal;
  $$('[data-pk]',$('#mdlBody')).forEach(b=>b.onclick=()=>{upSel=b.dataset.pk;closeModal();renderUp()});
}
let upTab='lv';   /* แท็บในหน้าอัพเกรด: lv = อัพเลเวล, star = อัพดาว */
function renderUp(flash){
  const g=$('#upList');g.className='upview';
  if(!SV.owned.includes(upSel))upSel=null;
  if(!upSel){
    g.innerHTML=`<button class="upslot empty" data-uppick aria-label="เลือกการ์ด"><span class="plus">＋</span><b>แตะเพื่อเลือกการ์ด</b><small>เลือกการ์ดที่ต้องการอัพเกรด</small></button>`;return}
  const id=upSel,c=CARDS[id],l=clv(id),st=cstar(id),max=l>=LV_MAX,smax=st>=STAR_MAX;
  const tabs=`<div class="uptabs"><button class="${upTab==='lv'?'':'sec '}small" data-uptab="lv">⬆ อัพเลเวล</button><button class="${upTab==='star'?'':'sec '}small" data-uptab="star">⭐ อัพดาว</button></div>`;
  let body;
  if(upTab==='star'){
    const s=statAt(id,l,st),n=statAt(id,l,Math.min(STAR_MAX,st+1)),need=smax?0:starCost(id),have=extra(id),ok=!smax&&have>=need;
    body=`<div class="stars big" aria-label="${st} ดาว">${starTxt(st)}</div>
      <span>POWER ${s.p}${smax?'':` → <em class="up">${n.p}</em>`}</span><span>HP ${s.hp}${smax?'':` → <em class="up">${n.hp}</em>`}</span>
      <small class="mute">ทุกดาวเพิ่ม POWER และ HP +${Math.round(STAR_BONUS*100)}% ของค่าพื้นฐาน · ใช้การ์ดซ้ำของใบนี้เป็นวัตถุดิบ</small>
      ${smax?'':`<ul class="req"><li class="${ok?'ok':'no'}"><span>${ok?'✔':'✖'} การ์ดซ้ำ</span><b>${have} / ${need}</b></li></ul>`}
      <div class="two">${smax?'<button class="sec small" disabled>🌟 6 ดาวสูงสุดแล้ว</button>':`<button class="small" data-star="${id}" ${ok?'':'disabled'}>⭐ อัพเป็น ${st+1} ดาว (ใช้การ์ดซ้ำ ${need} ใบ)</button>`}</div>
      ${!smax&&!ok?`<small class="mute">ยังไม่มีการ์ดซ้ำพอ — สุ่มตู้กาชา / อีเว้นท์เพื่อหาการ์ดซ้ำ (ปิดขายการ์ดซ้ำอัตโนมัติไว้ถ้าต้องการเก็บ)</small>`:''}`;
  }else{
    const s=statAt(id,l,st),n=statAt(id,Math.min(LV_MAX,l+1),st);
    const btn=(k,t)=>{const p=upPlan(id,k),ok=SV.coins>=upCost(id);return `<button class="${k===1?'':'sec '}small" data-up="${id},${k}" ${max||!ok?'disabled':''}>${t}${max?'':' · 💰'+(k>=99?upAffordable(id,99).c||upCost(id):p.c)}</button>`};
    body=`<span>POWER ${s.p}${max?'':` → <em class="up">${n.p}</em>`}</span><span>HP ${s.hp}${max?'':` → <em class="up">${n.hp}</em>`}</span>
      <div class="lvbar"><i style="width:${l}%"></i></div>
      <div class="two">${max?'<button class="sec small" disabled>⭐ เลเวลสูงสุดแล้ว</button>':btn(1,'อัป +1')+btn(10,'+10')+btn(99,'สูงสุด')}</div>`;
  }
  g.innerHTML=`<div class="updet${flash===id?' flash':''}" style="--c:${c.color}">
    <button class="upslot" data-uppick aria-label="เปลี่ยนการ์ด"><img src="${c.img}" alt="${c.name}"><span class="uptag">Lv.${l}${max?' MAX':''} · ${st}★</span></button>
    <div class="upinfo"><b class="upname">${c.name} ${rarTag(id)}</b>${tabs}${body}
      <button class="sec small" data-uppick>🔄 เปลี่ยนการ์ด</button></div></div>`;
}
$('#upList').onclick=e=>{
  if(e.target.closest('[data-uppick]'))return openUpPicker();
  const tb=e.target.closest('[data-uptab]');if(tb){upTab=tb.dataset.uptab;return renderUp()}
  const sb=e.target.closest('[data-star]');
  if(sb){
    const id=sb.dataset.star,need=starCost(id);
    if(cstar(id)>=STAR_MAX)return;
    if(extra(id)<need)return toast('การ์ดซ้ำไม่พอ');
    SV.count[id]-=need;SV.star[id]=cstar(id)+1;save();hud();renderUp(id);
    toast('⭐ '+CARDS[id].name+' → '+cstar(id)+' ดาว (ใช้การ์ดซ้ำ '+need+' ใบ)');return;
  }
  const b=e.target.closest('[data-up]');if(!b)return;
  const[id,k]=b.dataset.up.split(','),r=upAffordable(id,+k);
  if(!r.k)return toast('เงินไม่พอ');
  SV.coins-=r.c;SV.lv[id]=clv(id)+r.k;save();hud();renderUp(id);
  toast(CARDS[id].name+' → Lv.'+clv(id)+' (-💰'+r.c+')');
};

/* ---------- คลังการ์ด / ขายการ์ดซ้ำ ---------- */
function setAuto(v){SV.autoSell=v;save();$('#autoSell').checked=v;$('#autoSell2').checked=v;toast(v?'เปิดขายการ์ดซ้ำอัตโนมัติ':'การ์ดซ้ำจะเก็บเข้าคลัง')}
$('#autoSell').onchange=e=>setAuto(e.target.checked);$('#autoSell2').onchange=e=>setAuto(e.target.checked);
function sell(id,n){
  n=Math.min(n,extra(id));if(n<=0)return toast('ต้องเก็บไว้อย่างน้อย 1 ใบ');
  SV.count[id]-=n;SV.coins+=n*refund(id);save();hud();renderSell();toast('ขาย '+CARDS[id].name+' ×'+n+' ได้ 💰'+n*refund(id));
}
/* ขายการ์ด (เข้าจากหน้าจัดทีม) */
function renderSell(){
  $('#autoSell2').checked=SV.autoSell;
  const tot=SV.owned.reduce((s,id)=>s+extra(id)*refund(id),0),n=SV.owned.reduce((s,id)=>s+extra(id),0);
  $('#sellAll').textContent=n?`ขายการ์ดซ้ำทั้งหมด (${n} ใบ · 💰${tot})`:'ไม่มีการ์ดซ้ำให้ขาย';$('#sellAll').disabled=!n;
  const g=$('#sellList');g.innerHTML='';
  for(const id of SORTED.filter(k=>SV.owned.includes(k))){
    const c=CARDS[id],e=extra(id),d=document.createElement('div');d.className='gcard';d.style.setProperty('--c',c.color);
    d.innerHTML=`<div class="gimg"><div class="gw"><img src="${c.img}" alt="${c.name}"><span class="tag">มี ×${SV.count[id]}</span></div></div><div class="ginfo"><b>${c.name} ${rarTag(id)}</b><span>ราคาขาย 💰${refund(id)} / ใบ</span><div class="two"><button class="sec small" data-sell="${id},1" ${e?'':'disabled'}>ขาย 1 ใบ</button><button class="sec small" data-sell="${id},99" ${e?'':'disabled'}>ขายซ้ำทั้งหมด${e?' (+💰'+e*refund(id)+')':''}</button></div></div>`;
    g.appendChild(d);
  }
}
/* คลังไอเทม: ดูจำนวนวัตถุดิบ/ไอเทมที่มี */
function renderInv(){
  const keys=Object.keys(ITEMS),have=keys.reduce((s,k)=>s+itemN(k),0);
  $('#invSum').textContent='วัตถุดิบที่มี '+have+' ชิ้น · 💰 '+SV.coins.toLocaleString()+' · 🍬 '+(SV.candy||0).toLocaleString();
  const g=$('#invList');g.innerHTML='';
  for(const k of keys){
    const it=ITEMS[k],n=itemN(k),use=EVOS.filter(e=>e.need.items[k]),d=document.createElement('div');
    d.className='gcard'+(n?'':' locked');d.style.setProperty('--c',it.color);
    d.innerHTML=`<div class="gimg"><div class="gw"><img src="${it.img}" alt="${it.name}"><span class="tag">มี ×${n}</span></div></div><div class="ginfo"><b>${it.name} <i class="rar" style="--r:${RARITY[it.rar]}">${it.rar}</i></b><span>วัตถุดิบวิวัฒนาการ</span><small>${use.length?'ใช้กับ: '+use.map(e=>CARDS[e.from].name+' → '+CARDS[e.to].name).join(', '):it.desc}</small><div class="two"><button class="sec small" data-go="evo">ไปเควสพัฒนา</button></div></div>`;
    g.appendChild(d);
  }
}
$('#sellList').onclick=e=>{const b=e.target.closest('[data-sell]');if(b){const[id,n]=b.dataset.sell.split(',');sell(id,+n)}};
$('#sellAll').onclick=()=>{let t=0;SV.owned.forEach(id=>{const n=extra(id);if(n){t+=n*refund(id);SV.count[id]-=n}});SV.coins+=t;save();hud();renderSell();toast('ขายการ์ดซ้ำทั้งหมด ได้ 💰'+t)};

/* ---------- อีเว้นท์ ---------- */
const EVENT_OPEN=true;   /* เปลี่ยนเป็น false เพื่อปิดอีเว้นท์ (ด่านบอส + ตู้ฮาโลวีน) */
/* ด่านอีเว้นท์ = บอสการ์ดอีเว้นท์ (หมุนเปลี่ยนการ์ดและรีเซ็ต HP ทุกวัน 00:00 เวลาไทย)
   ลูกอมที่ได้ = ดาเมจรอบนั้น ÷ dmgPerCandy × (1 + bonus × จำนวนการ์ดอีเว้นท์ในทีม)  — ปรับให้ได้น้อย/มากที่ dmgPerCandy */
const EVB={hp:99000000,power:10,turns:20,dmgPerCandy:50,bonus:.25};
const DAY=864e5;
const dayKey=()=>Math.floor((Date.now()+TH_OFFSET)/DAY);
const dayLeft=()=>{const l=DAY-((Date.now()+TH_OFFSET)%DAY),h=Math.floor(l/36e5),m=Math.floor(l%36e5/6e4),s=Math.floor(l%6e4/1000);return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')};
const evCard=()=>HW.pool[dayKey()%HW.pool.length];
const evCount=team=>team.filter(id=>CARDS[id].event==='halloween').length;
const evMult=team=>1+EVB.bonus*evCount(team);
const candyFor=(dmg,team)=>Math.floor(dmg/EVB.dmgPerCandy*evMult(team));
function evState(){
  const E=SV.ev,d=dayKey();
  if(E.day!==d){E.day=d;E.hp=EVB.hp;E.dealt=0;E.runs=0;E.candy=0;save()}
  if(E.hp==null||E.hp>EVB.hp)E.hp=EVB.hp;
  return E;
}
function renderEvent(){
  if(!EVENT_OPEN){$('#evInfo').textContent='🎃 อีเว้นท์ฮาโลวีน · เร็วๆ นี้';$('#evStages').textContent='เร็วๆ นี้';$('#evGacha').textContent='เร็วๆ นี้';return}
  $('#evInfo').textContent=hwOpen()?'🎃 อีเว้นท์ฮาโลวีน · เหลือเวลา '+hwLeft():'⏱ อีเว้นท์ฮาโลวีนจบแล้ว';
  const E=evState();
  $('#evStages').textContent='บอสวันนี้: '+CARDS[evCard()].name+' · ดาเมจรวม '+Math.round(E.dealt).toLocaleString();
  $('#evGacha').textContent='การ์ดอีเว้นท์ '+HW.pool.length+' ใบ · 🍬 '+SV.candy.toLocaleString();
}
const soon=()=>toast('เร็วๆ นี้ 🎃');
$('#evBtnStages').onclick=()=>EVENT_OPEN?go('evboss'):soon();
$('#evBtnGacha').onclick=()=>EVENT_OPEN?go('hwgacha'):soon();

/* --- ด่านบอสอีเว้นท์ --- */
function renderEvBoss(){
  const E=evState(),id=evCard(),c=CARDS[id],team=SV.team.filter(x=>SV.owned.includes(x)),n=evCount(team),dead=E.hp<=0,open=hwOpen();
  $('#ebImg').src=c.img;$('#ebName').textContent='บอสอีเว้นท์ · '+c.name;
  $('#ebFill').style.width=Math.max(0,E.hp/EVB.hp*100)+'%';
  $('#ebHp').textContent=dead?'บอสถูกกำจัดแล้ว!':'HP '+Math.ceil(E.hp).toLocaleString()+' / '+EVB.hp.toLocaleString();
  $('#ebDealt').textContent='ดาเมจวันนี้ '+Math.round(E.dealt).toLocaleString()+' · ได้ลูกอมวันนี้ 🍬'+E.candy.toLocaleString();
  $('#ebAtt').textContent='POWER บอส '+EVB.power+' · จำกัด '+EVB.turns+' เทิร์น/รอบ · เล่นได้ไม่จำกัดรอบ';
  updEvTimer();
  $('#ebRule').innerHTML=`<b>กติกา</b><br>• ทำดาเมจให้เยอะ ยิ่งเยอะยิ่งได้ลูกอม 🍬 (ทุก ${EVB.dmgPerCandy} ดาเมจ = 1 ลูกอม)<br>• การ์ดอีเว้นท์ในทีม +${Math.round(EVB.bonus*100)}% ต่อใบ · ตอนนี้ <b>×${evMult(team).toFixed(2)}</b> (${n} ใบ)<br>• HP บอสสะสมข้ามรอบ รีเซ็ต + เปลี่ยนบอสทุกวัน`;
  $('#ebTeam').innerHTML=team.length?team.map(t=>`<img class="th" src="${CARDS[t].img}" alt="${CARDS[t].name}">`).join(''):'<small>ยังไม่มีการ์ดในทีม</small>';
  $('#ebGo').textContent=!open?'อีเว้นท์จบแล้ว':dead?'บอสถูกกำจัดแล้ว — รอบอสใหม่พรุ่งนี้':'โจมตีบอส';$('#ebGo').disabled=!open||dead||!team.length;
}
function updEvTimer(){const e=$('#ebReset');if(e)e.textContent='⏱ บอสใหม่ (HP เต็ม) ใน '+dayLeft()}
let lastDay=dayKey();
setInterval(()=>{
  if($('#evbossScr').classList.contains('hidden'))return;
  if(dayKey()!==lastDay){lastDay=dayKey();renderEvBoss();toast('บอสอีเว้นท์วันใหม่มาแล้ว!')}else updEvTimer();
},1000);
$('#ebGo').onclick=startEvBoss;
function startEvBoss(){
  if(!hwOpen())return toast('อีเว้นท์จบแล้ว');
  const E=evState(),team=SV.team.filter(x=>SV.owned.includes(x));
  if(E.hp<=0)return toast('บอสถูกกำจัดแล้ว รอบอสใหม่พรุ่งนี้');
  if(!team.length){toast('ต้องมีการ์ดในทีมอย่างน้อย 1 ใบ');return go('team')}
  const card=evCard(),day0=E.day,hp0=E.hp;
  clearAuto();setAutoBtn();Battle.start({auto:true,a:team,la:team.map(clv),sa:team.map(cstar),b:[card],lb:[1],bossHp:{max:EVB.hp,cur:hp0},bossP:EVB.power,bossSafe:true,maxTurns:EVB.turns,
    title:'ด่านอีเว้นท์ · '+CARDS[card].name,first:'a',onExit:()=>go('evboss'),onEnd:r=>finishEvBoss(r,day0,hp0,team)});
}
function finishEvBoss(r,day0,hp0,team){
  const E=evState(),dmg=Math.max(0,hp0-r.bossHp),candy=candyFor(dmg,team),same=E.day===day0,n=evCount(team);
  SV.candy+=candy;
  if(same){E.hp=r.bossHp;E.dealt+=dmg;E.runs++;E.candy+=candy}   /* ถ้าข้ามวันระหว่างสู้: ได้ลูกอมแต่ไม่นับเข้าบอสใหม่ */
  save();hud();
  const lost=!r.win&&!r.timeout,au=SV.auto!=='off'&&!lost;
  modal(`<h2>${lost?'การ์ดพ่ายแพ้…':'จบด่านอีเว้นท์ 🎃'}</h2><p>ดาเมจรอบนี้ <b>${Math.round(dmg).toLocaleString()}</b> · ใช้ ${r.turns} เทิร์น${r.timeout?' (ครบเวลา)':''}${lost?' · ยังได้ลูกอมตามดาเมจที่ทำได้':''}</p>
    <div class="reward"><div>🍬 +${candy.toLocaleString()}</div></div>
    <p class="mute">ดาเมจ ÷ ${EVB.dmgPerCandy}${n?` × โบนัสการ์ดอีเว้นท์ ${evMult(team).toFixed(2)} (${n} ใบ)`:' · ไม่มีการ์ดอีเว้นท์ในทีม (ไม่มีโบนัส)'}${same?'':' · ข้ามวันระหว่างสู้ ดาเมจไม่นับเข้าบอสใหม่'}</p>
    ${au?'<p class="mute" id="autoLine"></p>':''}<div class="two"><button id="rAgain">สู้อีกครั้ง</button><button class="sec" id="rGacha">ไปตู้สุ่ม</button>${au?'<button class="sec" id="autoStop">หยุดออโต้</button>':''}<button class="sec" id="rBack">กลับ</button></div>`);
  $('#rAgain').onclick=()=>{closeModal();startEvBoss()};$('#rGacha').onclick=()=>go('hwgacha');$('#rBack').onclick=()=>go('evboss');
  if(au){$('#autoStop').onclick=autoStop;autoRun('สู้อีกครั้ง',startEvBoss)}
}
setInterval(()=>{if(!$('#eventScr').classList.contains('hidden'))renderEvent()},30000);

/* ---------- เควสพัฒนา (Evolution Quest) ---------- */
/* วัตถุดิบ (ไอเทม) */
const ITEMS={sealc:{name:'อักขระต้องคำสาป',img:'sasuke_seal.jpeg',rar:'S',color:'#a06cff',desc:'วัตถุดิบวิวัฒนาการ ไว้ใช้สำหรับ EVOLUTION ให้กับการ์ดอุจิวะ ซาสึเกะ (ร่างเด็ก)'},seal9:{name:'ตราประทับ 9 หาง',img:'narutoevo.jpeg',rar:'S',color:'#ffcf4a',desc:'วัตถุดิบวิวัฒนาการ ไว้ใช้สำหรับ EVOLUTION ให้กับการ์ดอุซึมากิ นารูโตะ'}};
const itemN=k=>SV.items[k]||0;
/* เควสพัฒนา: from = การ์ดที่อีโว, to = การ์ดหลังอีโว, need = เงื่อนไข, boss = ด่านเควส (ชนะได้เงิน + มีโอกาสดรอปวัตถุดิบ) */
const EVOS=[{from:'naruto',to:'naruto1',need:{cards:50,items:{seal9:1},coins:10000},
  boss:{card:'naruto1',name:'นารูโตะ 1 หาง',hp:1000,power:60,lv:1,coins:100,drops:[{item:'seal9',rate:.05}]}},
  {from:'sasukekid',to:'sasukecurse',need:{cards:50,items:{sealc:1},coins:10000},
  boss:{card:'sasukecurse',name:'ซาสึเกะ ร่างอักขระ',hp:1000,power:60,lv:1,coins:100,drops:[{item:'sealc',rate:.05}]}}];
let evoSel=null,evoKeep=false;
const evoOk=e=>(SV.count[e.from]||0)>=e.need.cards&&Object.entries(e.need.items).every(([k,n])=>itemN(k)>=n)&&SV.coins>=e.need.coins;
function renderEvo(){
  const body=$('#evoBody'),e=EVOS.find(x=>x.from===evoSel);
  if(!e){
    $('#evoHint').innerHTML='เลือกการ์ดตัวละครเพื่อรับเควสพัฒนา';
    body.innerHTML=`<div class="evlist">${EVOS.map(v=>{const c=CARDS[v.from],own=SV.owned.includes(v.from);
      return `<button class="evq${own?'':' lk'}" data-evo="${v.from}" style="--c:${c.color}"><div class="evimg"><img src="${c.img}" alt="${c.name}"></div><b>${c.name}</b><small>เควส: ${v.boss.name} → ${CARDS[v.to].name}</small><i class="evtag">${SV.evoQ[v.from]?'รับเควสแล้ว · แตะเพื่อดู':'แตะเพื่อรับเควส'}</i></button>`}).join('')}
      <div class="evq soon"><div class="evimg">❓</div><b>เควสใหม่</b><small>เร็วๆ นี้</small></div></div>`;
    return;
  }
  const c0=CARDS[e.from],c1=CARDS[e.to],b=e.boss,bc=CARDS[b.card],have=SV.count[e.from]||0,ok=evoOk(e),s1=statAt(e.to,1);
  const row=(t,h,n)=>`<li class="${h>=n?'ok':'no'}"><span>${h>=n?'✔':'✖'}</span>${t}<b>${h.toLocaleString()} / ${n.toLocaleString()}</b></li>`;
  $('#evoHint').innerHTML='<button class="sec small" id="evoBack">← เลือกการ์ดอื่น</button>';
  $('#evoBack').onclick=()=>{evoSel=null;renderEvo()};
  body.innerHTML=`<div class="evd">
    <div class="evtrans">
      <div class="evc" style="--c:${c0.color}"><img src="${c0.img}" alt="${c0.name}"><b>${c0.name} ${rarTag(e.from)}</b><small>มี ×${have}</small></div>
      <div class="evarrow">➜<small>EVOLUTION</small></div>
      <div class="evc" style="--c:${c1.color}"><img src="${c1.img}" alt="${c1.name}"><b>${c1.name} ${rarTag(e.to)}</b><small>POWER ${s1.p} · HP ${s1.hp}${SV.owned.includes(e.to)?' · มี ×'+(SV.count[e.to]||1):''}</small></div>
    </div>
    <div class="evinfo">
      <div class="box"><b>เงื่อนไขอีโว</b><ul class="req">
        ${row('การ์ด '+c0.name,have,e.need.cards)}
        ${Object.entries(e.need.items).map(([k,n])=>row(ITEMS[k].name,itemN(k),n)).join('')}
        ${row('เงิน 💰',SV.coins,e.need.coins)}</ul>
        <button id="evoDo" ${ok?'':'disabled'}>🧬 อีโวการ์ด</button></div>
      <div class="box"><b>ด่านเควส: ${b.name}</b>
        <div class="evboss"><img src="${bc.img}" alt="${bc.name}"><div><div>HP <b>${b.hp.toLocaleString()}</b> · POWER <b>${b.power}</b></div><div>ชนะได้ 💰${b.coins} ทุกครั้ง</div>${b.drops.map(d=>`<div class="drop"><img src="${ITEMS[d.item].img}" alt=""> ${ITEMS[d.item].name} โอกาสออก ${+(d.rate*100).toFixed(1)}% · มี ×${itemN(d.item)}</div>`).join('')}</div></div>
        <button id="evoPlay">⚔ เล่นด่านเควส</button></div>
    </div></div>`;
  $('#evoDo').onclick=()=>confirmEvolve(e);$('#evoPlay').onclick=()=>startEvoQuest(e);
}
$('#evoBody').onclick=ev=>{const b=ev.target.closest('[data-evo]');if(!b)return;
  evoSel=b.dataset.evo;const e=EVOS.find(x=>x.from===evoSel);
  if(!SV.evoQ[evoSel]){SV.evoQ[evoSel]=true;save();toast('รับเควสพัฒนา: '+e.boss.name+' แล้ว!')}renderEvo()};
function startEvoQuest(e){
  const team=SV.team.filter(x=>SV.owned.includes(x));
  if(!team.length){toast('ต้องมีการ์ดในทีมอย่างน้อย 1 ใบ');return go('team')}
  const b=e.boss;clearAuto();setAutoBtn();
  Battle.start({auto:true,a:team,la:team.map(clv),sa:team.map(cstar),b:[b.card],lb:[b.lv],bossHp:{max:b.hp,cur:b.hp},bossP:b.power,noHeal:true,title:'เควสพัฒนา · '+b.name,first:'a',
    onExit:()=>{evoKeep=true;go('evo')},onEnd:r=>finishEvoQuest(e,r)});
}
function finishEvoQuest(e,r){
  const b=e.boss,back=()=>{evoKeep=true;go('evo')};
  if(!r.win){
    modal(`<h2>พ่ายแพ้…</h2><p>${b.name} (HP ${b.hp.toLocaleString()} · POWER ${b.power}) แข็งแกร่งเกินไป ลองอัปเลเวลการ์ดหรือจัดทีมใหม่</p>${SV.auto!=='off'?'<p class="mute">ออโต้หยุดเพราะแพ้</p>':''}<div class="two"><button id="rAgain">ลองใหม่</button><button class="sec" id="rTeam">จัดทีม</button><button class="sec" id="rBack">กลับ</button></div>`);
    $('#rAgain').onclick=()=>{closeModal();startEvoQuest(e)};$('#rTeam').onclick=()=>go('team');$('#rBack').onclick=back;return}
  SV.coins+=b.coins;const got=[];
  b.drops.forEach(d=>{if(Math.random()<d.rate){SV.items[d.item]=itemN(d.item)+1;got.push(d.item)}});save();hud();
  const au=SV.auto!=='off';
  modal(`<h2>ผ่านเควส! 🎉</h2><p>${b.name} · ใช้ ${r.turns} เทิร์น</p><div class="reward"><div>💰 +${b.coins}</div></div>
    ${got.length?got.map(k=>`<div class="dropbox"><img src="${ITEMS[k].img}" alt=""><div><b>ได้รับ ${ITEMS[k].name}!</b><br><small>มีทั้งหมด ×${itemN(k)}</small></div></div>`).join(''):'<p class="mute">ไม่ได้วัตถุดิบรอบนี้ (โอกาสออก 5% ต่อรอบ)</p>'}
    ${au?'<p class="mute" id="autoLine"></p>':''}<div class="two"><button id="rAgain">สู้อีกครั้ง</button>${au?'<button class="sec" id="autoStop">หยุดออโต้</button>':''}<button class="sec" id="rBack">กลับ</button></div>`);
  $('#rAgain').onclick=()=>{closeModal();startEvoQuest(e)};$('#rBack').onclick=back;
  if(au){$('#autoStop').onclick=autoStop;autoRun('สู้อีกครั้ง',()=>startEvoQuest(e))}
}
function confirmEvolve(e){
  if(!evoOk(e))return toast('วัตถุดิบยังไม่ครบ');
  const c0=CARDS[e.from],c1=CARDS[e.to];
  modal(`<h2>ยืนยันการอีโว?</h2><p>จะใช้ ${c0.name} ×${e.need.cards}${Object.entries(e.need.items).map(([k,n])=>' · '+ITEMS[k].name+' ×'+n).join('')} · 💰${e.need.coins.toLocaleString()}</p><p class="mute">เพื่อได้ ${c1.name} (เลเวลจะสืบทอดจากการ์ดเดิม)</p><div class="two"><button id="evYes">ยืนยัน อีโว!</button><button class="sec" id="evNo">ยกเลิก</button></div>`);
  $('#evNo').onclick=closeModal;$('#evYes').onclick=()=>doEvolve(e);
}
function doEvolve(e){
  if(!evoOk(e)){closeModal();return renderEvo()}
  const lv=SV.lv[e.from]||1;
  SV.count[e.from]-=e.need.cards;Object.entries(e.need.items).forEach(([k,n])=>{SV.items[k]=itemN(k)-n});SV.coins-=e.need.coins;
  if(SV.owned.includes(e.to))SV.count[e.to]=(SV.count[e.to]||1)+1;else{SV.owned.push(e.to);SV.count[e.to]=1}
  SV.lv[e.to]=Math.max(SV.lv[e.to]||1,lv);
  if(SV.count[e.from]<=0){   /* ใช้การ์ดเดิมหมด: ถอดออกจากคลัง และเปลี่ยนในทีมเป็นการ์ดใหม่ */
    SV.owned=SV.owned.filter(x=>x!==e.from);delete SV.count[e.from];delete SV.lv[e.from];delete SV.star[e.from];
    const i=SV.team.indexOf(e.from);if(i>=0){if(SV.team.includes(e.to))SV.team.splice(i,1);else SV.team[i]=e.to}
  }
  save();hud();
  const c=CARDS[e.to],s=statAt(e.to,clv(e.to),cstar(e.to));
  modal(`<h2>EVOLUTION สำเร็จ! 🧬</h2><div class="reveal" style="--c:${RARITY[c.rar]}"><div class="glow"></div><img src="${c.img}" alt="${c.name}"></div><h2>${c.name} ${rarTag(e.to)}</h2><p>Lv.${clv(e.to)} · POWER ${s.p} · HP ${s.hp}</p><div class="two"><button id="evOk">ตกลง</button><button class="sec" id="evTeam">ดูทีม</button></div>`);
  $('#evOk').onclick=()=>{closeModal();evoKeep=true;renderEvo()};$('#evTeam').onclick=()=>go('team');
}
$('#devEvo').onclick=()=>{SV.count.naruto=(SV.count.naruto||0)+50;if(!SV.owned.includes('naruto'))SV.owned.push('naruto');SV.items.seal9=itemN('seal9')+1;SV.coins+=10000;save();hud();if(!$('#evoScr').classList.contains('hidden'))renderEvo();toast('ได้ชุดทดสอบอีโว: นารูโตะ ×50, ตราประทับ ×1, 💰10,000')};

/* ---------- เริ่มต้น ---------- */
load();hud();