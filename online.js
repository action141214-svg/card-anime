/* ===== Card Duel – online.js =====
   ล็อคอิน (ไอดี+รหัสผ่าน) · เซฟบนคลาวด์ · ตั้งชื่อ · เพื่อน · แชทโลก · ห้องต่อสู้เรียลไทม์
   ทุกอย่างใช้ Supabase (ตั้งค่าที่ js/config.js · ตารางอยู่ใน supabase.sql)

   วิธีให้การต่อสู้ "ไม่ดีเลย์": ทั้งสองเครื่องจำลองการต่อสู้พร้อมกันด้วย seed เดียวกัน
   (ส่งกันแค่ทีม การแบน และ seed ตอนเริ่ม) ระหว่างสู้จึงไม่ต้องรอเน็ตเลย */
(()=>{
const BASE_KEY='cardduel_save_v1';
const sb=window.__SB_MOCK||((typeof SUPA_URL!=='undefined'&&SUPA_URL&&SUPA_KEY&&window.supabase)?window.supabase.createClient(SUPA_URL,SUPA_KEY):null);
const PICK_N=6,BAN_N=2,ONLINE_LV=100,ONLINE_STAR=5,MAX_TURNS=100,MAX_TURNS_DUO=300;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const EMAIL=u=>u+'@cardduel.app';
const UNAME=/^[a-z0-9_]{3,16}$/;
const NAME_RE=/^[\p{L}\p{M}\p{N}_ ]{2,14}$/u;
let me=null,lobbyCh=null,userCh=null,frCh=null,chatCh=null,saveT=null,saving=false;
let onlinePres={},lastSetSig='',setT=null;
let onlineIds=new Set(),FR={rows:[],profs:{}},chatMsgs=[],lastChat=0,R=null;
const cur=()=>{const l=['onlineScr','roomScr','friendsScr','chatScr'].find(i=>!$('#'+i).classList.contains('hidden'));return l||''};

/* ---------------- ล็อคอิน / สมัคร ---------------- */
function authErr(e){
  const m=(e&&e.message)||String(e||'');
  if(/invalid login/i.test(m))return 'ไอดีหรือรหัสผ่านไม่ถูกต้อง';
  if(/already|registered/i.test(m))return 'ไอดีนี้ถูกใช้แล้ว';
  if(/at least|weak|short/i.test(m))return 'รหัสผ่านสั้นเกินไป (อย่างน้อย 6 ตัว)';
  if(/rate|too many|security purposes/i.test(m))return 'ลองบ่อยเกินไป รอสักครู่แล้วลองใหม่';
  if(/confirm/i.test(m))return 'บัญชียังไม่ยืนยัน — ผู้ดูแลต้องปิด "Confirm email" ใน Supabase (ดู README)';
  if(/fetch|network/i.test(m))return 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจอินเทอร์เน็ตและค่าใน js/config.js';
  return 'เกิดข้อผิดพลาด: '+m;
}
function openAuth(cb,mode='login'){
  const reg=mode==='reg';
  modal(`<h2>${reg?'สมัครสมาชิก':'เข้าสู่ระบบ'}</h2><p>${reg?'ตั้งไอดีและรหัสผ่านของคุณ':'ใช้ไอดีและรหัสผ่านของคุณ'}</p>
    <form class="auth" id="auF"><input id="auU" placeholder="ไอดี (a-z 0-9 _ ยาว 3-16)" autocomplete="username" maxlength="16" autocapitalize="none" spellcheck="false">
    <input id="auP" type="password" placeholder="รหัสผ่าน (อย่างน้อย 6 ตัว)" autocomplete="${reg?'new-password':'current-password'}" maxlength="64">
    <p class="aerr" id="auE"></p>
    <div class="two"><button type="submit" id="auGo">${reg?'สมัครและเข้าเกม':'เข้าสู่ระบบ'}</button><button type="button" class="sec" id="auSw">${reg?'มีไอดีแล้ว? เข้าสู่ระบบ':'ยังไม่มีไอดี? สมัคร'}</button></div>
    <button type="button" class="sec small" id="auOff">เล่นออฟไลน์ (ไม่เซฟบนเซิร์ฟเวอร์)</button></form>`);
  $('#auSw').onclick=()=>openAuth(cb,reg?'login':'reg');
  $('#auOff').onclick=()=>{closeModal();cb()};
  $('#auF').onsubmit=async ev=>{
    ev.preventDefault();
    const u=$('#auU').value.trim().toLowerCase(),p=$('#auP').value,err=t=>{$('#auE').textContent=t};
    if(!UNAME.test(u))return err('ไอดีใช้ได้เฉพาะ a-z, 0-9, _ ความยาว 3-16 ตัว');
    if(p.length<6)return err('รหัสผ่านต้องอย่างน้อย 6 ตัว');
    $('#auGo').disabled=true;err('กำลังเชื่อมต่อ…');
    try{
      let r;
      if(reg){
        r=await sb.auth.signUp({email:EMAIL(u),password:p,options:{data:{username:u}}});
        if(r.error)throw r.error;
        if(!r.data.session){r=await sb.auth.signInWithPassword({email:EMAIL(u),password:p});if(r.error)throw r.error}
      }else{
        r=await sb.auth.signInWithPassword({email:EMAIL(u),password:p});
        if(r.error)throw r.error;
      }
      await afterLogin(r.data.user);closeModal();cb();
    }catch(e){$('#auGo').disabled=false;err(authErr(e))}
  };
  setTimeout(()=>{const i=$('#auU');if(i)i.focus()},50);
}
async function gate(cb){
  if(!sb)return cb();
  if(me)return cb();
  try{
    const {data}=await sb.auth.getSession();
    if(data&&data.session){await afterLogin(data.session.user);return cb()}
  }catch(e){}
  openAuth(cb);
}

/* ---------------- หลังล็อคอิน: โปรไฟล์ + เซฟคลาวด์ ---------------- */
async function afterLogin(user){
  const meta=(user.user_metadata&&user.user_metadata.username)||(user.email||'').split('@')[0];
  me={id:user.id,username:meta,name:null};
  for(let i=0;i<3&&!me.name;i++){
    const {data}=await sb.from('profiles').select('username,display_name').eq('id',me.id).maybeSingle();
    if(data){me.username=data.username||me.username;me.name=data.display_name||null;break}
    await sleep(400);
  }
  await syncSave();
  startRealtime();
  updateMe();
  if(!me.name)await askName(true);
}
const loadLocal=k=>{try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}};
async function syncSave(){
  KEY=BASE_KEY+'_'+me.id;
  const local=loadLocal(KEY);
  let cloud=null;
  try{const {data}=await sb.from('saves').select('data').eq('user_id',me.id).maybeSingle();cloud=data&&data.data}catch(e){toast('โหลดเซฟจากเซิร์ฟเวอร์ไม่ได้ ใช้เซฟในเครื่องก่อน')}
  let use=null,push=false;
  if(cloud&&(!local||(cloud.savedAt||0)>=(local.savedAt||0)))use=cloud;
  else if(local){use=local;push=!cloud||(local.savedAt||0)>(cloud.savedAt||0)}
  else{
    const legacy=loadLocal(BASE_KEY),claimed=localStorage.getItem(BASE_KEY+'_claimed');
    if(legacy&&!claimed&&legacy.owned&&legacy.owned.length){
      const yes=await new Promise(res=>{
        modal(`<h2>พบเซฟเดิมในเครื่องนี้</h2><p>ต้องการนำข้อมูลเดิม (การ์ด เงิน เลเวล) มาใช้กับไอดี <b>${esc(me.username)}</b> ไหม?<br><small>เลือกได้ครั้งเดียวต่อเครื่อง</small></p><div class="two"><button id="lgY">ใช้เซฟเดิม</button><button class="sec" id="lgN">เริ่มใหม่</button></div>`);
        $('#lgY').onclick=()=>{closeModal();res(true)};$('#lgN').onclick=()=>{closeModal();res(false)};
      });
      try{localStorage.setItem(BASE_KEY+'_claimed','1')}catch(e){}
      if(yes){use=legacy;push=true}
    }
  }
  try{if(use)localStorage.setItem(KEY,JSON.stringify(use))}catch(e){}
  load();hud();
  if(push||!cloud)scheduleUpload(300);
}
function onSave(){if(sb&&me){scheduleUpload(2500);retrack()}}
function scheduleUpload(ms){clearTimeout(saveT);saveT=setTimeout(uploadSave,ms)}
let saveOkShown=false,lastSaveMsg='';   /* แจ้งสถานะเซฟบนจอ (เปิด F12 ไม่ได้ก็เห็นว่าเซฟขึ้นเซิร์ฟเวอร์ไหม) */
async function uploadSave(){
  if(!sb||!me||saving)return;
  saving=true;
  try{
    /* เขียนเซฟผ่านฟังก์ชัน save_game บนเซิร์ฟเวอร์ (ตรวจความผิดปกติ) — ไม่เขียนตารางตรงๆ แล้ว */
    const r=await sb.rpc('save_game',{p:SV});if(r&&r.error)throw r.error;
    const s=r&&r.data;
    if(s==='ok'||s==='flag'){lastSaveMsg='';if(!saveOkShown){saveOkShown=true;toast('☁ เซฟขึ้นเซิร์ฟเวอร์แล้ว')}}
    else if(s==='invalid'&&lastSaveMsg!=='invalid'){lastSaveMsg='invalid';toast('เซิร์ฟเวอร์ไม่รับเซฟ (รูปแบบข้อมูลผิดปกติ)')}
    if(s==='reject')await restoreCloud();            /* เซิร์ฟเวอร์ปฏิเสธเซฟที่เพิ่มของผิดปกติ → กู้เซฟล่าสุดที่ถูกต้อง */
    else if(s==='throttled')scheduleUpload(3000);    /* เซฟถี่เกิน → ลองใหม่ทีหลัง */
  }catch(e){const m=(e&&(e.message||e.code))||String(e);if(m!==lastSaveMsg){lastSaveMsg=m;toast('เซฟขึ้นเซิร์ฟเวอร์ไม่สำเร็จ: '+m)}scheduleUpload(8000)}
  saving=false;
}
async function restoreCloud(){
  try{
    const {data}=await sb.from('saves').select('data').eq('user_id',me.id).maybeSingle();
    if(data&&data.data){localStorage.setItem(KEY,JSON.stringify(data.data));toast('เซฟไม่ผ่านการตรวจสอบ กู้คืนเซฟล่าสุดจากเซิร์ฟเวอร์แล้ว');setTimeout(()=>location.reload(),1200)}
  }catch(e){}
}
addEventListener('pagehide',()=>{if(me&&saveT){clearTimeout(saveT);uploadSave()}});
addEventListener('visibilitychange',()=>{if(document.hidden&&me&&saveT){clearTimeout(saveT);uploadSave()}});
function updateMe(){['onMe','roomMe','frMe','chMe'].forEach(i=>{const e=$('#'+i);if(e)e.textContent=me?'👤 '+(me.name||me.username):'—'});
  const lb=$('#logoutBtn');if(lb){lb.classList.toggle('hidden',!(sb&&me));lb.textContent='🚪 ออกจากระบบ'+(me?' ('+(me.name||me.username)+')':'')}}

/* ---------------- ตั้งชื่อ ---------------- */
function askName(force){
  return new Promise(res=>{
    modal(`<h2>${force?'ตั้งชื่อของคุณ':'เปลี่ยนชื่อ'}</h2><p>ชื่อนี้จะแสดงให้เพื่อนและคู่ต่อสู้เห็น (2-14 ตัวอักษร ห้ามซ้ำกับคนอื่น)</p>
      <form class="auth" id="nmF"><input id="nmI" maxlength="14" placeholder="ชื่อที่แสดง" value="${esc(me.name||'')}" autocomplete="off"><p class="aerr" id="nmE"></p>
      <div class="two"><button type="submit" id="nmGo">บันทึกชื่อ</button>${force?'':'<button type="button" class="sec" id="nmX">ยกเลิก</button>'}</div></form>`);
    if(!force)$('#nmX').onclick=()=>{closeModal();res(false)};
    $('#nmF').onsubmit=async ev=>{
      ev.preventDefault();
      const n=$('#nmI').value.trim().replace(/\s+/g,' '),err=t=>{$('#nmE').textContent=t};
      if(!NAME_RE.test(n))return err('ใช้ตัวอักษร ตัวเลข _ หรือเว้นวรรค ความยาว 2-14 ตัว');
      $('#nmGo').disabled=true;err('กำลังบันทึก…');
      const r=await sb.from('profiles').update({display_name:n}).eq('id',me.id);
      if(r.error){$('#nmGo').disabled=false;return err(r.error.code==='23505'||/duplicate|unique/i.test(r.error.message)?'ชื่อนี้มีคนใช้แล้ว':'บันทึกไม่สำเร็จ: '+r.error.message)}
      me.name=n;updateMe();if(lobbyCh){const p=presPayload();lastSetSig=JSON.stringify(p);lobbyCh.track(p)}closeModal();toast('ตั้งชื่อเป็น "'+n+'" แล้ว');res(true);if(cur()==='onlineScr')hub();
    };
    setTimeout(()=>{const i=$('#nmI');if(i){i.focus();i.select()}},50);
  });
}

/* ---------------- Realtime: ออนไลน์ / คำเชิญ / เพื่อน ---------------- */
/* จำนวนผู้เล่นออนไลน์ (นับจาก presence ของห้อง 'lobby' · 1 บัญชี = 1 คน แม้เปิดหลายแท็บ) — อัปเดตที่ปุ่มหน้าหลักและหน้าออนไลน์ */
/* เซ็ตการ์ดที่แสดงให้คนอื่นเห็น (การ์ดในทีม · เลเวล · ดาว) ส่งไปกับ presence ของห้อง lobby */
const mySet=()=>{try{return SV.team.filter(x=>SV.owned.includes(x)).slice(0,8).map(id=>[id,SV.lv[id]||1,SV.star[id]||1])}catch(e){return[]}};
const presPayload=()=>({name:me.name||me.username,team:mySet()});
const cleanTeam=t=>Array.isArray(t)?t.slice(0,8).filter(x=>Array.isArray(x)&&typeof x[0]==='string'&&CARDS[x[0]]).map(x=>[x[0],Math.max(1,x[1]|0),Math.max(1,x[2]|0)]):[];
function retrack(){   // เซ็ตเปลี่ยนเมื่อไหร่ ส่งให้คนอื่นเห็น (หน่วง 2 วิ กันยิงถี่)
  if(!lobbyCh||!me)return;
  const p=presPayload(),sig=JSON.stringify(p);if(sig===lastSetSig)return;
  clearTimeout(setT);setT=setTimeout(()=>{if(lobbyCh){lastSetSig=sig;lobbyCh.track(p)}},2000);
}
const setHtml=team=>team&&team.length?`<span class="pset">${team.map(([id,l,s])=>`<img class="th pt" src="${CARDS[id].img}" alt="" title="${esc(CARDS[id].name)} Lv.${l} ${s}★">`).join('')}</span>`:'<small class="mute">ยังไม่มีทีม</small>';
/* รายชื่อคนออนไลน์ตอนนี้ + เซ็ตการ์ดของแต่ละคน (หน้าออนไลน์) */
function renderOnlineList(){
  const b=document.getElementById('onList');if(!b||!me)return;
  const ids=Object.keys(onlinePres).sort((x,y)=>(x===me.id?-1:y===me.id?1:0)||onlinePres[x].name.localeCompare(onlinePres[y].name));
  const isFr=id=>FR.rows.some(r=>r.status==='accepted'&&(r.requester===id||r.addressee===id));
  b.innerHTML=ids.length?ids.map(id=>{const p=onlinePres[id];return `<div class="fr"><i class="od on"></i><b>${esc(p.name)}</b>${id===me.id?'<small>(คุณ)</small>':isFr(id)?'<small>👥 เพื่อน</small>':''}<span class="sp"></span>${setHtml(p.team)}</div>`}).join(''):'<p class="mute">กำลังโหลด…</p>';
}
function updOnCount(){
  const n=onlineIds.size,live=!!(me&&lobbyCh);
  const hb=document.getElementById('onCnt');if(hb)hb.textContent=live?' 🟢'+n:'';
  const hh=document.getElementById('onHubCnt');if(hh)hh.textContent=n;
  renderOnlineList();
}
function startRealtime(){
  stopRealtime();
  lobbyCh=sb.channel('lobby',{config:{presence:{key:me.id}}});
  lobbyCh.on('presence',{event:'sync'},()=>{
    const ps=lobbyCh.presenceState();onlineIds=new Set(Object.keys(ps));
    onlinePres={};Object.entries(ps).forEach(([id,a])=>{const p=(a&&a[a.length-1])||{};onlinePres[id]={name:String(p.name||'ผู้เล่น').slice(0,20),team:cleanTeam(p.team)}});
    updOnCount();if(cur()==='friendsScr')renderFriends();
    if(window.Online&&typeof window.Online.onPres==='function')window.Online.onPres();
  });
  lobbyCh.subscribe(st=>{if(st==='SUBSCRIBED'){const p=presPayload();lastSetSig=JSON.stringify(p);lobbyCh.track(p)}});
  userCh=sb.channel('user-'+me.id);
  userCh.on('broadcast',{event:'invite'},m=>onInvite(m.payload)).subscribe();
  frCh=sb.channel('fr-'+me.id);
  frCh.on('postgres_changes',{event:'*',schema:'public',table:'friendships'},()=>loadFriends()).subscribe();
  loadFriends();
}
function stopRealtime(){[lobbyCh,userCh,frCh,chatCh].forEach(c=>{if(c)try{sb.removeChannel(c)}catch(e){}});lobbyCh=userCh=frCh=chatCh=null;onlineIds=new Set();onlinePres={};lastSetSig='';updOnCount()}
function onInvite(p){
  if(!p||!/^\d{6}$/.test(p.code||'')||R)return;
  if(!$('#battleScr').classList.contains('hidden'))return;
  modal(`<h2>คำเชิญต่อสู้ ⚔️</h2><p><b>${esc(String(p.from||'เพื่อน').slice(0,20))}</b> ชวนคุณเข้าห้อง ${p.code}</p><div class="two"><button id="ivY">เข้าร่วม</button><button class="sec" id="ivN">ปฏิเสธ</button></div>`);
  $('#ivY').onclick=()=>{closeModal();joinRoom(p.code)};$('#ivN').onclick=closeModal;
}

/* ---------------- เพื่อน ---------------- */
async function loadFriends(){
  if(!sb||!me)return;
  try{
    const {data:rows}=await sb.from('friendships').select('id,requester,addressee,status').or(`requester.eq.${me.id},addressee.eq.${me.id}`);
    const ids=[...new Set((rows||[]).flatMap(r=>[r.requester,r.addressee]).filter(x=>x!==me.id))];
    const profs={};
    if(ids.length){const {data}=await sb.from('profiles').select('id,username,display_name').in('id',ids);(data||[]).forEach(p=>profs[p.id]=p)}
    FR={rows:rows||[],profs};
  }catch(e){}
  const n=FR.rows.filter(r=>r.status==='pending'&&r.addressee===me.id).length,d=$('#onDot');
  if(d){d.classList.toggle('hidden',!n);d.textContent=n}
  if(cur()==='friendsScr')renderFriends();
  if(cur()==='onlineScr')hub();
}
const pname=id=>{const p=FR.profs[id];return p?(p.display_name||p.username):'ผู้เล่น'};
function renderFriends(){
  const b=$('#frBody');if(!b)return;
  const rows=FR.rows,inc=rows.filter(r=>r.status==='pending'&&r.addressee===me.id),out=rows.filter(r=>r.status==='pending'&&r.requester===me.id),fr=rows.filter(r=>r.status==='accepted');
  const other=r=>r.requester===me.id?r.addressee:r.requester;
  fr.sort((x,y)=>(onlineIds.has(other(y))?1:0)-(onlineIds.has(other(x))?1:0));
  b.innerHTML=`<form class="frAdd" id="frAdd"><input id="frQ" placeholder="พิมพ์ไอดี หรือชื่อที่แสดงของเพื่อน" maxlength="16" autocomplete="off"><button type="submit">➕ เพิ่มเพื่อน</button></form>
    ${inc.length?`<h3>คำขอเป็นเพื่อน (${inc.length})</h3><div class="frlist">${inc.map(r=>`<div class="fr"><b>${esc(pname(r.requester))}</b><small>@${esc((FR.profs[r.requester]||{}).username||'')}</small><span class="sp"></span><button class="small" data-acc="${r.id}">รับ</button><button class="sec small" data-del="${r.id}">ปฏิเสธ</button></div>`).join('')}</div>`:''}
    <h3>เพื่อนของฉัน (${fr.length}) · ออนไลน์ ${fr.filter(r=>onlineIds.has(other(r))).length}</h3>
    <div class="frlist">${fr.length?fr.map(r=>{const id=other(r),on=onlineIds.has(id);return `<div class="fr"><i class="od${on?' on':''}"></i><b>${esc(pname(id))}</b><small>@${esc((FR.profs[id]||{}).username||'')}</small><span class="sp"></span>${on?`<button class="small" data-inv="${id}">⚔ ชวนสู้</button>`:'<small>ออฟไลน์</small>'}<button class="sec small" data-del="${r.id}" title="ลบเพื่อน">✕</button></div>`}).join(''):'<p class="mute">ยังไม่มีเพื่อน — ค้นหาด้วยไอดีหรือชื่อด้านบน</p>'}</div>
    ${out.length?`<h3>รอให้อีกฝ่ายตอบรับ (${out.length})</h3><div class="frlist">${out.map(r=>`<div class="fr"><b>${esc(pname(r.addressee))}</b><span class="sp"></span><button class="sec small" data-del="${r.id}">ยกเลิก</button></div>`).join('')}</div>`:''}`;
  $('#frAdd').onsubmit=async ev=>{
    ev.preventDefault();
    const q=$('#frQ').value.trim();if(!q)return;
    const {data,error}=await sb.rpc('find_player',{q});
    if(error)return toast('ค้นหาไม่สำเร็จ');
    const t=(data||[]).find(x=>x.id!==me.id);
    if(!t)return toast((data||[]).length?'นั่นคือตัวคุณเอง':'ไม่พบผู้เล่นนี้');
    if(FR.rows.some(r=>r.requester===t.id||r.addressee===t.id))return toast('มีคำขอ/เป็นเพื่อนกันอยู่แล้ว');
    const r=await sb.from('friendships').insert({requester:me.id,addressee:t.id});
    if(r.error)return toast('ส่งคำขอไม่สำเร็จ');
    $('#frQ').value='';toast('ส่งคำขอถึง '+(t.display_name||t.username)+' แล้ว');loadFriends();
  };
}
function bindFriends(){
  $('#frBody').onclick=async e=>{
    const a=e.target.closest('[data-acc]'),d=e.target.closest('[data-del]'),i=e.target.closest('[data-inv]');
    if(a){await sb.from('friendships').update({status:'accepted'}).eq('id',+a.dataset.acc);loadFriends()}
    else if(d){if(e.target.closest('button').title==='ลบเพื่อน'&&!confirm('ลบเพื่อนคนนี้?'))return;await sb.from('friendships').delete().eq('id',+d.dataset.del);loadFriends()}
    else if(i)inviteFriend(i.dataset.inv);
  };
}
async function inviteFriend(fid){
  if(!R){const ok=await createRoom('1v1');if(!ok)return}
  const c=sb.channel('user-'+fid);
  c.subscribe(st=>{if(st==='SUBSCRIBED'){c.send({type:'broadcast',event:'invite',payload:{code:R.code,from:me.name||me.username}});setTimeout(()=>sb.removeChannel(c),600)}});
  toast('ส่งคำเชิญแล้ว — รอเพื่อนเข้าห้อง '+R.code);
  if(cur()!=='roomScr')go('room');
}

/* ---------------- แชทโลก ---------------- */
async function chatOpen(){
  const log=$('#chatLog');
  if(!chatCh){
    const {data}=await sb.from('chat_messages').select('id,name,text,created_at,user_id').order('created_at',{ascending:false}).limit(60);
    chatMsgs=(data||[]).reverse();
    chatCh=sb.channel('chat-public');
    chatCh.on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_messages'},p=>{
      if(chatMsgs.some(m=>m.id===p.new.id))return;
      chatMsgs.push(p.new);if(chatMsgs.length>150)chatMsgs.shift();if(cur()==='chatScr')drawChat();
    }).subscribe();
  }
  drawChat();
}
function drawChat(){
  const log=$('#chatLog');if(!log)return;
  const near=log.scrollHeight-log.scrollTop-log.clientHeight<80;
  log.innerHTML=chatMsgs.length?chatMsgs.map(m=>{const t=new Date(m.created_at),hh=String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0');
    return `<div class="cm${m.user_id===me.id?' mine':''}"><b>${esc(m.name)}</b><span>${esc(m.text)}</span><small>${hh}</small></div>`}).join(''):'<p class="mute">ยังไม่มีข้อความ — ทักทายคนแรกเลย!</p>';
  if(near||chatMsgs.length<=60)log.scrollTop=log.scrollHeight;
}
$('#chatForm').onsubmit=async ev=>{
  ev.preventDefault();
  const i=$('#chatIn'),t=i.value.trim();if(!t||!me)return;
  if(!me.name)return askName(true);
  if(Date.now()-lastChat<1500)return toast('ส่งเร็วเกินไป รอสักครู่');
  lastChat=Date.now();i.value='';
  const r=await sb.from('chat_messages').insert({text:t.slice(0,200)});
  if(r.error){i.value=t;toast(/เร็วเกินไป/.test(r.error.message)?'ส่งเร็วเกินไป รอสักครู่':'ส่งไม่สำเร็จ')}
};

