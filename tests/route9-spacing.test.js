import test from 'node:test';
import assert from 'node:assert/strict';
import {getRoute} from '../src/routes.js';
import {Simulation} from '../src/simulation.js';
import {LearningDriver} from '../src/learning.js';

test('route 9 completes straight driving before overtaking preparation and lateral movement',()=>{
 const s=new Simulation(getRoute(9),'learn'),straight=s.events[1],over=s.events[2],right=s.events[3],log=[];
 const d=new LearningDriver(s,text=>log.push({text,s:s.progress,time:s.time,straight:straight.status}));
 let done,shift;
 for(let i=0;i<15000&&right.status==='pending';i++){
  d.step(.05);
  if(!done&&straight.status!=='pending')done=s.progress;
  if(!shift&&s.progress<over.endS&&Math.abs(s.position.z-s.route.path[0].z)>.8)shift=s.progress;
 }
 const prepare=log.find(p=>p.text.startsWith('前方超车'));
 assert.ok(prepare,'must still announce overtaking');
 assert.equal(prepare.straight,'passed','overtaking preparation must not interrupt straight driving');
 assert.ok(prepare.s-done>=40,`only ${prepare.s-done} metres after straight completion`);
 assert.ok(shift>done,'physical lane change must follow straight completion');
 assert.equal(over.status,'passed',JSON.stringify(s.faults));
 assert.equal(right.status,'passed',JSON.stringify(s.faults));
 assert.ok(over.endS<right.signalS,'return to original lane before right-turn signal preparation');
 assert.equal(s.score,100,JSON.stringify(s.faults));
});
