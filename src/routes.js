import {attachLaneRules,junctionRange} from './lanes.js';
import {remapRoadPoint} from './road-layout.js';
export const labels={start:'起步',right:'路口右转',left:'路口左转',change:'变更车道',straight:'直线行驶',uturn:'掉头',meet:'会车',overtake:'超车',cross:'路口直行',school:'学校区域',bus:'公交车站',park:'靠边停车'};
export const hints={start:'系好安全带，挂 D 挡，松驻车制动；打左灯满 3 秒，观察后平稳起步。',right:'提前打右灯，观察右后方；减速沿右转车道转弯，礼让被放行的车辆和行人。',left:'提前打左灯，观察左后方；遵守信号，减速左转。',change:'先观察、打灯满 3 秒，再平稳转向进入相邻车道，完成后关灯。',straight:'目视远处，保持车道；方向轻微修正，避免急打方向。',uturn:'打左灯满 3 秒，观察左后方；减速到 10 km/h 左右完成掉头。',meet:'观察对向来车，减速靠右，保持安全间距。',overtake:'观察左后方，左灯满 3 秒后超车；驶过后观察右后方，右灯满 3 秒再返回。',cross:'提前减速并左右观察，停车线前看信号，礼让行人。',school:'留意学校标志，提前点刹，速度低于 30 km/h，左右观察。',bus:'留意公交站牌，提前点刹，速度低于 30 km/h，注意上下车行人。',park:'右灯满 3 秒，观察右后方；车身距右边线 30 cm 内停稳，拉驻车制动，挂 P 挡。'};
const p=(x,z)=>({x,z});
// Road geometry preserves the supplied diagrams' topology; dimensions are schematic.
const specs={
  1:{name:'一号线',color:'#4f7cff',image:'mmexport1790494901618.jpg',subtitle:'环绕车管所 · 三次右转',
    points:[[-367,180],[-367,25],[-367,13],[-345,13],[-250,13],[-205,5],[-20,5],[3,3],[5,-25],[5,-280],[3,-294],[-2,-300],[-7,-294],[-9,-280],[-9,-170],[-9,-140],[-5,-120],[-5,-105],[-9,-85],[-9,500],[-13,540],[-13,610],[-13,647],[-28,647],[-340,647],[-367,647],[-367,630],[-367,505]],
    roads:[[-380,0,-380,740],[0,-360,0,740],[-460,0,160,0],[-460,330,160,330],[-460,660,160,660]],
    junctions:[[-380,0],[0,0],[-380,330],[0,330],[-380,660],[0,660]],
    markers:[['start',-367,180],['right',-367,35],['change',-250,13,'left'],['left',-40,5],['straight',5,-140],['uturn',5,-265],['meet',-9,-255],['overtake',-9,-145],['cross',-9,-35],['school',-9,160],['cross',-9,295],['change',-9,500,'right'],['right',-13,610],['bus',-140,647],['right',-340,647],['park',-367,505]],
    lights:[[-367,29,1],[-28,5,3],[-9,-29,8],[-9,301,10],[-340,647,14]],
    signs:[['school',-9,160],['bus',-140,647]]},
  9:{name:'九号线',color:'#ad66ef',image:'mmexport1790494903835.jpg',subtitle:'东侧起步 · 北端掉头',
    points:[[650,-13],[480,-13],[420,-9],[380,-9],[340,-13],[35,-13],[13,-13],[13,-35],[13,-150],[9,-180],[9,-570],[5,-600],[5,-970],[4,-983],[0,-990],[-4,-983],[-5,-970],[-5,-20],[-4,8],[15,9],[230,9],[280,13],[330,13],[450,13]],
    roads:[[-200,0,760,0],[0,-1060,0,200],[-100,-450,100,-450]],
    junctions:[[0,0],[0,-450]],
    markers:[['start',650,-13],['straight',550,-13],['overtake',480,-13],['right',45,-13],['school',13,-110],['change',13,-150,'left'],['cross',9,-420],['change',9,-570,'left'],['bus',5,-850],['uturn',5,-955],['cross',-5,-480],['left',-5,-45],['meet',180,9],['park',450,13]],
    lights:[[-5,-28,11]],signs:[['school',13,-110],['bus',5,-850]]},
  10:{name:'十号线',color:'#f16f55',image:'mmexport1790494905745.jpg',subtitle:'西侧起步 · 回程直线行驶',
    points:[[-550,13],[-510,13],[-485,9],[-400,9],[-270,9],[-230,5],[-20,5],[3,3],[5,-30],[5,-950],[3,-965],[-2,-972],[-7,-965],[-9,-950],[-9,-850],[-5,-830],[-5,-810],[-9,-790],[-9,-240],[-13,-200],[-13,-35],[-13,-13],[-40,-13],[-230,-13],[-265,-9],[-290,-9],[-325,-13],[-460,-13],[-490,-13],[-550,-13]],
    roads:[[-650,0,220,0],[0,-1040,0,230],[-100,-430,100,-430]],
    junctions:[[0,0],[0,-430]],
    markers:[['start',-550,13],['change',-510,13,'left'],['meet',-400,9],['change',-270,9,'left'],['left',-45,5],['school',5,-120],['cross',5,-400],['bus',5,-820],['uturn',5,-935],['overtake',-9,-860],['cross',-9,-460],['change',-9,-240,'right'],['right',-13,-40],['change',-230,-13,'left'],['straight',-370,-13],['park',-550,-13]],
    lights:[[-28,5,4]],signs:[['school',5,-120],['bus',5,-820]]}
};
function length(points){return points.slice(1).reduce((sum,v,i)=>sum+Math.hypot(v.x-points[i].x,v.z-points[i].z),0);}
export function nearest(route,position,min=0,max=route.length){
  let best={distance:Infinity,s:0,offset:0,index:0};
  for(let i=1;i<route.path.length;i++){
    const a=route.path[i-1],b=route.path[i];if(b.s<min||a.s>max)continue;
    const dx=b.x-a.x,dz=b.z-a.z,l=b.s-a.s;
    const t=Math.max(0,Math.min(1,((position.x-a.x)*dx+(position.z-a.z)*dz)/(l*l)));
    const x=a.x+t*dx,z=a.z+t*dz,d=Math.hypot(position.x-x,position.z-z);
    if(d<best.distance)best={distance:d,s:a.s+t*l,offset:(-(position.x-x)*dz+(position.z-z)*dx)/l,index:i,heading:Math.atan2(dx,-dz)};
  }return best;
}
export function at(route,s){
  s=Math.max(0,Math.min(route.length,s));
  let i=1;while(i<route.path.length-1&&route.path[i].s<s)i++;
  const a=route.path[i-1],b=route.path[i],t=(s-a.s)/(b.s-a.s);
  return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,heading:Math.atan2(b.x-a.x,a.z-b.z)};
}
const cache=new Map();
export function getRoute(id){
  if(cache.has(id))return cache.get(id);
  const spec=specs[id];if(!spec)throw new Error('未知路线');
  const points=[],keyIndices=[];
  const axis=(a,b)=>Math.abs(b[0]-a[0])>Math.abs(b[1]-a[1])?'z':'x';
  spec.points.forEach((v,i)=>{
    if(i){const a=spec.points[i-1],steps=Math.ceil(Math.hypot(v[0]-a[0],v[1]-a[1])/8);for(let j=1;j<steps;j++)points.push(remapRoadPoint(spec,id,p(a[0]+(v[0]-a[0])*j/steps,a[1]+(v[1]-a[1])*j/steps),axis(a,v)));}
    keyIndices.push(points.length);const before=i?axis(spec.points[i-1],v):axis(v,spec.points[1]),after=i<spec.points.length-1?axis(v,spec.points[i+1]):before;
    points.push(remapRoadPoint(spec,id,p(...v),before===after?before:null));
  });
  const scale=3000/length(points);
  const path=points.map(v=>p(v.x*scale,v.z*scale));let total=0;
  path.forEach((v,i)=>{if(i)total+=Math.hypot(v.x-path[i-1].x,v.z-path[i-1].z);v.s=total;});
  const r={...spec,id,scale,path,keyPath:keyIndices.map(i=>path[i]),length:total,roads:spec.roads.map(v=>v.map(n=>n*scale)),junctions:spec.junctions.map(v=>v.map(n=>n*scale))};
  let last=-1;
  r.events=spec.markers.map(([kind,x,z,direction],i)=>{
    const mapped=remapRoadPoint(spec,id,p(x,z)),point=p(mapped.x*scale,mapped.z*scale),n=nearest(r,point,last+0.01);last=n.s;
    return {id:`${id}-${i}`,kind,s:n.s,point:at(r,n.s),label:labels[kind],hint:hints[kind],direction:direction??({left:'left',right:'right',uturn:'left',start:'left',park:'right',overtake:'left'}[kind]),silent:['school','bus'].includes(kind),status:'pending'};
  });
  const maneuverLengths={1:{2:60,7:80,11:60},9:{2:160,5:50,7:50},10:{1:50,3:60,9:95,11:60,13:115}};
  r.events.forEach((e,i)=>{e.endS=e.s+(e.kind==='meet'?8:(maneuverLengths[id]?.[i]??(e.kind==='straight'?65:12))*scale);});
  r.lights=spec.lights.map(([x,z,eventIndex],i)=>{
    const mapped=remapRoadPoint(spec,id,p(x,z)),n=nearest(r,p(mapped.x*scale,mapped.z*scale)),e=r.events[eventIndex];
    return {s:n.s,point:at(r,n.s),offset:i*13,type:'circular',eventId:e.id,movement:e.kind==='cross'?'straight':e.kind};
  });
  attachLaneRules(r);
  for(const e of r.events)if(['cross','left','right'].includes(e.kind)){
    const range=junctionRange(r,e.s);if(range){e.assessmentStart=range.start;e.endS=range.end;}
  }
  cache.set(id,r);return r;
}
export const routes=[1,9,10].map(getRoute);
