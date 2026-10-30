/* ===== Card Duel – app.js (เมนู / เซฟ / สอนเล่น / ด่าน / กาชา) ===== */
const RARITY={R:'#7aa2ff',S:'#ff6b6b',SR:'#ff7ad9',SSR:'#4de6c8',UR:'#ff8a3d',USR:'#ffd34d',LTD:'#c27bff'};
const MAX_TEAM=4;
/* ตู้กาชา: สุ่มได้ทุกใบรวมถึงตัวซ้ำ (น้ำหนัก = % ที่ออก) — ปรับทีหลังได้ */
const GACHA={cost:100000,cost10:900000,   /* ราคาสุ่มเป็นเงิน 💰 (ตู้ฮาโลวีนใช้ลูกอม ราคาแยกที่ HW) */
  /* การ์ดที่สุ่มได้ในตู้ (LTD ยังไม่เปิดให้สุ่ม — ซาสึเกะจะหาวิธีได้รับภายหลัง) */
  pool:['jinwoo','milim','goku','zenitsu','yuji','naruto','sasukekid','gekko','ino','kirara','garo','vegeta','ichigo','kirito','megumi','gil','kurapika','shuna','chahaein','kaneki','reze','kdash','mai','kula','rias','issei','rocklee'],
  /* เรทออก % : base = ปกติ, up = ตอนเป็นการ์ดเรทอัป (การ์ด R ที่เหลือแบ่งเท่าๆ กัน) */
  /* เรทตามระดับ (รวมทุกใบในระดับนั้น): USR 0.1% · UR 1% — แบ่งเท่าๆ กันในระดับเดียวกัน, ถ้าเป็นการ์ดเรทอัปได้ส่วนแบ่ง rarUp ของระดับนั้น (ตัวเลขใน rates ด้านล่างของ UR/USR ใช้แสดงผลเท่านั้น) */
  rarTotal:{S:20,SR:10,SSR:4.9,UR:1,USR:0.1},rarUp:0.7,   /* เรทรวมตามระดับ (%): R ได้ส่วนที่เหลือ = 64% · ถ้าเป็นการ์ดเรทอัปได้ส่วนแบ่ง rarUp ของระดับนั้น */
  /* การันตี (ตู้ปกติ): สุ่มครบกี่ครั้งโดยยังไม่ได้ระดับนั้น → ครั้งถัดไปได้แน่นอน (ได้ USR ถือว่านับ UR ใหม่ด้วย) */
  pityUR:400,pityUSR:1000,
  rates:{base:{milim:5,kirito:15,ichigo:15,kaneki:10,megumi:5,shuna:8,chahaein:4,issei:5,gil:0.5,reze:0.5,kurapika:0.05,kdash:0.05,mai:0.05},up:{milim:5,kirito:30,ichigo:30,kaneki:10,megumi:10,shuna:8,chahaein:4,issei:5,gil:0.7,reze:0.7,kurapika:0.07,kdash:0.07,mai:0.07}},
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
const HW={end:Date.UTC(2026,10,11)-7*3600000,   /* หมดวันที่ 10 พ.ย. 2026 (จบเที่ยงคืนต่อวันที่ 11 · เวลาไทย) */
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
const gcost=n=>gMode==='hw'?(n===1?HW.cost:n===10?HW.cost10:HW.cost10*(n/10)):(n===1?GACHA.cost:n===10?GACHA.cost10:GACHA.cost10*(n/10));   /* ×50 = ราคา ×10 คูณ 5 (ส่วนลดเท่ากัน) */
const gbal=()=>gMode==='hw'?SV.candy:SV.coins;
const gico=()=>gMode==='hw'?'🍬':'💰';
const stageList=()=>sMode==='hw'?HW.stages:STAGES;
const sGo=()=>sMode==='hw'?'hwstages':'stages';
const inPool=id=>GACHA.pool.includes(id);
const lockTxt=id=>id==='cc'?'ได้จากเควสตัวละคร หรือโค้ดพิเศษ':id==='slime'?'ได้จากเควสตัวละครเท่านั้น':CARDS[id].endless?'ได้จากด่านไม่มีที่สิ้นสุด (อีเว้นท์) · ทุก '+(EL.dropEvery>1?EL.dropEvery+' ':'')+'เวฟมีโอกาส '+EL.baseRate+'%':CARDS[id].evo?'ได้จากการอีโว (เควสพัฒนา)':HW.pool.includes(id)?'ได้จากตู้ฮาโลวีน (อีเว้นท์)':inPool(id)?(HW.rPool.includes(id)?'ได้จากตู้กาชา / ตู้ฮาโลวีน':'ได้จากตู้กาชา'):'ยังไม่เปิดให้ได้รับ';   // เงินคืนเมื่อได้การ์ดซ้ำ แยกตามระดับ
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
function fresh(){return{v:1,coins:300,exp:0,curve:2,owned:[],count:{},lv:{},lvClaimed:{},raid:{slot:null,boss:0,hp:null,used:0,dealt:0,claimed:{}},chal:{slot:null,cleared:{}},autoSell:false,team:[],cleared:{},started:false,candy:0,ev:{day:null,hp:null,dealt:0,runs:0,candy:0},evg:{pity:0},items:{},evoQ:{},evoWin:{},star:{}}}
function load(){try{SV=JSON.parse(localStorage.getItem(KEY))}catch(e){SV=null}if(!SV||SV.v!==1)SV=fresh();SV.count=SV.count||{};SV.lv=SV.lv||{};SV.lvClaimed=SV.lvClaimed||{};SV.raid=SV.raid||{slot:null,boss:0,hp:null,used:0,dealt:0,claimed:{}};SV.chal=SV.chal||{slot:null,cleared:{}};SV.owned.forEach(id=>{SV.count[id]=SV.count[id]||1});SV.autoSell=!!SV.autoSell;SV.auto=SV.auto||'off';SV.candy=SV.candy||0;SV.ev=SV.ev||{day:null,hp:null,dealt:0,runs:0,candy:0};SV.evg=SV.evg||{pity:0};SV.items=SV.items||{};SV.evoQ=SV.evoQ||{};SV.evoWin=SV.evoWin||{};SV.star=SV.star||{};
  if(SV.curve!==2){SV.exp=0;SV.curve=2;save()}   /* สูตร EXP ใหม่: รีเซ็ตเลเวลผู้เล่นเป็น Lv.1 (เงิน การ์ด และด่านที่ผ่านยังอยู่) */
}
function save(){try{SV.savedAt=Date.now();localStorage.setItem(KEY,JSON.stringify(SV))}catch(e){}if(window.Online)Online.onSave()}
/* ---------- ระบบหลังบ้าน (เซิร์ฟเวอร์เป็นเจ้าของเงิน/การ์ด/เลเวล/ด่าน) ---------- */
const srvOn=()=>!!(window.Online&&Online.srv&&Online.srv.on);   /* true = ล็อกอินแล้วและเชื่อมระบบ player_state สำเร็จ */
const sc=(fn,a)=>Online.srv.call(fn,a);
const SRV_ERR={login:'ต้องล็อกอินก่อน',offline:'ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์',nomoney:'เงินไม่พอ',notowned:'ไม่มีการ์ดใบนี้',max:'ถึงระดับสูงสุดแล้ว',nodup:'การ์ดซ้ำไม่พอ',keep_one:'ต้องเก็บไว้อย่างน้อย 1 ใบ',locked:'ด่านนี้ยังล็อกอยู่',nostage:'ไม่พบด่านนี้',toofast:'เซิร์ฟเวอร์ไม่รับผลด่าน (จบเร็วผิดปกติ)',ratelimit:'เล่นถี่เกินไป รอสักครู่',badtoken:'ผลด่านหมดอายุ ลองเล่นใหม่อีกครั้ง',lowlv:'เลเวลยังไม่ถึง',claimed:'รับไปแล้ว',bad_lv:'เลเวลไม่ถูกต้อง',invalid:'โค้ดไม่ถูกต้อง',taken:'โค้ดนี้ถูกใช้ไปแล้ว',error:'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ ลองใหม่อีกครั้ง'};
const srvMsg=r=>(SRV_ERR[r&&r.error]||('ผิดพลาด: '+(r&&r.error)))+((r&&r.error==='error'&&r.msg)?' ['+r.msg+']':'');
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
const STAR_FLAT=['USR','LTD'];   /* ระดับที่อัพดาวใช้การ์ดซ้ำดาวละ 1 ใบ (ระดับอื่นใช้ STAR_COST ใน script.js: 1,1,2,3,4) */
const starCost=id=>STAR_FLAT.includes(CARDS[id].rar)?1:STAR_COST[cstar(id)-1];
const cardStat=id=>{const s=statAt(id,clv(id),cstar(id));return 'Lv.'+clv(id)+' · '+cstar(id)+'★ · POWER '+s.p+' · HP '+s.hp};
/* ราคาอัปเลเวล: เริ่ม 20 เงิน เพิ่ม ~4.5% ต่อเลเวล คูณตามระดับการ์ด */
const UP_RM={R:1,S:1.5,SR:1.75,SSR:2,UR:2.25,USR:2.5,LTD:3};
/* เรียงการ์ดตามระดับ จากน้อยไปมาก (R > S > SR > SSR > UR > USR > LTD) */
const SORTED=Object.keys(CARDS).filter(id=>!CARDS[id].questOnly).sort((x,y)=>rIdx(CARDS[x].rar)-rIdx(CARDS[y].rar));
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
  const m={play:'playScr',raid:'raidScr',chal:'chalScr',home:'homeScr',team:'teamScr',stages:'stagesScr',gacha:'gachaScr',inv:'invScr',up:'upScr',lvr:'lvrScr',event:'eventScr',hwstages:'stagesScr',hwgacha:'gachaScr',evboss:'evbossScr',evo:'evoScr',sell:'sellScr',online:'onlineScr',room:'roomScr',friends:'friendsScr',chat:'chatScr',endless:'endlessScr',inf:'infScr',dungeon:'dungeonScr'};
  if(name==='up')upSel=null;if(name==='evo'){if(!evoKeep)evoSel=null;else questTab='evo';evoKeep=false}if(name==='stages')sMode='main';if(name==='hwstages')sMode='hw';if(name==='gacha')gMode='main';if(name==='hwgacha')gMode='hw';
  closeModal();show(m[name]);hud();
  ({evo:renderQuest,sell:renderSell,play:renderPlay,raid:renderRaid,chal:renderChal,home:renderHome,team:renderTeam,stages:renderStages,gacha:renderGacha,inv:renderInv,up:renderUp,lvr:renderLvr,event:renderEvent,hwstages:renderStages,hwgacha:renderGacha,evboss:renderEvBoss,endless:renderEndless,inf:renderInf,dungeon:renderDungeon,online:()=>Online.hub(),room:()=>Online.room(),friends:()=>Online.friends(),chat:()=>Online.chat()})[name]();
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(b){if(b.dataset.tab)questTab=b.dataset.tab;go(b.dataset.go)}});

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
  RELEASE:()=>{SV.coins=(SV.coins||0)+3000000;SV.candy=(SV.candy||0)+3000;return 'เงิน +3,000,000 · ลูกอม +3,000'}
};
function codeModal(){
  modal(`<h2>🎁 ใส่โค้ดรับของขวัญ</h2><form class="auth" id="cdF"><input id="cdI" placeholder="พิมพ์โค้ดที่นี่" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="30"><p class="aerr" id="cdE"></p><p class="mute" id="cdOk"></p><div class="two"><button type="submit">รับของขวัญ</button><button type="button" class="sec" id="cdX">ปิด</button></div></form>`);
  $('#cdX').onclick=closeModal;
  let busy=false;
  $('#cdF').onsubmit=async e=>{e.preventDefault();if(busy)return;
    const c=$('#cdI').value.trim().toUpperCase(),f=GIFT_CODES[c];
    SV.codes=SV.codes||{};$('#cdOk').textContent='';
    if(!c){$('#cdE').textContent='กรุณาพิมพ์โค้ด';return}
    if(srvOn()){   /* ออนไลน์: เซิร์ฟเวอร์ตรวจโค้ดและให้รางวัลเอง (ตาราง code_defs) */
      busy=true;$('#cdE').textContent='กำลังตรวจสอบโค้ด…';
      const r=await sc('redeem_gift',{p_code:c});busy=false;
      if(!r.ok){$('#cdE').textContent=srvMsg(r);return}
      SV.codes[c]=1;save();if(typeof renderHome==='function')renderHome();
      $('#cdE').textContent='';$('#cdOk').textContent='✅ รับสำเร็จ: ได้รับของขวัญจากโค้ด '+c+' แล้ว';$('#cdI').value='';toast('รับของขวัญสำเร็จ!');return}
    if(!f){$('#cdE').textContent='โค้ดไม่ถูกต้อง';return}
    if(SV.codes[c]){$('#cdE').textContent='โค้ดนี้ใช้ไปแล้ว';return}
    if(f.srv){   /* โค้ดที่ใช้ได้คนเดียวทั้งโลก */
      busy=true;$('#cdE').textContent='กำลังตรวจสอบโค้ด…';
      const st=window.Online?await Online.redeem(c):'offline';busy=false;
      if(st!=='ok'){$('#cdE').textContent=st==='taken'?'โค้ดนี้มีคนใช้ไปแล้ว':st==='offline'||st==='login'?'ต้องล็อคอินออนไลน์ก่อนจึงใช้โค้ดนี้ได้':st==='invalid'?'โค้ดไม่ถูกต้อง':'ตรวจสอบโค้ดไม่สำเร็จ ลองใหม่อีกครั้ง (ถ้ายังไม่ได้ ให้ผู้ดูแลรัน redeem.sql ใน Supabase)';return}
    }
    SV.codes[c]=1;const msg=(f.run||f)();save();hud();
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
    if(el){el.scrollIntoView({block:'center',inline:'nearest'});const r=el.getBoundingClientRect(),pd=8;
      sp.style.cssText=`display:block;left:${r.left-pd}px;top:${r.top-pd}px;width:${r.width+pd*2}px;height:${r.height+pd*2}px`;
      const below=r.bottom+tip.offsetHeight+24<innerHeight;
      tip.style.cssText=`left:${Math.max(10,Math.min(innerWidth-tip.offsetWidth-10,r.left+r.width/2-tip.offsetWidth/2))}px;top:${Math.max(10,Math.min(innerHeight-tip.offsetHeight-10,below?r.bottom+16:r.top-tip.offsetHeight-16))}px;transform:none`;
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
      if(!own)return toast(id==='cc'?'การ์ดนี้ได้จากเควสตัวละคร หรือโค้ดพิเศษเท่านั้น':CARDS[id].endless?'การ์ดนี้ได้จากด่านไม่มีที่สิ้นสุด (อีเว้นท์) เท่านั้น':HW.pool.includes(id)?'การ์ดนี้ได้จากตู้ฮาโลวีน (อีเว้นท์) เท่านั้น':inPool(id)?'การ์ดนี้ยังล็อกอยู่ ต้องสุ่มจากตู้กาชา'+(HW.rPool.includes(id)?' หรือตู้ฮาโลวีน':''):'การ์ดนี้ยังไม่เปิดให้ได้รับ (จะมีวิธีได้รับภายหลัง)');
      if(pos>=0)SV.team.splice(pos,1);else if(SV.team.length<MAX_TEAM)SV.team.push(id);else return toast('ทีมเต็ม '+MAX_TEAM+' ใบแล้ว');
      save();if(window.Online&&Online.srv)Online.srv.syncTeam();renderTeam()};
    d.onclick=e=>{if(e.target.closest('[data-info]')){e.stopPropagation();showInfo(id)}else act()};
    d.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&!e.target.closest('[data-info]')){e.preventDefault();act()}};
    g.appendChild(d);
  }
}
/* ปุ่ม i: ดูความสามารถของการ์ด */
const MORE={shadowemp:['เริ่มเกม: "อนธการกังวาน" เพิ่ม HP และ POWER ให้ทั้งทีม +20%','ทุกครั้งที่โจมตี สุ่มทหารเงา 1 ใน 3 (ตัวละ 1/3) ออกมาช่วยโจมตี','🐜 เบรุ: ดาเมจ = POWER ของการ์ดใบนี้ + สถานะพิษ 8% ของ HP สูงสุดศัตรู','⚔️ อิกริส: ดาเมจ 1.5 เท่าของ POWER ของการ์ดใบนี้','🛡️ ไออน: ดาเมจ = POWER ของการ์ดใบนี้ + ลด POWER ศัตรู 50% นาน 1 เทิร์น'],jinwoo2:['โจมตี 2 ครั้งในเทิร์นเดียว','สร้างสถานะ "พิษ" และ "เลือดไหล" ใส่ศัตรู','แต่ละสถานะเสีย HP 7.5% ของ HP สูงสุดของศัตรู ต้นเทิร์นของศัตรู'],jinwoo:['เมื่อรับความเสียหายถึงตาย HP จะเหลือ 1 เป็นเวลา 5 เทิร์น (นับเทิร์นของตัวเอง)','ในช่วงนี้ไม่ตาย แต่ HP ค้างที่ 1 และฟื้นฟูไม่ได้ · ใช้ได้ 1 ครั้งต่อการต่อสู้','หมดช่วงแล้ว HP ยังเหลือ 1 ถ้ารับดาเมจอีกจะตายตามปกติ'],milim:['หลอดความโกรธ: ยิ่งโจมตี ยิ่งรับดาเมจ ยิ่งถูกสกิลโจมตี ค่าความโกรธจะเพิ่มขึ้น (ถูกสกิลโจมตีเพิ่มมากกว่า)','เมื่อหลอดความโกรธเต็ม เข้าสู่โหมด "ซาตานาเอล" สเตตัส (POWER / HP) เพิ่มเป็น 3 เท่า','ในโหมดซาตานาเอล กันสถานะผิดปกติทุกอย่าง นาน 10 เทิร์น แล้วสเตตัสกลับเป็นปกติ · ใช้ซาตานาเอลได้เพียง 1 ครั้งต่อเกม หลังจากนั้นใช้ไม่ได้อีก'],susanoo:['โจมตีทะลุ Void Shield (ไม่เสียโล่ของศัตรู ทั้งการโจมตีและสกิล)','สะท้อนสกิลประเภทโจมตีที่บังคับตาย (จุดตาย / ทำลายในครั้งเดียว) กลับไปใส่ศัตรู','สะท้อนสถานะผิดปกติทุกอย่างกลับไปที่ศัตรู','เพิ่มสเตตัส (POWER / HP) ครั้งละ 15% เมื่อการ์ดในทีมถูกทำลาย 1 ใบ (สูงสุด 45%)'],shichi:['โอกาส 50% ควบคุมให้ศัตรูโจมตีตัวเอง (ศัตรูเสีย HP เท่า POWER ตัวเองและข้ามการโจมตี)','สะท้อนสกิลที่โจมตีแล้วตายทันที (จุดตาย / ทำลายในครั้งเดียว) กลับไปใส่ศัตรู','ป้องกันสถานะผิดปกติทุกอย่าง'],kabuto:['โอกาส 50% หลบหลีก','ดาเมจ 50 เท่าของ POWER ปัจจุบันเมื่อโจมตี BOSS','ขณะอยู่บนสนาม ลด POWER ของการ์ดศัตรูบนสนามลง 10%'],rias:['ลบสถานะผิดปกติของตัวเอง แล้วสะท้อนกลับไปที่การ์ดศัตรู','โอกาส 10% สั่งตายการ์ดศัตรู ตายหลังผ่านไป 3 เทิร์น (ไม่ได้ผลกับการ์ดที่มี Void Shield)','Void Shield กันดาเมจและสกิลได้ 3 ครั้ง'],issei:['เริ่มเกมสเตตัสทุกอย่าง ×2 นาน 10 เทิร์น','หลังจากนั้นสเตตัสกลับเป็นเท่าเดิม'],garocosmic:['โอกาสหลบหลีก 55%','โจมตี 4 ครั้งในเทิร์นเดียว','โอกาส 55% โจมตีโต้กลับในเทิร์นศัตรู (1 ครั้งต่อเทิร์นที่ถูกโจมตี)','Void Shield: กันการโจมตีและการใช้สกิลของศัตรูได้ 2 ครั้ง (หลบได้จะไม่เสียโล่)'],garomon:['โอกาสหลบหลีก 45%','โจมตี 3 ครั้งในเทิร์นเดียว','โอกาส 40% โจมตีโต้กลับในเทิร์นศัตรู (โต้กลับ 1 ครั้งต่อเทิร์นที่ถูกโจมตี)','เพิ่มสเตตัส (POWER / HP) 5% ทุกๆ 2 เทิร์น'],garored:['โอกาสหลบหลีก 40%','โจมตี 3 ครั้งในเทิร์นเดียว'],slime:['สังหารการ์ดศัตรูได้ → แปลงร่างเป็นการ์ดนั้นทันที','คงสเตตัส (POWER / HP) และความสามารถของการ์ดที่ถูกสังหาร (HP เต็ม)','สังหารใบถัดไปก็แปลงร่างต่อได้เรื่อยๆ'],rimuru:['ผลลัพธ์ด้านลบ (สถานะผิดปกติ) ไม่มีผล','HP ต่ำกว่า 30% → โหมด "ผู้ไร้ความปราณี": สเตตัสรวม +50% นาน 6 เทิร์น','สังหารศัตรูได้ภายใน 6 เทิร์น → ฟื้น HP จนเต็ม','มีผลได้ 1 ครั้งต่อเกม'],cc:['เมื่ออยู่ในทีม (และยังไม่ถูกกำจัด) ป้องกันสถานะผิดปกติทั้งหมดให้การ์ดทุกใบในทีม','ครอบคลุม: ชา, ไหม้, เลือดไหล, พิษ, แช่แข็ง, มึนงง, ถูกผนึก ฯลฯ'],konan:['เพิ่ม HP และ POWER +20% ให้การ์ดอีเว้นท์ฮาโลวีนในทีม (รวมตัวเอง)','ทุกครั้งที่โจมตี สุ่มกระดาษ 1 ใน 2 แบบ (แบบละ 50%)','📜 ลดความเสียหาย: POWER ศัตรูลด 75% ของ POWER สูงสุด จนจบการโจมตีครั้งถัดไป','💥 ระเบิด: 75% ของ POWER ปัจจุบันใส่การ์ดใบที่สองของฝ่ายตรงข้าม (ถ้าไม่มีก็ไม่มีผล)'],kirara:['แสตก "กลุ่มดาวกางเขนใต้" เพิ่ม 1 ทุกครั้งที่โจมตี (สูงสุด 5) และหายเมื่อศัตรูถูกกำจัด','แต่ละแสตก = อุปสรรค 1 ชิ้นพุ่งใส่ สุ่ม: 🚗 รถยนต์ 70% POWER','🪨 ก้อนหิน 40% POWER + โอกาส 40% มึนงง (โจมตีไม่ได้ 1 เทิร์น)','🗡️ ของมีคม 55% POWER + เลือดไหล 5% ของ HP สูงสุดศัตรู'],garo:['โจมตี 2 ครั้งต่อเทิร์น','โอกาส 40% หลบการโจมตีที่เข้ามาแต่ละครั้ง'],vegeta:['หลังโจมตีปกติ ปล่อยกระสุนพลังสุ่ม 2-5 ลูก','กระสุนแต่ละลูกสร้างความเสียหาย 60% ของ POWER ปัจจุบัน'],kula:['โอกาส 60% ติดสถานะ "ผลึกน้ำแข็ง" ❄','ศัตรูถูกแช่แข็ง โจมตีไม่ได้ 1 เทิร์น','ผลึกตกค้าง 2 เทิร์น เสีย HP 60% ของ POWER คุลาต่อเทิร์น'],mahoraga:['ทุกเทิร์น กงล้อธรรมจักรหมุน 1 ครั้ง แล้วสุ่มได้ 1 อย่าง (โอกาสเท่ากัน):','☸ เพิ่ม POWER +50','☸ ฟื้นฟู HP 20% ของ HP ที่เสียไป','☸ ต้านทานสถานะด้านลบทุกชนิด (ล้างสถานะที่ติดอยู่และกันสถานะใหม่จนถึงเทิร์นถัดไปของตน)'],sasukecurse:['ทุกครั้งที่โจมตี ศัตรูจะติดสถานะ "ชาขั้นรุนแรง" (⚡) นาน 3 เทิร์น (ต่ออายุทุกครั้งที่โจมตี)','ต้นเทิร์นของศัตรู: ถูกไฟฟ้าช็อต เสีย HP 10% ของ HP สูงสุดของศัตรู 1 ครั้ง','และมีโอกาส 50% ที่ศัตรูจะโจมตีไม่ได้ในเทิร์นนั้น','ลบสถานะได้ด้วยนิ้วนางของคุราปิก้า (โอคารุนไม่ได้รับผล)'],sasukekid:['ทุกครั้งที่โจมตี ปล่อยคาถาเพลิง ลูกไฟสร้างความเสียหาย 20% ของ POWER ปัจจุบัน','ศัตรูติดสถานะ "เผาไหม้" (🔥) เสีย HP 10% ของ HP สูงสุดของศัตรู ต้นเทิร์นทุกเทิร์น นาน 3 เทิร์น','ลบสถานะได้ด้วยนิ้วนางของคุราปิก้า'],ino:['ทุกๆ 2 เทิร์นของอิโนะ (เทิร์นที่ 2, 4, 6 …) จะย้ายร่างศัตรู','ศัตรูที่ถูกย้ายร่างโจมตีตัวเอง เสีย HP 2 เท่าของ POWER ปัจจุบันของตัวมันเอง','ใช้หลังการโจมตีปกติ · ถูกผนึกความสามารถแล้วใช้ไม่ได้'],gekko:['เมื่อโจมตี จะสร้างสถานะ "เลือดไหล" และ "ติดพิษ" ใส่ศัตรู','แต่ละสถานะทำให้เสีย HP 10% ของ POWER ปัจจุบันของเก็กโค ต่อเทิร์น (ต้นเทิร์นของศัตรู)','ไม่ซ้อนทับ — โจมตีซ้ำเพียงอัปเดตดาเมจให้เท่ากับค่าสูงสุด · หายเมื่อถูกล้างสถานะ'],naruto:['เมื่อถูกกำจัดครั้งแรก จะเรียกร่างแยกลงสนามแทนทันที (ฟื้น HP เต็มตามสเตตัสร่างแยก)','ร่างแยกมี POWER และ HP ลดลง 10% ของสเตตัสทั้งหมด (ปรับได้ในหน้าปรับค่าทดลอง)','ร่างแยกถูกกำจัดแล้วไม่เรียกซ้ำอีก'],okarun:['มีโอกาส 30% หลบการโจมตี (รวมการโจมตีจากผู้ช่วยหรือความสามารถของศัตรู) หลบแล้วไม่โดนดาเมจ','ไม่ได้รับผลของสถานะด้านลบทุกชนิด (ชา ผนึก สายฟ้า เผาไหม้ เข้าสิง เลือดไหล ฯลฯ)','เมื่อโจมตีจะติดสัญลักษณ์เทอร์โบ (⚡) ทำให้การโจมตีครั้งถัดไปดาเมจเพิ่ม 30% ของ POWER ปัจจุบัน'],isaac:['ทุกครั้งที่โจมตีสุ่ม 1 ใน 3 รูปแบบ (ตั้งค่าโอกาสได้ในหน้าปรับค่าทดลอง ค่าเริ่มต้น: ปกติ 57% / เฉียดจุดตาย 33% / จุดตาย 10%)','โจมตีปกติ: ดาเมจเท่า POWER','โจมตีเฉียดจุดตาย: ดาเมจ 2 เท่าของ POWER ปัจจุบัน','โจมตีจุดตาย (10%): สั่งตาย ศัตรูตายหลังผ่านไป 3 เทิร์น'],alucard:['โจมตีได้ 2 ครั้งใน 1 เทิร์น (ครั้งที่ 2 ต่อจากครั้งแรกทันที)','เมื่อโจมตี ศัตรูติดสถานะ "เลือดไหล" (🩸) เสีย HP 5% ของ HP สูงสุดของศัตรู ต้นเทิร์นทุกเทิร์น จนกว่าจะถูกลบสถานะหรือตาย'],gengar:['เมื่อติดสถานะด้านลบ (ชา / ผนึก / สายฟ้า / สับสน / เผาไหม้ / เข้าสิง) จะล้างสถานะนั้นทันที','ทุกสถานะที่ล้างได้ เพิ่ม POWER ให้ตัวเอง 10% ของ POWER ปัจจุบัน'],luffy:['ทุกครั้งที่โจมตี ศัตรูจะติดสถานะ "เข้าสิง" (ป้าย 👻)','ในเทิร์นถัดไปของศัตรู มีโอกาส 50% ที่จะโจมตีตัวเอง (ดาเมจเท่า POWER ของตัวเอง) แทนการโจมตีปกติ','สถานะหมดลงเมื่อถึงเทิร์นของศัตรู ไม่ว่าจะโจมตีตัวเองหรือไม่'],hutao:['ทุกครั้งที่โจมตี เรียกผีเมาช่วยโจมตี สุ่ม 1 ใน 2 รูปแบบ (50%)','เผาไหม้: ติดสถานะเผาไหม้ เสีย HP ต้นเทิร์นของศัตรู 15% ของ HP สูงสุดของศัตรู นาน 3 เทิร์น','ผีตัวเล็ก: โจมตี 2 ครั้ง ครั้งละ 10% ของ POWER ปัจจุบัน'],ichigo:['ทุกๆ 2 เทิร์น การโจมตีครั้งถัดไป (ครั้งที่ 3, 6, 9 …) สร้างดาเมจ 3 เท่าของ POWER ปัจจุบัน','การ์ดจะมีป้าย "พลังสะสม ×3" เมื่อการโจมตีครั้งหน้าคือท่าไม้ตาย (เกตสึกะ เท็นโช)'],megumi:['สุนัข (Divine Dogs): สร้างดาเมจ 50% ของ POWER ปัจจุบัน','นกฮูก (Nue): มีโอกาส 50% ทำให้ศัตรูติดชาในเทิร์นนั้น','กบ (Toad): ลิ้นพันศัตรู ทำให้โจมตีได้อีกครั้ง','คชสาร (Max Elephant): สร้างดาเมจ 2 เท่าของ POWER ปัจจุบัน','กระต่าย (Rabbit Escape): มีโอกาส 50% ทำให้ศัตรูโจมตีไม่โดน','ทุกเทิร์นสุ่มเรียก 1 ตัว ตัวละ 20% เท่ากัน'],kurapika:['นิ้วโป้ง: ฟื้นฟู HP 10% ของ HP ทั้งหมด','นิ้วชี้: ขโมยความสามารถของการ์ดศัตรูมาใช้ในเทิร์นนั้น','นิ้วกลาง: ผนึกความสามารถของศัตรู (ใช้ไม่ได้ในเทิร์นของเขา)','นิ้วนาง: ลบสถานะด้านลบ','นิ้วก้อย: โจมตีซ้ำ ดาเมจ 2 เท่าของ POWER','ทุกครั้งที่โจมตีสุ่มนิ้วที่ใช้ นิ้วละ 20% เท่ากัน']};
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
  if(m){const[i,d]=m.dataset.mv.split(',').map(Number),j=i+d;if(j>=0&&j<SV.team.length){[SV.team[i],SV.team[j]]=[SV.team[j],SV.team[i]];save();if(window.Online&&Online.srv)Online.srv.syncTeam();renderTeam()}}
  if(r){SV.team.splice(+r.dataset.rm,1);save();if(window.Online&&Online.srv)Online.srv.syncTeam();renderTeam()}
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
let stageTok=null;   /* token ด่านที่เซิร์ฟเวอร์ออกให้ตอนเริ่มสู้ */
async function startStage(st){
  stageTok=null;
  if(sMode==='hw'&&!hwOpen())return toast('อีเว้นท์จบแล้ว');
  const team=SV.team.filter(x=>SV.owned.includes(x));
  if(!team.length){toast('ต้องมีการ์ดในทีมอย่างน้อย 1 ใบ');return go('team')}
  if(srvOn()&&sMode!=='hw'){const b=await sc('battle_begin',{p_stage:st.id});if(!b.ok)return toast(srvMsg(b));stageTok=b.token}
  clearAuto();setAutoBtn();Battle.start({auto:true,a:team,la:team.map(clv),sa:team.map(cstar),b:st.enemy,lb:st.elv,title:st.name,first:$('#first').value==='b'?'b':'a',
    onExit:()=>go(sGo()),onEnd:r=>finishStage(st,r)});
}
async function finishStage(st,r){
  const L=stageList(),idx=L.indexOf(st),next=L[idx+1];
  if(!r.win){
    modal(`<h2>แพ้แล้ว…</h2><p>ลองปรับลำดับการ์ด หรือสุ่มการ์ดใหม่จากตู้กาชาแล้วกลับมาสู้อีกครั้ง</p>${SV.auto!=='off'?'<p class="mute">ออโต้หยุดเพราะแพ้ — จัดทีมหรือลองใหม่ได้เลย</p>':''}<div class="two"><button id="rAgain">ลองใหม่</button><button class="sec" id="rTeam">จัดทีม</button><button class="sec" id="rBack">กลับ</button></div>`);
    $('#rAgain').onclick=()=>{closeModal();startStage(st)};$('#rTeam').onclick=()=>go('team');$('#rBack').onclick=()=>go(sGo());return}
  let first=!SV.cleared[st.id],rw=first?st.first:st.repeat,up;const lv0=lvOf(SV.exp),au=SV.auto!=='off',nxt=SV.auto==='next'&&next;
  if(stageTok&&srvOn()){   /* ออนไลน์: เซิร์ฟเวอร์เป็นคนให้รางวัล (ค่าจากตาราง stage_defs) */
    const tk=stageTok;stageTok=null;
    const c=await sc('battle_claim',{p_token:tk,p_win:true,p_turns:r.turns||1});
    if(!c.ok){modal(`<h2>เซิร์ฟเวอร์ไม่รับผลด่าน</h2><p>${srvMsg(c)}</p><div class="two"><button id="rAgain">ลองใหม่</button><button class="sec" id="rBack">กลับ</button></div>`);
      $('#rAgain').onclick=()=>{closeModal();startStage(st)};$('#rBack').onclick=()=>go(sGo());return}
    first=!!c.first;rw={coins:c.coins,exp:c.exp};up=!!c.levelUp;if(SV.coins>=COIN_CAP)toast('⚠ เงินถึงขีดจำกัดแล้ว (10T)');
  }else{SV.coins+=rw.coins;SV.exp+=rw.exp;SV.cleared[st.id]=true;save();up=lvOf(SV.exp)>lv0}
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
  const RT=GACHA.rarTotal||{};
  pool.forEach(id=>{if(RT[CARDS[id].rar]!==undefined)return;const v=id===b.c?R.up[id]:R.base[id];if(v!==undefined){r[id]=v;used+=v}});
  for(const rar of Object.keys(RT)){   /* ระดับที่กำหนดเรทรวมไว้ (UR / USR) */
    const ids=pool.filter(id=>CARDS[id].rar===rar);if(!ids.length)continue;const T=RT[rar],upIn=ids.includes(b.c)&&ids.length>1;
    ids.forEach(id=>{r[id]=upIn?(id===b.c?T*GACHA.rarUp:T*(1-GACHA.rarUp)/(ids.length-1)):T/ids.length});used+=T}
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
  const b=curB(),r=bannerRates(b),r0=hw?r:bannerRates({c:'',s:[]});lastSlot=curSlot();
  $('#bBoost').textContent=hw?'การ์ดฮาโลวีนสุดพิเศษ!':'การ์ดตรงกลาง เรทออกเพิ่มขึ้น!';
  $('#bCards').innerHTML=[b.s[0],b.c,b.s[1]].filter(Boolean).map(id=>{const main=id===b.c,c=CARDS[id],upd=main&&(hw||Math.abs(r[id]-r0[id])>1e-9);
    return `<div class="bc${main?' main':''}" style="--c:${RARITY[c.rar]};--k:${main?1:.8}"><div class="bcimg"><img src="${c.img}" alt="${c.name}">${upd?'<span class="rib">เรทอัป ⬆</span>':''}${SV.owned.includes(id)?`<span class="own">มี ×${SV.count[id]}</span>`:''}</div><b>${c.name}</b><div>${rarTag(id)} <em>${pct(r[id])}</em>${upd&&!hw?` <small class="was">ปกติ ${pct(r0[id])}</small>`:''}</div></div>`}).join('');
  $('#bDesc').textContent=hw?'ตู้พิเศษอีเว้นท์ฮาโลวีน! ใช้ลูกอม 🍬 สุ่ม · การ์ดอีเว้นท์รวม '+HW.eventRate+'% · การันตีที่ '+HW.pity+' ครั้ง (สุ่มมาแล้ว '+SV.evg.pity+'/'+HW.pity+') · แตะแบนเนอร์เพื่อดูเรททั้งหมด':'ใช้เงินสุ่มการ์ดใหม่! การ์ดตรงกลางมีโอกาสออกสูงกว่าปกติ · การันตี UR ที่ '+GACHA.pityUR+' ครั้ง (ตอนนี้ '+((SV.gp&&SV.gp.ur)||0)+') · USR ที่ '+GACHA.pityUSR+' ครั้ง (ตอนนี้ '+((SV.gp&&SV.gp.usr)||0)+') · แตะแบนเนอร์เพื่อดูเรททั้งหมด';
  updTimer();
  $('#pullBtn').textContent='สุ่ม 1 ครั้ง · '+gico()+gcost(1);$('#pull10Btn').textContent='สุ่ม 10 ครั้ง · '+gico()+gcost(10);$('#pull50Btn').textContent='สุ่ม 50 ครั้ง · '+gico()+gcost(50);
  const off=hw&&!hwOpen();$('#pullBtn').disabled=pulling||off||gbal()<gcost(1);$('#pull10Btn').disabled=pulling||off||gbal()<gcost(10);$('#pull50Btn').disabled=pulling||off||gbal()<gcost(50);
  $('#autoSell').checked=SV.autoSell;
}
function roll(){
  const b=curB(),hw=gMode==='hw';
  if(hw){const E=SV.evg;E.pity=(E.pity||0)+1;if(E.pity>=HW.pity){E.pity=0;return b.c}}   /* การันตี: ครบ HW.pity ครั้งได้การ์ดหน้าตู้ */
  const rates=bannerRates(b);
  const wpick=ids=>{const e=ids.map(id=>[id,rates[id]||0]),tot=e.reduce((s,x)=>s+x[1],0);if(!tot)return ids[Math.floor(Math.random()*ids.length)];let x=Math.random()*tot,p=e[0][0];for(const [id,w] of e){if((x-=w)<0){p=id;break}}return p};
  let pick=null,P=null;
  if(!hw){   /* การันตี UR / USR */
    P=SV.gp=SV.gp||{ur:0,usr:0};P.ur=(P.ur||0)+1;P.usr=(P.usr||0)+1;
    const pk=r=>GACHA.pool.filter(id=>CARDS[id].rar===r);
    if(P.usr>=GACHA.pityUSR&&pk('USR').length)pick=wpick(pk('USR'));
    else if(P.ur>=GACHA.pityUR&&pk('UR').length)pick=wpick(pk('UR'));
  }
  if(!pick)pick=wpick(Object.keys(rates));
  if(P){const r=CARDS[pick].rar;if(r==='USR'){P.usr=0;P.ur=0}else if(r==='UR')P.ur=0}
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
async function pull(n){
  const hw=gMode==='hw',cost=gcost(n);
  if(pulling)return;if(hw&&!hwOpen())return toast('อีเว้นท์จบแล้ว');if(gbal()<cost)return toast(hw?'ลูกอมไม่พอ':'เงินไม่พอ');
  let res=[];
  if(!hw&&srvOn()){   /* ตู้หลักออนไลน์: สุ่ม/การันตี/ราคา คำนวณที่เซิร์ฟเวอร์ */
    pulling=true;
    const r=await sc('gacha_pull',{p_n:n});
    if(!r.ok){pulling=false;return toast(srvMsg(r))}
    res=r.results||[];onSpend(cost);
  }else{
    if(hw)SV.candy-=cost;else{SV.coins-=cost;onSpend(cost)}for(let i=0;i<n;i++)res.push(grant(roll()));save();hud();
  }
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
    modal(`<div class="wide"><h2>ผลการสุ่ม ×${n}</h2><div class="r10${n>10?' r50':''}">${res.map(r=>{const c=CARDS[r.id];return `<div class="rt10" style="--c:${RARITY[c.rar]}"><img src="${c.img}" alt="${c.name}"><b>${c.name}</b><small>${r.dup?(r.sold?'+💰'+r.back:'เข้าคลัง'):'<span class="new">NEW!</span>'}</small></div>`}).join('')}</div><p>การ์ดใหม่ ${nw} ใบ${back?` · ขายซ้ำอัตโนมัติได้ 💰${back}`:''}${gMode==='hw'?` · การันตีการ์ดอีเว้นท์อีก ${HW.pity-SV.evg.pity} ครั้ง`:''}</p><div class="two"><button id="pAgain" ${gbal()<gcost(n)?'disabled':''}>สุ่ม ×${n} อีก (${gico()}${gcost(n)})</button><button class="sec" id="pClose">ปิด</button></div></div>`);
  }
  $('#pAgain').onclick=again;$('#pClose').onclick=()=>{closeModal();renderGacha()};
}
function showRates(){
  const b=curB(),r=bannerRates(b);
  modal(`<div class="wide"><h2>รายละเอียดและเรท</h2><p>${gMode==='hw'?'':`เรทอัปตอนนี้: <b>${CARDS[b.c].name}</b> (${pct(bannerRates({c:'',s:[]})[b.c])} → ${pct(r[b.c])}) `}${gMode==='hw'?'ตู้ฮาโลวีน (เฉพาะช่วงอีเว้นท์) · ใช้ลูกอม 🍬 · การ์ดอีเว้นท์รวม '+HW.eventRate+'% (การ์ดหน้าตู้ '+pct(HW.eventRate*HW.upShare)+') · การันตีที่ '+HW.pity+' ครั้ง (สุ่มมาแล้ว '+SV.evg.pity+')':'เปลี่ยนทุก 1 ชั่วโมงตามเวลาไทย · การ์ดระดับ LTD ยังไม่เปิดให้สุ่ม'} · การ์ดซ้ำเก็บเข้าคลังหรือขายคืนเงิน (${Object.entries(GACHA.dup).map(([k,v])=>k+' 💰'+v).join(' · ')})</p>
    <div class="pool">${gcfg().pool.map(id=>`<div class="pt${SV.owned.includes(id)?'':' lk'}" style="--c:${CARDS[id].color}"><div class="pi"><img src="${CARDS[id].img}" alt="${CARDS[id].name}">${SV.owned.includes(id)?'':'<span>🔒</span>'}</div><b>${CARDS[id].name}</b><div>${rarTag(id)} <em>${pct(r[id])}${id===b.c?' ⬆':''}</em></div></div>`).join('')}</div><button id="rClose" style="margin-top:12px">ปิด</button></div>`);
  $('#rClose').onclick=closeModal;
}
$('#pullBtn').onclick=()=>pull(1);$('#pull10Btn').onclick=()=>pull(10);$('#pull50Btn').onclick=()=>pull(50);$('#rateBtn').onclick=showRates;
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
  $('#mdInf').textContent='เวฟสูงสุด '+((SV.inf&&SV.inf.best)||0);
}
/* ---------- เควสตัวละคร (อยู่ในหน้า "เควส" แท็บแรก) ----------
   แต่ละเควส = ทำครบทุกเงื่อนไข → กดรับการ์ดรางวัล · ความคืบหน้าเก็บใน SV.cq:
   kills = จำนวนครั้งที่กิลกาเมชสังหารศัตรู (นับทุกโหมดยกเว้นออนไลน์) · chal = จำนวนครั้งที่ชนะชาเลนจ์ · done = เควสที่รับรางวัลแล้ว */
