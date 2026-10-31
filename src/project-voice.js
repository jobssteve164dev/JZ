const mutedApproachKinds=new Set(['start','meet','overtake','change']);

export function approachSpeech(event){
 return event.silent||mutedApproachKinds.has(event.kind)?null:`前方${event.label}`;
}
