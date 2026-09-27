async page=>{
 const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));await page.reload();
 await page.getByRole('button',{name:'操作指南',exact:true}).click();await page.getByRole('button',{name:'关闭语音',exact:true}).click();await page.getByRole('button',{name:'关闭',exact:true}).click();
 await page.clock.install();await page.clock.pauseAt(new Date());await page.getByRole('button',{name:'单练灯光',exact:true}).click();
 const dial=page.getByRole('slider',{name:'灯光旋钮',exact:true});
 for(const size of [{width:844,height:390},{width:667,height:375},{width:390,height:844},{width:1024,height:600}]){
  await page.setViewportSize(size);await dial.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');
  for(let value=0;value<3;value++){
   if(value)await page.keyboard.press('ArrowUp');await page.clock.fastForward(150);await page.waitForTimeout(200);
   const state=await page.evaluate(()=>{
    const texts=[...document.querySelectorAll('.dial-legend span')],symbols=[...document.querySelectorAll('.dial-grip > span')],pointer=document.querySelector('.dial-pointer').getBoundingClientRect();
    const center=e=>{const b=e.getBoundingClientRect();return b.y+b.height/2;};
    return {value:+document.querySelector('.stalk-dial').getAttribute('aria-valuenow'),rows:texts.map((e,i)=>({text:e.textContent,key:e.dataset.dialValue,active:e.classList.contains('on'),symbolKey:symbols[i]?.dataset.dialValue,symbolActive:symbols[i]?.classList.contains('on'),dy:symbols[i]?Math.abs(center(e)-center(symbols[i])):Infinity,pointer:Math.abs(center(e)-(pointer.y+pointer.height/2))})),overflow:document.querySelector('.dialog').scrollWidth>document.querySelector('.dialog').clientWidth};
   });
   if(state.value!==value||state.rows.length!==3||state.overflow||state.rows.some((r,i)=>r.key!==String(i)||r.symbolKey!==String(i)||r.active!==(i===value)||r.symbolActive!==r.active||r.dy>1||i===value&&r.pointer>2))throw new Error(JSON.stringify({size,value,state}));
   results.push({size,value,rows:state.rows});
  }
  await page.screenshot({path:`output/spacing-v6/dial-${size.width}.png`});
 }
 await page.clock.resume();if(errors.length)throw new Error(JSON.stringify(errors));return {results,errors};
}
