import test from 'node:test';import assert from 'node:assert/strict';
import {Simulation,angle,clamp,lightPhase} from '../src/simulation.js';import {getRoute,at} from '../src/routes.js';
// Drives through the real controls and physics. No state assignment or teleporting.
function drive(id){
 const r=getRoute(id),s=new Simulation(r);s.action('belt');s.action('gear','D');s.action('handbrake');s.action('signal','left');s.action('look','left');s.step(3.2,{});
 for(let i=0;i<40000&&!s.finished;i++){
  const pending=s.events.find(e=>e.status==='pending'&&e.kind!=='start');
  const park=s.progress>r.length-35;
  const target=at(r,Math.min(3000,s.progress+Math.max(3,s.speed*1.1)));
  if(park){const offset=2.25*r.scale-.9-.2;target.x+=Math.cos(target.heading)*offset;target.z+=Math.sin(target.heading)*offset;}
  const error=angle(Math.atan2(target.x-s.position.x,s.position.z-target.z)-s.heading);
  const steer=clamp(Math.atan(2*2.7*Math.sin(error)/Math.max(3,s.speed*1.1))/.52,-1,1);
  let speed=5;
  const lookahead=at(r,s.progress+15);if(Math.abs(angle(lookahead.heading-s.heading))>.12)speed=2.2;
  if(pending&&pending.s-s.progress<65&&pending.direction&&s.signal!==pending.direction&&!(pending.kind==='overtake'&&s.progress>pending.s+25))s.action('signal',pending.direction);
  if(pending?.kind==='overtake'&&s.progress>pending.s+25&&s.signal!=='right')s.action('signal','right');
  if(park&&s.signal!=='right')s.action('signal','right');
  s.action('look','left');s.action('look','right');
  const light=r.lights.find(l=>l.s>s.progress&&l.s-s.progress<35);
  if(light&&lightPhase(s.time,light.offset)!=='green')speed=Math.min(speed,Math.max(0,(light.s-s.progress-4)*.45));
  if(park)speed=Math.min(speed,Math.max(0,(3000-s.progress-1)*.4));
  const brake=s.speed>speed?.5:i%30===0?.2:0;
  s.step(.05,{throttle:s.speed<speed-.05?.45:0,brake,steer});
  if(s.parkingReady&&s.progress>2997&&s.speed<.08){s.action('handbrake');s.action('gear','P');s.action('finish');}
 }
 return s;
}
for(const id of [1,9,10])test(`route ${id}: complete 3km through physical controls and park`,()=>{
 const s=drive(id);assert.equal(s.finished,true,JSON.stringify({progress:s.progress,pos:s.position,faults:s.faults}));
 assert.ok(s.progress>2997);assert.equal(s.score,100,JSON.stringify(s.faults));assert.ok(s.events.every(e=>e.status!=='pending'));
 assert.ok(s.faults.every(f=>!['offroute','wrongway'].includes(f.key)),JSON.stringify(s.faults));
 console.log(`route ${id}: ${Math.round(s.time)}s, ${Math.round(s.distance)}m, score ${s.score}`,s.faults.map(f=>f.text));
});
