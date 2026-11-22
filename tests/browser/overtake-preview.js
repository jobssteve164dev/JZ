async page=>{
 await page.addInitScript(()=>{
  Math.random=()=>.999;window.__spoken=[];window.__cancelledOvertake=false;
  let active=null;const queue=[];
  Object.defineProperty(speechSynthesis,'speaking',{get:()=>active!==null});
  function pump(){
   if(active||!queue.length)return;
   const utterance=queue.shift();active=utterance;
   __spoken.push(utterance.text);utterance.onstart?.();
   if(utterance.text==='请起步')setTimeout(()=>{active=null;pump();},350);
   else if(!utterance.text.startsWith('开始超车'))queueMicrotask(()=>{
    if(active!==utterance)return;active=null;utterance.onend?.();pump();
   });
  }
  speechSynthesis.speak=u=>{queue.push(u);pump();};
  speechSynthesis.cancel=()=>{
   const interrupted=active;active=null;queue.length=0;
   if(interrupted?.text.startsWith('开始超车')){
    __cancelledOvertake=true;queueMicrotask(()=>interrupted.onend?.());
   }
  };
 });await page.reload();
 await page.clock.install({time:new Date('2026-09-27T00:00:00Z')});await page.clock.pauseAt(new Date('2026-09-27T00:00:01Z'));
 await page.locator('[data-route="9"]').click();await page.locator('[data-mode="exam"]').click();await page.locator('#start').click();for(const key of ['walk','door','seat','begin-lights'])await page.locator('#'+key).click();
 const dial=page.getByRole('slider',{name:'灯光旋钮',exact:true});await dial.focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');
 for(let i=0;i<6;i++){await page.clock.fastForward(5100);await page.clock.fastForward(5100);}await dial.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.clock.fastForward(5100);await page.locator('#light-continue').click();
 await page.clock.fastForward(150);await page.clock.fastForward(300);
 await page.locator('[data-action="gear"][data-value="D"]').click();await page.locator('#handbrake').click();await page.locator('[data-action="signal"][data-value="left"]').click();await page.locator('[data-action="look"][data-value="left"]').click();await page.clock.fastForward(3200);await page.keyboard.down('ArrowUp');
 for(let i=0;i<30&&parseFloat(await page.locator('#distance').textContent())<.03;i++)await page.clock.fastForward(200);
 const earlySpeed=+await page.locator('#speed').textContent();
 const recovered=await page.evaluate(()=>__spoken.filter(t=>t==='前方直线行驶').length);
 if(earlySpeed>50||recovered!==1)throw new Error(JSON.stringify({earlySpeed,recovered}));
 let announced=false;for(let i=0;i<250&&!announced;i++){await page.clock.fastForward(200);announced=await page.evaluate(()=>__spoken.some(t=>t.startsWith('前方超车')));}
 const distance=await page.locator('#distance').textContent(),spoken=await page.evaluate(()=>__spoken.filter(t=>t.includes('超车')));
 if(!announced||parseFloat(distance)<.20||parseFloat(distance)>=.294||spoken.some(t=>t.startsWith('开始超车')))throw new Error(JSON.stringify({announced,distance,spoken}));
 for(let i=0;i<40&&parseFloat(await page.locator('#distance').textContent())<.53;i++)await page.clock.fastForward(600);
 await page.keyboard.up('ArrowUp');
 const speed=+await page.locator('#speed').textContent(),project=await page.locator('#instruction').textContent(),upcoming=await page.locator('#upcoming').textContent();
 const {started,cancelled}=await page.evaluate(()=>({started:__spoken.filter(t=>t==='前方路口右转').length,cancelled:__cancelledOvertake}));
 if(speed<=50||project!=='路口右转'||!upcoming.startsWith('当前项目')||started!==1||!cancelled)throw new Error(JSON.stringify({speed,project,upcoming,started,cancelled}));
 await page.clock.resume();return {announced,distance,spoken,speed,project,started};
}
