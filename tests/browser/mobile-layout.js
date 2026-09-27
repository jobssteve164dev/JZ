async page=>{
 await page.addInitScript(()=>{Math.random=()=>.999;});await page.reload();
 if(await page.locator('#thumb-wheel').count()!==1)throw new Error('left thumb steering wheel is missing');
 await page.getByRole('button',{name:'操作指南',exact:true}).click();await page.getByRole('button',{name:'关闭语音',exact:true}).click();await page.getByRole('button',{name:'关闭',exact:true}).click();
 await page.clock.install({time:new Date('2026-09-27T00:00:00Z')});await page.clock.pauseAt(new Date('2026-09-27T00:00:01Z'));
 await page.locator('#start').click();for(const key of ['walk','door','seat','begin-lights'])await page.locator('#'+key).click();
 const dial=page.getByRole('slider',{name:'灯光旋钮',exact:true});await dial.focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');for(let i=0;i<6;i++){await page.clock.fastForward(1100);await page.clock.fastForward(5100);}await dial.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.clock.fastForward(1100);await page.locator('#light-continue').click();

 await page.clock.resume();const layouts=[];
 for(const [width,height] of [[568,320],[667,375],[740,360],[844,390],[932,430]]){
 await page.setViewportSize({width,height});await page.waitForTimeout(250);
 const boxes=await page.evaluate(()=>Object.fromEntries(['.driving-info','.game-map','.controls','#thumb-wheel','.pedals'].map(k=>{const b=document.querySelector(k).getBoundingClientRect();return[k,{x:b.x,y:b.y,width:b.width,height:b.height}]})));
 const info=boxes['.driving-info'],controls=boxes['.controls'],wheel=boxes['#thumb-wheel'];
 if(info.x>30||info.x+info.width>width*.3||controls.y<height-104||wheel.x+wheel.width>controls.x)throw Error('roadway obscured '+JSON.stringify({width,height,boxes}));
 const bad=await page.locator('.controls button:visible,.hud button:visible,#project-toggle').evaluateAll(es=>es.filter(e=>{const b=e.getBoundingClientRect();return b.width<44||b.height<44}).map(e=>e.textContent));if(bad.length)throw Error('small touch targets '+bad);
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('horizontal overflow');
 const stress=await page.evaluate(()=>{const q=s=>document.querySelector(s),saved=['#instruction','#indicator','#traffic','#curb-distance','#notice'].map(k=>[q(k),q(k).textContent,q(k).className]);q('#instruction').textContent='靠边停车';q('#indicator').textContent='右灯 → 13.0 秒';q('#traffic').textContent='留意交通信号';q('#curb-distance').textContent='距右边线 30 cm';q('#curb-distance').classList.remove('hidden');q('#notice').textContent='变更车道前请提前开启转向灯，观察后方来车，确认安全后再转向。';q('#notice').classList.remove('hidden');const ok=q('.driving-info').getBoundingClientRect().bottom<=q('.speedometer').getBoundingClientRect().top&&q('#notice').getBoundingClientRect().bottom<q('.pedals').getBoundingClientRect().top;for(const [el,text,cls] of saved){el.textContent=text;el.className=cls;}return ok;});if(!stress)throw Error('parking status or feedback overlaps controls');
 const expected=await page.locator('#hint').textContent();await page.locator('#project-toggle').click();if(await page.locator('#project-detail').textContent()!==expected)throw Error('lost hint');await page.getByRole('button',{name:'关闭',exact:true}).click();
 await page.screenshot({path:'output/layout-v11/mobile-'+width+'.png'});await page.locator('#view').click();await page.waitForTimeout(150);await page.screenshot({path:'output/layout-v11/cockpit-'+width+'.png'});await page.locator('#view').click();layouts.push({width,height,boxes});
 }return layouts;
}