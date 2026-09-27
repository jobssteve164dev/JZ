import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {getRoute,at} from '../src/routes.js';
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
function meeting(){const s=new Simulation(getRoute(10)),e=s.events.find(e=>e.kind==='meet');s.events=[e];place(s,e.s-34);s.step(.05);return {s,e};}
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
