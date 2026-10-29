/* ===== Card Duel – script.js ===== */
const $=(s,r=document)=>r.querySelector(s);
const sleepRaw=ms=>new Promise(r=>setTimeout(r,ms));
const rnd=(a,b)=>a+Math.random()*(b-a);   /* สุ่มสำหรับเอฟเฟกต์ภาพเท่านั้น */
/* สุ่มสำหรับกติกาการต่อสู้: โหมดออนไลน์ใช้ seed ร่วมกัน ทั้งสองเครื่องจึงได้ผลเหมือนกันทุกครั้ง */
let RNG=null,FIXED=false;
const RR=()=>RNG?RNG():Math.random();

/* ข้อมูลการ์ด — เพิ่มการ์ดใหม่ที่นี่ (การ์ดที่ไม่มีใน ID จะใช้ power/hp จากตรงนี้) */
const CARDS={
  goku:{name:'ซง โกคู',rar:'R',starter:true,img:'goku.jpeg',power:7,hp:200,color:'#ff9d2e',ability:'grow',
        desc:'ทุกเทิร์น POWER เพิ่มขึ้นตามเปอร์เซ็นต์ของค่าปัจจุบัน'},
  zenitsu:{name:'อากาสึมะ เซ็นอิทสึ',rar:'R',starter:true,img:'zenitsu.jpeg',power:25,hp:200,color:'#4fc3ff',ability:'paralyze',
        desc:'โจมตีแล้วมีโอกาสทำให้ศัตรูชา โจมตีไม่ได้ 1 เทิร์น'},
  naruto:{name:'อุซึมากิ นารูโตะ',rar:'R',img:'naruto.jpeg',power:25,hp:230,color:'#ff9d2e',ability:'clone',
        desc:'หลังการ์ดใบนี้ถูกทำลาย จะเรียกร่างแยกมาแทน ซึ่งสเตตัสจะลดไปเพียง 10% ของสเตตัสทั้งหมด'},
  sasukecurse:{name:'อักขระคำสาปสมบูรณ์ อุจิวะ ซาสึเกะ',rar:'SR',evo:true,img:'sasuke_curse.jpeg',power:35,hp:370,color:'#8a5cff',ability:'sevpara',
        desc:'ทำให้ศัตรูติดสถานะ "ชาขั้นรุนแรง" มีโอกาส 50% ทำให้โจมตีไม่ได้ในเทิร์นนั้น และทุกๆ เทิร์นจะถูกไฟฟ้าช็อตสร้างความเสียหาย 10% ของ HP สูงสุดของศัตรู (ได้จากการอีโวซาสึเกะ ร่างเด็ก)'},
  naruto1:{name:'ร่างสัตว์หาง1หาง อุซึมากิ นารูโตะ',rar:'SR',evo:true,img:'naruto1.jpeg',power:35,hp:350,color:'#ff4a2a',ability:'kyuubi',
        desc:'ฟื้นฟู HP 20% ของ HP สูงสุด และมีโอกาส 40% ทำให้ศัตรูติดสถานะ "ชะงัก" ไม่สามารถโจมตีในเทิร์นนั้นได้ (ได้จากการอีโวนารูโตะ)'},
  gekko:{name:'เก็กโค ฮายาเตะ',rar:'R',img:'gekko.jpeg',power:25,hp:300,color:'#4aa3ff',ability:'gekko',
        desc:'เมื่อการ์ดใบนี้โจมตีจะสร้างสถานะ "เลือดไหล" และสถานะ "ติดพิษ" ซึ่งสร้างความเสียหาย 10% ของ POWER ปัจจุบัน'},
  mahoraga:{name:'จักรพรรดิดาบแปดทิศ ปรวาณบดีกระบัด มโหรากา',rar:'USR',evo:true,img:'mahoraga.jpeg',power:35,hp:420,color:'#e8e2c8',ability:'wheel',
        desc:'การปรับตัวของมโหรากา ทุกๆ เทิร์นกงล้อจะหมุนหนึ่งครั้งและสุ่มการเพิ่มค่าสเตตัสให้ตนเอง: เพิ่ม 50 POWER / ฟื้นฟู HP 20% ของ HP ที่เสียไป / ต้านทานสถานะด้านลบ (ได้จากการอีโวฟุชิงุโระ เมงุมิ)'},
  reze:{name:'ปีศาจระเบิด เรเซ่',rar:'UR',img:'reze.jpeg',power:30,hp:370,color:'#e0463a',ability:'bomb',
        desc:'เมื่อการ์ดใบนี้โจมตีมีโอกาส 50% ที่จะโจมตีรูปแบบ "ระเบิด" ทำให้สร้างความเสียหาย 2 เท่า และมีโอกาส 45% ทำให้ศัตรูติดสถานะ "มึนงง" ไม่สามารถโจมตีในเทิร์นนั้นได้ และหากการ์ดใบนี้ถูกทำลายจะระเบิดพร้อมสร้างความเสียหาย 5 เท่าของ POWER'},
  shuna:{name:'ชูนะ',rar:'S',img:'shuna.jpeg',power:30,hp:290,color:'#ff7eb6',ability:'shuna',
        desc:'เมื่อนำเข้าทีมการ์ดใบนี้จะเพิ่ม 25% ของ HP และ 40% ของ POWER สูงสุดให้กับการ์ดในทีม แต่หากการ์ดนี้ถูกทำลายผลลัพธ์ด้านบวกนี้จะหายทันที'},
  chahaein:{name:'ชา แฮ อิน',rar:'SR',img:'cha.jpeg',power:40,hp:400,color:'#e24b5b',ability:'boss3',
        desc:'สร้างความเสียหาย 3 เท่าให้กับ BOSS'},
  kaneki:{name:'คาเนกิ เคน',rar:'S',img:'kanegi.jpeg',power:30,hp:300,color:'#c0143c',ability:'ghoul',
        desc:'การโจมตีของการ์ดใบนี้จะดูดเลือด 5% ของ HP สูงสุด และมีโอกาส 20% จะตี 4 ครั้งในเทิร์นเดียว'},
  mai:{name:'ไม ชิรานุอิ',rar:'USR',img:'mai.jpeg',power:42,hp:400,color:'#ff4a2a',ability:'mai',
        desc:'โจมตี 2 รูปแบบ: หาก HP สูงกว่า 40% จะโจมตีโหมดไฟ ติดสถานะ "เผาไหม้" สร้างความเสียหาย 10% ของ HP สูงสุดศัตรู · หาก HP ต่ำกว่า 40% จะโจมตีโหมดระเบิด สร้างความเสียหาย 1.5 เท่า พร้อมมีโอกาส 40% ติดสถานะ "มึนงง" ทำให้โจมตีไม่ได้ในเทิร์นนั้น'},
  chaevo:{name:'เริงระบำเจ้าหญิงดาบ ชา แฮ อิน',rar:'UR',evo:true,img:'chaevo.jpeg',power:55,hp:450,color:'#e8b84a',ability:'boss5',
        desc:'สร้างความเสียหาย 5 เท่าแก่ BOSS และมีโอกาส 50% ที่จะหลบการโจมตีทุกรูปแบบได้ (ได้จากการอีโวชา แฮ อิน)'},
  chaboss:{name:'เริงระบำเจ้าหญิงดาบ ชา แฮ อิน (บอสเควส)',rar:'UR',evo:true,questOnly:true,img:'chaevo.jpeg',power:150,hp:10000,color:'#e8b84a',ability:'questboss',
        desc:'บอสเควสพัฒนาของชา แฮ อิน ไม่มีความสามารถพิเศษ'},
  kdash:{name:'เค แดช',rar:'USR',img:'k.jpeg',power:36,hp:420,color:'#ff5a2a',ability:'pflame',
        desc:'การควบคุมไฟได้อย่างชำนาญทำให้สถานะเผาไหม้ต่างๆ ไม่มีผลกับการ์ดใบนี้ สร้างสถานะ "ไฟบริสุทธิ์" ใส่ศัตรูสร้างความเสียหาย 15% ของ HP สูงสุด และลด POWER ลงทันที 15% เมื่อลงสนาม'},
  sasukekid:{name:'อุจิวะ ซาสึเกะ (ร่างเด็ก)',rar:'R',img:'sasuke_kid.jpeg',power:25,hp:250,color:'#4a6fd8',ability:'fireball',
        desc:'ปล่อยคาถาเพลิง สร้างความเสียหาย 20% ของ POWER ปัจจุบัน และทำให้ศัตรูติดสถานะ "เผาไหม้" สร้างความเสียหาย 10% ของ HP สูงสุดของศัตรู'},
  ino:{name:'ยามานากะ อิโนะ',rar:'R',img:'ino.jpeg',power:27,hp:290,color:'#c9a6ff',ability:'ino',
        desc:'ทุกๆ 2 เทิร์นการ์ดใบนี้จะย้ายร่างกับศัตรู ทำให้ศัตรูที่ถูกการ์ดใบนี้ย้ายร่างโจมตีตัวเอง ด้วยความเสียหาย 2 เท่าของ POWER ปัจจุบันของการ์ดที่ถูกย้ายร่าง'},
  yuji:{name:'อิตาโดริ ยูจิ',rar:'R',img:'yuji.jpeg',power:29,hp:240,color:'#ff6b5a',ability:'upset',
        desc:'โจมตีการ์ดที่ระดับสูงกว่าการ์ดใบนี้ จะสร้างดาเมจ 2 เท่าของ POWER ปัจจุบัน'},
  megumi:{name:'ฟุชิงุโระ เมงุมิ',rar:'SSR',img:'megumi.jpeg',power:32,hp:270,color:'#8a7bff',ability:'shiki',
        desc:'ทุกเทิร์นสุ่มเรียกชิกิกามิ 1 ตัวมาช่วย: สุนัข / นกฮูก / กบ / คชสาร / กระต่าย'},
  ichigo:{name:'คุโรซากิ อิจิโกะ',rar:'S',img:'ichigo.jpeg',power:29,hp:280,color:'#ff7a2a',ability:'getsuga',
        desc:'ทุกๆ 2 เทิร์น การโจมตีครั้งถัดไปสร้างดาเมจ 3 เท่าของ POWER ปัจจุบัน'},
  kirito:{name:'คิริโตะ',rar:'S',img:'kirito.jpeg',power:30,hp:230,color:'#5be6c8',ability:'heal',
        desc:'ทุกๆ 2 เทิร์นฟื้นฟู HP 10% ของ HP ทั้งหมด'},
  kurapika:{name:'คุราปิก้า',rar:'USR',img:'kurapika.jpeg',power:37,hp:300,color:'#7b8cff',ability:'nen',
        desc:'ทุกเทิร์นสุ่ม 1 ใน 5 นิ้ว (นิ้วละ 20%): ฟื้นฟู / ขโมย / ผนึก / ลบสถานะลบ / โจมตีซ้ำ x2'},
  sasuke:{name:'อุจิวะ ซาสึเกะ',rar:'LTD',img:'sasuke.jpeg',power:45,hp:450,color:'#a06cff',ability:'lightning',
        desc:'ติดสถานะสายฟ้าให้ศัตรู (รับดาเมจเพิ่ม 20% ของ POWER ผู้โจมตี) และมีโอกาส 45% ทำให้ชา'},
  cc:{name:'ซีซี',rar:'LTD',img:'cc.jpeg',power:20,hp:600,color:'#7ddf6a',ability:'immune',
        desc:'เมื่อการ์ดใบนี้อยู่ในทีมจะป้องกันสถานะผิดปกติทั้งหมดให้แก่ทีม (ได้จากเควสตัวละคร หรือโค้ดพิเศษ)'},
  rimulord:{name:'จอมมาร ริมุรุ เทมเพสต์',rar:'USR',evo:true,img:'rimurulord.jpeg',power:40,hp:425,color:'#9a5cff',ability:'rimulord',
        desc:'ล้างสถานะผิดปกติได้ทุกชนิด · เมื่อโจมตีจะมอบสถานะ "บาดแผลศักดิ์สิทธิ์" ทำให้ไม่สามารถฟื้นฟู HP ได้ และสร้างความเสียหาย 15% ของ HP สูงสุดของศัตรู'},
  rimuruboss:{name:'ริมุรุ ร่าง SSR (บอสเควส)',rar:'SSR',evo:true,questOnly:true,img:'rimuru.jpeg',power:150,hp:30000,color:'#6a5cff',ability:'questboss',
        desc:'บอสเควสพัฒนาของจอมมาร ริมุรุ เทมเพสต์ ไม่มีความสามารถพิเศษ'},
  truerimuru:{name:'จอมมารที่แท้จริง ริมุรุ เทมเพสต์',rar:'LTD',evo:true,img:'truerimuru.jpeg',power:40,hp:460,color:'#5fc8ff',ability:'truelord',
        desc:'ผลลัพธ์ด้านลบไม่มีผล และเปลี่ยนผลลัพธ์ด้านลบเป็นการเพิ่มค่าสเตตัสครั้งละ 15% · สร้างสถานะ "บาดแผลศักดิ์สิทธิ์" ทำให้ไม่สามารถฟื้นฟู HP ได้ และสร้างความเสียหาย 15% ของ HP สูงสุดของศัตรู · ทุกๆ 4 เทิร์นจะฟื้นฟู HP 10% ของ HP สูงสุดของตัวเอง'},
  rimulordboss:{name:'จอมมาร ริมุรุ เทมเพสต์ (บอสเควส เฟส 1)',rar:'USR',evo:true,questOnly:true,img:'rimurulord.jpeg',power:200,hp:10000,color:'#9a5cff',ability:'questboss',
        desc:'บอสเควสพัฒนา เฟส 1 ของจอมมารที่แท้จริง ริมุรุ เทมเพสต์ ไม่มีความสามารถพิเศษ'},
  truerimuruboss:{name:'จอมมารที่แท้จริง ริมุรุ เทมเพสต์ (บอสเควส เฟส 2)',rar:'LTD',evo:true,questOnly:true,img:'truerimuru.jpeg',power:300,hp:100000,color:'#5fc8ff',ability:'truebossimm',
        desc:'บอสเควสพัฒนา เฟส 2 ของจอมมารที่แท้จริง ริมุรุ เทมเพสต์ · สถานะด้านลบไม่มีผลและแปลงเป็นสเตตัส (POWER และ HP สูงสุด) ให้ตัวเอง'},
  garored:{name:'ลูกครึ่งสัตว์ประหลาด กาโร่',rar:'S',evo:true,img:'garored.jpeg',power:25,hp:320,color:'#e8603a',ability:'garored',
        desc:'โอกาสหลบหลีก 40% · โจมตี 3 ครั้งในเทิร์นเดียว'},
  garoredboss:{name:'ลูกครึ่งสัตว์ประหลาด กาโร่ (บอสเควส)',rar:'S',evo:true,questOnly:true,img:'garored.jpeg',power:75,hp:15000,color:'#e8603a',ability:'garored',
        desc:'บอสเควสพัฒนาของ ลูกครึ่งสัตว์ประหลาด กาโร่ · โอกาสหลบหลีก 40% · โจมตี 3 ครั้งในเทิร์นเดียว'},
  garomon:{name:'สัตว์ประหลาดที่สมบูรณ์แบบ กาโร่',rar:'UR',evo:true,img:'garomon.jpeg',power:30,hp:400,color:'#ff4a3a',ability:'garomon',
        desc:'โอกาสหลบหลีก 45% · โจมตี 3 ครั้งในเทิร์นเดียว · โอกาส 40% โจมตีโต้กลับในเทิร์นศัตรู · เพิ่มสเตตัส 5% ทุกๆ 2 เทิร์น (ได้จากการอีโวลูกครึ่งสัตว์ประหลาด กาโร่)'},
  garomonboss:{name:'สัตว์ประหลาดที่สมบูรณ์แบบ กาโร่ (บอสเควส)',rar:'UR',evo:true,questOnly:true,img:'garomon.jpeg',power:100,hp:30000,color:'#ff4a3a',ability:'garomon',
        desc:'บอสเควสพัฒนาของ สัตว์ประหลาดที่สมบูรณ์แบบ กาโร่ · โอกาสหลบหลีก 45% · โจมตี 3 ครั้งในเทิร์นเดียว · โอกาส 40% โจมตีโต้กลับ · เพิ่มสเตตัส 5% ทุกๆ 2 เทิร์น'},
  slime:{name:'ริมุรุ ร่างสไลม์',rar:'S',img:'slime.jpeg',power:33,hp:250,color:'#5fb6ff',ability:'slime',
        desc:'เมื่อสังหารการ์ดศัตรูใบไหนได้จะทำการแปลงร่างเป็นการ์ดนั้น แล้วคงสเตตัสและความสามารถของการ์ดที่ถูกสังหารได้'},
  rimuru:{name:'ริมุรุ เทมเพสต์',rar:'SSR',evo:true,img:'rimuru.jpeg',power:39,hp:400,color:'#6a5cff',ability:'rimuru',
        desc:'ผลลัพธ์ด้านลบไม่มีผล · เมื่อ HP ต่ำกว่า 30% จะเข้าสู่โหมด \"ผู้ไร้ความปราณี\" ทำให้สเตตัสรวมเพิ่มขึ้น 50% มี 6 เทิร์น หากสามารถสังหารก่อน 6 เทิร์นได้จะฟื้นฟู HP จนเต็ม มีผล 1 ครั้งต่อเกม'},
  gilqueen:{name:'ราชินีแห่งวีรชน กิลกาเมช',rar:'LTD',img:'gilqueen.jpeg',power:50.4032,hp:500,color:'#ff4a3a',ability:'gate2',
        desc:'โจมตีพร้อมเรียกอาวุธ 3 เล่มมาโจมตี เล่มละ 80% ของ POWER และมีโอกาส 50% หลังถูกทำลายใช้ดาบผ่าโลกสร้างความเสียหาย 3 เท่า (รับจากเควสตัวละคร)'},
  gil:{name:'กิลกาเมช',rar:'UR',img:'gil.jpeg',power:34,hp:350,color:'#ffcf4a',ability:'gate',
        desc:'เมื่อการ์ดใบนี้โจมตี จะเรียกอาวุธมาโจมตีแบบสุ่ม ทำความเสียหายเล่มละ 10% ของ POWER ปัจจุบัน โจมตี 3 ครั้ง'},
  /* ===== การ์ดชุดใหม่ ===== */
  kirara:{name:'คิราระ โฮชิ',rar:'R',img:'kirara.jpeg',power:28,hp:290,color:'#b86cff',ability:'crux',
        desc:'การโจมตีจะแปะสถานะ \"กลุ่มดาวกางเขนใต้\" ใส่ศัตรู เพิ่มขึ้นตามการโจมตี สูงสุด 5 แสตก แต่ละแสตกจะทำให้อุปสรรคพุ่งเข้าหาศัตรูตามจำนวน โดยสุ่มเรียกอุปสรรค: รถยนต์ สร้างความเสียหาย 70% ของ POWER · ก้อนหิน 40% ของ POWER และมีโอกาส 40% ทำให้ติดสถานะ \"มึนงง\" · ของมีคม 55% ของ POWER และทำให้ติดสถานะ \"เลือดไหล\" สร้างความเสียหาย 5% ของ HP สูงสุดในเทิร์นนั้น'},
  garo:{name:'กาโร่',rar:'R',img:'garo.jpeg',power:29,hp:300,color:'#8fd0ff',ability:'garo',
        desc:'โจมตีตั้งแต่ 2 ครั้งใน 1 เทิร์น มีโอกาส 40% จะหลบการโจมตีได้'},
  vegeta:{name:'เบจิต้า',rar:'R',img:'vegeta.jpeg',power:29,hp:299,color:'#4a8cff',ability:'kiblast',
        desc:'ปล่อยกระสุนพลังสร้างความเสียหาย 60% ของ POWER ซึ่งจะสุ่มการโจมตีตั้งแต่ 2-5 ครั้ง'},
  kula:{name:'คุลา ไดมอนด์',rar:'UR',img:'kula.jpeg',power:35,hp:360,color:'#7ad6ff',ability:'icecrystal',
        desc:'เมื่อโจมตีมีโอกาส 60% จะสร้างสถานะ \"ผลึกน้ำแข็ง\" ที่ทำให้ศัตรูถูกแช่แข็งไม่สามารถโจมตีได้ 1 เทิร์น และหลังจากถูกแช่จะยังคงตกค้างผลึกน้ำแข็งไว้ ซึ่งจะสร้างความเสียหาย 60% ของ POWER ปัจจุบัน 2 เทิร์น โจมตีเทิร์นละ 1 ครั้ง'},
  /* ===== การ์ดอีเว้นท์ฮาโลวีน ===== */
  hutao:{name:'ฮูเต๋า',rar:'LTD',event:'halloween',img:'hutao.jpeg',power:40,hp:400,color:'#ff6b3d',ability:'ghost',
        desc:'ทุกครั้งที่โจมตีเรียกผีเมาช่วยโจมตี สุ่ม 2 รูปแบบ: ให้สถานะเผาไหม้ (เสีย 15% ของ HP สูงสุดศัตรู ต่อเทิร์น) / เรียกผีตัวเล็กโจมตี 2 ครั้ง (ครั้งละ 10% ของ POWER ปัจจุบัน)'},
  luffy:{name:'ลูฟี่ ไนท์แมร์',rar:'LTD',event:'halloween',img:'nightmare.jpeg',power:35,hp:500,color:'#4fa8ff',ability:'possess',
        desc:'เมื่อโจมตีจะทำให้ศัตรูติดสถานะ "เข้าสิง" มีโอกาส 50% ที่ศัตรูจะโจมตีตัวเองในเทิร์นถัดไป'},
  gengar:{name:'เก็งการ์ร่างกิกะแม็กซ์',rar:'LTD',event:'halloween',img:'gengar.jpeg',power:37,hp:490,color:'#9b4dff',ability:'gmax',
        desc:'เมื่อได้รับผลลัพธ์ด้านลบจะแปรเปลี่ยนเป็นการเพิ่ม POWER ให้ตนเองและล้างสถานะด้านลบทันที'},
  alucard:{name:'อลูคาร์ด',rar:'LTD',event:'halloween',img:'alucard.jpeg',power:22,hp:460,color:'#d11a3a',ability:'double',
        desc:'โจมตีได้ 2 ครั้งใน 1 เทิร์น และเมื่อโจมตีศัตรูจะได้รับสถานะ "เลือดไหล" เสียหาย 5% ของ HP สูงสุดทุกเทิร์น'},
  isaac:{name:'ไอแซ็ค ฟรอสเตอร์',rar:'LTD',event:'halloween',img:'isaac.jpeg',power:33,hp:333,color:'#b3122e',ability:'scythe',
        desc:'สุ่มการโจมตี 3 รูปแบบ: โจมตีปกติ / โจมตีเฉียดจุดตาย (ดาเมจ 2 เท่าของ POWER ปัจจุบัน) / โจมตีจุดตาย (ศัตรูตายทันที)'},
  konan:{name:'มัมมี่สาว โคนัน',rar:'LTD',event:'halloween',endless:true,img:'konanmummy.jpeg',power:45,hp:470,color:'#b48cff',ability:'paper',
        desc:'เพิ่มค่าสเตตัสให้กับการ์ดในอีเว้นท์ฮาโลวีน 20% ทุกครั้งที่โจมตีจะเรียกกระดาษที่มีความสามารถแบบสุ่ม 2 รูปแบบ: กระดาษลดความเสียหาย 75% ของ POWER สูงสุดของฝ่ายตรงข้าม · กระดาษระเบิดสร้างความเสียหาย 75% ของ POWER ปัจจุบันใส่การ์ดในทีมฝ่ายตรงข้ามใบที่สอง'},
  okarun:{name:'โอคารุน',rar:'LTD',event:'halloween',img:'okarun.jpeg',power:40,hp:400,color:'#c23dff',ability:'turbo',
        desc:'มีโอกาส 30% หลบการโจมตี · ไม่ได้รับผลของสถานะด้านลบ · เมื่อโจมตีจะติดสัญลักษณ์เทอร์โบ ทำให้การโจมตีครั้งถัดไปสร้างดาเมจเพิ่ม 30% ของ POWER ปัจจุบัน'}
};
/* ลำดับระดับการ์ด จากน้อยไปมาก */
const R_ORDER=['R','S','SR','SSR','UR','USR','LTD'];
const rIdx=r=>R_ORDER.indexOf(r);
const ID={garomon:{p:'#pfP',h:'#pfH'},garored:{p:'#grP',h:'#grH'},truerimuru:{p:'#trP',h:'#trH'},rimulord:{p:'#rlP',h:'#rlH'},slime:{p:'#slP',h:'#slH'},rimuru:{p:'#riP',h:'#riH'},cc:{p:'#ccP',h:'#ccH'},gilqueen:{p:'#gqP',h:'#gqH'},reze:{p:'#rzP',h:'#rzH'},shuna:{p:'#shP',h:'#shH'},chahaein:{p:'#chP',h:'#chH'},chaevo:{p:'#ceP',h:'#ceH'},kaneki:{p:'#kkP',h:'#kkH'},mai:{p:'#maP',h:'#maH'},kdash:{p:'#kyP',h:'#kyH'},mahoraga:{p:'#mhP',h:'#mhH'},sasukecurse:{p:'#scP',h:'#scH'},sasukekid:{p:'#kdP',h:'#kdH'},naruto1:{p:'#n1P',h:'#n1H'},ino:{p:'#inP',h:'#inH'},gekko:{p:'#qP',h:'#qH'},naruto:{p:'#wP',h:'#wH'},ichigo:{p:'#oP',h:'#oH'},megumi:{p:'#mP',h:'#mH'},yuji:{p:'#yP',h:'#yH'},goku:{p:'#gP',h:'#gH'},zenitsu:{p:'#zP',h:'#zH'},kirito:{p:'#kP',h:'#kH'},gil:{p:'#iP',h:'#iH'},kurapika:{p:'#rP',h:'#rH'},sasuke:{p:'#sP',h:'#sH'},hutao:{p:'#hP',h:'#hH'},luffy:{p:'#fP',h:'#fH'},gengar:{p:'#eP',h:'#eH'},alucard:{p:'#aP',h:'#aH'},isaac:{p:'#xP',h:'#xH'},okarun:{p:'#uP',h:'#uH'},kirara:{p:'#krP',h:'#krH'},garo:{p:'#gaP',h:'#gaH'},vegeta:{p:'#vgP',h:'#vgH'},kula:{p:'#kuP',h:'#kuH'},konan:{p:'#knP',h:'#knH'}};

