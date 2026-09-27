import test from 'node:test';import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';import {getRoute,at} from '../src/routes.js';
function fixture(id,index){const s=new Simulation(getRoute(id)),e=s.events[index];s.events=[e];s.progress=e.s-.2;s.position=at(s.route,s.progress);s.heading={N:0,E:Math.PI/2,S:Math.PI,W:-Math.PI/2}[e.laneChange.direction];s.speed=3;s.gear='D';s.handbrake=false;s.belt=true;s.started=true;return {s,e};}
for(const id of [1,9,10])for(const e of getRoute(id).events.filter(e=>['change','overtake'].includes(e.kind))){
 const index=getRoute(id).events.indexOf(e);
 test(`${e.id}: passing the marker while keeping straight does not prematurely judge three seconds`,()=>{
  const {s,e}=fixture(id,index);s.action('signal',e.direction);s.action('look',e.direction);s.step(.1);
  assert.ok(s.progress>e.s);assert.ok(!s.faults.some(f=>f.key===`${e.id}-signal`),'judged at marker before actual lateral steering');
  s.speed=0;s.step(3.1);s.action('look',e.direction);s.step(.6,{throttle:1,steer:e.direction==='left'?-.4:.4});
  assert.equal(e.checked,true,'must judge when the car actually begins to steer');assert.ok(!s.faults.some(f=>f.key===`${e.id}-signal`));
  s.step(1,{throttle:1,steer:e.direction==='left'?-.4:.4});s.step(.1,{steer:0});assert.equal(s.signal,'off');assert.ok(!s.faults.some(f=>f.key===`${e.id}-signal`),'automatic cancellation must not erase the completed preparation');
 });
 test(`${e.id}: turning before three seconds still fails`,()=>{
  const {s,e}=fixture(id,index);s.action('signal',e.direction);s.action('look',e.direction);s.step(.1,{steer:e.direction==='left'?-.4:.4});
  assert.ok(s.faults.some(f=>f.key===`${e.id}-signal`));
 });
}