/* ---------------- หน้าออนไลน์ ---------------- */
function hub(){
  const b=$('#onBody');updateMe();
  if(!sb){b.innerHTML=`<div class="box onmsg"><h2>ยังไม่ได้ตั้งค่าเซิร์ฟเวอร์</h2><p>ใส่ค่า Supabase ในไฟล์ <b>js/config.js</b> แล้วโหลดเกมใหม่ (ดูขั้นตอนใน README.md)</p></div>`;return}
  if(!me){b.innerHTML=`<div class="box onmsg"><h2>ยังไม่ได้เข้าสู่ระบบ</h2><p>ต้องล็อคอินก่อนจึงจะเล่นออนไลน์ได้</p><button id="onLogin">เข้าสู่ระบบ</button></div>`;$('#onLogin').onclick=()=>openAuth(()=>hub());return}
  const pend=FR.rows.filter(r=>r.status==='pending'&&r.addressee===me.id).length;
  b.innerHTML=`<div class="box onprof"><div><b class="nm">${esc(me.name||me.username)}</b><small>ไอดี: ${esc(me.username)} · ☁ เซฟบนเซิร์ฟเวอร์อัตโนมัติ</small><small class=\"oncount\">🟢 ผู้เล่นออนไลน์ตอนนี้ <b id=\"onHubCnt\">${onlineIds.size}</b> คน</small></div><div class="two"><button class="sec small" id="onRn">✏ เปลี่ยนชื่อ</button><button class="sec small" id="onOut">ออกจากระบบ</button></div></div>
    <div class="box onlistbox"><h3>🟢 ใครออนไลน์ตอนนี้ (พร้อมเซ็ตการ์ด)</h3><div class="frlist" id="onList"></div></div>
    <div class="ontiles">
      <button class="mode m-stage" id="onCreate1"><span class="mi">⚔️</span><b>สร้างห้อง 1 ต่อ 1</b><small>ผู้เล่น 2 คน · เลขห้อง 6 หลัก<br>ส่งให้เพื่อนเข้ามาสู้</small></button>
      <button class="mode m-hws" id="onCreate2"><span class="mi">🛡️</span><b>สร้างห้อง 2 ต่อ 2</b><small>ผู้เล่น 4 คน ทีมละ 2 คน<br>คุมการ์ดคนละชุด เลือกเป้าโจมตีเอง</small></button>
      <div class="mode m-raid onjoin"><span class="mi">🔑</span><b>เข้าห้อง</b><input id="onCode" inputmode="numeric" maxlength="6" placeholder="เลขห้อง 6 หลัก" autocomplete="off"><button id="onJoin">เข้าห้อง</button></div>
      <button class="mode m-chal" data-go="friends"><span class="mi">👥</span><b>เพื่อน</b><small>เพิ่มเพื่อน · ชวนสู้<br>${pend?'มีคำขอใหม่ '+pend+' รายการ':'ดูว่าใครออนไลน์'}</small></button>
      <button class="mode m-hwg" data-go="chat"><span class="mi">💬</span><b>แชทโลก</b><small>คุยกับผู้เล่นทุกคน</small></button>
    </div>
    <p class="mute onnote">ต่อสู้ออนไลน์: เลือกโหมด 1 ต่อ 1 หรือ 2 ต่อ 2 ตอนสร้างห้อง · เลือก ${PICK_N} ใบ → แบนของคู่ตรงข้ามคนละ ${BAN_N} ใบ → สู้ด้วย ${PICK_N-BAN_N} ใบ · ทุกการ์ดใช้ Lv.${ONLINE_LV} ${ONLINE_STAR}★ เท่ากัน</p>`;
  renderOnlineList();
  $('#onRn').onclick=()=>askName(false);
  $('#onOut').onclick=logout;
  $('#onCreate1').onclick=()=>createRoom('1v1');$('#onCreate2').onclick=()=>createRoom('2v2');
  $('#onJoin').onclick=()=>joinRoom($('#onCode').value.trim());
  $('#onCode').onkeydown=e=>{if(e.key==='Enter')joinRoom($('#onCode').value.trim())};
}
/* ออกจากระบบ: ถามยืนยันด้วยหน้าต่างในเกม → อัปโหลดเซฟล่าสุด → ออกจากห้อง/ตัดการเชื่อมต่อ → signOut → โหลดหน้าใหม่ (กลับหน้าเริ่ม/ล็อคอิน) */
function logout(){
  if(!sb||!me)return;
  modal(`<h2>ออกจากระบบ?</h2><p>ระบบจะบันทึกเซฟขึ้นเซิร์ฟเวอร์ก่อนออก<br><small>ไอดี: ${esc(me.username)} · ล็อคอินกลับมาด้วยไอดีเดิมได้ตลอด</small></p><div class="two"><button id="loY">ออกจากระบบ</button><button class="sec" id="loN">ยกเลิก</button></div>`);
  $('#loN').onclick=closeModal;$('#loY').onclick=doLogout;
}
async function doLogout(){
  const b=$('#loY');if(b){b.disabled=true;b.textContent='กำลังออกจากระบบ…'}
  try{clearTimeout(saveT);await uploadSave()}catch(e){}
  try{if(R)await leaveRoom(true)}catch(e){}
  stopRealtime();try{await sb.auth.signOut()}catch(e){}
  me=null;location.reload();
}
function friends(){if(!sb||!me){go('online');return}updateMe();bindFriends();renderFriends();loadFriends()}
function chat(){if(!sb||!me){go('online');return}updateMe();chatOpen()}

