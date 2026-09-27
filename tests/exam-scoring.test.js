import test from 'node:test';import assert from 'node:assert/strict';
import {getRoute,at} from '../src/routes.js';import {Simulation} from '../src/simulation.js';
import {updateOvertake,updateMeeting} from '../src/maneuvers.js';import {checkLane} from '../src/lanes.js';
function place(s,p,offset=0){s.progress=p;s.position=at(s.route,p);s.heading=s.position.heading;s.position.x+=Math.cos(s.heading)*offset;s.position.z+=Math.sin(s.heading)*offset;}
for(const id of [1,9,10])for(const kind of ['change','overtake'])test(`${id} ${kind}: correct lanes pass despite a different legal trajectory`,()=>{
 const s=new Simulation(getRoute(id),'exam'),e=s.events.find(e=>e.kind===kind);
 Object.assign(e,{entered:true,checked:true,maxOffset:4,endOffset:1.8,lanesSeen:new Set([e.laneChange.from,e.laneChange.to]),endLane:e.laneChange.back??e.laneChange.to,returnSignal:true});
 s.evaluate(e);assert.equal(e.status,'passed',JSON.stringify(s.faults));
});
for(const id of [1,9,10])test(`${id} overtaking completes off the guide when fully back in original lane`,()=>{
 const s=new Simulation(getRoute(id),'exam'),e=s.events.find(e=>e.kind==='overtake');
 Object.assign(e,{entered:true,checked:true,overtakeEntered:true,travelStart:0,reachedPassingLane:true,returnPrompted:true,returnStarted:true,returnSignal:true,lanesSeen:new Set([e.laneChange.from,e.laneChange.to]),endLane:e.laneChange.back});
 place(s,e.endS-8,.6);s.offset=.6;s.distance=145;updateOvertake(s,e);assert.equal(e.status,'passed',JSON.stringify(s.faults));
});
test('straight driving accepts a steady legal position away from the guide',()=>{
 const s=new Simulation(getRoute(1),'exam'),e=s.events.find(e=>e.kind==='straight');s.events=[e];
 for(let p=e.s-34;p<=e.endS+1;p++){place(s,p,1.65);s.step(.05);}
 assert.equal(e.status,'passed',JSON.stringify(s.faults));
});
test('meeting accepts rightward movement and returning to actual starting position',()=>{
 const s=new Simulation(getRoute(10),'exam'),e=s.events.find(e=>e.kind==='meet');s.events=[e];
 place(s,e.s-34,-.6);s.step(.05);place(s,e.s,-.6);s.step(.05);s.action('look','left');s.action('look','right');s.step(.05,{brake:.5});
 place(s,e.s+1,0);s.step(.05);place(s,e.endS+1,-.6);s.step(.05);
 assert.equal(e.status,'passed',JSON.stringify(s.faults));
});
test('exam allows completing the same lane change earlier within the project area',()=>{
 const s=new Simulation(getRoute(10),'exam'),e=s.events.find(e=>e.kind==='change');s.events=[e];place(s,e.s-10);s.position.z=9*s.route.scale;e.entered=true;
 assert.equal(checkLane(s),null);
});
test('wrong target lane still fails even without guide-distance scoring',()=>{
 const s=new Simulation(getRoute(10),'exam'),e=s.events.find(e=>e.kind==='change');Object.assign(e,{entered:true,lanesSeen:new Set([3]),endLane:3});s.evaluate(e);assert.equal(e.status,'failed');assert.ok(s.faults.some(f=>f.key===`${e.id}-lane`));
});
test('overtaking cannot finish while the vehicle body still straddles a divider',()=>{
 const s=new Simulation(getRoute(9),'exam'),e=s.events.find(e=>e.kind==='overtake');Object.assign(e,{overtakeEntered:true,travelStart:0,returnPrompted:true,returnStarted:true});
 place(s,e.endS-8);s.position.z=-11.2*s.route.scale;s.offset=-1.9;s.distance=140;updateOvertake(s,e);assert.equal(e.status,'pending');
});
test('straight driving still fails genuine weaving even if it ends on the guide',()=>{
 const s=new Simulation(getRoute(1),'exam'),e=s.events.find(e=>e.kind==='straight');s.events=[e];
 place(s,e.s-1,-1);s.step(.05);place(s,e.s,-1);s.step(.05);place(s,e.s+20,1);s.step(.05);place(s,e.endS+1,0);s.step(.05);
 assert.equal(e.status,'failed');assert.ok(s.faults.some(f=>f.key===`${e.id}-line`));
});
test('exam accepts another legal through lane instead of the demonstration lane',()=>{
 const s=new Simulation(getRoute(9),'exam');place(s,30);s.position.z=-9*s.route.scale;assert.equal(checkLane(s),null);
});
test('exam allows an observed and signalled adjacent change outside a demonstration bend',()=>{
 const s=new Simulation(getRoute(9),'exam');place(s,30);assert.equal(checkLane(s),null);
 s.signal='left';s.signalAge=4;s.looks.left=s.time;s.position.z=-11*s.route.scale;assert.equal(checkLane(s),null);
 s.signal='off';s.position.z=-9*s.route.scale;assert.equal(checkLane(s),null);
});
test('exam still rejects crossing a lane divider without preparation',()=>{
 const s=new Simulation(getRoute(9),'exam');place(s,30);checkLane(s);s.position.z=-11*s.route.scale;assert.ok(checkLane(s));
});
test('overtaking can finish before the demonstration return endpoint after a correct return',()=>{
 const s=new Simulation(getRoute(9),'exam'),e=s.events.find(e=>e.kind==='overtake');Object.assign(e,{entered:true,checked:true,overtakeEntered:true,travelStart:0,reachedPassingLane:true,returnPrompted:true,returnStarted:true,returnSignal:true,lanesSeen:new Set([3,2]),endLane:3});
 place(s,e.returnS+12);s.position.z=-13.125*s.route.scale;s.distance=110;updateOvertake(s,e);assert.equal(e.status,'passed');
});
