// lib/insights-demo.js — ร้านขนมตัวอย่าง (ข้อมูลสมมติ) สำหรับโหมด "ร้านตัวอย่าง"
import {dateOf, money, num, shift} from './insights.js';

const weeks = {
 previous: ['2026-11-09','2026-11-10','2026-11-11','2026-11-12','2026-11-13'],
 current: ['2026-11-16','2026-11-17','2026-11-18','2026-11-19','2026-11-20'],
};
const schoolDays = ['จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์'];
const products = [
 {
  id: 'brownie', title: 'บราวนี่', price: 3000, cost: 1800, expense: 30000, stock: 0,
  units: [12,14,18,20,36], previousUnits: [11,13,14,16,21], previousOrders: 11,
  orderSlots: [[2,3,4,1],[2,3,4,2],[3,4,5,1],[2,5,8,1],[3,7,17,3]],
  views: [210,220,230,250,290], opens: [45,56,60,65,74], likes: [16,18,19,21,26],
  genderViews:[600,510,90], genderOrders:[40,34,6],
  classViews: [480,300,420], classOrders: [37,31,12],
 },
 {
  id: 'cookie', title: 'คุกกี้', price: 2500, cost: 1400, expense: 20000, stock: 25,
  units: [10,11,10,11,18], previousUnits: [10,11,13,14,17], previousOrders: 9,
  orderSlots: [[2,2,3,1],[2,2,4,1],[1,3,3,2],[2,3,4,1],[1,3,8,2]],
  views: [140,145,150,165,200], opens: [30,35,39,42,54], likes: [9,11,12,13,15],
  genderViews:[400,340,60], genderOrders:[25,21,4],
  classViews: [320,200,280], classOrders: [23,19,8],
 },
];
const clocks = ['01:30','03:30','05:30','07:30'];
const total = values => values.reduce((sum, value) => sum + value, 0);
const titleOfDay = day => schoolDays[weeks.current.indexOf(day)];

export function snackDemo(){
 const posts = [], visits = [], sales = [], expenses = [];
 for(const product of products){
  const {id,title,price,cost,stock}=product;
  posts.push({id,title,price,cost,stock,fixed:0,created:shift(weeks.previous[0],-1)+'T00:00Z'});
  for(const days of [weeks.previous,weeks.current]){
   expenses.push({post:id,day:days[0],amount:product.expense});
   days.forEach((day,index)=>{
    const current=days===weeks.current;
    const times=current ? product.orderSlots[index].flatMap((count,slot)=>Array(count).fill(clocks[slot])) :
     Array(product.previousOrders).fill(clocks[2]);
    const completed=times.length-Number(current);
    const units=(current?product.units:product.previousUnits)[index];
    times.forEach((clock,order)=>{
     const pending=order===completed;
     sales.push({
      id:id+'-'+day+'-'+order, post:id, status:pending?'pending':'delivered',
      quantity:pending?1:Math.floor(units/completed)+Number(order<units%completed),
      created:day+'T'+clock+'Z', delivered:pending?null:day+'T'+clock.replace(':30',':45')+'Z',
     });
    });
    if(current) visits.push({post:id,day,seen:product.views[index],opened:product.opens[index],liked:product.likes[index],placed:times.length});
   });
  }
 }
 // The example treats each engagement record as a different account within the illustrated store.
 return {posts,visits,sales,expenses,period:weeks,peers:{shops:4,seen:6400,opened:1920,placed:480,marketGrowth:10}};
}

