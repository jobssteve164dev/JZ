import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {getRoute} from '../src/routes.js';
const m=await import('../src/learning.js').catch(()=>({}));
for(const id of [1,9,10])test(`follow learning drives route ${id}, teaches every point and parks`,()=>{
 assert.equal(typeof m.LearningDriver,'function','missing follow learning driver');
 const s=new Simulation(getRoute(id),'learn'),spoken=[];
 const driver=new m.LearningDriver(s,text=>spoken.push(text));
 s.paused=true;driver.step(2);assert.equal(s.time,0);assert.equal(spoken.length,0);s.paused=false;
 const checkpoint=id===1?s.events.find(e=>e.kind==='straight'):id===9?s.events.filter(e=>e.kind==='cross')[1]:s.events.find(e=>e.kind==='straight');
 let laneObserved=false;
 for(let i=0;i<40000&&!s.finished;i++){
  driver.step(.05);
  if(!laneObserved&&s.progress>checkpoint.s+5){
   const lateral=(id===10?-s.position.z:id===9?-s.position.x:s.position.x)/s.route.scale;
   assert.ok(id===10?lateral>11&&lateral<15.25:lateral>3&&lateral<7,`source-image lane mismatch: ${lateral}`);laneObserved=true;
  }
 }
 assert.equal(laneObserved,true);
 assert.equal(s.finished,true,JSON.stringify({progress:s.progress,faults:s.faults}));
 assert.ok(s.progress>2997);assert.equal(s.score,100,JSON.stringify(s.faults));
 for(const e of s.events)assert.ok(spoken.some(t=>t.includes(e.label)&&t.includes(e.hint)),`missing instruction ${e.label}`);
 assert.equal(spoken.length,s.events.length);assert.equal(s.gear,'P');assert.equal(s.handbrake,true);
});
