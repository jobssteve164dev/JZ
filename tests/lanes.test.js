import test from 'node:test';import assert from 'node:assert/strict';
import {getRoute} from '../src/routes.js';import {Simulation} from '../src/simulation.js';
// Transcribed from the original image lane positions, independently of the driving path.
const fixtures=[
 [1,'start',0,'x',-367],[1,'change',0,'z',13],[1,'straight',0,'x',5],[1,'meet',0,'x',-9],[1,'bus',0,'z',647],
 [9,'start',0,'z',-13],[9,'school',0,'x',13],[9,'bus',0,'x',5],[9,'cross',1,'x',-5],[9,'meet',0,'z',9],
 [10,'start',0,'z',13],[10,'meet',0,'z',9],[10,'school',0,'x',5],[10,'bus',0,'x',5],[10,'straight',0,'z',-13]
];
for(const [id,kind,n,axis,value] of fixtures)test(`source image ${id} ${kind}/${n} uses the drawn lane`,()=>{
 const r=getRoute(id),e=r.events.filter(e=>e.kind===kind)[n];assert.ok(Math.abs(e.point[axis]/r.scale-value)<.1,`${e.point[axis]/r.scale} != ${value}`);
});
function movingStart(z){const s=new Simulation(getRoute(9));s.belt=true;s.gear='D';s.handbrake=false;s.signal='left';s.signalAge=4;s.looks.left=0;s.position.z=z*s.route.scale;s.speed=2;return s;}
test('a car in the adjacent lane fails even while close to the reference route',()=>{const s=movingStart(-9);s.step(.1);assert.ok(s.faults.some(f=>f.key.startsWith('lane-')),JSON.stringify(s.faults));});
test('car body straddling a lane divider outside a change zone is detected',()=>{const s=movingStart(-11);s.step(.1);assert.ok(s.faults.some(f=>f.key.startsWith('lane-')),JSON.stringify(s.faults));});
test('driving through the physical median is detected independently of progress',()=>{const s=movingStart(0);s.step(.1);assert.ok(s.faults.some(f=>f.key==='median'),JSON.stringify(s.faults));});
test('lane-change assessment cannot pass by signaling without reaching the required lane',()=>{
 const s=new Simulation(getRoute(9)),e=s.events.find(e=>e.kind==='change');Object.assign(e,{entered:true,checked:true,startOffset:0,endOffset:0,maxOffset:0,lanesSeen:new Set([3]),endLane:3});s.evaluate(e);assert.equal(e.status,'failed');
});
