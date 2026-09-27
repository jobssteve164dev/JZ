import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';
test('installed app launches at root in landscape fullscreen with phone icons',()=>{
 assert.ok(existsSync('public/manifest.webmanifest'),'missing install manifest');const m=JSON.parse(readFileSync('public/manifest.webmanifest','utf8'));
 assert.equal(m.start_url,'/');assert.equal(m.scope,'/');assert.equal(m.orientation,'landscape');assert.equal(m.display,'fullscreen');
 for(const size of ['192x192','512x512']){const icon=m.icons.find(i=>i.sizes===size);assert.ok(icon);assert.ok(existsSync('public'+icon.src));}
});
