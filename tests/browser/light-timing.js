async page=>{
 page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{Math.random=()=>.999;});await page.reload();
 await page.getByRole('button',{name:'操作指南',exact:true}).click();await page.getByRole('button',{name:'关闭语音',exact:true}).click();await page.getByRole('button',{name:'关闭',exact:true}).click();
 await page.clock.install();await page.getByRole('button',{name:'单练灯光',exact:true}).click();
 await page.clock.fastForward(30000);
 const unlimited=await page.locator('#light-count').textContent()==='1 / 19'&&await page.locator('#light-feedback').textContent()==='';
 const dial=page.getByRole('slider',{name:'灯光旋钮',exact:true});const cdp=await page.context().newCDPSession(page);
 async function drag(dx,dy){const b=await dial.boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx,y:y+dy,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 await drag(34,0);const horizontalIgnored=(await dial.getAttribute('aria-valuenow'))==='0';
 await drag(0,-34);const up=(await dial.getAttribute('aria-valuenow'))==='1';
 await drag(0,34);const down=(await dial.getAttribute('aria-valuenow'))==='0';
 // The old horizontal control is used only to independently reproduce its early-switch defect.
 if(up){await dial.focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');}
 else {await dial.focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');}
 await page.clock.fastForward(1100);
 const passed=await page.locator('#light-feedback').textContent()==='操作正确';
 await page.clock.fastForward(4000);
 const holdsFive=await page.locator('#light-count').textContent()==='1 / 19';
 await page.clock.fastForward(1100);
 const advances=await page.locator('#light-count').textContent()==='2 / 19';
 await page.getByRole('button',{name:'关闭',exact:true}).click();
 await page.getByRole('button',{name:'模拟考试',exact:true}).click();await page.locator('#start').click();for(const name of ['绕车检查车辆与周围情况','观察后方，关好车门','调整座椅、后视镜并系好安全带','开始模拟灯光'])await page.getByRole('button',{name,exact:true}).click();
 await page.clock.fastForward(3000);const beforeDeadline=await page.locator('#light-feedback').textContent()==='';
 await dial.focus();await page.keyboard.press(up?'ArrowUp':'ArrowRight');await page.keyboard.press(up?'ArrowUp':'ArrowRight');
 await page.clock.fastForward(900);const noEarlyGrade=await page.locator('#light-feedback').textContent()==='';
 await page.clock.fastForward(1100);const timelyCorrect=await page.locator('#light-feedback').textContent()==='操作正确';
 await page.clock.fastForward(4000);const examHoldsFive=await page.locator('#light-count').textContent()==='1 / 5';
 await page.clock.fastForward(1100);
 await dial.focus();await page.keyboard.press(up?'ArrowDown':'ArrowLeft');await page.keyboard.press(up?'ArrowDown':'ArrowLeft');
 await page.clock.fastForward(5100);const lateFails=(await page.locator('#light-feedback').textContent()).includes('未通过');
 await page.keyboard.press(up?'ArrowUp':'ArrowRight');await page.keyboard.press(up?'ArrowUp':'ArrowRight');const remainsFailed=(await page.locator('#light-feedback').textContent()).includes('未通过');
 const result={unlimited,horizontalIgnored,up,down,passed,holdsFive,advances,beforeDeadline,noEarlyGrade,timelyCorrect,examHoldsFive,lateFails,remainsFailed,pageErrors:errors};
 if(Object.values(result).some(v=>v===false)||errors.length)throw new Error(JSON.stringify(result));return result;
}
