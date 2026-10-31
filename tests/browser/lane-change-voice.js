async page=>{
 await page.setViewportSize({width:844,height:390});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  Math.random=()=>.999;window.__spoken=[];
  speechSynthesis.speak=u=>{__spoken.push(u.text);u.onstart?.();queueMicrotask(()=>u.onend?.());};
  speechSynthesis.cancel=()=>{};
 });
 let session=0;const start=async mode=>{
  await page.reload();if(session++===0){const time=new Date('2026-10-31T00:00:00Z');await page.clock.install({time});await page.clock.pauseAt(new Date(time.getTime()+1000));}
  await page.locator('[data-route="10"]').click();await page.locator(`[data-mode="${mode}"]`).click();await page.locator('#start').click();
  for(const key of ['walk','door','seat','begin-lights'])await page.locator('#'+key).click();
  await page.clock.fastForward(1000);const dial=page.getByRole('slider',{name:'灯光旋钮',exact:true});await dial.focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');
  for(let i=0;i<6;i++){await page.clock.fastForward(1100);await page.clock.fastForward(5100);await page.clock.fastForward(1000);}
  await dial.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.clock.fastForward(1100);await page.locator('#light-continue').click();await page.clock.fastForward(1000);
 };
 await start('practice');
 await page.locator('[data-action="gear"][data-value="D"]').click();await page.locator('#handbrake').click();await page.keyboard.down('w');
 let visible=false;for(let i=0;i<400&&!visible;i++){await page.clock.fastForward(100);visible=(await page.locator('#instruction').textContent())==='变更车道';}
 await page.keyboard.up('w');const practiceSpoken=await page.evaluate(()=>__spoken);
 if(!visible)throw new Error('自主变道项目没有继续显示');
 if(practiceSpoken.some(text=>text.includes('变更车道')))throw new Error('自主变道仍触发语音：'+JSON.stringify(practiceSpoken));
 await start('learn');let captionVisible=false;
 for(let i=0;i<300&&!captionVisible;i++){await page.clock.fastForward(100);captionVisible=(await page.locator('#hint').textContent()).includes('变更车道');}
 if(!captionVisible)throw new Error('跟随学习没有保留自主变道字幕');
 await page.locator('#pause').click();await page.locator('#resume').click();await page.clock.fastForward(100);
 const learnSpoken=await page.evaluate(()=>__spoken);if(learnSpoken.some(text=>text.includes('变更车道')))throw new Error('跟随学习恢复后重播自主变道：'+JSON.stringify(learnSpoken));
 if(errors.length)throw new Error(JSON.stringify(errors));await page.clock.resume();return {visible,captionVisible,practiceSpoken,learnSpoken,errors};
}