/* อาวุธ Gate of Babylon (SVG หันไปทางขวา) */
const WEAPONS=[
 '<svg viewBox="0 0 120 24"><path d="M30 12 L112 9 L120 12 L112 15Z" fill="#fff0b0"/><rect x="24" y="2" width="6" height="20" rx="2" fill="#d4a017"/><rect x="6" y="9" width="18" height="6" rx="2" fill="#a8741a"/><circle cx="4" cy="12" r="4" fill="#d4a017"/></svg>',
 '<svg viewBox="0 0 120 24"><rect x="0" y="10.5" width="86" height="3" fill="#c9922b"/><path d="M80 12 L96 3 L120 12 L96 21Z" fill="#fff0b0"/><rect x="78" y="7" width="6" height="10" rx="1" fill="#d4a017"/></svg>',
 '<svg viewBox="0 0 120 24"><path d="M44 12 Q84 -2 120 12 Q84 26 44 12Z" fill="#fff0b0"/><rect x="8" y="10" width="36" height="4" fill="#c9922b"/><rect x="40" y="3" width="5" height="18" rx="2" fill="#d4a017"/></svg>',
 '<svg viewBox="0 0 120 24"><rect x="0" y="11" width="72" height="2" fill="#c9922b"/><path d="M66 12 L82 1 L120 12 L82 23Z" fill="#fff0b0"/><circle cx="64" cy="12" r="4" fill="#d4a017"/></svg>'
];

/* เลเวลการ์ด: ทุกเลเวลเพิ่ม POWER และ HP +4% ของค่าพื้นฐาน (Lv.100 = ~4.96 เท่า) */
const LV_MAX=100,levelMult=l=>1+0.04*(l-1);
/* ดาวการ์ด: ได้จากการ์ดซ้ำ สูงสุด 6 ดาว (เริ่ม 1 ดาว) · ทุกดาวที่เพิ่มได้ POWER/HP +STAR_BONUS ของค่าพื้นฐาน · ใช้การ์ดซ้ำ STAR_COST[ดาวปัจจุบัน-1] ใบต่อการอัพ 1 ดาว */
const STAR_MAX=6,STAR_BONUS=0.10,STAR_COST=[1,1,2,3,4];
const starMult=s=>1+STAR_BONUS*(Math.max(1,s)-1);
const statAt=(id,l,st=1)=>{const b=ID[id],p0=b?num(b.p):CARDS[id].power,h0=b?num(b.h):CARDS[id].hp;const m=levelMult(l)*starMult(st);return{p:Math.round(p0*m*10)/10,hp:Math.round(h0*m)}};
let S=null,run=0,paused=false,speed=1,C={},OPT={};
/* ถ้าออก/เริ่มสู้ใหม่ระหว่างเทิร์น (run เปลี่ยน) ให้เทิร์นเก่าหยุดทันที */
const sl=async ms=>{const r=run;await sleepRaw(ms/speed);if(r!==run)throw 'cancel'};
const show=id=>document.querySelectorAll('.screen').forEach(e=>e.classList.toggle('hidden',e.id!==id));
const num=s=>+(FIXED?$(s).defaultValue:$(s).value);   /* ออนไลน์: ใช้ค่าเริ่มต้นเสมอ ไม่ใช้ค่าที่ปรับทดลองในเครื่อง */

