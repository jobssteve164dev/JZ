import test from 'node:test';
import assert from 'node:assert/strict';
const m=await import('../src/lights.js').catch(()=>({}));
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
