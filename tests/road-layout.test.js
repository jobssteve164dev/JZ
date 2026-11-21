import test from 'node:test';import assert from 'node:assert/strict';
import {getRoute} from '../src/routes.js';import {Simulation} from '../src/simulation.js';
const layout=await import('../src/road-layout.js').catch(()=>({}));
// Counts copied from the original drawings, not from route coordinates or the driver.
const sections=[
 [1,0,'N',180,3],[1,0,'N',35,4],[1,2,'E',-300,2],[1,2,'E',-35,3],[1,4,'W',-180,2],
 [1,1,'N',-140,3],[1,1,'N',-270,5],[1,1,'S',-40,5],[1,1,'S',40,4],[1,1,'S',180,3],[1,1,'S',290,3],[1,1,'S',620,5],
 [9,0,'W',650,3],[9,0,'W',35,5],[9,1,'N',-35,4],[9,1,'N',-180,3],[9,1,'N',-940,3],[9,1,'N',-1030,5],[9,1,'S',-480,3],[9,1,'S',-35,5],[9,0,'E',35,3],
 [10,0,'E',-550,3],[10,0,'E',-35,5],[10,1,'N',-35,4],[10,1,'N',-180,3],[10,1,'N',-935,3],[10,1,'N',-1020,5],[10,1,'S',-35,5],[10,0,'W',-35,3],[10,0,'W',-180,3]
];
for(const [id,road,dir,along,count]of sections)test(`image ${id} road ${road} ${dir}@${along}: ${count} travel lanes`,()=>{
 assert.equal(typeof layout.roadSection,'function','missing variable road cross-section');
 const section=layout.roadSection(id,road,dir,along);assert.equal(section.edges.length-1,count);assert.ok(section.edges.every((n,i,a)=>!i||n>a[i-1]));
});
test('one starting T approach paints two left and two right arrows; first east road distinguishes two and three lanes',()=>{
 assert.equal(typeof layout.roadArrows,'function','missing directional road markings');
 const a=layout.roadArrows(1);const row=(road,dir,along)=>a.filter(a=>a.road===road&&a.direction===dir&&a.along===along).map(a=>a.turns);
 assert.deepEqual(row(0,'N',40),[['left'],['left'],['right'],['right']]);
 assert.deepEqual(row(2,'E',-255),[['left'],['straight','right']]);
 assert.deepEqual(row(2,'E',-40),[['left'],['straight'],['right']]);
});
test('9 and 10 paint U-turn opening and stop-line arrows at separate positions',()=>{
 assert.equal(typeof layout.roadArrows,'function');
 for(const id of [9,10]){const a=layout.roadArrows(id).filter(a=>a.road===1&&a.direction==='S'&&a.lane===1);
 assert.ok(a.some(a=>a.along===-85&&a.turns.join()==='straight,uturn'));assert.ok(a.some(a=>a.along===-40&&a.turns.join()==='left'));
 }
});
test('the approach rules reject going straight from a right-only lane',()=>{
 assert.equal(typeof layout.allowedMovement,'function');
 assert.equal(layout.allowedMovement(1,0,'N',40,4,'straight'),false);
 assert.equal(layout.allowedMovement(1,0,'N',40,4,'right'),true);
 assert.equal(layout.allowedMovement(9,1,'S',-40,1,'left'),true);
});
test('one starts signaling for the turn before its three lanes split into four',async()=>{
 const {LearningDriver}=await import('../src/learning.js'),s=new Simulation(getRoute(1),'learn'),d=new LearningDriver(s,()=>{});
 while(s.position.z/s.route.scale>135)d.step(.05);
 assert.equal(s.signal,'right');assert.ok(s.signalAge>=3,'turn signal must precede entry into the new turn lane');
});
test('actual driving evaluation rejects the T-junction right turn from a left-only lane',()=>{
 const s=new Simulation(getRoute(1)),e=s.events.find(e=>e.kind==='right'),k=s.route.scale;
 Object.assign(s,{belt:true,gear:'D',handbrake:false,signal:'right',signalAge:4,speed:2,heading:0,progress:e.s-.1});
 s.position={x:(-380+2.25)*k,z:35*k};s.step(.1);
 assert.ok(s.faults.some(f=>f.key===`${e.id}-arrow`),JSON.stringify(s.faults));
});
test('drawn pre-junction U-turn arrows have a physical opening in the median',async()=>{
 const {medianAt}=await import('../src/lanes.js');
 for(const id of [1,9,10]){const r=getRoute(id);assert.equal(medianAt(r,{x:0,z:-70*r.scale}),false,`route ${id} opening is blocked`);}
});
test('route 1 parking lane stays outside the numbered junction travel lanes',async()=>{
 const {laneNumber}=await import('../src/lanes.js'),r=getRoute(1),stage={road:0,direction:'N'},k=r.scale;
 assert.equal(laneNumber(r,{x:(-380+12.4)*k,z:40*k},stage),4);
 assert.equal(laneNumber(r,{x:(-380+12.6)*k,z:40*k},stage),0);
});
test('route 1 keeps a separate parking lane outside three ordinary and four junction travel lanes',()=>{
 const ordinary=layout.roadSection(1,0,'N',180),junction=layout.roadSection(1,0,'N',40);
 assert.equal(ordinary.count,3);assert.deepEqual(ordinary.edges,[.25,4.25,8.25,12.5]);
 assert.deepEqual(ordinary.parking,{inner:12.5,outer:15.5});
 assert.deepEqual(ordinary.roadEdges,[.25,4.25,8.25,12.5,15.5]);
 assert.equal(junction.count,4);assert.deepEqual(junction.edges,[.25,3.25,6.25,9.25,12.5]);
 assert.deepEqual(junction.parking,{inner:12.5,outer:15.5});
 assert.deepEqual(junction.roadEdges,[.25,3.25,6.25,9.25,12.5,15.5]);
 assert.equal(layout.roadArrows(1).filter(a=>a.road===0&&a.direction==='N'&&a.along===40).length,4);
 assert.deepEqual([180,174,168].map(a=>layout.roadSection(1,0,'N',a).parkingBlend),[1,.5,0]);
 assert.deepEqual([555,530,505].map(a=>layout.roadSection(1,0,'N',a).parkingBlend),[0,.5,1]);
});
test('route 1 begins and finishes in the parking lane without numbering it as a travel lane',async()=>{
 const {laneNumber,laneStage,lateralPosition,curbGap,parkingOffset}=await import('../src/lanes.js'),{at}=await import('../src/routes.js'),r=getRoute(1);
 for(const [point,progress]of [[r.path[0],0],[r.path.at(-1),r.length]]){
  const stage=laneStage(r,progress),section=layout.sectionForPosition(r,point,stage);
  assert.deepEqual(section.parking,{inner:12.5,outer:15.5});
  const d=lateralPosition(r,point,stage)/r.scale;
  assert.ok(d>section.parking.inner+.9&&d<section.parking.outer-.9);
  assert.equal(laneNumber(r,point,stage),0);
 }
 assert.ok(Math.abs(curbGap(r,r.path.at(-1))-(1.5*r.scale-.9))<1e-9);
 const target=at(r,r.length),offset=parkingOffset(r);target.x+=Math.cos(target.heading)*offset;target.z+=Math.sin(target.heading)*offset;
 assert.ok(Math.abs(curbGap(r,target)-.1)<.005,'parking target must finish about 10 cm from the physical curb');
});
const redistributedFourLaneSections=[
 ['route 1 starting approach',1,0,'N',35,180,[.25,3.25,6.25,9.25,12.5]],
 ['route 1 southbound exit',1,1,'S',40,180,[3,6,9,12,15.25]],
 ['route 9 northbound exit',9,1,'N',-35,-180,[3,6,9,12,15.25]],
 ['route 9 opposite U-turn side',9,1,'S',-1030,-940,[3,6,9,12,15.25]],
 ['route 10 northbound exit',10,1,'N',-35,-180,[3,6,9,12,15.25]],
 ['route 10 opposite U-turn side',10,1,'S',-1030,-935,[3,6,9,12,15.25]],
];
const connectedJunctionSections=[
 ['route 1 first southbound exit',1,1,'S',-40,40,15.25],
 ['route 1 first eastbound road',1,2,'E',-40,40,8.5],
 ['route 1 first westbound road',1,2,'W',-40,40,8.5],
 ['route 1 final southbound approach',1,1,'S',620,700,15.25],
 ['route 9 eastbound side',9,0,'E',-40,40,15.25],
 ['route 9 westbound side',9,0,'W',-40,40,15.25],
 ['route 9 southbound side',9,1,'S',-40,40,15.25],
 ['route 10 eastbound side',10,0,'E',-40,40,15.25],
 ['route 10 southbound side',10,1,'S',-40,40,15.25]
];
for(const [name,id,road,direction,before,after,outerEdge]of connectedJunctionSections)test(`${name} keeps its road edge connected through the junction`,()=>{
 const first=layout.roadSection(id,road,direction,before),second=layout.roadSection(id,road,direction,after);
 assert.notEqual(first.count,second.count);
 assert.equal(first.edges.at(-1),outerEdge);
 assert.equal(second.edges.at(-1),outerEdge);
});
for(const [name,id,road,direction,fourAt,threeAt,want]of redistributedFourLaneSections)test(`${name} keeps one road width while redistributing three and four lanes`,()=>{
 const four=layout.roadSection(id,road,direction,fourAt),three=layout.roadSection(id,road,direction,threeAt);
 assert.deepEqual(four.edges,want);
 assert.equal(four.edges[0],three.edges[0]);
 assert.equal(four.edges.at(-1),three.edges.at(-1));
 assert.notEqual(four.edges[1]-four.edges[0],three.edges[1]-three.edges[0]);
});
test('four-to-three taper moves every divider while keeping both road edges fixed',()=>{
 for(const [road,direction,along]of [[1,'N',-70]]){
  const section=layout.roadSection(10,road,direction,along);
  assert.equal(section.blend,.5);
  assert.deepEqual(section.edges,[3,6.5,10,13.625,15.25]);
 }
});
const threeFourTransitions=[
 ['route 1 starting approach',1,0,'N',85,112.5,140,'inner'],
 ['route 1 southbound exit',1,1,'S',65,102.5,140,'inner'],
 ['route 9 northbound approach',9,1,'N',80,110,140,'inner'],
 ['route 9 northbound exit',9,1,'N',-40,-70,-100,'inner'],
 ['route 9 opposite U-turn side',9,1,'S',-1026,-1016,-1006,'inner'],
 ['route 10 northbound approach',10,1,'N',80,110,140,'inner'],
 ['route 10 northbound exit',10,1,'N',-40,-70,-100,'outer'],
 ['route 10 opposite U-turn side',10,1,'S',-1022,-1012,-1002,'inner'],
];
for(const [name,id,road,direction,fourAt,midAt,threeAt,anchor]of threeFourTransitions)test(`${name} keeps fixed road edges through its complete three-four transition`,()=>{
 const four=layout.roadSection(id,road,direction,fourAt),mid=layout.roadSection(id,road,direction,midAt),three=layout.roadSection(id,road,direction,threeAt);
 assert.equal(four.count,4);assert.equal(four.blend,1);
 assert.equal(mid.count,4);assert.equal(mid.blend,.5);
 assert.equal(three.count,3);assert.equal(three.blend,0);
 assert.equal(four.edges[0],three.edges[0]);assert.equal(four.edges.at(-1),three.edges.at(-1));
 assert.equal(mid.edges[0],three.edges[0]);assert.equal(mid.edges.at(-1),three.edges.at(-1));
 const start=anchor==='outer'?[...three.edges,three.edges.at(-1)]:[three.edges[0],...three.edges];
 assert.deepEqual(mid.edges,four.edges.map((edge,i)=>(start[i]+edge)/2));
 for(let i=1;i<four.edges.length-1;i++){
  assert.notEqual(mid.edges[i],start[i]);
  assert.notEqual(mid.edges[i],four.edges[i]);
 }
 const fourWidths=four.edges.slice(1).map((edge,i)=>edge-four.edges[i]);
 const threeWidths=three.edges.slice(1).map((edge,i)=>edge-three.edges[i]);
 assert.ok(Math.max(...fourWidths)<Math.min(...threeWidths));
});
test('route 1 middle lane stays centred between moving dividers throughout its four-to-three exit',()=>{
 for(let blend=.05;blend<1;blend+=.05){
  const along=140-blend*75,section=layout.roadSection(1,1,'S',along),center=layout.laneCenter(section,2);
  assert.ok(section.edges.every((edge,i)=>!i||Math.abs(center-edge)>.9),`centre ${center} touches a divider at blend ${section.blend}`);
 }
});
test('route 10 adds short bays outside three continuous travel lanes',()=>{
 for(const [direction,along] of [['E',[-550,-473,-400]],['W',[-60,-155,-180]]]){
  const [bay,taper,main]=along.map(position=>layout.roadSection(10,0,direction,position));
  for(const section of [bay,taper,main])assert.deepEqual(section.edges,[3,7,11,15.25]);
  assert.deepEqual(bay.parking,{inner:15.25,outer:18.5});
  assert.ok(taper.parking?.outer>15.25&&taper.parking.outer<18.5);
  assert.equal(main.parking,null);
 }
 assert.equal(layout.roadSection(10,0,'E',-620).parking,null);
});
test('route 10 starts in the eastbound bay and uses the westbound bay after its right turn',()=>{
 const r=getRoute(10);
 for(const [point,direction] of [[r.path[0],'E'],[r.keyPath[22],'W']]){
  const {parking}=layout.roadSection(10,0,direction,point.x/r.scale),lateral=Math.abs(point.z)/r.scale;
  assert.ok(parking&&lateral>parking.inner+.9&&lateral<parking.outer-.9);
 }
});
