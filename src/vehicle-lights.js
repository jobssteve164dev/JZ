import * as THREE from 'three';

export class VehicleLights{
 constructor(car){
  this.lamps={};this.beams=[];
  const lamp=(name,x,y,z,w,h,d,color)=>{
   const material=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:0,roughness:.3,metalness:.15});
   const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);car.add(mesh);this.lamps[name]=mesh;
  };
  for(const [side,x] of [['Left',-.61],['Right',.61]]){
   lamp(`head${side}`,x,.76,-2.19,.43,.23,.08,'#f3f5dc');
   lamp(`marker${side}`,x,.59,-2.19,.43,.06,.08,'#f5e7b0');
   lamp(`tail${side}`,x,.65,2.19,.43,.09,.08,'#b91520');
   lamp(`brake${side}`,x,.81,2.19,.43,.13,.08,'#e62324');
   lamp(`turnFront${side}`,Math.sign(x)*.85,.76,-2.19,.13,.23,.08,'#ff930e');
   lamp(`turnRear${side}`,Math.sign(x)*.85,.74,2.19,.13,.26,.08,'#ff930e');
   lamp(`turnSide${side}`,Math.sign(x)*.93,.87,-.9,.05,.1,.23,'#ff930e');
   const beam=new THREE.SpotLight('#fff5dd',180,30,Math.PI/7,.65,1.4);beam.position.set(x,.76,-2.24);beam.target.position.set(x,0,-24);car.add(beam,beam.target);this.beams.push(beam);
  }
  lamp('brakeCenter',0,1.45,1.03,.58,.07,.06,'#ef2224');
 }
 update(sim){
  const {beam='off',hazard=false}=sim.lighting??{};
  const on=beam!=='off',head=beam==='low'||beam==='high';
  const blink=(hazard?sim.time:sim.signalAge)%1<.5;
  const set=(name,intensity)=>{const material=this.lamps[name].material;material.emissiveIntensity=intensity;material.color.copy(material.emissive).multiplyScalar(intensity>0?1:.2);};
  for(const side of ['Left','Right']){
   set(`head${side}`,head?(beam==='high'?5:3):0);set(`marker${side}`,on?1:0);
   set(`tail${side}`,on?.7:0);set(`brake${side}`,sim.brakePressed?4:0);
   const turn=blink&&(hazard||sim.signal===side.toLowerCase());
   for(const end of ['Front','Rear','Side'])set(`turn${end}${side}`,turn?4:0);
  }
  set('brakeCenter',sim.brakePressed?4:0);
  for(const light of this.beams){light.visible=head;light.intensity=beam==='high'?350:180;light.distance=beam==='high'?65:30;light.angle=beam==='high'?Math.PI/10:Math.PI/7;light.target.position.z=beam==='high'?-58:-24;}
 }
 dispose(){for(const lamp of Object.values(this.lamps))lamp.material.dispose();for(const beam of this.beams)beam.dispose();}
}
