/* music.js — เพลงพื้นหลัง (lobby.mp3) เล่นวนลูปทุกหน้า/ทุกด่าน
   เบราว์เซอร์ไม่ให้เล่นเสียงเองก่อนผู้เล่นแตะหน้าจอ → เริ่มเล่นตอนแตะ/กดครั้งแรก
   ปุ่ม #musicBtn (หน้าหลัก) เปิด/ปิดเพลง จำค่าไว้ในเครื่อง · พักเพลงอัตโนมัติเมื่อสลับแท็บ/ออกจากแอป */
(()=>{
  const KEY='cardduel_music',VOL=.5;
  const a=new Audio('lobby.mp3');a.loop=true;a.preload='auto';a.volume=VOL;
  let on=true,started=false;
  try{on=localStorage.getItem(KEY)!=='off'}catch(e){}
  const label=()=>{const b=document.getElementById('musicBtn');if(b)b.textContent=on?'🔊 เพลง: เปิด':'🔇 เพลง: ปิด'};
  const play=()=>{const p=a.play();if(p&&p.then)return p.then(()=>{started=true;return true}).catch(()=>false);started=true;return Promise.resolve(true)};
  const EV=['pointerdown','touchend','keydown'];
  function unlock(){
    if(!on||started)return;
    play().then(ok=>{if(ok)EV.forEach(e=>document.removeEventListener(e,unlock,true))});
  }
  EV.forEach(e=>document.addEventListener(e,unlock,true));
  document.addEventListener('click',e=>{
    if(!e.target.closest('#musicBtn'))return;
    on=!on;try{localStorage.setItem(KEY,on?'on':'off')}catch(x){}
    if(on)play();else a.pause();
    label();
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)a.pause();else if(on&&started)play();
  });
  label();
})();