const cqN=k=>(SV.cq&&SV.cq[k])||0;
/* สถิติเควส: heal = HP ที่ทีมเราฟื้นทุกวิธี · dmg = ดาเมจรวมที่ทำใส่ศัตรู (นับทุกโหมดยกเว้นออนไลน์ เริ่มนับตั้งแต่อัปเดตนี้) */
function onSpend(n){SV.cq=SV.cq||{};SV.cq.spent=(SV.cq.spent||0)+(n||0);SV.cq.sspent=(SV.cq.sspent||0)+(n||0)}   /* เงินที่ใช้ไปรวม (กาชา · อัปเลเวล · อีโว) นับตั้งแต่อัปเดตนี้ */
function onGuardHook(n){SV.cq=SV.cq||{};SV.cq.guard=(SV.cq.guard||0)+(n||1)}   /* ป้องกันสถานะผิดปกติสำเร็จ (นับต่อสถานะ) */
function onStatHook(heal,dmg){SV.cq=SV.cq||{};if(heal)SV.cq.heal=(SV.cq.heal||0)+heal;if(dmg){SV.cq.dmg=(SV.cq.dmg||0)+dmg;SV.cq.kdmg=(SV.cq.kdmg||0)+dmg;SV.cq.sdmg=(SV.cq.sdmg||0)+dmg}}
const totalCards=()=>Object.values(SV.count||{}).reduce((t,n)=>t+(n||0),0);
function onAtkHook(id){if(id==='garomon')SV.pma=(SV.pma||0)+1;if(id==='rocklee')SV.rla=(SV.rla||0)+1}   /* ร็อค ลี (R) โจมตีสะสม */
function onCritHook(id){if(id==='rocklee')SV.rlc=(SV.rlc||0)+1}   /* ร็อค ลี (R) โจมตีติดคริติคอลสะสม */   /* สัตว์ประหลาดที่สมบูรณ์แบบ กาโร่ โจมตี (ไม่นับโต้กลับ) */
function onCounterHook(id){if(id==='garomon')SV.pmc=(SV.pmc||0)+1}   /* ... โจมตีโต้กลับ */
function onJwHook(){SV.jwc=(SV.jwc||0)+1}   /* ซอง จิน วู ใช้ความสามารถ (HP เหลือ 1) สะสม → เงื่อนไขอีโว */
function onDodgeHook(id){SV.cq=SV.cq||{};SV.cq.dodge=(SV.cq.dodge||0)+1;   /* หลบหลีกทุกการ์ด (เควสตัวละคร คาบูโตะ) */
  if(id==='garo')SV.gd=(SV.gd||0)+1;if(id==='garored')SV.gmd=(SV.gmd||0)+1;if(id==='garomon')SV.pmd=(SV.pmd||0)+1}   /* garored (ลูกครึ่งสัตว์ประหลาด) หลบหลีก → เงื่อนไขอีโว สัตว์ประหลาดที่สมบูรณ์แบบ */
