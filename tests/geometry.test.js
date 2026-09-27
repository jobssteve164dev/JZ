import test from 'node:test';import assert from 'node:assert/strict';import {getRoute,at,nearest} from '../src/routes.js';
test('curb distance uses the right side of northbound vehicle',()=>{const r=getRoute(1),p=at(r,50);assert.ok(nearest(r,{x:p.x+1,z:p.z},40,60).offset>.9);});
import {Simulation} from '../src/simulation.js';
test('driving past lane-change cue without moving into target lane fails that project',()=>{const s=new Simulation(getRoute(9));const e=s.events.find(e=>e.kind==='change');e.entered=true;e.checked=true;e.maxOffset=4;e.endOffset=4;s.evaluate(e);assert.equal(e.status,'failed');});
test('overtake cannot pass just by signaling while remaining outside the overtaking path',()=>{const s=new Simulation(getRoute(1));const e=s.events.find(e=>e.kind==='overtake');e.entered=true;e.returnSignal=true;e.maxOffset=4;e.endOffset=0;s.evaluate(e);assert.equal(e.status,'failed');});
test('route includes physical vehicles for meeting and overtaking practice',()=>{const s=new Simulation(getRoute(1));assert.ok(Array.isArray(s.traffic));assert.equal(s.traffic.length,2);});
test('route 9 westbound overtaking moves left toward the median as the supplied purple diagram shows',()=>{const r=getRoute(9),e=r.events.find(e=>e.kind==='overtake'),mid=at(r,e.s+95*r.scale);assert.ok(mid.z>e.point.z+2*r.scale,'overtake must move south, the left side when westbound');});
