import test from 'node:test';import assert from 'node:assert/strict';
import {getRoute} from '../src/routes.js';import {Simulation} from '../src/simulation.js';
const layout=await import('../src/road-layout.js').catch(()=>({}));
// Counts copied from the original drawings, not from route coordinates or the driver.
const sections=[
 [1,0,'N',180,3],[1,0,'N',35,4],[1,2,'E',-300,2],[1,2,'E',-35,3],[1,4,'W',-180,2],
 [1,1,'N',-140,3],[1,1,'N',-270,5],[1,1,'S',-40,5],[1,1,'S',40,4],[1,1,'S',180,3],[1,1,'S',290,3],[1,1,'S',620,5],
 [9,0,'W',650,3],[9,0,'W',35,5],[9,1,'N',-35,4],[9,1,'N',-180,3],[9,1,'N',-940,3],[9,1,'N',-1030,5],[9,1,'S',-480,3],[9,1,'S',-35,5],[9,0,'E',35,3],
 [10,0,'E',-550,3],[10,0,'E',-35,5],[10,1,'N',-35,4],[10,1,'N',-180,3],[10,1,'N',-935,3],[10,1,'N',-1020,5],[10,1,'S',-35,5],[10,0,'W',-35,4],[10,0,'W',-180,3]
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
 assert.equal(laneNumber(r,{x:(-380+16.5)*k,z:40*k},stage),4);
 assert.equal(laneNumber(r,{x:(-380+16.6)*k,z:40*k},stage),0);
});