/* กาโร่ (R) หลบหลีกสำเร็จ (เงื่อนไขอีโว ลูกครึ่งสัตว์ประหลาด) */
function onKillHook(id,boss){if(boss){SV.cq=SV.cq||{};SV.cq.bosskill=(SV.cq.bosskill||0)+1}   /* สังหารบอส (เควสตัวละคร คาบูโตะ) */
  SV.kills=(SV.kills||0)+1;if(id==='garo')SV.gk=(SV.gk||0)+1;if(id==='garored')SV.gmk=(SV.gmk||0)+1;if(id==='garomon')SV.pmk=(SV.pmk||0)+1;if(id==='rocklee')SV.rlk=(SV.rlk||0)+1;   /* นับสังหารศัตรูรวม (ใช้เป็นเงื่อนไขอีโว จอมมาร ริมุรุ) */
  if(id!=='gil')return;SV.cq=SV.cq||{};SV.cq.kills=(SV.cq.kills||0)+1}
const CQ=[{id:'gilq',card:'gilqueen',name:'ราชินีแห่งวีรชน กิลกาเมช',
  reqs:[{t:'ใช้กิลกาเมชสังหารศัตรู',unit:'ครั้ง',need:1000,key:'kills',cur:()=>cqN('kills')},
        {t:'มีการ์ดกิลกาเมช',unit:'ใบ',need:100,cur:()=>SV.count.gil||0},
        {t:'ลงชาเลนจ์ให้ชนะ',unit:'ครั้ง',need:500,key:'chal',cur:()=>cqN('chal')}]},
  {id:'cc',card:'cc',name:'ซีซี',
  reqs:[{t:'ฟื้นฟู HP ด้วยความสามารถอะไรก็ได้',unit:'HP',need:100000,key:'heal',cur:()=>Math.floor(cqN('heal'))},
        {t:'สร้างความเสียหายรวม',unit:'ดาเมจ',need:1000000,key:'dmg',cur:()=>Math.floor(cqN('dmg'))},
        {t:'มีการ์ดรวม',unit:'ใบ',need:5000,cur:totalCards}]},
  {id:'slime',card:'slime',name:'ริมุรุ ร่างสไลม์',
  reqs:[{t:'ใช้เงิน',unit:'💰',need:1000000,key:'spent',cur:()=>Math.floor(cqN('spent'))}]},
  {id:'kabuto',card:'kabuto',name:'มาสไรเดอร์ คาบูโตะ',
  reqs:[{t:'ใช้การ์ดหลบหลีก',unit:'ครั้ง',need:10000,key:'dodge',cur:()=>cqN('dodge')},
        {t:'สังหารบอส',unit:'ตัว',need:1000,key:'bosskill',cur:()=>cqN('bosskill')},
        {t:'ทำดาเมจสะสม',unit:'ดาเมจ',need:1000000,key:'kdmg',cur:()=>Math.floor(cqN('kdmg'))}]},
  {id:'shichi',card:'shichi',name:'สองอัจฉริยะแห่งตระกูลอุจิวะ ชิซุยและอิทาจิ',
  reqs:[{t:'ป้องกันสถานะผิดปกติ',unit:'ครั้ง',need:1000,key:'guard',cur:()=>cqN('guard')},
        {t:'ทำดาเมจสะสม',unit:'ดาเมจ',need:1000000,key:'sdmg',cur:()=>Math.floor(cqN('sdmg'))},
        {t:'ใช้เงิน',unit:'💰',need:1000000000,key:'sspent',cur:()=>Math.floor(cqN('sspent'))},
        {t:'มีการ์ดสะสมรวม',unit:'ใบ',need:10000,cur:totalCards}]}];
/* เควสทำซ้ำได้ไม่จำกัด (ไว้เก็บการ์ดซ้ำเพื่ออัปดาว): done[id] = จำนวนครั้งที่รับแล้ว (เซฟเก่าที่เป็น true นับเป็น 1 ครั้ง)
   ตัวนับสะสม (key) จะถูกหักตามจำนวนที่ใช้ เหลือส่วนเกินไว้รอบหน้า · เงื่อนไข "มีการ์ด" ไม่ถูกหัก */
