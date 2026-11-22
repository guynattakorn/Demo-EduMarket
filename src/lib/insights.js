// lib/insights.js — สูตรวิเคราะห์โปรเจกต์ (ยกมาจาก EduMarket Project Insights)
// จำนวนเงินทั้งหมดเป็นสตางค์ จนกว่าจะแสดงผลด้วย money()
export const thaiDate=(iso)=>new Date(iso).toLocaleDateString('th-TH',{timeZone:'Asia/Bangkok',day:'numeric',month:'short'});
export const today=()=>new Date(Date.now()+25200000).toISOString().slice(0,10);
export function shift(date,n){return new Date(Date.parse(date+'T00:00Z')+n*86400000).toISOString().slice(0,10)}
export function dateOf(time){return new Date(Date.parse(time)+25200000).toISOString().slice(0,10)}
export const num=n=>new Intl.NumberFormat('th-TH',{maximumFractionDigits:2}).format(n);
export const money=n=>num(n/100)+' บาท';
export const slotNames=['00:00–08:59','09:00–11:59','12:00–13:59','14:00–23:59'];

function slotOf(time){
 const hour = new Date(Date.parse(time)+25200000).getUTCHours();
 return hour<9?0:hour<12?1:hour<14?2:3;
}
export function demo(){
 const posts=['แซนด์วิชไข่','สมุดโน้ตทำมือ','คุกกี้ช็อกชิป'].map((title,i)=>({id:'sample'+i,title,price:[3500,2900,2000][i],cost:[1800,1500,950][i],fixed:[15000,8000,6500][i],created:shift(today(),-59)+'T00:00:00Z'}));
 const sales=[],visits=[];
 for(let i=0;i<60;i++){
   const day=shift(today(),i-59);
   posts.forEach((p,j)=>{
    const wave=Math.sin(i*1.3+j)*1.6+Math.cos(i*.64)*1.5;
    const orders=Math.max(1,Math.round(2+(i/12)*(1-j*.18)+wave+j%2));
    visits.push({post:p.id,day,seen:orders*9+17+j*7,opened:orders*3+6,placed:orders});
    for(let k=0;k<orders;k++) {
      const time=day+'T'+['00:25','03:30','05:15'][(k+j)%3]+':00Z';
      const ordered=day+'T'+(k%4<2?'02:00':k%4===2?'04:25':'00:10')+':00Z';
      sales.push({id:'s'+i+'-'+j+'-'+k,post:p.id,quantity:1+((i+k+j)%4===0?1:0),status:'delivered',created:ordered<time?ordered:time,delivered:time});
    }
   });
 }
 return {posts,visits,sales};
}
const blank=day=>({day,seen:0,opened:0,liked:0,placed:0,units:0,orders:0,revenue:0,variable:0,fixed:0,profit:0,slots:[0,0,0,0],orderSlots:[0,0,0,0]});
const keys=['seen','opened','liked','placed','units','orders','revenue','variable','fixed','profit'];
export function sum(days){return days.reduce((t,r)=>{for(const k of keys)t[k]+=r[k];r.slots.forEach((n,i)=>t.slots[i]+=n);r.orderSlots.forEach((n,i)=>t.orderSlots[i]+=n);return t},blank(''))}
export function report(data,n,filter='all',end=today()){
 const posts=data.posts.filter(p=>filter==='all'||filter===p.id), map=new Map(posts.map(p=>[p.id,p]));
 const dates = data.period ? [...data.period.previous,...data.period.current] :
  Array.from({length:n*2},(_,i)=>shift(end,i-n*2+1));
 const days=dates.map(blank), byDay=new Map(days.map(x=>[x.day,x]));
 const product=Object.fromEntries(posts.map(p=>[p.id,blank('')]));
 const periodLength=data.period?.current.length??n;
 const start=days[periodLength].day;
 const visiblePosts=new Set();
 for(const p of posts){const day=dateOf(p.created),r=byDay.get(day);if(r){r.fixed+=p.fixed;if(day>=start)product[p.id].fixed+=p.fixed;}}
 for(const expense of data.expenses??[]){
  const row=byDay.get(expense.day);
  if(!row || !map.has(expense.post)) continue;
  row.fixed+=expense.amount;
  if(expense.day>=start) product[expense.post].fixed+=expense.amount;
 }
 for(const v of data.visits){const r=byDay.get(v.day);if(!r||!map.has(v.post))continue;if(v.day>=start&&v.seen>0)visiblePosts.add(v.post);for(const k of ['seen','opened','liked','placed'])r[k]+=Number(v[k]??0);}
 for(const s of data.sales){
   const p=map.get(s.post);if(!p)continue;
   const orderDay=byDay.get(dateOf(s.created));
   if(s.status==='cancelled')continue;
   if(orderDay&&s.first!==false)orderDay.orderSlots[slotOf(s.created)]++;
   if(s.status!=='delivered')continue;
   const d=dateOf(s.delivered),row=byDay.get(d);if(!row)continue;
   const slot=slotOf(s.delivered);
   for(const r of d>=start?[row,product[p.id]]:[row]){
     if(s.first!==false)r.orders++;r.units+=s.quantity;r.revenue+=s.quantity*(s.price??p.price);r.variable+=s.quantity*(s.cost??p.cost);r.slots[slot]+=s.quantity;
   }
 }
 for(const r of [...days,...Object.values(product)])r.profit=r.revenue-r.variable-r.fixed;
 const current=days.slice(periodLength),previous=days.slice(0,periodLength);
 return {current,previous,now:sum(current),before:sum(previous),product,posts,start,end:dates.at(-1),visiblePosts:visiblePosts.size,
  priorComplete:posts.some(p=>dateOf(p.created)<=days[0].day)};
}
export function change(a,b){return b>0?(a-b)/b*100:null}
// Fit a linear trend to the most recent seven complete days. Today's partial sales are excluded.
export function prediction(data,filter,end=today()){
 const r=report(data,7,filter,shift(end,-1)),ys=r.current.map(d=>d.revenue/100);
 if(!r.posts.some(p=>dateOf(p.created)<=r.start)||ys.filter(x=>x>0).length<3)return null;
 const mean=ys.reduce((a,b)=>a+b,0)/7;
 const slope=ys.reduce((s,y,i)=>s+(i-3)*(y-mean),0)/28;
 return Math.max(0,Math.round(mean+slope*4)); 
}
// Use nearest neighbours by impression volume to compare like-sized selling days.
export function coachBenchmark(data,filter,period,end=today()){
 const current=report(data,period,filter,end).now;
 if(!current.seen||!current.opened)return null;
 const prior=report(data,30,filter,shift(end,-period)).current.filter(d=>d.seen>0&&d.opened>0);
 if(prior.length<5)return null;
 const exposure=current.seen/period;
 const peers=prior.sort((a,b)=>Math.abs(a.seen-exposure)-Math.abs(b.seen-exposure)).slice(0,5);
 const benchmark=sum(peers);
 const pairs=[{stage:'เปิดดูจากที่เห็น',a:current.opened/current.seen,b:benchmark.opened/benchmark.seen,action:'ทดลองเปลี่ยนชื่อสินค้า แล้วติดตามสัดส่วนคนเปิดดู'},
 {stage:'สั่งซื้อจากที่เปิดดู',a:current.placed/current.opened,b:benchmark.placed/benchmark.opened,action:'ลองบอกจุดรับสินค้าและเวลารับในชื่อโพสต์ แล้ววัดสัดส่วนการสั่งซื้อ'}];
 return pairs.sort((a,b)=>(b.b-b.a)-(a.b-a.a))[0];
}

