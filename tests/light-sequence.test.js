import test from 'node:test';
import assert from 'node:assert/strict';
import {LightingExam,LightStalk} from '../src/lights.js';

for(const mode of ['practice','exam','learn'])test(`${mode}: open headlamps, five unique scenarios, then switch everything off`,()=>{
 const exam=new LightingExam(mode),stalk=new LightStalk(exam);
 assert.equal(exam.current,0,'opening must precede random scenarios');
 assert.equal(exam.check(),false);stalk.rotate(2);assert.equal(exam.submit(),true);
 const seen=[];
 for(let i=0;i<5;i++){seen.push(exam.current);assert.ok(exam.current>=1&&exam.current<=17);exam.submit();}
 assert.equal(new Set(seen).size,5);assert.equal(exam.current,18);assert.equal(exam.done,false);
 stalk.rotate(1);stalk.hazard();assert.equal(exam.check(),false);
 stalk.rotate(0);assert.equal(exam.check(),false,'hazards need their own switch');
 stalk.hazard();assert.equal(exam.submit(),true);assert.equal(exam.done,true);
});
test('standalone still covers all 19 prompts, with opening and closing at the boundaries',()=>{
 const e=new LightingExam('practice',{standalone:true});assert.equal(e.current,0);assert.equal(e.order.length,19);assert.equal(new Set(e.order).size,19);
 for(let i=0;i<18;i++)e.submit();assert.equal(e.current,18);assert.equal(e.done,false);
});