/* ---------------- ห้องต่อสู้ (2 คน = 1 ต่อ 1 · ครบ 4 คน = 2 ต่อ 2 ทีมละ 2 คน) ----------------
   ลำดับผู้เล่น: [เจ้าของห้อง, คนที่ 2, คนที่ 3, คนที่ 4] → ทีม A = ลำดับ 0,2 · ทีม B = ลำดับ 1,3
   คู่แบน: ลำดับ 0↔1 และ 2↔3 (แต่ละคนแบนการ์ดของคนตรงข้าม 2 ใบ) · แต่ละคนเหลือ 4 ใบ ใบแรกลงสนาม ที่เหลือเป็นตัวสำรองของตัวเอง */
const owned=()=>SORTED.filter(id=>SV.owned.includes(id));
const rand6=()=>String(Math.floor(100000+Math.random()*900000));
const MAX_P=4,KEEP_N=PICK_N-BAN_N;
const players=()=>{const m=new Map();if(R&&R.ch){Object.values(R.ch.presenceState()).flat().forEach(p=>{if(p&&p.id)m.set(p.id,p)})}
  return[...m.values()].sort((x,y)=>(x.role==='host'?-1:0)-(y.role==='host'?-1:0)||((x.t||0)-(y.t||0))||(x.id<y.id?-1:1))};
