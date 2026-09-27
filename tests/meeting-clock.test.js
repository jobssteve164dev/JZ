import test from 'node:test';import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';import {getRoute,at} from '../src/routes.js';
function fixture(waitForSpeech=true){
 const s=new Simulation(getRoute(10),'practice',{waitForSpeech}),e=s.events.find(e=>e.kind==='meet');s.events=[e];s.progress=e.s;s.position=at(s.route,e.s);s.heading=s.position.heading;s.step(.05);return {s,e};
}
test('meeting gives five full driving seconds after the queued start instruction finishes',()=>{
 const {s,e}=fixture();s.step(8);
 assert.equal(e.status,'pending','queued or playing start instruction must not consume the five seconds');
 s.promptFinished(`${e.id}-start`);const start=s.time;
 s.step(4.9);assert.equal(e.status,'pending');assert.ok(Math.abs(s.time-start-4.9)<1e-8);
 s.step(.2);assert.equal(e.status,'failed');assert.ok(s.faults.some(f=>f.key===`${e.id}-time`));
});
test('meeting acknowledgements cannot extend the timer and pauses do not spend it',()=>{
 const {s,e}=fixture();s.promptFinished(`${e.id}-prepare`);assert.equal(e.meetingStart,undefined);
 s.promptFinished(`${e.id}-start`);const started=e.meetingStart;s.step(2);
 s.paused=true;s.step(20);s.promptFinished(`${e.id}-start`);assert.equal(e.meetingStart,started);
 s.paused=false;s.step(2.9);assert.equal(e.status,'pending');s.step(.2);assert.equal(e.status,'failed');
});
test('without speech the same meeting timer starts immediately',()=>{
 const {s,e}=fixture(false);s.step(4.9);assert.equal(e.status,'pending');s.step(.2);assert.equal(e.status,'failed');
});
test('overtaking preserves all 150 metres until its start instruction has finished',()=>{
 const s=new Simulation(getRoute(9),'practice',{waitForSpeech:true}),e=s.events.find(e=>e.kind==='overtake');s.events=[e];
 s.progress=e.s;s.position=at(s.route,e.s);s.heading=s.position.heading;s.distance=100;s.step(.05);
 s.distance+=180;s.step(.05);assert.equal(e.status,'pending','speech delay must not spend the overtaking distance');
 s.promptFinished(`${e.id}-start`);const origin=s.distance;
 s.distance+=149.9;s.step(.05);assert.equal(e.status,'pending');
 s.promptFinished(`${e.id}-start`);assert.equal(e.travelStart,origin,'duplicate callbacks must not extend 150m');
 s.distance+=.2;s.step(.05);assert.equal(e.status,'failed');assert.ok(s.faults.some(f=>f.key===`${e.id}-distance`));
});
