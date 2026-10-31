async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{Math.random=()=>.999;});await page.reload();
 await page.getByRole('button',{name:'操作指南',exact:true}).click();await page.getByRole('button',{name:'关闭语音',exact:true}).click();await page.getByRole('button',{name:'关闭',exact:true}).click();await page.getByRole('button',{name:'单练灯光',exact:true}).click();
 const dial=page.getByRole('slider',{name:'灯光旋钮',exact:true}),arm=page.getByRole('slider',{name:'远近光操作杆',exact:true});await dial.focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');
 const cdp=await page.context().newCDPSession(page);
 async function dragArm(dy){const b=await arm.boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+dy,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 await dragArm(-24);const high=await arm.getAttribute('aria-valuetext');if(high!=='远光锁定')throw new Error('one upward drag did not select high beam: '+high);
 await dragArm(-14);const low=await arm.getAttribute('aria-valuetext');if(low!=='近光位置')throw new Error('one upward drag did not return high beam to low beam: '+low);
 if(errors.length)throw new Error(JSON.stringify(errors));await cdp.detach();return {high,low,errors};
}
