import test from 'node:test';import assert from 'node:assert/strict';
import {getRoute} from '../src/routes.js';import {Simulation} from '../src/simulation.js';
const layout=await import('../src/road-layout.js').catch(()=>({}));
// Counts copied from the original drawings, not from route coordinates or the driver.
const sections=[
 [1,0,'N',180,3],[1,0,'N',35,4],[1,2,'E',-300,2],[1,2,'E',-35,3],[1,4,'W',-180,2],
 [1,1,'N',-140,3],[1,1,'N',-270,5],[1,1,'S',-40,5],[1,1,'S',40,4],[1,1,'S',180,3],[1,1,'S',290,3],[1,1,'S',620,5],
 [9,0,'W',650,3],[9,0,'W',35,5],[9,1,'N',-35,4],[9,1,'N',-180,3],[9,1,'N',-940,3],[9,1,'N',-1030,5],[9,1,'S',-480,3],[9,1,'S',-35,5],[9,0,'E',35,3],
 [10,0,'E',-550,4],[10,0,'E',-35,5],[10,1,'N',-35,4],[10,1,'N',-180,3],[10,1,'N',-935,3],[10,1,'N',-1020,5],[10,1,'S',-35,5],[10,0,'W',-35,4],[10,0,'W',-180,3]
];
for(const [id,road,dir,along,count]of sections)test(`image ${id} road ${road} ${dir}@${along}: ${count} real lanes`,()=>{
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
test('outer edge belongs to the last lane and positions beyond it are outside the road',async()=>{
 const {laneNumber}=await import('../src/lanes.js'),r=getRoute(1),stage={road:0,direction:'N'},k=r.scale;
 assert.equal(laneNumber(r,{x:(-380+12.4)*k,z:40*k},stage),4);
 assert.equal(laneNumber(r,{x:(-380+12.6)*k,z:40*k},stage),0);
});
const redistributedFourLaneSections=[
 ['route 1 starting approach',1,0,'N',35,180,[.25,3.25,6.25,9.25,12.5]],
 ['route 1 southbound exit',1,1,'S',40,180,[3,6,9,12,15.25]],
 ['route 9 northbound exit',9,1,'N',-35,-180,[3,6,9,12,15.25]],
 ['route 9 opposite U-turn side',9,1,'S',-1030,-940,[3,6,9,12,15.25]],
 ['route 10 starting road',10,0,'E',-550,-400,[3,6,9,12,15.25]],
 ['route 10 northbound exit',10,1,'N',-35,-180,[3,6,9,12,15.25]],
 ['route 10 opposite U-turn side',10,1,'S',-1030,-935,[3,6,9,12,15.25]],
 ['route 10 return exit',10,0,'W',-35,-180,[3,6,9,12,15.25]]
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
 ['route 10 westbound return side',10,0,'W',-40,40,15.25],
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
 for(const [road,direction,along]of [[0,'E',-450],[1,'N',-70],[0,'W',-100]]){
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
 ['route 10 starting road',10,0,'E',-490,-450,-410,'outer'],
 ['route 10 northbound approach',10,1,'N',80,110,140,'inner'],
 ['route 10 northbound exit',10,1,'N',-40,-70,-100,'outer'],
 ['route 10 opposite U-turn side',10,1,'S',-1022,-1012,-1002,'inner'],
 ['route 10 return exit',10,0,'W',-60,-100,-140,'outer']
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
test('route 10 shared start and finish road redistributes four lanes into three within one road width',()=>{
 const start=layout.roadSection(10,0,'E',-550),afterStart=layout.roadSection(10,0,'E',-400);
 const finish=layout.roadSection(10,0,'W',-60),afterFinish=layout.roadSection(10,0,'W',-180);
 assert.equal(start.count,4);assert.equal(afterStart.count,3);
 assert.equal(finish.count,4);assert.equal(afterFinish.count,3);
 assert.equal(start.edges.at(-1),afterStart.edges.at(-1));
 assert.equal(finish.edges.at(-1),afterFinish.edges.at(-1));
 assert.ok(start.edges[1]-start.edges[0]<afterStart.edges[1]-afterStart.edges[0]);
 assert.ok(finish.edges[1]-finish.edges[0]<afterFinish.edges[1]-afterFinish.edges[0]);
});
test('route 10 start taper redistributes every lane without moving either road edge',()=>{
 const full=layout.roadSection(10,0,'E',-510),taper=layout.roadSection(10,0,'E',-450);
 assert.deepEqual(full.edges,[3,6,9,12,15.25]);
 assert.deepEqual(taper.edges,[3,6.5,10,13.625,15.25]);
});
test('route 10 outbound four-to-three tapers all redistribute lane widths within fixed road edges',()=>{
 const tapers=[[0,'E',-450],[1,'N',-70],[0,'W',-100]];
 for(const [road,direction,along]of tapers){
  const section=layout.roadSection(10,road,direction,along);
  assert.equal(section.count,4);
  assert.equal(section.blend,.5);
  assert.deepEqual(section.edges,[3,6.5,10,13.625,15.25],`${direction}bound taper changed the road width`);
 }
});
test('route 10 vehicle starts inside an established four-lane section',()=>{
 const r=getRoute(10),start=r.path[0],along=start.x/r.scale,lateral=start.z/r.scale;
 assert.deepEqual(layout.roadSection(10,0,'E',-600).edges,[3,6,9,12,15.25]);
 for(const end of [along-2.2/r.scale,along,along+2.2/r.scale])assert.equal(layout.roadSection(10,0,'E',end).count,4);
 const section=layout.roadSection(10,0,'E',along);assert.ok(lateral>section.edges[3]&&lateral<section.edges[4]);
});