export function snackFunnel(data,report){
 const peers=data.peers, current=report.now;
 const percent = (a,b) => 100*a/b;
 const openRate=percent(current.opened,current.seen);
 const peerOpenRate=percent(peers.opened,peers.seen);
 const growthInOpens=Math.round(current.seen*(peerOpenRate-openRate)/100);
 const allProducts=report.posts.length===data.posts.length;
 const subject=report.posts.length===1?report.posts[0].title:'บราวนี่';
 const action=growthInOpens>0
  ?'เปลี่ยนเฉพาะรูปแรกของโพสต์'+subject+' โดยคงราคาเดิม แล้ววัดอัตราเปิดดู ถ้าขึ้นถึง '+num(peerOpenRate)+'% ที่ยอดเห็นเท่าเดิม จะมีคนเปิดดูเพิ่มประมาณ '+num(growthInOpens)+' คน เมื่อครบ 5 วันเรียน ให้เทียบทั้งอัตราเปิดดูและจำนวนคนสั่งจริงก่อนตัดสินใจใช้รูปใหม่ต่อ'
  :'คงรูปและราคาเดิมอีกรอบ แล้วดูว่าอัตราเปิดดูและสั่งซื้อยังใกล้เคียงเดิมไหม';
 const rows=[
  ['เปิดดูจากคนที่เห็น',openRate,peerOpenRate,'%'],
  ['สั่งซื้อจากคนที่เปิดดู',percent(current.placed,current.opened),percent(peers.placed,peers.opened),'%'],
  ['สั่งซื้อจากคนที่เห็น',percent(current.placed,current.seen),percent(peers.placed,peers.seen),'%'],
 ];
 // Absolute reach is comparable only when the whole store is selected.
 if(allProducts) rows.unshift(['บัญชีที่เห็นโพสต์ต่อร้าน',current.seen,peers.seen/peers.shops,'คน']);
 return {
  shops:peers.shops, rows,
  meaning:(allProducts?'คนเห็นร้านมากกว่าค่าเฉลี่ยอยู่แล้ว จุดที่ควรแก้ก่อนคือรูปหรือชื่อที่เห็นบนหน้ารวมสินค้า':'จุดที่ควรทดสอบก่อนคือรูปแรกของ'+subject)+
   ' เพราะคนเห็น 100 คน เปิดดูเพียง '+num(openRate)+' คน เทียบกับร้านอื่น '+num(peerOpenRate)+' คน แต่เมื่อเปิดดูแล้ว อัตราสั่งซื้ออยู่ที่ '+num(percent(current.placed,current.opened))+'% ใกล้กับ '+num(percent(peers.placed,peers.opened))+'% ของร้านอื่น จึงยังไม่มีเหตุให้เริ่มด้วยการลดราคา',
  action,
 };
}

export function snackAudience(posts,dimension='grade'){
 const selected=products.filter(product=>posts.some(post=>post.id===product.id));
 const gender=dimension==='gender';
 const labels=gender?['หญิง','ชาย','ไม่ระบุ']:['ม.1–ม.2','ม.3–ม.4','ม.5–ม.6'];
 const rows=labels.map((name,i)=>{
  const seen=total(selected.map(product=>(gender?product.genderViews:product.classViews)[i]));
  const orders=total(selected.map(product=>(gender?product.genderOrders:product.classOrders)[i]));
  return {name,seen,orders,rate:100*orders/seen};
 });
 const mostOrders=rows.reduce((best,row)=>row.orders>best.orders?row:best);
 const bestRate=rows.reduce((best,row)=>row.rate>best.rate?row:best);
 if(gender) return {
  rows,
  meaning:'กลุ่ม'+mostOrders.name+'สั่งมากที่สุด และเป็นกลุ่มที่เห็นโพสต์มากที่สุดด้วย พอดูว่าคนเห็น 100 คนสั่งกี่คน สัดส่วนของแต่ละกลุ่มใกล้กัน การดูจำนวนคนซื้ออย่างเดียวจึงอาจทำให้เลือกกลุ่มโปรโมตผิด',
  action:'ใช้ภาพและราคาเดียวกันกับทุกกลุ่มอีก 5 วันเรียน แล้วเทียบอัตราสั่งซื้อต่อคนเห็น หากยังใกล้กัน ให้เลือกช่องทางจากยอดสั่งรวมและต้นทุนการโปรโมต',
 };
 const first=mostOrders.name+' สั่งมากที่สุด '+num(mostOrders.orders)+' คน';
 const second=bestRate.name+' มีอัตราสั่งซื้อสูงสุด '+num(bestRate.rate)+'%';
 return {
  rows, meaning:first+' จึงเป็นฐานลูกค้าที่ควรรักษา ส่วน '+second+' แต่เห็นโพสต์น้อยกว่า จึงน่าทดลองขยายการเข้าถึงในกลุ่มนี้',
  action:'ลองเพิ่มการแชร์ในช่องทางที่ '+bestRate.name+' ใช้ โดยคงราคาและรูปเดิม แล้วดูว่าเมื่อยอดเห็นเพิ่มขึ้น อัตราสั่งซื้อยังอยู่ใกล้ '+num(bestRate.rate)+'% ไหม',
 };
}

