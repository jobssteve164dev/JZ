const mutedApproachKinds=new Set(['start','meet','overtake']);
export const APPROACH_DISTANCE=80;

export function approachSpeech(event){
 return event.silent||event.selfDirected||mutedApproachKinds.has(event.kind)?null:`前方${event.label}`;
}

export function approachProject(sim,current){
 if(sim.progress<=current.endS||(!current.meetingEntered&&!current.overtakeEntered))return current;
 // A maneuver may still be scored after the car has reached the next project's approach.
 return sim.events.find(event=>event.s>current.s&&event.status==='pending'&&
  event.s-sim.progress<APPROACH_DISTANCE&&approachSpeech(event))??current;
}
