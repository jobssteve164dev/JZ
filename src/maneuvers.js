import {at} from './routes.js';
import {laneNumber,lateralPosition} from './lanes.js';
export const MEETING_SECONDS=5;

export function prompt(sim,event,phase,text){
 if(phase==='start')event.startPrompt={id:`${event.id}-${phase}`,text};
 sim.prompts.push({id:`${event.id}-${phase}`,text});
}
export function updateOvertake(sim,e){
 if(!e.overtakeEntered){e.overtakeEntered=true;if(!sim.waitForSpeech)e.travelStart=sim.distance;prompt(sim,e,'start','开始超车，请在 150 米内完成超越并返回原车道。');}
 const lane=laneNumber(sim.route,sim.position,e.laneChange);
 if(lane===e.laneChange.to)e.reachedPassingLane=true;
 if(e.reachedPassingLane&&!e.returnPrompted&&sim.progress>=e.returnS){
  e.returnPrompted=true;e.returnPromptTime=sim.time;
  prompt(sim,e,'return','请返回原车道，观察右后方，右灯满三秒再回位。');
 }
 if(e.returnPrompted&&!e.returnStarted){
  const passing=lateralPosition(sim.route,at(sim.route,e.returnS),e.laneChange);
  if(lateralPosition(sim.route,sim.position,e.laneChange)>passing+.8){
   e.returnStarted=true;
   if(!sim.signalReady('right'))sim.fail(`${e.id}-return-signal`,'超车：返回原车道前右转向灯未开启满 3 秒');
   if(sim.looks.right<e.returnPromptTime||sim.time-sim.looks.right>8)sim.fail(`${e.id}-return-look`,'超车：返回原车道前未重新观察右后方');
   e.returnSignal=sim.signalReady('right')&&sim.looks.right>=e.returnPromptTime&&sim.time-sim.looks.right<=8;
  }
 }
 const travelled=sim.distance-e.travelStart;
 if(travelled>150+1e-6){sim.fail(`${e.id}-distance`,'超车：未在 150 米内完成超越并返回原车道');sim.evaluate(e);prompt(sim,e,'end','超车项目结束，未在规定距离内完成。请保持安全行驶。');}
 else if(e.returnStarted&&sim.progress>=e.endS-8&&lane===e.laneChange.back&&Math.abs(sim.offset)<.5){
  sim.evaluate(e);prompt(sim,e,'end',e.status==='passed'?'超车完成，已返回原车道，请关闭转向灯。':'超车项目结束，请关闭转向灯，保持车道。');
 }
}

export function meetingOffset(sim){
 const e=sim.events.find(e=>e.kind==='meet'&&e.status==='pending'&&e.meetingEntered);
 return e&&!e.returnPrompted?.6:0;
}
export function updateMeeting(sim,e){
 if(!e.meetingEntered){e.meetingEntered=true;if(!sim.waitForSpeech)e.meetingStart=sim.time;prompt(sim,e,'start','开始会车。');}
 if(sim.braked>=e.preparationTime&&sim.looks.left>=e.preparationTime&&sim.looks.right>=e.preparationTime&&sim.speed*3.6<30&&sim.offset>=.35&&sim.offset<=1)e.meetingReady=true;
 if(!e.returnPrompted&&sim.progress>e.endS){e.returnPrompted=true;prompt(sim,e,'return','会车结束，回正。');}
 if(e.meetingStart!==undefined&&sim.time-e.meetingStart>MEETING_SECONDS+1e-8){sim.fail(`${e.id}-time`,'会车：未在 5 秒内完成减速、观察、靠右及回正');sim.evaluate(e);prompt(sim,e,'end','会车项目结束，操作超时，请保持安全行驶。');}
 else if(e.returnPrompted&&Math.abs(sim.offset)<.22&&Math.abs(Math.atan2(Math.sin(sim.heading-at(sim.route,sim.progress).heading),Math.cos(sim.heading-at(sim.route,sim.progress).heading)))<.08){
  if(!e.meetingReady)sim.fail(`${e.id}-actions`,'会车：未完成制动、左右观察及车道内靠右');
  sim.evaluate(e);prompt(sim,e,'end',e.status==='passed'?'会车完成，请保持车道。':'会车项目结束，请保持车道。');
 }
}
