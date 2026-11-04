import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {setTimeout as pause} from 'node:timers/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const recipe={title:'Ayam Kecap',emoji:'🍗',category:'Ayam',minutes:35,servings:3,
 ingredients:{main:[{name:'ayam',quantity:'500 g'}],ground:[{name:'bawang putih',quantity:'3 siung'}],sliced:[{name:'bawang bombai',quantity:'1 buah'}],extras:[{name:'kecap manis',quantity:'3 sdm'}]},
 steps:['Cuci dan siapkan ayam sesuai standar higiene.','Haluskan bawang putih.','Tumis bumbu dan bawang hingga harum.','Masukkan ayam, air dan kecap, masak sampai matang.'],tags:['praktis'],note:'Pastikan ayam matang.'};
function listen(server){return new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server.address().port)))}
async function isUp(port){for(let i=0;i<50;i++){try{const r=await fetch(`http://127.0.0.1:${port}/api/health`);if(r.ok)return}catch{}await pause(100)}throw Error('Backend gagal mulai')}
test('Integrasi lokal Ollama: health, generate schema, chat',async(t)=>{
 const requests=[];
 const fake=http.createServer(async(req,res)=>{
  if(req.url==='/api/tags'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({models:[{name:'qwen3.5:9b'}]}));return}
  if(req.url==='/api/chat'){
   let raw='';for await(const chunk of req)raw+=chunk;const msg=JSON.parse(raw);requests.push(msg);
   res.setHeader('Content-Type','application/json');
   res.end(JSON.stringify({message:{role:'assistant',content:msg.format?JSON.stringify({recipes:[recipe]}):'Bumbu halus: bawang putih. Langkah pertama siapkan ayam.'}}));return
  }
  res.writeHead(404);res.end();
 });
 const mockPort=await listen(fake);t.after(()=>fake.close());
 const port=47000+Math.floor(Math.random()*6000);
 const child=spawn(process.execPath,['server.mjs'],{cwd:dir,env:{...process.env,PORT:String(port),AI_PROVIDER:'ollama',OLLAMA_MODEL:'qwen3.5:9b',OLLAMA_URL:`http://127.0.0.1:${mockPort}`,OPENAI_API_KEY:''}});
 t.after(()=>child.kill('SIGTERM'));
 await isUp(port);
 const base=`http://127.0.0.1:${port}`;
 const health=await (await fetch(base+'/api/health')).json();
 assert.equal(health.aiEnabled,true);assert.equal(health.googleCseId,'b0f250f042fc442b3');assert.equal(health.mode,'ollama');
 const result=await fetch(base+'/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'recipe',query:'ayam kecap',pantry:[{name:'ayam',qty:2,unit:'kg'}]})});
 assert.equal(result.status,200);const gen=await result.json();assert.equal(gen.source,'ollama');assert.equal(gen.recipes[0].title,'Ayam Kecap');
 const chat=await fetch(base+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'Cara memasak ayam?',pantry:[{name:'ayam',qty:2,unit:'kg'}]})});
 assert.equal(chat.status,200);const answer=await chat.json();assert.equal(answer.provider,'ollama');assert.match(answer.reply,/Bumbu halus/);
 assert.equal(requests.length,2);assert.equal(requests[0].stream,false);assert.ok(requests[0].format.properties.recipes);
});
