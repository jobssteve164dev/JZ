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
 for(let i=0;i<40000&&!s.finished;i++)driver.step(.05);
 assert.equal(s.finished,true,JSON.stringify({progress:s.progress,faults:s.faults}));
 assert.ok(s.progress>2997);assert.equal(s.score,100,JSON.stringify(s.faults));
 for(const e of s.events)assert.ok(spoken.some(t=>t.includes(e.label)&&t.includes(e.hint)),`missing instruction ${e.label}`);
 assert.equal(spoken.length,s.events.length);assert.equal(s.gear,'P');assert.equal(s.handbrake,true);
});
