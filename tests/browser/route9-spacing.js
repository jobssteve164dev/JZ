async page=>{
 await page.setViewportSize({width:844,height:390});
 const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  Math.random=()=>.999;window.__spoken=[];window.__completed=[];window.__cancelled=[];window.__timeline=[];
  let active=null;const queue=[];
  const pump=()=>{if(active||!queue.length)return;const u=queue.shift();active={u,timer:null};__timeline.push({type:'start',text:u.text,time:Date.now(),distance:document.querySelector('#distance')?.textContent});u.onstart?.();active.timer=setTimeout(()=>{__completed.push(u.text);__timeline.push({type:'end',text:u.text,time:Date.now(),distance:document.querySelector('#distance')?.textContent});active=null;u.onend?.();pump();},Math.max(300,u.text.length*200));};
  speechSynthesis.speak=u=>{__timeline.push({type:'request',text:u.text,time:Date.now(),distance:document.querySelector('#distance')?.textContent});__spoken.push(u.text);queue.push(u);pump();};
  speechSynthesis.cancel=()=>{if(active){clearTimeout(active.timer);__cancelled.push(active.u.text);active=null;}__cancelled.push(...queue.map(u=>u.text));queue.length=0;};
  const Native=window.AudioContext;window.AudioContext=class extends Native{constructor(){super();window.__engineContext=this;}createGain(){const g=super.createGain();window.__engineGain=g;return g;}};
 });
 const id=9;
  await page.reload();await page.clock.install({time:new Date('2026-09-27T00:00:00Z')});await page.clock.pauseAt(new Date('2026-09-27T00:00:01Z'));await page.locator(`[data-route="${id}"]`).click();await page.locator('[data-mode="learn"]').click();await page.locator('#start').click();for(const key of ['walk','door','seat','begin-lights'])await page.locator('#'+key).click();
  await page.clock.fastForward(5000);const dial=page.getByRole('slider',{name:'灯光旋钮',exact:true});await dial.focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');
  for(let i=0;i<6;i++){await page.clock.fastForward(1100);await page.clock.fastForward(5100);await page.clock.fastForward(5000);}await dial.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.clock.fastForward(1100);await page.locator('#light-continue').click();await page.clock.fastForward(1000);

 for(let i=0;i<180&&parseFloat(await page.locator('#distance').textContent())<.48;i++)await page.clock.fastForward(1000);
 const timeline=await page.evaluate(()=>__timeline),straightEnd=timeline.find(p=>p.type==='end'&&p.text.startsWith('直线行驶'));
 const prepare=timeline.find(p=>p.type==='start'&&p.text.startsWith('前方超车'));
 const phases=timeline.filter(p=>p.type==='end'&&/^(开始超车|请返回原车道|超车完成)/.test(p.text));
 const distance=parseFloat(await page.locator('#distance').textContent()),score=await page.locator('#score').textContent();
 if(!straightEnd||!prepare||prepare.time-straightEnd.time<3000||parseFloat(prepare.distance)<.20||phases.length!==3||distance<.48||score!=='100')throw new Error(JSON.stringify({straightEnd,prepare,phases,distance,score}));
 if(timeline.some(p=>p.type==='request'&&/^(前方超车|开始超车)/.test(p.text)&&parseFloat(p.distance)<.20))throw new Error('overtaking announced during straight driving');
 const cancelled=await page.evaluate(()=>__cancelled);if(cancelled.length||errors.length)throw new Error(JSON.stringify({cancelled,errors}));
 await page.waitForTimeout(200);await page.screenshot({path:'output/route9-v8/after-overtake.png'});await page.clock.resume();return {straightEnd,prepare,gap:prepare.time-straightEnd.time,phases,distance,score,errors};
}
