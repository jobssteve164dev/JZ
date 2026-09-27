async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{Math.random=()=>.999;});await page.reload();
 await page.getByRole('button',{name:'操作指南',exact:true}).click();await page.getByRole('button',{name:'关闭语音',exact:true}).click();await page.getByRole('button',{name:'关闭',exact:true}).click();
 await page.clock.install({time:new Date('2026-09-27T00:00:00Z')});await page.clock.pauseAt(new Date('2026-09-27T00:00:01Z'));
 await page.locator('[data-mode="learn"]').click();await page.locator('#start').click();for(const key of ['walk','door','seat','begin-lights'])await page.locator('#'+key).click();
 const dial=page.getByRole('slider',{name:'灯光旋钮',exact:true});await dial.focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');
 for(let i=0;i<6;i++){await page.clock.fastForward(1100);await page.clock.fastForward(5100);}await dial.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.clock.fastForward(1100);await page.locator('#light-continue').click();
 const samples=[];let yieldSeen=false,leftStop=false,rightRedApproach=false,nearLast=false,finalState;
 for(let i=0;i<500;i++){
  await page.clock.fastForward(nearLast?200:5000);
  const s=await page.evaluate(()=>({traffic:document.querySelector('#traffic').textContent,distance:document.querySelector('#distance').textContent,speed:document.querySelector('#speed').textContent,score:document.querySelector('#score').textContent,clock:document.querySelector('#clock').textContent}));
  finalState=s;nearLast=parseFloat(s.distance)>2.73;
  if(s.traffic.includes('右转让行')){yieldSeen=true;if(parseFloat(s.distance)>2.76)rightRedApproach=true;if(samples.length<3||nearLast)samples.push(s);if(samples.length===1){await page.waitForTimeout(200);await page.screenshot({path:'output/signals-v7/right-yield.png'});}}
  if(parseFloat(s.distance)>.3&&s.traffic.includes('红灯 · 停车')){if(!leftStop)samples.push(s);leftStop=true;}
  if(parseFloat(s.distance)>2.80)break;
 }
 const passedFinalRight=parseFloat(finalState?.distance)>2.80;
 if(!yieldSeen||!leftStop||!rightRedApproach||!passedFinalRight)throw new Error(JSON.stringify({yieldSeen,leftStop,rightRedApproach,passedFinalRight,finalState,samples}));
 if(await page.locator('#score').textContent()!=='100')throw new Error('legal following lost points');
 await page.waitForTimeout(200);await page.screenshot({path:'output/signals-v7/right-passed.png'});
 if(errors.length)throw new Error(JSON.stringify(errors));await page.clock.resume();return {yieldSeen,leftStop,rightRedApproach,passedFinalRight,finalState,samples,errors};
}
