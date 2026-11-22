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
  for(let i=0;i<6;i++){
   await page.clock.fastForward(mode==='exam'?5100:1100);await page.clock.fastForward(5100);
  }
  await dial.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');
  const enter=page.locator('#light-continue');
  for(let i=0;i<3&&!await enter.isVisible();i++)await page.clock.fastForward(mode==='exam'?5100:1100);
  if(!await enter.isVisible())throw new Error(`${mode} lighting did not finish at ${await page.locator('#light-count').textContent()}`);
  await enter.click();await page.clock.fastForward(1000);
 };
 const announcements={};
 for(const mode of ['practice','exam']){
  await start(mode);
  await page.locator('[data-action="gear"][data-value="D"]').click();await page.locator('#handbrake').click();await page.keyboard.down('w');
  let visible=false;for(let i=0;i<80&&!visible;i++){await page.clock.fastForward(200);visible=(await page.locator('#instruction').textContent())==='变更车道';}
  await page.keyboard.up('w');
  announcements[mode]=await page.evaluate(()=>__spoken.filter(text=>text.includes('变更车道')));
  if(!visible||announcements[mode].length!==1||announcements[mode][0]!=='前方变更车道')throw new Error(`${mode} did not announce the first lane change once`);
 }
 await start('learn');let captionVisible=false;
 for(let i=0;i<240&&!captionVisible;i++){await page.clock.fastForward(500);captionVisible=(await page.locator('#hint').textContent()).includes('从最右侧车道进入中间车道');}
 if(!captionVisible)throw new Error('跟随学习没有保留自主变道字幕');
 await page.locator('#pause').click();await page.locator('#resume').click();await page.clock.fastForward(100);
 announcements.learn=await page.evaluate(()=>__spoken.filter(text=>text.startsWith('变更车道。')));
 if(announcements.learn.length!==1||!announcements.learn[0].includes('并入相邻的第三车道'))throw new Error('跟随学习应只播报起步后变道：'+JSON.stringify(announcements.learn));
 if(errors.length)throw new Error(JSON.stringify(errors));await page.clock.resume();return {captionVisible,announcements,errors};
}
