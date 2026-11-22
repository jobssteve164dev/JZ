import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {getRoute,at} from '../src/routes.js';
import {laneNumber,withinLane} from '../src/lanes.js';
import {LearningDriver} from '../src/learning.js';

for(const [id,heading] of [[1,Math.PI],[9,-Math.PI/2],[10,Math.PI]])test(`route ${id}: the car to pass is ahead in the original lane and faces along the road`,()=>{
 const route=getRoute(id),sim=new Simulation(route),event=route.events.find(e=>e.kind==='overtake');
 const car=sim.traffic.find(v=>v.id===event.id),stage=event.laneChange,vertical=stage.direction==='S';
 assert.equal(car.heading,heading);
 assert.equal(laneNumber(route,car,stage),stage.from);
 assert.ok(withinLane(route,car,stage,stage.from));
 const along=p=>vertical?p.z:-p.x;
 assert.ok(along(car)-along(event.point)>12,'the target must be visible ahead before the lane change');
 const returnPoint=at(route,event.returnS);
 assert.ok(along(returnPoint)-along(car)>4.3,'the target must be behind the car when the return instruction begins');
});

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