/* ---------- ต่อสู้ ---------- */
function nm(k){const same=S.a&&S.b&&S.a.id===S.b.id;return CARDS[S[k].id].name+(S[k].cl?' (ร่างแยก)':'')+(same?(k==='a'?' (ซ้าย)':' (ขวา)'):'')}
function log(t,c='',ic=''){const d=document.createElement('div');d.className=c;if(ic){d.innerHTML=ic;d.classList.add('ic')}d.appendChild(document.createTextNode(t));if(S&&S[c])d.style.borderLeftColor=CARDS[S[c].id].color;$('#log').appendChild(d);$('#log').scrollTop=1e5}
function sideHtml(k){return `<div class="fighter" id="f${k}"><div class="cardbox"><div class="cw"><img alt=""><span class="badge pb">⚡ ชา</span><span class="badge zp">🌩 สายฟ้า</span><span class="badge bl">🐇 สับสน</span><span class="badge ch">⚔ พลังสะสม ×3</span><span class="badge lock">🔒 ผนึกความสามารถ</span><span class="badge bn">🔥 เผาไหม้</span><span class="badge sv">⚡ ชารุนแรง</span><span class="badge ps">👻 เข้าสิง</span><span class="badge bd">🩸 เลือดไหล</span><span class="badge pz">☠ ติดพิษ</span><span class="badge tb">⚡ เทอร์โบ</span><span class="badge cx">✦ กางเขนใต้</span><span class="badge fz">❄ แช่แข็ง</span><span class="badge hwb">✝ บาดแผลศักดิ์สิทธิ์</span><div class="fgr"></div></div></div><div class="stat"><div class="row"><b class="nm"></b><span>POWER <span class="num pw"></span></span></div><div class="bar-hp"><div class="fill"></div></div><div class="hpt"></div></div><div class="line"></div></div>`}
function setFighter(k){
  const f=$('#f'+k),c=CARDS[S[k].id],cw=$('.cw',f);
  cw.classList.remove('ko','para','seal','zap','lungea','lungeb','hit','gold','heal');
  cw.classList.toggle('kcloak',c.ability==='kyuubi');
  f.style.setProperty('--c',c.color);const im=$('img',f);im.src=c.img;im.alt=c.name;$('.nm',f).textContent=nm(k)+' Lv.'+S[k].lv;
}
function startBattle(opts){
  OPT=opts;FIXED=!!opts.online;RNG=opts.seed!=null?mulberry(opts.seed>>>0):null;if(opts.online){speed=1;$('#speedBtn').textContent='ความเร็ว x1'}
  run++;paused=false;$('#pauseBtn').textContent='หยุด';$('#fx').innerHTML='';$('#autoBtn').classList.toggle('hidden',!opts.auto);
  C={mih:num('#maT')/100,mib:num('#maB')/100,mit:Math.max(1,Math.round(num('#maN'))),mim:num('#maM'),mis:num('#maS')/100,kkd:num('#kkD')/100,kkc:num('#kkC')/100,kkn:Math.max(2,Math.round(num('#kkN'))),cem:num('#ceM'),ced:num('#ceD')/100,gr:num('#gr')/100,zc:num('#zc')/100,kh:num('#kh')/100,ki:Math.max(1,num('#ki')),gc:num('#gc'),gd:num('#gd')/100,nh:num('#nh')/100,rm:num('#rm'),lb:num('#lb')/100,lc:num('#lc')/100,ym:num('#ym'),gm:num('#oM'),gn:Math.max(1,num('#oN')),sd:num('#mD')/100,sn:num('#mN')/100,se:num('#mE'),sr:num('#mR')/100,bd:num('#hB')/100,bt:Math.max(1,num('#hT')),gh:num('#hG')/100,pc:num('#fC')/100,gx:num('#eG')/100,ab:num('#aB')/100,kf:num('#kdF')/100,sv:num('#scV')/100,sc:num('#scC')/100,st:Math.max(1,num('#scT')),kb:num('#kdB')/100,kt:Math.max(1,num('#kdT')),xn:num('#xN'),xk:num('#xK'),xm:num('#xM'),ot:num('#uT')/100,od:num('#uD')/100,nr:num('#wR')/100,gk:num('#qR')/100,ni:Math.max(1,Math.round(num('#inI'))),nx:num('#inX'),n1h:num('#n1h')/100,n1c:num('#n1c')/100,wp:num('#mhW'),gqw:num('#gqW')/100,gqc:Math.max(1,Math.round(num('#gqC'))),gqe:num('#gqE')/100,gqm:num('#gqM'),wr:num('#mhR')/100,zb:num('#rzB')/100,zm:num('#rzM'),zs:num('#rzS')/100,rb:num('#rzX'),shh:num('#shA')/100,shp:num('#shB')/100,cm:num('#chM'),kyd:num('#kyD')/100,kyt:Math.max(1,num('#kyT')),kyr:num('#kyR')/100,krn:Math.max(1,Math.round(num('#krN'))),krc:num('#krC')/100,krr:num('#krR')/100,krs:num('#krS')/100,krk:num('#krK')/100,krb:num('#krB')/100,gad:num('#gaD')/100,vgd:num('#vgD')/100,vgn:Math.max(1,Math.round(num('#vgA'))),vgx:Math.max(1,Math.round(num('#vgB'))),kuc:num('#kuC')/100,kud:num('#kuD')/100,kut:Math.max(1,Math.round(num('#kuT'))),knb:num('#knB')/100,knr:num('#knR')/100,knx:num('#knX')/100,rit:num('#riT')/100,rib:num('#riB')/100,rin:Math.max(1,Math.round(num('#riN'))),pfd:num('#pfD')/100,pfn:Math.max(2,Math.round(num('#pfN'))),pfc:num('#pfC')/100,pfb:num('#pfB')/100,pft:Math.max(1,Math.round(num('#pfT'))),grd:num('#grD')/100,grn:Math.max(2,Math.round(num('#grN'))),hwd:num('#rlD')/100,hwn:Math.max(1,Math.round(num('#rlN'))),trg:num('#trG')/100,tri:Math.max(1,Math.round(num('#trI'))),trh:num('#trR')/100};
  const mk=(lvs,sts)=>(id,i)=>{const l=(lvs&&lvs[i])||1,sr=(sts&&sts[i])||1,s=statAt(id,l,sr);return{id,lv:l,star:sr,p:s.p,hp:s.hp,max:s.hp,para:false,sealed:false,lightning:false,miss:false,burn:0,burnDmg:0,sev:0,poss:false,bleed:false,hb:0,ps:0,hw:0,hwDmg:0,turbo:false,cx:0,frz:false,ice:0,iceDmg:0,wkr:0,p0:s.p,slime:id==='slime',rm:0,rmOn:false,rmUsed:false,rmP:0,rmH:0,rmT:0,rmHeal:false,fg:null,t:0}};
  let first=opts.first||$('#first').value;if(first==='r')first=RR()<.5?'a':'b';
  S={a:null,b:null,roster:{a:opts.a.map(mk(opts.la,opts.sa)),b:opts.b.map(mk(opts.lb,opts.sb))},idx:{a:0,b:0},turn:first,n:1,over:false,phase2:opts.phase2||null};   /* phase2 = บอสเควส 2 เฟส: เมื่อเฟส 1 ตาย บอสตัวเดิมเปลี่ยนเป็นเฟส 2 */
  if(opts.bossHp){const r=S.roster.b[0];r.max=opts.bossHp.max;r.hp=opts.bossHp.cur;r.boss=true;
    if(opts.noHeal)r.noHeal=true;   /* เควสพัฒนา: บอสไม่ฟื้นฟู HP */
    if(opts.bossP!=null)r.p=opts.bossP;   /* อีเว้นท์: กำหนด POWER บอสเอง */
    if(opts.bossSafe){r.safe=true;r.base=statAt(r.id,r.lv).hp}   /* บอส HP มหาศาล: กันจุดตายทันที / เลือดไหลที่คิดจาก HP สูงสุด */
  }   /* เรด: บอสมี HP สะสมข้ามรอบ */
  for(const k of['a','b']){const m=k==='a'?opts.mulA:opts.mulB;   /* ตัวคูณสเตตัสทั้งทีม (ด่านไม่มีที่สิ้นสุด) */
    if(m)S.roster[k].forEach(r=>{if(r.boss)return;r.p=Math.round(r.p*(m.p||1)*10)/10;r.p0=r.p;const h=Math.max(1,Math.round(r.hp*(m.h||1)));r.hp=r.max=h})}
  if(opts.fixB)S.roster.b.forEach(r=>{if(r.boss)return;r.p=opts.fixB.p;r.p0=r.p;r.hp=r.max=opts.fixB.hp;r.fixed=true});   /* ศัตรูทุกตัวสเตตัสตายตัว (ไม่แปลงร่าง) */
  const sbLogs=[];
  for(const k of['a','b']){if(!S.roster[k].some(r=>r.id==='konan'))continue;   /* โคนัน: เสริมสเตตัสการ์ดอีเว้นท์ฮาโลวีนในทีม */
    S.roster[k].forEach(r=>{if(r.boss||CARDS[r.id].event!=='halloween')return;const h=Math.round(r.max*C.knb),p=Math.round(r.p*C.knb*10)/10;r.max+=h;r.hp+=h;r.p=Math.round((r.p+p)*10)/10});
    sbLogs.push([k,'🎃 โคนันเสริมพลังการ์ดอีเว้นท์ฮาโลวีนในทีม: HP +'+Math.round(C.knb*100)+'% · POWER +'+Math.round(C.knb*100)+'%'])}
  for(const k of['a','b']){const sh=S.roster[k].find(r=>r.id==='shuna');if(!sh)continue;
    S.roster[k].forEach(r=>{if(r===sh||r.boss)return;const h=Math.round(r.max*C.shh),p=Math.round(r.p*C.shp*10)/10;r.max+=h;r.hp+=h;r.p=Math.round((r.p+p)*10)/10;r.sb={h,p}});
    sbLogs.push([k,'🌸 ชูนะเสริมพลังให้ทีม: HP +'+Math.round(C.shh*100)+'% · POWER +'+Math.round(C.shp*100)+'% (หายเมื่อชูนะถูกกำจัด)'])}
  S.a=S.roster.a[0];S.b=S.roster.b[0];
  $('#teamA').innerHTML=sideHtml('a');$('#teamB').innerHTML=sideHtml('b');
  setFighter('a');setFighter('b');$('#stgName').textContent=opts.title||'';
  $('#log').innerHTML='';show('battleScr');
  log('เริ่มการต่อสู้! '+nm(S.turn)+' โจมตีก่อน','sys');sbLogs.forEach(x=>log(x[1],x[0]));render();loop(run);
}
const endInfo=()=>{const sm=(k,f)=>S.roster[k].reduce((s,r)=>s+f(r),0);return{winner:S.winner||null,hpA:sm('a',r=>Math.max(0,r.hp)),hpB:sm('b',r=>Math.max(0,r.hp)),maxA:sm('a',r=>r.max),maxB:sm('b',r=>r.max)}};
/* โอคารุน: โอกาสหลบการโจมตี */
const dodges=k=>{const d=S&&S[k];if(!d||d.hp<=0)return false;const ab=CARDS[d.id].ability;const r=(ab==='turbo'&&RR()<C.od)||(ab==='garo'&&RR()<C.gad)||(ab==='garored'&&RR()<C.grd)||(ab==='garomon'&&RR()<C.pfd)||(ab==='boss5'&&RR()<C.ced);if(r&&k==='a'&&(d.id==='garo'||d.id==='garored')&&typeof onDodgeHook==='function'&&!OPT.online)onDodgeHook(d.id);return r};
/* เก็งการ์ร่างกิกะแม็กซ์ / โอคารุน: สถานะด้านลบทุกชนิด → ล้างทันที + เพิ่ม POWER */
function gmaxPurify(k){
  const s=S&&S[k];const cci=!!(S&&S.roster&&S.roster[k].some(r=>r.id==='cc'&&r.hp>0));   /* ซีซีในทีม (ยังไม่ถูกกำจัด) = ทั้งทีมกันสถานะผิดปกติ */
  if(!s||s.hp<=0||!(['gmax','turbo','rimuru','rimulord','truelord','truebossimm'].includes(CARDS[s.id].ability)||s.resist||cci))return;
  const n=(s.para?1:0)+(s.sealed?1:0)+(s.lightning?1:0)+(s.miss?1:0)+(s.burn>0?1:0)+(s.sev>0?1:0)+(s.poss?1:0)+(s.bleed?1:0)+(s.hb>0?1:0)+(s.ps>0?1:0)+(s.hw>0?1:0)+(s.frz?1:0)+(s.ice>0?1:0)+(s.cx>0?1:0);if(!n)return;
  s.para=s.sealed=s.lightning=s.miss=s.poss=s.bleed=false;s.burn=0;s.sev=0;s.hb=s.ps=0;s.hw=0;s.hwDmg=0;s.frz=false;s.ice=0;s.iceDmg=0;s.cx=0;
  const cw=$('#f'+k+' .cw');
  if(CARDS[s.id].ability==='truelord'||CARDS[s.id].ability==='truebossimm'){   /* จอมมารที่แท้จริง (และบอสเควสเฟส 2): สถานะลบไม่มีผล + แปลงเป็นสเตตัส (POWER และ HP สูงสุด) +C.trg ต่อสถานะ */
    const g=C.trg*n,ap=Math.round(s.p*g*10)/10,ah=Math.round(s.max*g);s.p=Math.round((s.p+ap)*10)/10;s.max+=ah;s.hp+=ah;
    log('👑 '+nm(k)+' ไม่ได้รับผลของสถานะด้านลบ '+n+' อย่าง และแปลงเป็นสเตตัส +'+Math.round(g*100)+'% (POWER +'+ap+' เป็น '+s.p+' · HP สูงสุด +'+ah.toLocaleString()+')',k);
    if(cw){floatTxt(cw,'+'+Math.round(g*100)+'%','heal');cw.classList.remove('gold');void cw.offsetWidth;cw.classList.add('gold');setTimeout(()=>cw.classList.remove('gold'),1400)}
    return}
  const imm=['turbo','rimuru','rimulord'].includes(CARDS[s.id].ability)||s.resist;
  if(cci&&!imm){log('🛡 ซีซีป้องกันสถานะผิดปกติให้ '+nm(k)+'!',k);if(cw)floatTxt(cw,'IMMUNE','sm');return}
  if(imm){log('🛡 '+nm(k)+' ไม่ได้รับผลของสถานะด้านลบ',k);if(cw)floatTxt(cw,'IMMUNE','sm');return}
  const add=Math.round(s.p*C.gx*n*10)/10;s.p=Math.round((s.p+add)*10)/10;
  log('✦ '+nm(k)+' แปลงสถานะด้านลบ '+n+' อย่างเป็น POWER +'+add+' (เป็น '+s.p+')',k);
  if(cw){floatTxt(cw,'+'+add,'heal');cw.classList.remove('gold');void cw.offsetWidth;cw.classList.add('gold');setTimeout(()=>cw.classList.remove('gold'),1400)}
}
/* เค แดช: ไม่ติดสถานะเผาไหม้ / ลด POWER ตอนลงสนาม */
function pflameImmune(k){const s=S&&S[k];if(!s||s.hp<=0||CARDS[s.id].ability!=='pflame'||!(s.burn>0))return;
  s.burn=0;s.burnDmg=0;log('🛡 '+nm(k)+' ไม่ได้รับผลของสถานะเผาไหม้',k);const cw=$('#f'+k+' .cw');if(cw)floatTxt(cw,'IMMUNE','sm')}
function enterField(k){const s=S&&S[k];if(!s||s.entered||s.hp<=0)return;s.entered=true;
  if(CARDS[s.id].ability==='pflame'){const d=Math.round(s.p*C.kyr*10)/10;s.p=Math.max(1,Math.round((s.p-d)*10)/10);log('🔥 '+nm(k)+' ลงสนาม POWER ลดลง '+d+' (เหลือ '+s.p+')',k)}}
/* ชูนะ: ถูกกำจัด → บัฟของทีมหายทันที */
function shunaFade(k){let n=0;S.roster[k].forEach(r=>{if(!r.sb)return;r.p=Math.max(1,Math.round((r.p-r.sb.p)*10)/10);r.max=Math.max(1,r.max-r.sb.h);r.hp=Math.min(r.hp,r.max);r.sb=null;n++});
  if(n)log('🌸 ชูนะถูกกำจัด! ผลเสริมพลังของทีมหายไป',k);render()}
function bombFx(ak,dk){const dw=$('#f'+dk+' .cw'),r=dw.getBoundingClientRect();
  for(const [dx,dy,sz] of [[0,0,260],[-.25,.15,150],[.25,-.15,150]]){const x=fxEl('bfx',r.left+r.width*(.5+dx),r.top+r.height*(.5+dy),sz,sz);setTimeout(()=>x.remove(),600)}
  dw.classList.remove('bflash');void dw.offsetWidth;dw.classList.add('bflash')}
/* ริมุรุ เทมเพสต์: HP < 30% → โหมด "ผู้ไร้ความปราณี" (สเตตัสรวม +50% นาน 6 เทิร์นของตัวเอง · 1 ครั้งต่อเกม) · สังหารระหว่างโหมด → ฟื้น HP เต็ม */
function rimuruCheck(k){
  const s=S&&S[k];if(!s||s.hp<=0||s.rmUsed||CARDS[s.id].ability!=='rimuru'||s.hp>=s.max*C.rit)return;
  s.rmUsed=true;s.rmOn=true;s.rm=C.rin;s.rmT=S.n;
  const ap=Math.round(s.p*C.rib*10)/10,ah=Math.round(s.max*C.rib);s.rmP=ap;s.rmH=ah;s.p=Math.round((s.p+ap)*10)/10;s.max+=ah;s.hp+=ah;
  log('😈 '+nm(k)+' เข้าสู่โหมด "ผู้ไร้ความปราณี"! สเตตัสรวม +'+Math.round(C.rib*100)+'% (POWER '+s.p+' · HP '+Math.ceil(s.hp)+'/'+s.max+') นาน '+C.rin+' เทิร์น — สังหารก่อนหมดเวลาเพื่อฟื้น HP จนเต็ม',k);
  const cw=$('#f'+k+' .cw');if(cw){floatTxt(cw,'ผู้ไร้ความปราณี','crit');cw.classList.remove('gold');void cw.offsetWidth;cw.classList.add('gold');setTimeout(()=>cw.classList.remove('gold'),1600)}
}
function rimuruEnd(k){
  const s=S[k];if(!s||!s.rmOn)return;s.rmOn=false;
  s.p=Math.max(1,Math.round((s.p-s.rmP)*10)/10);s.max=Math.max(1,s.max-s.rmH);s.hp=Math.min(s.hp,s.max);s.rmP=s.rmH=0;
  log('😈 โหมด "ผู้ไร้ความปราณี" ของ '+nm(k)+' สิ้นสุดลง',k);
}
/* นับสถิติเควสตัวละคร: ดาเมจที่ทำให้ศัตรู + HP ที่ทีมเราฟื้น (เทียบ HP ระหว่างการ render · ไม่นับออนไลน์) */
function qTrack(){
  if(typeof onStatHook!=='function'||!S||!S.roster||OPT.online)return;
  let heal=0,dmg=0;
  for(const k of['a','b'])S.roster[k].forEach(r=>{
    const hp=Math.max(0,Math.min(r.hp,r.max));
    if(r.qh!==undefined&&r.qm===r.max){if(k==='b'&&hp<r.qh)dmg+=r.qh-hp;else if(k==='a'&&hp>r.qh)heal+=hp-r.qh}
    r.qh=hp;r.qm=r.max});
  if(heal||dmg)onStatHook(heal,dmg);
}
function render(){
  qTrack();
  if(S&&!S.over){gmaxPurify('a');gmaxPurify('b');for(const k of['a','b']){pflameImmune(k);enterField(k);rimuruCheck(k)}}
  for(const k of['a','b']){const s=S[k],f=$('#f'+k),pc=Math.max(0,s.hp/s.max*100);
    const fl=$('.fill',f);fl.style.width=pc+'%';fl.classList.toggle('low',pc<30);
    $('.hpt',f).textContent='HP '+Math.max(0,Math.ceil(s.hp)).toLocaleString()+' / '+s.max.toLocaleString();
    $('.pw',f).textContent=Number.isInteger(s.p)?s.p:s.p.toFixed(1);
    $('.cw',f).classList.toggle('para',s.para);$('.cw',f).classList.toggle('seal',s.sealed);$('.cw',f).classList.toggle('zap',s.lightning);$('.cw',f).classList.toggle('blind',s.miss);$('.cw',f).classList.toggle('burning',s.burn>0);$('.cw',f).classList.toggle('sevr',s.sev>0);$('.cw',f).classList.toggle('possessed',!!s.poss);$('.cw',f).classList.toggle('bleeding',!!s.bleed||s.hb>0);$('.cw',f).classList.toggle('poisoned',s.ps>0);$('.cw',f).classList.toggle('holywound',s.hw>0);$('.cw',f).classList.toggle('turbo',!!s.turbo);$('.cw',f).classList.toggle('charged',CARDS[s.id].ability==='getsuga'&&s.t%(C.gn+1)===C.gn&&!S.over);{const g=$('.fgr',f);g.style.display=s.fg==null?'none':'flex';g.innerHTML=s.fg==null?'':handSvg(s.fg,26)+'<span>'+FN[s.fg]+'</span>'}{const cwx=$('.cw',f);cwx.classList.toggle('crossed',s.cx>0);cwx.classList.toggle('frozen',!!s.frz||s.ice>0);const bx=$('.badge.cx',f),bz=$('.badge.fz',f);if(bx)bx.textContent='✦ กางเขนใต้ ×'+(s.cx||0);if(bz)bz.textContent=s.frz?'❄ แช่แข็ง':'❄ ผลึกน้ำแข็ง'+(s.ice>1?' ×'+s.ice:'')}f.classList.toggle('active',!S.over&&S.turn===k)}
  for(const k of['a','b'])$('#f'+k+' .line').innerHTML=S.roster[k].map((r,i)=>`<span class="lu${i===S.idx[k]&&!S.over?' on':''}${r.hp<=0?' dead':''}" style="--c:${CARDS[r.id].color}"><img src="${CARDS[r.id].img}" alt="${CARDS[r.id].name}"></span>`).join('');
  $('#turnLbl').textContent=S.over?'จบเกม':'เทิร์นที่ '+S.n+(OPT.maxTurns?'/'+OPT.maxTurns:'')+' · ถึงตา '+nm(S.turn);
}

