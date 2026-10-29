/* music.js — เพลงพื้นหลังล็อบบี้ เล่นต่อเนื่องทุกหน้า/ทุกด่าน
   โหมดเพลง (เลือกได้จากปุ่ม "🎼 เลือกเพลง" หน้าหลัก · จำค่าไว้ในเครื่อง):
     • 🔀 สุ่มทุกเพลง — เพลงจบแล้วสุ่มเพลงถัดไป (ไม่ซ้ำเพลงเดิมติดกัน)
     • 🔁 เลือกเพลงเดียว — เล่นเพลงที่เลือกวนซ้ำไปเรื่อยๆ
   อยากเพิ่มเพลง ให้เพิ่มรายการใน TRACKS (file = ชื่อไฟล์, name = ชื่อที่แสดง)
   เบราว์เซอร์ไม่ให้เล่นเสียงเองก่อนผู้เล่นแตะหน้าจอ → เริ่มเล่นตอนแตะ/กดครั้งแรก
   ปุ่ม #musicBtn เปิด/ปิดเพลง · พักเพลงอัตโนมัติเมื่อสลับแท็บ/ออกจากแอป */
(()=>{
  const KEY='cardduel_music',KEYM='cardduel_music_mode',VOL=1;
  const TRACKS=[{file:'lobby.mp3',name:'เพลงล็อบบี้ 1'},{file:'lobby1.mp3',name:'เพลงล็อบบี้ 2'}];
  const a=new Audio();a.preload='auto';a.volume=VOL;
  let on=true,started=false,bad=0,mode='shuffle',cur=Math.floor(Math.random()*TRACKS.length);   // mode: 'shuffle' หรือชื่อไฟล์ที่เลือกวนซ้ำ
  try{on=localStorage.getItem(KEY)!=='off'}catch(e){}
  try{const m=localStorage.getItem(KEYM);if(m&&TRACKS.some(t=>t.file===m))mode=m}catch(e){}
  const single=()=>mode!=='shuffle';
  const load=()=>{a.loop=single();a.src=TRACKS[cur].file};
  if(single())cur=TRACKS.findIndex(t=>t.file===mode);
  load();
  const next=()=>{   // สุ่มเพลงถัดไป ไม่ซ้ำเพลงเดิมติดกัน (ถ้ามีมากกว่า 1 เพลง)
    if(TRACKS.length>1){let n;do{n=Math.floor(Math.random()*TRACKS.length)}while(n===cur);cur=n}
    load();
  };
  const play=()=>{const p=a.play();if(p&&p.then)return p.then(()=>{started=true;return true}).catch(()=>false);started=true;return Promise.resolve(true)};
  a.addEventListener('ended',()=>{bad=0;if(!single())next();else load();if(on&&started)play()});   // โหมดเพลงเดียวปกติวนด้วย loop อยู่แล้ว (กันไว้เผื่อเบราว์เซอร์ไม่วน)
  a.addEventListener('error',()=>{   // ไฟล์หาไม่เจอ: โหมดสุ่มข้ามไปเพลงอื่น · โหมดเพลงเดียวไม่ทำอะไร (กันวนไม่รู้จบ)
    if(single()||++bad>=TRACKS.length)return;
    next();if(on&&started)play();
  });
  const label=()=>{const b=document.getElementById('musicBtn');if(b)b.textContent=on?'🔊 เพลง: เปิด':'🔇 เพลง: ปิด'};
  const EV=['pointerdown','touchend','keydown'];
  function unlock(){
    if(!on||started)return;
    play().then(ok=>{if(ok)EV.forEach(e=>document.removeEventListener(e,unlock,true))});
  }
  EV.forEach(e=>document.addEventListener(e,unlock,true));

  /* เปลี่ยนโหมด: 'shuffle' หรือชื่อไฟล์ */
  function setMode(m){
    mode=m;try{localStorage.setItem(KEYM,m)}catch(e){}
    bad=0;
    if(single())cur=TRACKS.findIndex(t=>t.file===m);else cur=Math.floor(Math.random()*TRACKS.length);
    load();
    if(on)play();
  }
  function pickModal(){
    const opts=[{m:'shuffle',t:'🔀 สุ่มทุกเพลง'}].concat(TRACKS.map(t=>({m:t.file,t:'🔁 '+t.name+' (วนซ้ำเพลงนี้)'})));
    const html='<h2>🎼 เลือกเพลง</h2><div style="display:flex;flex-direction:column;gap:8px;margin:10px 0">'
      +opts.map(o=>'<button data-ms="'+o.m+'" class="'+(o.m===mode?'':'sec')+'">'+(o.m===mode?'✔ ':'')+o.t+'</button>').join('')+'</div>'
      +(on?'':'<p class="mute">ตอนนี้ปิดเพลงอยู่ กดปุ่ม 🔇 เพื่อเปิดเสียง</p>')
      +'<div class="two"><button class="sec" id="msClose">ปิด</button></div>';
    if(typeof modal!=='function'){   // ไม่มีหน้าต่างของเกม → สลับโหมดทีละขั้น
      const i=opts.findIndex(o=>o.m===mode);setMode(opts[(i+1)%opts.length].m);alert('โหมดเพลง: '+opts[(i+1)%opts.length].t);return;
    }
    modal(html);
    document.querySelectorAll('[data-ms]').forEach(b=>b.onclick=()=>{setMode(b.dataset.ms);if(typeof closeModal==='function')closeModal()});
    const c=document.getElementById('msClose');if(c)c.onclick=()=>{if(typeof closeModal==='function')closeModal()};
  }
  /* ปุ่มเลือกเพลง: แทรกต่อจากปุ่มเปิด/ปิดเพลงในหน้าหลัก */
  const mb=document.getElementById('musicBtn');
  if(mb&&!document.getElementById('musicPickBtn')){
    const pb=document.createElement('button');pb.id='musicPickBtn';pb.className=mb.className;pb.textContent='🎼 เลือกเพลง';
    mb.insertAdjacentElement('afterend',pb);
  }
  document.addEventListener('click',e=>{
    if(e.target.closest('#musicPickBtn')){pickModal();return}
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