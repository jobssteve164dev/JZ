import test from 'node:test';
import assert from 'node:assert/strict';
import {approachProject,approachSpeech,supersedesProject} from '../src/project-voice.js';
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
 const approach=()=>approachProject(s);
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

test('an expired maneuver does not skip an eligible screen-only project',()=>{
 const s=new Simulation(getRoute(10),'exam',{waitForSpeech:true});
 const overtake=s.events.find(e=>e.kind==='overtake');
 const change=s.events.find(e=>e.selfDirected&&e.s>overtake.s);
 s.events=s.events.filter(e=>e.s>=overtake.s);
 for(const e of s.events.filter(e=>e.s>overtake.s&&e.s<change.s))e.status='failed';
 s.progress=change.s-40;s.speed=16.7;overtake.overtakeEntered=true;
 assert.equal(approachProject(s),change);
 assert.equal(approachSpeech(change),null);
});

test('a legal-speed overtake retains its timer and return prompt while there is distance left',()=>{
 const s=new Simulation(getRoute(1),'practice',{waitForSpeech:true});
 const overtake=s.events.find(e=>e.kind==='overtake'),junction=s.events.find(e=>e.kind==='cross');
 s.events=s.events.filter(e=>e.s>=overtake.s);
 s.progress=overtake.endS+1;s.speed=6;s.distance=s.progress;
 Object.assign(overtake,{overtakeEntered:true,travelStart:overtake.s,peakSpeed:21.6});
 assert.ok(s.distance-overtake.travelStart<150&&junction.s-s.progress<80);
 assert.equal(approachProject(s),overtake);
 assert.equal(supersedesProject(s,overtake,junction),false);
});

test('after switching to a new project, a speeding driver never gets the old timer back',()=>{
 for(const mode of ['practice','exam']){
  const s=new Simulation(getRoute(1),mode,{waitForSpeech:true});
  const overtake=s.events.find(e=>e.kind==='overtake'),junction=s.events.find(e=>e.kind==='cross');
  s.events=s.events.filter(e=>e.s>=overtake.s);
  s.progress=overtake.endS+1;s.speed=16.7;
  Object.assign(overtake,{overtakeEntered:true,peakSpeed:60.12});
  assert.equal(approachProject(s),junction);
  junction.status='failed';s.progress=junction.endS+1;s.speed=6;
  const next=s.events.find(e=>e.s>junction.s&&(mode!=='exam'||!e.silent));
  assert.ok(next.s-s.progress>=80);
  assert.equal(approachProject(s),next);
 }
});
