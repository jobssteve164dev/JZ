export const laneEdges=[3,7,11,15.25];
export const laneNames={1:'内侧车道',2:'中间车道',3:'最右侧车道'};
// Lane numbers are read from the source diagrams; vertex ranges only locate their extent.
const plans={
 1:{stages:[[0,1,0,'N',3],[3,4,2,'E',3],[4,5,2,'E',[3,2,1]],[5,6,2,'E',1],[8,9,1,'N',1],[13,15,1,'S',2],[15,16,1,'S',[2,1]],[16,17,1,'S',1],[17,18,1,'S',[1,2]],[18,19,1,'S',2],[19,20,1,'S',[2,3]],[20,21,1,'S',3],[23,24,4,'W',3],[26,27,0,'N',3]],changes:{2:[3,1,5],7:[2,1,18,2,16],11:[2,3,20]},gap:[1,-318,-264]},
 9:{stages:[[0,1,0,'W',3],[1,2,0,'W',[3,2]],[2,3,0,'W',2],[3,4,0,'W',[2,3]],[4,5,0,'W',3],[7,8,1,'N',3],[8,9,1,'N',[3,2]],[9,10,1,'N',2],[10,11,1,'N',[2,1]],[11,12,1,'N',1],[16,17,1,'S',1],[19,20,0,'E',2],[20,21,0,'E',[2,3]],[21,23,0,'E',3]],changes:{2:[3,2,4,3,2],5:[3,2,9],7:[2,1,11]},gap:[1,-1015,-950],parking:20},
 10:{stages:[[0,1,0,'E',3],[1,2,0,'E',[3,2]],[2,4,0,'E',2],[4,5,0,'E',[2,1]],[5,6,0,'E',1],[8,9,1,'N',1],[13,14,1,'S',2],[14,15,1,'S',[2,1]],[15,16,1,'S',1],[16,17,1,'S',[1,2]],[17,18,1,'S',2],[18,19,1,'S',[2,3]],[19,20,1,'S',3],[22,23,0,'W',3],[23,24,0,'W',[3,2]],[24,25,0,'W',2],[25,26,0,'W',[2,3]],[26,29,0,'W',3]],changes:{1:[3,2,2],3:[2,1,5],9:[2,1,17,2,15],11:[2,3,19],13:[3,2,26,3,24]},gap:[1,-1000,-934]}
};
export function attachLaneRules(route){
 const plan=plans[route.id];
 route.laneStages=plan.stages.map(([a,b,road,direction,lanes],i)=>({id:`${route.id}-${i}`,from:route.path[a].s,to:route.path[b].s,road,direction,lanes:Array.isArray(lanes)?lanes:[lanes]}));
 route.medianGaps=[{road:plan.gap[0],from:plan.gap[1]*route.scale,to:plan.gap[2]*route.scale}];
 for(const [index,[from,to,end,back,returnIndex]]of Object.entries(plan.changes)){
  const e=route.events[index],stage=route.laneStages.find(l=>e.s>=l.from-.01&&e.s<=l.to+.01);
  e.laneChange={from,to,back,road:stage.road,direction:stage.direction};e.endS=route.path[end].s+8;
  if(back)e.returnS=route.path[returnIndex].s;
  e.hint=`先观察后方，打${e.direction==='left'?'左':'右'}灯满 3 秒，从${laneNames[from]}进入${laneNames[to]}。${back?'完成后观察右后方，右灯满 3 秒再返回'+laneNames[back]+'。':'完成后关闭转向灯。'}`;
 }
 route.parkingStart=plan.parking!==undefined?route.path[plan.parking].s-25:route.length-65;
 route.events.at(-1).announceS=route.parkingStart;
}
export function laneStage(route,s){return route.laneStages.find(l=>s>=l.from&&s<=l.to);}
export function lateralPosition(route,position,stage){
 const road=route.roads[stage.road];
 return stage.direction==='N'?position.x-road[0]:stage.direction==='S'?road[0]-position.x:stage.direction==='E'?position.z-road[1]:road[1]-position.z;
}
export function laneNumber(route,position,stage){const d=lateralPosition(route,position,stage)/route.scale;return d<3||d>15.25?0:d<7?1:d<11?2:3;}
export function inJunction(route,p){return route.junctions.some(([x,z])=>Math.abs(p.x-x)<17*route.scale&&Math.abs(p.z-z)<17*route.scale);}
export function medianAt(route,p){
 if(inJunction(route,p))return false;
 return route.roads.some(([x1,z1,x2,z2],road)=>{
  const vertical=x1===x2,along=vertical?p.z:p.x,lateral=vertical?p.x-x1:p.z-z1;
  if(along<Math.min(vertical?z1:x1,vertical?z2:x2)||along>Math.max(vertical?z1:x1,vertical?z2:x2)||Math.abs(lateral)>.9+3*route.scale)return false;
  return !route.medianGaps.some(g=>g.road===road&&along>=g.from&&along<=g.to);
 });
}
export function checkLane(sim){
 const r=sim.route;if(medianAt(r,sim.position))return {key:'median',text:'驶入中央隔离带'};
 const stage=laneStage(r,sim.progress);if(!stage||inJunction(r,sim.position))return null;
 const d=lateralPosition(r,sim.position,stage),k=r.scale;
 const min=laneEdges[Math.min(...stage.lanes)-1]*k,max=laneEdges[Math.max(...stage.lanes)]*k;
 if(d-.9<min-.08||d+.9>max+.08)return {key:`lane-${stage.id}`,text:stage.lanes.length===1?`请保持${laneNames[stage.lanes[0]]}，不要压线或驶入其他车道`:'变道时越出允许车道'};
 return null;
}
export function curbGap(route,position){const stage=route.laneStages.at(-1);return laneEdges[3]*route.scale-lateralPosition(route,position,stage)-.9;}
