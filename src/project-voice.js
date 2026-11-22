const mutedApproachKinds=new Set(['start','meet','overtake']);
export const APPROACH_DISTANCE=80;

export function approachSpeech(event){
 return event.silent||event.selfDirected||mutedApproachKinds.has(event.kind)?null:`前方${event.label}`;
}

export function approachProject(sim){
 const visible=event=>sim.mode!=='exam'||!event.silent;
 const pending=sim.events.filter(event=>event.status==='pending'&&visible(event));
 const maneuver=pending.find(event=>event.meetingEntered||event.overtakeEntered);
 if(maneuver){
  // Use the first following approach even after that project has been scored.
  const following=sim.events.find(event=>event.s>maneuver.s&&visible(event));
  if(!following||following.s-sim.progress>=APPROACH_DISTANCE||!supersedesProject(sim,maneuver,following))return maneuver;
 }
 return pending.find(event=>event.endS>=sim.progress)??sim.events.at(-1);
}

export function supersedesProject(sim,earlier,later){
 return earlier.s<later.s&&sim.progress>earlier.endS&&
  (earlier.peakSpeed>50||sim.speed*3.6>50);
}
