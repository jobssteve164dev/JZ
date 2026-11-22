import test from 'node:test';
import assert from 'node:assert/strict';
import {approachProject,approachSpeech} from '../src/project-voice.js';
import {getRoute,at} from '../src/routes.js';
import {Simulation} from '../src/simulation.js';

for(const [id,announced,silent] of [[1,[11],[2]],[9,[5],[7]],[10,[1],[3,11,13]]]){
 test(`route ${id}: only the lane changes marked self-directed in the reference skip voice`,()=>{
  const events=getRoute(id).events;
  assert.deepEqual(events.filter(event=>event.kind==='change').map(event=>+event.id.split('-')[1]),[...announced,...silent].sort((a,b)=>a-b));
  for(const index of announced)assert.equal(approachSpeech(events[index]),'前方变更车道');
  for(const index of silent)assert.equal(approachSpeech(events[index]),null);
  const turn=events.find(event=>['left','right'].includes(event.kind));
  assert.equal(approachSpeech(turn),`前方${turn.label}`);
 });
}

test('projects with dedicated or intentionally silent prompts do not get a generic approach announcement',()=>{
 for(const kind of ['start','meet','overtake'])assert.equal(approachSpeech({kind,label:'不应播报',silent:false}),null);
 assert.equal(approachSpeech({kind:'school',label:'学校区域',silent:true}),null);
});

test('an unfinished overtake cannot mute the next junction when a speeding driver reaches it',()=>{
 const s=new Simulation(getRoute(1),'exam',{waitForSpeech:true});
 const overtake=s.events.find(e=>e.kind==='overtake');
 const next=s.events.find(e=>e.kind==='cross');
 s.events=s.events.filter(e=>e.s>=overtake.s);
 s.progress=overtake.s-5;s.position=at(s.route,s.progress);s.heading=s.position.heading;
 s.started=true;s.belt=true;s.gear='D';s.handbrake=false;s.speed=16.7;
 const approach=()=>approachProject(s,s.next);
 for(let i=0;i<200&&s.progress<=overtake.endS;i++){
  assert.equal(approach(),overtake,'the overtaking instruction has priority in its own area');
  s.step(.05,{throttle:1});
 }
 assert.ok(s.progress>overtake.endS);
 assert.ok(s.faults.some(f=>f.key==='speed'));
 assert.equal(overtake.status,'pending','overtaking must retain its original assessment window');
 assert.equal(overtake.travelStart,undefined,'the delayed start signal must not spend any of the 150 metres');
 assert.equal(approach(),next);
 assert.equal(approachSpeech(approach()),'前方路口直行');
});
