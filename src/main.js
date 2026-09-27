import {mountThumbWheel} from './thumb-wheel.js';
import './style.css';
import {installApp,enterDrivingDisplay,registerOffline} from './install.js';
import {routes,getRoute,at} from './routes.js';
import {MEETING_SECONDS} from './maneuvers.js';
import {Simulation} from './simulation.js';
import {trafficSignal} from './traffic-signals.js';
import {DrivingScene} from './scene.js';
import {LightingExam,questions,lightNames} from './lights.js';
import {mountLightStalk} from './light-stalk.js';
import {LearningDriver} from './learning.js';
import {EngineSound} from './engine-sound.js';
const engineSound=new EngineSound();
const images={1:new URL('../input/mmexport1790494901618.jpg',import.meta.url).href,9:new URL('../input/mmexport1790494903835.jpg',import.meta.url).href,10:new URL('../input/mmexport1790494905745.jpg',import.meta.url).href,lights:new URL('../input/mmexport1790495905014.jpg',import.meta.url).href};
const $=s=>document.querySelector(s);
let selected=1,mode='practice',sim=new Simulation(getRoute(1)),scene,screen='home',lightExam=null,lightOnly=false,lightFailures=[],voice=true,voiceBusy=false,lightAwait=false,lastAnnounced='',noticeUntil=0,noticeText='',lastTime=performance.now(),lastUI=0;
const portraitTouch=matchMedia('(pointer: coarse) and (orientation: portrait)');
const held=new Set();let touchSteer=0,keyboardSteer=0;
let stalkUI=null,lightSettle=0,lightFeedbackTime=0,learner=null;
const modeNames={practice:'带提示练习',exam:'模拟考试',learn:'跟随学习'};
const app=$('#app');
app.innerHTML=`<canvas id="world" aria-label="吴江科目三三维驾驶场景"></canvas><main class="shell">
<section id="home"><header class="topbar"><div class="brand"><svg aria-hidden="true" viewBox="0 0 40 40"><path d="M5 35 13 5h14l8 30M20 8v7m0 6v7m0 6v5" fill="none" stroke="currentColor" stroke-width="3"/></svg>吴江科三 <span class="tag">C2 自动挡</span></div><div class="top-actions"><button id="install">安装到手机</button><button id="help">操作指南</button></div></header>
<div class="landing"><div class="eyebrow">WUJIANG · DRIVING PRACTICE</div><h1>把路线练熟。<br><span>上考场更从容。</span></h1><p class="intro">先认路，再练动作。每次 3 公里，<br>从模拟灯光开始，练到靠边停车。</p><div class="course-list">${routes.map(r=>`<button class="course ${r.id===1?'active':''}" data-route="${r.id}" aria-pressed="${r.id===1}"><b style="color:${r.color}">${String(r.id).padStart(2,'0')}</b><span><strong>${r.name}</strong><small>${r.subtitle}</small></span><span aria-hidden="true">↗</span></button>`).join('')}</div><div class="mode"><button data-mode="practice" class="active" aria-pressed="true">带提示练习</button><button data-mode="exam" aria-pressed="false">模拟考试</button><button data-mode="learn" aria-pressed="false">跟随学习</button></div><button id="start" class="primary start"><span>开始练习</span><span aria-hidden="true">→</span></button><div class="secondary-actions"><button id="only-lights">单练灯光</button><button id="source">路线与考点</button></div><p class="footer-note">3.0 km · 约 15 分钟 · 键盘 / 触屏操作</p></div>
<aside class="route-preview"><div class="progress-label"><strong id="preview-name">一号线</strong><span>路线预览</span></div><canvas class="map" id="preview-map" width="400" height="300" aria-label="所选路线示意图"></canvas><p>跟着路口记方向，跟着标志练动作。</p></aside></section>
<section id="game" class="hidden"><div class="rotate-tip"><strong>横放手机，开始驾驶</strong><p>横屏能看清道路，也方便双手控制油门和方向。</p></div><div class="cockpit-rim"></div><div class="hud"><div class="hud-left"><strong id="route-title">一号线</strong><span class="tag" id="mode-title">练习</span><span class="stat" id="clock">00:00</span></div><div class="hud-right"><span class="score-label">模拟得分 <b id="score">100</b></span><button id="engine-sound" aria-label="发动机音效" aria-pressed="true">音效</button><button id="car-lights">灯光</button><button id="view">驾驶位</button><button id="pause">暂停</button><button id="game-help">?</button></div></div><aside class="driving-info"><div class="eyebrow" id="upcoming">准备起步</div><h2 id="instruction">起步</h2><p id="hint"></p><div class="signal-status"><span id="indicator">转向灯关闭</span><span id="traffic">留意交通信号</span></div></aside><aside class="game-map"><canvas class="map" id="mini-map" width="300" height="280" aria-label="路线与当前位置"></canvas><div class="progress-label"><span id="distance">0.00 km</span><span>3.00 km</span></div><div class="progress"><i id="progress-bar"></i></div></aside><div class="notice hidden" role="status" id="notice"></div>
<div class="dashboard"><div class="driver-left"><div class="speedometer"><div><strong id="speed">0</strong><small>km/h</small></div><div><div class="gear" id="gear">P</div><small id="brake-status">驻车制动</small></div></div><div id="thumb-wheel" class="thumb-wheel" role="slider" tabindex="0" aria-label="左手方向盘" aria-valuemin="-1" aria-valuemax="1" aria-valuenow="0"><svg viewBox="0 0 160 160" aria-hidden="true"><circle class="wheel-rim" cx="80" cy="80" r="65"/><path class="wheel-spoke" d="M20 65 66 78M140 65 94 78M80 144V96"/><circle class="wheel-hub" cx="80" cy="80" r="22"/><path class="wheel-marker" d="M80 12v12"/></svg></div></div><div class="controls"><div class="controls-row"><button data-action="signal" data-value="left">← 左灯 <span class="key">Q</span></button><button data-action="look" data-value="left">观察左后 <span class="key">Z</span></button><button data-action="look" data-value="right">观察右后 <span class="key">C</span></button><button data-action="signal" data-value="right">右灯 → <span class="key">E</span></button></div><div class="controls-row"><button data-action="gear" data-value="D">D 挡</button><button data-action="gear" data-value="N">N 挡</button><button data-action="gear" data-value="P">P 挡</button><button data-action="handbrake" class="status-button" id="handbrake">松驻车制动</button><button data-action="belt" class="status-button" id="belt">安全带</button><button data-action="finish" class="hidden" id="finish">结束考试</button></div><div class="controls-row steering"><button data-hold="left" aria-label="向左转向">↶</button><label for="wheel">方向盘</label><input id="wheel" type="range" min="-1" max="1" step=".01" value="0" aria-label="方向盘"><button data-hold="right" aria-label="向右转向">↷</button><small>松开回正</small></div></div><div class="pedals"><button data-hold="brake">刹车<br><small>↓ / 空格</small></button><button data-hold="throttle" class="accelerator">油门<br><small>↑ / W</small></button></div></div></section></main><div id="modal" class="overlay hidden"></div>`;
let voiceEpoch=0;
function speak(text,done,queue=false){
 if(!voice||!('speechSynthesis'in window)){voiceBusy=false;done?.();return;}
 if(!queue)stopVoice();const epoch=voiceEpoch,u=new SpeechSynthesisUtterance(text);u.lang='zh-CN';u.rate=1;voiceBusy=true;
 u.onstart=()=>{if(epoch===voiceEpoch)voiceBusy=true;};u.onend=u.onerror=()=>{if(epoch!==voiceEpoch)return;voiceBusy=false;done?.();};speechSynthesis.speak(u);
}
function stopVoice(){voiceEpoch++;if('speechSynthesis'in window)speechSynthesis.cancel();voiceBusy=false;}
function spokenAt(session){return session.time+(session===sim&&screen==='drive'&&!session.paused?Math.max(0,(performance.now()-lastTime)/1000):0);}
function showNotice(text){noticeText=text;noticeUntil=performance.now()+6000;$('#notice').textContent=text;$('#notice').classList.remove('hidden');}
function map(canvas,route,state){
 const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;c.clearRect(0,0,w,h);
 const xs=route.path.map(p=>p.x),zs=route.path.map(p=>p.z);const minX=Math.min(...xs)-40,maxX=Math.max(...xs)+40,minZ=Math.min(...zs)-40,maxZ=Math.max(...zs)+40;
 const scale=Math.min((w-24)/(maxX-minX),(h-24)/(maxZ-minZ));const ox=(w-(maxX-minX)*scale)/2,oz=(h-(maxZ-minZ)*scale)/2;
 const xy=p=>[ox+(p.x-minX)*scale,oz+(p.z-minZ)*scale];
 c.lineCap='round';c.strokeStyle='#466a65';c.lineWidth=10;
 for(const [x1,z1,x2,z2]of route.roads){c.beginPath();c.moveTo(...xy({x:x1,z:z1}));c.lineTo(...xy({x:x2,z:z2}));c.stroke();}
 c.strokeStyle=route.color;c.lineWidth=3;c.beginPath();route.path.forEach((p,i)=>i?c.lineTo(...xy(p)):c.moveTo(...xy(p)));c.stroke();
 for(const [i,p]of [route.path[0],route.path.at(-1)].entries()){const[x,y]=xy(p);c.fillStyle=i?'#f4ce80':'#b5f1d4';c.beginPath();c.arc(x,y,5,0,Math.PI*2);c.fill();}
 if(state){const[x,y]=xy(state.position);c.save();c.translate(x,y);c.rotate(state.heading);c.fillStyle='#fff';c.beginPath();c.moveTo(0,-9);c.lineTo(-5,6);c.lineTo(5,6);c.closePath();c.fill();c.restore();}
}
function dialog(title,body,kind=''){
 $('#modal').innerHTML=`<div role="dialog" aria-modal="true" aria-label="${title}" class="dialog ${kind}"><header><h2>${title}</h2><button id="close-modal" aria-label="关闭">✕</button></header>${body}</div>`;
 $('#modal').classList.remove('hidden');$('#close-modal').onclick=closeModal;$('#close-modal').focus();
}
function closeModal(){
 if(screen==='lights'||(screen==='drive'&&portraitTouch.matches))return;
 $('#modal').classList.add('hidden');if(screen==='drive'){
  sim.paused=false;lastTime=performance.now();const session=sim,e=sim.events.find(e=>e.status==='pending'&&e.startPrompt&&(e.kind==='meet'?e.meetingStart===undefined:e.travelStart===undefined));
  if(e)speak(e.startPrompt.text,()=>session.promptFinished(e.startPrompt.id,spokenAt(session)));
  else if(mode==='learn'&&learner?.caption)speak(learner.caption);
 }
}
function help(){
 if(screen==='drive'){sim.paused=true;resetControls();stopVoice();}
 dialog('怎么练',`<div class="help-grid"><p><b>油门 / 刹车</b><br>↑ 或 W 加速；↓、S 或空格制动。触屏长按踏板。</p><p><b>方向盘</b><br>← → 或 A / D 转向；触屏用左拇指转动左侧方向盘，右手同时控制踏板；松开回正。</p><p><b>观察与打灯</b><br>Q / E 左右转向灯；Z / C 观察左右后方。转向前打灯满 3 秒。</p><p><b>起步与停车</b><br>起步：安全带、D 挡、松驻车制动。终点：制动停稳、拉驻车制动、P 挡、结束考试。</p></div><p>跟随学习会自动驾驶并讲解全部考点；带提示练习由你自己驾驶；考试模式隐藏引导与学校、公交站预告。模拟扣分后仍可开完全程，再复盘错误。</p><p>三条路线依据考点图还原方向与项目，每条 3 公里。分段距离、道路外观与红绿灯周期为模拟设置，不能代替实车训练或考场当天要求。</p><button id="toggle-voice">${voice?'关闭':'开启'}语音</button><button id="rules-link">考试依据</button>`);
 $('#toggle-voice').onclick=()=>{voice=!voice;stopVoice();help();};$('#rules-link').onclick=rules;
}
function rules(){dialog('资料与练习范围',`<p>路线以提供的一号、九号、十号线图片为准。灯光题目取自新增的“苏州观山科目三考场”图，不代表吴江官方题库。</p><p>模拟按 100 分计分，90 分合格；未打灯满 3 秒、闯红灯、未观察等记为不合格事项。道路尺寸、方向容差和感应范围为训练参数。</p><p><a href="https://btgaj.xjbt.gov.cn/c/2025-01-06/8378604.shtml" target="_blank" rel="noreferrer">公安部：机动车驾驶证申领和使用规定</a></p><p><a href="https://gaj.cq.gov.cn/zwgk/zcjd/201912/t20191227_3566720.html" target="_blank" rel="noreferrer">重庆公安：考试标准变化解读</a></p><p><a href="https://www.wuhan.gov.cn/zwgk/xxgk/zcjd/mtzj/202109/t20210923_1782799.shtml" target="_blank" rel="noreferrer">武汉政府：转向灯及停车要求</a></p><p><a href="https://ga.chengde.gov.cn/art/2024/4/12/art_3027_996587.html" target="_blank" rel="noreferrer">承德公安：学校等项目观察路牌</a></p><p><a href="https://www.wuxi.gov.cn/ztzl/jszbl/index.shtml" target="_blank" rel="noreferrer">无锡政府：学校、公交站减速要求</a></p>`);}
function source(){const r=getRoute(selected);dialog(`${r.name} · 路线与考点`,`<div class="route-detail"><img src="${images[selected]}" alt="${r.name}考场路线参考图"><div><p>按行驶方向依次练习：</p><ol>${r.events.map(e=>`<li>${e.label}${e.kind==='change'?' · '+(e.direction==='left'?'向左':'向右'):''}</li>`).join('')}</ol></div></div><p>图中未标出的路段长度及信号配时为模拟设置。</p>`);}
function selectRoute(id){selected=id;sim=new Simulation(getRoute(id),mode);scene.build(sim.route);map($('#preview-map'),sim.route);$('#preview-name').textContent=sim.route.name;document.querySelectorAll('[data-route]').forEach(b=>{const active=+b.dataset.route===id;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});}
function prepare(){
 dialog('上车准备',`<p>先完成检查，再开始模拟灯光考试。</p><div class="checklist"><button id="walk">绕车检查车辆与周围情况</button><button id="door">观察后方，关好车门</button><button id="seat">调整座椅、后视镜并系好安全带</button></div><button class="primary" id="begin-lights" disabled>开始模拟灯光</button>`);
 let ready=new Set();for(const id of ['walk','door','seat'])$('#'+id).onclick=()=>{ready.add(id);$('#'+id).classList.add('active');$('#begin-lights').disabled=ready.size<3;};
 $('#begin-lights').onclick=()=>{lightOnly=false;startLights();};
}
function startLights(){
 screen='lights';lightExam=new LightingExam(lightOnly?'practice':mode,{standalone:lightOnly});lightFailures=[];lightAwait=false;
 dialog(lightOnly?'灯光乱序练习':'起步前 · 随机五题',`<div class="progress-label"><span id="light-count"></span><span id="light-timer" class="timer"></span></div><div class="light-road" id="light-road" data-beam="off"></div><div class="light-question" id="light-question"></div><p id="light-guide"></p><div id="light-stalk"></div><div class="light-bottom"><p class="light-feedback" id="light-feedback" role="status"></p><button id="repeat-voice">重听口令</button><button class="primary hidden" id="light-continue">进入道路练习</button></div>`,'lighting');
 $('#close-modal').onclick=()=>{stopVoice();lightExam=null;screen='home';$('#modal').classList.add('hidden');};
 stalkUI=mountLightStalk($('#light-stalk'),lightExam,()=>(!lightAwait||lightExam.done)&&!voiceBusy,updateLights);
 $('#light-continue').onclick=completeLights;$('#repeat-voice').onclick=()=>{if(lightExam.mode!=='exam'&&!lightAwait)speak(questions[lightExam.current].text);};
 showLightQuestion();
}
function updateLights(){
 if(!lightExam||!$('#light-road'))return;
 $('#light-road').dataset.beam=lightExam.beam;
 $('#light-road').dataset.hazard=lightExam.hazard;
 if(lightExam.done)$('#light-continue').disabled=lightExam.beam!=='off'||lightExam.hazard;
}
function showLightQuestion(){
 lightAwait=false;lightSettle=0;const q=questions[lightExam.current];$('#light-question').textContent=q.text;$('#light-count').textContent=lightOnly?`${lightExam.index+1} / ${lightExam.order.length}`:lightExam.index===0?'准备 · 开启前照灯':lightExam.current===18?'收尾 · 关闭所有灯光':`${lightExam.index} / 5`;
 $('#light-guide').textContent=lightExam.mode!=='exam'?(lightExam.current===18?'关闭全部灯光后继续。':`操作要点：${lightNames[q.answer]}。完成后自动进入下一题。`):'听完口令后，在 5 秒内完成操作。';
 $('#light-feedback').textContent='';$('#repeat-voice').disabled=lightExam.mode==='exam';updateLights();speak(q.text);
}
function submitLight(){
 if(voiceBusy)return;
 if(lightAwait)return;
 const q=questions[lightExam.current],passed=lightExam.submit();lightAwait=true;
 if(!passed)lightFailures.push(q.text);
 $('#light-feedback').textContent=passed?'操作正确':`本题未通过。正确操作：${lightNames[q.answer]}`;
 lightFeedbackTime=0;
 if(lightExam.done){$('#light-continue').classList.remove('hidden');$('#light-continue').textContent=lightOnly?'查看灯光成绩':mode==='learn'?'开始跟随学习':'进入道路练习';if(!passed)$('#light-guide').textContent='请关闭前照灯、示廓灯和双闪，再继续。';updateLights();}
}
function completeLights(){
 if(!lightExam?.done||lightExam.beam!=='off'||lightExam.hazard)return;
 stopVoice();if(lightOnly){const results=lightExam.results;screen='home';dialog('灯光练习结果',`<div class="result-score">${results.filter(r=>r.passed).length}<small> / ${results.length}</small></div><p>答错的口令值得再练一遍。</p><div class="results-list">${results.map(r=>`<div class="result-row ${r.passed?'':'bad'}"><span>${r.question.text}<br><small>${lightNames[r.question.answer]}</small></span><b>${r.passed?'正确':'待练'}</b></div>`).join('')}</div><button class="primary" id="retry-lights">再练一次</button>`);$('#retry-lights').onclick=startLights;lightExam=null;return;}
 startDriving();
}
function startDriving(){
 engineSound.unlock();lightExam=null;sim=new Simulation(getRoute(selected),mode,{waitForSpeech:voice&&'speechSynthesis'in window});sim.belt=true;
 if(lightFailures.length&&mode!=='learn')sim.fail('lighting','模拟灯光有未通过项目');
 const session=sim;learner=mode==='learn'?new LearningDriver(sim,(text,done)=>speak(text,()=>done?.(spokenAt(session)),true)):null;
 $('#game').classList.toggle('learning',mode==='learn');
 scene.build(sim.route);screen='drive';resetControls();
 $('#modal').classList.add('hidden');$('#home').classList.add('hidden');$('#game').classList.remove('hidden');$('#route-title').textContent=sim.route.name;$('#mode-title').textContent=modeNames[mode];lastAnnounced='';if(mode!=='learn')speak('请起步');if(portraitTouch.matches)pause();
}
function pause(){
 if(screen!=='drive')return;engineSound.silence();sim.paused=true;resetControls();stopVoice();
 dialog('已暂停',`<p>计时与车辆均已暂停。</p><button class="primary" id="resume">继续驾驶</button> <button id="restart">重练这条路线</button> <button id="back-home">返回选路线</button>`);
 $('#resume').onclick=closeModal;$('#restart').onclick=()=>{screen='home';$('#game').classList.add('hidden');$('#home').classList.remove('hidden');prepare();};$('#back-home').onclick=home;
}
function vehicleLighting(){
 if(screen!=='drive')return;sim.paused=true;resetControls();stopVoice();
 dialog('车辆灯光','<div id="vehicle-stalk"></div>');
 mountLightStalk($('#vehicle-stalk'),sim.lighting,()=>true,()=>{},sim.lightStalk);
}
function home(){engineSound.silence();screen='home';stopVoice();resetControls();$('#modal').classList.add('hidden');$('#home').classList.remove('hidden');$('#game').classList.add('hidden');selectRoute(selected);}
function results(){
 engineSound.silence();screen='result';stopVoice();resetControls();const failed=sim.faults;
 if(mode==='learn'){
  dialog('这条路线，学完了',`<p>${sim.route.name} · 3 公里 · ${formatTime(sim.time)}</p><p>现在自己开一遍，把路口方向和操作要点记牢。</p><button class="primary" id="try-driving">自己练一遍</button> <button id="return">换条路线</button>`);
  $('#close-modal').onclick=home;$('#return').onclick=home;$('#try-driving').onclick=()=>{document.querySelector('[data-mode="practice"]').click();home();prepare();};return;
 }
 const record={route:selected,score:sim.score,date:new Date().toISOString(),time:Math.round(sim.time)};
 try{const history=JSON.parse(localStorage.getItem('km3-history')||'[]');localStorage.setItem('km3-history',JSON.stringify([record,...(Array.isArray(history)?history:[])].slice(0,20)));}catch{}
 dialog(sim.score>=90?'本次模拟合格':'这些动作，再练一遍',`<div class="result-score">${sim.score}<small> 分</small></div><p>${sim.route.name} · ${formatTime(sim.time)} · 行驶 ${(sim.distance/1000).toFixed(2)} km</p><p>${failed.length?'下次优先练习以下项目。':'所有模拟项目完成，继续保持观察和减速的习惯。'}</p><div class="results-list">${failed.map(f=>`<div class="result-row bad"><span>${f.text}<br><small>${formatTime(f.time)} · ${Math.round(f.s)} m</small></span><b>−${f.points}</b></div>`).join('')}${sim.events.map(e=>`<div class="result-row ${e.status==='failed'?'bad':''}"><span>${e.label}</span><b>${e.status==='passed'?'已完成':'待加强'}</b></div>`).join('')}</div><button class="primary" id="retry">再练这条路线</button> <button id="return">换条路线</button><p><small>本结果仅为游戏内训练反馈，不是正式考试成绩。</small></p>`);
 $('#close-modal').onclick=home;$('#retry').onclick=()=>{home();prepare();};$('#return').onclick=home;
}
function formatTime(seconds){return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;}
function renderActionState(){
 for(const b of document.querySelectorAll('[data-action="signal"],[data-action="look"]')){
  const active=b.dataset.action==='signal'?sim.signal===b.dataset.value:sim.time-sim.looks[b.dataset.value]<.8;
  b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);
 }
}
function renderUI(){
 renderActionState();
 $('#speed').textContent=Math.round(sim.speed*3.6);$('#gear').textContent=sim.gear;$('#clock').textContent=formatTime(sim.time);$('#score').textContent=sim.score;
 $('#distance').textContent=(Math.min(sim.progress,3000)/1000).toFixed(2)+' km';$('#progress-bar').style.width=Math.min(100,sim.progress/30)+'%';
 $('#handbrake').textContent=sim.handbrake?'松驻车制动':'拉驻车制动';$('#handbrake').classList.toggle('active',sim.handbrake);$('#belt').classList.toggle('active',sim.belt);$('#brake-status').textContent=sim.handbrake?'驻车制动':'行驶准备';
 for(const b of document.querySelectorAll('[data-action="gear"]'))b.classList.toggle('active',sim.gear===b.dataset.value);
 $('#indicator').textContent=sim.lighting.hazard?'△ 双闪开启':sim.signal==='off'?'转向灯关闭':`${sim.signal==='left'?'← 左灯':'右灯 →'} ${sim.signalAge.toFixed(1)} 秒`;
 const light=sim.route.lights.find(l=>l.s>=sim.progress&&l.s-sim.progress<130);
 $('#traffic').textContent=light?`${trafficSignal(light,sim.time).label} ${Math.round(light.s-sim.progress)}m`:'留意交通信号';
 let e=sim.next;
 if(mode==='exam'&&e.silent){e=sim.events.find(x=>x.s>e.s&&!x.silent&&x.status==='pending')??e;}
 const maneuver=sim.events.find(x=>x.status==='pending'&&(x.meetingEntered||x.overtakeEntered));
 if(maneuver)e=maneuver;
 const approaching=e.s-sim.progress<80;
 $('#upcoming').textContent=sim.parkingReady?'靠边停车区域':`${approaching?'当前项目':'前方项目'} · ${Math.max(0,Math.round(e.s-sim.progress))}m`;
 if(maneuver)$('#upcoming').textContent=maneuver.kind==='meet'?(maneuver.meetingStart===undefined?'会车 · 听口令':`会车 · 剩余 ${Math.min(MEETING_SECONDS,Math.max(0,MEETING_SECONDS-(sim.time-maneuver.meetingStart))).toFixed(1)} 秒`):(maneuver.travelStart===undefined?'超车 · 听口令':`超车 · 剩余 ${Math.max(0,150-(sim.distance-maneuver.travelStart)).toFixed(0)} 米`);
 $('#instruction').textContent=mode==='exam'&&!approaching?'按路线行驶':e.label;
 $('#hint').textContent=mode==='learn'?learner.caption:sim.parkingReady?`距右边线约 ${Math.max(-99,Math.round(sim.curbGap*100))} cm。停稳后拉驻车制动、挂 P 挡。`:mode==='practice'?e.hint:'留意道路标志，按口令完成考试。';
 $('#finish').classList.toggle('hidden',!sim.parkingReady);
 if(mode!=='learn'&&approaching&&lastAnnounced!==e.id&&!e.silent){lastAnnounced=e.id;if(!['start','meet','overtake'].includes(e.kind))speak(`前方${e.label}`,null,true);}
 if(sim.message!==noticeText&&sim.faults.some(f=>f.text===sim.message))showNotice(sim.message);
 if(performance.now()>noticeUntil)$('#notice').classList.add('hidden');
 map($('#mini-map'),sim.route,sim);
}
function animate(now){
 const dt=Math.max(0,(now-lastTime)/1000);lastTime=now;
 if(screen==='drive'){
  sim.waitForSpeech=voice&&'speechSynthesis'in window;
  const dir=(held.has('right')?1:0)-(held.has('left')?1:0);keyboardSteer+=(dir-keyboardSteer)*Math.min(1,dt*5);
  if(learner)learner.step(dt);else sim.step(dt,{throttle:held.has('throttle')?1:0,brake:held.has('brake')?1:0,steer:touchSteer||keyboardSteer});
  if(!touchSteer)$('#wheel').value=keyboardSteer;thumbWheel.render(sim.paused?0:sim.steer);
  scene.render(sim);if(now-lastUI>100){renderUI();lastUI=now;}
  for(const p of sim.prompts.splice(0)){const session=sim;showNotice(p.text);speak(p.text,()=>session.promptFinished(p.id,spokenAt(session)),true);}
  if(sim.finished)results();
 }else if(screen==='home'||screen==='lights')scene.render(sim,true);
 if(screen==='lights'&&lightExam&&!document.hidden){
  if(lightAwait){lightFeedbackTime+=dt;$('#light-timer').textContent=lightExam.done?'本组已完成':`${Math.max(0,Math.ceil(5-lightFeedbackTime))} 秒后下一题`;if(!lightExam.done&&lightFeedbackTime>=5)showLightQuestion();}
  else if(!voiceBusy){lightExam.elapsed+=dt;lightSettle=lightExam.check()?lightSettle+dt:0;$('#light-timer').textContent=lightExam.mode==='exam'?`${Math.max(0,5-lightExam.elapsed).toFixed(1)} 秒`:'不限时练习';if(lightExam.mode==='exam'?lightExam.elapsed>=5:lightSettle>=1)submitLight();}
 }
 engineSound.update(sim,screen==='drive'&&!document.hidden,voiceBusy);
 requestAnimationFrame(animate);
}
$('#help').onclick=$('#game-help').onclick=help;$('#source').onclick=source;$('#start').onclick=()=>{enterDrivingDisplay();prepare();};$('#install').onclick=()=>installApp(dialog);$('#only-lights').onclick=()=>{lightOnly=true;startLights();};$('#pause').onclick=pause;
$('#engine-sound').onclick=()=>{engineSound.enabled=!engineSound.enabled;$('#engine-sound').setAttribute('aria-pressed',engineSound.enabled);$('#engine-sound').textContent=engineSound.enabled?'音效':'静音';if(engineSound.enabled)engineSound.unlock();else engineSound.silence();};
$('#car-lights').onclick=vehicleLighting;
$('#view').onclick=()=>{scene.view=scene.view==='chase'?'cockpit':'chase';$('#view').textContent=scene.view==='chase'?'驾驶位':'跟车视角';};
for(const b of document.querySelectorAll('[data-route]'))b.onclick=()=>selectRoute(+b.dataset.route);
for(const b of document.querySelectorAll('[data-mode]'))b.onclick=()=>{mode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(x=>{const active=x===b;x.classList.toggle('active',active);x.setAttribute('aria-pressed',active);});$('#start span').textContent=mode==='practice'?'开始练习':mode==='learn'?'开始跟随学习':'开始模拟考试';};
for(const b of document.querySelectorAll('[data-action]'))b.onclick=()=>{if(mode==='learn')return;sim.action(b.dataset.action,b.dataset.value);renderActionState();if(['look','gear','handbrake','finish'].includes(b.dataset.action))showNotice(b.dataset.action==='look'?`已观察${b.dataset.value==='left'?'左':'右'}后方`:sim.message);};
for(const b of document.querySelectorAll('[data-hold]')){
 const release=()=>{held.delete(b.dataset.hold);b.classList.remove('active');};
 b.onpointerdown=e=>{b.setPointerCapture(e.pointerId);held.add(b.dataset.hold);b.classList.add('active');};b.onpointerup=b.onpointercancel=b.onlostpointercapture=release;
}
$('#wheel').oninput=e=>touchSteer=+e.target.value;$('#wheel').onpointerup=$('#wheel').onpointercancel=$('#wheel').onkeyup=()=>{touchSteer=0;$('#wheel').value=0;};
const thumbWheel=mountThumbWheel($('#thumb-wheel'),()=>screen==='drive'&&!sim.paused&&mode!=='learn',value=>{touchSteer=value;$('#wheel').value=value;});
function resetControls(){held.clear();touchSteer=0;keyboardSteer=0;$('#wheel').value=0;thumbWheel.reset();document.querySelectorAll('[data-hold]').forEach(b=>b.classList.remove('active'));}
document.addEventListener('contextmenu',e=>{if(matchMedia('(pointer: coarse)').matches)e.preventDefault();});
const keyMap={ArrowUp:'throttle',KeyW:'throttle',ArrowDown:'brake',KeyS:'brake',Space:'brake',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
addEventListener('keydown',e=>{
 if(e.code==='Tab'&&!$('#modal').classList.contains('hidden')){const nodes=[...$('#modal').querySelectorAll('button:not(:disabled):not(.hidden),a,[tabindex="0"]')];if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===nodes.at(-1)){e.preventDefault();nodes[0].focus();}return;}
 if(e.code==='Escape'){if(screen==='drive'&&$('#modal').classList.contains('hidden'))pause();else closeModal();return;}
 if(screen!=='drive'||sim.paused||mode==='learn'||e.ctrlKey||e.metaKey||e.altKey||e.target.tagName==='INPUT')return;
 if(keyMap[e.code]){e.preventDefault();held.add(keyMap[e.code]);}
 if(e.repeat)return;
 const actions={KeyQ:['signal','left'],KeyE:['signal','right'],KeyZ:['look','left'],KeyC:['look','right']};if(actions[e.code]){sim.action(...actions[e.code]);renderActionState();}
});
addEventListener('keyup',e=>{if(keyMap[e.code])held.delete(keyMap[e.code]);});
portraitTouch.addEventListener('change',()=>{if(screen==='drive'&&portraitTouch.matches)pause();});
document.addEventListener('visibilitychange',()=>{lastTime=performance.now();if(document.hidden&&screen==='drive'&&!sim.paused)pause();});
addEventListener('blur',()=>{held.clear();touchSteer=0;if(screen==='drive'&&!sim.paused)pause();});
registerOffline();
try{scene=new DrivingScene($('#world'));selectRoute(1);requestAnimationFrame(animate);}catch(error){app.innerHTML='<div class="webgl-error"><h1>暂时无法开启 3D 画面</h1><p>请使用支持 WebGL 的新版 Chrome、Edge 或 Safari，并开启浏览器硬件加速后重试。</p><button onclick="location.reload()">重新加载</button></div>';console.error(error);}
