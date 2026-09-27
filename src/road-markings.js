import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {roadSection,roadArrows,junctionBounds} from './road-layout.js';
import {inJunction} from './lanes.js';
const heading={N:0,E:Math.PI/2,S:Math.PI,W:-Math.PI/2};
export function buildRoadSurface(route){
 const group=new THREE.Group(),k=route.scale,buffers={surface:[],shoulder:[],white:[],yellow:[],median:[]};
 const quad=(kind,a,b,c,d,y)=>{for(const p of [a,b,c,a,c,d])buffers[kind].push(p.x,y,p.z);};
 const point=(r,t,d)=>r[0]===r[2]?{x:r[0]+d*k,z:t*k}:{x:t*k,z:r[1]+d*k};
 const stripe=(kind,r,a,b,da,db,width,y=.1)=>quad(kind,point(r,a,da-width/2),point(r,b,db-width/2),point(r,b,db+width/2),point(r,a,da+width/2),y);
 route.roads.forEach((r,road)=>{
  const vertical=r[0]===r[2],from=(vertical?r[1]:r[0])/k,to=(vertical?r[3]:r[2])/k,pos=vertical?'N':'E',neg=vertical?'S':'W';
  for(let a=from;a<to;a+=4){
   const b=Math.min(to,a+4),mid=(a+b)/2,p0=roadSection(route.id,road,pos,a),p1=roadSection(route.id,road,pos,b),n0=roadSection(route.id,road,neg,a),n1=roadSection(route.id,road,neg,b);
   for(const [kind,extra,y]of [['shoulder',1.5,-.08],['surface',0,.05]])quad(kind,point(r,a,-n0.edges.at(-1)-extra),point(r,b,-n1.edges.at(-1)-extra),point(r,b,p1.edges.at(-1)+extra),point(r,a,p0.edges.at(-1)+extra),y);
   if(inJunction(route,point(r,mid,0)))continue;
   for(const [d,s0,s1]of [[1,p0,p1],[-1,n0,n1]]){
    stripe('white',r,a,b,d*s0.edges.at(-1),d*s1.edges.at(-1),.12);
    const solid=roadArrows(route.id).some(row=>row.road===road&&row.direction===(d===1?pos:neg)&&Math.abs(row.along-mid)<24&&!s0.taper);
    if(solid||Math.floor((a-from)/4)%3===0){
     const count=Math.min(s0.edges.length,s1.edges.length);for(let i=1;i<count-1;i++)stripe('white',r,a,b,d*s0.edges[i],d*s1.edges[i],.12);
    }
   }
   if(p0.median<1){stripe('yellow',r,a,b,-.14,-.14,.12);stripe('yellow',r,a,b,.14,.14,.12);}
   else if(!route.medianGaps.some(g=>g.road===road&&mid*k>=g.from&&mid*k<=g.to))quad('median',point(r,a,-3),point(r,b,-3),point(r,b,3),point(r,a,3),.22);
  }
 });
 for(const [x,z]of route.junctions){
  const b=junctionBounds(route,x,z);quad('surface',{x:x-b.left,z:z-b.top},{x:x-b.left,z:z+b.bottom},{x:x+b.right,z:z+b.bottom},{x:x+b.right,z:z-b.top},.06);
  const vertical=route.roads.find(r=>r[0]===r[2]&&Math.abs(r[0]-x)<.01),horizontal=route.roads.find(r=>r[1]===r[3]&&Math.abs(r[1]-z)<.01);
  if(vertical)for(const edge of [z-b.top-3*k,z+b.bottom+3*k])for(let v=x-b.left+1*k;v<x+b.right;v+=2.4*k)quad('white',{x:v,z:edge-1.8*k},{x:v,z:edge+1.8*k},{x:v+1.3*k,z:edge+1.8*k},{x:v+1.3*k,z:edge-1.8*k},.11);
  if(horizontal)for(const edge of [x-b.left-3*k,x+b.right+3*k])for(let v=z-b.top+1*k;v<z+b.bottom;v+=2.4*k)quad('white',{x:edge-1.8*k,z:v},{x:edge-1.8*k,z:v+1.3*k},{x:edge+1.8*k,z:v+1.3*k},{x:edge+1.8*k,z:v},.11);
 }
 for(const [kind,color]of [['shoulder','#bbc2bd'],['surface','#566269'],['white','#f3f0df'],['yellow','#f6c853'],['median','#7e9d59']]){
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(buffers[kind],3));geometry.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({color,roughness:.9,side:THREE.DoubleSide});const mesh=new THREE.Mesh(geometry,material);mesh.name=kind==='surface'?'road-surface':`road-${kind}`;group.add(mesh);
 }
 const arrows=[];
 const polygon=(points,x,z,angle)=>{
  const shape=new THREE.Shape();points.forEach(([a,b],i)=>i?shape.lineTo(a,b):shape.moveTo(a,b));shape.closePath();
  const geometry=new THREE.ShapeGeometry(shape);geometry.rotateX(-Math.PI/2);geometry.rotateY(-angle);geometry.scale(k,k,k);geometry.translate(x,.13,z);arrows.push(geometry);
 };
 const rows=roadArrows(route.id);
 // The drawings omit some side approaches; use their connected exits without overriding drawn rows.
 route.roads.forEach((r,road)=>{
  const vertical=r[0]===r[2];for(const [x,z]of route.junctions){if(Math.abs((vertical?x:z)-(vertical?r[0]:r[1]))>.01)continue;
   const j=(vertical?z:x)/k;for(const direction of vertical?['N','S']:['E','W']){
    const delta=['N','W'].includes(direction)?1:-1,along=j+delta*40;
    if(along<Math.min(vertical?r[1]:r[0],vertical?r[3]:r[2])/k||along>Math.max(vertical?r[1]:r[0],vertical?r[3]:r[2])/k||rows.some(a=>a.road===road&&a.direction===direction&&Math.abs(a.along-along)<45))continue;
    const n=roadSection(route.id,road,direction,along).count;
    for(let lane=1;lane<=n;lane++)rows.push({road,direction,along,lane,turns:lane===1?['straight','left']:lane===n?['straight','right']:['straight']});
   }
  }
 });
 for(const {road,direction,along,lane,turns}of rows){
  const r=route.roads[road],section=roadSection(route.id,road,direction,along);if(lane>section.count)continue;
  const lateral=(section.edges[lane-1]+section.edges[lane])/2*(direction==='S'||direction==='W'?-1:1),p=point(r,along,lateral),a=heading[direction];
  polygon([[-.13,-2],[.13,-2],[.13,1],[-.13,1]],p.x,p.z,a);
  if(turns.includes('straight'))polygon([[-.55,1],[0,2],[.55,1],[.13,1],[.13,0],[-.13,0],[-.13,1]],p.x,p.z,a);
  for(const [turn,d]of [['left',-1],['right',1]])if(turns.includes(turn))polygon([[0,.25],[d*.72,.25],[d*.72,-.05],[d*1.2,.6],[d*.72,1.2],[d*.72,.85],[0,.85]],p.x,p.z,a);
  if(turns.includes('uturn'))polygon([[0,.5],[-.4,.95],[-.85,.95],[-1.15,.55],[-1.15,-.65],[-1.45,-.65],[-1,-1.3],[-.55,-.65],[-.85,-.65],[-.85,.4],[-.65,.65],[-.5,.65],[-.15,.25]],p.x,p.z,a);
 }
 const geometry=mergeGeometries(arrows);arrows.forEach(g=>g.dispose());const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:'#ffffff',side:THREE.DoubleSide}));mesh.name='direction-arrows';group.add(mesh);
 return group;
}
