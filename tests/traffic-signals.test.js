import test from 'node:test';
import assert from 'node:assert/strict';
import {getRoute,at} from '../src/routes.js';
import {Simulation} from '../src/simulation.js';
import {LearningDriver} from '../src/learning.js';

// Explicitly matched to the seven lights in the three source diagrams.
const junctions={1:[1,3,8,10,14],9:[11],10:[4]};
function approach(id,index,phase='red'){
 const route=getRoute(id),light=route.lights[index],sim=new Simulation(route);
 sim.progress=light.s-.1;sim.position=at(route,sim.progress);sim.heading=sim.position.heading;
 sim.time=(phase==='red'?10:phase==='green'?40:57)-light.offset;
 sim.gear='D';sim.handbrake=false;sim.belt=true;sim.started=true;sim.speed=2;
 return {sim,light,event:route.events[junctions[id][index]]};
}
for(const [id,indices] of Object.entries(junctions))for(const [index,eventIndex] of indices.entries()){
 const route=getRoute(Number(id)),event=route.events[eventIndex];
 test(`route ${id} ${event.id}: red applies to ${event.kind}, not the indicator button`,()=>{
  const {sim,light}=approach(Number(id),index);sim.action('signal','right');
  sim.step(.1,{throttle:.2});assert.ok(sim.progress>light.s,'must physically cross the light');
  assert.equal(sim.faults.some(f=>f.key===`red-${light.s}`),event.kind!=='right',JSON.stringify(sim.faults));
 });
 test(`route ${id} ${event.id}: crossing green then turning red does not penalize again`,()=>{
  const {sim,light}=approach(Number(id),index,'green');sim.step(.1,{throttle:.2});
  assert.ok(sim.progress>light.s);sim.time=70-light.offset;sim.step(.1,{});
  assert.equal(sim.faults.some(f=>f.key===`red-${light.s}`),false);
 });
}
test('follow learning proceeds slowly through the first circular red right turn',()=>{
 const {sim,light}=approach(1,0);sim.progress=light.s-15;sim.position=at(sim.route,sim.progress);sim.heading=sim.position.heading;
 sim.events.forEach(e=>{if(e.endS<sim.progress)e.status='passed';});
 sim.action('signal','right');sim.signalAge=4;
 const driver=new LearningDriver(sim,()=>{});
 driver.step(12);
 assert.ok(sim.time<30,'signal still red');assert.ok(sim.progress>light.s,`unnecessary red stop: ${sim.progress} < ${light.s}`);
 assert.equal(sim.faults.some(f=>f.key===`red-${light.s}`),false);
});
test('follow learning waits before a red left turn',()=>{
 const {sim,light}=approach(10,0);sim.progress=light.s-15;sim.position=at(sim.route,sim.progress);sim.heading=sim.position.heading;
 sim.events.forEach(e=>{if(e.endS<sim.progress)e.status='passed';});
 const driver=new LearningDriver(sim,()=>{});driver.step(12);
 assert.ok(sim.progress<light.s);assert.ok(sim.speed<.2);
 assert.equal(sim.faults.some(f=>f.key===`red-${light.s}`),false);
});

test('directional red is not exempt even when its movement is right',()=>{
 const {sim,light}=approach(1,0);
 sim.route={...sim.route,lights:[{...light,type:'directional'}]};sim.step(.1,{throttle:.2});
 assert.ok(sim.faults.some(f=>f.key===`red-${light.s}`));
});
test('source light bindings and HUD distinguish a yielding right turn from a stop',async()=>{
 const {trafficSignal}=await import('../src/traffic-signals.js');
 for(const [id,indices] of Object.entries(junctions))for(const [index,eventIndex] of indices.entries()){
  const r=getRoute(Number(id)),l=r.lights[index],e=r.events[eventIndex];
  assert.equal(l.type,'circular');assert.equal(l.eventId,e.id);
  assert.equal(l.movement,e.kind==='cross'?'straight':e.kind);
  const red=trafficSignal(l,10-l.offset);
  assert.equal(red.stop,e.kind!=='right');assert.equal(red.label,e.kind==='right'?'红灯 · 右转让行':'红灯 · 停车');
  assert.equal(trafficSignal(l,40-l.offset).stop,false);
  assert.equal(trafficSignal(l,57-l.offset).stop,true);
 }
 assert.equal(trafficSignal({offset:0},10).stop,true,'unbound light must not become permissive');
});
