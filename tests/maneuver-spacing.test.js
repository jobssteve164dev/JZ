import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {getRoute} from '../src/routes.js';
import {LearningDriver} from '../src/learning.js';

for(const id of [1,9,10])test(`route ${id}: meeting and overtaking leave room for separate instructions and actions`,()=>{
 const s=new Simulation(getRoute(id),'learn'),log=[];
 const driver=new LearningDriver(s,text=>log.push({text,time:s.time,s:s.progress}));
 for(let i=0;i<40000&&!s.finished;i++)driver.step(.05);
 const meet=log.find(p=>p.text.startsWith('开始会车')),end=log.find(p=>p.text.startsWith('会车完成'));
 assert.ok(meet&&end,JSON.stringify(s.faults));
 const over=log.find(p=>p.text.startsWith('前方超车')),overEnd=log.find(p=>p.text.startsWith('超车完成'));
 const gap=over.s>meet.s?over.s-end.s:meet.s-overEnd.s;
 assert.ok(gap>=40,`only ${gap} metres between the completed maneuver and the next instruction`);
 assert.ok(end.time-meet.time<=5,`meeting took ${end.time-meet.time}s`);
 const returnPrompt=log.find(p=>p.text.startsWith('会车结束'));
 assert.ok(returnPrompt.time-meet.time<=2,'the five-second exercise must leave time to hear and execute the return instruction');
 assert.equal(s.score,100,JSON.stringify(s.faults));
});
