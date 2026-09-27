async page=>{
 const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  Math.random=()=>.999;window.__spoken=[];window.__completed=[];window.__cancelled=[];
  let active=null;const queue=[];
  const pump=()=>{if(active||!queue.length)return;const u=queue.shift();active={u,timer:null};u.onstart?.();active.timer=setTimeout(()=>{__completed.push(u.text);active=null;u.onend?.();pump();},Math.max(300,u.text.length*150));};
  speechSynthesis.speak=u=>{__spoken.push(u.text);queue.push(u);pump();};
  speechSynthesis.cancel=()=>{if(active){clearTimeout(active.timer);__cancelled.push(active.u.text);active=null;}__cancelled.push(...queue.map(u=>u.text));queue.length=0;};
  const Native=window.AudioContext;window.AudioContext=class extends Native{constructor(){super();window.__engineContext=this;}createGain(){const g=super.createGain();window.__engineGain=g;return g;}};
 });
 for(const id of [1,9,10]){
  await page.reload();await page.clock.install({time:new Date('2026-09-27T00:00:00Z')});await page.clock.pauseAt(new Date('2026-09-27T00:00:01Z'));await page.locator(`[data-route="${id}"]`).click();await page.locator('[data-mode="learn"]').click();await page.locator('#start').click();for(const key of ['walk','door','seat','begin-lights'])await page.locator('#'+key).click();
  await page.clock.fastForward(3000);const dial=page.getByRole('slider',{name:'灯光旋钮',exact:true});await dial.focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');
  for(let i=0;i<6;i++){await page.clock.fastForward(1100);await page.clock.fastForward(5100);await page.clock.fastForward(3000);}await dial.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.clock.fastForward(1100);await page.locator('#light-continue').click();await page.clock.fastForward(1000);
  const audio=await page.evaluate(()=>({state:__engineContext.state,gain:__engineGain.gain.value}));if(audio.state!=='running'||audio.gain<=0)throw new Error('engine audio not running '+JSON.stringify(audio));
  await page.locator('#engine-sound').click();await page.waitForTimeout(100);if(await page.evaluate(()=>__engineGain.gain.value)!==0)throw new Error('mute did not silence');await page.locator('#engine-sound').click();
  await page.locator('#pause').click();await page.waitForTimeout(100);if(await page.evaluate(()=>__engineGain.gain.value)!==0)throw new Error('pause did not silence');await page.locator('#resume').click();
  for(let i=0;i<180&&!await page.getByRole('dialog',{name:'这条路线，学完了',exact:true}).isVisible();i++)await page.clock.fastForward(5000);
  const finished=await page.getByRole('dialog',{name:'这条路线，学完了',exact:true}).isVisible(),score=await page.locator('#score').textContent();
  const prompts=await page.evaluate(()=>__completed.filter(t=>t.startsWith('开始会车')||t.startsWith('会车结束')||t.startsWith('会车完成')||t.startsWith('开始超车')||t.startsWith('请返回原车道')||t.startsWith('超车完成')));
  await page.waitForTimeout(100);const silent=await page.evaluate(()=>__engineGain.gain.value===0);
  const cancelled=await page.evaluate(()=>__cancelled.filter(t=>t.startsWith('开始会车')||t.startsWith('会车结束')||t.startsWith('会车完成')||t.startsWith('开始超车')||t.startsWith('请返回原车道')||t.startsWith('超车完成')));
  if(!finished||score!=='100'||prompts.length!==6||!silent||cancelled.length)throw new Error(JSON.stringify({id,finished,score,prompts,silent,cancelled}));results.push({id,finished,score,prompts,audio,silent,cancelled});
 }
 if(errors.length)throw new Error(JSON.stringify(errors));await page.clock.resume();return {results,errors};
}
