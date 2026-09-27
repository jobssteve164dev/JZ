import test from 'node:test';
import assert from 'node:assert/strict';
const m=await import('../src/lights.js').catch(()=>({}));
test('standalone practice shuffles all prompts and road sessions draw only five unique prompts',()=>{
 const original=Math.random;try{
  Math.random=()=>0;
  const a=new m.LightingExam('practice',{standalone:true});
  assert.equal(new Set(a.order).size,19);assert.notDeepEqual(a.order,Array.from({length:19},(_,i)=>i));
  for(const mode of ['practice','exam','learn']){const e=new m.LightingExam(mode);assert.equal(e.order.slice(1,-1).length,5);assert.equal(new Set(e.order.slice(1,-1)).size,5);}
  const first=new m.LightingExam('exam').order;Math.random=()=>.999;
  assert.notDeepEqual(new m.LightingExam('exam').order,first);
 }finally{Math.random=original;}
});
test('stalk rotary, latched high beam and spring-return flash operate the actual lamps',()=>{
 assert.equal(typeof m.LightStalk,'function','missing physical stalk');
 const exam=new m.LightingExam(),stalk=new m.LightStalk(exam);
 stalk.rotate(2);assert.equal(exam.beam,'low');stalk.push();assert.equal(exam.beam,'high');stalk.push();assert.equal(exam.beam,'low');
 exam.startQuestion(10);stalk.pull();assert.equal(exam.beam,'high');stalk.release();assert.equal(exam.beam,'low');assert.equal(exam.check(),false);
 stalk.pull();stalk.release();assert.equal(exam.check(),true);
 exam.startQuestion(16);stalk.rotate(1);assert.equal(exam.check(),false);stalk.hazard();assert.equal(exam.check(),true);
 stalk.rotate(0);assert.equal(exam.beam,'off');assert.equal(exam.hazard,true,'rotary must not switch hazard off');
 stalk.hazard();exam.startQuestion(18);assert.equal(exam.check(),true);
});
test('all 19 source-image lighting prompts retain their required operations',()=>{
 assert.equal(typeof m.LightingExam,'function','missing pre-drive lighting exam');
 assert.equal(m.questions.length,19);
 assert.equal(m.questions.find(q=>q.text==='夜间直行通过路口').answer,'low');
 assert.equal(m.questions.find(q=>q.text==='夜间通过没有交通信号灯控制的路口').answer,'flash');
 assert.equal(m.questions.find(q=>q.text==='路边临时停车').answer,'hazard-marker');
 assert.equal(m.questions.at(-1).answer,'off');
});
test('lighting requires actual controls; marker alone fails hazard requirement',()=>{
 assert.equal(typeof m.LightingExam,'function');
 const e=new m.LightingExam('practice');
 e.startQuestion(16);e.control('marker');assert.equal(e.check(),false);
 e.control('hazard');assert.equal(e.check(),true);
 e.startQuestion(18);e.control('off');assert.equal(e.check(),true);
});
test('flash requires two alternating beams and resets between questions',()=>{
 assert.equal(typeof m.LightingExam,'function');const e=new m.LightingExam('practice');
 e.startQuestion(10);e.control('high');assert.equal(e.check(),false);
 e.control('low');e.control('high');e.control('low');assert.equal(e.check(),true);
 e.startQuestion(11);assert.equal(e.check(),false);
});
