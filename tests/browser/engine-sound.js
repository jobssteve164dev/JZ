async page=>{
 return await page.evaluate(async()=>{
  const {EngineSound}=await import('/src/engine-sound.js');
  const render=async(throttle,paused=false)=>{const ctx=new OfflineAudioContext(1,24000,24000),engine=new EngineSound(ctx);engine.update({speed:10,throttlePressed:throttle,paused,finished:false},true);const data=(await ctx.startRendering()).getChannelData(0);let energy=0,crossings=0;for(let i=4000;i<data.length;i++){energy+=data[i]*data[i];if(data[i-1]<0&&data[i]>=0)crossings++;}return {energy,crossings};};
  const idle=await render(0),gas=await render(1),paused=await render(1,true);if(!(idle.energy>0&&gas.energy>idle.energy&&gas.crossings>idle.crossings&&paused.energy===0))throw new Error(JSON.stringify({idle,gas,paused}));return {idle,gas,paused};
 });
}
