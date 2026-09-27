import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const files=['/','/manifest.webmanifest','/favicon.svg','/icon-192.png','/icon-512.png','/icon-180.png',...(await readdir('dist/assets')).map(f=>'/assets/'+f)];
const version=createHash('sha256').update(await readFile('dist/index.html')).digest('hex').slice(0,16);
// These cached responses are public static assets; Origin Vary must not break offline module loads.
await writeFile('dist/sw.js',`const CACHE=${JSON.stringify('km3-static-'+version)};const ASSETS=${JSON.stringify(files)};
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('km3-static-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;event.respondWith(caches.open(CACHE).then(async cache=>{if(event.request.mode==='navigate'){try{const response=await fetch(event.request);if(response.ok)return response;}catch{}return (await cache.match('/'))||Response.error();}return (await cache.match(event.request,{ignoreVary:true}))||fetch(event.request);}));});
`);
console.log('Offline cache:',files.length,'assets');
