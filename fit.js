/* fit.js — ปรับขนาดหน้าจอให้พอดีอุปกรณ์ (ความสูงจริงเมื่อมีแถบ URL/คีย์บอร์ด + แนวตั้ง/แนวนอน) */
(()=>{
  const root=document.documentElement,vv=window.visualViewport;
  function fit(){
    if(vv&&vv.scale>1.02)return;                 // ผู้ใช้กำลังซูม ไม่ต้องปรับ
    const w=Math.round(vv?vv.width:innerWidth),h=Math.round(vv?vv.height:innerHeight);
    root.style.setProperty('--app-h',h+'px');
    root.dataset.orient=w>h?'land':'port';
    root.classList.toggle('short',h<=520);
    root.classList.toggle('narrow',w<=760);
  }
  fit();
  (vv||window).addEventListener('resize',fit);
  window.addEventListener('orientationchange',()=>setTimeout(fit,250));
  // กันช่องพิมพ์ (แชท/รหัส) โดนคีย์บอร์ดบัง
  document.addEventListener('focusin',e=>{
    if(/^(INPUT|TEXTAREA)$/.test(e.target.tagName))setTimeout(()=>e.target.scrollIntoView({block:'center',behavior:'smooth'}),300);
  });
})();
