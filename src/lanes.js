import {sectionForPosition,semanticLane,junctionBounds,allowedMovement} from './road-layout.js';
export const laneNames={1:'内侧车道',2:'中间车道',3:'最右侧车道'};
// Stage values mean inner (1), middle (2), outer (3); road sections determine actual lane numbers.
const plans={
 1:{stages:[[0,1,0,'N',3],[3,4,2,'E',3],[4,5,2,'E',[3,2,1]],[5,6,2,'E',1],[8,9,1,'N',1],[13,15,1,'S',2],[15,16,1,'S',[2,1]],[16,17,1,'S',1],[17,18,1,'S',[1,2]],[18,19,1,'S',2],[19,20,1,'S',[2,3]],[20,21,1,'S',3],[23,24,4,'W',3],[26,27,0,'N',3]],changes:{2:[3,1,5],7:[2,1,18,2,16],11:[2,3,20]},gap:[1,-318,-264]},
 9:{stages:[[0,1,0,'W',3],[1,2,0,'W',[3,2]],[2,3,0,'W',2],[3,4,0,'W',[2,3]],[4,5,0,'W',3],[7,8,1,'N',3],[8,9,1,'N',[3,2]],[9,10,1,'N',2],[10,11,1,'N',[2,1]],[11,12,1,'N',1],[16,17,1,'S',1],[19,20,0,'E',2],[20,21,0,'E',[2,3]],[21,23,0,'E',3]],changes:{2:[3,2,4,3,2],5:[3,2,9],7:[2,1,11]},gap:[1,-1015,-950],parking:20},
 10:{stages:[[0,1,0,'E',3],[1,2,0,'E',[3,2]],[2,4,0,'E',2],[4,5,0,'E',[2,1]],[5,6,0,'E',1],[8,9,1,'N',1],[13,14,1,'S',2],[14,15,1,'S',[2,1]],[15,16,1,'S',1],[16,17,1,'S',[1,2]],[17,18,1,'S',2],[18,19,1,'S',[2,3]],[19,20,1,'S',3],[22,23,0,'W',3],[23,24,0,'W',[3,2]],[24,25,0,'W',2],[25,26,0,'W',[2,3]],[26,29,0,'W',3]],changes:{1:[3,2,2],3:[2,1,5],9:[2,1,17,2,15],11:[2,3,19],13:[3,2,26,3,24]},gap:[1,-1000,-934]}
};
export function attachLaneRules(route){
 const plan=plans[route.id];
 route.laneStages=plan.stages.map(([a,b,road,direction,lanes],i)=>({id:`${route.id}-${i}`,from:route.keyPath[a].s,to:route.keyPath[b].s,road,direction,lanes:Array.isArray(lanes)?lanes:[lanes]}));
 route.medianGaps=[{road:plan.gap[0],from:plan.gap[1]*route.scale,to:plan.gap[2]*route.scale},{road:1,from:-78*route.scale,to:-62*route.scale}];
 if(route.id!==1)route.medianGaps.push({road:0,from:62*route.scale,to:78*route.scale},{road:0,from:-78*route.scale,to:-62*route.scale});
 for(const [index,[from,to,end,back,returnIndex]]of Object.entries(plan.changes)){
  const e=route.events[index],stage=route.laneStages.find(l=>e.s>=l.from-.01&&e.s<=l.to+.01);
  const startSection=sectionForPosition(route,e.point,stage),endSection=sectionForPosition(route,route.keyPath[end],stage);
  e.laneChange={from:semanticLane(from,startSection.count),to:semanticLane(to,endSection.count),back:back&&semanticLane(back,endSection.count),road:stage.road,direction:stage.direction};e.endS=route.keyPath[end].s+8;
  if(back)e.returnS=route.keyPath[returnIndex].s;
  e.hint=`先观察后方，打${e.direction==='left'?'左':'右'}灯满 3 秒，从${from===3?'最右侧车道':laneNames[from]}进入${laneNames[to]}。${back?'听到返回提示后重新观察右后方，右灯满 3 秒再返回'+laneNames[back]+'。':'完成后关闭转向灯。'}`;
 }
 for(const e of route.events){if(e.kind==='meet')e.hint='5 秒内制动减速、左右观察，在车道内稍向右靠；听到会车结束后平稳回正，不跨车道。';if(e.kind==='overtake')e.hint+=' 从开始超车口令播完后，150 米内完成超越及回位。';}
 for(const e of route.events)if(['right','left','uturn'].includes(e.kind)){
  const stage=laneStage(route,e.s-1);if(!stage)continue;
  const section=sectionForPosition(route,e.point,stage);
  if(section.approach)e.signalS=e.s-(section.approach.start-section.approach.distance+25)*route.scale;
 }
 route.parkingStart=plan.parking!==undefined?route.keyPath[plan.parking].s-25:route.length-65;
 route.events.at(-1).announceS=route.parkingStart;
}
export function laneStage(route,s){return route.laneStages.find(l=>s>=l.from&&s<=l.to);}
export function lateralPosition(route,position,stage){
 const road=route.roads[stage.road];
 return stage.direction==='N'?position.x-road[0]:stage.direction==='S'?road[0]-position.x:stage.direction==='E'?position.z-road[1]:road[1]-position.z;
}
export function laneNumber(route,position,stage){const d=lateralPosition(route,position,stage)/route.scale,edges=sectionForPosition(route,position,stage).edges;if(d<edges[0]-1e-9||d>edges.at(-1)+1e-9)return 0;const lane=edges.findIndex((v,i)=>i&&d<v);return lane>0?lane:edges.length-1;}
export function withinLane(route,position,stage,lane){
 const d=lateralPosition(route,position,stage),edges=sectionForPosition(route,position,stage).edges;
 return lane>0&&lane<edges.length&&d-.9>=edges[lane-1]*route.scale-.08&&d+.9<=edges[lane]*route.scale+.08;
}
export function inJunction(route,p){return (route.junctionAreas??=route.junctions.map(([x,z])=>({x,z,...junctionBounds(route,x,z)}))).some(b=>p.x>b.x-b.left&&p.x<b.x+b.right&&p.z>b.z-b.top&&p.z<b.z+b.bottom);}
export function junctionRange(route,s){
 inJunction(route,route.path[0]);let range;
 for(let i=1;i<route.path.length;i++){
  const a=route.path[i-1],b=route.path[i];if(b.s<s-40||a.s>s+120)continue;
  for(const box of route.junctionAreas){
   let from=0,to=1;
   for(const [axis,min,max]of [['x',box.x-box.left,box.x+box.right],['z',box.z-box.top,box.z+box.bottom]]){
    const delta=b[axis]-a[axis];
    if(Math.abs(delta)<1e-9){if(a[axis]<min||a[axis]>max)to=-1;}
    else{const t1=(min-a[axis])/delta,t2=(max-a[axis])/delta;from=Math.max(from,Math.min(t1,t2));to=Math.min(to,Math.max(t1,t2));}
   }
   if(from>to)continue;
   const start=a.s+(b.s-a.s)*from,end=a.s+(b.s-a.s)*to;if(end<s)continue;
   if(range&&start>range.end+.01)return range;
   if(!range)range={start,end};else range.end=end;
  }
 }return range;
}
export function medianAt(route,p){
 if(inJunction(route,p))return false;
 return route.roads.some(([x1,z1,x2,z2],road)=>{
  const vertical=x1===x2,along=vertical?p.z:p.x,lateral=vertical?p.x-x1:p.z-z1;
  if(along<Math.min(vertical?z1:x1,vertical?z2:x2)||along>Math.max(vertical?z1:x1,vertical?z2:x2)||Math.abs(lateral)>.9+sectionForPosition(route,p,{road,direction:vertical?'N':'E'}).median*route.scale)return false;
  return !route.medianGaps.some(g=>g.road===road&&along>=g.from&&along<=g.to);
 });
}
export function checkLane(sim){
 const r=sim.route;if(medianAt(r,sim.position))return {key:'median',text:'越过道路中央分界'};
 const stage=laneStage(r,sim.progress);if(!stage||inJunction(r,sim.position)){sim.examLane=null;return null;}
 const d=lateralPosition(r,sim.position,stage),k=r.scale,section=sectionForPosition(r,sim.position,stage);
 if(sim.mode==='exam'){
  const violation={key:`lane-${stage.id}`,text:'请保持车道，变道前打灯满三秒并观察后方'};
  if(d-.9<section.edges[0]*k-.08||d+.9>section.edges.at(-1)*k+.08)return violation;
  if(section.taper){sim.examLane=null;return null;}
  const lane=laneNumber(r,sim.position,stage),road=`${stage.road}-${stage.direction}-${section.count}`;
  if(sim.examLane?.road!==road)sim.examLane={road,lane,transition:null};
  const state=sim.examLane,prepared=direction=>sim.signalReady(direction)&&sim.time-sim.looks[direction]<=8;
  if(withinLane(r,sim.position,stage,lane)){
   if(lane!==state.lane){state.lane=lane;state.transition=null;state.intent=null;}
   const direction=sim.steer<-.08?'left':sim.steer>.08?'right':null;
   if(direction&&sim.speed>.5&&prepared(direction))state.intent={direction,time:sim.time};
   return null;
  }
  const center=(section.edges[state.lane-1]+section.edges[state.lane])*k/2,direction=d<center?'left':'right',to=state.lane+(direction==='left'?-1:1);
  if(!state.transition&&(prepared(direction)||state.intent?.direction===direction&&sim.time-state.intent.time<=8))state.transition={from:state.lane,to};
  const change=state.transition;
  return change&&to>=1&&to<=section.count&&d-.9>=section.edges[Math.min(change.from,change.to)-1]*k-.08&&d+.9<=section.edges[Math.max(change.from,change.to)]*k+.08?null:violation;
 }
 const lanes=stage.lanes.map(l=>semanticLane(l,section.count));
 const min=section.edges[section.taper?0:Math.min(...lanes)-1]*k,max=section.edges[section.taper?section.count:Math.max(...lanes)]*k;
 if(d-.9<min-.08||d+.9>max+.08)return {key:`lane-${stage.id}`,text:stage.lanes.length===1?`请保持${laneNames[stage.lanes[0]]}，不要压线或驶入其他车道`:'变道时越出允许车道'};
 return null;
}
export function curbGap(route,position){const stage=route.laneStages.at(-1);return sectionForPosition(route,position,stage).edges.at(-1)*route.scale-lateralPosition(route,position,stage)-.9;}

export function parkingOffset(route){return curbGap(route,route.path.at(-1))-.2;}
export function checkDirection(sim,event){
 const stage=laneStage(sim.route,Math.max(0,event.s-1));if(!stage)return true;
 const along=(['N','S'].includes(stage.direction)?sim.position.z:sim.position.x)/sim.route.scale;
 const movement={cross:'straight',left:'left',right:'right',uturn:'uturn'}[event.kind];
 return !movement||allowedMovement(sim.route.id,stage.road,stage.direction,along,laneNumber(sim.route,sim.position,stage),movement);
}