const cqTimes=q=>{const d=SV.cq&&SV.cq.done&&SV.cq.done[q.id];return d===true?1:(+d||0)};
const cqReady=q=>q.reqs.every(r=>r.cur()>=r.need);
function renderCharQ(){
  const done=CQ.reduce((t,q)=>t+cqTimes(q),0);
  $('#thInfo').textContent='รับรางวัลแล้วรวม '+done+' ครั้ง · ทำซ้ำได้เรื่อยๆ (ได้การ์ดซ้ำไว้อัปดาว)';
  $('#thList').innerHTML=CQ.map(q=>{
    const c=CARDS[q.card],n=cqTimes(q),ok=cqReady(q);
    return `<div class="tcard cq" style="--c:${c.color}">
      <div class="thd"><div><div class="no">เควสตัวละคร</div><h2>${c.name}</h2></div><span class="diff d-hell">${c.rar}</span></div>
      <div class="cqrw"><img src="${c.img}" alt="${c.name}"><div class="mute">รางวัล: การ์ด <b>${c.name}</b><br>POWER ${c.power} · HP ${c.hp}<br>รับแล้ว <b>${n}</b> ครั้ง</div></div>
      <ul class="cqreq">${q.reqs.map(r=>{const v=Math.min(r.cur(),r.need),p=v/r.need*100;return `<li class="${v>=r.need?'ok':''}"><span>${v>=r.need?'✔':'✖'} ${r.t}</span><b>${v.toLocaleString()} / ${r.need.toLocaleString()} ${r.unit}</b><i class="cqbar"><u style="width:${p}%"></u></i></li>`}).join('')}</ul>
      <button data-cq="${q.id}" ${ok?'':'disabled'}>${ok?'🎁 รับการ์ด'+(n?' (ซ้ำ)':''):'ยังทำไม่ครบเงื่อนไข'}</button>${q.reqs.some(r=>r.key)?'<div class="mute" style="font-size:.78em;margin-top:6px">ความคืบหน้าที่นับสะสมจะถูกหักตามที่ใช้ แล้วทำรอบต่อไปได้ (ส่วนเกินเก็บไว้ให้) · เงื่อนไข "มีการ์ด" ไม่ถูกหัก</div>':''}</div>`}).join('');
}
$('#thList').onclick=e=>{const b=e.target.closest('[data-cq]');if(!b||b.disabled)return;
  const q=CQ.find(x=>x.id===b.dataset.cq);if(!q||!cqReady(q))return;
  SV.cq=SV.cq||{};SV.cq.done=SV.cq.done||{};SV.cq.done[q.id]=cqTimes(q)+1;
  q.reqs.forEach(r=>{if(r.key)SV.cq[r.key]=Math.max(0,cqN(r.key)-r.need)});   /* หักตัวนับที่ใช้ไป เหลือส่วนเกินไว้รอบหน้า */
  if(SV.owned.includes(q.card))SV.count[q.card]=(SV.count[q.card]||1)+1;else{SV.owned.push(q.card);SV.count[q.card]=1}
  save();hud();renderCharQ();
  modal(`<h2>ผ่านเควส! 🎉</h2><p>ได้รับการ์ด <b>${CARDS[q.card].name}</b>${cqTimes(q)>1?' (ครั้งที่ '+cqTimes(q)+' · ได้การ์ดซ้ำไว้อัปดาว)':''}</p><div class="reward"><img src="${CARDS[q.card].img}" alt="" style="max-height:34vh;border-radius:10px"></div><button id="cqOk">ตกลง</button>`);
  $('#cqOk').onclick=closeModal};

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
      <button data-ch="${c.id}">รับเควส</button></div>`}).join('');
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
  const CS=chalState(),live=ch.slot===chalKey(),first=live&&!CS.cleared[ch.id],rw=first?ch.first:ch.repeat;if(live)CS.cleared[ch.id]=true;SV.cq=SV.cq||{};SV.cq.chal=(SV.cq.chal||0)+1;save();const up=giveRw(rw);
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
async function claimLv(list){
  let coins=0;const cards=[];
  if(srvOn()){for(const l of list){if(SV.lvClaimed[l]||lvOf(SV.exp)<l)continue;const r=await sc('claim_level_reward',{p_lv:l});if(!r.ok){toast(srvMsg(r));break}
    const w=lvReward(l);coins+=r.coins||w.coins;if(w.card)cards.push(w.card)}}
  else list.forEach(l=>{if(SV.lvClaimed[l]||lvOf(SV.exp)<l)return;const r=lvReward(l);SV.lvClaimed[l]=true;SV.coins+=r.coins;coins+=r.coins;
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
$('#upList').onclick=async e=>{
  if(e.target.closest('[data-uppick]'))return openUpPicker();
  const tb=e.target.closest('[data-uptab]');if(tb){upTab=tb.dataset.uptab;return renderUp()}
  const sb=e.target.closest('[data-star]');
  if(sb){
    const id=sb.dataset.star,need=starCost(id);
    if(cstar(id)>=STAR_MAX)return;
    if(extra(id)<need)return toast('การ์ดซ้ำไม่พอ');
    if(srvOn()){const r=await sc('star_up',{p_card:id});if(!r.ok)return toast(srvMsg(r));renderUp(id);toast('⭐ '+CARDS[id].name+' → '+cstar(id)+' ดาว (ใช้การ์ดซ้ำ '+need+' ใบ)');return}
    SV.count[id]-=need;SV.star[id]=cstar(id)+1;save();hud();renderUp(id);
    toast('⭐ '+CARDS[id].name+' → '+cstar(id)+' ดาว (ใช้การ์ดซ้ำ '+need+' ใบ)');return;
  }
  const b=e.target.closest('[data-up]');if(!b)return;
  const[id,k]=b.dataset.up.split(','),r=upAffordable(id,+k);
  if(!r.k)return toast('เงินไม่พอ');
  if(srvOn()){const q=await sc('level_up',{p_card:id,p_n:r.k});if(!q.ok)return toast(srvMsg(q));onSpend(q.spent||0);renderUp(id);toast(CARDS[id].name+' → Lv.'+clv(id)+' (-💰'+(q.spent||0)+')');return}
  SV.coins-=r.c;onSpend(r.c);SV.lv[id]=clv(id)+r.k;save();hud();renderUp(id);
  toast(CARDS[id].name+' → Lv.'+clv(id)+' (-💰'+r.c+')');
};

/* ---------- คลังการ์ด / ขายการ์ดซ้ำ ---------- */
async function setAuto(v){if(srvOn()){const r=await sc('set_auto_sell',{p_on:v});if(!r.ok){toast(srvMsg(r));v=!!SV.autoSell;$('#autoSell').checked=v;$('#autoSell2').checked=v;return}}else{SV.autoSell=v;save()}$('#autoSell').checked=v;$('#autoSell2').checked=v;toast(v?'เปิดขายการ์ดซ้ำอัตโนมัติ':'การ์ดซ้ำจะเก็บเข้าคลัง')}
$('#autoSell').onchange=e=>setAuto(e.target.checked);$('#autoSell2').onchange=e=>setAuto(e.target.checked);
async function sell(id,n){
  n=Math.min(n,extra(id));if(n<=0)return toast('ต้องเก็บไว้อย่างน้อย 1 ใบ');
  if(srvOn()){const r=await sc('sell_dup',{p_card:id,p_n:n});if(!r.ok)return toast(srvMsg(r));renderSell();return toast('ขาย '+CARDS[id].name+' ×'+r.sold+' ได้ 💰'+r.got)}
  SV.count[id]-=n;SV.coins+=n*refund(id);save();hud();renderSell();toast('ขาย '+CARDS[id].name+' ×'+n+' ได้ 💰'+n*refund(id));
}
/* ขายการ์ด (เข้าจากหน้าจัดทีม) */
function renderSell(){
  $('#autoSell2').checked=SV.autoSell;
  const tot=SV.owned.reduce((s,id)=>s+extra(id)*refund(id),0),n=SV.owned.reduce((s,id)=>s+extra(id),0);
  $('#sellAll').textContent=n?`ขายการ์ดซ้ำทั้งหมด (${n} ใบ · 💰${tot})`:'ไม่มีการ์ดซ้ำให้ขาย';$('#sellAll').disabled=!n;
  const g=$('#sellList');g.innerHTML='';g.className='cgrid';   /* จัดวางแบบเดียวกับหน้าจัดทีม: ตารางการ์ดเต็มใบ */
  for(const id of SORTED.filter(k=>SV.owned.includes(k))){
    const c=CARDS[id],e=extra(id),d=document.createElement('div');d.className='ctile static';d.style.setProperty('--c',c.color);
    d.innerHTML=`<div class="cimg"><img src="${c.img}" alt="${c.name}"><span class="tag">มี ×${SV.count[id]}</span><button class="ibtn" data-info="${id}" aria-label="ดูความสามารถของ ${c.name}">i</button></div>
      <div class="cinfo"><b title="${c.name}">${c.name}</b><div class="cmeta">${rarTag(id)} <span>Lv.${clv(id)}</span> <em class="stars">${cstar(id)}★</em></div><div class="cstat">ราคาขาย 💰${refund(id)} / ใบ</div></div>
      <div class="cact"><button class="sec small" data-sell="${id},1" ${e?'':'disabled'}>ขาย 1 ใบ</button><button class="sec small" data-sell="${id},99" ${e?'':'disabled'}>ขายซ้ำทั้งหมด${e?' (+💰'+e*refund(id)+')':''}</button></div>`;
    g.appendChild(d);
  }
}
/* คลังไอเทม: ดูจำนวนวัตถุดิบ/ไอเทมที่มี */
function renderInv(){
  const keys=Object.keys(ITEMS),have=keys.reduce((s,k)=>s+itemN(k),0);
  $('#invSum').textContent='วัตถุดิบที่มี '+have+' ชิ้น · 💰 '+SV.coins.toLocaleString()+' · 🍬 '+(SV.candy||0).toLocaleString();
  const g=$('#invList');g.innerHTML='';g.className='cgrid';   /* จัดวางแบบเดียวกับหน้าจัดทีม: ตารางการ์ดเต็มใบ */
  for(const k of keys){
    const it=ITEMS[k],n=itemN(k),use=EVOS.filter(e=>e.need.items[k]),d=document.createElement('div');
    const note=use.length?'ใช้กับ: '+use.map(e=>CARDS[e.from].name+' → '+CARDS[e.to].name).join(', '):it.desc;
    d.className='ctile static'+(n?'':' locked');d.style.setProperty('--c',it.color);
    d.innerHTML=`<div class="cimg"><img src="${it.img}" alt="${it.name}"><span class="tag">มี ×${n}</span></div>
      <div class="cinfo"><b title="${it.name}">${it.name}</b><div class="cmeta"><i class="rar" style="--r:${RARITY[it.rar]}">${it.rar}</i> <span>วัตถุดิบวิวัฒนาการ</span></div><div class="cdesc" title="${note.replace(/"/g,'&quot;')}">${note}</div></div>
      <div class="cact"><button class="sec small" data-go="evo" data-tab="evo">ไปเควสพัฒนา</button></div>`;
    g.appendChild(d);
  }
}
$('#sellList').onclick=e=>{const ib=e.target.closest('[data-info]');if(ib){showInfo(ib.dataset.info);return}const b=e.target.closest('[data-sell]');if(b){const[id,n]=b.dataset.sell.split(',');sell(id,+n)}};
$('#sellAll').onclick=async()=>{
  if(srvOn()){let t=0;for(const id of [...SV.owned]){const n=extra(id);if(!n)continue;const r=await sc('sell_dup',{p_card:id,p_n:n});if(r.ok)t+=r.got||0;else{toast(srvMsg(r));break}}renderSell();return toast('ขายการ์ดซ้ำทั้งหมด ได้ 💰'+t)}
  let t=0;SV.owned.forEach(id=>{const n=extra(id);if(n){t+=n*refund(id);SV.count[id]-=n}});SV.coins+=t;save();hud();renderSell();toast('ขายการ์ดซ้ำทั้งหมด ได้ 💰'+t)};

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
  $('#evEndless').textContent='เวฟสูงสุด '+((SV.endless&&SV.endless.best)||0);
}
const soon=()=>toast('เร็วๆ นี้ 🎃');
$('#evBtnStages').onclick=()=>EVENT_OPEN?go('evboss'):soon();
$('#evBtnGacha').onclick=()=>EVENT_OPEN?go('hwgacha'):soon();
$('#evBtnEndless').onclick=()=>EVENT_OPEN?go('endless'):soon();

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


/* ---------- ด่านไม่มีที่สิ้นสุด (อีเว้นท์) ----------
   เวฟต่อเวฟ: ผ่านเวฟละ 🍬 candy อัน · ทุก `every` เวฟ ทอยลุ้นการ์ด drop (baseRate% + riskRate% ต่อชั้น "บัฟศัตรู")
   หลังชนะแต่ละเวฟเลือก 1 อย่าง: POWER ทีม / HP ทีม / ศัตรูแกร่งขึ้น (แลกโอกาสได้การ์ดสูงขึ้น) — ปรับตัวเลขได้ที่ EL */
const EL={drop:'konan',candy:1,every:10,dropEvery:1,   /* ทอยลุ้นการ์ดทุก dropEvery เวฟ (every = เวฟบอส) */
  baseRate:.1,riskRate:.1,maxRate:5,   /* อัตรา = % ต่อการทอย */
  buffP:.15,buffH:.15,riskMul:.1,   /* บัฟทีม +15% ต่อครั้ง · ศัตรู +10% (POWER และ HP) ต่อชั้น */
  lvPer:1.5,bossMul:1.3,maxTurns:50};
const elState=()=>{SV.endless=SV.endless||{best:0,run:null};return SV.endless};
const elRate=run=>Math.min(EL.maxRate,EL.baseRate+EL.riskRate*(run?run.buf.risk:0));
const elRateTxt=r=>(Math.round(r*100)/100)+'%';
function elEnemies(w){
  const tier=Math.min(6,Math.floor((w-1)/8)),boss=w%EL.every===0;
  const n=Math.min(4,(w<=4?1:w<=12?2:w<=30?3:4)+(boss&&w>4?1:0));
  const pool=Object.keys(CARDS).filter(id=>!CARDS[id].evo&&!CARDS[id].endless&&rIdx(CARDS[id].rar)<=tier),ids=[];
  while(ids.length<Math.min(n,pool.length)){const c=pool[Math.floor(Math.random()*pool.length)];if(!ids.includes(c))ids.push(c)}
  const lv=Math.max(1,Math.round(1+(w-1)*EL.lvPer*(boss?EL.bossMul:1)));
  return{ids,lv,boss};
}
function renderEndless(){
  const E=elState(),run=E.run,team=SV.team.filter(x=>SV.owned.includes(x)),c=CARDS[EL.drop],open=hwOpen(),own=SV.owned.includes(EL.drop);
  const rate=elRate(run||{buf:{risk:0}}),b=run?run.buf:{p:0,h:0,risk:0};
  $('#elRaid').innerHTML=`<div class="rboss"><img src="${c.img}" alt="${c.name}" style="border-color:#b48cff;box-shadow:0 0 44px #b48cff77,0 14px 40px #000a"></div>
  <div class="rinfo"><h2>♾ ด่านไม่มีที่สิ้นสุด</h2>
    <div class="rhpt"><b>${run?'เวฟที่ '+run.wave:'ยังไม่ได้เริ่มรอบ'}</b><span>เวฟสูงสุด ${E.best}${run?' · ได้ลูกอมรอบนี้ 🍬'+run.candy:''}</span></div>
    <div class="rmeta"><span>⚔ POWER ทีม +${Math.round(b.p*100)}%</span><span>❤ HP ทีม +${Math.round(b.h*100)}%</span><span>☠ ศัตรู +${Math.round(b.risk*EL.riskMul*100)}%</span></div>
    <div class="myteam"><span>ทีมของคุณ</span><div>${team.length?team.map(t=>`<img class="th" src="${CARDS[t].img}" alt="${CARDS[t].name}">`).join(''):'<small>ยังไม่มีการ์ดในทีม</small>'}</div><button class="sec small" data-go="team">จัดทีม</button></div>
    <div class="two"><button id="elGo">${!open?'อีเว้นท์จบแล้ว':run?(run.pick?'เลือกบัฟเวฟถัดไป':'สู้เวฟ '+run.wave+' ต่อ'):'เริ่มรอบใหม่'}</button>${run?'<button class="sec" id="elQuit">ยอมแพ้รอบนี้</button>':''}</div>
  </div>`;
  $('#elGo').disabled=!open||!team.length;
  $('#elGo').onclick=()=>{if(!hwOpen())return toast('อีเว้นท์จบแล้ว');const r=elState().run;if(!r)startEndlessRun();else if(r.pick)elPickModal();else startEndlessBattle()};
  if(run)$('#elQuit').onclick=()=>{elEnd(true)};
}
function startEndlessRun(){
  const team=SV.team.filter(x=>SV.owned.includes(x));if(!team.length){toast('ต้องมีการ์ดในทีมอย่างน้อย 1 ใบ');return go('team')}
  elState().run={wave:1,buf:{p:0,h:0,risk:0},candy:0,pick:false,rolled:false};save();startEndlessBattle();
}
function startEndlessBattle(){
  const E=elState(),run=E.run,team=SV.team.filter(x=>SV.owned.includes(x));
  if(!team.length){toast('ต้องมีการ์ดในทีมอย่างน้อย 1 ใบ');return go('team')}
  const en=elEnemies(run.wave),b=run.buf;
  clearAuto();
  Battle.start({auto:false,a:team,la:team.map(clv),sa:team.map(cstar),b:en.ids,lb:en.ids.map(()=>en.lv),
    mulA:{p:1+b.p,h:1+b.h},mulB:{p:1+b.risk*EL.riskMul,h:1+b.risk*EL.riskMul},maxTurns:EL.maxTurns,first:'a',
    title:'ไม่มีที่สิ้นสุด · เวฟ '+run.wave+(en.boss?' (บอส)':'')+' · ศัตรู Lv.'+en.lv,
    onExit:()=>go('endless'),onEnd:r=>finishEndlessWave(r,run.wave)});
}
function finishEndlessWave(r,w){
  const E=elState(),run=E.run;if(!run||run.wave!==w)return;
  if(!r.win){   /* แพ้ / หมดเวลา → จบรอบ */
    elEnd(false,r);return}
  SV.candy+=EL.candy;run.candy+=EL.candy;E.best=Math.max(E.best,w);run.pick=true;
  let rollHtml='';
  if(w%EL.dropEvery===0&&!run.rolled){
    run.rolled=true;const rate=elRate(run),got=Math.random()*100<rate;
    if(got){const g=grant(EL.drop),c=CARDS[EL.drop];
      rollHtml=`<div class="dropbox"><img src="${c.img}" alt="${c.name}"><div><div class="new">🎉 ได้การ์ด ${c.name}!</div><small>${g.dup?(g.sold?'ซ้ำ ขายคืน 💰'+g.back:'การ์ดซ้ำ +1'):'การ์ดใหม่!'}</small></div></div>`}
    else rollHtml=`<p class="mute">🎲 ทอยลุ้น ${CARDS[EL.drop].name} (${elRateTxt(rate)}) · ไม่ได้ในรอบนี้</p>`;
  }
  save();hud();elPickModal(`<h2>เวฟ ${w} ผ่าน! 🎃</h2><div class="reward"><div>🍬 +${EL.candy}</div></div>${rollHtml}`);
}
function elPickModal(head){
  const run=elState().run;if(!run)return go('endless');
  const b=run.buf,w=run.wave;
  head=head||`<h2>เวฟ ${w} ผ่านแล้ว</h2>`;
  modal(`${head}<p class="mute">เลือกบัฟสำหรับเวฟที่ ${w+1}</p>
    <div class="two">
      <button class="elopt" data-b="p"><b>⚔ POWER ทีม +${Math.round(EL.buffP*100)}%</b><small>ตอนนี้ +${Math.round(b.p*100)}%</small></button>
      <button class="elopt" data-b="h"><b>❤ HP ทีม +${Math.round(EL.buffH*100)}%</b><small>ตอนนี้ +${Math.round(b.h*100)}%</small></button>
      <button class="elopt risk" data-b="r"><b>☠ ศัตรูแกร่งขึ้น +${Math.round(EL.riskMul*100)}%</b><small>โอกาสได้ ${CARDS[EL.drop].name} ${elRateTxt(elRate(run))} → <b>${elRateTxt(elRate({buf:{risk:b.risk+1}}))}</b></small></button>
    </div><div class="two" style="margin-top:10px"><button class="sec small" id="elLater">พักไว้ก่อน (กลับ)</button></div>`);
  $$('.elopt',$('#mdlBody')).forEach(x=>x.onclick=()=>{
    const k=x.dataset.b;if(k==='p')b.p+=EL.buffP;else if(k==='h')b.h+=EL.buffH;else b.risk++;
    run.wave++;run.pick=false;run.rolled=false;save();closeModal();startEndlessBattle()});
  $('#elLater').onclick=()=>go('endless');
}
function elEnd(quit,r){
  const E=elState(),run=E.run;if(!run)return go('endless');
  const cleared=run.wave-1,candy=run.candy;E.run=null;save();hud();
  modal(`<h2>${quit?'จบรอบ':'การ์ดพ่ายแพ้…'}</h2><p>${quit?'ยอมแพ้':(r&&r.timeout?'หมดเวลา':'แพ้ที่')} เวฟที่ <b>${run.wave}</b> · ผ่านไปแล้ว <b>${cleared}</b> เวฟ</p>
    <div class="reward"><div>🍬 +${candy.toLocaleString()}</div></div><p class="mute">เวฟสูงสุดของคุณ ${E.best}</p>
    <div class="two"><button id="elAgain">เริ่มรอบใหม่</button><button class="sec" id="elBack">กลับ</button></div>`);
  $('#elAgain').onclick=()=>{closeModal();startEndlessRun()};$('#elBack').onclick=()=>go('endless');
}
/* ---------- ด่านไม่มีที่สิ้นสุด (โหมดปกติ · ได้เงิน) ----------
   เวฟต่อเวฟ: ผ่านเวฟไหนได้เงินเวฟนั้นทันที (เก็บไว้แม้แพ้) · เงินโตแบบทวีคูณตามเวฟ (เวฟแรกๆ น้อย ยิ่งไกลยิ่งเยอะ)
   หลังชนะแต่ละเวฟเลือกบัฟ: POWER ทีม / HP ทีม / ศัตรูแกร่งขึ้น (แลกกับ "ตัวคูณรายได้" เพิ่มขึ้น)
   ความยากของศัตรู/ตัวเลขบัฟใช้ชุดเดียวกับ EL ด้านบน — ปรับค่าเงินที่ IF */
const IF={coin:6233,pow:1.8,      /* เงินเวฟ w = coin × w^pow (โตแบบพหุนาม → ไม่เฟ้อ) · เงินสะสมถึงเวฟ 100 ≈ 1B (ไม่นับตัวคูณความเสี่ยง) */
  riskInc:.25,riskMax:20,        /* ศัตรูแกร่งขึ้น 1 ชั้น = รายได้ +25% (บวกต่อชั้น) · นับสูงสุด 20 ชั้น (×6) */
  bossBonus:2,every:10};
const COIN_CAP=1e13;   /* เพดานเงินผู้เล่น 10T (ตรงกับ trigger cap_coins ฝั่งเซิร์ฟเวอร์) */
const capNote=()=>`<p class="lvup">⚠ เงินถึงขีดจำกัดแล้ว (${COIN_CAP.toLocaleString()}) — เงินที่ได้เพิ่มจะไม่ถูกบวก</p>`;         /* เวฟบอส (ทุก every เวฟ) ได้เงิน ×bossBonus */
const ifState=()=>{SV.inf=SV.inf||{best:0,run:null};return SV.inf};
const ifMul=risk=>1+IF.riskInc*Math.min(risk||0,IF.riskMax);
const ifBase=w=>IF.coin*Math.pow(w,IF.pow)*(w%IF.every===0?IF.bossBonus:1);
const ifCoins=(w,risk)=>Math.round(ifBase(w)*ifMul(risk));
function renderInf(){
  const E=ifState(),run=E.run,team=SV.team.filter(x=>SV.owned.includes(x)),b=run?run.buf:{p:0,h:0,risk:0},w=run?run.wave:1;
  const eg=[1,10,20,30,50].map(x=>`เวฟ ${x}: 💰${ifCoins(x,0).toLocaleString()}`).join(' · ');
  $('#ifRaid').innerHTML=`<div class="rboss"><div class="infbig">♾️</div></div>
  <div class="rinfo"><h2>♾ ด่านไม่มีที่สิ้นสุด</h2>
    <div class="rhpt"><b>${run?'เวฟที่ '+run.wave:'ยังไม่ได้เริ่มรอบ'}</b><span>เวฟสูงสุด ${E.best}${run?' · ได้เงินรอบนี้ 💰'+run.coins.toLocaleString():''}</span></div>
    <div class="rmeta"><span>⚔ POWER ทีม +${Math.round(b.p*100)}%</span><span>❤ HP ทีม +${Math.round(b.h*100)}%</span><span>☠ ศัตรู +${Math.round(b.risk*EL.riskMul*100)}%</span><span>💰 รายได้ ×${ifMul(b.risk).toFixed(2)}</span></div>
    <div class="ebrule"><b>กติกา</b><br>• ผ่านเวฟไหนได้เงินเวฟนั้นทันที · แพ้เมื่อไหร่รอบนี้จบ (เงินที่ได้แล้วเก็บไว้)<br>• เงินต่อเวฟเพิ่มขึ้นเรื่อยๆ ยิ่งไปไกลยิ่งเยอะ · ทุก ${IF.every} เวฟเป็นเวฟบอส เงิน ×${IF.bossBonus}<br>• หลังชนะแต่ละเวฟ เลือกบัฟ 1 อย่าง: POWER / HP ทีม หรือ <b>ศัตรูแกร่งขึ้น</b> (ศัตรู +${Math.round(EL.riskMul*100)}% ต่อชั้น) เพื่อให้ได้เงิน <b>+${Math.round(IF.riskInc*100)}%</b> ต่อชั้น<br>• เวฟนี้ได้ <b>💰${ifCoins(w,b.risk).toLocaleString()}</b><br><small>ตัวอย่าง (ยังไม่บัฟศัตรู) ${eg}</small></div>
    <div class="myteam"><span>ทีมของคุณ</span><div>${team.length?team.map(t=>`<img class="th" src="${CARDS[t].img}" alt="${CARDS[t].name}">`).join(''):'<small>ยังไม่มีการ์ดในทีม</small>'}</div><button class="sec small" data-go="team">จัดทีม</button></div>
    <div class="two"><button id="ifGo">${run?(run.pick?'เลือกบัฟเวฟถัดไป':'สู้เวฟ '+run.wave+' ต่อ'):'เริ่มรอบใหม่'}</button>${run?'<button class="sec" id="ifQuit">จบรอบนี้</button>':''}</div>
  </div>`;
  $('#ifGo').disabled=!team.length;
  $('#ifGo').onclick=()=>{const r=ifState().run;if(!r)startInfRun();else if(r.pick)ifPickModal();else startInfBattle()};
  if(run)$('#ifQuit').onclick=()=>ifEnd(true);
}
function startInfRun(){
  const team=SV.team.filter(x=>SV.owned.includes(x));if(!team.length){toast('ต้องมีการ์ดในทีมอย่างน้อย 1 ใบ');return go('team')}
  ifState().run={wave:1,buf:{p:0,h:0,risk:0},coins:0,pick:false};save();startInfBattle();
}
function startInfBattle(){
  const run=ifState().run,team=SV.team.filter(x=>SV.owned.includes(x));
  if(!team.length){toast('ต้องมีการ์ดในทีมอย่างน้อย 1 ใบ');return go('team')}
  const en=elEnemies(run.wave),b=run.buf;
  clearAuto();
  Battle.start({auto:false,a:team,la:team.map(clv),sa:team.map(cstar),b:en.ids,lb:en.ids.map(()=>en.lv),
    mulA:{p:1+b.p,h:1+b.h},mulB:{p:1+b.risk*EL.riskMul,h:1+b.risk*EL.riskMul},maxTurns:EL.maxTurns,first:'a',
    title:'ไม่มีที่สิ้นสุด · เวฟ '+run.wave+(en.boss?' (บอส)':'')+' · ศัตรู Lv.'+en.lv+' · 💰×'+ifMul(b.risk).toFixed(2),
    onExit:()=>go('inf'),onEnd:r=>finishInfWave(r,run.wave)});
}
function finishInfWave(r,w){
  const E=ifState(),run=E.run;if(!run||run.wave!==w)return;
  if(!r.win){ifEnd(false,r);return}   /* แพ้ / หมดเวลา → จบรอบ */
  const got=ifCoins(w,run.buf.risk);
  const c0=SV.coins;SV.coins=Math.min(COIN_CAP,SV.coins+got);const real=SV.coins-c0;
  run.coins+=real;E.best=Math.max(E.best,w);run.pick=true;save();hud();
  ifPickModal(`<h2>เวฟ ${w} ผ่าน! 🎉</h2><div class="reward"><div>💰 +${real.toLocaleString()}</div></div><p class="mute">รอบนี้ได้รวม 💰${run.coins.toLocaleString()}</p>${real<got?capNote():''}`);
}
function ifPickModal(head){
  const run=ifState().run;if(!run)return go('inf');
  const b=run.buf,w=run.wave;
  head=head||`<h2>เวฟ ${w} ผ่านแล้ว</h2>`;
  modal(`${head}<p class="mute">เลือกบัฟสำหรับเวฟที่ ${w+1}</p>
    <div class="two">
      <button class="elopt" data-b="p"><b>⚔ POWER ทีม +${Math.round(EL.buffP*100)}%</b><small>ตอนนี้ +${Math.round(b.p*100)}%</small></button>
      <button class="elopt" data-b="h"><b>❤ HP ทีม +${Math.round(EL.buffH*100)}%</b><small>ตอนนี้ +${Math.round(b.h*100)}%</small></button>
      <button class="elopt risk" data-b="r"><b>☠ ศัตรูแกร่งขึ้น +${Math.round(EL.riskMul*100)}%</b><small>รายได้ ×${ifMul(b.risk).toFixed(2)} → <b>×${ifMul(b.risk+1).toFixed(2)}</b> · เวฟ ${w+1} ได้ 💰${ifCoins(w+1,b.risk).toLocaleString()} → <b>${ifCoins(w+1,b.risk+1).toLocaleString()}</b></small></button>
    </div><div class="two" style="margin-top:10px"><button class="sec small" id="ifLater">พักไว้ก่อน (กลับ)</button></div>`);
  $$('.elopt',$('#mdlBody')).forEach(x=>x.onclick=()=>{
    const k=x.dataset.b;if(k==='p')b.p+=EL.buffP;else if(k==='h')b.h+=EL.buffH;else b.risk++;
    run.wave++;run.pick=false;save();closeModal();startInfBattle()});
  $('#ifLater').onclick=()=>go('inf');
}
function ifEnd(quit,r){
  const E=ifState(),run=E.run;if(!run)return go('inf');
  const cleared=run.wave-(run.pick?0:1),coins=run.coins;E.run=null;save();hud();
  modal(`<h2>${quit?'จบรอบ':'การ์ดพ่ายแพ้…'}</h2><p>${quit?'จบรอบที่':(r&&r.timeout?'หมดเวลาที่':'แพ้ที่')} เวฟที่ <b>${run.wave}</b> · ผ่านไปแล้ว <b>${Math.max(0,cleared)}</b> เวฟ</p>
    <div class="reward"><div>💰 +${coins.toLocaleString()}</div></div><p class="mute">เวฟสูงสุดของคุณ ${E.best}</p>
    <div class="two"><button id="ifAgain">เริ่มรอบใหม่</button><button class="sec" id="ifBack">กลับ</button></div>`);
  $('#ifAgain').onclick=()=>{closeModal();startInfRun()};$('#ifBack').onclick=()=>go('inf');
}

/* ---------- ดันเจี้ยนออนไลน์ (บอสจักรพรรดิเงา · ทุกคนช่วยกันตีบอสตัวเดียวกัน) ----------
   เซิร์ฟเวอร์ (Supabase · dungeon.sql) คุมทั้งหมด: ทุกชั่วโมงดันเจี้ยนโผล่แบบสุ่มภายใน 30 นาทีแรก เปิดนาน 30 นาที · ทุกชั่วโมงดันเจี้ยนโผล่แบบสุ่มภายใน 30 นาทีแรก เปิดนาน 30 นาที · HP บอสรวม 5,000,000 (ตั้งที่ dungeon.sql)
   ลงได้คนละ 5 ครั้งต่อรอบ (หักสิทธิ์ทันทีที่ลง แพ้/ออกกลางคันก็เสียสิทธิ์) · ดาเมจที่ทำได้หักจาก HP บอสรวม แม้แพ้ก็นับ
   บอสถูกปราบ → ปิดทันที ทุกคนที่ช่วยตีได้ทหารเงาสุ่ม 1 ใน 3 (อิกริส / เบรุ / ไออน) และนับเป็น "ผ่านดันเจี้ยน" 1 ครั้ง
   ต้องล็อกอินออนไลน์จึงจะเล่นได้ · ค่า HP/เวลา/สิทธิ์ตั้งที่ dungeon.sql (ที่นี่ใช้แสดงผลและตั้ง POWER บอส) */
const DG={tries:5,power:99,stCap:15000,turns:50};   // stCap = ดาเมจสถานะ(ตาม HP สูงสุด)ต่อครั้งที่บอสรับได้สูงสุด · turns = จำกัดเทิร์นต่อการลง
let DGLB=null,dgLbAt=0;
let DGS=null,dgBusy=false,dgClaiming=false,dgInBattle=false,dgPollAt=0;
const dgFmt=sec=>{sec=Math.max(0,Math.ceil(sec));const m=Math.floor(sec/60),s=sec%60;return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')};
const dgErrTxt=e=>({login:'ต้องล็อกอินออนไลน์ก่อน',offline:'ต้องล็อกอินออนไลน์ก่อน',notopen:'ดันเจี้ยนยังไม่เปิด',ended:'ดันเจี้ยนหมดเวลาแล้ว',cleared:'ดันเจี้ยนถูกปราบไปแล้ว',notries:'หมดสิทธิ์ลงรอบนี้แล้ว',error:'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ'})[e]||'ทำรายการไม่สำเร็จ';
const dgEsc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* โอกาสได้ของตามอันดับ (ต้องตรงกับ dungeon_chance ใน dungeon_rank.sql): ท็อป 1-5 = 100% · อันดับ 6 = 50% แล้วไล่ลงเป็นเส้นตรงถึงอันดับ 50 = 5% · 51+ = 0% */
const dgChance=r=>r<=5?1:r<=50?0.5-(r-6)*(0.45/44):0;
const dgTag=r=>r<=5?'🏆 ได้ของ 100%':dgChance(r)>0?'🎲 ลุ้น '+Math.round(dgChance(r)*100)+'%':'ไม่มีโอกาส';
const dgOnline=()=>typeof Online!=='undefined'&&Online.me&&Online.dungeon;
async function dgRefresh(){
  if(!dgOnline()){DGS={error:'offline'};return DGS}
  const s=await Online.dungeon.status();
  if(s&&!s.error){s._endAt=Date.now()+(s.end_in||0)*1000;s._nextAt=Date.now()+(s.next_in||0)*1000}
  DGS=s;dgPollAt=Date.now();
  const scr=$('#dungeonScr');
  if(s&&!s.error&&scr&&!scr.classList.contains('hidden')&&Online.dungeon.leaderboard&&Date.now()-dgLbAt>7000){
    dgLbAt=Date.now();const lb=await Online.dungeon.leaderboard();DGLB=lb&&lb.ok&&Array.isArray(lb.rows)?lb:null;
  }
  if(s&&s.unclaimed!=null&&!dgInBattle)dgClaimFlow(s.unclaimed);
  return s;
}
async function dgClaimFlow(hr,extra=''){
  if(dgClaiming)return;dgClaiming=true;
  const r=await Online.dungeon.claim(hr);dgClaiming=false;
  if(!r||!r.ok)return false;
  const k=ITEMS[r.reward]?r.reward:null,rk=r.rank|0;
  SV.dgw=(SV.dgw||0)+1;if(k&&!r.state)SV.items[k]=itemN(k)+1;save();hud();   /* ถ้าเซิร์ฟเวอร์ส่งสถานะมาแล้ว ไอเทมถูกบวกให้แล้ว ไม่บวกซ้ำ */
  const rkTxt=rk?`<p>อันดับดาเมจของคุณ <b>#${rk}</b> · ${dgTag(rk)}</p>`:'';
  const prize=k?`<div class="dropbox"><img src="${ITEMS[k].img}" alt=""><div><b>ได้รับ ${ITEMS[k].name}!</b><br><small>มีทั้งหมด ×${itemN(k)}</small></div></div>`:`<div class="dropbox"><div><b>รอบนี้ไม่ได้ทหารเงา 😢</b><br><small>ยังนับเป็นผ่านดันเจี้ยน 1 ครั้ง · ตีให้ติดอันดับสูงขึ้นเพื่อเพิ่มโอกาส</small></div></div>`;
  modal(`<h2>ดันเจี้ยนถูกปราบแล้ว! 🎉</h2>${rkTxt}${extra}${prize}<div class="two"><button id="dgBack">ตกลง</button></div>`);
  $('#dgBack').onclick=()=>{closeModal();if(!$('#dungeonScr').classList.contains('hidden'))renderDungeon()};
  return true;
}
const dgTeamOf=(r,P)=>{   // เซ็ตของผู้เล่น: ที่เซิร์ฟเวอร์เก็บไว้ตอนตีบอส → ไม่มีก็ใช้เซ็ตปัจจุบันของคนออนไลน์
  const t=Array.isArray(r.team)?r.team.slice(0,8).filter(x=>Array.isArray(x)&&typeof x[0]==='string'&&CARDS[x[0]]).map(x=>[x[0],Math.max(1,x[1]|0),Math.max(1,x[2]|0)]):[];
  return t.length?t:(P[r.user_id]?P[r.user_id].team:[]);
};
function dgLbRow(r,P){
  const on=P[r.user_id],meId=Online.me&&Online.me.id,medal=['🥇','🥈','🥉'][r.rank-1]||'';
  return `<div class="dglb${r.user_id===meId?' me':''}"><div class="dgl1"><b class="rk">${medal||'#'+r.rank}</b><i class="od${on?' on':''}"></i><b class="dgn">${dgEsc(r.name||'ผู้เล่น')}</b><small>${(r.damage||0).toLocaleString()} ดาเมจ</small><span class="sp"></span><small class="chn">${dgTag(r.rank)}</small></div><div class="dgl2">${Online.setHtml(dgTeamOf(r,P))}</div></div>`;
}
function dgPaintLb(){   // คนออนไลน์เปลี่ยน → อัปเดตตารางในหน้าต่าง (ถ้าเปิดอยู่)
  if(!$('#dgLbList')||!DGLB)return;const P=Online.presence?Online.presence():{};
  $('#dgLbList').innerHTML=DGLB.rows.slice(0,50).map(r=>dgLbRow(r,P)).join('');
}
async function dgLbModal(){
  if(!DGLB){dgLbAt=0;await dgRefresh()}
  const P=Online.presence?Online.presence():{},lb=DGLB,mine=lb&&lb.me;
  if(!lb||!Array.isArray(lb.rows)){toast('โหลดตารางอันดับไม่ได้ (ยังไม่ได้ติดตั้ง dungeon_leaderboard บนเซิร์ฟเวอร์?)');return}
  modal(`<h2>🏆 อันดับดาเมจดันเจี้ยน</h2>
    <p class="mute">ท็อป 1-5 ได้ทหารเงา 100% · อันดับ 6-50 ลุ้น 50% ไล่ลงมา · 🟢 = ออนไลน์${mine&&mine.rank?'<br>คุณอยู่อันดับ <b>#'+mine.rank+'</b> ('+(mine.damage||0).toLocaleString()+' ดาเมจ) · '+dgTag(mine.rank):''}</p>
    <div class="frlist dgall" id="dgLbList">${lb.rows.length?lb.rows.slice(0,50).map(r=>dgLbRow(r,P)).join(''):'<p class="mute">ยังไม่มีใครตีบอสรอบนี้</p>'}</div>
    <div class="two"><button id="dgLbX">ปิด</button></div>`);
  $('#dgLbX').onclick=closeModal;
}
function dgRulesModal(){
  modal(`<h2>📖 กติกาดันเจี้ยน</h2><div class="ebrule">• ทุกคนช่วยกันตีบอสตัวเดียวกัน ดาเมจรวมหัก HP บอสรวม (แพ้ก็นับดาเมจที่ทำได้)<br>• ลงได้คนละ ${DG.tries} ครั้งต่อรอบ หักสิทธิ์ทันทีที่ลง แพ้หรือออกกลางคันก็เสียสิทธิ์<br>• บอสติดสถานะผิดปกติได้ แต่ดาเมจสถานะที่หักตาม HP สูงสุดรับได้ไม่เกิน <b>${DG.stCap.toLocaleString()}</b> ต่อครั้ง · กันการโจมตีแบบตายทันที · จำกัด <b>${DG.turns} เทิร์น</b> ต่อการลง 1 ครั้ง (หมดเวลาก็นับดาเมจที่ทำได้)<br>• บอสถูกปราบ → ดันเจี้ยนปิดทันที ทุกคนที่ช่วยตีนับเป็นผ่านดันเจี้ยน 1 ครั้ง · ของรางวัลคือทหารเงาสุ่ม 1 ใน 3 (<b>อิกริส / เบรุ / ไออน</b>) จัดตามอันดับดาเมจรวม: <b>ท็อป 1-5 ได้ 100%</b> · อันดับ 6 ลุ้น 50% แล้วไล่ลงทีละน้อยถึงอันดับ 50 (5%) · อันดับ 51 ขึ้นไปไม่มีของ<br>• ไม่มีใครปราบทันภายในเวลา → ไม่มีรางวัล</div><div class="two"><button id="dgRlX">ปิด</button></div>`);
  $('#dgRlX').onclick=closeModal;
}
function dgPaint(){
  const s=DGS,bc=CARDS.shadowempboss,team=SV.team.filter(x=>SV.owned.includes(x));
  const box=h=>`<div class="rboss"><img src="${bc.img}" alt="${bc.name}" style="border-color:#a24dff;box-shadow:0 0 44px #a24dff77,0 14px 40px #000a"></div><div class="rinfo"><h2>🕳️ ดันเจี้ยน · ${bc.name}</h2>${h}</div>`;
  if(!s||s.error){
    $('#dgRaid').innerHTML=box(`<div class="dgtime">🔌 ${s&&s.error==='error'?'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ':'ต้องล็อกอินออนไลน์'}</div><p>ดันเจี้ยนเป็นโหมดออนไลน์ ทุกคนช่วยกันตีบอสตัวเดียวกัน ต้องล็อกอินก่อนจึงจะเล่นได้</p><div class="two"><button id="dgLogin">${s&&s.error==='error'?'ลองใหม่':'ไปหน้าออนไลน์'}</button></div>`);
    $('#dgLogin').onclick=()=>{if(s&&s.error==='error')renderDungeon();else go('online')};return}
  const pct=Math.max(0,Math.min(100,s.hp/s.max_hp*100)),left=DG.tries-s.tries,open=s.state==='open';
  const bar=`<div style="margin:6px 0 2px;height:18px;border-radius:10px;background:#2a2342;overflow:hidden;box-shadow:inset 0 0 0 1px #a24dff66"><i style="display:block;height:100%;width:${pct}%;background:linear-gradient(90deg,#7a3dff,#d17bff)"></i></div><div class="rhpt"><b>HP บอสรวม ${Math.max(0,Math.ceil(s.hp)).toLocaleString()} / ${s.max_hp.toLocaleString()}</b><span>POWER ${DG.power}</span></div>`;
  let st;
  if(open)st=`<div class="dgtime">🔴 เปิดอยู่! เหลือเวลา <span id="dgCd">${dgFmt((s._endAt-Date.now())/1000)}</span></div><p>สิทธิ์ลงรอบนี้เหลือ <b>${Math.max(0,left)}/${DG.tries}</b> ครั้ง · ดาเมจของคุณรอบนี้ <b>${(s.damage||0).toLocaleString()}</b> · แพ้/ออกกลางคันก็เสียสิทธิ์ 1 ครั้ง</p>`;
  else if(s.state==='cleared')st=`<div class="dgtime">✅ บอสถูกปราบแล้ว</div><p>ดันเจี้ยนปิดแล้ว · รอบถัดไปใน <b id="dgCd">${dgFmt((s._nextAt-Date.now())/1000)}</b> (โผล่แบบสุ่มภายใน 30 นาทีแรกของชั่วโมงหน้า)${s.damage>0&&s.claimed?'<br>คุณช่วยตี '+s.damage.toLocaleString()+' ดาเมจ · รับรางวัลแล้ว':''}</p>`;
  else if(s.state==='ended')st=`<div class="dgtime">🌙 หมดเวลา</div><p>รอบนี้ไม่มีใครปราบบอสได้ · รอบถัดไปใน <b id="dgCd">${dgFmt((s._nextAt-Date.now())/1000)}</b></p>`;
  else st=`<div class="dgtime">⏳ ยังไม่เปิด</div><p>ดันเจี้ยนรอบนี้จะโผล่แบบสุ่มภายใน 30 นาทีแรกของชั่วโมง · เปิดหน้านี้ค้างไว้ได้ (ปุ่มดันเจี้ยนที่หน้าหลักจะเรืองแสงเมื่อเปิด)</p>`;
  $('#dgRaid').innerHTML=box(`${bar}${st}
    <div class="ebrule"><b>กติกา</b><br>• ทุกคนช่วยกันตีบอสตัวเดียวกัน ดาเมจรวมหัก HP บอสรวม (แพ้ก็นับดาเมจที่ทำได้)<br>• ลงได้คนละ ${DG.tries} ครั้งต่อรอบ หักสิทธิ์ทันทีที่ลง แพ้หรือออกกลางคันก็เสียสิทธิ์<br>• บอสถูกปราบ → ดันเจี้ยนปิดทันที ทุกคนที่ช่วยตีนับเป็นผ่านดันเจี้ยน 1 ครั้ง · ของรางวัลคือทหารเงาสุ่ม 1 ใน 3 (<b>อิกริส / เบรุ / ไออน</b>) จัดตามอันดับดาเมจรวม: <b>ท็อป 1-5 ได้ 100%</b> · อันดับ 6 ลุ้น 50% แล้วไล่ลงทีละน้อยถึงอันดับ 50 (5%) · อันดับ 51 ขึ้นไปไม่มีของ<br>• ไม่มีใครปราบทันภายในเวลา → ไม่มีรางวัล</div>
    <div class="myteam"><span>ทีมของคุณ</span><div>${team.length?team.map(t=>`<img class="th" src="${CARDS[t].img}" alt="${CARDS[t].name}">`).join(''):'<small>ยังไม่มีการ์ดในทีม</small>'}</div><button class="sec small" data-go="team">จัดทีม</button></div>
    <div class="two"><button id="dgGo" ${open&&left>0&&team.length?'':'disabled'}>${open?(left>0?'⚔ เข้าดันเจี้ยน (สิทธิ์เหลือ '+left+')':'หมดสิทธิ์ลงรอบนี้แล้ว'):'ยังเข้าไม่ได้'}</button><button class="sec small" id="dgRef">🔄 รีเฟรช</button></div>
    <div class="two dgbtns"><button class="sec" id="dgLbBtn">🏆 ดูตารางอันดับ${s.damage>0&&DGLB&&DGLB.me&&DGLB.me.rank?' (คุณ #'+DGLB.me.rank+')':''}</button><button class="sec" id="dgRuleBtn">📖 กติกา</button></div>`);
  $('#dgGo').onclick=startDungeon;$('#dgRef').onclick=()=>{dgLbAt=0;renderDungeon()};
  $('#dgLbBtn').onclick=dgLbModal;$('#dgRuleBtn').onclick=dgRulesModal;
}
function renderDungeon(){
  $('#dgRaid').innerHTML='<div class="rinfo"><h2>🕳️ ดันเจี้ยน</h2><p class="mute">กำลังโหลดข้อมูลจากเซิร์ฟเวอร์…</p></div>';
  dgRefresh().then(()=>{if(!$('#dungeonScr').classList.contains('hidden'))dgPaint()});
}
async function startDungeon(){
  if(dgBusy||!dgOnline())return;
  const team=SV.team.filter(x=>SV.owned.includes(x));
  if(!team.length){toast('ต้องมีการ์ดในทีมอย่างน้อย 1 ใบ');return go('team')}
  dgBusy=true;const e=await Online.dungeon.enter();dgBusy=false;
  if(!e||!e.ok){toast(dgErrTxt(e&&(e.err||e.error)));return renderDungeon()}
  clearAuto();setAutoBtn();dgInBattle=true;
  const hp0=Math.max(1,Math.ceil(e.hp));
  Battle.start({auto:false,a:team,la:team.map(clv),sa:team.map(cstar),b:['shadowempboss'],lb:[1],bossHp:{max:e.max_hp,cur:hp0},bossP:DG.power,bossCap:DG.stCap,maxTurns:DG.turns,noHeal:true,first:'a',
    title:'ดันเจี้ยน · จักรพรรดิเงา ซอง จิน วู (ลงครั้งที่ '+e.try+'/'+DG.tries+')',
    onExit:async()=>{dgInBattle=false;go('dungeon');await Online.dungeon.report(e.hr,0)},   // ออกกลางคัน: เสียสิทธิ์ ไม่นับดาเมจ
    onEnd:r=>finishDungeon(r,e,hp0)});
}
async function finishDungeon(r,e,hp0){
  const dmg=r.win?hp0:Math.max(0,hp0-Math.max(0,Math.ceil(r.bossHp==null?hp0:r.bossHp)));
  let res=null;
  for(let i=0;i<3&&!(res&&res.ok);i++){res=await Online.dungeon.report(e.hr,dmg);if(res&&res.ok)break;if(res&&res.err==='noticket')break;await new Promise(z=>setTimeout(z,900))}
  dgInBattle=false;
  if(res&&res.ok&&Online.dungeon.setTeam)Online.dungeon.setTeam(e.hr,SV.team.filter(x=>SV.owned.includes(x)).slice(0,8).map(id=>[id,clv(id),cstar(id)]));   // เก็บเซ็ตที่ใช้ตีไว้โชว์ในตารางอันดับ (แม้ออฟไลน์)
  const me=res&&res.ok?res.applied:0,head=r.win?'ปราบบอสสำเร็จ! 🎉':'พ่ายแพ้…';
  const line=`<p>ใช้ ${r.turns} เทิร์น · ดาเมจที่ทำได้ <b>${dmg.toLocaleString()}</b>${res&&res.ok?` (เซิร์ฟเวอร์นับ <b>${me.toLocaleString()}</b>${me<dmg?' · เกินเพดานต่อครั้ง':''})`:' · <span style="color:#ff8a8a">ส่งผลไปเซิร์ฟเวอร์ไม่สำเร็จ</span>'}</p>`;
  if(res&&res.ok&&res.cleared){   // เราเป็นคนปราบ หรือปิดรอบพอดี → รับรางวัลทันที
    const ok=await dgClaimFlow(e.hr,line);if(ok)return;
  }
  await dgRefresh();
  const left=DG.tries-(DGS&&!DGS.error?DGS.tries:e.try),still=DGS&&!DGS.error&&DGS.state==='open'&&left>0;
  modal(`<h2>${head}</h2>${line}${DGS&&!DGS.error?`<p>HP บอสรวมเหลือ <b>${Math.max(0,Math.ceil(DGS.hp)).toLocaleString()}</b> / ${DGS.max_hp.toLocaleString()} ${still?'· สิทธิ์ลงเหลือ '+left+' ครั้ง':'· หมดสิทธิ์หรือปิดแล้ว'}</p>`:''}<div class="two">${still?'<button id="dgAgain">ลงอีกครั้ง</button>':''}<button class="sec" id="dgTeam">จัดทีม</button><button class="sec" id="dgBack">กลับ</button></div>`);
  if(still)$('#dgAgain').onclick=()=>{closeModal();startDungeon()};
  $('#dgTeam').onclick=()=>go('team');$('#dgBack').onclick=()=>go('dungeon');
}
/* ทุกวินาที: นับถอยหลัง · โพลสถานะ (หน้าดันเจี้ยน 5 วิ / หน้าหลัก 30 วิ) · ไฟกระพริบปุ่มดันเจี้ยน */
async function dgTick(){
  if(typeof SV==='undefined'||!SV||!dgOnline())return;
  const scr=$('#dungeonScr'),onDg=scr&&!scr.classList.contains('hidden'),onHome=!$('#homeScr').classList.contains('hidden');
  if(!onDg&&!onHome)return;
  const every=onDg?5000:30000;
  if(!dgBusy&&!dgInBattle&&Date.now()-dgPollAt>every){dgPollAt=Date.now();await dgRefresh();if(onDg&&!$('#dungeonScr').classList.contains('hidden')&&$('#mdl').classList.contains('hidden'))dgPaint()}
  const s=DGS,open=!!(s&&!s.error&&s.state==='open'&&s.tries<DG.tries);
  const b=$('#dgBtn'),sub=$('#dgSub');
  if(b)b.classList.toggle('open',open);
  if(sub)sub.textContent=open?'🔴 เปิดอยู่! เข้าเลย':(s&&!s.error&&s.state==='cleared')?'ปราบแล้ว รอรอบหน้า':'เปิดสุ่มทุกชั่วโมง · ออนไลน์';
  if(onDg){const cd=$('#dgCd');if(cd&&s&&!s.error)cd.textContent=dgFmt((((s.state==='open')?s._endAt:s._nextAt)-Date.now())/1000)}
}
setInterval(dgTick,1000);
addEventListener('load',()=>{if(typeof Online!=='undefined')Online.onPres=()=>{if(!$('#dungeonScr').classList.contains('hidden'))dgPaintLb()}});   // online.js โหลดหลัง app.js
/* ---------- เควสพัฒนา (Evolution Quest) ---------- */
/* วัตถุดิบ (ไอเทม) */
const ITEMS={shadoworb:{name:'ลูกแก้วเงา',img:'shadoworb.jpeg',rar:'USR',color:'#a24dff',desc:'วัตถุดิบวิวัฒนาการ ไว้ใช้ EVOLUTION ปลุกพลังขั้นสอง ซอง จิน วู'},igris:{name:'อิกริส',img:'igrisevo.jpeg',rar:'SSR',color:'#8a5cff',desc:'วัตถุดิบวิวัฒนาการ ไว้ใช้ EVOLUTION ปลุกพลังขั้นสอง ซอง จิน วู (ได้จากดันเจี้ยน)'},beru:{name:'เบรุ',img:'beruevo.jpeg',rar:'SSR',color:'#8a5cff',desc:'วัตถุดิบวิวัฒนาการ ไว้ใช้ EVOLUTION ปลุกพลังขั้นสอง ซอง จิน วู (ได้จากดันเจี้ยน)'},ion:{name:'ไออน',img:'ionevo.jpeg',rar:'SSR',color:'#8a5cff',desc:'วัตถุดิบวิวัฒนาการ ไว้ใช้ EVOLUTION ปลุกพลังขั้นสอง ซอง จิน วู (ได้จากดันเจี้ยน)'},hojin:{name:'ธรรมจักรแปดซี่',img:'hojin.jpeg',rar:'UR',color:'#ffc93d',desc:'วัตถุดิบวิวัฒนาการ ไว้ใช้ EVOLUTION ให้กับการ์ดฟุชิงุโระ เมงุมิ'},sealc:{name:'อักขระต้องคำสาป',img:'sasuke_seal.jpeg',rar:'S',color:'#a06cff',desc:'วัตถุดิบวิวัฒนาการ ไว้ใช้สำหรับ EVOLUTION ให้กับการ์ดอุจิวะ ซาสึเกะ (ร่างเด็ก)'},sword:{name:'ดาบของชา แฮ อิน',img:'swordcha.jpeg',rar:'SSR',color:'#e24b5b',desc:'วัตถุดิบวิวัฒนาการ ไว้ใช้สำหรับ EVOLUTION ให้กับการ์ดชา แฮ อิน'},shisu:{name:'หน้ากากของชิสุ',img:'shisu.jpeg',rar:'SR',color:'#cfd8ff',desc:'วัตถุดิบวิวัฒนาการ ไว้ใช้สำหรับ EVOLUTION ให้กับการ์ดริมุรุ ร่างสไลม์'},rsword:{name:'ดาบของจอมมารริมุรุ',img:'swordrimuru.jpeg',rar:'USR',color:'#8a5cff',desc:'วัตถุดิบวิวัฒนาการ ไว้ใช้สำหรับ EVOLUTION จอมมาร ริมุรุ เทมเพสต์'},dagger:{name:'มีดนักฆ่าอัศวิน',img:'dagger.jpeg',rar:'SR',color:'#ff7a3d',desc:'วัตถุดิบวิวัฒนาการ ไว้สำหรับ EVOLUTION ซอง จิน วู'},kasaga:{name:'มีดเขี้ยวงูของคาสากะ',img:'kasaga.jpeg',rar:'SR',color:'#8a5cff',desc:'วัตถุดิบวิวัฒนาการ ไว้ EVOLUTION ซอง จิน วู'},crowr:{name:'อีกา (จริง)',img:'crow.jpeg',rar:'UR',color:'#ff4a3a',desc:'วัตถุดิบวิวัฒนาการ ไว้ใช้ EVOLUTION สองอัจฉริยะแห่งตระกูลอุจิวะ ชิซุยและอิทาจิ'},crowf:{name:'อีกา (ปลอม)',img:'crow_fake.jpeg',rar:'UR',color:'#9aa0b4',desc:'วัตถุดิบวิวัฒนาการ ไว้ใช้ EVOLUTION สองอัจฉริยะแห่งตระกูลอุจิวะ ชิซุยและอิทาจิ'},cosmic:{name:'คอสมิค',img:'cosmicevo.jpeg',rar:'UR',color:'#4aa8ff',desc:'วัตถุดิบวิวัฒนาการ ไว้ใช้สำหรับ EVOLUTION ให้กับการ์ดสัตว์ประหลาดที่สมบูรณ์แบบ กาโร่'},seal9:{name:'ตราประทับ 9 หาง',img:'narutoevo.jpeg',rar:'S',color:'#ffcf4a',desc:'วัตถุดิบวิวัฒนาการ ไว้ใช้สำหรับ EVOLUTION ให้กับการ์ดอุซึมากิ นารูโตะ'}};
const itemN=k=>SV.items[k]||0;
/* เควสพัฒนา: from = การ์ดที่อีโว, to = การ์ดหลังอีโว, need = เงื่อนไข, boss = ด่านเควส (ชนะได้เงิน + มีโอกาสดรอปวัตถุดิบ) */
const EVOS=[{from:'naruto',to:'naruto1',need:{cards:50,items:{seal9:1},coins:10000},
  boss:{card:'naruto1',name:'นารูโตะ 1 หาง',hp:1000,power:60,lv:1,coins:100,drops:[{item:'seal9',rate:.05}]}},
  {from:'sasukekid',to:'sasukecurse',need:{cards:50,items:{sealc:1},coins:10000},
  boss:{card:'sasukecurse',name:'ซาสึเกะ ร่างอักขระ',hp:1000,power:60,lv:1,coins:100,drops:[{item:'sealc',rate:.05}]}},
  {from:'megumi',to:'mahoraga',need:{cards:50,items:{hojin:3},coins:100000},
  boss:{card:'mahoraga',name:'มโหรากา',hp:5000,power:150,lv:1,coins:100,drops:[{item:'hojin',rate:.01}]}},
  {from:'chahaein',to:'chaevo',need:{cards:50,items:{sword:1},coins:20000000},
  boss:{card:'chaboss',name:'เริงระบำเจ้าหญิงดาบ ชา แฮ อิน',hp:10000,power:150,lv:1,coins:100,drops:[{item:'sword',rate:.01}]}},
  {from:'slime',to:'rimuru',need:{cards:100,items:{shisu:1},coins:50000000},
  boss:{card:'slime',count:4,name:'ริมุรุ ร่างสไลม์ ×4',hp:5000,power:100,lv:1,coins:100,drops:[{item:'shisu',rate:.05}]}},
  /* need.more = การ์ดอื่นที่ต้องใช้เพิ่ม · need.kills = สังหารศัตรูสะสม (ไม่ถูกใช้หมดไป) · grant = ดาว/เลเวลของการ์ดที่ได้ */
  {from:'rimuru',to:'rimulord',need:{cards:5,more:{slime:50},items:{shisu:10},kills:10000,coins:200000000},grant:{lv:1,star:6},
  boss:{card:'rimuruboss',name:'ริมุรุ ร่าง SSR',hp:30000,power:150,lv:1,coins:100,drops:[{item:'shisu',rate:.075}]}},
  /* บอส 2 เฟส: เฟส 1 ตายแล้วเปลี่ยนเป็นเฟส 2 · drops: first = โอกาสออกเมื่อชนะครั้งแรก (rate = ครั้งต่อๆ ไป) · safe = กันจุดตายทันที */
  {from:'rimulord',to:'truerimuru',need:{cards:5,more:{slime:100,rimuru:10},items:{shisu:20,rsword:1},kills:20000,coins:1000000000},grant:{lv:1,star:6},
  boss:{card:'rimulordboss',name:'จอมมาร ริมุรุ เทมเพสต์ (เฟส 1)',hp:10000,power:200,lv:1,coins:100,safe:true,
    phase2:{card:'truerimuruboss',name:'จอมมารที่แท้จริง ริมุรุ เทมเพสต์ (เฟส 2)',hp:100000,power:300},
    drops:[{item:'shisu',rate:.1},{item:'rsword',rate:.005,first:1}]}},
  /* need.gk / need.gd = กาโร่ (R) สังหาร / หลบหลีกสะสม · need.win = ต้องชนะบอสเควสอย่างน้อย 1 ครั้ง (ไม่ถูกใช้หมดไป) */
  {from:'garo',to:'garored',need:{cards:100,items:{},gk:100,gd:100,win:true,coins:2000000},
  boss:{card:'garoredboss',name:'ลูกครึ่งสัตว์ประหลาด กาโร่',hp:15000,power:75,lv:1,coins:100,drops:[]}},
  /* need.more = การ์ดอื่นที่ต้องใช้เพิ่ม · need.gmk / need.gmd = ลูกครึ่งสัตว์ประหลาด กาโร่ สังหาร / หลบหลีกสะสม (นับตั้งแต่อัปเดตนี้) */
  {from:'garored',to:'garomon',need:{cards:20,more:{garo:200},items:{},gmk:3000,gmd:3000,win:true,coins:20000000},
  boss:{card:'garomonboss',name:'สัตว์ประหลาดที่สมบูรณ์แบบ กาโร่',hp:30000,power:100,lv:1,coins:100,drops:[]}},
  /* need.pmk / pmd / pma / pmc = สัตว์ประหลาดที่สมบูรณ์แบบ กาโร่ สังหาร / หลบหลีก / โจมตี / โต้กลับ สะสม (นับตั้งแต่อัปเดตนี้) */
  {from:'garomon',to:'garocosmic',need:{cards:5,more:{garo:300,garored:30},items:{cosmic:1},pmk:5000,pmd:5000,pma:1000,pmc:100,win:true,coins:1000000000},grant:{star:6},
  boss:{card:'garocosmicboss',name:'คอสมิค กาโร่',hp:50000,power:100,lv:1,coins:100,drops:[{item:'cosmic',rate:1}]}},
  /* drops แบบ pick = โอกาสออกรวม rate แล้วสุ่มหนึ่งชิ้นจากรายการ (ออกอีกา 5% → จริง/ปลอม อย่างละ 50%) */
  {from:'shichi',to:'susanoo',need:{cards:1,items:{crowr:5,crowf:10},coins:10000000000},grant:{star:6},
  boss:{card:'susanooboss',name:'อิทาจิและชิซุย ซูซาโนะอุขั้นสมบูรณ์',hp:50000,power:300,lv:1,coins:100,drops:[{item:'crowr',pick:['crowr','crowf'],rate:.05}]}},
  /* need.jwc = ซอง จิน วู ใช้ความสามารถ (HP เหลือ 1) สะสม · ดรอปมีดแต่ละเล่มแยกกัน เล่มละ 5% */
  {from:'jinwoo',to:'jinwoo2',need:{cards:50,items:{kasaga:1,dagger:1},jwc:10,coins:50000000},
  boss:{card:'jinwoo2boss',name:'ปลุกพลังขั้นสอง ซอง จิน วู',hp:30000,power:200,lv:1,coins:100,drops:[{item:'kasaga',rate:.05},{item:'dagger',rate:.05}]}},
  /* ร็อค ลี (R) → จงเปิดประตูด่านที่5 ร็อค ลี · need.rlc/rla/rlk = ร็อค ลี (R) โจมตีติดคริติคอล / โจมตีครบ / สังหาร สะสม · ได้ 1 ดาว (ไม่มี grant) */
  {from:'rocklee',to:'lee5',need:{cards:100,items:{},rlc:100,rla:1000,rlk:1000,coins:70000000},
  boss:{card:'lee5boss',name:'จงเปิดประตูด่านที่5 ร็อค ลี',hp:50000,power:70,lv:1,coins:100,drops:[]}},
  /* need.dungeon = ผ่านดันเจี้ยนสะสม (SV.dgw) · ใช้บอสเดียวกับด่านดันเจี้ยน แต่ HP/POWER ต่ำกว่า */
  {from:'jinwoo2',to:'shadowemp',need:{cards:50,items:{shadoworb:1,beru:1,igris:1,ion:1},dungeon:1,coins:10000000000},
  boss:{card:'shadowempboss',name:'จักรพรรดิเงา ซอง จิน วู',hp:100000,power:200,lv:1,coins:100,drops:[{item:'shadoworb',rate:.001}]}}];
