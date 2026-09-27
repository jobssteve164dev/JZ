async page=>{
 await page.setViewportSize({width:844,height:390});
 const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  Math.random=()=>.999;window.__spoken=[];window.__completed=[];window.__cancelled=[];window.__timeline=[];
  let active=null;const queue=[];
  const pump=()=>{if(active||!queue.length)return;const u=queue.shift();active={u,timer:null};__timeline.push({type:'start',text:u.text,time:Date.now()});u.onstart?.();active.timer=setTimeout(()=>{__completed.push(u.text);__timeline.push({type:'end',text:u.text,time:Date.now()});active=null;u.onend?.();pump();},Math.max(300,u.text.length*200));};
  speechSynthesis.speak=u=>{__timeline.push({type:'request',text:u.text,time:Date.now()});__spoken.push(u.text);queue.push(u);pump();};
  speechSynthesis.cancel=()=>{if(active){clearTimeout(active.timer);__cancelled.push(active.u.text);active=null;}__cancelled.push(...queue.map(u=>u.text));queue.length=0;};
  const Native=window.AudioContext;window.AudioContext=class extends Native{constructor(){super();window.__engineContext=this;}createGain(){const g=super.createGain();window.__engineGain=g;return g;}};
 });
 for(const id of [1,9,10]){
  await page.reload();await page.clock.install({time:new Date('2026-09-27T00:00:00Z')});await page.clock.pauseAt(new Date('2026-09-27T00:00:01Z'));await page.locator(`[data-route="${id}"]`).click();await page.locator('[data-mode="learn"]').click();await page.locator('#start').click();for(const key of ['walk','door','seat','begin-lights'])await page.locator('#'+key).click();
  await page.clock.fastForward(5000);const dial=page.getByRole('slider',{name:'灯光旋钮',exact:true});await dial.focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');
  for(let i=0;i<6;i++){await page.clock.fastForward(1100);await page.clock.fastForward(5100);await page.clock.fastForward(5000);}await dial.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.clock.fastForward(1100);await page.locator('#light-continue').click();await page.clock.fastForward(1000);
  const audio=await page.evaluate(()=>({state:__engineContext.state,gain:__engineGain.gain.value}));if(audio.state!=='running'||audio.gain<=0)throw new Error('engine audio not running '+JSON.stringify(audio));
  await page.locator('#engine-sound').click();await page.waitForTimeout(100);if(await page.evaluate(()=>__engineGain.gain.value)!==0)throw new Error('mute did not silence');await page.locator('#engine-sound').click();
  await page.locator('#pause').click();await page.waitForTimeout(100);if(await page.evaluate(()=>__engineGain.gain.value)!==0)throw new Error('pause did not silence');await page.locator('#resume').click();
  let meetingHUD=[];
  for(let i=0;i<5000&&!await page.getByRole('dialog',{name:'这条路线，学完了',exact:true}).isVisible();i++){
   if(await page.locator('#resume').isVisible())throw new Error('Unexpected browser focus loss paused driving');
   const state=await page.evaluate(()=>({km:parseFloat(document.querySelector('#distance').textContent),up:document.querySelector('#upcoming').textContent}));
   if(state.up.startsWith('会车 · 剩余'))meetingHUD.push(parseFloat(state.up.split('剩余 ')[1]));
   const near=id===1?state.km>1.08&&state.km<1.48:id===9?state.km>.06&&state.km<.50||state.km>2.62&&state.km<2.83:state.km>.06&&state.km<.23||state.km>1.52&&state.km<1.78;
   await page.clock.fastForward(near?200:5000);
  }
  const finished=await page.getByRole('dialog',{name:'这条路线，学完了',exact:true}).isVisible(),score=await page.locator('#score').textContent();
  const prompts=await page.evaluate(()=>__completed.filter(t=>t.startsWith('开始会车')||t.startsWith('会车结束')||t.startsWith('会车完成')||t.startsWith('开始超车')||t.startsWith('请返回原车道')||t.startsWith('超车完成')));
  await page.waitForTimeout(100);const silent=await page.evaluate(()=>__engineGain.gain.value===0);
  const timeline=await page.evaluate(()=>__timeline),maneuver=t=>/^(前方超车|开始超车|请返回原车道|超车完成|前方会车|开始会车|会车结束|会车完成)/.test(t);
  const phases=timeline.filter(p=>maneuver(p.text));
  const meetStart=phases.find(p=>p.type==='start'&&p.text.startsWith('开始会车'));
  const meetEnd=phases.find(p=>p.type==='end'&&p.text.startsWith('会车完成'));
  const overStart=phases.find(p=>p.type==='start'&&p.text.startsWith('前方超车'));
  const overEnd=phases.find(p=>p.type==='end'&&p.text.startsWith('超车完成'));
  const returnEnd=phases.find(p=>p.type==='end'&&p.text.startsWith('会车结束'));
  if(returnEnd.time-meetStart.time>3500)throw new Error('return instruction leaves less than 1.5 seconds to act');
  const gap=overStart.time>meetStart.time?overStart.time-meetEnd.time:meetStart.time-overEnd.time;
  const delays=phases.filter(p=>p.type==='request'&&/^(开始会车|开始超车|请返回原车道)/.test(p.text)).map(p=>({text:p.text,delay:phases.find(x=>x.type==='start'&&x.text===p.text).time-p.time}));
  if(gap<3000||delays.some(p=>p.delay>1000)||!meetingHUD.length||Math.max(...meetingHUD)>5)throw new Error(JSON.stringify({id,gap,delays,meetingHUD,phases}));
  const cancelled=await page.evaluate(()=>__cancelled.filter(t=>t.startsWith('开始会车')||t.startsWith('会车结束')||t.startsWith('会车完成')||t.startsWith('开始超车')||t.startsWith('请返回原车道')||t.startsWith('超车完成')));
  if(!finished||score!=='100'||prompts.length!==6||!silent||cancelled.length)throw new Error(JSON.stringify({id,finished,score,prompts,silent,cancelled}));results.push({id,finished,score,prompts,audio,silent,cancelled,gap,delays,meetingHUD,phases});
 }
 if(errors.length)throw new Error(JSON.stringify(errors));await page.clock.resume();return {results,errors};
}
