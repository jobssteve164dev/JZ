import {readdir,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

const origin=new URL(process.argv[2]??'https://km3.szlk.uk/');
const dist=resolve('dist');
const entry=await readFile(resolve(dist,'index.html'),'utf8');
// Cloudflare can inject this script when serving HTML through its challenge platform.
const cloudflareScript=/<script>window\.__CF\$cv\$params=[^<]*\/cdn-cgi\/challenge-platform\/scripts\/precursor\/main\.js\?ray=[^<]*<\/script>/;

const files=(await readdir(dist,{recursive:true,withFileTypes:true})).filter(file=>file.isFile()&&!['_headers','index.html'].includes(file.name));
const assets=await Promise.all(files.map(async file=>{
 const path=resolve(file.parentPath,file.name);
 return {url:path.slice(dist.length+1),content:await readFile(path)};
}));

async function fetchAsset(path){
 const response=await fetch(new URL(path,origin),{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw new Error(`${path||'/'} returned HTTP ${response.status}`);
 return Buffer.from(await response.arrayBuffer());
}

for(let attempt=1;attempt<=6;attempt++){
 try{
  const html=(await fetchAsset('')).toString('utf8');
  if(html.replace(cloudflareScript,'')!==entry)throw new Error('The home page differs from the verified build');
  await Promise.all(assets.map(async({url,content})=>{
   if(!content.equals(await fetchAsset(url)))throw new Error(`${url} differs from the verified build`);
  }));
  console.log(`Verified the home page and ${assets.length} assets at ${origin.origin}`);
  break;
 }catch(error){
  if(attempt===6)throw error;
  await delay(4000);
 }
}
