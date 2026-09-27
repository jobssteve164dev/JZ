async page=>{
 await page.addInitScript(()=>{Math.random=()=>.999;});await page.reload();
 await page.getByRole('button',{name:'操作指南',exact:true}).click();await page.getByRole('button',{name:'关闭语音',exact:true}).click();await page.getByRole('button',{name:'关闭',exact:true}).click();await page.clock.install({time:new Date('2026-09-27T00:00:00Z')});await page.clock.pauseAt(new Date('2026-09-27T00:00:01Z'));
 await page.locator('[data-route="10"]').click();await page.locator('#start').click();for(const key of ['walk','door','seat','begin-lights'])await page.locator('#'+key).click();
 const dial=page.getByRole('slider',{name:'灯光旋钮',exact:true});await dial.focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');
 for(let i=0;i<6;i++){await page.clock.fastForward(1100);await page.clock.fastForward(5100);}await dial.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.clock.fastForward(1100);await page.locator('#light-continue').click();

 await page.locator('[data-action="gear"][data-value="D"]').click();await page.locator('#handbrake').click();await page.keyboard.press('q');await page.keyboard.press('z');await page.clock.fastForward(3200);
 for(let i=0;i<120&&parseFloat(await page.locator('#distance').textContent())<.04;i++){if(Number(await page.locator('#speed').textContent())<18)await page.keyboard.down('w');else await page.keyboard.up('w');await page.clock.fastForward(100);}
 await page.keyboard.press('q');await page.keyboard.press('q');
 for(let i=0;i<80&&parseFloat(await page.locator('#distance').textContent())<.05;i++){if(Number(await page.locator('#speed').textContent())<18)await page.keyboard.down('w');else await page.keyboard.up('w');await page.clock.fastForward(100);}
 await page.keyboard.up('w');await page.keyboard.down('s');await page.clock.fastForward(1400);await page.keyboard.up('s');
 const marker={distance:await page.locator('#distance').textContent(),score:await page.locator('#score').textContent(),indicator:await page.locator('#indicator').textContent()};
 if(parseFloat(marker.distance)<.05||marker.score!=='100')throw new Error('premature marker failure '+JSON.stringify(marker));
 await page.clock.fastForward(3200);await page.keyboard.press('z');await page.keyboard.down('a');await page.keyboard.down('w');await page.clock.fastForward(1000);await page.keyboard.up('w');await page.keyboard.up('a');
 const score=await page.locator('#score').textContent();if(score!=='100')throw new Error('properly prepared lane change failed '+await page.locator('#notice').textContent());
 await page.waitForTimeout(100);await page.screenshot({path:'output/meeting-v9/lane-signal.png'});await page.clock.resume();return {marker,score};
}
