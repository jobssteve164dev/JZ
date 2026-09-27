import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {getRoute} from '../src/routes.js';
const m=await import('../src/road-markings.js').catch(()=>({}));
test('actual road meshes contain white direction arrows and variable-width junction approaches',()=>{
 assert.equal(typeof m.buildRoadSurface,'function','no road arrow geometry is rendered');
 const r=getRoute(1),g=m.buildRoadSurface(r);g.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(new THREE.Vector3((-380+14.375)*r.scale,10,40*r.scale),new THREE.Vector3(0,-1,0));
 assert.ok(ray.intersectObject(g,true).some(hit=>hit.object.name==='direction-arrows'),'outer right-turn arrow stem missing');
 const approach=new THREE.Raycaster(new THREE.Vector3((-380+15)*r.scale,10,45*r.scale),new THREE.Vector3(0,-1,0));
 const start=new THREE.Raycaster(new THREE.Vector3((-380+15)*r.scale,10,180*r.scale),new THREE.Vector3(0,-1,0));
 assert.ok(approach.intersectObject(g,true).some(hit=>hit.object.name==='road-surface'));
 assert.equal(start.intersectObject(g,true).some(hit=>hit.object.name==='road-surface'),false);
});
