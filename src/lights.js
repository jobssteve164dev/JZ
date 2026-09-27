export const questions=[
 ...['请开启前照灯','夜间窄路与机动车会车','夜间窄桥与机动车会车','夜间与机动车会车','夜间在有路灯的道路上行驶','夜间在照明良好的道路上行驶','夜间直行通过路口','夜间同方向近距离跟车行驶'].map(text=>({text,answer:'low'})),
 ...['请将前照灯变成远光灯','夜间在没有路灯照明不良条件下行驶'].map(text=>({text,answer:'high'})),
 ...['夜间通过急弯、坡路','夜间通过坡路、拱桥','夜间通过急弯、拱桥','夜间通过拱桥、人行横道','夜间通过没有交通信号灯控制的路口','夜间超越前方车辆'].map(text=>({text,answer:'flash'})),
 ...['路边临时停车','夜间在道路上发生交通事故，妨碍交通又难以移动'].map(text=>({text,answer:'hazard-marker'})),
 {text:'考试结束请关闭所有灯光',answer:'off'}
];
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
export class LightingExam extends LightingControls{
 constructor(mode='practice',{standalone=false}={}){
  super();this.mode=mode;this.index=0;this.results=[];
  const pool=Array.from({length:17},(_,i)=>i+1);
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  this.order=[0,...(standalone?pool:pool.slice(0,5)),18];this.startQuestion(this.order[0]);
 }
 startQuestion(index){this.current=index;this.transitions=0;this.elapsed=0;}
 check(){
  const answer=questions[this.current].answer;
  if(answer==='flash')return this.transitions>=3&&this.beam==='low'&&!this.hazard;
  if(answer==='hazard-marker')return this.beam==='marker'&&this.hazard;
  return this.beam===answer&&!this.hazard;
 }
 submit(){const passed=this.check();this.results.push({question:questions[this.current],passed});this.index++;if(this.index<this.order.length)this.startQuestion(this.order[this.index]);return passed;}
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
