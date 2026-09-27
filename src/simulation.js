import {at,nearest} from './routes.js';
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const angle=n=>Math.atan2(Math.sin(n),Math.cos(n));
export function lightPhase(time,offset=0){const t=(time+offset)%60;return t<30?'red':t<56?'green':'yellow';}
export class Simulation{
  constructor(route,mode='practice'){
    this.route=route;this.mode=mode;this.position=at(route,0);this.heading=this.position.heading;
    this.time=0;this.speed=0;this.distance=0;this.progress=0;this.gear='P';this.handbrake=true;this.belt=false;
    this.signal='off';this.signalAge=0;this.looks={left:-Infinity,right:-Infinity};this.braked=-Infinity;
    this.paused=false;this.finished=false;this.score=100;this.faults=[];this.keys=new Set();
    this.events=route.events.map(e=>({...e,entered:false,status:'pending',peakSpeed:0,braked:false,lookLeft:false,lookRight:false}));
    this.traffic=route.events.filter(e=>['meet','overtake'].includes(e.kind)).map(e=>{const p=at(route,e.s+(e.kind==='overtake'?50:20)*route.scale),offset=(e.kind==='meet'?-18:4)*route.scale;return {id:e.id,s:e.s,active:false,x:p.x+Math.cos(p.heading)*offset,z:p.z+Math.sin(p.heading)*offset,heading:p.heading+(e.kind==='meet'?Math.PI:0),kind:e.kind};});
    this.offset=0;this.steer=0;this.message='准备起步';this.started=false;this.parkingReady=false;
  }
  action(name,value){
    if(this.paused||this.finished)return;
    if(name==='belt')this.belt=!this.belt;
    if(name==='handbrake')this.handbrake=!this.handbrake;
    if(name==='gear'&&['P','N','D'].includes(value)){
      if(this.speed>.2&&value==='P'){this.message='请停稳后挂 P 挡';return;}
      this.gear=value;
    }
    if(name==='signal'){this.signal=this.signal===value?'off':value;this.signalAge=0;}
    if(name==='look'&&['left','right'].includes(value))this.looks[value]=this.time;
    if(name==='finish')this.finishParking();
  }
  signalReady(direction){return this.signal===direction&&this.signalAge>=3-1e-8;}
  fail(key,text,points=100){
    if(this.keys.has(key))return;this.keys.add(key);this.score=Math.max(0,this.score-points);
    this.faults.push({key,text,points,time:this.time,s:this.progress});this.message=text;
  }
  step(dt,input={}){
    if(this.paused||this.finished)return;
    // Substeps preserve the same physics and rule boundaries at every frame rate.
    let remaining=Math.max(0,dt);while(remaining>1e-8){const step=Math.min(.05,remaining);this.tick(step,input);remaining-=step;}
  }
  tick(dt,{throttle=0,brake=0,steer=0}={}){
    this.time+=dt;if(this.signal!=='off')this.signalAge+=dt;
    const previous=this.progress;this.steer=clamp(steer,-1,1);
    const acceleration=this.gear==='D'&&!this.handbrake?clamp(throttle,0,1)*2.4:0;
    this.speed=clamp(this.speed+(acceleration-clamp(brake,0,1)*6-(this.handbrake?9:0)-.10-this.speed*.015)*dt,0,16.7);
    if(this.gear==='P')this.speed=0;
    if(brake>.1)this.braked=this.time;
    if(this.speed>.1&&!this.started){
      this.started=true;
      if(!this.belt)this.fail('belt','未系安全带起步');
      this.checkSignal(this.events[0]);
    }
    this.heading+=Math.tan(this.steer*.52)*this.speed/2.7*dt;
    this.position.x+=Math.sin(this.heading)*this.speed*dt;this.position.z-=Math.cos(this.heading)*this.speed*dt;
    this.distance+=this.speed*dt;
    for(const vehicle of this.traffic){vehicle.active=Math.abs(this.progress-vehicle.s)<100;if(vehicle.active&&Math.hypot(vehicle.x-this.position.x,vehicle.z-this.position.z)<2.5&&this.speed>.2)this.fail(`collision-${vehicle.id}`,'与其他车辆发生碰撞');}
    const n=nearest(this.route,this.position,Math.max(0,this.progress-25),this.progress+70);
    this.offset=n.offset;
    if(n.distance<18*this.route.scale)this.progress=Math.max(this.progress,n.s);
    if(n.distance>18*this.route.scale&&this.speed>.5)this.fail('offroute','偏离考试路线，请返回当前路段');
    if(Math.abs(angle(this.heading-n.heading))>Math.PI*.65&&this.speed>1)this.fail('wrongway','逆向行驶');
    if(this.speed*3.6>50)this.fail('speed','车速超过 50 km/h');
    for(const l of this.route.lights){
      if(previous<l.s&&this.progress>=l.s&&lightPhase(this.time,l.offset)==='red')this.fail(`red-${l.s}`,'越过停止线时为红灯');
    }
    for(const e of this.events){
      if(e.status!=='pending'||e.kind==='park')continue;
      const begin=e.kind==='start'?0:e.s-35,end=e.endS;
      if(this.progress>=begin&&this.progress<=end){
        e.peakSpeed=Math.max(e.peakSpeed,this.speed*3.6);
        e.braked ||= this.time-this.braked<1;
        e.lookLeft ||= this.time-this.looks.left<2;e.lookRight ||= this.time-this.looks.right<2;
        if(!e.entered){e.entered=true;e.startOffset=this.offset;}
        e.maxOffset=Math.max(e.maxOffset??0,Math.abs(this.offset));e.endOffset=this.offset;
        if(this.progress>=e.s&&!e.checked){e.checked=true;
          if(e.direction&&e.kind!=='start')this.checkSignal(e);
        }
        if(e.kind==='overtake'&&this.progress>e.s+30&&this.signalReady('right')&&this.time-this.looks.right<8)e.returnSignal=true;
      }
      if(this.progress>end){this.evaluate(e);}
    }
    this.parkingReady=this.progress>=this.route.length-20;
  }
  checkSignal(e){
    if(!this.signalReady(e.direction))this.fail(`${e.id}-signal`,`${e.label}：${e.direction==='left'?'左':'右'}转向灯未开启满 3 秒`);
    if(this.time-this.looks[e.direction]>8)this.fail(`${e.id}-look`,`${e.label}：未观察${e.direction==='left'?'左':'右'}后方`);
  }
  evaluate(e){
    const key=e.id;
    if(!e.entered)this.fail(`${key}-miss`,`${e.label}：未完成项目`);
    if(['school','bus','cross','meet'].includes(e.kind)){
      if(e.peakSpeed>=30)this.fail(`${key}-speed`,`${e.label}：未减速至 30 km/h 以下`);
      if(!e.braked)this.fail(`${key}-brake`,`${e.label}：未提前制动减速`);
      if(!e.lookLeft||!e.lookRight)this.fail(`${key}-look`,`${e.label}：未左右观察`);
    }
    if(['right','left','uturn'].includes(e.kind)&&e.peakSpeed>25)this.fail(`${key}-speed`,`${e.label}：转弯速度过快`);
    if(e.kind==='straight'&&(e.maxOffset??0)>1.2*this.route.scale)this.fail(`${key}-line`,'直线行驶：车身偏移过大');
    if(['change','overtake'].includes(e.kind)&&(Math.abs(e.endOffset??0)>1.5*this.route.scale||(e.maxOffset??0)>2.5*this.route.scale))this.fail(`${key}-path`,`${e.label}：未按要求驶入目标车道`);
    if(e.kind==='overtake'&&!e.returnSignal)this.fail(`${key}-return`,'超车：返回原车道前未打右灯并观察');
    e.status=this.faults.some(f=>f.key.startsWith(key))?'failed':'passed';
  }
  finishParking(){
    if(!this.parkingReady){this.message='请驶入终点靠边停车区域';return false;}
    if(this.speed>.1){this.message='请先踩刹车，待车辆停稳';return false;}
    const e=this.events.at(-1);this.checkSignal(e);
    if(!this.handbrake)this.fail('park-handbrake','停车后未拉驻车制动');
    if(this.gear!=='P')this.fail('park-gear','停车后未挂 P 挡');
    const gap=this.curbGap;
    if(gap<0)this.fail('park-curb','停车压到道路右侧边线');
    else if(gap>.5)this.fail('park-gap','停车距右侧边线超过 50 cm');
    else if(gap>.3)this.fail('park-gap','停车距右侧边线超过 30 cm',10);
    e.status=this.faults.some(f=>f.key.startsWith(e.id)||f.key.startsWith('park-'))?'failed':'passed';
    for(const event of this.events)if(event.status==='pending'){event.status='failed';this.fail(`${event.id}-miss`,`${event.label}：未完成项目`);}
    this.finished=true;this.message=this.score>=90?'本次模拟合格':'本次模拟未合格';return true;
  }
  get curbGap(){return 2.25*this.route.scale-this.offset-.9;}
  get next(){return this.events.find(e=>e.status==='pending')??this.events.at(-1);}
}
