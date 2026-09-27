import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {getRoute} from '../src/routes.js';

function driving(){const s=new Simulation(getRoute(1));s.action('belt');s.action('gear','D');s.action('handbrake');return s;}
for(const [side,steer] of [['left',-.35],['right',.35]]){
 test(`${side} signal cancels after a moving turn and steering returns to centre`,()=>{
  const s=driving();s.action('signal',side);s.step(3.2);s.action('look',side);
  s.step(2,{throttle:1,steer});assert.equal(s.signal,side);
  s.step(.1,{throttle:.5,steer:0});assert.equal(s.signal,'off');assert.equal(s.signalAge,0);
 });
 test(`${side} signal stays on while waiting, driving straight or only nudging the wheel`,()=>{
  const s=driving();s.action('signal',side);s.step(10,{steer});assert.equal(s.signal,side);
  s.step(2,{throttle:1});assert.equal(s.signal,side);
  s.step(.05,{throttle:.5,steer});s.step(.05,{steer:0});assert.equal(s.signal,side);
 });
}
test('changing indicator direction clears the previous turn before the new maneuver',()=>{
 const s=driving();s.action('signal','left');s.step(3.2);s.step(2,{throttle:1,steer:-.35});
 s.action('signal','right');s.step(.1,{throttle:.5});assert.equal(s.signal,'right');
 s.step(1,{throttle:.5,steer:.35});s.step(.1,{throttle:.5});assert.equal(s.signal,'off');
});
test('a completed turn still cancels when the car stops before the wheel returns',()=>{
 const s=driving();s.action('signal','left');s.step(3.2);s.step(2,{throttle:1,steer:-.35});
 s.step(2,{brake:1,steer:-.35});assert.equal(s.signal,'left');s.step(.05,{steer:0});assert.equal(s.signal,'off');
});
