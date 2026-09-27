import {LightStalk} from './lights.js';

export function mountLightStalk(root,exam,enabled,onChange,stalk=new LightStalk(exam)){
 root.innerHTML=`<div class="stalk-console"><div class="stalk-instruments"><span data-lamp="low">◖≋ 近光</span><span data-lamp="high">≡◗ 远光</span><span data-lamp="marker">☼ 示廓</span><span data-lamp="hazard">△ 双闪</span></div><div class="stalk-assembly"><div class="stalk-column" aria-hidden="true"></div><div class="stalk-arm" tabindex="0" role="slider" aria-label="远近光操作杆" aria-valuemin="-1" aria-valuemax="1" aria-valuenow="0"><span class="stalk-symbols">⇧ 远光<br>⇩ 闪光</span></div><div class="stalk-dial" tabindex="0" role="slider" aria-label="灯光旋钮" aria-orientation="vertical" aria-valuemin="0" aria-valuemax="2" aria-valuenow="0"><span class="dial-pointer">▴</span><span class="dial-grip">OFF<br>☼　◖≋</span></div><div class="dial-legend"><span>关</span><span>示廓</span><span>前照灯</span></div><button class="hazard-switch" aria-label="危险报警闪光灯开关" aria-pressed="false">△</button></div><div class="stalk-cues"><span>旋钮上下拖动 · 上开下关</span><span>杆身上推锁远光 · 再推回近光<br>下拉闪光 · 松手回位</span></div></div>`;
 const dial=root.querySelector('.stalk-dial'),arm=root.querySelector('.stalk-arm'),hazard=root.querySelector('.hazard-switch');
 function update(){
  dial.style.setProperty('--dial-angle',`${(stalk.dial-1)*45}deg`);dial.setAttribute('aria-valuenow',stalk.dial);dial.setAttribute('aria-valuetext',['关闭','示廓灯','前照灯'][stalk.dial]);
  arm.dataset.position=stalk.pulled?'pull':stalk.high?'push':'neutral';arm.setAttribute('aria-valuenow',stalk.pulled?-1:stalk.high?1:0);
  arm.setAttribute('aria-valuetext',stalk.pulled?'闪光，松手回位':stalk.high?'远光锁定':'近光位置');
  hazard.setAttribute('aria-pressed',exam.hazard);
  for(const lamp of root.querySelectorAll('[data-lamp]'))lamp.classList.toggle('on',lamp.dataset.lamp===exam.beam||(lamp.dataset.lamp==='hazard'&&exam.hazard));
  onChange();
 }
 let rotary=null,lever=null;
 dial.onpointerdown=e=>{if(!enabled())return;e.preventDefault();dial.setPointerCapture(e.pointerId);rotary={id:e.pointerId,y:e.clientY,value:stalk.dial};};
 dial.onpointermove=e=>{if(!rotary||e.pointerId!==rotary.id||!enabled())return;stalk.rotate(rotary.value+(rotary.y-e.clientY)/32);update();};
 dial.onpointerup=dial.onpointercancel=dial.onlostpointercapture=()=>{rotary=null;};
 arm.onpointerdown=e=>{if(!enabled())return;e.preventDefault();arm.setPointerCapture(e.pointerId);lever={id:e.pointerId,y:e.clientY,acted:false};};
 arm.onpointermove=e=>{if(!lever||e.pointerId!==lever.id||lever.acted||!enabled())return;const dy=e.clientY-lever.y;if(Math.abs(dy)<18)return;lever.acted=true;if(dy<0)stalk.push();else stalk.pull();update();};
 const release=()=>{lever=null;stalk.release();update();};arm.onpointerup=arm.onpointercancel=arm.onlostpointercapture=release;
 dial.onkeydown=e=>{if(!enabled()||!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();stalk.rotate(stalk.dial+(e.key==='ArrowUp'?1:-1));update();};
 arm.onkeydown=e=>{if(!enabled()||e.repeat||!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowUp')stalk.push();else stalk.pull();update();};
 arm.onkeyup=e=>{if(e.key==='ArrowDown')release();};arm.onblur=release;
 hazard.onclick=()=>{if(enabled()){stalk.hazard();update();}};
 update();return {refresh:update,release};
}
