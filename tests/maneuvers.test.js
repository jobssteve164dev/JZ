import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {getRoute,at} from '../src/routes.js';
import {laneNumber} from '../src/lanes.js';
function fixture(id=9){const s=new Simulation(getRoute(id)),e=s.events.find(e=>e.kind==='overtake');s.events=[e];s.progress=e.s;s.position=at(s.route,e.s);s.heading=s.position.heading;s.distance=100;s.signal='left';s.signalAge=4;s.looks.left=0;s.step(.05);return {s,e};}
function place(s,progress){s.progress=progress;s.position=at(s.route,progress);s.heading=s.position.heading;}
test('overtaking cannot run beyond 150 actual travelled metres without returning',()=>{
 const {s,e}=fixture();s.distance+=150.1;s.step(.05);assert.ok(s.faults.some(f=>f.key===`${e.id}-distance`));
});
test('return prompt follows reaching the passing lane, not merely passing a marker',()=>{
 const {s,e}=fixture();place(s,e.returnS+1);s.step(.05);assert.ok(s.prompts?.some(p=>p.text.includes('请返回原车道')));
});
test('entering the original lane before the right signal has held for three seconds fails immediately',()=>{
 const {s,e}=fixture();place(s,e.returnS+1);s.step(.05);place(s,e.endS-8);s.signal='right';s.signalAge=1;s.looks.right=s.time;s.step(.05);
 assert.ok(s.faults.some(f=>f.key===`${e.id}-return-signal`));
});
test('return needs a new right-side observation after the return instruction',()=>{
 const {s,e}=fixture();s.looks.right=s.time;place(s,e.returnS+1);s.step(.05);place(s,e.endS-8);s.signal='right';s.signalAge=4;s.step(.05);
 assert.ok(s.faults.some(f=>f.key===`${e.id}-return-look`));
});
for(const kind of ['left','right','cross'])test(`${kind} junction requires actual braking, not merely coasting slowly`,()=>{
 const s=new Simulation(getRoute(1)),e=s.events.find(e=>e.kind===kind);e.entered=true;e.braked=false;e.lookLeft=e.lookRight=true;e.peakSpeed=15;s.evaluate(e);assert.ok(s.faults.some(f=>f.key===`${e.id}-brake`));
});
function meeting(){const s=new Simulation(getRoute(10)),e=s.events.find(e=>e.kind==='meet');s.events=[e];place(s,e.s-34);s.step(.05);place(s,e.s-.1);s.step(.05);return {s,e};}
test('meeting expires after five seconds, even if the car never reaches the exit',()=>{const {s,e}=meeting();place(s,e.s);s.step(.05);s.step(4.9);assert.equal(e.status,'pending');s.step(.15);assert.ok(s.faults.some(f=>f.key===`${e.id}-time`));assert.equal(e.status,'failed');});
test('meeting countdown does not start on the approach',()=>{const {s,e}=meeting();s.step(6);assert.equal(e.status,'pending');assert.equal(e.meetingStart,undefined);});
test('meeting accepts braking and observation performed after its advance instruction',()=>{
 const {s,e}=meeting();s.action('look','left');s.action('look','right');s.step(.05,{brake:.5});
 place(s,e.s+1);s.position.z+=.6;s.step(.05);assert.equal(e.meetingReady,true);
});
test('meeting exit announces return and does not pass until the car recentres',()=>{const {s,e}=meeting();place(s,e.endS+1);s.position.z+=.6;s.step(.05);assert.ok(s.prompts?.some(p=>p.text.includes('会车结束')));assert.equal(e.status,'pending');});
test('ordinary exam announces overtaking before the signal checkpoint, even while another event is pending',()=>{
 const s=new Simulation(getRoute(9),'exam'),e=s.events.find(e=>e.kind==='overtake');place(s,e.s-79);s.step(.05);
 assert.ok(s.prompts.some(p=>p.text.startsWith('前方超车')));assert.ok(!s.faults.some(f=>f.key.startsWith(e.id)));
 s.action('signal','left');s.action('look','left');s.step(3.2);place(s,e.s);s.step(.05);
 assert.ok(!s.faults.some(f=>f.key===`${e.id}-signal`||f.key===`${e.id}-look`));assert.ok(s.prompts.some(p=>p.text.startsWith('开始超车')));
});
for(const id of [1,9,10])test(`route ${id} overtaking enters only the adjacent passing lane and returns`,()=>{
 const r=getRoute(id),e=r.events.find(e=>e.kind==='overtake'),passing=at(r,e.returnS),finish=at(r,e.endS-8);
 assert.equal(Math.abs(e.laneChange.from-e.laneChange.to),1);
 assert.equal(e.laneChange.back,e.laneChange.from);
 assert.equal(laneNumber(r,passing,e.laneChange),e.laneChange.to);
 assert.equal(laneNumber(r,finish,e.laneChange),e.laneChange.back);
});
for(const id of [1,9,10])test(`route ${id} overtaking fails after entering any lane beyond the adjacent pair`,()=>{
 const s=new Simulation(getRoute(id),'exam'),e=s.events.find(e=>e.kind==='overtake');
 const extra=e.laneChange.to===1?e.laneChange.from+1:e.laneChange.to-1;
 Object.assign(e,{entered:true,returnSignal:true,lanesSeen:new Set([e.laneChange.from,e.laneChange.to,extra]),endLane:e.laneChange.back});
 s.evaluate(e);
 assert.equal(e.status,'failed');assert.ok(s.faults.some(f=>f.key===`${e.id}-lane`));
});
test('route 1 does not announce or start overtaking while meeting is still timed',()=>{
 const s=new Simulation(getRoute(1),'exam'),meeting=s.events.find(e=>e.kind==='meet'),overtake=s.events.find(e=>e.kind==='overtake');
 s.events=[meeting,overtake];place(s,meeting.s-34);s.step(.05);place(s,meeting.s);s.step(.05);
 assert.equal(meeting.meetingEntered,true);
 s.prompts=[];place(s,overtake.s);s.step(.05);
 assert.equal(overtake.prewarned,undefined);assert.equal(overtake.overtakeEntered,undefined);assert.equal(s.prompts.some(p=>p.id.startsWith(overtake.id)),false);
 meeting.status='passed';s.step(.05);
 assert.equal(overtake.prewarned,true);assert.equal(overtake.overtakeEntered,true);
});
test('route 10 starts with an adjacent lane change as four lanes narrow to three',()=>{
 const r=getRoute(10),e=r.events.find(e=>e.kind==='change'),finish=at(r,e.endS-8);
 assert.deepEqual([e.laneChange.from,e.laneChange.to],[4,3]);
 assert.equal(laneNumber(r,finish,e.laneChange),3);
});
test('route 10 stays in the surviving third lane through the full start taper',()=>{
 const r=getRoute(10),e=r.events.find(e=>e.kind==='change'),stage=e.lateralStage??r.laneStages.find(l=>e.s>=l.from&&e.s<=l.to);
 const lanes=new Set();
 for(let s=r.keyPath[1].s;s<=r.keyPath[3].s;s++)lanes.add(laneNumber(r,at(r,s),stage));
 assert.deepEqual([...lanes],[4,3]);
});
