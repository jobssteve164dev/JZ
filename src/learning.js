import {meetingOffset} from './maneuvers.js';
import {parkingOffset} from './lanes.js';
import {at} from './routes.js';
import {angle,clamp,lightPhase} from './simulation.js';

export class LearningDriver{
 constructor(sim,announce){this.sim=sim;this.announce=announce;this.spoken=new Set();this.ticks=0;this.caption='';}
 step(dt){
  const s=this.sim;if(s.paused||s.finished)return;
  if(!s.belt)s.action('belt');if(s.gear==='P')s.action('gear','D');if(s.handbrake)s.action('handbrake');
  let remaining=Math.max(0,dt);
  while(remaining>1e-8&&!s.finished){const tick=Math.min(.05,remaining);this.tick(tick);remaining-=tick;}
 }
 tick(dt){
  const s=this.sim,r=s.route;
  for(const e of s.events)if(!['meet','overtake'].includes(e.kind)&&!this.spoken.has(e.id)&&(e.announceS??e.s)-s.progress<90){
   this.spoken.add(e.id);this.caption=`${e.label}。${e.hint}`;this.announce(this.caption);
  }
  if(!s.started){
   if(s.signal!=='left')s.action('signal','left');s.action('look','left');
   if(s.signalAge<3.2){s.step(dt,{});return;}
  }
  const pending=s.events.find(e=>e.status==='pending'&&e.kind!=='start'&&e.direction),park=s.progress>r.length-35;
  const ahead=Math.max(3,s.speed*1.1),target=at(r,s.progress+ahead);
  const meetOffset=meetingOffset(s);target.x+=Math.cos(target.heading)*meetOffset;target.z+=Math.sin(target.heading)*meetOffset;
  if(park){const offset=parkingOffset(r);target.x+=Math.cos(target.heading)*offset;target.z+=Math.sin(target.heading)*offset;}
  const error=angle(Math.atan2(target.x-s.position.x,s.position.z-target.z)-s.heading);
  const steer=clamp(Math.atan(2*2.7*Math.sin(error)/ahead)/.52,-1,1);
  let speed=Math.abs(angle(at(r,s.progress+15).heading-s.heading))>.12?2.2:5;
  let signal=s.started?'off':'left';
  if(pending&&s.progress>(pending.signalS??pending.s-65)&&pending.direction)signal=pending.direction;
  if(pending?.returnS!==undefined&&s.progress>pending.returnS)signal='right';
  if(s.progress>r.parkingStart)signal='right';
  if(s.signal!==signal)s.action('signal',signal);
  s.action('look','left');s.action('look','right');
  const light=r.lights.find(l=>l.s>s.progress&&l.s-s.progress<35);
  if(light&&lightPhase(s.time,light.offset)!=='green')speed=Math.min(speed,Math.max(0,(light.s-s.progress-4)*.45));
  if(park)speed=Math.min(speed,Math.max(0,(r.length-s.progress-1)*.4));
  const brake=s.speed>speed?.5:this.ticks%30===0?.2:0;this.ticks++;
  s.step(dt,{throttle:s.speed<speed-.05?.45:0,brake,steer});
  for(const p of s.prompts.splice(0)){this.caption=p.text;this.announce(p.text);}
  if(s.parkingReady&&s.progress>r.length-3&&s.speed<.08){s.action('handbrake');s.action('gear','P');s.action('finish');}
 }
}
