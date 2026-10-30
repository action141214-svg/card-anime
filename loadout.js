/* ===== Loadout ทีม 1-5 =====
   เก็บทีมไว้ 5 ชุด แล้วผูกชุดทีมกับคอนเท้นได้ (เรด / ดันเจี้ยน / บอสอีเว้นท์ ฯลฯ)
   เข้าคอนเท้นไหน ระบบสลับเป็นทีมที่ผูกไว้ให้อัตโนมัติ ไม่ต้องจัดใหม่
   SV.team ยังเป็น "ทีมที่ใช้อยู่ตอนนี้" เหมือนเดิม → โค้ดต่อสู้/ซิงก์เซิร์ฟเวอร์ไม่ต้องแก้ */
(()=>{
const N=5;
const SCR={team:'teamScr',stages:'stagesScr',hwstages:'stagesScr',raid:'raidScr',evboss:'evbossScr',endless:'endlessScr',inf:'infScr',dungeon:'dungeonScr',evo:'evoScr'};
const LABEL={stages:'ด่านปกติ',hwstages:'ด่านฮาโลวีน',raid:'เรด',evboss:'บอสอีเว้นท์',endless:'ไม่มีที่สิ้นสุด (อีเว้นท์)',inf:'ไม่มีที่สิ้นสุด',dungeon:'ดันเจี้ยน',evo:'เควส'};
const REND={stagesScr:()=>renderStages(),raidScr:()=>renderRaid(),evbossScr:()=>renderEvBoss(),endlessScr:()=>renderEndless(),infScr:()=>renderInf(),dungeonScr:()=>renderDungeon(),evoScr:()=>renderQuest(),teamScr:()=>renderTeam()};
const keyOf=scr=>scr==='stagesScr'?(sMode==='hw'?'hwstages':'stages'):Object.keys(SCR).find(k=>SCR[k]===scr);

function lo(){
  if(!SV.lo||!Array.isArray(SV.lo.list))SV.lo={cur:0,list:[(SV.team||[]).slice()],bind:{}};
  const o=SV.lo;
  while(o.list.length<N)o.list.push([]);
  if(!(o.cur>=0&&o.cur<N))o.cur=0;
  if(!o.bind||typeof o.bind!=='object')o.bind={};
  return o;
}
function apply(i){
  const o=lo();
  o.list[o.cur]=SV.team.slice();                 // เก็บทีมเดิมก่อนสลับ
  o.cur=i;
  SV.team=o.list[i].filter(x=>SV.owned.includes(x)).slice(0,MAX_TEAM);   // การ์ดที่ขายไปแล้วหลุดออกเอง
  o.list[i]=SV.team.slice();
  save();
  if(window.Online&&Online.srv)Online.srv.syncTeam();
}
/* ทุกครั้งที่เซฟ (จัดทีม/เซิร์ฟเวอร์ส่งทีมมา) ให้ชุดที่ใช้อยู่ตรงกับ SV.team เสมอ */
const _save=save;
save=function(){try{if(SV){const o=lo();o.list[o.cur]=(SV.team||[]).slice()}}catch(e){}return _save.apply(this,arguments)};

function bar(scr){
  const sec=document.getElementById(scr),top=sec&&sec.querySelector(':scope>.top');if(!sec||!top)return;
  let b=sec.querySelector(':scope>.lobar');
  if(!b){b=document.createElement('div');b.className='lobar';top.after(b);
    b.onclick=e=>{const x=e.target.closest('[data-lo]');if(!x)return;const i=+x.dataset.lo,o=lo();
      if(scr!=='teamScr')o.bind[keyOf(scr)]=i;          // เลือกบนหน้าคอนเท้น = ผูกทีมนี้กับคอนเท้นนั้นถาวร
      apply(i);REND[scr]();bar(scr)}}
  const o=lo(),isTeam=scr==='teamScr',key=keyOf(scr);
  const used=Object.keys(o.bind).filter(k=>o.bind[k]===o.cur&&LABEL[k]).map(k=>LABEL[k]);
  b.innerHTML=`<span>${isTeam?'แก้ไขทีม':'ทีมของ '+(LABEL[key]||'')}</span>`+
    Array.from({length:N},(_,i)=>`<button class="lob${i===o.cur?'':' sec'} small" data-lo="${i}">${i+1}<small>${(i===o.cur?SV.team:o.list[i]).filter(x=>SV.owned.includes(x)).length}</small></button>`).join('')+
    (isTeam?`<em>${used.length?'ใช้กับ: '+used.join(', '):'ยังไม่ได้ผูกกับคอนเท้นไหน — เลือกทีมในหน้าคอนเท้นนั้นเพื่อผูก'}</em>`:'');
}
const _go=go;
go=function(name){
  let o;try{o=lo()}catch(e){}
  if(o&&SCR[name]&&name!=='team'){const t=o.bind[name];if(t!=null&&t!==o.cur&&t>=0&&t<N)apply(t)}   // เข้าคอนเท้น → สลับเป็นทีมที่ผูกไว้
  const r=_go.apply(this,arguments);
  try{if(SCR[name])bar(SCR[name])}catch(e){}
  return r;
};
})();
