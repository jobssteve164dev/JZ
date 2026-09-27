export class EngineSound{
 constructor(context=null){this.context=context;this.enabled=true;if(context)this.connect();}
 connect(){
  const c=this.context;this.volume=c.createGain();this.volume.gain.value=0;
  this.filter=c.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=650;
  this.filter.connect(this.volume);this.volume.connect(c.destination);
  this.oscillators=['sawtooth','triangle'].map(type=>{const o=c.createOscillator();o.type=type;o.frequency.value=35;o.connect(this.filter);o.start();return o;});
 }
 async unlock(){
  try{if(!this.context){const Context=globalThis.AudioContext??globalThis.webkitAudioContext;if(!Context)return;this.context=new Context();this.connect();}if(this.context.state==='suspended')await this.context.resume();}catch{this.enabled=false;}
 }
 update(sim,driving,voiceBusy=false){
  if(!this.context)return;
  const c=this.context,gas=sim.throttlePressed??0,audible=this.enabled&&driving&&!sim.paused&&!sim.finished;
  const frequency=32+Math.min(sim.speed,16)*2.2+gas*55;
  this.oscillators.forEach((o,i)=>o.frequency.setTargetAtTime(frequency*(i+1),c.currentTime,.12));
  this.filter.frequency.setTargetAtTime(350+gas*900+sim.speed*20,c.currentTime,.12);
  this.volume.gain.setTargetAtTime(audible?(.018+gas*.025)*(voiceBusy?.3:1):0,c.currentTime,.05);
 }
 silence(){if(this.context){this.volume.gain.cancelScheduledValues(this.context.currentTime);this.volume.gain.setValueAtTime(0,this.context.currentTime);}}
}
