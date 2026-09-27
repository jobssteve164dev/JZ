import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {at} from './routes.js';
import {lightPhase} from './simulation.js';
export class DrivingScene{
 constructor(canvas){
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#c6dfe6');this.scene.fog=new THREE.Fog('#c6dfe6',130,700);
  this.camera=new THREE.PerspectiveCamera(60,1,.1,2500);this.scene.add(new THREE.HemisphereLight('#effaff','#768574',2.6));
  const sun=new THREE.DirectionalLight('#fff4dd',2.5);sun.position.set(-60,150,50);this.scene.add(sun);
  this.world=new THREE.Group();this.scene.add(this.world);this.materials=new Map();this.lights=[];
  this.resize=()=>{const {width,height}=canvas.getBoundingClientRect();this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();};
  this.observer=new ResizeObserver(this.resize);this.observer.observe(canvas);
 }
 material(color){if(!this.materials.has(color))this.materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.88}));return this.materials.get(color);}
 box(x,y,z,w,h,d,color,parent=this.world){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),this.material(color));m.position.set(x,y,z);parent.add(m);return m;}
 line(a,b,width,color,y=.045){const dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz);const m=this.box((a.x+b.x)/2,y,(a.z+b.z)/2,width,.02,l,color);m.rotation.y=Math.atan2(dx,dz);return m;}
 text(text,x,z,heading=0,color='#235c5c',width=7){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=256;const c=canvas.getContext('2d');
  c.fillStyle=color;c.fillRect(0,0,768,256);c.strokeStyle='#fff';c.lineWidth=12;c.strokeRect(10,10,748,236);c.fillStyle='#fff';c.font='bold 62px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,384,130,720);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(width,width/3),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));m.position.set(x,4,z);m.rotation.y=heading;this.world.add(m);this.box(x,1.8,z,.14,3.6,.14,'#8b999e');return m;
 }
 build(route){
  while(this.world.children.length){const child=this.world.children[0];child.traverse(o=>{o.geometry?.dispose();if(o.material?.map){o.material.map.dispose();o.material.dispose();}});this.world.remove(child);}
  this.route=route;this.lights=[];const k=route.scale;
  this.box(0,-.3,-200,5000,.5,5000,'#93af8e');
  for(const [x1,z1,x2,z2] of route.roads){
    const vertical=x1===x2,l=Math.hypot(x2-x1,z2-z1),x=(x1+x2)/2,z=(z1+z2)/2;
    this.box(x,-.03,z,vertical?36*k:l, .14,vertical?l:36*k,'#bbc2bd');
    this.box(x,.015,z,vertical?32*k:l,.07,vertical?l:32*k,'#566269');
    for(const side of [-15.25,15.25]){if(vertical)this.line({x:x+side*k,z:z1},{x:x+side*k,z:z2},.16*k,'#f3f0df');else this.line({x:x1,z:z+side*k},{x:x2,z:z+side*k},.16*k,'#f3f0df');}
    for(let s=0;s<l;s+=10*k){const px=x1+(x2-x1)*s/l,pz=z1+(z2-z1)*s/l;
      const intersection=route.junctions.some(([jx,jz])=>Math.hypot(jx-px,jz-pz)<24*k);
      const turnEnd=route.path.some((q,i)=>i>0&&Math.hypot(q.x-px,q.z-pz)<15*k&&q.z<Math.min(...route.junctions.map(j=>j[1]))-300*k);
      if(!intersection){
        for(const lane of [-10,-6,6,10])this.box(px+(vertical?lane*k:0),.07,pz+(vertical?0:lane*k),vertical?.13*k:4*k,.02,vertical?4*k:.13*k,'#e2e5df');
        if(!turnEnd){this.box(px,.22,pz,vertical?1.6*k:10*k,.35,vertical?10*k:1.6*k,'#7e9d59');}
      }
    }
    for(let s=30*k;s<l;s+=60*k){const px=x1+(x2-x1)*s/l,pz=z1+(z2-z1)*s/l;
      for(const side of [-1,1]){
        const tx=px+(vertical?side*23*k:0),tz=pz+(vertical?0:side*23*k);
        if(route.junctions.some(([jx,jz])=>Math.hypot(jx-tx,jz-tz)<40*k))continue;
        this.box(tx,2.5,tz,.5,5,.5,'#675e4b');const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(3.5,0),this.material('#527e59'));crown.position.set(tx,6,tz);this.world.add(crown);
        if(side===-1){this.box(tx- (vertical?15*k:0),8,tz-(vertical?0:15*k),vertical?14*k:24*k,16,vertical?24*k:14*k,'#d0d8d2');}
      }
    }
  }
  for(const [x,z] of route.junctions){
    this.box(x,.04,z,32*k,.06,32*k,'#566269');
    for(const side of [-1,1])for(let v=-14;v<=14;v+=2.4){
      this.box(x+v*k,.085,z+side*20*k,1.3*k,.02,4*k,'#e8ede6');
      this.box(x+side*20*k,.085,z+v*k,4*k,.02,1.3*k,'#e8ede6');
    }
  }
  this.guidance=new THREE.Group();this.world.add(this.guidance);
  for(let s=0;s<3000;s+=9){const p=at(route,s);const shape=new THREE.Shape();shape.moveTo(0,1.3);shape.lineTo(-.7,-.6);shape.lineTo(0,0);shape.lineTo(.7,-.6);shape.closePath();const m=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:'#65e0c4',side:THREE.DoubleSide,transparent:true,opacity:.8}));m.rotation.x=-Math.PI/2;m.rotation.z=-p.heading;m.position.set(p.x,.13,p.z);this.guidance.add(m);}
  for(const e of route.events){
    if(['school','bus'].includes(e.kind)){
      const p=e.point,right={x:Math.cos(p.heading),z:Math.sin(p.heading)};
      this.text(e.kind==='school'?'学校区域':'公交车站',p.x+right.x*12*k,p.z+right.z*12*k,p.heading,e.kind==='school'?'#a25e12':'#226c8b');
      if(e.kind==='bus'){this.box(p.x+right.x*15*k,1.5,p.z+right.z*15*k,6,3,2,'#849d9a');this.box(p.x+right.x*15*k,3.2,p.z+right.z*15*k,7,.3,3,'#316a71');}
    }
  }
  for(const l of route.lights){
    const p=l.point,right={x:Math.cos(p.heading),z:Math.sin(p.heading)};
    const x=p.x+right.x*6*k,z=p.z+right.z*6*k;
    this.box(x,3,z,.2,6,.2,'#6d7777');this.box(x,6.7,z,1.1,3.2,.6,'#202d32');
    const bulbs=['red','yellow','green'].map((c,i)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(.34,10,8),new THREE.MeshBasicMaterial({color:'#273a38'}));m.position.set(x,7.7-i,z);this.world.add(m);return m;});
    this.lights.push({...l,bulbs});
    this.line({x:p.x-right.x*3*k,z:p.z-right.z*3*k},{x:p.x+right.x*5*k,z:p.z+right.z*5*k},.4,'#ffffff',.10);
  }
  const end=at(route,3000);this.text('考试终点',end.x+Math.cos(end.heading)*6*k,end.z+Math.sin(end.heading)*6*k,end.heading,'#28665b');
  if(route.id===1)this.text('车辆管理所',-190*k,150*k,0,'#245e80',30);
  this.car=new THREE.Group();this.world.add(this.car);
  this.box(0,.65,0,1.8,.7,4.3,'#eff3eb',this.car);this.box(0,1.2,-.1,1.6,.65,2.2,'#304e5a',this.car);this.box(0,1.59,.1,1.45,.12,1.3,'#edf2e8',this.car);
  for(const x of [-.91,.91])for(const z of [-1.3,1.25]){const m=new THREE.Mesh(new THREE.CylinderGeometry(.36,.36,.23,12),this.material('#243037'));m.rotation.z=Math.PI/2;m.position.set(x,.38,z);this.car.add(m);}
  this.box(-.58,.72,-2.17,.42,.22,.07,'#fff5bc',this.car);this.box(.58,.72,-2.17,.42,.22,.07,'#fff5bc',this.car);
  // Merge static geometry to keep mobile draw calls bounded. Dynamic lamps and cars stay separate.
  const batches=new Map();
  for(const obj of [...this.world.children])if(obj.isMesh&&[...this.materials.values()].includes(obj.material)){obj.updateMatrix();const geo=obj.geometry.clone().applyMatrix4(obj.matrix);if(!batches.has(obj.material))batches.set(obj.material,[]);batches.get(obj.material).push(geo);obj.geometry.dispose();this.world.remove(obj);}
  for(const [material,geometries]of batches){const merged=mergeGeometries(geometries);this.world.add(new THREE.Mesh(merged,material));geometries.forEach(g=>g.dispose());}
  const arrows=this.guidance.children.map(obj=>{obj.updateMatrix();return obj.geometry.clone().applyMatrix4(obj.matrix);});
  const arrowMesh=new THREE.Mesh(mergeGeometries(arrows),new THREE.MeshBasicMaterial({color:'#65e0c4',side:THREE.DoubleSide,transparent:true,opacity:.8}));
  for(const obj of [...this.guidance.children]){obj.geometry.dispose();obj.material.dispose();this.guidance.remove(obj);}arrows.forEach(g=>g.dispose());this.guidance.add(arrowMesh);
  this.otherCars=[];
  this.view='chase';this.resize();
 }
 render(sim,preview=false){
  if(!this.otherCars.length)for(const vehicle of sim.traffic){const g=new THREE.Group();this.world.add(g);g.position.set(vehicle.x,0,vehicle.z);g.rotation.y=-vehicle.heading;this.box(0,.65,0,1.8,.8,4.3,vehicle.kind==='meet'?'#719cac':'#d0b77e',g);this.box(0,1.25,0,1.55,.6,2.1,'#324d58',g);for(const x of [-.9,.9])for(const z of [-1.3,1.3])this.box(x,.35,z,.25,.6,.6,'#233236',g);this.otherCars.push(g);}
  this.otherCars.forEach((car,i)=>{car.visible=sim.traffic[i].active;});
  const p=sim.position,h=sim.heading;this.car.position.set(p.x,0,p.z);this.car.rotation.y=-h;
  this.guidance.visible=sim.mode==='practice';
  for(const l of this.lights){const phase=lightPhase(sim.time,l.offset);l.bulbs.forEach((b,i)=>b.material.color.set(['red','yellow','green'][i]===phase?['#ff4848','#ffce42','#46e99a'][i]:'#203735'));}
  let target;
  if(preview){this.camera.position.set(p.x+45,38,p.z+48);target=new THREE.Vector3(p.x,0,p.z-12);}
  else if(this.view==='cockpit'){
    this.car.visible=false;this.camera.position.set(p.x-Math.cos(h)*.35,1.45,p.z-Math.sin(h)*.35);
    const look=sim.time-sim.looks.left<1?-Math.PI/3:sim.time-sim.looks.right<1?Math.PI/3:0;
    target=new THREE.Vector3(p.x+Math.sin(h+look)*35,1.6,p.z-Math.cos(h+look)*35);
  }else{this.car.visible=true;this.camera.position.set(p.x-Math.sin(h)*11,6.6,p.z+Math.cos(h)*11);target=new THREE.Vector3(p.x+Math.sin(h)*12,1,p.z-Math.cos(h)*12);}
  this.camera.lookAt(target);this.renderer.render(this.scene,this.camera);
 }
}
