import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,angle,clamp} from '../src/simulation.js';
import {getRoute,at} from '../src/routes.js';
import {inJunction} from '../src/lanes.js';

for(const id of [1,9,10])for(const template of getRoute(id).events.filter(e=>['cross','left','right'].includes(e.kind)))for(const observe of [true,false])test(`route ${id} ${template.id}: ${observe?'observe at the visible junction':'missing observation is judged only after the visible junction'}`,()=>{
 const s=new Simulation(getRoute(id)),e=s.events.find(e=>e.id===template.id);s.events=[e];
 s.progress=e.s-34;s.position=at(s.route,s.progress);s.heading=s.position.heading;
 s.belt=true;s.gear='D';s.handbrake=false;s.started=true;s.speed=4;
 if(e.direction){s.action('signal',e.direction);s.signalAge=4;}
 let reached=false,left=false;
 for(let i=0;i<1200&&!left;i++){
  const inside=inJunction(s.route,s.position);
  if(inside){reached=true;if(observe){s.action('look','left');s.action('look','right');}}
  if(!reached){assert.equal(e.status,'pending','project must not finish before the car reaches the visible junction');assert.ok(!s.faults.some(f=>f.key===`${e.id}-look`),'observation judged before arrival');}
  const target=at(s.route,s.progress+5),error=angle(Math.atan2(target.x-s.position.x,s.position.z-target.z)-s.heading);
  s.step(.05,{throttle:s.speed<4?.45:0,brake:i%30===0?.2:0,steer:clamp(Math.atan(2*2.7*Math.sin(error)/5)/.52,-1,1)});
  left=reached&&!inJunction(s.route,s.position)&&e.status!=='pending';
 }
 assert.ok(reached&&left,'must actually drive through the rendered junction');assert.equal(s.faults.some(f=>f.key===`${e.id}-look`),!observe,JSON.stringify(s.faults));
});