// All financial amounts stay in satang until they are formatted for display.
export function projectLessons(r, peer, forecast) {
 const a = r.now;
 const pct = (x, y) => num(100 * x / y) + '%';
 const result = a.profit < 0 ? 'ขาดทุน ' + money(-a.profit) : a.profit > 0 ? 'กำไร ' + money(a.profit) : 'เท่าทุน';
 const contribution = a.revenue - a.variable;
 const rows = r.posts.map(p => ({ ...p, units: r.product[p.id].units, profit: r.product[p.id].profit }));
 const losing = rows.filter(p => p.units && p.price < p.cost).sort((x,y) => (y.cost-y.price)*y.units - (x.cost-x.price)*x.units)[0];
 const costCandidate = rows.filter(p => p.units && p.cost >= 100).sort((x,y) => y.units-x.units)[0];
 const single = rows.length === 1 ? rows[0] : null;

 let action = 'เริ่มบันทึกราคาขาย ต้นทุนต่อชิ้น และค่าใช้จ่ายตั้งต้น แล้วตรวจผลหลังส่งมอบออเดอร์แรก';
 if (losing) action = losing.title + ' มีต้นทุนสูงกว่าราคาขาย ' + money(losing.cost-losing.price) + ' ต่อชิ้น ลองปรับราคาหรือต้นทุนให้ส่วนต่างเป็นบวกก่อนผลิตเพิ่ม';
 else if (a.profit < 0 && single && single.price > single.cost) action = 'ถ้าราคาและต้นทุนคงเดิม ต้องส่งมอบเพิ่ม ' + num(Math.ceil(-a.profit/(single.price-single.cost))) + ' ชิ้นเพื่อให้คุ้มทุน โดยไม่มีค่าใช้จ่ายคงที่เพิ่ม';
 else if (costCandidate) action = 'ถ้าลดต้นทุนของ ' + costCandidate.title + ' ได้ 1 บาทต่อชิ้นที่ยอดขายเดิม ' + num(costCandidate.units) + ' ชิ้น ผลของรอบนี้จะดีขึ้น ' + money(costCandidate.units*100) + ' ลองขอราคาวัตถุดิบแล้วเทียบคุณภาพ';
 else if (a.fixed || a.units) action = 'แยกค่าใช้จ่ายครั้งเดียวออกจากต้นทุนต่อชิ้น แล้วตรวจว่าราคาขายเหลือส่วนต่างพอจ่ายค่าใช้จ่ายก้อนแรกหรือยัง';
 const finance = {
  topic:'ต้นทุน', title:a.units || a.fixed ? 'หลังหักต้นทุน '+ result : 'เริ่มอ่านกำไรจากออเดอร์ที่ส่งมอบ',
  evidence:'ยอดขาย '+money(a.revenue)+' หักต้นทุนผันแปร '+money(a.variable)+' เหลือ '+money(contribution)+' ก่อนหักค่าใช้จ่ายคงที่ '+money(a.fixed),
  meaning:contribution<0?'ต้นทุนของชิ้นที่ขายสูงกว่ารายรับรวม การขายเพิ่มด้วยสัดส่วนเดิมจะยิ่งเพิ่มผลขาดทุน':a.profit<0?'ส่วนต่างจากการขายยังชดเชยค่าใช้จ่ายคงที่ของช่วงนี้ได้ไม่ครบ ขาดอีก '+money(-a.profit):a.revenue?'ทุกยอดขาย 100 บาท เหลือกำไรตามต้นทุนที่บันทึก '+num(a.profit/a.revenue*100)+' บาท':'ค่าใช้จ่ายคงที่นับในวันที่สร้างโพสต์ ส่วนรายรับเริ่มนับเมื่อส่งมอบ',
  action, measure:'เทียบกำไรเป็นบาทและกำไรต่อยอดขายหลังส่งมอบรอบถัดไป โดยรวมต้นทุนที่บันทึกครบแล้ว'
 };
 const reach = {
  topic:'เห็นถึงซื้อ', title:a.seen?'จากการเห็น 100 ครั้ง มีกดสั่งซื้อ '+num(100*a.placed/a.seen)+' ครั้ง':'ยังไม่มีการเห็นโพสต์ในช่วงนี้',
  evidence:'เห็นโพสต์ '+num(a.seen)+' ครั้ง → เปิดดู '+num(a.opened)+' ครั้ง → กดสั่งซื้อ '+num(a.placed)+' ครั้ง',
  meaning:a.opened?'จากการเปิดดู มีการกดสั่งซื้อ '+pct(a.placed,a.opened)+' ตัวเลขนับแยกตามบัญชี โพสต์ และวัน จึงใช้ดูแนวโน้มได้ แต่ระบุเหตุผลที่แต่ละคนตัดสินใจไม่ได้':a.seen?'มีการเห็นแล้ว แต่ยังไม่มีการเปิดดูให้ประเมินขั้นสั่งซื้อ':'ต้องมีการเห็นและเปิดดูก่อน จึงจะประเมินว่าควรปรับขั้นไหนได้',
  action:!a.seen?'ทดลองแชร์โพสต์ในช่องทางเดียวก่อน แล้วนับยอดเห็นและเปิดดู':!a.opened?'ทดลองเปลี่ยนภาพแรกโดยคงราคาเดิม แล้วดูว่าจากยอดเห็นเท่าเดิมมีคนเปิดดูเพิ่มไหม':'ลองเพิ่มเวลารับสินค้าในรายละเอียดโดยคงราคาและภาพเดิม แล้วเทียบสัดส่วนกดสั่งซื้อต่อการเปิดดู',
  measure:'เทียบช่วงยาวเท่ากัน โดยดูจำนวนครั้งควบคู่กับเปอร์เซ็นต์ และตรวจออเดอร์ส่งมอบแยกจากการกดสั่งซื้อ'
 };
 if (peer) {
  const gap = (peer.a-peer.b)*100;
  reach.meaning += ' เทียบ 5 วันที่ยอดเห็นใกล้กัน อัตรา'+peer.stage+' อยู่ที่ '+pct(peer.a,1)+' เทียบกับ '+pct(peer.b,1)+' ในกลุ่มเทียบ';
  reach.action = gap < -0.01 ? peer.action+' เพราะขั้นนี้ต่ำกว่ากลุ่มเทียบ '+num(-gap)+' จุดเปอร์เซ็นต์' : 'ทั้งสองขั้นใกล้เคียงหรือสูงกว่ากลุ่มเทียบ ลองคงรูปแบบโพสต์อีกหนึ่งรอบแล้วดูว่าผลสม่ำเสมอไหม';
 }
 const growth = {
  topic:'เติบโต',title:'ยอดขายกับกำไรโตไปด้วยกันไหม',
  evidence:'ช่วงนี้ส่งมอบ '+num(a.units)+' ชิ้น ยอดขาย '+money(a.revenue)+' และ'+result+(r.priorComplete?' เทียบช่วงก่อนที่ขาย '+num(r.before.units)+' ชิ้น ยอดขาย '+money(r.before.revenue)+' และมีผลกำไรสุทธิ '+money(r.before.profit):' ประวัติยังไม่ครบสองช่วง'),
  meaning:!r.priorComplete?'ยังสรุปทิศทางการเติบโตเทียบช่วงก่อนไม่ได้':a.revenue>r.before.revenue && a.profit<=r.before.profit?'ยอดขายโตแต่กำไรไม่เพิ่มตาม ควรตรวจต้นทุนและสัดส่วนสินค้าที่ขาย':a.revenue && a.orders?'ยอดขายเฉลี่ยต่อออเดอร์ที่ส่งมอบอยู่ที่ '+money(a.revenue/a.orders)+' ใช้คู่กับจำนวนออเดอร์เพื่อแยกผลของขนาดบิลออกจากปริมาณขาย':'จำนวนชิ้นและกำไรช่วยบอกว่าการเปลี่ยนแปลงยอดขายส่งผลต่อร้านอย่างไร',
  action:'เลือกสินค้าหนึ่งรายการ เทียบจำนวนชิ้นและกำไรกับช่วงก่อน แล้วทดลองปรับทีละอย่าง',
  measure:forecast===null?'เก็บยอดส่งมอบต่อเนื่องเพื่อดูแนวโน้มรายวัน':'โมเดลแนวโน้มจาก 7 วันเต็มก่อนหน้าประมาณยอดขายวันนี้ที่ '+num(forecast)+' บาท ลองเทียบกับยอดจริงเมื่อจบวัน'
 };
 const best = rows.filter(p=>p.units).sort((x,y)=>y.profit-x.profit)[0];
 const mix = {
  topic:'สินค้า',title:best?'สินค้าใดเหลือกำไรมากที่สุด':'ยังไม่มีสินค้าที่ส่งมอบ',
  evidence:best?best.title+' มีผลกำไรสุทธิ '+money(best.profit)+' จาก '+num(best.units)+' ชิ้น หลังหักต้นทุนที่บันทึกในช่วงนี้':'ตารางสินค้าจะแยกจำนวนชิ้น ยอดขาย และกำไรเมื่อเริ่มส่งมอบ',
  meaning:best?'อันดับนี้เทียบกำไรรวมของสินค้าที่ส่งมอบในตัวกรองที่เลือก สินค้าที่ขายมากอาจเหลือกำไรต่อชิ้นน้อย':'ต้นทุนคงที่อาจเกิดขึ้นก่อนขายได้ชิ้นแรก',
  action:best && best.profit>0?'ลองจัดสินค้านี้ให้เห็นง่ายขึ้นหนึ่งรอบ แล้วดูว่ากำไรรวมของร้านเพิ่มด้วยไหม':'ตรวจราคาขายและต้นทุนต่อชิ้นก่อนกำหนดจำนวนผลิต',
  measure:'เทียบกำไรรวมของร้านและกำไรของสินค้าที่ทดลองในช่วงยาวเท่ากัน'
 };
 return [finance,reach,growth,mix];
}

