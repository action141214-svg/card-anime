/* music.js — เพลงพื้นหลังล็อบบี้ (lobby.mp3 / lobby1.mp3 / lobby3.mp3) เล่นสลับและสุ่มกันต่อเนื่องทุกหน้า/ทุกด่าน
   ปุ่ม #musicPick (สร้างให้อัตโนมัติข้างปุ่มเพลง) เลือกเพลงได้: เลือก "สุ่มทุกเพลง" หรือเลือกเพลงเดียวให้ เล่นวนซ้ำเพลงเดียว · จำค่าไว้ในเครื่อง
   เริ่มจากเพลงสุ่ม พอเพลงจบจะสุ่มเพลงถัดไป (ไม่ซ้ำเพลงเดิมติดกัน) · อยากเพิ่มเพลง ให้เพิ่มชื่อไฟล์ใน TRACKS
   ก่อนเริ่มเกมจะมีหน้าถามว่าจะ "เปิด" หรือ "ปิด" เสียงเพลง (กันเพลงดังจนสะดุ้ง) · ตอนกดเลือกก็ปลดล็อกเสียงของเบราว์เซอร์ไปพร้อมกัน
   เพลงที่เปิดจะค่อยๆ ดังขึ้น (fade-in) ไม่ดังพรวดทันที · window.__musicGateDone = Promise ที่เสร็จเมื่อผู้เล่นเลือกแล้ว (app.js รอก่อนขึ้นสารจากผู้พัฒนา)
   ปุ่ม #musicBtn (หน้าหลัก) เปิด/ปิดเพลง จำค่าไว้ในเครื่อง · พักเพลงอัตโนมัติเมื่อสลับแท็บ/ออกจากแอป */
