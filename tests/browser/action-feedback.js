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
 await page.waitForTimeout(200);await page.screenshot({path:'output/light-v5/action-feedback.png'});await page.clock.resume();return {signalToggle:true,observationPulse:true,keyboard:true};
}