export function compareFunnel(report, benchmarks, days){
 const peers=benchmarks?.find(period=>period.days===days);
 if(!peers) return null;
 const current=report.now;
 const peerRate=peers.placed/peers.seen;
 const myRate=current.seen?current.placed/current.seen:null;
 const mySeen=report.visiblePosts?current.seen/report.visiblePosts:null;
 const peerSeen=peers.seen/peers.posts;
 let meaning='เริ่มมีคนเห็นโพสต์ของคุณก่อน จึงจะเทียบอัตรากดสั่งซื้อกับร้านอื่นได้';
 let action='แชร์โพสต์ในช่องทางเดียว แล้วดูว่ายอดเห็นและเปิดดูเพิ่มเท่าไร';
 if(myRate!==null){
  const gap=Math.round((myRate-peerRate)*10000)/100;
  const reach=Math.round((mySeen-peerSeen)*100)/100;
  meaning='ยอดเห็นต่อโพสต์' + (reach===0?'เท่ากับค่าเฉลี่ย':(reach>0?'สูงกว่า':'ต่ำกว่า')+'ค่าเฉลี่ย '+num(Math.abs(reach))+' ครั้ง')+
   ' และอัตรากดสั่งซื้อจากยอดเห็น'+(gap===0?'เท่ากัน':(gap>0?'สูงกว่า':'ต่ำกว่า')+' '+num(Math.abs(gap))+' จุดเปอร์เซ็นต์');
  if(gap<0 && current.opened/current.seen<peers.opened/peers.seen){
   action='ลองเปลี่ยนภาพแรกหรือชื่อสินค้าอย่างใดอย่างหนึ่ง แล้ววัดสัดส่วนเปิดดูจากยอดเห็น';
  }else if(gap<0){
   action='ลองระบุจุดรับและเวลารับสินค้าให้ชัด แล้ววัดสัดส่วนกดสั่งซื้อหลังเปิดดู';
  }else if(reach<0){
   action='ลองแชร์โพสต์เพิ่มในช่องทางเดียว โดยคงรูปและราคาไว้ แล้ววัดยอดเห็นต่อโพสต์และอัตรากดสั่งซื้อ';
  }else{
   action='ใช้รูปและราคาเดิมอีกหนึ่งรอบ แล้วดูว่ายอดเห็นและอัตรากดสั่งซื้อรักษาระดับได้ไหม';
  }
 }
 return {
  shops:peers.shops,
  rows:[
   ['ยอดเห็นเฉลี่ยต่อโพสต์',mySeen,peerSeen,'ครั้ง'],
   ['กดสั่งซื้อเฉลี่ยต่อโพสต์',report.visiblePosts?current.placed/report.visiblePosts:null,peers.placed/peers.posts,'ครั้ง'],
   ['เปิดดูจากยอดเห็น',current.seen?100*current.opened/current.seen:null,100*peers.opened/peers.seen,'%'],
   ['กดสั่งซื้อจากยอดเห็น',myRate===null?null:myRate*100,peerRate*100,'%']
  ],
  meaning,action
 };
}

