import test from 'node:test';
import assert from 'node:assert/strict';
import {chaseLookAhead} from '../src/scene.js';

test('compact chase camera looks ahead while an overtaking car is active',()=>{
 const sim={events:[{kind:'overtake',status:'pending',prewarned:false}]};
 assert.equal(chaseLookAhead(sim,true),0);
 sim.events[0].prewarned=true;
 assert.equal(chaseLookAhead(sim,true),30);
 sim.events[0].status='passed';
 assert.equal(chaseLookAhead(sim,true),0);
 assert.equal(chaseLookAhead(sim,false),12);
});
