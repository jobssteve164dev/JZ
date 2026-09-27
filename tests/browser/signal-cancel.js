async page=>{
 await page.addInitScript(()=>{Math.random=()=>.999;});await page.reload();
 await page.getByRole('button',{name:'操作指南',exact:true}).click();await page.getByRole('button',{name:'关闭语音',exact:true}).click();await page.getByRole('button',{name:'关闭',exact:true}).click();await page.clock.install({time:new Date('2026-09-27T00:00:00Z')});await page.clock.pauseAt(new Date('2026-09-27T00:00:01Z'));
 await page.locator('#start').click();for(const key of ['walk','door','seat','begin-lights'])await page.locator('#'+key).click();
 const dial=page.getByRole('slider',{name:'灯光旋钮',exact:true});await dial.focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');
 for(let i=0;i<6;i++){await page.clock.fastForward(1100);await page.clock.fastForward(5100);}await dial.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.clock.fastForward(1100);await page.locator('#light-continue').click();
 const left=page.locator('[data-action="signal"][data-value="left"]'),right=page.locator('[data-action="signal"][data-value="right"]'),look=page.locator('[data-action="look"][data-value="left"]');
 const check=async(node,want,label)=>{if(await node.getAttribute('aria-pressed')!==String(want))throw new Error(label);};
 await left.click();await check(left,true,'left indicator feedback missing');await page.keyboard.press('e');await check(right,true,'keyboard right feedback');await check(left,false,'left clears on right');await right.click();await check(right,false,'right switches off');
 await look.click();await check(look,true,'look confirmation missing');await page.clock.fastForward(1100);await check(look,false,'momentary look should clear');await page.keyboard.press('c');await check(page.locator('[data-action="look"][data-value="right"]'),true,'keyboard observation feedback');
 await page.locator('#belt').click();await page.locator('[data-action="gear"][data-value="D"]').click();await page.locator('#handbrake').click();
 for(const [key,steer,button] of [['q','a',left],['e','d',right]]){
  await page.keyboard.press(key);await page.clock.fastForward(4000);await check(button,true,'indicator must stay on while waiting');
  await page.keyboard.down('w');await page.keyboard.down(steer);await page.clock.fastForward(1500);await check(button,true,'indicator must remain while turning');
  await page.keyboard.up(steer);await page.clock.fastForward(300);await page.keyboard.up('w');await check(button,false,'indicator must clear after steering returns');
  if(!(await page.locator('#indicator').textContent()).includes('关闭'))throw new Error('dashboard not synchronized');
  await page.keyboard.down('s');await page.clock.fastForward(2000);await page.keyboard.up('s');
 }
 await page.waitForTimeout(200);await page.screenshot({path:'output/spacing-v6/signal-cancel.png'});await page.clock.resume();return {automaticLeft:true,automaticRight:true,waitingPreserved:true,buttonsSynchronized:true};
}
