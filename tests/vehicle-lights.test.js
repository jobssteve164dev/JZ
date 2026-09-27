import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Simulation} from '../src/simulation.js';
import {getRoute} from '../src/routes.js';
import {LightStalk} from '../src/lights.js';
const m=await import('../src/vehicle-lights.js').catch(()=>({}));
test('car has front/rear lamp components; actual turn controls blink the correct side',()=>{
 assert.equal(typeof m.VehicleLights,'function','missing vehicle lamp components');
 const car=new THREE.Group(),rig=new m.VehicleLights(car),s=new Simulation(getRoute(1));
 assert.ok(rig.lamps.headLeft.position.z<0);assert.ok(rig.lamps.tailLeft.position.z>0);assert.ok(rig.lamps.turnFrontLeft.position.x<0);
 rig.update(s);assert.equal(rig.lamps.turnRearLeft.material.emissiveIntensity,0);
 s.action('signal','left');s.step(.1,{});rig.update(s);assert.ok(rig.lamps.turnFrontLeft.material.emissiveIntensity>0);assert.ok(rig.lamps.turnRearLeft.material.emissiveIntensity>0);assert.equal(rig.lamps.turnRearRight.material.emissiveIntensity,0);
 s.step(.5,{});rig.update(s);assert.equal(rig.lamps.turnRearLeft.material.emissiveIntensity,0);
 s.action('signal','right');s.step(.01,{});rig.update(s);assert.ok(rig.lamps.turnRearRight.material.emissiveIntensity>0);assert.equal(rig.lamps.turnRearLeft.material.emissiveIntensity,0);
 s.action('signal','right');rig.update(s);assert.equal(rig.lamps.turnRearRight.material.emissiveIntensity,0);
});
test('brake lamps respond to the actual pedal and release independently of tail lamps',()=>{
 assert.equal(typeof m.VehicleLights,'function');const rig=new m.VehicleLights(new THREE.Group()),s=new Simulation(getRoute(1));
 s.step(.1,{brake:1});rig.update(s);assert.ok(rig.lamps.brakeLeft.material.emissiveIntensity>0);assert.ok(rig.lamps.brakeCenter.material.emissiveIntensity>0);
 s.step(.1,{});rig.update(s);assert.equal(rig.lamps.brakeLeft.material.emissiveIntensity,0);assert.equal(rig.lamps.brakeCenter.material.emissiveIntensity,0);
});
test('shared stalk lights vehicle markers, beams and synchronous hazard lamps',()=>{
 assert.equal(typeof m.VehicleLights,'function');const rig=new m.VehicleLights(new THREE.Group()),s=new Simulation(getRoute(1)),stalk=new LightStalk(s.lighting);
 stalk.rotate(1);rig.update(s);assert.ok(rig.lamps.tailLeft.material.emissiveIntensity>0);assert.equal(rig.lamps.headLeft.material.emissiveIntensity,0);
 stalk.rotate(2);rig.update(s);assert.ok(rig.lamps.headLeft.material.emissiveIntensity>0);const low=rig.beams[0].distance;
 stalk.push();rig.update(s);assert.ok(rig.beams[0].distance>low);
 stalk.hazard();rig.update(s);assert.equal(rig.lamps.turnRearLeft.material.emissiveIntensity,rig.lamps.turnRearRight.material.emissiveIntensity);assert.ok(rig.lamps.turnRearLeft.material.emissiveIntensity>0);
 s.step(.6,{});rig.update(s);assert.equal(rig.lamps.turnRearLeft.material.emissiveIntensity,0);assert.equal(rig.lamps.turnRearRight.material.emissiveIntensity,0);
 stalk.rotate(0);stalk.hazard();rig.update(s);assert.equal(rig.lamps.tailLeft.material.emissiveIntensity,0);assert.equal(rig.beams[0].visible,false);
});
