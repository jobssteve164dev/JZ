async page=>{
 await page.addInitScript(()=>{Math.random=()=>.999;});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.reload();
 await page.getByRole('button',{name:'操作指南',exact:true}).click();await page.getByRole('button',{name:'关闭语音',exact:true}).click();await page.getByRole('button',{name:'关闭',exact:true}).click();
 await page.clock.install({time:new Date('2026-09-27T00:00:00Z')});await page.clock.pauseAt(new Date('2026-09-27T00:00:01Z'));await page.locator('#start').click();for(const id of ['walk','door','seat','begin-lights'])await page.locator('#'+id).click();
 const dial=page.getByRole('slider',{name:'灯光旋钮',exact:true});await dial.focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');
 for(let i=0;i<6;i++){await page.clock.fastForward(1100);if(i<5)await page.clock.fastForward(5100);}
 await page.clock.fastForward(5100);await dial.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.clock.fastForward(1100);
 await page.locator('#light-continue').click();await page.clock.fastForward(200);
 await page.screenshot({path:'output/light-v5/car-off.png'});
 await page.locator('#car-lights').click();await dial.focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');
 const arm=page.getByRole('slider',{name:'远近光操作杆',exact:true});await arm.focus();await page.keyboard.press('ArrowUp');
 await page.getByRole('button',{name:'关闭',exact:true}).click();await page.locator('#car-lights').click();
 const persisted=await dial.getAttribute('aria-valuenow')==='2'&&await arm.getAttribute('aria-valuenow')==='1';
 await dial.focus();await page.keyboard.press('ArrowDown');const marker=await dial.getAttribute('aria-valuenow')==='1'&&await page.locator('[data-lamp="marker"]').evaluate(e=>e.classList.contains('on'));
 await page.keyboard.press('ArrowUp');const highRestored=await page.locator('[data-lamp="high"]').evaluate(e=>e.classList.contains('on'));
 await page.getByRole('button',{name:'危险报警闪光灯开关',exact:true}).click();await page.getByRole('button',{name:'关闭',exact:true}).click();
 await page.keyboard.down('Space');await page.clock.fastForward(200);await page.screenshot({path:'output/light-v5/car-on.png'});await page.keyboard.up('Space');
 const result={persisted,marker,highRestored,hazard:(await page.locator('#indicator').textContent()).includes('双闪'),errors};
 if(Object.values(result).some(v=>v===false)||errors.length)throw new Error(JSON.stringify(result));await page.clock.resume();return result;
}
