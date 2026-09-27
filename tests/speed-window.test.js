import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,angle,clamp} from '../src/simulation.js';
import {getRoute,at} from '../src/routes.js';
import {inJunction} from '../src/lanes.js';

function pass(id,kind,late=false,targetSpeed=5){
 const s=new Simulation(getRoute(id)),e=s.events.find(e=>e.kind===kind);s.events=[e];
 let boundary=e.s;
 if(['cross','left','right'].includes(kind))while(!inJunction(s.route,at(s.route,boundary))&&boundary<e.s+120)boundary+=.1;
 s.progress=boundary-34;s.position=at(s.route,s.progress);s.heading=s.position.heading;
 s.belt=true;s.gear='D';s.handbrake=false;s.started=true;s.speed=10;
 if(e.direction){s.action('signal',e.direction);s.signalAge=4;}
 let entrySpeed;
 for(let i=0;i<800&&e.status==='pending';i++){
  const target=at(s.route,s.progress+Math.max(3,s.speed*1.1));
  const error=angle(Math.atan2(target.x-s.position.x,s.position.z-target.z)-s.heading);
  const steer=clamp(Math.atan(2*2.7*Math.sin(error)/Math.max(3,s.speed*1.1))/.52,-1,1);
  s.action('look','left');s.action('look','right');
  const slow=!late||s.progress>boundary+1;
  s.step(.05,{brake:slow&&s.speed>targetSpeed?.5:0,throttle:s.speed<targetSpeed?.45:0,steer});
  if(entrySpeed===undefined&&s.progress>=boundary)entrySpeed=s.speed*3.6;
 }
 return {s,e,entrySpeed};
}
for(const id of [1,9,10])for(const kind of ['left','right'])test(`route ${id} ${kind}: turning below 30 km/h is not failed by a hidden 25 km/h threshold`,()=>{
 const {s,e,entrySpeed}=pass(id,kind,false,29/3.6);assert.ok(entrySpeed>25&&entrySpeed<30,`entry speed ${entrySpeed}`);
 assert.ok(!s.faults.some(f=>f.key===`${e.id}-speed`),JSON.stringify(s.faults));
});
for(const id of [1,9,10])for(const kind of ['school','bus','cross','left','right','uturn','meet']){
 test(`route ${id} ${kind}: braking before the target does not retain approach speed as speeding`,()=>{
  const {s,e,entrySpeed}=pass(id,kind);assert.ok(entrySpeed<20,`entry speed ${entrySpeed}`);
  assert.notEqual(e.status,'pending');assert.ok(!s.faults.some(f=>f.key===`${e.id}-speed`),JSON.stringify(s.faults));
 });
 test(`route ${id} ${kind}: slowing only after entering still records the actual speeding`,()=>{
  const {s,e,entrySpeed}=pass(id,kind,true);assert.ok(entrySpeed>30,`entry speed ${entrySpeed}`);
  assert.ok(s.faults.some(f=>f.key===`${e.id}-speed`),JSON.stringify(s.faults));
 });
}
