import test from 'node:test';
import assert from 'node:assert/strict';
const module = await import('../src/simulation.js').catch(() => ({}));
const data = await import('../src/routes.js').catch(() => ({}));
test('three supplied routes are drivable for exactly 3000m', () => {
  assert.equal(typeof data.getRoute, 'function', 'missing route simulation');
  for (const id of [1,9,10]) {
    const r=data.getRoute(id);
    assert.ok(Math.abs(r.length-3000)<0.001);
    assert.equal(r.events.at(-1).kind,'park');
    assert.ok(r.events.every((e,i,a)=>i===0||e.s>a[i-1].s));
  }
});
test('routes preserve independently transcribed project ordering including handwritten route 10',()=>{
  assert.equal(typeof data.getRoute,'function');
  const expected={1:['start','right','change','left','straight','uturn','meet','overtake','cross','school','cross','change','right','bus','right','park'],9:['start','straight','overtake','right','school','change','cross','change','bus','uturn','cross','left','meet','park'],10:['start','change','meet','change','left','school','cross','bus','uturn','overtake','cross','change','right','change','straight','park']};
  for(const id of [1,9,10]) assert.deepEqual(data.getRoute(id).events.map(e=>e.kind),expected[id]);
});
test('P and handbrake prevent motion; D acceleration advances real world position',()=>{
  assert.equal(typeof module.Simulation,'function','missing driving engine');
  const s=new module.Simulation(data.getRoute(1));
  for(let i=0;i<100;i++) s.step(.05,{throttle:1});
  assert.equal(s.distance,0);
  s.action('belt');s.action('handbrake');s.action('gear','D');s.action('signal','left');s.action('look','left');
  for(let i=0;i<80;i++) s.step(.05,{});
  const x=s.position.x,z=s.position.z;
  for(let i=0;i<100;i++) s.step(.05,{throttle:1});
  assert.ok(s.distance>3);assert.ok(Math.hypot(s.position.x-x,s.position.z-z)>3);
});
test('pause freezes clock, signals and motion; steering changes heading',()=>{
  assert.equal(typeof module.Simulation,'function');
  const s=new module.Simulation(data.getRoute(9));
  s.action('belt');s.action('gear','D');s.action('handbrake');s.action('signal','left');
  s.paused=true;s.step(4,{throttle:1});assert.equal(s.time,0);assert.equal(s.signalAge,0);
  s.paused=false;s.step(1,{});assert.equal(s.time,1);
  const heading=s.heading;
  for(let i=0;i<80;i++) s.step(.05,{throttle:1,steer:.5});
  assert.notEqual(s.heading,heading);
});
test('signal action must last 3 seconds, toggling cancels and resets age',()=>{
  assert.equal(typeof module.Simulation,'function');const s=new module.Simulation(data.getRoute(1));
  s.action('signal','left');s.step(2,{});assert.equal(s.signalReady('left'),false);
  s.step(1,{});assert.equal(s.signalReady('left'),true);
  s.action('signal','left');assert.equal(s.signalReady('left'),false);
  s.action('signal','right');assert.equal(s.signalAge,0);
});
test('failed rules reduce score only once and never manufacture a passing result',()=>{
  assert.equal(typeof module.Simulation,'function');const s=new module.Simulation(data.getRoute(1));
  s.fail('red','闯红灯',100);s.fail('red','闯红灯',100);assert.equal(s.score,0);assert.equal(s.faults.length,1);
  assert.equal(s.finished,false);
});
test('traffic cycle distinguishes red, yellow, green and freezes with simulation time',()=>{
  assert.equal(typeof module.lightPhase,'function');
  assert.equal(module.lightPhase(0,0),'red');assert.equal(module.lightPhase(31,0),'green');assert.equal(module.lightPhase(57,0),'yellow');assert.equal(module.lightPhase(60,0),'red');
});