export function snackTiming(data,report,delivery){
 const labels=['08:00–09:59','10:00–11:59','12:00–13:59','14:00–15:59'];
 const rows=weeks.current.map(day=>({day,values:[0,0,0,0]}));
 for(const sale of data.sales){
  if(!report.posts.some(post=>post.id===sale.post) || (delivery && sale.status!=='delivered')) continue;
  const time=delivery?sale.delivered:sale.created;
  const row=rows.find(item=>item.day===dateOf(time));
  if(!row) continue;
  const localHour=(new Date(time).getUTCHours()+7)%24;
  const slot=Math.floor((localHour-8)/2);
  row.values[slot]+=delivery?sale.quantity:1;
 }
 const counts=labels.map((_,i)=>total(rows.map(row=>row.values[i])));
 const dayCounts=rows.map(row=>total(row.values));
 const peakDay=dayCounts.indexOf(Math.max(...dayCounts));
 const peakSlot=counts.indexOf(Math.max(...counts));
 const day=titleOfDay(rows[peakDay].day);
 const event=delivery?'ส่งมอบ':'สั่งซื้อ';
 const unit=delivery?'ชิ้น':'ออเดอร์';
 const baseline=rows[peakDay].values[peakSlot];
 const meaning='วัน'+day+' ช่วง '+labels[peakSlot]+' มี'+event+' '+num(baseline)+' '+unit+' จาก '+num(dayCounts[peakDay])+' '+unit+' ของวันนั้น '+(delivery?'การเตรียมของล่วงหน้าช่วงเดียวจึงช่วยรองรับงานส่วนใหญ่ของรอบได้':'จึงมีเหตุผลให้ทดลองโปรโมตก่อนช่วงนี้ การเพิ่มเวลาขายทั้งวันอาจเพิ่มงานโดยยังไม่รู้ว่าจะได้ออเดอร์เพิ่มเท่าไร');
 const action=delivery?'จัดของตามยอดจองก่อนเริ่มรอบ แล้วบันทึกว่ามีกี่ชิ้นพร้อมส่งตรงเวลา และเหลือกี่ชิ้นเมื่อหมดรอบ':
  'วัน'+day+'หน้าใช้รูปและราคาเดิม ลองโพสต์'+(peakSlot===2?'ตอน 11:30 น.':'ก่อนเริ่มช่วง '+labels[peakSlot])+' แล้วเทียบกับ '+num(baseline)+' ออเดอร์ในช่วงเดิม ดูยอดทั้งวันด้วย ถ้ายอดเที่ยงเพิ่มแต่ยอดทั้งวันเท่าเดิม ลูกค้าอาจเพียงย้ายเวลาสั่ง';
 return {labels,counts,days:schoolDays.map((name,i)=>[name,dayCounts[i]]),meaning,action};
}

export function snackStock(report){
 const soldOut=report.posts.find(post=>post.stock===0);
 const leftover=report.posts.find(post=>post.stock>0);
 return {
  meaning:[soldOut?soldOut.title+'ขายหมด จึงยังบอกไม่ได้ว่าหลังของหมดจะขายเพิ่มได้กี่ชิ้น':'',leftover?leftover.title+'เหลือ '+num(leftover.stock)+' ชิ้น คิดเป็นต้นทุน '+money(leftover.stock*leftover.cost)+' ที่ยังค้างอยู่ในสินค้า':''].filter(Boolean).join(' ส่วน'),
  action:[soldOut?'เปิดจอง'+soldOut.title+'อีก 10 ชิ้นก่อนทำรอบใหม่ จดจำนวนที่จองจริงแล้วใช้กำหนดจำนวนผลิต':'',leftover?'นับ'+leftover.title+'ที่ยังขายได้ก่อน แล้วหักออกจากยอดจองรอบหน้า วัดผลจากจำนวนที่เหลือเมื่อจบรอบ':''].filter(Boolean).join(' '),

 };
}

export function snackFinance(report){
 const current=report.now;
 const product=report.posts[0];
 return {
  meaning:'จากยอดขายทุก 100 บาท ร้านเหลือกำไร '+num(100*current.profit/current.revenue)+' บาท ถ้าจะเพิ่มกำไรด้วยการผลิตเพิ่ม ต้องคิดต้นทุนของทั้งชุดก่อน โดยเฉพาะเมื่อขายได้เพียงบางชิ้น',
  action:'ถ้าทำ'+product.title+'เพิ่ม 10 ชิ้น จะจ่ายต้นทุนเพิ่ม '+money(10*product.cost)+' ลองรับจองอย่างน้อย '+num(Math.ceil(10*product.cost/product.price))+' ชิ้นที่ราคาเดิมเพื่อให้ยอดขายครอบคลุมต้นทุนชุดนี้ ถ้าขายหมดและค่าใช้จ่ายคงที่เท่าเดิม กำไรจะเพิ่ม '+money(10*(product.price-product.cost)),

 };
}
