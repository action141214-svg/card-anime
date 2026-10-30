/* music.js — เพลงพื้นหลังล็อบบี้ (lobby.mp3 / lobby1.mp3) เล่นสลับและสุ่มกันต่อเนื่องทุกหน้า/ทุกด่าน
   เริ่มจากเพลงสุ่ม พอเพลงจบจะสุ่มเพลงถัดไป (ไม่ซ้ำเพลงเดิมติดกัน) · อยากเพิ่มเพลง ให้เพิ่มชื่อไฟล์ใน TRACKS
   ก่อนเริ่มเกมจะมีหน้าถามว่าจะ "เปิด" หรือ "ปิด" เสียงเพลง (กันเพลงดังจนสะดุ้ง) · ตอนกดเลือกก็ปลดล็อกเสียงของเบราว์เซอร์ไปพร้อมกัน
   เพลงที่เปิดจะค่อยๆ ดังขึ้น (fade-in) ไม่ดังพรวดทันที · window.__musicGateDone = Promise ที่เสร็จเมื่อผู้เล่นเลือกแล้ว (app.js รอก่อนขึ้นสารจากผู้พัฒนา)
   ปุ่ม #musicBtn (หน้าหลัก) เปิด/ปิดเพลง จำค่าไว้ในเครื่อง · พักเพลงอัตโนมัติเมื่อสลับแท็บ/ออกจากแอป */
(()=>{
  const KEY='cardduel_music',VOL=1,FADE_MS=1800,TRACKS=['lobby.mp3','lobby1.mp3'];
  const a=new Audio();a.loop=false;a.preload='auto';a.volume=VOL;
  let on=true,started=false,cur=Math.floor(Math.random()*TRACKS.length),bad=0,ft=null;
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
  const fadeIn=()=>{   // ค่อยๆ เพิ่มเสียงจาก 0 → VOL
    clearInterval(ft);a.volume=0;const t0=Date.now();
    ft=setInterval(()=>{const k=Math.min(1,(Date.now()-t0)/FADE_MS);a.volume=VOL*k;if(k>=1)clearInterval(ft)},60);
  };
  const play=()=>{
    const wasPaused=a.paused;if(wasPaused)fadeIn();
    const p=a.play();if(p&&p.then)return p.then(()=>{started=true;return true}).catch(()=>{if(wasPaused){clearInterval(ft);a.volume=VOL}return false});
    started=true;return Promise.resolve(true);
  };
  const EV=['pointerdown','touchend','keydown'];
  function unlock(){
    if(!on||started)return;
    play().then(ok=>{if(ok)EV.forEach(e=>document.removeEventListener(e,unlock,true))});
  }
  const stopUnlock=()=>EV.forEach(e=>document.removeEventListener(e,unlock,true));
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

  /* ---------- หน้าถามก่อนเริ่มเกม: เปิด / ปิด เสียงเพลง ---------- */
  let gateRes;window.__musicGateDone=new Promise(r=>{gateRes=r});
  function choose(v,box){
    on=v;try{localStorage.setItem(KEY,on?'on':'off')}catch(x){}
    if(on){play()}else{a.pause();stopUnlock()}
    label();
    box.classList.add('out');setTimeout(()=>{box.remove();gateRes()},220);
  }
  function mountGate(){
    if(document.getElementById('musicGate')){return}
    const st=document.createElement('style');
    st.textContent='#musicGate{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:18px;background:radial-gradient(ellipse at center,#1b1535ee,#05030aee);backdrop-filter:blur(4px);transition:opacity .2s}'
      +'#musicGate.out{opacity:0}'
      +'#musicGate .mgBox{max-width:420px;width:100%;text-align:center;background:#150f2a;border:1px solid #6b4bd1;border-radius:18px;padding:26px 22px;box-shadow:0 0 40px #6b4bd155,0 20px 60px #000a;color:#fff;font-family:Kanit,system-ui,sans-serif}'
      +'#musicGate h2{margin:0 0 8px;font-size:24px}#musicGate p{margin:0 0 18px;line-height:1.5;color:#cfc8ea}#musicGate small{color:#9d94c4}'
      +'#musicGate .mgBtns{display:flex;flex-direction:column;gap:10px}'
      +'#musicGate button{font:600 17px Kanit,system-ui,sans-serif;padding:13px 16px;border-radius:12px;border:1px solid #6b4bd1;background:#6b4bd1;color:#fff;cursor:pointer}'
      +'#musicGate button.sec{background:#241b45;color:#e7e1ff}#musicGate button:active{transform:scale(.98)}';
    document.head.appendChild(st);
    const o=document.createElement('div');o.id='musicGate';o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');
    o.innerHTML='<div class="mgBox"><h2>🎵 เสียงเพลงในเกม</h2><p>ต้องการเปิดเสียงเพลงพื้นหลังหรือไม่?<br><small>เพลงจะค่อยๆ ดังขึ้น · เปลี่ยนทีหลังได้ที่ปุ่ม “เพลง” หน้าหลัก</small></p>'
      +'<div class="mgBtns"><button id="mgOn">🔊 เปิดเสียงเพลง</button><button id="mgOff" class="sec">🔇 ปิดเสียงเพลง</button></div></div>';
    document.body.appendChild(o);
    document.getElementById('mgOn').onclick=()=>choose(true,o);
    document.getElementById('mgOff').onclick=()=>choose(false,o);
    document.getElementById('mgOn').focus();
  }
  if(document.body)mountGate();else document.addEventListener('DOMContentLoaded',mountGate);
})();