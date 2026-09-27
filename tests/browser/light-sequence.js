async page=>{
 const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{Math.random=()=>.999;});
 async function home(){await page.reload();await page.getByRole('button',{name:'操作指南',exact:true}).click();await page.getByRole('button',{name:'关闭语音',exact:true}).click();await page.getByRole('button',{name:'关闭',exact:true}).click();await page.clock.install({time:new Date('2026-09-27T00:00:00Z')});await page.clock.pauseAt(new Date('2026-09-27T00:00:01Z'));}
 const dial=page.getByRole('slider',{name:'灯光旋钮',exact:true}),arm=page.getByRole('slider',{name:'远近光操作杆',exact:true}),hazard=page.getByRole('button',{name:'危险报警闪光灯开关',exact:true});
 function check(value,message){if(!value)throw new Error(message);}
 async function setDial(value){await dial.focus();for(let i=0;i<2;i++)await page.keyboard.press('ArrowDown');for(let i=0;i<value;i++)await page.keyboard.press('ArrowUp');}
 async function geometry(){return page.evaluate(()=>{const b=s=>document.querySelector(s).getBoundingClientRect(),labels=[...document.querySelectorAll('.dial-legend span')].map(e=>e.getBoundingClientRect());return {vertical:labels[0].y>labels[1].y&&labels[1].y>labels[2].y,left:labels.every(e=>e.right<b('.stalk-dial').left),gap:b('#repeat-voice').top-b('.stalk-console').bottom,buttonsVisible:b('#repeat-voice').bottom<=innerHeight-10,noHorizontalOverflow:document.querySelector('.dialog').scrollWidth<=document.querySelector('.dialog').clientWidth};});}
 await home();await page.getByRole('button',{name:'单练灯光',exact:true}).click();
 for(const size of [{width:844,height:390},{width:667,height:375},{width:390,height:844},{width:1024,height:600}]){await page.setViewportSize(size);const g=await geometry();check(g.vertical&&g.left&&g.gap>=12&&g.buttonsVisible&&g.noHorizontalOverflow,JSON.stringify({size,...g}));results.push({size,...g});await page.screenshot({path:`output/light-v5/layout-${size.width}.png`});}
 await page.setViewportSize({width:844,height:390});
 const cdp=await page.context().newCDPSession(page);
 async function drag(dy){const b=await dial.boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+dy,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 const pointer=()=>page.locator('.dial-pointer').evaluate(e=>e.getBoundingClientRect().y);
 const p0=await pointer();await drag(-34);await page.clock.fastForward(150);check(await dial.getAttribute('aria-valuetext')==='示廓灯','up to marker');const p1=await pointer();await drag(-34);await page.clock.fastForward(150);const p2=await pointer();check(await dial.getAttribute('aria-valuetext')==='前照灯'&&p2<p1&&p1<p0,'pointer must follow upward activation');await drag(34);check(await dial.getAttribute('aria-valuetext')==='示廓灯','down to marker');await drag(34);check(await dial.getAttribute('aria-valuetext')==='关闭','down to off');
 // All nineteen prompts, retaining actual lever and hazard actions.
 const answers=['low','low','low','low','low','low','low','low','high','high','flash','flash','flash','flash','flash','flash','hazard-marker','hazard-marker','off'];
 for(let i=0;i<answers.length;i++){
  check(await page.locator('#light-count').textContent()===`${i+1} / 19`,'standalone count');const answer=answers[i];
  await setDial(answer==='off'?0:answer==='hazard-marker'?1:2);
  if(await hazard.getAttribute('aria-pressed')==='true')await hazard.click();
  if(answer==='hazard-marker')await hazard.click();
  if(answer==='high'&&await arm.getAttribute('aria-valuenow')!=='1'){await arm.focus();await page.keyboard.press('ArrowUp');}
  if(answer==='flash'){if(await arm.getAttribute('aria-valuenow')==='1'){await arm.focus();await page.keyboard.press('ArrowUp');}await arm.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');}
  await page.clock.fastForward(1100);check(await page.locator('#light-feedback').textContent()==='操作正确',`standalone ${i}`);if(i<18)await page.clock.fastForward(5100);
 }
 await page.locator('#light-continue').click();check(await page.getByRole('dialog',{name:'灯光练习结果',exact:true}).isVisible(),'standalone finished');results.push({standalone:19});
 for(const mode of ['practice','exam','learn']){
  await home();await page.locator(`[data-mode="${mode}"]`).click();await page.locator('#start').click();for(const key of ['walk','door','seat','begin-lights'])await page.locator('#'+key).click();
  check(await page.locator('#light-question').textContent()==='请开启前照灯','opening required');await setDial(2);
  for(let i=0;i<6;i++){if(i>0)check(await page.locator('#light-count').textContent()===`${i} / 5`,'five scenario count');await page.clock.fastForward(mode==='exam'?5100:1100);check(await page.locator('#light-feedback').textContent()==='操作正确','correct grade');await page.clock.fastForward(5100);}
  check((await page.locator('#light-question').textContent()).includes('关闭所有灯光'),'closing required');check(!await page.locator('#light-continue').isVisible(),'cannot skip closing');
  await hazard.click();await setDial(0);
  if(mode==='exam'){await page.clock.fastForward(5100);check(await page.locator('#light-continue').isDisabled(),'hazard left on must block continuation');check((await page.locator('#light-feedback').textContent()).includes('未通过'),'closing timeout graded');}
  else{await page.clock.fastForward(30000);check(!await page.locator('#light-continue').isVisible(),'practice waits for hazards off');}
  await hazard.click();if(mode!=='exam')await page.clock.fastForward(1100);
  await page.screenshot({path:`output/light-v5/closing-${mode}.png`});check(await page.locator('#light-continue').isEnabled(),'all lamps off permits continuation');
  const gap=await page.evaluate(()=>document.querySelector('#light-continue').getBoundingClientRect().top-document.querySelector('.stalk-console').getBoundingClientRect().bottom);check(gap>=12,'continue button gap');
  await page.locator('#light-continue').click();check(await page.locator('#game').isVisible(),'driving starts');results.push({mode,closing:true,gap});
 }
 check(!errors.length,JSON.stringify(errors));await page.clock.resume();return {results,errors};
}