/* ---------- เอฟเฟกต์ ---------- */
function floatTxt(wrap,txt,cls='',left=50){
  const f=document.createElement('div');f.className='float '+cls;f.textContent=txt;f.style.left=left+'%';wrap.appendChild(f);setTimeout(()=>f.remove(),1000);
}
function fxEl(cls,x,y,w,h,html=''){
  const e=document.createElement('div');e.className=cls;e.style.cssText=`left:${x-w/2}px;top:${y-h/2}px;width:${w}px;height:${h}px`;e.innerHTML=html;$('#fx').appendChild(e);return e;
}
const sleepAnim=(an)=>an.finished.catch(()=>{});
/* Gate of Babylon: ประตูทองคำเปิด อาวุธพุ่งออกมาแทงเป้าหมาย */
async function gate(ak,dk,n0,pct0){
  const A=S[ak],D=S[dk],aw=$('#f'+ak+' .cw'),dw=$('#f'+dk+' .cw');
  const ar=aw.getBoundingClientRect(),dr=dw.getBoundingClientRect();
  aw.classList.add('gold');setTimeout(()=>aw.classList.remove('gold'),1400);
  const bn=fxEl('banner',ar.left+ar.width/2,Math.max(30,ar.top+ar.height*.12),260,40,'<small>王の財宝</small>Gate of Babylon');
  setTimeout(()=>bn.remove(),1500);
  const n=n0!=null?n0:C.gc,gpct=pct0!=null?pct0:C.gd;log('✦ Gate of Babylon! '+nm(ak)+' เรียกอาวุธ '+n+' เล่ม (เล่มละ '+Math.round(gpct*100)+'% ของ POWER ปัจจุบัน)','gold');
  let total=0;
  const jobs=[];
  for(let i=0;i<n;i++)jobs.push((async()=>{
    await sl(i*230);
    const px=rnd(ar.left-ar.width*.1,ar.right+ar.width*.1),py=rnd(ar.top+ar.height*.02,ar.top+ar.height*.55);
    const portal=fxEl('portal',px,py,90,90);portal.animate([{transform:'scale(0) rotate(0)',opacity:0},{transform:'scale(1) rotate(120deg)',opacity:1,offset:.3},{transform:'scale(1) rotate(360deg)',opacity:1,offset:.8},{transform:'scale(.2) rotate(500deg)',opacity:0}],{duration:1000/speed});
    setTimeout(()=>portal.remove(),1000/speed);
    await sl(300);
    if(D.hp<=0||run===0)return;
    const tx=dr.left+dr.width*rnd(.3,.7),ty=dr.top+dr.height*rnd(.25,.7);
    const ang=Math.atan2(ty-py,tx-px),len=110,deg=ang*180/Math.PI;
    const w=fxEl('weapon',0,0,len,22,WEAPONS[Math.floor(Math.random()*WEAPONS.length)]);w.style.left='0';w.style.top='0';
    const sx=px,sy=py-11,ex=tx-len*Math.cos(ang),ey=ty-len*Math.sin(ang)-11;
    await sleepAnim(w.animate([{transform:`translate(${sx}px,${sy}px) rotate(${deg}deg) scale(.3)`,opacity:0},{opacity:1,offset:.2},{transform:`translate(${ex}px,${ey}px) rotate(${deg}deg) scale(1)`,opacity:1}],{duration:340/speed,easing:'cubic-bezier(.5,0,1,.6)',fill:'forwards'}));
    w.animate([{opacity:1},{opacity:0}],{duration:200/speed,fill:'forwards'});setTimeout(()=>w.remove(),200/speed);
    const sp=fxEl('spark',tx,ty,90,90);setTimeout(()=>sp.remove(),500);
    if(D.hp<=0)return;
    if(dodges(dk)){floatTxt(dw,'หลบ!','miss',rnd(25,75));return}const gdm=Math.max(1,Math.round(A.p*gpct));   /* ดาเมจต่ออาวุธ = % ของ POWER ปัจจุบันของกิลกาเมช */
     D.hp-=gdm;total+=gdm;floatTxt(dw,'-'+gdm,'sm',rnd(25,75));
    dw.classList.remove('hit');void dw.offsetWidth;dw.classList.add('hit');render();
  })());
  await Promise.all(jobs);await sl(200);
  log('อาวุธทั้งหมดสร้างความเสียหายรวม '+total+' (เหลือ HP '+Math.max(0,Math.ceil(D.hp))+')',ak);
}
/* ฟื้นฟู HP: ประกายสีฟ้าเขียวลอยขึ้น */
function healFx(k){
  const cw=$('#f'+k+' .cw'),r=cw.getBoundingClientRect();
  cw.classList.add('heal');setTimeout(()=>cw.classList.remove('heal'),1300);
  for(let i=0;i<14;i++){const p=fxEl('spk',rnd(r.left+r.width*.1,r.right-r.width*.1),rnd(r.top+r.height*.5,r.bottom-r.height*.1),8,8);
    p.animate([{transform:'translateY(0) scale(1)',opacity:1},{transform:`translateY(${-rnd(80,200)}px) scale(.3)`,opacity:0}],{duration:rnd(800,1300)/speed,delay:rnd(0,300)/speed,fill:'both'});setTimeout(()=>p.remove(),1800)}
}

/* ---------- อิจิโกะ: เกตสึกะ เท็นโช (月牙天衝) คลื่นพระจันทร์เสี้ยวดำ-แดง ---------- */
function getsugaFx(ak,dk){
  const aw=$('#f'+ak+' .cw'),a=aw.getBoundingClientRect(),d=$('#f'+dk+' .cw').getBoundingClientRect();
  const x1=a.left+a.width/2,y1=a.top+a.height*.45,x2=d.left+d.width/2,y2=d.top+d.height*.5,deg=Math.atan2(y2-y1,x2-x1)*180/Math.PI;
  aw.classList.add('getsuga');setTimeout(()=>aw.classList.remove('getsuga'),900/speed);
  const bn=fxEl('banner shb',x1,Math.max(34,a.top+a.height*.1),330,54,'<small>月牙天衝</small>Getsuga Tenshou');setTimeout(()=>bn.remove(),1500/speed);
  const mk=(sz,delay,op)=>{
    const e=fxEl('gtsu',x1,y1,sz,sz*1.6,'<svg viewBox="-20 -85 80 170"><path d="M0 -80 A90 90 0 0 1 0 80 A55 90 0 0 0 0 -80Z" fill="#05000a" stroke="#ff2a2a" stroke-width="4" stroke-linejoin="round"/></svg>');
    e.style.opacity=0;
    const an=e.animate([{transform:`translate(0,0) rotate(${deg}deg) scale(.4)`,opacity:0},{opacity:op,offset:.15},{transform:`translate(${x2-x1}px,${y2-y1}px) rotate(${deg}deg) scale(1.25)`,opacity:op}],{duration:360/speed,delay:delay/speed,easing:'cubic-bezier(.4,0,.9,.6)',fill:'both'});
    return an.finished.catch(()=>{}).then(()=>e.remove());
  };
  const ps=[mk(150,0,1),mk(120,60,.6),mk(90,120,.35)];
  return Promise.all(ps).then(()=>{const s=fxEl('bfx',x2,y2,240,240);setTimeout(()=>s.remove(),550)});
}

/* ---------- คุราปิก้า: สุ่มนิ้ว (โอกาสเท่ากัน 20% ต่อนิ้ว) ---------- */
const FN=['นิ้วโป้ง','นิ้วชี้','นิ้วกลาง','นิ้วนาง','นิ้วก้อย'];
const FD=['ฟื้นฟู HP','ขโมยความสามารถ','ผนึกความสามารถศัตรู','ลบสถานะด้านลบ','โจมตีซ้ำ'];
const AN={garomon:'โจมตี 3 ครั้ง + หลบ 45% + โต้กลับ + เพิ่มสเตตัส',garored:'โจมตี 3 ครั้ง + หลบ 40%',truebossimm:'สถานะลบไม่มีผล + แปลงเป็นสเตตัส',truelord:'บาดแผลศักดิ์สิทธิ์',rimulord:'ล้างสถานะผิดปกติ + บาดแผลศักดิ์สิทธิ์',slime:'กลืนกินแล้วแปลงร่าง',rimuru:'ไร้ผลด้านลบ + โหมดผู้ไร้ความปราณี',immune:'ป้องกันสถานะผิดปกติให้ทีม',gate2:'Gate of Babylon (เรียกอาวุธ 3 เล่ม)',bomb:'ระเบิด (ดาเมจ ×2 + มึนงง)',shuna:'เสริมพลังทีม',boss3:'ดาเมจ ×3 ใส่บอส',boss5:'ดาเมจ ×5 ใส่บอส + หลบ 50%',ghoul:'ดูดเลือด + ตี 4 ครั้ง',mai:'โหมดไฟ (เผาไหม้) / โหมดระเบิด',questboss:'ไม่มี',pflame:'ไฟบริสุทธิ์',wheel:'ธรรมจักร (กงล้อหมุนสุ่มเสริมพลัง)',kyuubi:'จักระจิ้งจอก (ฟื้นฟู HP + ชะงัก)',getsuga:'เกตสึกะ (ดาเมจ ×3)',shiki:'ทศฉายา (เรียกชิกิกามิ)',upset:'ล้มยักษ์ (ดาเมจเพิ่มใส่ศัตรูระดับสูงกว่า)',lightning:'สายฟ้า',grow:'POWER เพิ่มขึ้น',paralyze:'ทำให้ชา',heal:'ฟื้นฟู HP',gate:'Gate of Babylon',ghost:'ผีเมาช่วยโจมตี',possess:'เข้าสิง (ศัตรูมีโอกาสโจมตีตัวเอง)',gmax:'แปลงสถานะลบเป็น POWER',double:'โจมตี 2 ครั้ง + เลือดไหล',scythe:'สุ่มการโจมตี 3 รูปแบบ',turbo:'สัญลักษณ์เทอร์โบ',crux:'กลุ่มดาวกางเขนใต้ (เรียกอุปสรรคพุ่งใส่)',garo:'โจมตี 2 ครั้ง + หลบ 40%',kiblast:'กระสุนพลัง 2-5 ครั้ง',icecrystal:'ผลึกน้ำแข็ง (แช่แข็ง + ดาเมจตกค้าง)',paper:'กระดาษวิเศษ (ลดดาเมจ / ระเบิด)'};
/* ไอคอนมือ: นิ้วที่ใช้ในเทิร์นนั้นจะเรืองสีทอง */
function handSvg(i,sz=40){
  const F=[['M10 66 L22 56 L36 84 L22 92Z','',''],['M24 16h12a2 2 0 0 1 2 2v44H22V18a2 2 0 0 1 2-2z'],['M38 8h12a2 2 0 0 1 2 2v52H36V10a2 2 0 0 1 2-2z'],['M52 14h12a2 2 0 0 1 2 2v46H50V16a2 2 0 0 1 2-2z'],['M66 28h11a2 2 0 0 1 2 2v32H64V30a2 2 0 0 1 2-2z']];
  let s=`<svg viewBox="0 0 90 104" width="${sz}" height="${sz*1.15}" aria-hidden="true"><rect x="22" y="56" width="58" height="44" rx="14" fill="#2e3558" stroke="#6a74a8" stroke-width="2"/>`;
  F.forEach((f,k)=>{const on=k===i;s+=`<path d="${f[0]}" fill="${on?'#ffd34d':'#3a4268'}" stroke="${on?'#fff3b0':'#6a74a8'}" stroke-width="2"${on?' style="filter:drop-shadow(0 0 6px #ffb300)"':''}/>`});
  return s+'</svg>';
}
function chainFx(ak,dk){
  const a=$('#f'+ak+' .cw').getBoundingClientRect(),d=$('#f'+dk+' .cw').getBoundingClientRect();
  const x1=a.left+a.width/2,y1=a.top+a.height/2,x2=d.left+d.width/2,y2=d.top+d.height/2;
  const len=Math.hypot(x2-x1,y2-y1),deg=Math.atan2(y2-y1,x2-x1)*180/Math.PI;
  const c=document.createElement('div');c.className='chain';c.style.cssText=`left:${x1}px;top:${y1-8}px;width:${len}px;transform:rotate(${deg}deg)`;$('#fx').appendChild(c);
  c.animate([{clipPath:'inset(0 100% 0 0)',opacity:1},{clipPath:'inset(0 0 0 0)',opacity:1,offset:.45},{clipPath:'inset(0 0 0 0)',opacity:1,offset:.8},{clipPath:'inset(0 0 0 0)',opacity:0}],{duration:900/speed});
  setTimeout(()=>c.remove(),900/speed);
}
async function fingerFx(ak,dk,f){
  const r=$('#f'+ak+' .cw').getBoundingClientRect();
  const b=fxEl('fbanner',r.left+r.width/2,r.top+r.height*.4,200,150,handSvg(f,64)+`<b>${FN[f]}</b><small>${FD[f]}</small>`);
  setTimeout(()=>b.remove(),1500/speed);await sl(750);
}
async function hit(ak,dk,mult=1){
  const a=S[ak],d=S[dk],aw=$('#f'+ak+' .cw'),dw=$('#f'+dk+' .cw');
  aw.classList.add('lunge'+ak);await sl(260);
  if(dodges(dk)){S.lb=0;S.up=false;floatTxt(dw,'หลบ!','miss');log('💨 '+nm(dk)+' หลบการโจมตีได้!',dk);aw.classList.remove('lungea','lungeb');render();return 0}
  let tb=0;if(a.turbo&&!S.noAb&&CARDS[a.id].ability==='turbo'){tb=Math.round(a.p*C.ot);a.turbo=false;log('⚡ สัญลักษณ์เทอร์โบ! ดาเมจเพิ่ม +'+tb,ak)}
  const bonus=d.lightning?Math.round(a.p*C.lb):0;S.lb=bonus;const up=CARDS[a.id].ability==='upset'&&!S.noAb&&rIdx(CARDS[d.id].rar)>rIdx(CARDS[a.id].rar);S.up=up;
  const ab268=CARDS[a.id].ability,bm=(d.boss&&!S.noAb&&(ab268==='boss3'||ab268==='boss5'))?(ab268==='boss5'?C.cem:C.cm):1;if(bm>1)log('⚔ '+nm(ak)+' ดาเมจ ×'+bm+' ใส่บอส!',ak);
  const dmg=Math.round(a.p*mult*(up?C.ym:1)*bm)+bonus+tb;d.hp-=dmg;
  if(up){const r=dw.getBoundingClientRect(),x=fxEl('bfx',r.left+r.width/2,r.top+r.height/2,200,200);setTimeout(()=>x.remove(),550);dw.classList.remove('bflash');void dw.offsetWidth;dw.classList.add('bflash')}
  floatTxt(dw,'-'+dmg,up||mult>=3||bm>1?'crit':bonus?'zp':'');dw.classList.remove('hit');void dw.offsetWidth;dw.classList.add('hit');aw.classList.remove('lungea','lungeb');
  render();return dmg;
}
function boltFx(ak,dk){
  const a=$('#f'+ak+' .cw').getBoundingClientRect(),d=$('#f'+dk+' .cw').getBoundingClientRect();
  const x1=a.left+a.width/2,y1=a.top+a.height/2,x2=d.left+d.width/2,y2=d.top+d.height/2;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','bolt');
  for(let k=0;k<3;k++){let pts=[];const n=9;
    for(let i=0;i<=n;i++){const t=i/n,j=i===0||i===n?0:rnd(-40,40);pts.push((x1+(x2-x1)*t+j*(y2-y1)/Math.hypot(x2-x1,y2-y1)).toFixed(0)+','+(y1+(y2-y1)*t-j*(x2-x1)/Math.hypot(x2-x1,y2-y1)).toFixed(0))}
    const pl=document.createElementNS('http://www.w3.org/2000/svg','polyline');pl.setAttribute('points',pts.join(' '));pl.setAttribute('class','b'+k);svg.appendChild(pl)}
  $('#fx').appendChild(svg);svg.animate([{opacity:0},{opacity:1,offset:.1},{opacity:.3,offset:.25},{opacity:1,offset:.4},{opacity:.4,offset:.6},{opacity:1,offset:.75},{opacity:0}],{duration:650/speed});
  setTimeout(()=>svg.remove(),650/speed);
  const dw=$('#f'+dk+' .cw');dw.classList.remove('zapflash');void dw.offsetWidth;dw.classList.add('zapflash');
}
async function setLightning(ak,dk){
  const d=S[dk];boltFx(ak,dk);
  if(!d.lightning){d.lightning=true;log('🌩 '+nm(dk)+' ติดสถานะสายฟ้า! รับดาเมจเพิ่ม '+Math.round(C.lb*100)+'% ของ POWER ผู้โจมตี',ak);render()}
  await sl(450);
}
function heal(k,pct){
  const a=S[k];if(a.hw>0){floatTxt($('#f'+k+' .cw'),'ฟื้นฟูไม่ได้','miss');log('✝ '+nm(k)+' ฟื้นฟู HP ไม่ได้ (บาดแผลศักดิ์สิทธิ์)',k);return}
  const h=Math.min(a.max-a.hp,Math.round(a.max*pct));a.hp+=h;healFx(k);floatTxt($('#f'+k+' .cw'),'+'+h,'heal');
  log('✚ '+nm(k)+' ฟื้นฟู HP +'+h+' (เหลือ HP '+Math.ceil(a.hp)+')',k);render();
}
/* นารูโตะ 1 หาง: จักระจิ้งจอกแดงฟาดศัตรูจนชะงัก */
async function kuramaFx(ak,dk){
  const aw=$('#f'+ak+' .cw'),dw=$('#f'+dk+' .cw'),r=dw.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  aw.classList.add('kflare');setTimeout(()=>aw.classList.remove('kflare'),900/speed);
  for(let i=0;i<3;i++){const e=fxEl('kslash',cx+(i-1)*r.width*.2,cy,r.width*.14,r.height*.95);
    e.animate([{transform:'rotate(-26deg) scaleY(0)',opacity:1},{transform:'rotate(-26deg) scaleY(1)',opacity:1,offset:.35},{transform:'rotate(-26deg) scaleY(1)',opacity:0}],{duration:560/speed,delay:i*120/speed,fill:'both'});setTimeout(()=>e.remove(),1100/speed)}
  await sl(450);dw.classList.remove('hit');void dw.offsetWidth;dw.classList.add('hit');floatTxt(dw,'ชะงัก!','sm');await sl(350);
}
/* ความสามารถของการ์ดแต่ละใบ (opt.force = ถูกขโมยมาใช้ จึงทำงานทันที) */
async function applyAb(name,ak,dk,opt={}){
  const a=S[ak],d=S[dk];if(d.hp<=0)return;
  if(name==='paralyze'){if(!d.para&&RR()<C.zc){d.para=true;log('⚡ '+nm(dk)+' ถูกทำให้ชา! ข้ามการโจมตีเทิร์นหน้า',ak)}}
  else if(name==='lightning'){if(!d.lightning)await setLightning(ak,dk);if(!d.para&&RR()<C.lc){d.para=true;log('⚡ '+nm(dk)+' ถูกทำให้ชา! ข้ามการโจมตีเทิร์นหน้า',ak)}}
  else if(name==='gate'){await sl(350);await gate(ak,dk)}
  else if(name==='gate2'){await sl(350);await gate(ak,dk,C.gqc,C.gqw)}
  else if(name==='grow'&&C.gr>0){const add=a.p*C.gr;a.p+=add;log('POWER ของ '+nm(ak)+' เพิ่ม +'+add.toFixed(1)+' เป็น '+a.p.toFixed(1),ak)}
  else if(name==='shiki'){await shiki(ak,dk)}
  else if(name==='getsuga'){if(opt.force){S.noAb=true;const f=getsugaFx(ak,dk);const x=await hit(ak,dk,C.gm-1);await f;log('月牙天衝! โจมตีเพิ่ม '+x+' ดาเมจ',ak)}}
  else if(name==='upset'){if(opt.force&&rIdx(CARDS[d.id].rar)>rIdx(CARDS[a.id].rar)){S.noAb=true;const x=await hit(ak,dk,C.ym-1);log('ล้มยักษ์! โจมตีเพิ่ม '+x+' ใส่ศัตรูระดับสูงกว่า',ak)}}
  else if(name==='kyuubi'){
    if(!a.noHeal)heal(ak,C.n1h);
    if(d.hp>0&&!d.para&&RR()<C.n1c){d.para=true;await kuramaFx(ak,dk);log('🦊 '+nm(dk)+' ชะงัก! ไม่สามารถโจมตีในเทิร์นถัดไปได้',ak);render()}
  }
  else if(name==='ghost'){await ghostAb(ak,dk)}
  else if(name==='possess'){await possessAb(ak,dk)}
  else if(name==='double'){await alucardAb(ak,dk)}
  else if(name==='gekko'){await gekkoAb(ak,dk)}
  else if(name==='crux'){await cruxAb(ak,dk)}
  else if(name==='paper'){await paperAb(ak,dk)}
  else if(name==='garo'){await garoAb(ak,dk)}
  else if(name==='garored'){await garoAb(ak,dk,C.grn-1)}
  else if(name==='garomon'){await garoAb(ak,dk,C.pfn-1)}
  else if(name==='ghoul'){await ghoulAb(ak,dk)}
  else if(name==='mai'){await maiAb(ak,dk)}
  else if(name==='kiblast'){await kiblastAb(ak,dk)}
  else if(name==='icecrystal'){await iceAb(ak,dk)}
  else if(name==='fireball'){await fireballAb(ak,dk)}
  else if(name==='sevpara'){await sevAb(ak,dk)}
  else if(name==='ino'){await inoAb(ak,dk)}
  else if(name==='rimulord'||name==='truelord'){await holyWoundAb(ak,dk)}
  else if(name==='wheel'){if(opt.force)await wheelAb(ak)}
  else if(name==='pflame'){await pflameAb(ak,dk)}
  else if(name==='turbo'){if(!a.turbo){a.turbo=true;log('⚡ '+nm(ak)+' ติดสัญลักษณ์เทอร์โบ! การโจมตีครั้งถัดไปดาเมจเพิ่ม '+Math.round(C.ot*100)+'% ของ POWER ปัจจุบัน',ak)}render()}
  else if(name==='heal'&&(opt.force||a.t%C.ki===0))heal(ak,C.kh);
}
async function fingerAct(f,ak,dk){
  const a=S[ak],d=S[dk];
  if(f===0){heal(ak,C.nh)}
  else if(f===1){
    const ea=CARDS[d.id].ability;
    if(ea==='nen'){const f2=[0,2,3,4][Math.floor(RR()*4)];log('นิ้วชี้: ขโมยความสามารถสุ่มนิ้วของศัตรู ได้ '+FN[f2],ak,handSvg(f2,18));chainFx(ak,dk);await sl(500);await fingerAct(f2,ak,dk)}
    else{log('นิ้วชี้: ขโมยความสามารถ "'+AN[ea]+'" ของ '+nm(dk)+' มาใช้',ak,handSvg(1,18));chainFx(ak,dk);await sl(500);await applyAb(ea,ak,dk,{force:true})}
  }
  else if(f===2){d.sealed=true;chainFx(ak,dk);log('นิ้วกลาง: ผนึกความสามารถของ '+nm(dk)+' ในเทิร์นถัดไป',ak,handSvg(2,18));render()}
  else if(f===3){const had=a.para||a.sealed||a.lightning||a.miss||a.burn>0||a.sev>0||a.poss||a.bleed||a.hb>0||a.ps>0||a.hw>0||a.frz||a.ice>0||a.cx>0;a.para=false;a.sealed=false;a.lightning=false;a.miss=false;a.burn=0;a.sev=0;a.poss=false;a.bleed=false;a.hb=a.ps=0;a.hw=0;a.hwDmg=0;a.frz=false;a.ice=0;a.iceDmg=0;a.cx=0;healFx(ak);log('นิ้วนาง: ลบสถานะด้านลบของ '+nm(ak)+(had?'':' (ไม่มีสถานะด้านลบ)'),ak,handSvg(3,18));render()}
  else if(f===4){
    chainFx(ak,dk);await sl(450);const dmg=await hit(ak,dk,C.rm);
    log('นิ้วก้อย: โจมตีซ้ำ '+dmg+' ดาเมจ ('+C.rm+' เท่า'+(S.lb?' รวมสายฟ้า +'+S.lb:'')+') เหลือ HP '+Math.max(0,Math.ceil(d.hp)),ak,handSvg(4,18));
  }
}