const dropName=d=>d.pick?d.pick.map(k=>ITEMS[k].name).join(' / '):ITEMS[d.item].name;
const evDropRate=(e,d)=>(d.first!=null&&!SV.evoWin[e.from])?d.first:d.rate;   /* โอกาสออกตอนนี้ (ชนะครั้งแรกอาจได้โอกาสพิเศษ) */
let evoSel=null,evoKeep=false,questTab='char';
/* หน้า "เควส" มี 2 แท็บ: เควสตัวละคร (char) และ เควสพัฒนา (evo) */
function renderQuest(){
  const evo=questTab==='evo';
  $$('.qtab').forEach(b=>{const on=b.dataset.qt===questTab;b.classList.toggle('sec',!on);b.classList.toggle('on',on)});
  $('#qpChar').classList.toggle('hidden',evo);$('#qpEvo').classList.toggle('hidden',!evo);
  if(evo)renderEvo();else renderCharQ();
}
$$('.qtab').forEach(b=>b.onclick=()=>{questTab=b.dataset.qt;renderQuest()});
const evoOk=e=>(SV.count[e.from]||0)>=e.need.cards&&Object.entries(e.need.more||{}).every(([id,n])=>(SV.count[id]||0)>=n)&&Object.entries(e.need.items).every(([k,n])=>itemN(k)>=n)&&(SV.kills||0)>=(e.need.kills||0)&&(SV.gk||0)>=(e.need.gk||0)&&(SV.gd||0)>=(e.need.gd||0)&&(SV.gmk||0)>=(e.need.gmk||0)&&(SV.gmd||0)>=(e.need.gmd||0)&&(SV.pmk||0)>=(e.need.pmk||0)&&(SV.pmd||0)>=(e.need.pmd||0)&&(SV.pma||0)>=(e.need.pma||0)&&(SV.pmc||0)>=(e.need.pmc||0)&&(SV.jwc||0)>=(e.need.jwc||0)&&(SV.rlc||0)>=(e.need.rlc||0)&&(SV.rla||0)>=(e.need.rla||0)&&(SV.rlk||0)>=(e.need.rlk||0)&&(SV.dgw||0)>=(e.need.dungeon||0)&&(!e.need.win||!!SV.evoWin[e.from])&&SV.coins>=e.need.coins;
function renderEvo(){
  const body=$('#evoBody'),e=EVOS.find(x=>x.from===evoSel);
  if(!e){
    $('#evoHint').innerHTML='เลือกการ์ดตัวละครเพื่อรับเควสพัฒนา';
    body.innerHTML=`<div class="evlist">${EVOS.map(v=>{const c=CARDS[v.from],own=SV.owned.includes(v.from);
      return `<button class="evq${own?'':' lk'}" data-evo="${v.from}" style="--c:${c.color}"><div class="evimg"><img src="${c.img}" alt="${c.name}"></div><b>${c.name}</b><small>เควส: ${v.boss.name} → ${CARDS[v.to].name}</small><i class="evtag">${SV.evoQ[v.from]?'รับเควสแล้ว · แตะเพื่อดู':'แตะเพื่อรับเควส'}</i></button>`}).join('')}
      <div class="evq soon"><div class="evimg">❓</div><b>เควสใหม่</b><small>เร็วๆ นี้</small></div></div>`;
    return;
  }
  const c0=CARDS[e.from],c1=CARDS[e.to],b=e.boss,bc=CARDS[b.card],have=SV.count[e.from]||0,ok=evoOk(e),s1=statAt(e.to,(e.grant&&e.grant.lv)||1,(e.grant&&e.grant.star)||1);
  const row=(t,h,n)=>`<li class="${h>=n?'ok':'no'}"><span>${h>=n?'✔':'✖'}</span>${t}<b>${h.toLocaleString()} / ${n.toLocaleString()}</b></li>`;
  $('#evoHint').innerHTML='<button class="sec small" id="evoBack">← เลือกการ์ดอื่น</button>';
  $('#evoBack').onclick=()=>{evoSel=null;renderEvo()};
  body.innerHTML=`<div class="evd">
    <div class="evtrans">
      <div class="evc" style="--c:${c0.color}"><img src="${c0.img}" alt="${c0.name}"><b>${c0.name} ${rarTag(e.from)}</b><small>มี ×${have}</small></div>
      <div class="evarrow">➜<small>EVOLUTION</small></div>
      <div class="evc" style="--c:${c1.color}"><img src="${c1.img}" alt="${c1.name}"><b>${c1.name} ${rarTag(e.to)}</b><small>${e.grant?e.grant.star+'★ '+(e.grant.lv?'Lv.'+e.grant.lv+' ':'')+'· ':''}POWER ${s1.p} · HP ${s1.hp}${SV.owned.includes(e.to)?' · มี ×'+(SV.count[e.to]||1):''}</small></div>
    </div>
    <div class="evinfo">
      <div class="box"><b>เงื่อนไขอีโว</b><ul class="req">
        ${row('การ์ด '+c0.name,have,e.need.cards)}
        ${Object.entries(e.need.more||{}).map(([id,n])=>row('การ์ด '+CARDS[id].name,SV.count[id]||0,n)).join('')}
        ${Object.entries(e.need.items).map(([k,n])=>row(ITEMS[k].name,itemN(k),n)).join('')}
        ${e.need.kills?row('สังหารศัตรูสะสม ⚔',Math.min(SV.kills||0,e.need.kills),e.need.kills):''}
        ${e.need.gk?row('ใช้กาโร่ (R) สังหารศัตรู ⚔',Math.min(SV.gk||0,e.need.gk),e.need.gk):''}
        ${e.need.gd?row('ใช้กาโร่ (R) หลบหลีก 💨',Math.min(SV.gd||0,e.need.gd),e.need.gd):''}
        ${e.need.gmk?row('ใช้ลูกครึ่งสัตว์ประหลาด กาโร่ สังหารศัตรู ⚔',Math.min(SV.gmk||0,e.need.gmk),e.need.gmk):''}
        ${e.need.gmd?row('ใช้ลูกครึ่งสัตว์ประหลาด กาโร่ หลบหลีก 💨',Math.min(SV.gmd||0,e.need.gmd),e.need.gmd):''}
        ${e.need.pmk?row('ใช้สัตว์ประหลาดที่สมบูรณ์แบบ กาโร่ สังหารศัตรู ⚔',Math.min(SV.pmk||0,e.need.pmk),e.need.pmk):''}
        ${e.need.pmd?row('ใช้สัตว์ประหลาดที่สมบูรณ์แบบ กาโร่ หลบหลีก 💨',Math.min(SV.pmd||0,e.need.pmd),e.need.pmd):''}
        ${e.need.pma?row('ใช้สัตว์ประหลาดที่สมบูรณ์แบบ กาโร่ โจมตี 🗡',Math.min(SV.pma||0,e.need.pma),e.need.pma):''}
        ${e.need.pmc?row('ใช้สัตว์ประหลาดที่สมบูรณ์แบบ กาโร่ โจมตีโต้กลับ ↩',Math.min(SV.pmc||0,e.need.pmc),e.need.pmc):''}
        ${e.need.rlc?row('ใช้ร็อค ลี (R) โจมตีติดคริติคอล 💥',Math.min(SV.rlc||0,e.need.rlc),e.need.rlc):''}
        ${e.need.rla?row('ใช้ร็อค ลี (R) โจมตีครบ 👊',Math.min(SV.rla||0,e.need.rla),e.need.rla):''}
        ${e.need.rlk?row('ใช้ร็อค ลี (R) สังหารศัตรู ⚔',Math.min(SV.rlk||0,e.need.rlk),e.need.rlk):''}
        ${e.need.jwc?row('ใช้ความสามารถของซอง จิน วู (HP เหลือ 1) 🗡',Math.min(SV.jwc||0,e.need.jwc),e.need.jwc):''}
        ${e.need.dungeon?row('ผ่านดันเจี้ยน 🕳️',Math.min(SV.dgw||0,e.need.dungeon),e.need.dungeon):''}
        ${e.need.win?row('ชนะบอสเควสอย่างน้อย 1 ครั้ง 🏆',SV.evoWin[e.from]?1:0,1):''}
        ${e.need.coins?row('เงิน 💰',SV.coins,e.need.coins):''}</ul>
        <button id="evoDo" ${ok?'':'disabled'}>🧬 อีโวการ์ด</button></div>
      <div class="box"><b>ด่านเควส: ${b.name}</b>
        <div class="evboss"><img src="${bc.img}" alt="${bc.name}"><div><div>${b.phase2?'เฟส 1 · ':''}${b.count>1?b.count+' ตัว · ':''}HP <b>${b.hp.toLocaleString()}</b>${b.count>1?' ต่อตัว':''} · POWER <b>${b.power}</b></div>${b.phase2?`<div>➜ เฟส 2 · ${CARDS[b.phase2.card].name} · HP <b>${b.phase2.hp.toLocaleString()}</b> · POWER <b>${b.phase2.power}</b></div>`:''}<div>ชนะได้ 💰${b.coins} ทุกครั้ง</div>${b.drops.map(d=>{const r=evDropRate(e,d);return `<div class="drop"><img src="${ITEMS[d.item].img}" alt=""> ${dropName(d)} โอกาสออก ${+(r*100).toFixed(2)}%${d.pick?' (ออกแล้วสุ่มอย่างละ '+Math.round(100/d.pick.length)+'%)':''}${d.first!=null?(SV.evoWin[e.from]?'':' (ชนะครั้งแรก · หลังจากนั้น '+(+(d.rate*100).toFixed(2))+'%)'):''} · มี ${d.pick?d.pick.map(k=>ITEMS[k].name+' ×'+itemN(k)).join(' · '):'×'+itemN(d.item)}</div>`}).join('')}</div></div>
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
  Battle.start({auto:true,a:team,la:team.map(clv),sa:team.map(cstar),...(b.count>1?{b:Array(b.count).fill(b.card),lb:Array(b.count).fill(b.lv),fixB:{hp:b.hp,p:b.power}}:{b:[b.card],lb:[b.lv],bossHp:{max:b.hp,cur:b.hp},bossP:b.power,...(b.phase2?{phase2:b.phase2}:{}),...(b.safe?{bossSafe:true}:{})}),noHeal:true,title:'เควสพัฒนา · '+b.name,first:'a',
    onExit:()=>{evoKeep=true;go('evo')},onEnd:r=>finishEvoQuest(e,r)});
}
function finishEvoQuest(e,r){
  const b=e.boss,back=()=>{evoKeep=true;go('evo')};
  if(!r.win){
    modal(`<h2>พ่ายแพ้…</h2><p>${b.name} (HP ${b.hp.toLocaleString()} · POWER ${b.power}${b.phase2?' → เฟส 2 HP '+b.phase2.hp.toLocaleString()+' · POWER '+b.phase2.power:''}) แข็งแกร่งเกินไป ลองอัปเลเวลการ์ดหรือจัดทีมใหม่</p>${SV.auto!=='off'?'<p class="mute">ออโต้หยุดเพราะแพ้</p>':''}<div class="two"><button id="rAgain">ลองใหม่</button><button class="sec" id="rTeam">จัดทีม</button><button class="sec" id="rBack">กลับ</button></div>`);
    $('#rAgain').onclick=()=>{closeModal();startEvoQuest(e)};$('#rTeam').onclick=()=>go('team');$('#rBack').onclick=back;return}
  SV.coins+=b.coins;const got=[],rates=b.drops.map(d=>evDropRate(e,d));   /* คิดโอกาสก่อนบันทึกว่าชนะครั้งแรกแล้ว */
  b.drops.forEach((d,i)=>{if(Math.random()<rates[i]){const k=d.pick?d.pick[Math.floor(Math.random()*d.pick.length)]:d.item;SV.items[k]=itemN(k)+1;got.push(k)}});SV.evoWin[e.from]=true;save();hud();
  const au=SV.auto!=='off';
  modal(`<h2>ผ่านเควส! 🎉</h2><p>${b.name} · ใช้ ${r.turns} เทิร์น</p><div class="reward"><div>💰 +${b.coins}</div></div>
    ${!b.drops.length?'':got.length?got.map(k=>`<div class="dropbox"><img src="${ITEMS[k].img}" alt=""><div><b>ได้รับ ${ITEMS[k].name}!</b><br><small>มีทั้งหมด ×${itemN(k)}</small></div></div>`).join(''):`<p class="mute">ไม่ได้วัตถุดิบรอบนี้ (${b.drops.map((d,i)=>dropName(d)+' '+(+(rates[i]*100).toFixed(2))+'%').join(' · ')})</p>`}
    ${au?'<p class="mute" id="autoLine"></p>':''}<div class="two"><button id="rAgain">สู้อีกครั้ง</button>${au?'<button class="sec" id="autoStop">หยุดออโต้</button>':''}<button class="sec" id="rBack">กลับ</button></div>`);
  $('#rAgain').onclick=()=>{closeModal();startEvoQuest(e)};$('#rBack').onclick=back;
  if(au){$('#autoStop').onclick=autoStop;autoRun('สู้อีกครั้ง',()=>startEvoQuest(e))}
}
function confirmEvolve(e){
  if(!evoOk(e))return toast('วัตถุดิบยังไม่ครบ');
  const c0=CARDS[e.from],c1=CARDS[e.to];
  modal(`<h2>ยืนยันการอีโว?</h2><p>จะใช้ ${c0.name} ×${e.need.cards}${Object.entries(e.need.more||{}).map(([id,n])=>' · '+CARDS[id].name+' ×'+n).join('')}${Object.entries(e.need.items).map(([k,n])=>' · '+ITEMS[k].name+' ×'+n).join('')}${e.need.coins?' · 💰'+e.need.coins.toLocaleString():''}</p><p class="mute">เพื่อได้ ${c1.name} ${e.grant?'('+e.grant.star+' ดาว'+(e.grant.lv?' เลเวล '+e.grant.lv:' เลเวลสืบทอดจากการ์ดเดิม')+' ทันที)':'(เลเวลจะสืบทอดจากการ์ดเดิม)'}</p><div class="two"><button id="evYes">ยืนยัน อีโว!</button><button class="sec" id="evNo">ยกเลิก</button></div>`);
  $('#evNo').onclick=closeModal;$('#evYes').onclick=()=>doEvolve(e);
}
function doEvolve(e){
  if(!evoOk(e)){closeModal();return renderEvo()}
  const lv=SV.lv[e.from]||1;
  Object.entries(e.need.more||{}).forEach(([id,n])=>{   /* การ์ดอื่นที่ต้องใช้เพิ่ม: หักจำนวน ถ้าหมดให้ถอดออกจากคลัง/ทีม */
    SV.count[id]-=n;if(SV.count[id]<=0){SV.owned=SV.owned.filter(x=>x!==id);delete SV.count[id];delete SV.lv[id];delete SV.star[id];SV.team=SV.team.filter(x=>x!==id)}});
  SV.count[e.from]-=e.need.cards;Object.entries(e.need.items).forEach(([k,n])=>{SV.items[k]=itemN(k)-n});SV.coins-=e.need.coins;onSpend(e.need.coins);
  const isNew=!SV.owned.includes(e.to);
  if(!isNew)SV.count[e.to]=(SV.count[e.to]||1)+1;else{SV.owned.push(e.to);SV.count[e.to]=1}
  if(e.grant){const glv=e.grant.lv||lv;SV.lv[e.to]=isNew?glv:Math.max(SV.lv[e.to]||1,glv);SV.star=SV.star||{};SV.star[e.to]=Math.max(SV.star[e.to]||1,e.grant.star)}   /* เช่น 6 ดาว เลเวล 1 ทันที */
  else SV.lv[e.to]=Math.max(SV.lv[e.to]||1,lv);
  if(SV.count[e.from]<=0){   /* ใช้การ์ดเดิมหมด: ถอดออกจากคลัง และเปลี่ยนในทีมเป็นการ์ดใหม่ */
    SV.owned=SV.owned.filter(x=>x!==e.from);delete SV.count[e.from];delete SV.lv[e.from];delete SV.star[e.from];
    const i=SV.team.indexOf(e.from);if(i>=0){if(SV.team.includes(e.to))SV.team.splice(i,1);else SV.team[i]=e.to}
  }
  save();hud();
  const c=CARDS[e.to],s=statAt(e.to,clv(e.to),cstar(e.to));
  modal(`<h2>EVOLUTION สำเร็จ! 🧬</h2><div class="reveal" style="--c:${RARITY[c.rar]}"><div class="glow"></div><img src="${c.img}" alt="${c.name}"></div><h2>${c.name} ${rarTag(e.to)}</h2><p>Lv.${clv(e.to)} · ${cstar(e.to)}★ · POWER ${s.p} · HP ${s.hp}</p><div class="two"><button id="evOk">ตกลง</button><button class="sec" id="evTeam">ดูทีม</button></div>`);
  $('#evOk').onclick=()=>{closeModal();evoKeep=true;renderEvo()};$('#evTeam').onclick=()=>go('team');
}
$('#devEvo').onclick=()=>{SV.count.naruto=(SV.count.naruto||0)+50;if(!SV.owned.includes('naruto'))SV.owned.push('naruto');SV.items.seal9=itemN('seal9')+1;SV.coins+=10000;save();hud();if(!$('#evoScr').classList.contains('hidden'))renderEvo();toast('ได้ชุดทดสอบอีโว: นารูโตะ ×50, ตราประทับ ×1, 💰10,000')};

/* ---------- เริ่มต้น ---------- */
load();hud();

/* ---------- สารจากผู้พัฒนา ----------
   แก้ข้อความอัปเดตที่ DEV_MSG · เปลี่ยน ver ทุกครั้งที่มีอัปเดตใหม่ (ผู้เล่นที่กด "ไม่ต้องแสดงอีก" จะเห็นข้อความใหม่อีกครั้ง)
   ขึ้นกลางจออัตโนมัติทุกครั้งที่เข้าเกม (หลังเลือกเปิด/ปิดเพลง) · กดปุ่ม "สารจากผู้พัฒนา" ข้างปุ่มออนไลน์เพื่อเปิดดูได้ตลอด */
const DEV_MSG={
  ver:'2026-10-30i',
  title:'สารจากผู้พัฒนา',
  date:'30 ต.ค. 2569',
  sections:[
    {h:'🃏 ระบบ Loadout ทีม',items:[
      'เพิ่มทีมสำรอง 5 ชุด (ทีม 1–5) ที่หน้าจัดทีม จัดไว้ล่วงหน้าได้เลย ไม่ต้องเสียเวลาจัดใหม่ทุกครั้ง',
      'ผูกทีมกับคอนเท้นได้ เช่น ทีม 1 ลงเรด ทีม 2 ลงดันเจี้ยน · กดเลือกทีมที่แถบด้านบนของหน้าคอนเท้นนั้น ครั้งต่อไปที่เข้า ระบบสลับทีมให้อัตโนมัติ',
      'ใช้ได้กับ ด่านปกติ / ด่านฮาโลวีน / เรด / บอสอีเว้นท์ / ไม่มีที่สิ้นสุด / ดันเจี้ยน / เควสตัวละคร / เควสพัฒนา']},
    {h:'🕳️ ดันเจี้ยน',items:[
      'ยกเลิกเพดานดาเมจต่อการลง 1 ครั้ง ตีได้เต็มที่ ดาเมจนับตามจริง และบอสไม่ติดกำแพงดาเมจอีกต่อไป',
      'HP บอสรวมของดันเจี้ยนเพิ่มจาก 1,000,000 เป็น 5,000,000 (มีผลกับรอบที่เปิดใหม่) · ช่วยกันตีให้ถึงกันนะ!']},
    {h:'💫 เอฟเฟกต์ใหม่',items:[
      '🛡 Void Shield: การ์ดที่มีโล่จะมีโดมโล่ใสครอบพร้อมป้ายจำนวนครั้งที่เหลือ · เมื่อโล่รับดาเมจหรือสกิลจะมีคลื่นกระแทก และเมื่อโล่แตกจะมีเศษโล่กระจาย',
      '☠ สั่งตาย (รีอัส / ไอแซ็ค): รีอัสร่ายวงเวทพลังทำลายล้างแล้วยิงลูกพลังใส่ · ไอแซ็คฟันเคียวตัดกันเป็นกากบาท · การ์ดที่ถูกสั่งตายจะมีตรากะโหลกแดงและนับถอยหลังชัดเจน',
      '👑 จักรพรรดิเงา ซอง จิน วู: ทุกครั้งที่โจมตี ทหารเงา (เบรุ / อิกริส / ไออน) จะผุดขึ้นมาจากเงา พุ่งเข้าโจมตีศัตรู แล้วจางหายกลับเข้าเงา',
      '🌀 อุซึมากิ นารูโตะ: เมื่อร่างหลักถูกทำลายจะมีควันคาถาแยกเงาพวยพุ่ง แล้วร่างแยกโผล่ออกมาจากควัน']},
    {h:'🎁 โค้ดรับของขวัญ',items:[
      'CODE: SORRY · ได้รับวัตถุดิบทุกอย่าง อย่างละ 1 ชิ้น',
      'CODE: SWORD · ได้รับมีดเขี้ยวงูของคาสากะ และมีดนักฆ่าอัศวิน อย่างละ 1 เล่ม']},
    {h:'🛠 แก้ไขระบบ',items:[
      'แก้ระบบเซฟไอดี',
      'แก้ไขหน้าคลังและขายการ์ด (UI)']},
    {h:'✨ การ์ดใหม่',items:[
      'สัตว์ประหลาดที่สมบูรณ์แบบ กาโร่ (UR) และ คอสมิค กาโร่ (USR) · พัฒนาได้จากเควสพัฒนา',
      'สองคู่หูซูซาโนะอุขั้นสมบูรณ์ อิทาจิและชิซุย (LTD) · พัฒนาได้จากเควสพัฒนา',
      'ปลุกพลังขั้นสอง ซอง จิน วู (SSR) · พัฒนาได้จากเควสพัฒนา',
      'มิลิม นาวา (SSR) และ ซอง จิน วู (R) · หาได้จากตู้กาชา']},
    {h:'⚖️ ปรับสมดุล',items:[
      'เริงระบำเจ้าหญิงดาบ ชา แฮ อิน (UR): ดาเมจใส่บอสเพิ่มจาก 5 เท่า เป็น 20 เท่า',
      'ชา แฮ อิน (UR): เพิ่มสถานะ "เริงระบำ" เมื่อโจมตี BOSS จะติดแสตกใส่บอส ซัดซ้ำเพิ่มอีก 50% ของความเสียหายที่สร้างใส่บอส',
      'มาสไรเดอร์ คาบูโตะ: ดาเมจใส่บอสเพิ่มจาก 5 เท่า เป็น 50 เท่าของ POWER ปัจจุบัน',
      'มิลิม นาวา: โหมด "ซาตานาเอล" ใช้ได้เพียง 1 ครั้งต่อเกม หลังจากนั้นใช้ไม่ได้อีก',
      'รีอัส เกรโมรี่ และ ไอแซ็ค ฟรอสเตอร์: โอกาสสั่งตายเหลือ 10% และผู้ที่ถูกสั่งตายจะตายหลังผ่านไป 3 เทิร์น (ไม่ตายทันทีแล้ว)']},
    {h:'🎵 ระบบ',items:[
      'เพิ่มหน้าถามก่อนเริ่มเกมว่าจะเปิดหรือปิดเสียงเพลง (เปลี่ยนทีหลังได้ที่ปุ่ม "เพลง" หน้าหลัก)',
      'เพิ่มปุ่ม "สารจากผู้พัฒนา" ไว้ดูรายการอัปเดต']}
  ]
};
const DEV_SEEN_KEY='cardduel_devmsg_seen';
function devMsgShow(auto){
  let seen=null;try{seen=localStorage.getItem(DEV_SEEN_KEY)}catch(e){}
  if(auto&&seen===DEV_MSG.ver)return;
  const body=DEV_MSG.sections.map(s=>`<h3>${s.h}</h3><ul>${s.items.map(t=>`<li>${t}</li>`).join('')}</ul>`).join('');
  modal(`<h2>📜 ${DEV_MSG.title}</h2><p class="mute">อัปเดตวันที่ ${DEV_MSG.date}</p><div class="devmsg">${body}</div>${auto?'<div class="two"><button id="dmOk">รับทราบ</button><button class="sec" id="dmHide">ไม่ต้องแสดงอีก</button></div><p class="mute" style="margin:6px 0 0"><small>"ไม่ต้องแสดงอีก" = ไม่ขึ้นเองจนกว่าจะมีอัปเดตใหม่ · กดปุ่ม 📜 สารจากผู้พัฒนา ได้ตลอด</small></p>':'<button id="dmOk">ปิด</button>'}`);
  $('#dmOk').onclick=closeModal;
  const h=$('#dmHide');if(h)h.onclick=()=>{try{localStorage.setItem(DEV_SEEN_KEY,DEV_MSG.ver)}catch(e){}closeModal()};
}
document.addEventListener('click',e=>{if(e.target.closest('#devMsgBtn'))devMsgShow(false)});
/* เข้าเกม: รอให้ผู้เล่นเลือกเปิด/ปิดเพลงก่อน (music.js) แล้วค่อยขึ้นสารจากผู้พัฒนากลางจอ */
Promise.resolve(window.__musicGateDone).then(()=>setTimeout(()=>devMsgShow(true),350));