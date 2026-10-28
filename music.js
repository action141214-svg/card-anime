/* music.js — เพลงพื้นหลังล็อบบี้ (lobby.mp3 / lobby1.mp3) เล่นสลับและสุ่มกันต่อเนื่องทุกหน้า/ทุกด่าน
   เริ่มจากเพลงสุ่ม พอเพลงจบจะสุ่มเพลงถัดไป (ไม่ซ้ำเพลงเดิมติดกัน) · อยากเพิ่มเพลง ให้เพิ่มชื่อไฟล์ใน TRACKS
   เบราว์เซอร์ไม่ให้เล่นเสียงเองก่อนผู้เล่นแตะหน้าจอ → เริ่มเล่นตอนแตะ/กดครั้งแรก
   ปุ่ม #musicBtn (หน้าหลัก) เปิด/ปิดเพลง จำค่าไว้ในเครื่อง · พักเพลงอัตโนมัติเมื่อสลับแท็บ/ออกจากแอป */
(()=>{
  const KEY='cardduel_music',VOL=1,TRACKS=['lobby.mp3','lobby1.mp3'];
  const a=new Audio();a.loop=false;a.preload='auto';a.volume=VOL;
  let on=true,started=false,cur=Math.floor(Math.random()*TRACKS.length),bad=0;
  const load=()=>{a.src=TRACKS[cur]};
  const next=()=>{   // สุ่มเพลงถัดไป ไม่ซ้ำเพลงเดิมติดกัน (ถ้ามีมากกว่า 1 เพลง)
    if(TRACKS.length>1){let n;do{n=Math.floor(Math.random()*TRACKS.length)}while(n===cur);cur=n}
    load();
  };
  load();
  a.addEventListener('ended',()=>{bad=0;next();if(on&&started)play()});
  a.addEventListener('error',()=>{   // ไฟล์ใดไฟล์หนึ่งหาไม่เจอ → ข้ามไปเพลงถัดไป (กันวนไม่รู้จบถ้าไม่มีเลย)
    if(++bad>=TRACKS.length)return;
    next();if(on&&started)play();
  });
  let label=()=>{const b=document.getElementById('musicBtn');if(b)b.textContent=on?'🔊 เพลง: เปิด':'🔇 เพลง: ปิด'};
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
  try{on=localStorage.getItem(KEY)!=='off'}catch(e){}
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)a.pause();else if(on&&started)play();
  });
  label();
})();