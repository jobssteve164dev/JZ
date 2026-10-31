import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {getRoute} from '../src/routes.js';
import {roadSection} from '../src/road-layout.js';
const m=await import('../src/road-markings.js').catch(()=>({}));
test('actual road meshes contain direction arrows and redistributed four-lane approach markings',()=>{
 assert.equal(typeof m.buildRoadSurface,'function','no road arrow geometry is rendered');
 const r=getRoute(1),g=m.buildRoadSurface(r);g.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(new THREE.Vector3((-380+10.875)*r.scale,10,40*r.scale),new THREE.Vector3(0,-1,0));
 assert.ok(ray.intersectObject(g,true).some(hit=>hit.object.name==='direction-arrows'),'outer right-turn arrow stem missing');
 const approach=new THREE.Raycaster(new THREE.Vector3((-380+9.25)*r.scale,10,45*r.scale),new THREE.Vector3(0,-1,0));
 const start=new THREE.Raycaster(new THREE.Vector3((-380+9.25)*r.scale,10,180*r.scale),new THREE.Vector3(0,-1,0));
 assert.ok(approach.intersectObject(g,true).some(hit=>hit.object.name==='road-white'));
 assert.equal(start.intersectObject(g,true).some(hit=>hit.object.name==='road-white'),false);
});
test('route 1 renders the parking lane as road surface without giving it a junction arrow',()=>{
 const r=getRoute(1),g=m.buildRoadSurface(r),k=r.scale;g.updateMatrixWorld(true);
 const parking=new THREE.Raycaster(new THREE.Vector3((-380+14)*k,10,180*k),new THREE.Vector3(0,-1,0));
 assert.ok(parking.intersectObject(g,true).some(hit=>hit.object.name==='road-surface'),'ordinary parking lane surface is missing');
 const junctionParking=new THREE.Raycaster(new THREE.Vector3((-380+14)*k,10,40*k),new THREE.Vector3(0,-1,0));
 const hits=junctionParking.intersectObject(g,true);
 assert.ok(hits.some(hit=>hit.object.name==='road-surface'),'junction parking lane surface is missing');
 assert.equal(hits.some(hit=>hit.object.name==='direction-arrows'),false,'parking lane must not receive a travel arrow');
});
test('route 1 parking divider stays straight where three travel lanes begin splitting into four',()=>{
 const r=getRoute(1),g=m.buildRoadSurface(r),k=r.scale;g.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(new THREE.Vector3((-380+12.5)*k,10,138*k),new THREE.Vector3(0,-1,0));
 assert.ok(ray.intersectObject(g,true).some(hit=>hit.object.name==='road-white'),'parking divider bends into the travel-lane split');
});
const renderedTransitions=[
 ['route 1 starting approach',1,0,'N',85,140],['route 1 southbound exit',1,1,'S',65,140],
 ['route 9 northbound approach',9,1,'N',80,140],['route 9 northbound exit',9,1,'N',-100,-40],['route 9 opposite U-turn side',9,1,'S',-1026,-1006],
 ['route 10 starting road',10,0,'E',-490,-410],['route 10 northbound approach',10,1,'N',80,140],['route 10 northbound exit',10,1,'N',-100,-40],
 ['route 10 opposite U-turn side',10,1,'S',-1022,-1002],['route 10 return exit',10,0,'W',-140,-60]
];
const surfaces=new Map();
for(const [name,id,road,direction,lo,hi]of renderedTransitions)test(`${name} renders all moving divider lines inside the fixed road edges`,()=>{
 const route=getRoute(id),r=route.roads[road],k=route.scale,vertical=r[0]===r[2],from=(vertical?r[1]:r[0])/k,to=(vertical?r[3]:r[2])/k;
 let sample;
 for(let a=from,index=0;a<to;a+=4,index++){
  const b=Math.min(to,a+4),mid=(a+b)/2,s0=roadSection(id,road,direction,a),s1=roadSection(id,road,direction,b);
  if(mid>=lo&&mid<=hi&&s0.taper&&s1.taper&&index%3===0){sample={a,b,mid,s0,s1};break;}
 }
 assert.ok(sample,`no rendered taper stripe found for ${name}`);
 if(!surfaces.has(id)){const surface=m.buildRoadSurface(route);surface.updateMatrixWorld(true);surfaces.set(id,surface);}
 const surface=surfaces.get(id),sign=['N','E'].includes(direction)?1:-1;
 for(let i=1;i<4;i++){
  const lateral=sign*(sample.s0.edges[i]+sample.s1.edges[i])/2;
  const x=vertical?r[0]+lateral*k:sample.mid*k,z=vertical?sample.mid*k:r[1]+lateral*k;
  const ray=new THREE.Raycaster(new THREE.Vector3(x,10,z),new THREE.Vector3(0,-1,0));
  assert.ok(ray.intersectObject(surface,true).some(hit=>hit.object.name==='road-white'),`${name} divider ${i} is absent from the final mesh`);
 }
});