(()=>{
  const KEY='cardduel_music',KEYP='cardduel_music_pick',VOL=1,FADE_MS=1800,TRACKS=['lobby.mp3','lobby1.mp3','lobby3.mp3'];
  const NAMES={'lobby.mp3':'เพลงล็อบบี้ 1','lobby1.mp3':'เพลงล็อบบี้ 2','lobby3.mp3':'เพลงล็อบบี้ 3'};   // ชื่อที่โชว์ในหน้าเลือกเพลง
  const a=new Audio();a.loop=false;a.preload='auto';a.volume=VOL;
  let pick='all';   // 'all' = สุ่มสลับทุกเพลง · ชื่อไฟล์ = เล่นวนซ้ำเพลงนั้นเพลงเดียว
  try{const p=localStorage.getItem(KEYP);if(TRACKS.includes(p))pick=p}catch(e){}
  let on=true,started=false,cur=pick==='all'?Math.floor(Math.random()*TRACKS.length):TRACKS.indexOf(pick),bad=0,ft=null;
  a.loop=pick!=='all';
  const load=()=>{a.src=TRACKS[cur]};
  const next=()=>{   // สุ่มเพลงถัดไป ไม่ซ้ำเพลงเดิมติดกัน (ถ้ามีมากกว่า 1 เพลง)
    if(TRACKS.length>1){let n;do{n=Math.floor(Math.random()*TRACKS.length)}while(n===cur);cur=n}
    load();
  };
  load();
  a.addEventListener('ended',()=>{bad=0;next();if(on&&started)play()});
  a.addEventListener('error',()=>{   // ไฟล์ใดไฟล์หนึ่งหาไม่เจอ → ข้ามไปเพลงถัดไป (กันวนไม่รู้จบถ้าไม่มีเลย)
    if(pick!=='all'){pick='all';a.loop=false;try{localStorage.setItem(KEYP,'all')}catch(x){}pickLabel()}   // เพลงที่เลือกไว้เล่นไม่ได้ → กลับไปโหมดสุ่ม
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

  /* ---------- เลือกเพลง: สุ่มทุกเพลง หรือ วนซ้ำเพลงเดียว ---------- */
  const trackName=f=>NAMES[f]||('เพลง '+(TRACKS.indexOf(f)+1));
  function setPick(v){
    pick=v;try{localStorage.setItem(KEYP,v)}catch(x){}
    a.loop=v!=='all';
    if(v!=='all'){cur=TRACKS.indexOf(v);bad=0;a.pause();load()}   // เลือกเพลงเดียว → เปลี่ยนไปเล่นเพลงนั้นทันที วนซ้ำ
    if(!on){on=true;try{localStorage.setItem(KEY,'on')}catch(x){}}   // เลือกเพลงแปลว่าอยากฟัง → เปิดเสียงให้
    if(v!=='all'||a.paused)play();
    label();pickLabel();
  }
  function pickLabel(){
    const b=document.getElementById('musicPick');if(!b)return;
    b.textContent=pick==='all'?'🎼 เลือกเพลง':'🎼 '+trackName(pick)+' 🔁';
  }
  function openPick(){
    if(document.getElementById('musicPickGate'))return;
    if(!document.getElementById('musicPickCss')){
      const st=document.createElement('style');st.id='musicPickCss';
      st.textContent='#musicPickGate{position:fixed;inset:0;z-index:99998;display:flex;align-items:center;justify-content:center;padding:18px;background:#05030acc;backdrop-filter:blur(3px)}'
        +'#musicPickGate .mpBox{max-width:400px;width:100%;text-align:center;background:#150f2a;border:1px solid #6b4bd1;border-radius:18px;padding:22px 18px;box-shadow:0 0 40px #6b4bd155,0 20px 60px #000a;color:#fff;font-family:Kanit,system-ui,sans-serif}'
        +'#musicPickGate h2{margin:0 0 6px;font-size:22px}#musicPickGate p{margin:0 0 14px;line-height:1.5;color:#cfc8ea}#musicPickGate small{color:#9d94c4}'
        +'#musicPickGate .mpList{display:flex;flex-direction:column;gap:8px;margin-bottom:14px}'
        +'#musicPickGate button{font:600 16px Kanit,system-ui,sans-serif;padding:12px 14px;border-radius:12px;border:1px solid #3a2f6e;background:#241b45;color:#e7e1ff;cursor:pointer;text-align:left}'
        +'#musicPickGate button.sel{background:#6b4bd1;border-color:#9b7dff;color:#fff}'
        +'#musicPickGate button.close{text-align:center;background:transparent}#musicPickGate button:active{transform:scale(.98)}';
      document.head.appendChild(st);
    }
    const o=document.createElement('div');o.id='musicPickGate';o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');
    const items=[['all','🔀 สุ่มสลับทุกเพลง']].concat(TRACKS.map(f=>[f,'🎵 '+trackName(f)+' · เล่นวนซ้ำเพลงนี้']));
    o.innerHTML='<div class="mpBox"><h2>🎼 เลือกเพลง</h2><p><small>เลือกเพลงที่อยากฟัง จะเล่นวนซ้ำเพลงเดียว · หรือเลือกสุ่มสลับทุกเพลง</small></p>'
      +'<div class="mpList">'+items.map(([v,t])=>'<button data-v="'+v+'" class="'+(v===pick?'sel':'')+'">'+(v===pick?'✓ ':'')+t+'</button>').join('')+'</div>'
      +'<button class="close" id="mpClose">ปิด</button></div>';
    const close=()=>{o.remove();document.removeEventListener('keydown',esc,true)};
    const esc=e=>{if(e.key==='Escape')close()};
    document.addEventListener('keydown',esc,true);
    o.addEventListener('click',e=>{
      if(e.target===o||e.target.id==='mpClose'){close();return}
      const b=e.target.closest('[data-v]');if(!b)return;
      setPick(b.dataset.v);close();
    });
    document.body.appendChild(o);
  }
  function mountPick(){
    const mb=document.getElementById('musicBtn');if(!mb||document.getElementById('musicPick'))return;
    const b=document.createElement('button');b.id='musicPick';b.type='button';b.className=mb.className;
    mb.after(b);pickLabel();b.onclick=openPick;
  }
  if(document.body)mountPick();else document.addEventListener('DOMContentLoaded',mountPick);

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