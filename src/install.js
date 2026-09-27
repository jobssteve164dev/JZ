let installPrompt=null;
addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;});
export async function installApp(show){
 if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;return;}
 const installed=matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches||navigator.standalone;
 show('安装到手机',installed?'<p>已在独立窗口运行。横放手机，开始触摸驾驶。</p>':'<p><b>iPhone / iPad</b><br>用 Safari 打开本站，点“分享”，选择“添加到主屏幕”，再从桌面图标启动。</p><p><b>Android</b><br>用 Chrome 打开本站，在浏览器菜单中选择“安装应用”或“添加到主屏幕”。</p><p>首次加载完成后，路线和灯光练习可离线使用。驾驶时横放手机。</p>');
}
export async function enterDrivingDisplay(){
 if(!matchMedia('(pointer: coarse)').matches)return;
 try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();}catch{}
 try{await screen.orientation?.lock?.('landscape');}catch{}
}
export function registerOffline(){
 if('serviceWorker'in navigator&&import.meta.env.PROD)navigator.serviceWorker.register('/sw.js').catch(()=>{});
}
