async page=>{
 await page.setViewportSize({width:844,height:390});
 const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  Math.random=()=>.999;window.__spoken=[];window.__completed=[];window.__cancelled=[];window.__timeline=[];
  let active=null;const queue=[];
  const pump=()=>{if(active||!queue.length)return;const u=queue.shift();active={u,timer:null};__timeline.push({type:'start',text:u.text,time:Date.now(),distance:document.querySelector('#distance')?.textContent});u.onstart?.();active.timer=setTimeout(()=>{__completed.push(u.text);__timeline.push({type:'end',text:u.text,time:Date.now(),distance:document.querySelector('#distance')?.textContent});active=null;u.onend?.();pump();},u.text==='开始会车。'?6000:Math.max(300,u.text.length*200));};
  speechSynthesis.speak=u=>{__timeline.push({type:'request',text:u.text,time:Date.now(),distance:document.querySelector('#distance')?.textContent});__spoken.push(u.text);queue.push(u);pump();};
  speechSynthesis.cancel=()=>{if(active){clearTimeout(active.timer);const cancelled=active.u;setTimeout(()=>cancelled.onend?.(),500);__cancelled.push(active.u.text);active=null;}__cancelled.push(...queue.map(u=>u.text));queue.length=0;};
  const Native=window.AudioContext;window.AudioContext=class extends Native{constructor(){super();window.__engineContext=this;}createGain(){const g=super.createGain();window.__engineGain=g;return g;}};
 });
 const id=10;
  await page.reload();await page.clock.install({time:new Date('2026-09-27T00:00:00Z')});await page.clock.pauseAt(new Date('2026-09-27T00:00:01Z'));await page.locator(`[data-route="${id}"]`).click();await page.locator('[data-mode="practice"]').click();await page.locator('#start').click();for(const key of ['walk','door','seat','begin-lights'])await page.locator('#'+key).click();
  await page.clock.fastForward(5000);const dial=page.getByRole('slider',{name:'灯光旋钮',exact:true});await dial.focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');
  for(let i=0;i<6;i++){await page.clock.fastForward(1100);await page.clock.fastForward(5100);await page.clock.fastForward(5000);}await dial.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.clock.fastForward(1100);await page.locator('#light-continue').click();await page.clock.fastForward(1000);


 await page.locator('[data-action="gear"][data-value="D"]').click();await page.locator('#handbrake').click();
 let requested=false;
 for(let i=0;i<1500&&!requested;i++){
  const speed=Number(await page.locator('#speed').textContent());if(speed<9)await page.keyboard.down('w');else await page.keyboard.up('w');
  await page.clock.fastForward(100);requested=await page.evaluate(()=>__timeline.some(p=>p.type==='request'&&p.text==='开始会车。'));
 }
 await page.keyboard.up('w');await page.keyboard.down('s');await page.clock.fastForward(800);await page.keyboard.up('s');
 if(!requested||!(await page.locator('#upcoming').textContent()).includes('听口令'))throw new Error('meeting timer spent the pending instruction');
 await page.locator('#pause').click();await page.clock.fastForward(4000);await page.locator('#resume').click();
 await page.clock.fastForward(5900);if(!(await page.locator('#upcoming').textContent()).includes('听口令'))throw new Error('timer began before replay finished');
 await page.clock.fastForward(200);const initial=await page.locator('#upcoming').textContent();
 if(!/剩余 [45]\.[0-9] 秒/.test(initial)||parseFloat(initial.split('剩余 ')[1])<4.8)throw new Error('not given a full five seconds: '+initial);
 await page.locator('#pause').click();await page.clock.fastForward(3000);await page.locator('#resume').click();await page.clock.fastForward(4800);
 const before=await page.locator('#upcoming').textContent();if(!before.startsWith('会车 · 剩余'))throw new Error('meeting expired before five active seconds: '+before);
 await page.waitForTimeout(100);await page.screenshot({path:'output/meeting-v9/countdown.png'});await page.clock.fastForward(400);
 const notice=await page.locator('#notice').textContent();if(!notice.includes('操作超时'))throw new Error('meeting failed to expire after five seconds: '+notice);
 if(errors.length)throw new Error(JSON.stringify(errors));await page.clock.resume();return {initial,before,notice,errors};
}