export function timeLesson(current, delivery){
 const counts=delivery?current.slots:current.orderSlots;
 const total=counts.reduce((sum,count)=>sum+count,0);
 const unit=delivery?'ชิ้น':'ออเดอร์';
 const event=delivery?'ส่งมอบ':'สั่งซื้อ';
 if(!total) return {
  meaning:'ยังไม่มีข้อมูล'+event+'ในช่วงที่เลือก',
  action:delivery?'บันทึกเวลาส่งมอบเมื่อกดยืนยันออเดอร์ แล้วใช้กราฟจัดรอบรับสินค้า':'ลองเปิดรับออเดอร์สองช่วงเวลาที่สะดวก แล้วเก็บยอดเพื่อเทียบกัน'
 };
 const peak=Math.max(...counts);
 const leaders=slotNames.filter((_,index)=>counts[index]===peak);
 const meaning='ช่วง '+leaders.join(' และ ')+' มียอด'+event+'สูงสุด'+(leaders.length>1?'เท่ากัน ':' ')+num(peak)+' '+unit+(leaders.length===1?' คิดเป็น '+num(peak/total*100)+'% จากทั้งหมด '+num(total)+' '+unit:'');
 if(total===1 || leaders.length>1) return {
  meaning,
  action:'เก็บข้อมูลเพิ่มโดยรักษาราคาเดิม แล้วเทียบยอด'+event+'อีกครั้งก่อนเปลี่ยนตารางประจำ'
 };
 return {
  meaning,
  action:delivery?'ทดลองเตรียมของและจัดรอบรับสินค้าให้พร้อมช่วง '+leaders[0]+' แล้ววัดจำนวนออเดอร์ที่ส่งมอบได้ในรอบนั้น':'ทดลองโปรโมตก่อนเริ่มช่วง '+leaders[0]+' และเปิดรับออเดอร์ในช่วงนั้น โดยคงราคาเดิม แล้วเทียบจำนวนออเดอร์และกำไรในรอบถัดไป'
 };
}