const teamOf=i=>i%2?'b':'a';
const idxOf=id=>(R&&R.order?R.order:[]).findIndex(p=>p.id===id);
const myIdx=()=>idxOf(me.id);
const myTeam=()=>teamOf(Math.max(0,myIdx()));
const oppIdx=i=>i^1;
const pnameOf=id=>{const p=(R.order||[]).find(x=>x.id===id);return p?p.name:'ผู้เล่น'};
const validOrder=(o,n)=>Array.isArray(o)&&(n?o.length===n:(o.length===2||o.length===4))&&o.every(p=>p&&typeof p.id==='string'&&typeof p.name==='string')&&new Set(o.map(p=>p.id)).size===o.length&&o.some(p=>p.id===me.id);
function joinChannel(code,role,mode){
  return new Promise(res=>{
    const ch=sb.channel('room-'+code,{config:{broadcast:{self:false},presence:{key:me.id}}});
    ch.on('presence',{event:'sync'},()=>roomSync());
    ['phase','pick','ban','start','result','rematch','forfeit','bye','tgt'].forEach(ev=>ch.on('broadcast',{event:ev},m=>onMsg(ev,m.payload||{})));
    let done=false;
    ch.subscribe(st=>{
      if(st==='SUBSCRIBED'&&!done){done=true;ch.track({id:me.id,name:me.name||me.username,role,t:Date.now(),mode:mode||null});res(ch)}
      else if((st==='CHANNEL_ERROR'||st==='TIMED_OUT')&&!done){done=true;res(null)}
    });
  });
}
function newRoom(code,ch,role,mode){
  R={code,ch,role,mode:mode||'1v1',phase:'lobby',order:null,picks:{},bans:{},rem:new Set(),results:{},tgt:{},tgtW:null,myPick:null,myBan:null,rosters:null,sel:[],leftT:null,battle:false,over:false};
}
function needCards(){if(owned().length<PICK_N){toast('ต้องมีการ์ดอย่างน้อย '+PICK_N+' ใบจึงจะต่อสู้ออนไลน์ได้');return true}return false}
async function createRoom(mode){
  mode=mode==='2v2'?'2v2':'1v1';
  if(!me)return false;
  if(R)return true;
  if(needCards())return false;
  toast('กำลังสร้างห้อง…');
  for(let t=0;t<5;t++){
    const code=rand6(),ch=await joinChannel(code,'host',mode);
    if(!ch){toast('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');return false}
    await sleep(700);
    newRoom(code,ch,'host',mode);
    const others=players().filter(p=>p.id!==me.id&&p.role==='host');
    if(!others.length){go('room');return true}
    try{sb.removeChannel(ch)}catch(e){}R=null;
  }
  toast('สร้างห้องไม่สำเร็จ ลองใหม่อีกครั้ง');return false;
}
async function joinRoom(code){
  if(!me)return;
  if(!/^\d{6}$/.test(code||''))return toast('เลขห้องต้องเป็นตัวเลข 6 หลัก');
  if(R)return toast('คุณอยู่ในห้องอยู่แล้ว');
  if(needCards())return;
  toast('กำลังเข้าห้อง…');
  const ch=await joinChannel(code,'guest');
  if(!ch)return toast('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
  newRoom(code,ch,'guest','1v1');
  let host=null,others=[];
  for(let i=0;i<14&&!host;i++){await sleep(200);const ps=players();host=ps.find(p=>p.role==='host'&&p.id!==me.id);others=ps.filter(p=>p.role==='guest'&&p.id!==me.id)}
  const fail=m=>{try{sb.removeChannel(ch)}catch(e){}R=null;toast(m)};
  if(!host)return fail('ไม่พบห้องนี้ (เลขห้องผิดหรือห้องปิดแล้ว)');
  if(host.lock)return fail('ห้องนี้เริ่มเล่นไปแล้ว');
  const hm=host.mode==='2v2'?'2v2':'1v1';R.mode=hm;
  if(others.length+1>=(hm==='2v2'?4:2))return fail('ห้องนี้เต็มแล้ว ('+(hm==='2v2'?'2 ต่อ 2 ครบ 4 คน':'1 ต่อ 1 ครบ 2 คน')+')');
  go('room');
}
async function leaveRoom(silent){
  if(!R)return;
  const r=R;R=null;clearTimeout(r.leftT);
  if(r.battle&&!r.over)Battle.stop();
  try{r.ch.send({type:'broadcast',event:'bye',payload:{}});await sleep(120);r.ch.untrack();sb.removeChannel(r.ch)}catch(e){}
  endBattleUi();
  if(!silent)go('online');
}
$('#roomLeave').onclick=()=>{if(R&&R.battle&&!R.over)return confirmForfeit();leaveRoom()};
const send=(event,payload={})=>{if(R)R.ch.send({type:'broadcast',event,payload})};
function missing(){   /* ผู้เล่นในรอบนี้ที่หลุดออกจากห้อง */
  if(!R||!R.order)return[];const here=new Set(players().map(p=>p.id));return R.order.filter(p=>!here.has(p.id))}
function roomSync(){
  if(!R)return;
  if(R.phase==='lobby'){if(cur()==='roomScr')renderRoom();return}
  if(R.over)return;
  if(missing().length){if(!R.leftT)R.leftT=setTimeout(()=>{R&&(R.leftT=null);R&&!R.over&&memberLeft(false)},6000)}   /* รอ 6 วินาทีเผื่อเน็ตสะดุด */
  else if(R.leftT){clearTimeout(R.leftT);R.leftT=null}
}
/* ผู้เล่นคนหนึ่งออกจากห้อง/ยอมแพ้กลางทาง → ทีมของเขาแพ้ (ผลเหมือนกันทุกเครื่อง) */
function memberLeft(forfeitId){
  if(!R||R.over)return;
  const gone=forfeitId?[{id:forfeitId}]:missing();if(!gone.length)return;
  const gi=idxOf(gone[0].id),same=teamOf(gi)===myTeam(),nm_=pnameOf(gone[0].id);
  R.over=true;const wasBattle=R.battle;
  if(wasBattle){Battle.stop();endBattleUi()}
  R.phase='result';
  const two=R.order.length>2;
  resultModal(same?'lose':'win',(forfeitId?nm_+' ยอมแพ้':nm_+' ออกจากห้อง')+(two?(same?' — ทีมของคุณแพ้':' — ทีมของคุณชนะ'):''));
}
function resetRound(){
  R.phase='pick';R.picks={};R.bans={};R.rem=new Set();R.results={};R.tgt={};R.tgtW=null;
  R.myPick=null;R.myBan=null;R.rosters=null;R.sel=[];R.battle=false;R.over=false;
}
const validIds=(a,n)=>Array.isArray(a)&&a.length===n&&new Set(a).size===n&&a.every(x=>typeof x==='string'&&CARDS[x]);
function onMsg(ev,p){
  if(!R)return;
  const from=typeof p.from==='string'?p.from:null;
  if(ev==='phase'&&p.p==='pick'&&R.role==='guest'){
    if(validOrder(p.order)){R.order=p.order.map(x=>({id:x.id,name:x.name}))}
    if(R.order){resetRound();closeModal();go('room')}
  }
  else if(ev==='pick'){if(R.order&&R.phase!=='battle'&&from&&idxOf(from)>=0&&validIds(p.ids,PICK_N)&&!R.picks[from]){R.picks[from]=p.ids;advance()}}
  else if(ev==='ban'){if(R.order&&R.phase!=='battle'&&from&&idxOf(from)>=0&&validIds(p.ids,BAN_N)&&!R.bans[from]){R.bans[from]=p.ids;advance()}}
  else if(ev==='start'){
    if(R.role==='guest'&&!R.battle&&R.order&&validOrder(p.order,R.order.length)&&Array.isArray(p.rosters)&&p.rosters.length===p.order.length&&p.rosters.every(r=>validIds(r,KEEP_N))&&Number.isInteger(p.seed)&&(p.first==='a'||p.first==='b'))beginBattle(p);
  }
  else if(ev==='tgt'){if(R.battle&&Number.isInteger(p.n)&&Number.isInteger(p.i)&&p.i>=0&&p.i<KEEP_N*MAX_P){R.tgt[p.n]=p.i;if(R.tgtW&&R.tgtW.n===p.n){const w=R.tgtW;R.tgtW=null;w.res(p.i)}}}
  else if(ev==='result'){if(from){R.results[from]=p;checkResults()}}
  else if(ev==='rematch'){if(from&&idxOf(from)>=0){R.rem.add(from);checkRematch()}}
  else if(ev==='forfeit'){if(R.battle&&!R.over&&from&&idxOf(from)>=0)memberLeft(from)}
  else if(ev==='bye'){setTimeout(()=>{if(R&&!R.over&&R.phase!=='lobby'&&missing().length)memberLeft(false)},500)}
  if(cur()==='roomScr'&&R&&!R.battle)renderRoom();
}
function advance(){
  if(!R.order)return;const n=R.order.length;
  if(R.phase==='pick'&&R.myPick&&Object.keys(R.picks).length>=n){R.phase='ban';R.sel=[]}
  if(R.phase==='ban'&&R.myBan&&Object.keys(R.bans).length>=n)finalize();
}
function finalize(){
  R.phase='wait';
  if(R.role==='host'){
    const o=R.order;
    const rosters=o.map((p,i)=>{const pk=R.picks[p.id],ob=R.bans[o[oppIdx(i)].id];
      const ban=ob&&ob.every(x=>pk.includes(x))?ob:[];let r=pk.filter(x=>!ban.includes(x));if(r.length!==KEEP_N)r=pk.slice(0,KEEP_N);return r});
    const seed=(Math.random()*4294967295)>>>0,first=Math.random()<.5?'a':'b';
    const pl={order:o.map(p=>({id:p.id,name:p.name})),rosters,seed,first};
    send('start',pl);beginBattle(pl);
  }else renderRoom();
}
function beginBattle(pl){
  R.phase='battle';R.battle=true;R.over=false;R.startData=pl;R.order=pl.order.map(x=>({id:x.id,name:x.name}));R.tgt={};R.tgtW=null;
  const n=pl.order.length,duo=n===4,mi=myIdx();
  const sideIdx=k=>pl.order.map((p,i)=>i).filter(i=>teamOf(i)===k);
  const A=sideIdx('a').flatMap(i=>pl.rosters[i]),B=sideIdx('b').flatMap(i=>pl.rosters[i]);
  const tn=k=>sideIdx(k).map(i=>pl.order[i].name).join(' + ');
  const names={a:tn('a'),b:tn('b')};
  const slotNames={a:sideIdx('a').map(i=>pl.order[i].name),b:sideIdx('b').map(i=>pl.order[i].name)};
  const row=(k,L)=>`<div><b>${esc(names[k])}</b><div class="vsc">${L.map(id=>`<img src="${CARDS[id].img}" alt="">`).join('')}</div></div>`;
  modal(`<h2>เตรียมสู้! ${duo?'2 ต่อ 2':'1 ต่อ 1'}</h2><div class="vsrow">${row('a',A)}<div class="vs">VS</div>${row('b',B)}</div><p class="mute">เริ่มใน 3 วินาที…</p>`);
  setTimeout(()=>{
    if(!R||!R.battle||R.over)return;
    closeModal();
    const la=A.map(()=>ONLINE_LV),sa=A.map(()=>ONLINE_STAR),lb=B.map(()=>ONLINE_LV),sbs=B.map(()=>ONLINE_STAR);
    ['pauseBtn','speedBtn','autoBtn'].forEach(i=>$('#'+i).classList.add('hidden'));$('#backBtn').textContent='ยอมแพ้';
    Battle.start({online:true,duo,per:KEEP_N,mySlot:duo?{k:teamOf(mi),s:mi>>1}:null,slotNames:duo?slotNames:null,sendTarget:duo?sendTarget:null,recvTarget:duo?recvTarget:null,
      a:A,b:B,la,sa,lb,sb:sbs,seed:pl.seed,first:pl.first,maxTurns:duo?MAX_TURNS_DUO:MAX_TURNS,names,
      title:'ออนไลน์ '+(duo?'2v2':'1v1')+' · ห้อง '+R.code+' · '+names.a+' vs '+names.b,onBack:confirmForfeit,onEnd:onBattleEnd});
  },3000);
}
/* 2v2: ส่ง/รอรับ "เป้าหมายที่เลือก" ของแต่ละเทิร์น (เจ้าของการ์ดที่ถึงตาเป็นคนเลือก คนอื่นรอรับ) */
function sendTarget(n,i){send('tgt',{n,i});setTimeout(()=>{if(R)send('tgt',{n,i})},1500);setTimeout(()=>{if(R)send('tgt',{n,i})},4000)}
function recvTarget(n,my){
  return new Promise(res=>{
    if(!R)return;
    if(R.tgt[n]!==undefined)return res(R.tgt[n]);
    R.tgtW={n,res};
  });
}
function endBattleUi(){
  $('#pauseBtn').classList.remove('hidden');$('#speedBtn').classList.remove('hidden');$('#backBtn').textContent='ออกจากด่าน';
  Battle.fixed(false);
}
function confirmForfeit(){
  const two=R&&R.order&&R.order.length>2;
  modal(`<h2>ยอมแพ้?</h2><p>${two?'ถ้ายอมแพ้ ทีมของคุณ (รวมเพื่อนร่วมทีม) จะแพ้':'ถ้ายอมแพ้ ฝ่ายตรงข้ามจะเป็นผู้ชนะ'}</p><div class="two"><button id="fgY">ยอมแพ้</button><button class="sec" id="fgN">สู้ต่อ</button></div>`);
  $('#fgN').onclick=closeModal;
  $('#fgY').onclick=()=>{
    if(!R)return closeModal();
    if(R.battle&&!R.over){send('forfeit',{from:me.id});R.over=true;Battle.stop();endBattleUi();R.phase='result';resultModal('lose','คุณยอมแพ้')}
    else{closeModal();leaveRoom()}
  };
}
function onBattleEnd(r){
  if(!R||R.over)return;
  R.over=true;
  let w=r.winner;
  if(r.timeout){const x=r.hpA/r.maxA,y=r.hpB/r.maxB;w=Math.abs(x-y)<1e-9?'draw':x>y?'a':'b'}
  const hash=[w,r.turns,Math.round(r.hpA),Math.round(r.hpB)].join('|');
  R.myResult={w,hash};R.results[me.id]={w,hash};send('result',{w,hash,from:me.id});
  R.phase='result';endBattleUi();
  resultModal(w==='draw'?'draw':w===myTeam()?'win':'lose',r.timeout?'หมดเวลา ตัดสินจาก HP ที่เหลือ':'');
  checkResults();
}
function checkResults(){
  if(!R||!R.myResult)return;
  if(Object.values(R.results).some(x=>x.hash!==R.myResult.hash))toast('⚠ ผลการต่อสู้ไม่ตรงกันทุกเครื่อง (ซิงค์ผิดพลาด) กรุณาแจ้งผู้พัฒนา');
}
function resultModal(kind,note){
  go('room');   /* เปลี่ยนหน้าก่อน (go ปิดหน้าต่างเดิม) แล้วค่อยเปิดผลลัพธ์ */
  const t={win:['🏆 คุณชนะ!','#ffd34d'],lose:['😵 คุณแพ้','#ff5470'],draw:['🤝 เสมอ','#8fd0ff']}[kind];
  modal(`<h2 style="color:${t[1]}">${t[0]}</h2>${note?`<p>${esc(note)}</p>`:''}<div class="two"><button id="rmR">เล่นอีกครั้ง</button><button class="sec" id="rmX">ออกจากห้อง</button></div><p class="mute" id="rmW"></p>`);
  $('#rmX').onclick=()=>{closeModal();leaveRoom()};
  $('#rmR').onclick=()=>{
    if(missing().length){$('#rmW').textContent='มีผู้เล่นออกจากห้องแล้ว';return}
    R.rem.add(me.id);send('rematch',{from:me.id});$('#rmR').disabled=true;$('#rmW').textContent='รอผู้เล่นทุกคนตอบรับ…';checkRematch();
  };
}
function checkRematch(){
  if(R&&R.order&&R.rem.has(me.id)&&R.order.every(p=>R.rem.has(p.id))){resetRound();closeModal();go('room');if(R.role==='host')send('phase',{p:'pick',order:R.order})}
}

/* หน้าห้อง (แสดงตามช่วง: ล็อบบี้ → เลือก 6 → แบน → รอเริ่ม) */
function room(){
  updateMe();
  if(!R){go('online');return}
  renderRoom();
}
function tile(id,opts={}){
  const c=CARDS[id];
  return `<button type="button" class="pk${opts.on?' on':''}${opts.ban?' ban':''}" ${opts.attr||''} style="--c:${c.color}">${opts.n?`<i class="pn">${opts.n}</i>`:''}<img src="${c.img}" alt="${esc(c.name)}"><b>${esc(c.name)}</b><small>${c.rar}</small></button>`;
}
function renderRoom(){
  const b=$('#roomBody');if(!R||!b)return;
  $('#roomTitle').textContent='ห้อง '+R.code;
  if(R.phase==='lobby'){
    const host=R.role==='host',ps=players(),n=ps.length;
    const two=R.mode==='2v2',cap=two?4:2,mode=n===cap?(two?'2 ต่อ 2':'1 ต่อ 1'):null;
    const seat=i=>{const p=ps[i===2?2:i];return p?`<div class="pl"><i class="od on"></i><b>${esc(p.name)}${p.id===me.id?' (คุณ)':''}</b><small>${p.role==='host'?'เจ้าของห้อง':'ผู้เล่น'}</small></div>`:`<div class="pl empty"><i class="od"></i><b class="mute">${i<2?'รอผู้เล่น…':'ว่าง (ชวนเพื่อนเล่น 2 ต่อ 2)'}</b></div>`};
    b.innerHTML=`<div class="box lobby"><div class="code">${R.code}</div><small>เลขห้อง — ส่งให้เพื่อนเพื่อเข้ามา (สูงสุด 4 คน)</small>
      <div class="teams2"><div><h3>ทีม A</h3>${seat(0)}${two?seat(2):''}</div><div><h3>ทีม B</h3>${seat(1)}${two?seat(3):''}</div></div>
      <p class="mute">โหมดห้องนี้: <b>${two?'2 ต่อ 2 (ผู้เล่น 4 คน)':'1 ต่อ 1 (ผู้เล่น 2 คน)'}</b> · ${mode?'ครบแล้ว พร้อมเริ่ม':'รอผู้เล่น '+n+'/'+cap}</p>
      ${host?`<div class="two"><button id="rmStart" ${mode?'':'disabled'}>เริ่มเลือกการ์ด${mode?' ('+mode+')':''}</button><button class="sec" id="rmInv">👥 ชวนเพื่อน</button></div>`:'<p class="mute">รอเจ้าของห้องกดเริ่ม…</p>'}
      <p class="mute">กติกา: ทุกคนเลือก ${PICK_N} ใบ → แบนการ์ดของคู่ตรงข้ามคนละ ${BAN_N} ใบ → สู้ด้วย ${KEEP_N} ใบที่เหลือ · ทุกใบ Lv.${ONLINE_LV} ${ONLINE_STAR}★<br>2 ต่อ 2: ทีมละ 2 คน แต่ละคนคุมการ์ดของตัวเอง สลับกันโจมตี ถึงตาใครคนนั้นเลือกเป้าหมาย (ใบที่ตายจะมีตัวสำรองของคนนั้นลงแทน)</p></div>`;
    if(host){
      $('#rmStart').onclick=()=>{const ps2=players();if(ps2.length!==(R.mode==='2v2'?4:2))return;
        R.order=ps2.map(p=>({id:p.id,name:p.name}));R.ch.track({id:me.id,name:me.name||me.username,role:'host',t:(ps2[0]&&ps2[0].t)||Date.now(),lock:true});
        resetRound();send('phase',{p:'pick',order:R.order});renderRoom()};
      $('#rmInv').onclick=()=>go('friends');
    }
    return;
  }
  const waitNames=m=>R.order.filter(p=>!m[p.id]).map(p=>esc(p.name)).join(', ');
  if(R.phase==='pick'){
    const sel=R.sel,ids=owned();
    b.innerHTML=R.myPick?`<div class="box onmsg"><h2>ล็อกทีมแล้ว ✔</h2><p>รอ ${waitNames(R.picks)} เลือกการ์ด…</p><div class="pickrow">${R.myPick.map(id=>tile(id,{})).join('')}</div></div>`
      :`<div class="phead"><h2>เลือกการ์ด ${sel.length}/${PICK_N} ใบ</h2><small>แตะเพื่อเลือก (เลขคือลำดับการลงสนาม) · ใช้ Lv.${ONLINE_LV} ${ONLINE_STAR}★ เท่ากันทุกคน</small><button id="rmPick" ${sel.length===PICK_N?'':'disabled'}>ยืนยันทีม</button></div>
      <div class="pick big" id="pkGrid">${ids.map(id=>tile(id,{on:sel.includes(id),n:sel.indexOf(id)+1||0,attr:`data-c="${id}"`})).join('')}</div>`;
    if(!R.myPick){
      $('#pkGrid').onclick=e=>{const t=e.target.closest('[data-c]');if(!t)return;const id=t.dataset.c,i=R.sel.indexOf(id);if(i>=0)R.sel.splice(i,1);else if(R.sel.length<PICK_N)R.sel.push(id);renderRoom()};
      $('#rmPick').onclick=()=>{if(R.sel.length!==PICK_N)return;R.myPick=[...R.sel];R.picks[me.id]=R.myPick;send('pick',{ids:R.myPick,from:me.id});R.sel=[];advance();renderRoom()};
    }
  }else if(R.phase==='ban'){
    const sel=R.sel,opp=R.order[oppIdx(myIdx())],oppName=opp?opp.name:'คู่ต่อสู้',oc=(opp&&R.picks[opp.id])||[];
    b.innerHTML=R.myBan?`<div class="box onmsg"><h2>แบนแล้ว ✔</h2><p>รอ ${waitNames(R.bans)} แบนการ์ด…</p></div>`
      :`<div class="phead"><h2>แบนการ์ดของ ${esc(oppName)} ${sel.length}/${BAN_N} ใบ</h2><small>การ์ดที่ถูกแบนจะใช้สู้รอบนี้ไม่ได้</small><button id="rmBan" ${sel.length===BAN_N?'':'disabled'}>ยืนยันการแบน</button></div>
      <div class="pick big" id="pkGrid">${oc.map(id=>tile(id,{ban:sel.includes(id),on:sel.includes(id),attr:`data-c="${id}"`})).join('')}</div>
      <p class="mute">การ์ดของคุณ:</p><div class="pickrow">${R.myPick.map(id=>tile(id,{})).join('')}</div>`;
    if(!R.myBan){
      $('#pkGrid').onclick=e=>{const t=e.target.closest('[data-c]');if(!t)return;const id=t.dataset.c,i=R.sel.indexOf(id);if(i>=0)R.sel.splice(i,1);else if(R.sel.length<BAN_N)R.sel.push(id);renderRoom()};
      $('#rmBan').onclick=()=>{if(R.sel.length!==BAN_N)return;R.myBan=[...R.sel];R.bans[me.id]=R.myBan;send('ban',{ids:R.myBan,from:me.id});R.sel=[];advance();renderRoom()};
    }
  }else if(R.phase==='wait'){
    b.innerHTML=`<div class="box onmsg"><h2>กำลังเริ่มการต่อสู้…</h2><p>รอเจ้าของห้องเริ่ม</p></div>`;
  }
}

/* โค้ดที่ใช้ได้คนเดียวทั้งโลก: ตรวจ/จองที่เซิร์ฟเวอร์ (ฟังก์ชัน redeem_code ใน redeem.sql) → 'ok' | 'taken' | 'invalid' | 'login' | 'offline' | 'error' */
async function redeem(code){
  if(!sb||!me)return 'offline';
  try{const {data,error}=code==='CARD'?await sb.rpc('redeem_card_all'):await sb.rpc('redeem_code',{c:code});   /* CARD = โค้ดการ์ดทั้งหมด ใช้ฟังก์ชันของตัวเองใน card_code.sql */
    if(error)return 'error';return typeof data==='string'?data:'error'}catch(e){return 'error'}
}
/* ดันเจี้ยนออนไลน์: เรียกฟังก์ชันใน dungeon.sql → {error:'login'|'offline'|'error'} เมื่อใช้ไม่ได้ */
async function dgCall(fn,args){
  if(!sb||!me)return {error:'offline'};
  try{const {data,error}=await sb.rpc(fn,args||{});if(error)return {error:'error'};return data||{error:'error'}}catch(e){return {error:'error'}}
}
const dungeon={status:()=>dgCall('dungeon_status'),enter:()=>dgCall('dungeon_enter'),report:(hr,d)=>dgCall('dungeon_report',{p_hr:hr,p_damage:Math.max(0,Math.floor(d||0))}),claim:hr=>dgCall('dungeon_claim',{p_hr:hr}),leaderboard:()=>dgCall('dungeon_leaderboard'),setTeam:(hr,t)=>dgCall('dungeon_set_team',{p_hr:hr,p_team:t})};
window.Online={presence:()=>onlinePres,setHtml,onPres:null,dungeon,redeem,gate,onSave,hub,friends,chat,room,logout,get me(){return me},_test:{get R(){return R},joinRoom,createRoom}};
})();