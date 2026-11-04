import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const cwd=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const listen=s=>new Promise(resolve=>s.listen(0,'127.0.0.1',()=>resolve(s.address().port)));
const wait=async(base)=>{for(let i=0;i<70;i++){try{const r=await fetch(base+'/api/health');if(r.ok)return;}catch{}await sleep(100)}throw Error('server failed')};
test('timeout recovery contract: length => resumable, second request resumes last step',async(t)=>{
 const history=[];
 const fake=http.createServer(async(req,res)=>{
  if(req.url==='/api/tags'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({models:[{name:'qwen3.5:4b'}]}));return}
  if(req.url!=='/api/chat'){res.writeHead(404).end();return}
  let raw='';for await(const chunk of req)raw+=chunk;
  const q=JSON.parse(raw);history.push(q);res.writeHead(200,{'Content-Type':'application/x-ndjson'});
  if(history.length===1){res.write(JSON.stringify({message:{content:'1. Rebus ayam.\\n2. **'}})+'\n');res.end(JSON.stringify({done:true,done_reason:'length',message:{content:''}})+'\n')}
  else {res.write(JSON.stringify({message:{content:'Persiapan bumbu:** haluskan bawang, tumis hingga harum.\\n3. Sajikan. SELESAI'}})+'\n');res.end(JSON.stringify({done:true,done_reason:'stop',message:{content:''}})+'\n')}
 });
 const fakePort=await listen(fake);t.after(()=>new Promise(r=>fake.close(r)));
 const port=43000+Math.floor(Math.random()*9000);
 const app=spawn(process.execPath,['server.mjs'],{cwd,env:{...process.env,PORT:String(port),AI_PROVIDER:'ollama',OLLAMA_URL:`http://127.0.0.1:${fakePort}`,OLLAMA_MODEL:'qwen3.5:4b'}});
 t.after(()=>app.kill('SIGTERM'));
 const base=`http://127.0.0.1:${port}`;await wait(base);
 const send=async(body)=>{const r=await fetch(base+'/api/chat-stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return (await r.text()).trim().split('\n').map(JSON.parse)};
 const first=await send({message:'Masak soto ayam untuk 3 orang'});
 assert.match(first.filter(x=>x.type==='delta').map(x=>x.text).join(''),/Rebus ayam/);
 assert.equal(first.find(x=>x.type==='done').complete,false);
 assert.equal(first.find(x=>x.type==='done').reason,'length');
 const second=await send({message:'Masak soto ayam untuk 3 orang',continueFrom:'1. Rebus ayam.\n2. **'});
 assert.equal(second.find(x=>x.type==='done').complete,true);
 assert.ok(history[1].messages.at(-1).content.includes('2. **'));
 assert.match(second.filter(x=>x.type==='delta').map(x=>x.text).join(''),/Sajikan/);
});
