export const lightNames={low:'近光灯',high:'远光灯',flash:'远近光交替', 'hazard-marker':'示廓灯 + 危险报警闪光灯',off:'关闭全部灯光'};
export class LightingControls{
 constructor(){this.beam='off';this.hazard=false;this.transitions=0;}
 control(value){
  if(['low','high'].includes(value)&&['low','high'].includes(this.beam)&&value!==this.beam)this.transitions++;
  if(['low','high','marker'].includes(value))this.beam=value;
  if(value==='hazard')this.hazard=!this.hazard;
  if(value==='off'){this.beam='off';this.hazard=false;}
 }
}
export class PracticeLights extends LightingControls{
 constructor(questions,mode='practice',{standalone=false}={}){
  super();this.questions=questions;this.mode=mode;this.index=0;this.results=[];
  const pool=Array.from({length:17},(_,i)=>i+1);
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  this.order=[0,...(standalone?pool:pool.slice(0,5)),18];this.startQuestion(this.order[0]);
 }
 startQuestion(index){this.current=index;this.transitions=0;this.elapsed=0;}
 check(){
  const answer=this.questions[this.current].answer;
  if(answer==='flash')return this.transitions>=3&&this.beam==='low'&&!this.hazard;
  if(answer==='hazard-marker')return this.beam==='marker'&&this.hazard;
  return this.beam===answer&&!this.hazard;
 }
 submit(){const passed=this.check();this.results.push({question:this.questions[this.current],passed});this.index++;if(this.index<this.order.length)this.startQuestion(this.order[this.index]);return passed;}
 get done(){return this.index>=this.order.length;}
}
export class LightStalk{
 constructor(exam){this.exam=exam;this.dial=0;this.high=false;this.pulled=false;}
 rotate(position){this.dial=Math.max(0,Math.min(2,Math.round(position)));this.sync();}
 push(){this.high=!this.high;this.sync();}
 pull(){this.pulled=true;this.sync();}
 release(){this.pulled=false;this.sync();}
 hazard(){this.exam.control('hazard');}
 sync(){
  const beam=this.pulled?'high':this.dial===2?(this.high?'high':'low'):this.dial===1?'marker':'off';
  // The separate hazard switch stays on when the rotary is turned off.
  if(beam==='off')this.exam.beam='off';else this.exam.control(beam);
 }
}
