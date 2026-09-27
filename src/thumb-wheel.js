export function mountThumbWheel(root,enabled,onChange){
 let pointer=null,previous=0,rotation=0;
 const angle=e=>{const b=root.getBoundingClientRect(),x=e.clientX-b.x-b.width/2,y=e.clientY-b.y-b.height/2;return Math.hypot(x,y)<10?null:Math.atan2(y,x);};
 function render(value){root.style.setProperty('--wheel-angle',`${value*90}deg`);root.setAttribute('aria-valuenow',Number(value.toFixed(2)));}
 function reset(){const id=pointer;pointer=null;rotation=0;onChange(0);render(0);if(id!==null&&root.hasPointerCapture(id))root.releasePointerCapture(id);}
 root.onpointerdown=e=>{if(!enabled()||pointer!==null)return;const a=angle(e);if(a===null)return;e.preventDefault();pointer=e.pointerId;previous=a;rotation=0;root.setPointerCapture(pointer);};
 root.onpointermove=e=>{
  if(e.pointerId!==pointer)return;if(!enabled()){reset();return;}e.preventDefault();const a=angle(e);if(a===null)return;
  rotation=Math.max(-Math.PI/2,Math.min(Math.PI/2,rotation+Math.atan2(Math.sin(a-previous),Math.cos(a-previous))));previous=a;
  const value=rotation/(Math.PI/2);onChange(value);render(value);
 };
 root.onpointerup=root.onpointercancel=root.onlostpointercapture=e=>{if(e.pointerId===pointer)reset();};
 root.onkeydown=e=>{if(!enabled()||!['ArrowLeft','ArrowRight','Home'].includes(e.key))return;e.preventDefault();e.stopPropagation();const value=e.key==='Home'?0:Math.max(-1,Math.min(1,Number(root.getAttribute('aria-valuenow'))+(e.key==='ArrowLeft'?-.1:.1)));onChange(value);render(value);};
 root.onkeyup=e=>{if(['ArrowLeft','ArrowRight','Home'].includes(e.key))reset();};root.onblur=reset;
 render(0);return {reset,render};
}
