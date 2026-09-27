async page=>{
 await page.setViewportSize({width:844,height:390});
 const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  Math.random=()=>.999;window.__spoken=[];window.__completed=[];window.__cancelled=[];window.__timeline=[];
  let active=null;const queue=[];
  const pump=()=>{if(active||!queue.length)return;const u=queue.shift();active={u,timer:null};__timeline.push({type:'start',text:u.text,time:Date.now(),distance:document.querySelector('#distance')?.textContent});u.onstart?.();active.timer=setTimeout(()=>{__completed.push(u.text);__timeline.push({type:'end',text:u.text,time:Date.now(),distance:document.querySelector('#distance')?.textContent});active=null;u.onend?.();pump();},u.text.startsWith('开始超车')?6000:Math.max(300,u.text.length*200));};
  speechSynthesis.speak=u=>{__timeline.push({type:'request',text:u.text,time:Date.now(),distance:document.querySelector('#distance')?.textContent});__spoken.push(u.text);queue.push(u);pump();};
  speechSynthesis.cancel=()=>{if(active){clearTimeout(active.timer);__cancelled.push(active.u.text);active=null;}__cancelled.push(...queue.map(u=>u.text));queue.length=0;};
  const Native=window.AudioContext;window.AudioContext=class extends Native{constructor(){super();window.__engineContext=this;}createGain(){const g=super.createGain();window.__engineGain=g;return g;}};
 });
 const id=9;
  await page.reload();await page.clock.install({time:new Date('2026-09-27T00:00:00Z')});await page.clock.pauseAt(new Date('2026-09-27T00:00:01Z'));await page.locator(`[data-route="${id}"]`).click();await page.locator('[data-mode="practice"]').click();await page.locator('#start').click();for(const key of ['walk','door','seat','begin-lights'])await page.locator('#'+key).click();
  await page.clock.fastForward(5000);const dial=page.getByRole('slider',{name:'灯光旋钮',exact:true});await dial.focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');
  for(let i=0;i<6;i++){await page.clock.fastForward(1100);await page.clock.fastForward(5100);await page.clock.fastForward(5000);}await dial.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.clock.fastForward(1100);await page.locator('#light-continue').click();await page.clock.fastForward(1000);



 await page.locator('[data-action="gear"][data-value="D"]').click();await page.locator('#handbrake').click();
 let requested=false;
 for(let i=0;i<1700&&!requested;i++){
  const speed=Number(await page.locator('#speed').textContent());if(speed<12)await page.keyboard.down('w');else await page.keyboard.up('w');
  await page.clock.fastForward(100);requested=await page.evaluate(()=>__timeline.some(p=>p.type==='request'&&p.text.startsWith('开始超车')));
 }
 if(!requested)throw new Error('never reached overtaking');
 await page.keyboard.down('w');await page.clock.fastForward(2000);await page.keyboard.up('w');await page.keyboard.down('s');await page.clock.fastForward(1500);await page.keyboard.up('s');
 const waiting=await page.locator('#upcoming').textContent();if(waiting!=='超车 · 听口令')throw new Error('distance spent during instruction: '+waiting);
 await page.clock.fastForward(3000);const initial=await page.locator('#upcoming').textContent();if(initial!=='超车 · 剩余 150 米')throw new Error('not given 150m after speaking: '+initial);
 await page.locator('#pause').click();await page.clock.fastForward(5000);await page.locator('#resume').click();await page.clock.fastForward(100);if(await page.locator('#upcoming').textContent()!==initial)throw new Error('paused distance changed');
 await page.keyboard.down('w');await page.clock.fastForward(2000);await page.keyboard.up('w');const moving=await page.locator('#upcoming').textContent();if(!/剩余 14[0-9] 米/.test(moving))throw new Error('actual movement did not spend distance: '+moving);
 await page.waitForTimeout(100);await page.screenshot({path:'output/meeting-v9/overtake-counter.png'});if(errors.length)throw new Error(JSON.stringify(errors));await page.clock.resume();return {waiting,initial,moving,errors};
}