/* ---------- มโหรากา: ธรรมจักรแปดซี่ — ทุกเทิร์นกงล้อหมุน 1 ครั้ง สุ่มเสริมพลังให้ตนเอง 1 อย่าง ---------- */
async function wheelAb(k){
  const a=S[k],cw=$('#f'+k+' .cw');a.resist=false;
  const pick=Math.floor(RR()*3);
  floatTxt(cw,'☸ กงล้อหมุน','sm');await sl(350);
  if(pick===0){
    a.p=Math.round((a.p+C.wp)*10)/10;
    log('☸ กงล้อหมุน! '+nm(k)+' เพิ่ม POWER +'+C.wp+' (เป็น '+a.p+')',k);
    floatTxt(cw,'+'+C.wp+' POWER','heal');cw.classList.remove('gold');void cw.offsetWidth;cw.classList.add('gold');setTimeout(()=>cw.classList.remove('gold'),1400);
  }else if(pick===1){
    const lost=Math.max(0,a.max-a.hp),h=(a.noHeal||a.hw>0)?0:Math.min(lost,Math.round(lost*C.wr));
    if(h>0){a.hp+=h;healFx(k);floatTxt(cw,'+'+h,'heal');log('☸ กงล้อหมุน! '+nm(k)+' ฟื้นฟู HP +'+h+' (เหลือ HP '+Math.ceil(a.hp)+')',k)}
    else log('☸ กงล้อหมุน! '+nm(k)+' ได้ฟื้นฟู HP แต่ไม่มี HP ที่เสียไปให้ฟื้น',k);
  }else{
    a.resist=true;
    log('☸ กงล้อหมุน! '+nm(k)+' ต้านทานสถานะด้านลบทุกชนิดจนถึงเทิร์นถัดไปของตน',k);
    gmaxPurify(k);
  }
  render();await sl(450);
}
/* ---------- เมงุมิ: ทศฉายา (Ten Shadows Technique) เรียกชิกิกามิเงาสุ่ม 1 ใน 5 ---------- */
const SHIKI=[{k:'dog',e:'🐕',n:'สุนัข',en:'Divine Dogs'},{k:'owl',e:'🦉',n:'นกฮูก',en:'Nue'},{k:'toad',e:'🐸',n:'กบ',en:'Toad'},{k:'ele',e:'🐘',n:'คชสาร',en:'Max Elephant'},{k:'rabbit',e:'🐇',n:'กระต่าย',en:'Rabbit Escape'}];
function shadowPool(r){
  const cx=r.left+r.width/2,cy=r.bottom-r.height*.1;
  const p=fxEl('shpool',cx,cy,r.width*1.2,r.height*.18);
  p.animate([{transform:'scale(0)',opacity:0},{transform:'scale(1)',opacity:1,offset:.3},{transform:'scale(1)',opacity:1,offset:.85},{transform:'scale(.2)',opacity:0}],{duration:1900/speed});setTimeout(()=>p.remove(),1900/speed);
  for(let i=0;i<3;i++){const g=fxEl('shring',cx,cy,r.width*1.2,r.height*.18);g.animate([{transform:'scale(.3)',opacity:.9},{transform:'scale(1.5)',opacity:0}],{duration:1100/speed,delay:i*300/speed,fill:'both'});setTimeout(()=>g.remove(),1700/speed)}
}
function rise(emoji,x,y,size,cls='',flip=false){
  const b=fxEl('beast '+cls,x,y,size,size,`<span style="font-size:${size*.8}px;${flip?'transform:scaleX(-1)':''}">${emoji}</span>`);
  b.animate([{transform:'translateY(50px) scale(.2)',opacity:0},{transform:'translateY(0) scale(1)',opacity:1}],{duration:500/speed,fill:'forwards',easing:'ease-out'});return b;
}
const flyTo=(b,dx,dy,ms)=>b.animate([{transform:'translate(0,0)'},{transform:`translate(${dx}px,${dy}px)`}],{duration:ms/speed,easing:'cubic-bezier(.5,0,1,.7)',fill:'forwards'}).finished.catch(()=>{});
const sinkB=b=>{b.animate([{opacity:1},{opacity:0,transform:'translateY(30px) scale(.4)'}],{duration:400/speed,fill:'forwards'});setTimeout(()=>b.remove(),400/speed)};
function shImpact(x,y,s=110){const e=fxEl('shspark',x,y,s,s);setTimeout(()=>e.remove(),500)}
function dealSummon(ak,dk,dmg,label){
  const D=S[dk],dw=$('#f'+dk+' .cw');if(dodges(dk)){floatTxt(dw,'หลบ!','miss');log('💨 '+nm(dk)+' หลบ'+label+'ได้!',dk);return}D.hp-=dmg;floatTxt(dw,'-'+dmg,'sm');dw.classList.remove('hit');void dw.offsetWidth;dw.classList.add('hit');render();
  log(label+' '+dmg+' ดาเมจ (เหลือ HP '+Math.max(0,Math.ceil(D.hp))+')',ak);
}
async function shiki(ak,dk){
  const A=S[ak],D=S[dk],aw=$('#f'+ak+' .cw'),dw=$('#f'+dk+' .cw'),ar=aw.getBoundingClientRect(),dr=dw.getBoundingClientRect();
  const k=(window.__sk&&SHIKI.find(x=>x.k===window.__sk))||SHIKI[Math.floor(RR()*SHIKI.length)];   // 5 ตัว ตัวละ 20%
  const sx=ar.left+ar.width/2,sy=ar.bottom-ar.height*.28,tx=dr.left+dr.width/2,ty=dr.top+dr.height*.55,right=tx>sx;
  aw.classList.add('shadowcast');setTimeout(()=>aw.classList.remove('shadowcast'),1700/speed);
  const bn=fxEl('banner shb',sx,Math.max(34,ar.top+ar.height*.1),340,54,`<small>十種影法術 · Ten Shadows</small>${k.n} (${k.en})`);setTimeout(()=>bn.remove(),1500/speed);
  shadowPool(ar);log('🐺 ทศฉายา: '+nm(ak)+' เรียกชิกิกามิ "'+k.n+'" ('+k.en+')',ak);await sl(450);
  if(k.k==='dog'){
    const b1=rise('🐕',sx-30,sy,100,'',right),b2=rise('🐕',sx+30,sy,100,'white',right);await sl(520);
    await Promise.all([flyTo(b1,tx-sx+30,ty-sy-20,380),flyTo(b2,tx-sx-30,ty-sy+20,380)]);
    shImpact(tx,ty);sinkB(b1);sinkB(b2);dealSummon(ak,dk,Math.round(A.p*C.sd),'สุนัขเงากระโจนกัด');
  }else if(k.k==='owl'){
    const b=rise('🦉',sx,sy,110);await sl(520);
    await flyTo(b,(tx-sx)*.8,ty-sy-140,420);boltFx(ak,dk);shImpact(tx,ty,140);await sl(350);sinkB(b);
    if(D.hp>0&&!D.para&&RR()<C.sn){D.para=true;log('⚡ นู (นกฮูก) ปล่อยสายฟ้า! '+nm(dk)+' ถูกทำให้ชา',ak);render()}else log('นู (นกฮูก) ปล่อยสายฟ้า แต่ศัตรูไม่ชา',ak);
  }else if(k.k==='toad'){
    const b=rise('🐸',sx,sy,100);await sl(520);
    const len=Math.hypot(tx-sx,ty-sy),deg=Math.atan2(ty-sy,tx-sx)*180/Math.PI;
    const t=document.createElement('div');t.className='tongue';t.style.cssText=`left:${sx}px;top:${sy-7}px;width:${len}px;transform:rotate(${deg}deg)`;$('#fx').appendChild(t);
    t.animate([{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0 0 0)',offset:.3},{clipPath:'inset(0 0 0 0)',offset:.8},{clipPath:'inset(0 0 0 100%)'}],{duration:1100/speed});setTimeout(()=>t.remove(),1100/speed);
    await sl(300);dw.classList.add('wrapped');log('🐸 โทดพันตัว '+nm(dk)+' ด้วยลิ้น! เมงุมิโจมตีได้อีกครั้ง',ak);await sl(800);sinkB(b);
    if(D.hp>0){const x=await hit(ak,dk);log(nm(ak)+' โจมตีซ้ำ '+x+' (เหลือ HP '+Math.max(0,Math.ceil(D.hp))+')',ak)}
    dw.classList.remove('wrapped');
  }else if(k.k==='ele'){
    const b=rise('🐘',sx,sy,190,'',right);await sl(560);
    await flyTo(b,tx-sx,ty-sy-30,420);shImpact(tx,ty,240);dw.classList.add('hit');setTimeout(()=>dw.classList.remove('hit'),400);
    dealSummon(ak,dk,Math.round(A.p*C.se),'แม็กซ์ เอเลแฟนต์ทุ่มทับ');await sl(300);sinkB(b);
  }else{
    const bs=[];for(let i=0;i<9;i++){bs.push(rise('🐇',sx+rnd(-60,60),sy+rnd(-20,20),60))}
    await sl(520);
    await Promise.all(bs.map((b,i)=>{const dx=tx-sx+rnd(-dr.width*.4,dr.width*.4),dy=ty-sy+rnd(-dr.height*.35,dr.height*.35);
      return b.animate([{transform:'translate(0,0)'},{transform:`translate(${dx/2}px,${dy/2-60}px)`,offset:.5},{transform:`translate(${dx}px,${dy}px)`}],{duration:(600+i*60)/speed,fill:'forwards',easing:'ease-in-out'}).finished.catch(()=>{})}));
    await sl(500);bs.forEach(sinkB);
    if(D.hp>0&&RR()<C.sr){D.miss=true;render();log('🐇 กระต่ายรุมขัดขวาง! การโจมตีครั้งหน้าของ '+nm(dk)+' จะไม่โดน',ak)}else log('🐇 กระต่ายขัดขวางไม่สำเร็จ',ak);
  }
  await sl(300);
}

/* ---------- ฮูเต๋า: ผีเมาช่วยโจมตี (สุ่ม 2 รูปแบบ: เผาไหม้ / ผีตัวเล็กโจมตี 2 ครั้ง) ---------- */
async function ghostAb(ak,dk){
  const A=S[ak],D=S[dk],aw=$('#f'+ak+' .cw'),dw=$('#f'+dk+' .cw'),ar=aw.getBoundingClientRect(),dr=dw.getBoundingClientRect();
  const sx=ar.left+ar.width/2,sy=ar.top+ar.height*.4,tx=dr.left+dr.width/2,ty=dr.top+dr.height*.5,mode=RR()<.5?0:1;
  const bn=fxEl('banner',sx,Math.max(34,ar.top+ar.height*.1),300,54,'<small>往生堂</small>ผีเมาช่วยโจมตี');setTimeout(()=>bn.remove(),1500/speed);
  log('👻 '+nm(ak)+' เรียกผีเมาช่วยโจมตี! ('+(mode===0?'เผาไหม้':'ผีตัวเล็กโจมตี 2 ครั้ง')+')',ak);
  const fly=async(dx=0)=>{const g=fxEl('ghfx',sx,sy,90,90,'<span style="font-size:70px">👻</span>');
    g.animate([{transform:'scale(.2)',opacity:0},{transform:'scale(1)',opacity:1,offset:.25},{transform:'scale(1)',opacity:1,offset:.4}],{duration:400/speed,fill:'forwards'});await sl(400);
    await flyTo(g,tx-sx+dx,ty-sy,340);g.remove()};
  if(mode===0){
    await fly();
    const sp=fxEl('spark',tx,ty,160,160);setTimeout(()=>sp.remove(),500);dw.classList.remove('burnfx');void dw.offsetWidth;dw.classList.add('burnfx');
    if(CARDS[D.id].ability==='pflame'){log('🛡 '+nm(dk)+' ไม่ติดสถานะเผาไหม้',ak)}else{
    D.burnTx=null;D.burn=C.bt;D.burnDmg=Math.max(D.burnDmg||0,Math.round(Math.min(D.max,statAt(D.id,D.lv,D.star).hp)*C.bd));render();   /* เผา % ของ HP สูงสุดศัตรู (บอส HP มหาศาลคิดจาก HP ปกติของการ์ดบอส) */
    log('🔥 '+nm(dk)+' ติดสถานะเผาไหม้ ('+C.bt+' เทิร์น เสีย HP '+D.burnDmg+' ต่อเทิร์น = '+Math.round(C.bd*100)+'% ของ HP สูงสุด)',ak);await sl(400);
    }
  }else{
    for(let i=0;i<2&&D.hp>0;i++){
      await fly(i?30:-30);
      const sp=fxEl('spark',tx,ty,110,110);setTimeout(()=>sp.remove(),500);
      dealSummon(ak,dk,Math.round(A.p*C.gh),'ผีตัวเล็กโจมตีครั้งที่ '+(i+1));await sl(250);
    }
  }
}
/* ---------- ลูฟี่ ไนท์แมร์: เข้าสิง (ศัตรูมีโอกาสโจมตีตัวเองในเทิร์นถัดไป) ---------- */
async function possessAb(ak,dk){
  const D=S[dk],aw=$('#f'+ak+' .cw'),dw=$('#f'+dk+' .cw'),ar=aw.getBoundingClientRect(),dr=dw.getBoundingClientRect();
  const sx=ar.left+ar.width/2,sy=ar.top+ar.height*.4,tx=dr.left+dr.width/2,ty=dr.top+dr.height*.5;
  const bn=fxEl('banner shb',sx,Math.max(34,ar.top+ar.height*.1),300,54,'<small>NIGHTMARE</small>เข้าสิง');setTimeout(()=>bn.remove(),1500/speed);
  const g=fxEl('ghfx',sx,sy,90,90,'<span style="font-size:70px">👻</span>');
  g.animate([{transform:'scale(.2)',opacity:0},{transform:'scale(1)',opacity:1,offset:.25},{transform:'scale(1)',opacity:1,offset:.4}],{duration:400/speed,fill:'forwards'});await sl(400);
  await flyTo(g,tx-sx,ty-sy,340);g.remove();
  dw.classList.remove('possfx');void dw.offsetWidth;dw.classList.add('possfx');
  D.poss=true;render();log('👻 '+nm(dk)+' ติดสถานะเข้าสิง! มีโอกาส '+Math.round(C.pc*100)+'% โจมตีตัวเองในเทิร์นหน้า',ak);await sl(400);
}
/* ---------- จอมมาร ริมุรุ เทมเพสต์: โจมตีแล้วมอบ "บาดแผลศักดิ์สิทธิ์" (ฟื้นฟู HP ไม่ได้ + เสีย C.hwd ของ HP สูงสุดศัตรูต่อเทิร์น นาน C.hwn เทิร์น) ---------- */
async function holyWoundAb(ak,dk){
  const D=S[dk],dw=$('#f'+dk+' .cw');if(!D||D.hp<=0)return;
  const dmg=Math.max(1,Math.round(Math.min(D.max,statAt(D.id,D.lv,D.star).hp)*C.hwd));   /* บอส HP มหาศาลคิดจาก HP ปกติของการ์ดบอส */
  D.hw=C.hwn;D.hwDmg=Math.max(D.hwDmg||0,dmg);
  const r=dw.getBoundingClientRect(),x=fxEl('spark',r.left+r.width/2,r.top+r.height*.45,170,170);x.style.filter='hue-rotate(40deg) brightness(1.4)';setTimeout(()=>x.remove(),550);
  render();   /* ผู้ที่ล้างสถานะได้ (โอคารุน/ริมุรุ/ซีซี) จะลบทิ้งทันทีใน render */
  if(D.hw>0)log('✝ '+nm(dk)+' ติดบาดแผลศักดิ์สิทธิ์! ฟื้นฟู HP ไม่ได้ และเสีย HP '+D.hwDmg+' ต่อเทิร์น ('+Math.round(C.hwd*100)+'% ของ HP สูงสุด) นาน '+C.hwn+' เทิร์น',ak);
  await sl(350);
}
/* ---------- ยามานากะ อิโนะ: ทุกๆ C.ni เทิร์น ย้ายร่างศัตรู → ศัตรูโจมตีตัวเองด้วย C.nx เท่าของ POWER ปัจจุบันของตัวมันเอง ---------- */
async function inoAb(ak,dk){
  const A=S[ak];if(A.t%C.ni!==0)return;
  const D=S[dk],dw=$('#f'+dk+' .cw'),aw=$('#f'+ak+' .cw'),sd=Math.max(1,Math.round(D.p*C.nx));
  log('🌀 '+nm(ak)+' ใช้คาถาย้ายร่าง! ควบคุม '+nm(dk)+' ให้โจมตีตัวเอง',ak);
  const ra=aw.getBoundingClientRect(),rd=dw.getBoundingClientRect();
  const g=fxEl('spark',ra.left+ra.width/2,ra.top+ra.height*.4,120,120);g.style.filter='hue-rotate(250deg)';
  await flyTo(g,rd.left+rd.width/2-(ra.left+ra.width/2),rd.top+rd.height*.4-(ra.top+ra.height*.4),360);g.remove();
  D.hp-=sd;floatTxt(dw,'-'+sd,'crit');dw.classList.remove('hit');void dw.offsetWidth;dw.classList.add('hit');render();
  log('🌀 '+nm(dk)+' โจมตีตัวเอง '+sd+' ('+C.nx+'× POWER '+D.p+') (เหลือ HP '+Math.max(0,Math.ceil(D.hp))+')',ak);await sl(500);
}
/* ---------- เก็กโค ฮายาเตะ: โจมตีแล้วสร้างสถานะ เลือดไหล + ติดพิษ (เสีย HP C.gk ของ POWER ปัจจุบัน ต่อสถานะ ต่อเทิร์น) ---------- */
/* ซาสึเกะ (อักขระคำสาป): ชาขั้นรุนแรง — ต้นเทิร์นศัตรู: ช็อตไฟฟ้า % ของ HP สูงสุด + โอกาสโจมตีไม่ได้ */
async function sevAb(ak,dk){
  const D=S[dk],aw=$('#f'+ak+' .cw'),dw=$('#f'+dk+' .cw'),ar=aw.getBoundingClientRect();
  const bn=fxEl('banner shb',ar.left+ar.width/2,Math.max(34,ar.top+ar.height*.1),320,54,'<small>呪印 · CURSE MARK</small>ชาขั้นรุนแรง');setTimeout(()=>bn.remove(),1500/speed);
  boltFx(ak,dk);
  const had=D.sev>0;D.sev=Math.max(D.sev,C.st);render();
  if(!had)log('⚡ '+nm(dk)+' ติดสถานะชาขั้นรุนแรง! ('+C.st+' เทิร์น · ช็อต '+Math.round(C.sv*100)+'% ของ HP สูงสุด · โอกาส '+Math.round(C.sc*100)+'% โจมตีไม่ได้)',ak);
  else log('⚡ ต่ออายุสถานะชาขั้นรุนแรงของ '+nm(dk)+' ('+C.st+' เทิร์น)',ak);
  await sl(450);
}
/* ซาสึเกะ (ร่างเด็ก): คาถาเพลิง — ลูกไฟดาเมจ % ของ POWER + เผาไหม้ % ของ HP สูงสุดศัตรู */
async function pflameAb(ak,dk){
  const D=S[dk],dw=$('#f'+dk+' .cw');if(D.hp<=0)return;
  dw.classList.remove('burnfx');void dw.offsetWidth;dw.classList.add('burnfx');
  D.burnTx='ไฟบริสุทธิ์';D.burn=Math.max(D.burn,C.kyt);D.burnDmg=Math.max(D.burnDmg||0,Math.round((D.base||D.max)*C.kyd));render();
  log('🔥 '+nm(dk)+' ติดสถานะไฟบริสุทธิ์ ('+C.kyt+' เทิร์น เสีย HP '+D.burnDmg+' ต่อเทิร์น = '+Math.round(C.kyd*100)+'% ของ HP สูงสุด)',ak);await sl(350);
}
async function fireballAb(ak,dk){
  const A=S[ak],D=S[dk],aw=$('#f'+ak+' .cw'),dw=$('#f'+dk+' .cw'),ar=aw.getBoundingClientRect(),dr=dw.getBoundingClientRect();
  const sx=ar.left+ar.width/2,sy=ar.top+ar.height*.45,tx=dr.left+dr.width/2,ty=dr.top+dr.height*.5;
  const bn=fxEl('banner shb',sx,Math.max(34,ar.top+ar.height*.1),300,54,'<small>火遁</small>คาถาเพลิง');setTimeout(()=>bn.remove(),1500/speed);
  const g=fxEl('ghfx',sx,sy,90,90,'<span style="font-size:70px;filter:none">🔥</span>');
  g.animate([{transform:'scale(.2)',opacity:0},{transform:'scale(1)',opacity:1,offset:.3}],{duration:350/speed,fill:'forwards'});await sl(350);
  await flyTo(g,tx-sx,ty-sy,360);g.remove();
  const sp=fxEl('spark',tx,ty,170,170);setTimeout(()=>sp.remove(),500);
  const dmg=Math.round(A.p*C.kf);
  if(dodges(dk)){floatTxt(dw,'หลบ!','miss');log('💨 '+nm(dk)+' หลบคาถาเพลิงได้!',dk);return}
  dealSummon(ak,dk,dmg,'🔥 คาถาเพลิง');
  if(D.hp<=0)return;
  dw.classList.remove('burnfx');void dw.offsetWidth;dw.classList.add('burnfx');
  if(CARDS[D.id].ability==='pflame'){log('🛡 '+nm(dk)+' ไม่ติดสถานะเผาไหม้',ak);return}
  D.burnTx=null;D.burn=Math.max(D.burn,C.kt);D.burnDmg=Math.max(D.burnDmg||0,Math.round((D.base||D.max)*C.kb));render();
  log('🔥 '+nm(dk)+' ติดสถานะเผาไหม้ ('+C.kt+' เทิร์น เสีย HP '+D.burnDmg+' ต่อเทิร์น = '+Math.round(C.kb*100)+'% ของ HP สูงสุด)',ak);await sl(350);
}
async function gekkoAb(ak,dk){
  const A=S[ak],D=S[dk],dw=$('#f'+dk+' .cw'),dmg=Math.max(1,Math.round(A.p*C.gk));
  const changed=!(D.hb>0)||!(D.ps>0)||dmg>D.hb||dmg>D.ps;
  D.hb=Math.max(D.hb||0,dmg);D.ps=Math.max(D.ps||0,dmg);
  if(!changed)return;
  const r=dw.getBoundingClientRect(),x=fxEl('bfx',r.left+r.width/2,r.top+r.height*.5,200,200);setTimeout(()=>x.remove(),550);
  dw.classList.remove('bleedfx');void dw.offsetWidth;dw.classList.add('bleedfx');render();
  log('🩸☠ '+nm(dk)+' ติดสถานะเลือดไหล และติดพิษ! เสีย HP '+dmg+' ต่อสถานะ ต่อเทิร์น ('+Math.round(C.gk*100)+'% ของ POWER)',ak);await sl(350);
}
/* ---------- อลูคาร์ด: โจมตี 2 ครั้ง + เลือดไหล ---------- */
async function alucardAb(ak,dk){
  const D=S[dk],dw=$('#f'+dk+' .cw');
  if(!D.bleed){
    D.bleed=true;const r=dw.getBoundingClientRect(),x=fxEl('bfx',r.left+r.width/2,r.top+r.height*.5,200,200);setTimeout(()=>x.remove(),550);
    dw.classList.remove('bleedfx');void dw.offsetWidth;dw.classList.add('bleedfx');render();
    log('🩸 '+nm(dk)+' ติดสถานะเลือดไหล! เสีย HP '+Math.round(C.ab*100)+'% ของ HP สูงสุดทุกเทิร์น ('+Math.round(D.max*C.ab)+')',ak);await sl(350);
  }
  if(D.hp>0){
    log('⚔ '+nm(ak)+' โจมตีครั้งที่ 2!',ak);
    const x=await hit(ak,dk);
    log('เทิร์น '+S.n+' · '+nm(ak)+' โจมตีซ้ำ '+x+(S.lb?' (รวมสายฟ้า +'+S.lb+')':'')+' (เหลือ HP '+Math.max(0,Math.ceil(D.hp))+')',ak);
  }
}
/* ---------- ไอแซ็ค ฟรอสเตอร์: สุ่มโจมตี ปกติ / เฉียดจุดตาย / จุดตาย ---------- */
async function scytheFx(ak,dk,mode){
  const r=$('#f'+ak+' .cw').getBoundingClientRect();
  const bn=fxEl('banner shb',r.left+r.width/2,Math.max(34,r.top+r.height*.1),320,54,mode===2?'<small>DEATH POINT</small>โจมตีจุดตาย!':'<small>NEAR DEATH</small>โจมตีเฉียดจุดตาย');
  setTimeout(()=>bn.remove(),1500/speed);
  log(mode===2?'💀 '+nm(ak)+' เล็งจุดตาย!':'🗡 '+nm(ak)+' โจมตีเฉียดจุดตาย! (ดาเมจ ×'+C.xm+')',ak);await sl(700);
}
async function deathStrike(ak,dk){
  const aw=$('#f'+ak+' .cw'),dw=$('#f'+dk+' .cw'),d=S[dk];
  aw.classList.add('lunge'+ak);await sl(260);
  if(dodges(dk)){S.lb=0;S.up=false;floatTxt(dw,'หลบ!','miss');log('💨 '+nm(dk)+' หลบการโจมตีได้!',dk);aw.classList.remove('lungea','lungeb');render();return 0}
  const dmg=Math.max(0,Math.ceil(d.hp));d.hp=0;S.lb=0;S.up=false;
  const r=dw.getBoundingClientRect(),x=fxEl('bfx',r.left+r.width/2,r.top+r.height*.5,260,260);setTimeout(()=>x.remove(),550);
  floatTxt(dw,'DEATH','crit');dw.classList.remove('deathfx');void dw.offsetWidth;dw.classList.add('deathfx');
  aw.classList.remove('lungea','lungeb');render();return dmg;
}
/* ---------- คิราระ: กลุ่มดาวกางเขนใต้ (อุปสรรคพุ่งใส่ตามจำนวนแสตก) ---------- */
async function cruxAb(ak,dk){
  const A=S[ak],D=S[dk],dw=$('#f'+dk+' .cw');if(D.hp<=0)return;
  D.cx=Math.min(C.krn,(D.cx||0)+1);render();
  const r0=dw.getBoundingClientRect(),bn=fxEl('banner shb',r0.left+r0.width/2,Math.max(34,r0.top+r0.height*.1),300,54,'<small>SOUTHERN CROSS</small>กลุ่มดาวกางเขนใต้ ×'+D.cx);
  setTimeout(()=>bn.remove(),1500/speed);
  log('✦ '+nm(dk)+' ติดสถานะ \"กลุ่มดาวกางเขนใต้\" '+D.cx+'/'+C.krn+' แสตก → เรียกอุปสรรค '+D.cx+' ชิ้น',ak);await sl(500);
  const T=[['🚗','รถยนต์',C.krc],['🪨','ก้อนหิน',C.krr],['🗡️','ของมีคม',C.krk]];let total=0;
  for(let i=0,n=D.cx;i<n;i++){
    if(D.hp<=0)break;
    const ty=Math.floor(RR()*3),[emo,nmz,pc]=T[ty],r=dw.getBoundingClientRect();
    const sx=r.left+r.width*(i%2?1.35:-.35),sy=r.top+r.height*rnd(.15,.65),tx=r.left+r.width*rnd(.3,.7),tyy=r.top+r.height*rnd(.3,.7);
    const o=fxEl('ghfx',sx,sy,64,64,emo);o.style.fontSize='52px';
    await sleepAnim(o.animate([{transform:'translate(0,0) scale(.5) rotate(0)',opacity:0},{opacity:1,offset:.15},{transform:`translate(${tx-sx}px,${tyy-sy}px) scale(1) rotate(300deg)`,opacity:1}],{duration:340/speed,easing:'ease-in',fill:'forwards'}));
    o.remove();const sp=fxEl('spark',tx,tyy,90,90);setTimeout(()=>sp.remove(),500);
    if(dodges(dk)){floatTxt(dw,'หลบ!','miss',rnd(25,75));log('💨 '+nm(dk)+' หลบ'+nmz+'ได้!',dk);await sl(180);continue}
    const dmg=Math.max(1,Math.round(A.p*pc));D.hp-=dmg;total+=dmg;floatTxt(dw,'-'+dmg,'sm',rnd(25,75));
    dw.classList.remove('hit');void dw.offsetWidth;dw.classList.add('hit');render();
    let extra='';
    if(ty===1&&D.hp>0&&!D.para&&RR()<C.krs){D.para=true;extra=' · ติดสถานะมึนงง!';floatTxt(dw,'มึนงง','sm')}
    if(ty===2&&D.hp>0){const bd=Math.max(1,Math.round((D.base||D.max)*C.krb));D.hp-=bd;total+=bd;extra=' · เลือดไหล -'+bd;dw.classList.remove('bleedfx');void dw.offsetWidth;dw.classList.add('bleedfx');floatTxt(dw,'-'+bd,'crit',rnd(25,75));render()}
    log(emo+' '+nmz+'พุ่งใส่ '+nm(dk)+' -'+dmg+extra,ak);await sl(260);
  }
  log('อุปสรรคทั้งหมดสร้างความเสียหายรวม '+total+' (เหลือ HP '+Math.max(0,Math.ceil(D.hp))+')',ak);
}
/* ---------- กาโร่: โจมตี 2 ครั้ง (หลบ 40% อยู่ใน dodges) ---------- */
async function garoAb(ak,dk,extra=1){   /* โจมตีเพิ่มอีก extra ครั้งหลังโจมตีปกติ (กาโร่ = 2 ครั้งรวม · ลูกครึ่งสัตว์ประหลาด = 3 ครั้งรวม) */
  const D=S[dk];
  for(let i=0;i<extra;i++){
    if(D.hp<=0)return;
    log('⚔ '+nm(ak)+' โจมตีครั้งที่ '+(i+2)+'!',ak);
    const x=await hit(ak,dk);
    log('เทิร์น '+S.n+' · '+nm(ak)+' โจมตีซ้ำ '+x+(S.lb?' (รวมสายฟ้า +'+S.lb+')':'')+' (เหลือ HP '+Math.max(0,Math.ceil(D.hp))+')',ak);
  }
}
/* ---------- สัตว์ประหลาดที่สมบูรณ์แบบ กาโร่: เพิ่มสเตตัส (POWER / HP สูงสุด) C.pfb ทุกๆ C.pft เทิร์น (บอสเควสที่ไม่ฟื้นฟู HP จะเพิ่มเฉพาะ POWER) ---------- */
function garomonBoost(k){
  const a=S[k];if(!a||a.hp<=0)return;
  const pa=Math.round(a.p*C.pfb*10)/10,ha=a.noHeal?0:Math.round(a.max*C.pfb);
  a.p=Math.round((a.p+pa)*10)/10;a.p0=Math.max(a.p0||0,a.p);if(ha>0){a.max+=ha;a.hp+=ha}
  const cw=$('#f'+k+' .cw');floatTxt(cw,'สเตตัส +'+Math.round(C.pfb*100)+'%','heal');cw.classList.remove('gold');void cw.offsetWidth;cw.classList.add('gold');setTimeout(()=>cw.classList.remove('gold'),1000);
  log('🔺 '+nm(k)+' เพิ่มสเตตัส +'+Math.round(C.pfb*100)+'% (POWER +'+pa+(ha>0?' · HP +'+ha:'')+') เป็น POWER '+a.p+(ha>0?' · HP '+Math.ceil(a.hp)+'/'+a.max:''),k);render();
}
/* ---------- ไม ชิรานุอิ: โหมดไฟ (HP > 40%) ติดเผาไหม้ · โหมดระเบิด (HP ≤ 40%) ทำใน doTurn ---------- */
async function maiAb(ak,dk){
  const A=S[ak],D=S[dk],dw=$('#f'+dk+' .cw');
  if(!A||!D||D.hp<=0||A.hp<=A.max*C.mih||!S.maiHit)return;
  dw.classList.remove('burnfx');void dw.offsetWidth;dw.classList.add('burnfx');
  if(CARDS[D.id].ability==='pflame'){log('🛡 '+nm(dk)+' ไม่ติดสถานะเผาไหม้',ak);return}
  D.burnTx=null;D.burn=Math.max(D.burn,C.mit);D.burnDmg=Math.max(D.burnDmg||0,Math.round((D.base||D.max)*C.mib));render();
  log('🔥 โหมดไฟ! '+nm(dk)+' ติดสถานะเผาไหม้ ('+C.mit+' เทิร์น เสีย HP '+D.burnDmg+' ต่อเทิร์น = '+Math.round(C.mib*100)+'% ของ HP สูงสุด)',ak);await sl(350);
}
/* ---------- คาเนกิ: ดูดเลือดทุกครั้งที่โจมตีโดน (ฟื้นฟู % ของ HP สูงสุดตัวเอง) · มีโอกาสตีรวมหลายครั้งในเทิร์นเดียว ---------- */
function ghoulDrain(ak){
  const a=S[ak];if(!a||a.hp<=0||a.noHeal||a.hw>0)return;
  const h=Math.min(a.max-a.hp,Math.round(a.max*C.kkd));if(h<=0)return;
  a.hp+=h;floatTxt($('#f'+ak+' .cw'),'+'+h,'heal');log('🩸 '+nm(ak)+' ดูดเลือด +'+h+' (เหลือ HP '+Math.ceil(a.hp)+')',ak);render();
}
async function ghoulAb(ak,dk){
  const D=S[dk];if(D.hp<=0||RR()>=C.kkc)return;
  log('🩸 '+nm(ak)+' คากุเนะพุ่งออกมา! โจมตีรวม '+C.kkn+' ครั้งในเทิร์นนี้',ak);
  for(let i=2;i<=C.kkn&&D.hp>0;i++){
    await sl(300);
    log('⚔ '+nm(ak)+' โจมตีครั้งที่ '+i+'!',ak);
    const x=await hit(ak,dk);
    log('เทิร์น '+S.n+' · '+nm(ak)+' โจมตีครั้งที่ '+i+' '+x+(S.lb?' (รวมสายฟ้า +'+S.lb+')':'')+' (เหลือ HP '+Math.max(0,Math.ceil(D.hp))+')',ak);
    if(x>0)ghoulDrain(ak);
  }
}
/* ---------- เบจิต้า: กระสุนพลัง 2-5 ลูก ---------- */
async function kiblastAb(ak,dk){
  const A=S[ak],D=S[dk],aw=$('#f'+ak+' .cw'),dw=$('#f'+dk+' .cw');if(D.hp<=0)return;
  const lo=Math.min(C.vgn,C.vgx),hi=Math.max(C.vgn,C.vgx),n=lo+Math.floor(RR()*(hi-lo+1)),ar=aw.getBoundingClientRect(),dr=dw.getBoundingClientRect();
  aw.classList.add('gold');setTimeout(()=>aw.classList.remove('gold'),1400);
  const bn=fxEl('banner',ar.left+ar.width/2,Math.max(30,ar.top+ar.height*.12),260,40,'<small>GALICK BARRAGE</small>กระสุนพลัง ×'+n);setTimeout(()=>bn.remove(),1500/speed);
  log('💥 '+nm(ak)+' ปล่อยกระสุนพลัง '+n+' ลูก (ลูกละ '+Math.round(C.vgd*100)+'% ของ POWER ปัจจุบัน)',ak);
  let total=0;const jobs=[];
  for(let i=0;i<n;i++)jobs.push((async()=>{
    await sl(i*200);
    const sx=ar.left+ar.width*rnd(.35,.65),sy=ar.top+ar.height*rnd(.3,.6),tx=dr.left+dr.width*rnd(.3,.7),ty=dr.top+dr.height*rnd(.25,.7);
    const b=fxEl('kiball',sx,sy,40,40);
    await sleepAnim(b.animate([{transform:'translate(0,0) scale(.4)',opacity:0},{opacity:1,offset:.15},{transform:`translate(${tx-sx}px,${ty-sy}px) scale(1)`,opacity:1}],{duration:320/speed,easing:'ease-in',fill:'forwards'}));
    b.remove();const sp=fxEl('spark',tx,ty,90,90);setTimeout(()=>sp.remove(),500);
    if(D.hp<=0)return;
    if(dodges(dk)){floatTxt(dw,'หลบ!','miss',rnd(25,75));return}
    const dmg=Math.max(1,Math.round(A.p*C.vgd));D.hp-=dmg;total+=dmg;floatTxt(dw,'-'+dmg,'sm',rnd(25,75));
    dw.classList.remove('hit');void dw.offsetWidth;dw.classList.add('hit');render();
  })());
  await Promise.all(jobs);await sl(200);
  log('กระสุนพลังสร้างความเสียหายรวม '+total+' (เหลือ HP '+Math.max(0,Math.ceil(D.hp))+')',ak);
}
/* ---------- คุลา: ผลึกน้ำแข็ง (แช่แข็ง 1 เทิร์น + ผลึกตกค้างดาเมจต่อเทิร์น) ---------- */
async function iceAb(ak,dk){
  const A=S[ak],D=S[dk],dw=$('#f'+dk+' .cw');if(D.hp<=0)return;
  if(!(RR()<C.kuc))return;
  const dmg=Math.max(1,Math.round(A.p*C.kud));
  D.frz=true;D.ice=Math.max(D.ice||0,C.kut);D.iceDmg=Math.max(D.iceDmg||0,dmg);
  const r=dw.getBoundingClientRect();
  for(const [dx,dy,sz] of [[0,0,240],[-.25,.2,140],[.25,-.2,140]]){const x=fxEl('icefx',r.left+r.width*(.5+dx),r.top+r.height*(.5+dy),sz,sz,'❄');x.style.fontSize=Math.round(sz*.6)+'px';setTimeout(()=>x.remove(),650)}
  const bn=fxEl('banner',r.left+r.width/2,Math.max(34,r.top+r.height*.1),280,54,'<small>ICE CRYSTAL</small>ผลึกน้ำแข็ง');setTimeout(()=>bn.remove(),1500/speed);
  render();
  log('❄ '+nm(dk)+' ติดสถานะ \"ผลึกน้ำแข็ง\"! ถูกแช่แข็งโจมตีไม่ได้ 1 เทิร์น และมีผลึกตกค้างเสีย HP '+dmg+' ต่อเทิร์น นาน '+C.kut+' เทิร์น ('+Math.round(C.kud*100)+'% ของ POWER)',ak);await sl(500);
}
/* ---------- โคนัน: กระดาษวิเศษ (สุ่ม 2 รูปแบบ) ---------- */
const skipDead=k=>{while(S.idx[k]<S.roster[k].length&&S.roster[k][S.idx[k]].hp<=0)S.idx[k]++};
async function paperAb(ak,dk){
  const A=S[ak],D=S[dk],aw=$('#f'+ak+' .cw'),dw=$('#f'+dk+' .cw');if(D.hp<=0)return;
  const bomb=RR()<.5,ar=aw.getBoundingClientRect();
  const fly=async(tr,emo)=>{const sx=ar.left+ar.width*.5,sy=ar.top+ar.height*.4,tx=tr.left+tr.width*.5,ty=tr.top+tr.height*.5;
    const o=fxEl('ghfx',sx,sy,64,64,emo);o.style.fontSize='48px';
    await sleepAnim(o.animate([{transform:'translate(0,0) scale(.5) rotate(0)',opacity:0},{opacity:1,offset:.15},{transform:`translate(${tx-sx}px,${ty-sy}px) scale(1.1) rotate(540deg)`,opacity:1}],{duration:380/speed,easing:'ease-in',fill:'forwards'}));o.remove()};
  if(!bomb){   /* กระดาษลดความเสียหาย: POWER ศัตรูลดลง 20% ของ POWER สูงสุด จนจบการโจมตีครั้งถัดไป */
    await fly(dw.getBoundingClientRect(),'📜');
    const cur=D.wkr||0,mx=Math.max(D.p0||0,D.p+cur),amt=Math.min(Math.round(mx*C.knr*10)/10,Math.max(0,D.p+cur-1));
    if(amt>cur){D.p=Math.round((D.p-(amt-cur))*10)/10;D.wkr=amt;floatTxt(dw,'POWER -'+amt,'sm');render();
      log('📜 กระดาษลดความเสียหาย! POWER ของ '+nm(dk)+' ลดลง '+amt+' ('+Math.round(C.knr*100)+'% ของ POWER สูงสุด) จนจบการโจมตีครั้งถัดไป (เหลือ '+D.p+')',ak)}
    else log('📜 กระดาษลดความเสียหาย แต่ '+nm(dk)+' ถูกลดอยู่แล้ว',ak);
    await sl(450);return;
  }
  /* กระดาษระเบิด: ใส่การ์ดใบที่สองของฝ่ายตรงข้าม */
  let ti=-1;for(let i=S.idx[dk]+1;i<S.roster[dk].length;i++)if(S.roster[dk][i].hp>0){ti=i;break}
  if(ti<0){log('💥 กระดาษระเบิด แต่ฝ่ายตรงข้ามไม่มีการ์ดใบที่สอง',ak);await sl(300);return}
  const T=S.roster[dk][ti],lu=$('#f'+dk+' .line').children[ti],tr=(lu||dw).getBoundingClientRect();
  await fly(tr,'📜');
  const bx=fxEl('bfx',tr.left+tr.width/2,tr.top+tr.height/2,120,120);setTimeout(()=>bx.remove(),550);
  const dmg=Math.max(1,Math.round(A.p*C.knx));T.hp-=dmg;
  log('💥 กระดาษระเบิด! '+CARDS[T.id].name+' (การ์ดใบที่สอง) ได้รับความเสียหาย '+dmg+' ('+Math.round(C.knx*100)+'% ของ POWER ปัจจุบัน) เหลือ HP '+Math.max(0,Math.ceil(T.hp)),ak);
  if(T.hp<=0){T.hp=0;log('💀 '+CARDS[T.id].name+' ถูกกำจัดด้วยกระดาษระเบิด!','sys');if(T.id==='shuna')shunaFade(dk)}
  render();await sl(550);
}
/* ---------- เล่นเทิร์น ---------- */
/* การ์ดถูกกำจัด: คืน true ถ้าจบเกม */
async function handleKO(dk,ak){
  const dd=S[dk];
  if(dk==='b'&&dd.boss&&S.phase2&&!dd.ph2){   /* บอสเควส 2 เฟส: เฟส 1 ถูกกำจัด → เปลี่ยนเป็นเฟส 2 (HP/POWER ใหม่ ล้างสถานะทั้งหมด) แล้วสู้ต่อ */
    const P=S.phase2,cw=$('#f'+dk+' .cw');dd.ph2=true;cw.classList.add('ko');log('💀 '+nm(dk)+' ถูกกำจัด! ...แต่ยังไม่จบ','sys');render();await sl(900);
    dd.id=P.card;dd.p=dd.p0=P.power;dd.max=dd.hp=P.hp;if(dd.safe)dd.base=P.hp;
    dd.para=dd.sealed=dd.lightning=dd.miss=dd.poss=dd.bleed=dd.turbo=false;dd.burn=0;dd.burnDmg=0;dd.sev=0;dd.hb=dd.ps=0;dd.hw=0;dd.hwDmg=0;dd.frz=false;dd.ice=0;dd.iceDmg=0;dd.cx=0;dd.wkr=0;dd.fg=null;dd.t=0;
    setFighter(dk);render();
    const r=$('#f'+dk+' .cw').getBoundingClientRect(),bn=fxEl('banner shb',r.left+r.width/2,Math.max(34,r.top+r.height*.1),360,54,'<small>PHASE 2</small>'+CARDS[P.card].name);setTimeout(()=>bn.remove(),1800/speed);
    log('🔥 เฟส 2! '+nm(dk)+' ปรากฏตัว (POWER '+dd.p+' · HP '+dd.hp.toLocaleString()+')','sys');
    const cw2=$('#f'+dk+' .cw');floatTxt(cw2,'เฟส 2!','crit');cw2.classList.remove('gold');void cw2.offsetWidth;cw2.classList.add('gold');setTimeout(()=>cw2.classList.remove('gold'),1600);
    await sl(1100);return false;
  }
  if(CARDS[dd.id].ability==='clone'&&!dd.cl&&!dd.safe){   /* นารูโตะ: ถูกกำจัดครั้งแรก → เรียกร่างแยกมาแทน สเตตัสลดลง C.nr */
    const cw=$('#f'+dk+' .cw');cw.classList.add('ko');log('💀 '+nm(dk)+' ถูกกำจัด!','sys');render();await sl(700);
    dd.cl=true;dd.p=Math.max(1,Math.round(dd.p*(1-C.nr)*10)/10);dd.max=Math.max(1,Math.round(dd.max*(1-C.nr)));dd.hp=dd.max;
    dd.para=dd.sealed=dd.lightning=dd.miss=dd.poss=dd.bleed=dd.turbo=false;dd.burn=0;dd.burnDmg=0;dd.sev=0;dd.hb=dd.ps=0;dd.hw=0;dd.hwDmg=0;dd.frz=false;dd.ice=0;dd.iceDmg=0;dd.cx=0;dd.fg=null;dd.t=0;
    setFighter(dk);log('🌀 เรียกร่างแยก! '+nm(dk)+' ลงสนาม (POWER '+dd.p+' · HP '+dd.hp+')','sys');
    const cw2=$('#f'+dk+' .cw');floatTxt(cw2,'ร่างแยก!','heal');cw2.classList.remove('gold');void cw2.offsetWidth;cw2.classList.add('gold');setTimeout(()=>cw2.classList.remove('gold'),1400);
    render();await sl(600);return false;
  }
  $('#f'+dk+' .cw').classList.add('ko');log('💀 '+nm(dk)+' ถูกกำจัด!','sys');
  if(typeof onKillHook==='function'&&!OPT.online&&dk==='b'&&S[ak])onKillHook(S[ak].id);   /* นับการสังหาร (เควสตัวละคร) */
  {const kk=S[ak];
    if(kk&&kk.hp>0&&kk.rmOn&&!kk.rmHeal&&!(kk.hw>0)){kk.rmHeal=true;kk.hp=kk.max;log('😈 '+nm(ak)+' สังหารสำเร็จในโหมดผู้ไร้ความปราณี ฟื้นฟู HP จนเต็ม!',ak);floatTxt($('#f'+ak+' .cw'),'HP เต็ม','heal')}
    if(kk&&kk.slime&&!kk.fixed&&kk.hp>0&&dd.id!==kk.id){   /* ริมุรุ ร่างสไลม์: สังหารได้ → แปลงร่างเป็นการ์ดนั้น คงสเตตัสและความสามารถของการ์ดที่ถูกสังหาร */
      const old0=nm(ak),np=Math.round(Math.max(dd.p0||dd.p,dd.p)*10)/10;
      kk.id=dd.id;kk.p=np;kk.p0=np;kk.max=dd.max;kk.hp=dd.max;kk.lv=dd.lv;kk.star=dd.star;kk.wkr=0;
      setFighter(ak);const cwk=$('#f'+ak+' .cw');
      log('🫧 '+old0+' กลืนกิน '+CARDS[dd.id].name+' และแปลงร่างเป็นการ์ดนั้น! (POWER '+kk.p+' · HP '+kk.hp+')',ak);
      floatTxt(cwk,'แปลงร่าง!','heal');cwk.classList.remove('gold');void cwk.offsetWidth;cwk.classList.add('gold');setTimeout(()=>cwk.classList.remove('gold'),1400)}}
  render();await sl(800);
  const ab0=CARDS[dd.id].ability;let xko=false;
  if(ab0==='shuna')shunaFade(dk);
  const ea=ab0==='gate2'&&RR()<C.gqe;   /* ราชินีกิลกาเมช: ถูกกำจัด → โอกาสใช้ดาบผ่าโลก (Ea) */
  if(ab0==='bomb'||ea){const x=S[ak];if(x&&x.hp>0){   /* เรเซ่: ถูกกำจัด → ระเบิดพร้อมดาเมจ 5 เท่าของ POWER */
    const mul=ea?C.gqm:C.rb,bd=Math.round(dd.p*mul);bombFx(dk,ak);x.hp-=bd;floatTxt($('#f'+ak+' .cw'),'-'+bd,'crit');
    log(ea?'🌀 '+nm(dk)+' ใช้ดาบผ่าโลก Ea! สร้างความเสียหาย '+bd+' ('+mul+' เท่าของ POWER)':'💥 '+nm(dk)+' ระเบิดตัวเอง! สร้างความเสียหาย '+bd+' ('+mul+' เท่าของ POWER)',dk);render();await sl(700);
    if(x.hp<=0){xko=true;$('#f'+ak+' .cw').classList.add('ko');log('💀 '+nm(ak)+' ถูกกำจัด!','sys');render();await sl(600);if(CARDS[x.id].ability==='shuna')shunaFade(ak)}}}
  const finish=async w=>{
    S.over=true;S.winner=w;render();log((OPT.names?OPT.names[w]:(w==='a'?'ฝั่งผู้เล่น':'ฝั่งศัตรู'))+' ชนะ!','sys');await sl(700);
    if(S&&S.over&&OPT.onEnd)OPT.onEnd({...endInfo(),win:w==='a',turns:S.n,left:S.roster.a.filter(x=>x.hp>0).length,bossHp:Math.max(0,S.roster.b[0].hp)});return true};
  S.idx[dk]++;skipDead(dk);let xOut=false;
  if(xko){S.idx[ak]++;skipDead(ak);xOut=S.idx[ak]>=S.roster[ak].length}
  const dOut=S.idx[dk]>=S.roster[dk].length;
  if(dOut||xOut)return finish(xOut?dk:ak);   /* ระเบิดพาไปด้วยทั้งคู่ → ฝั่งเรเซ่ชนะ */
  S[dk]=S.roster[dk][S.idx[dk]];setFighter(dk);
  if(xko)S[ak]=S.roster[ak][S.idx[ak]];
  setFighter(ak);log('▶ '+nm(dk)+' ลงสนาม!','sys');if(xko)log('▶ '+nm(ak)+' ลงสนาม!','sys');return false;
}
async function doTurn(){
  const ak=S.turn,dk=ak==='a'?'b':'a',a=S[ak],d=S[dk],ac=CARDS[a.id];
  if(a.rmOn&&a.rm<=0)rimuruEnd(ak);
  a.t++;
  if(a.burn>0){   /* เผาไหม้: เสีย HP ต้นเทิร์นของการ์ดที่ติดสถานะ */
    const bd=a.burnDmg,cw=$('#f'+ak+' .cw');a.hp-=bd;a.burn--;floatTxt(cw,'-'+bd,'sm');cw.classList.remove('hit');void cw.offsetWidth;cw.classList.add('hit');
    log('🔥 '+nm(ak)+' ถูก'+(a.burnTx||'เผาไหม้')+' -'+bd+' (เหลือ HP '+Math.max(0,Math.ceil(a.hp))+')',dk);render();await sl(450);
    if(a.hp<=0){if(await handleKO(ak,dk))return;S.turn=dk;S.n++;render();return}
  }
  if(a.bleed){   /* เลือดไหล: เสีย HP % ของ HP สูงสุด ต้นเทิร์นของการ์ดที่ติดสถานะ */
    const bd=Math.round((a.base||a.max)*C.ab),cw=$('#f'+ak+' .cw');a.hp-=bd;floatTxt(cw,'-'+bd,'sm');cw.classList.remove('hit');void cw.offsetWidth;cw.classList.add('hit');
    log('🩸 '+nm(ak)+' เลือดไหล -'+bd+' (เหลือ HP '+Math.max(0,Math.ceil(a.hp))+')',dk);render();await sl(450);
    if(a.hp<=0){if(await handleKO(ak,dk))return;S.turn=dk;S.n++;render();return}
  }
  for(const [fld,ic,tx] of [['hb','🩸','เลือดไหล'],['ps','☠','พิษ']]){   /* สถานะของเก็กโค: เสีย HP ต้นเทิร์นของการ์ดที่ติดสถานะ */
    if(a[fld]>0&&a.hp>0){
      const bd=a[fld],cw=$('#f'+ak+' .cw');a.hp-=bd;floatTxt(cw,'-'+bd,'sm');cw.classList.remove('hit');void cw.offsetWidth;cw.classList.add('hit');
      log(ic+' '+nm(ak)+' '+tx+' -'+bd+' (เหลือ HP '+Math.max(0,Math.ceil(a.hp))+')',dk);render();await sl(450);
      if(a.hp<=0){if(await handleKO(ak,dk))return;S.turn=dk;S.n++;render();return}
    }
  }
  if(a.hw>0&&a.hp>0){   /* บาดแผลศักดิ์สิทธิ์ (จอมมาร ริมุรุ): เสีย HP % ของ HP สูงสุด ต้นเทิร์นของการ์ดที่ติดสถานะ */
    const bd=a.hwDmg,cw=$('#f'+ak+' .cw');a.hp-=bd;a.hw--;floatTxt(cw,'-'+bd,'sm');cw.classList.remove('hit');void cw.offsetWidth;cw.classList.add('hit');
    log('✝ '+nm(ak)+' บาดแผลศักดิ์สิทธิ์ -'+bd+' (เหลือ HP '+Math.max(0,Math.ceil(a.hp))+')',dk);render();await sl(450);
    if(a.hp<=0){if(await handleKO(ak,dk))return;S.turn=dk;S.n++;render();return}
  }
  if(a.ice>0&&a.hp>0){   /* ผลึกน้ำแข็งตกค้าง: เสีย HP ต้นเทิร์นของการ์ดที่ติดสถานะ */
    const bd=a.iceDmg,cw=$('#f'+ak+' .cw');a.ice--;if(a.ice<=0)a.iceDmg=0;a.hp-=bd;floatTxt(cw,'-'+bd,'zp');cw.classList.remove('hit');void cw.offsetWidth;cw.classList.add('hit');
    log('❄ '+nm(ak)+' ถูกผลึกน้ำแข็งตกค้างโจมตี -'+bd+' (เหลือ HP '+Math.max(0,Math.ceil(a.hp))+')',dk);render();await sl(450);
    if(a.hp<=0){if(await handleKO(ak,dk))return;S.turn=dk;S.n++;render();return}
  }
  if(a.sev>0&&a.hp>0){   /* ชาขั้นรุนแรง: ถูกไฟฟ้าช็อต + มีโอกาสโจมตีไม่ได้ในเทิร์นนี้ */
    const bd=Math.round((a.base||a.max)*C.sv),cw=$('#f'+ak+' .cw');a.sev--;boltFx(dk,ak);a.hp-=bd;floatTxt(cw,'-'+bd,'zp');cw.classList.remove('hit');void cw.offsetWidth;cw.classList.add('hit');
    log('⚡ '+nm(ak)+' ถูกไฟฟ้าช็อต -'+bd+' (เหลือ HP '+Math.max(0,Math.ceil(a.hp))+')',dk);render();await sl(500);
    if(a.hp<=0){if(await handleKO(ak,dk))return;S.turn=dk;S.n++;render();return}
    if(RR()<C.sc&&!a.para){a.para=true;log('⚡ '+nm(ak)+' ชาขั้นรุนแรง! จะโจมตีไม่ได้ในเทิร์นนี้',dk)}
  }
  const sealed=a.sealed;a.sealed=false;const missed=a.miss;a.miss=false;const poss=a.poss;a.poss=false;
  let finger=(ac.ability==='nen'&&!sealed)?Math.floor(RR()*5):null;   // 5 นิ้ว นิ้วละ 20%
  let skip=false;
  if(a.para){
    if(finger===3){a.para=false;log('เทิร์น '+S.n+' · '+nm(ak)+' ใช้นิ้วนางลบสถานะชา จึงโจมตีได้','sys')}
    else{log('เทิร์น '+S.n+' · '+nm(ak)+' ติดสถานะชา โจมตีไม่ได้','sys');a.para=false;skip=true;finger=null}
  }
  if(a.frz){a.frz=false;if(!skip){log('❄ เทิร์น '+S.n+' · '+nm(ak)+' ถูกแช่แข็ง โจมตีไม่ได้','sys');floatTxt($('#f'+ak+' .cw'),'FROZEN','miss');skip=true;finger=null;await sl(500)}}
  if(!skip&&missed){log('🐇 เทิร์น '+S.n+' · '+nm(ak)+' โจมตีไม่โดน! (ถูกกระต่ายขัดขวาง)','sys');floatTxt($('#f'+ak+' .cw'),'MISS','miss');skip=true;finger=null;await sl(500)}
  if(!skip&&poss){   /* ติดสถานะเข้าสิง: มีโอกาสโจมตีตัวเอง */
    if(RR()<C.pc){
      const cw=$('#f'+ak+' .cw'),sd=Math.round(a.p);a.hp-=sd;skip=true;finger=null;
      log('👻 เทิร์น '+S.n+' · '+nm(ak)+' ถูกเข้าสิง โจมตีตัวเอง '+sd+'! (เหลือ HP '+Math.max(0,Math.ceil(a.hp))+')','sys');
      floatTxt(cw,'-'+sd,'crit');cw.classList.remove('hit');void cw.offsetWidth;cw.classList.add('hit');render();await sl(650);
      if(a.hp<=0){if(await handleKO(ak,dk))return;S.turn=dk;S.n++;render();return}
    }else log('👻 '+nm(ak)+' ถูกเข้าสิงแต่ฝืนไว้ได้ โจมตีตามปกติ','sys');
  }
  if(!sealed&&ac.ability==='wheel')await wheelAb(ak);
  a.fg=finger;render();
  if(!skip){
    if(sealed)log('🔒 '+nm(ak)+' ถูกผนึก ใช้ความสามารถไม่ได้ในเทิร์นนี้','sys');
    if(finger!==null){log('เทิร์น '+S.n+' · '+nm(ak)+' สุ่มได้ '+FN[finger]+' ('+FD[finger]+')',ak,handSvg(finger,18));await fingerFx(ak,dk,finger)}
    if(!sealed&&ac.ability==='lightning')await setLightning(ak,dk);
    S.noAb=sealed;
    const big=!sealed&&ac.ability==='getsuga'&&a.t%(C.gn+1)===0;   // ทุก N เทิร์น การโจมตีครั้งถัดไป ×3
    const gf=big?getsugaFx(ak,dk):null;
    let imode=0;if(!sealed&&ac.ability==='scythe'){const rr=RR()*100;imode=rr<C.xk?2:rr<C.xk+C.xn?1:0;if(imode===2&&(a.safe||d.safe))imode=1}   // 0 ปกติ / 1 เฉียดจุดตาย / 2 จุดตาย
    if(imode)await scytheFx(ak,dk,imode);
    const boom=!sealed&&ac.ability==='bomb'&&!imode&&RR()<C.zb;
    if(boom){bombFx(ak,dk);log('💥 '+nm(ak)+' โจมตีแบบระเบิด!',ak)}
    const maiB=!sealed&&ac.ability==='mai'&&a.hp<=a.max*C.mih;   // ไม: HP ≤ 40% → โหมดระเบิด · มากกว่านั้น → โหมดไฟ
    if(maiB){bombFx(ak,dk);log('💥 '+nm(ak)+' โจมตีโหมดระเบิด! (HP ต่ำกว่า '+Math.round(C.mih*100)+'%)',ak)}
    const dmg=imode===2?await deathStrike(ak,dk):await hit(ak,dk,big?C.gm:(imode===1?C.xm:(boom?C.zm:(maiB?C.mim:1))));if(gf)await gf;
    if(!sealed&&ac.ability==='ghoul'&&dmg>0)ghoulDrain(ak);   // คาเนกิ: โจมตีโดน → ดูดเลือด
    S.maiHit=dmg>0;
    if(maiB&&dmg>0&&d.hp>0&&RR()<C.mis){d.para=true;log('😵 '+nm(dk)+' ติดสถานะมึนงง! ไม่สามารถโจมตีในเทิร์นถัดไปได้',ak);floatTxt($('#f'+dk+' .cw'),'มึนงง','sm')}
    if(boom&&d.hp>0&&RR()<C.zs){d.para=true;log('😵 '+nm(dk)+' ติดสถานะมึนงง! ไม่สามารถโจมตีในเทิร์นถัดไปได้',ak);floatTxt($('#f'+dk+' .cw'),'มึนงง','sm')}
    log('เทิร์น '+S.n+' · '+nm(ak)+' โจมตี '+dmg+(S.up?' (ศัตรูระดับสูงกว่า ×'+C.ym+'!)':'')+(big?' (月牙天衝 ×'+C.gm+'!)':'')+(imode===1?' (เฉียดจุดตาย ×'+C.xm+')':imode===2?' (จุดตาย! ตายทันที)':'')+(S.lb?' (รวมสายฟ้า +'+S.lb+')':'')+' (เหลือ HP '+Math.max(0,Math.ceil(d.hp))+')',ak);
    if(d.hp>0){
      if(finger!==null)await fingerAct(finger,ak,dk);
      else if(!sealed&&ac.ability!=='nen')await applyAb(ac.ability,ak,dk);
    }
  }else if(!sealed&&(ac.ability==='grow'||ac.ability==='heal')){await applyAb(ac.ability,ak,dk)}
  if(!sealed&&ac.ability==='truelord'&&a.t%C.tri===0&&a.hp>0)heal(ak,C.trh);   /* จอมมารที่แท้จริง: ทุกๆ C.tri เทิร์นฟื้นฟู HP C.trh ของ HP สูงสุด */
  if(a.wkr){a.p=Math.round((a.p+a.wkr)*10)/10;a.wkr=0}
  if(!sealed&&ac.ability==='garomon'&&a.hp>0&&a.t%C.pft===0&&C.pfb>0)garomonBoost(ak);   /* สัตว์ประหลาดที่สมบูรณ์แบบ กาโร่: ทุกๆ C.pft เทิร์นเพิ่มสเตตัส */
  if(!skip&&a.hp>0&&d.hp>0&&CARDS[d.id].ability==='garomon'&&!d.sealed&&RR()<C.pfc){   /* ถูกโจมตีในเทิร์นของศัตรู → มีโอกาสโจมตีโต้กลับ 1 ครั้ง */
    log('↩ '+nm(dk)+' โจมตีโต้กลับ!',dk);
    const x=await hit(dk,ak);
    log('เทิร์น '+S.n+' · '+nm(dk)+' โต้กลับ '+x+(S.lb?' (รวมสายฟ้า +'+S.lb+')':'')+' (เหลือ HP '+Math.max(0,Math.ceil(a.hp))+')',dk);
    if(a.hp<=0){if(await handleKO(ak,dk))return;S.turn=dk;S.n++;render();return}
  }
  if(a.rmOn&&a.rmT!==S.n&&a.rm>0)a.rm--;
  render();
  if(d.hp<=0){if(await handleKO(dk,ak))return}
  S.turn=dk;S.n++;render();
  if(OPT.maxTurns&&S.n>OPT.maxTurns){   /* หมดเวลา (เรด / ชาเลนจ์จำกัดเทิร์น) */
    S.over=true;render();log('⏱ หมดเวลา! ครบ '+OPT.maxTurns+' เทิร์นแล้ว','sys');await sl(800);
    if(S&&S.over&&OPT.onEnd)OPT.onEnd({...endInfo(),win:false,timeout:true,turns:OPT.maxTurns,left:S.roster.a.filter(x=>x.hp>0).length,bossHp:Math.max(0,S.roster.b[0].hp)});return}
}
async function loop(my){
  await sl(900);
  while(run===my&&!S.over){
    if(paused){await sleepRaw(120);continue}
    try{await doTurn();await sl(550)}catch(x){if(x==='cancel')return;throw x}
  }
}
$('#pauseBtn').onclick=()=>{paused=!paused;$('#pauseBtn').textContent=paused?'เล่นต่อ':'หยุด'};
$('#speedBtn').onclick=()=>{speed=speed===1?2:speed===2?4:1;$('#speedBtn').textContent='ความเร็ว x'+speed};
$('#backBtn').onclick=()=>{if(OPT.online&&OPT.onBack)return OPT.onBack();run++;$('#fx').innerHTML='';if(OPT.onExit)OPT.onExit()};
window.Battle={start:startBattle,stop:()=>{run++;$('#fx').innerHTML=''},fixed:v=>{FIXED=!!v;if(!v)RNG=null},state:()=>S};