import test from 'node:test';
import assert from 'node:assert/strict';
import {approachSpeech} from '../src/project-voice.js';
import {getRoute} from '../src/routes.js';

test('autonomous lane changes on every route keep silent while ordinary projects retain approach speech',()=>{
 for(const id of [1,9,10]){
  const events=getRoute(id).events;
  for(const event of events.filter(event=>event.kind==='change'))assert.equal(approachSpeech(event),null,`${event.id} must stay silent`);
  const turn=events.find(event=>['left','right'].includes(event.kind));
  assert.equal(approachSpeech(turn),`前方${turn.label}`);
 }
});

test('projects with dedicated or intentionally silent prompts do not get a generic approach announcement',()=>{
 for(const kind of ['start','meet','overtake'])assert.equal(approachSpeech({kind,label:'不应播报',silent:false}),null);
 assert.equal(approachSpeech({kind:'school',label:'学校区域',silent:true}),null);
});
