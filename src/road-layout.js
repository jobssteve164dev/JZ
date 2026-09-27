// Distances are schematic. Counts and arrow rows are transcribed separately from the diagrams.
const sign=d=>['N','W'].includes(d)?-1:1;
const S=['straight'],L=['left'],R=['right'],SU=['straight','uturn'],SR=['straight','right'];
const profiles={
 1:{two:[2,3,4],yellow:[0,2,3,4],zones:[
  [0,'N',0,'in',4,140,85],[2,'E',0,'in',3,190,120],[2,'W',0,'in',3,130,90],
  [1,'N',-300,'in',5,110,75],[1,'S',0,'in',5,150,105],[1,'S',0,'out',4,140,65],
  [1,'S',660,'in',5,170,100]
 ],bands:[[1,'N',-360,-300,5]],rows:[
  [0,'N',160,[L,L,R]],[0,'N',70,[L,L,R,R]],[0,'N',40,[L,L,R,R]],
  [0,'S',290,[['straight','left'],S,SR]],[0,'N',370,[['straight','left'],S,SR]],
  [0,'S',620,[L,S,R]], [2,'E',-255,[L,SR]],[2,'E',-80,[L,S,R]],[2,'E',-40,[L,S,R]],
  [2,'W',-340,[L,S]],[2,'W',40,[L,S,R]],[4,'W',-340,[S,R]],[4,'E',-40,[L,S]],
  [1,'N',-260,[SU,S,S,S,null]],[1,'N',-40,[S,S,S]],
  [1,'S',-85,[SU,S,S,S,R]],[1,'S',-40,[L,S,S,S,R]],[1,'S',40,[S,S,S,S]],
  [1,'S',290,[S,S,R]],[1,'S',610,[S,S,S,S,R]], [1,'N',370,[S,S,S]],
  [1,'N',700,[S,S,S]]
 ]},
 9:{two:[],yellow:[],zones:[
  [0,'W',0,'in',5,160,105],[0,'E',0,'in',5,150,95],[1,'S',0,'in',5,160,105],
  [1,'N',0,'in',4,140,80],[1,'N',0,'out',4,100,40]
 ],bands:[[1,'N',-1060,-1006,5],[1,'S',-1060,-1006,4]],rows:[
  [0,'W',85,[SU,S,S,S,SR]],[0,'W',40,[L,S,S,S,SR]],[0,'E',-85,[SU,S,S,S,R]],[0,'E',-40,[L,S,S,S,R]],
  [0,'E',40,[S,S,S]],[0,'W',-40,[S,S,S]],
  [1,'S',-85,[SU,S,S,S,R]],[1,'S',-40,[L,S,S,S,R]],[1,'N',40,[L,S,S,S]],
  [1,'N',-35,[S,S,S,S]],[1,'S',35,[S,S,S]],
  [1,'N',-940,[L,L,null]],[1,'N',-410,[S,S,S]],[1,'S',-490,[S,S,S]]
 ]},
 10:{two:[],yellow:[],zones:[
  [0,'E',0,'in',5,180,110],[0,'W',0,'in',5,150,100],[1,'S',0,'in',5,160,105],
  [1,'N',0,'in',4,140,80],[1,'N',0,'out',4,100,40],[0,'W',0,'out',4,140,60]
 ],bands:[[1,'N',-1040,-1002,5],[1,'S',-1040,-1002,4]],rows:[
  [0,'E',-85,[SU,S,S,S,R]],[0,'E',-40,[L,S,S,S,R]],[0,'W',85,[SU,S,S,S,R]],[0,'W',40,[L,S,S,S,R]],
  [0,'W',-35,[S,S,S,S]],[0,'E',35,[S,S,S]],
  [1,'S',-85,[SU,S,S,S,R]],[1,'S',-40,[L,S,S,S,R]],[1,'N',40,[L,S,S,S]],
  [1,'N',-35,[S,S,S,S]],[1,'S',35,[S,S,S]],
  [1,'N',-925,[L,L,null]],[1,'N',-390,[S,S,S]],[1,'S',-470,[S,S,S]]
 ]}
};
const edgesFor=(count,median)=>Array.from({length:count+1},(_,i)=>median+4*i+(i===count?.25:0));
export function roadSection(id,road,direction,along){
 const p=profiles[id],base=p.two.includes(road)?2:3,median=p.yellow.includes(road)?.25:3;
 let count=base,blend=0,approach=null;
 for(const [r,d,at,kind,n,start,full]of p.zones){
  if(r!==road||d!==direction)continue;
  const distance=(kind==='in'?at-along:along-at)*sign(d);
  if(distance>=0&&distance<start){count=n;blend=Math.min(1,(start-distance)/(start-full));if(kind==='in')approach={start,distance};break;}
 }
 for(const [r,d,from,to,n]of p.bands)if(r===road&&d===direction&&along>=from&&along<=to){count=n;blend=id===1?1:Math.min(1,(to-along)/20);}
 const baseEdges=edgesFor(base,median),target=edgesFor(count,median);
 let edges=target;
 if(count!==base&&blend<1){
  // Added lanes branch from existing boundaries instead of appearing across the whole road.
  const start=count-base===2?[baseEdges[0],...baseEdges,baseEdges.at(-1)]:[baseEdges[0],...baseEdges];
  edges=target.map((v,i)=>start[i]+(v-start[i])*blend);
 }
 return {edges,count,base,median,blend,approach,taper:count!==base&&blend<1};
}
export function semanticLane(lane,count){return lane===1?1:lane===3?count:Math.ceil(count/2);}
export function laneCenter(section,lane){
 const mapped=semanticLane(lane,section.count),target=(section.edges[mapped-1]+section.edges[mapped])/2;
 if(section.taper){
  const base=edgesFor(section.base,section.median),n=semanticLane(lane,section.base);
  const from=(base[n-1]+base[n])/2,to=(edgesFor(section.count,section.median)[mapped-1]+edgesFor(section.count,section.median)[mapped])/2;
  return from+(to-from)*section.blend;
 }
 return target;
}
export function roadArrows(id){return profiles[id].rows.flatMap(([road,direction,along,lanes])=>lanes.flatMap((turns,i)=>turns?[{road,direction,along,lane:i+1,turns}]:[]));}
export function allowedMovement(id,road,direction,along,lane,movement){
 const rows=profiles[id].rows.filter(r=>r[0]===road&&r[1]===direction&&Math.abs(r[2]-along)<25);
 if(!rows.length)return true;
 const row=rows.sort((a,b)=>Math.abs(a[2]-along)-Math.abs(b[2]-along))[0],turns=row[3][lane-1];
 return !turns||turns.includes(movement)||(movement==='uturn'&&turns.includes('left'));
}
export function roadCoordinates(route,road,direction,along,lateral){
 const r=route.roads[road],k=route.scale;
 return direction==='N'?{x:r[0]+lateral*k,z:along*k}:direction==='S'?{x:r[0]-lateral*k,z:along*k}:direction==='E'?{x:along*k,z:r[1]+lateral*k}:{x:along*k,z:r[1]-lateral*k};
}
export function sectionForPosition(route,position,stage){return roadSection(route.id,stage.road,stage.direction,(stage.direction==='N'||stage.direction==='S'?position.z:position.x)/route.scale);}
export function remapRoadPoint(spec,id,point,axis=null){
 const result={...point};
 for(const [road,r]of spec.roads.entries()){
  const vertical=r[0]===r[2],along=vertical?point.z:point.x,lateral=vertical?point.x-r[0]:point.z-r[1];
  if(axis&&axis!==(vertical?'x':'z'))continue;
  if(along<Math.min(vertical?r[1]:r[0],vertical?r[3]:r[2])-20||along>Math.max(vertical?r[1]:r[0],vertical?r[3]:r[2])+20||Math.abs(lateral)>15.5||Math.abs(lateral)<3)continue;
  const direction=vertical?(lateral>0?'N':'S'):(lateral>0?'E':'W');
  const center=a=>{
   const section=roadSection(id,road,direction,a),d=Math.abs(lateral),values=[section.median,laneCenter(section,1),laneCenter(section,2),laneCenter(section,3),section.edges.at(-1)],keys=[3,5,9,13,15.25];
   let i=1;while(i<4&&d>keys[i])i++;const t=(d-keys[i-1])/(keys[i]-keys[i-1]);return values[i-1]+(values[i]-values[i-1])*t;
  };
  let value=center(along);
  const crossing=spec.junctions.find(([x,z])=>Math.abs((vertical?x:z)-(vertical?r[0]:r[1]))<.01&&Math.abs(along-(vertical?z:x))<30);
  if(crossing){const j=vertical?crossing[1]:crossing[0];value=center(j-30)+(center(j+30)-center(j-30))*(along-j+30)/60;}
  result[vertical?'x':'z']=(vertical?r[0]:r[1])+Math.sign(lateral)*value;
 }
 return result;
}
export function junctionBounds(route,x,z){
 let left=17,right=17,top=17,bottom=17;
 route.roads.forEach((r,i)=>{
  if(r[0]===r[2]&&Math.abs(r[0]-x)<.01){left=Math.max(...[-30,30].map(d=>roadSection(route.id,i,'S',z/route.scale+d).edges.at(-1)))+2;right=Math.max(...[-30,30].map(d=>roadSection(route.id,i,'N',z/route.scale+d).edges.at(-1)))+2;}
  if(r[1]===r[3]&&Math.abs(r[1]-z)<.01){top=Math.max(...[-30,30].map(d=>roadSection(route.id,i,'W',x/route.scale+d).edges.at(-1)))+2;bottom=Math.max(...[-30,30].map(d=>roadSection(route.id,i,'E',x/route.scale+d).edges.at(-1)))+2;}
 });return {left:left*route.scale,right:right*route.scale,top:top*route.scale,bottom:bottom*route.scale};
}
