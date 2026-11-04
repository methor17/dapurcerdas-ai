import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {setTimeout as pause} from 'node:timers/promises';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function listen(s){return new Promise(resolve=>s.listen(0,'127.0.0.1',()=>resolve(s.address().port)))}
async function ready(url){for(let i=0;i<65;i++){try{const r=await fetch(url+'/api/health');if(r.ok)return}catch{}await pause(100)}throw Error('Node server not ready')}

test('stream chat memberi token bertahap, plan-refine satu request dan semua endpoint bisa dipanggil',async(t)=>{
 let chatCalls=0,planCalls=0;
 const fake=http.createServer(async(req,res)=>{
  if(req.url==='/api/tags'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({models:[{name:'qwen3.5:4b'}]}));return}
  if(req.url==='/api/chat'){
   let body='';for await(const part of req)body+=part;
   const parsed=JSON.parse(body);
   if(parsed.stream){chatCalls++;res.writeHead(200,{'Content-Type':'application/x-ndjson'});res.write(JSON.stringify({message:{content:'Bahan utama: ayam. '}})+'\n');
    await pause(80);res.write(JSON.stringify({message:{content:'1. Rebus ayam. 2. Tumis bumbu.'}})+'\n');res.end(JSON.stringify({done:true,message:{content:''}})+'\n');return}
   if(typeof parsed.messages?.[0]?.content==='string' && parsed.messages[0].content.includes('Atur URUTAN')){
    planCalls++;const names=JSON.parse(parsed.messages[0].content.match(/Daftar nomor menu: (\[.*\])$/)?.[1]||'[]');
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify({message:{content:JSON.stringify({order:names.map((_,i)=>i)})}}));return
   }
   res.setHeader('Content-Type','application/json');res.end(JSON.stringify({message:{content:'{"recipes":[]}'}}));return
  }
  res.writeHead(404);res.end();
 });
 const portFake=await listen(fake);t.after(()=>new Promise(resolve=>fake.close(resolve)));
 const port=42000+Math.floor(Math.random()*12000);
 const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),AI_PROVIDER:'ollama',OLLAMA_URL:`http://127.0.0.1:${portFake}`,OLLAMA_MODEL:'qwen3.5:4b',GOOGLE_CSE_ID:'b0f250f042fc442b3'}});
 t.after(()=>child.kill('SIGTERM'));
 const url='http://127.0.0.1:'+port;await ready(url);
 const c=await fetch(url+'/api/chat-stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'Cara memasak soto ayam?',servings:3})});
 assert.equal(c.status,200);assert.match(c.headers.get('Content-Type'),/ndjson/);
 const txt=await c.text();const events=txt.trim().split('\n').map(JSON.parse);
 assert.equal(events.filter(e=>e.type==='delta').length,2);
 assert.ok(events.some(e=>e.type==='done'));
 assert.match(events.filter(e=>e.type==='delta').map(e=>e.text).join(''),/Rebus ayam/);
 const titles=['Soto ayam','Tumis kangkung','Ayam kecap'];
 const r=await fetch(url+'/api/plan-refine',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({titles,preference:'semua'})});
 assert.equal(r.status,200);assert.deepEqual((await r.json()).indices,[0,1,2]);
 assert.equal(chatCalls,1);assert.equal(planCalls,1);
 const health=await (await fetch(url+'/api/health')).json();assert.equal(health.chatStreamEnabled,true);assert.equal(health.weekRefineEnabled,true);
});
