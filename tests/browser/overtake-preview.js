async page=>{
 await page.addInitScript(()=>{Math.random=()=>.999;window.__spoken=[];speechSynthesis.speak=u=>{__spoken.push(u.text);queueMicrotask(()=>u.onend?.());};speechSynthesis.cancel=()=>{};});await page.reload();
 await page.clock.install({time:new Date('2026-09-27T00:00:00Z')});await page.clock.pauseAt(new Date('2026-09-27T00:00:01Z'));
 await page.locator('[data-route="9"]').click();await page.locator('[data-mode="exam"]').click();await page.locator('#start').click();for(const key of ['walk','door','seat','begin-lights'])await page.locator('#'+key).click();
 const dial=page.getByRole('slider',{name:'灯光旋钮',exact:true});await dial.focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');
 for(let i=0;i<6;i++){await page.clock.fastForward(5100);await page.clock.fastForward(5100);}await dial.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.clock.fastForward(5100);await page.locator('#light-continue').click();
 await page.locator('[data-action="gear"][data-value="D"]').click();await page.locator('#handbrake').click();await page.locator('[data-action="signal"][data-value="left"]').click();await page.locator('[data-action="look"][data-value="left"]').click();await page.clock.fastForward(3200);await page.keyboard.down('ArrowUp');
 let announced=false;for(let i=0;i<250&&!announced;i++){await page.clock.fastForward(200);announced=await page.evaluate(()=>__spoken.some(t=>t.startsWith('前方超车')));}
 await page.keyboard.up('ArrowUp');const distance=await page.locator('#distance').textContent(),spoken=await page.evaluate(()=>__spoken.filter(t=>t.includes('超车')));
 if(!announced||parseFloat(distance)<.20||parseFloat(distance)>=.294||spoken.some(t=>t.startsWith('开始超车')))throw new Error(JSON.stringify({announced,distance,spoken}));await page.clock.resume();return {announced,distance,spoken};
}
