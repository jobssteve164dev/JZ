export function lightPhase(time,offset=0){const t=((time+offset)%60+60)%60;return t<30?'red':t<56?'green':'yellow';}

// Circular red permits right turns after yielding; a directional light does not.
// Movement belongs to the route's junction, never to the indicator switch.
export function trafficSignal(light,time){
 const phase=lightPhase(time,light.offset);
 const yieldRight=phase==='red'&&light.type==='circular'&&light.movement==='right';
 return {phase,stop:phase!=='green'&&!yieldRight,redViolation:phase==='red'&&!yieldRight,
  label:yieldRight?'红灯 · 右转让行':{red:'红灯 · 停车',green:'绿灯',yellow:'黄灯 · 准备停车'}[phase]};
}
