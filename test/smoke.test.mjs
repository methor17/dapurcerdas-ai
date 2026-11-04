import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=34000+Math.floor(Math.random()*2000);
const url=`http://127.0.0.1:${port}`;
let child;
async function ready(){for(let i=0;i<40;i++){try{const r=await fetch(`${url}/api/health`);if(r.ok)return}catch{}await delay(100)}throw new Error('Server tidak hidup')}

test('server & UI smoke test tanpa API key',async t=>{
 child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,AI_PROVIDER:'catalog',OPENAI_API_KEY:'',PORT:String(port)}});
 t.after(()=>{child.kill('SIGTERM')});
 await ready();
 await t.test('Health API mode lokal',async()=>{const r=await fetch(`${url}/api/health`);const data=await r.json();assert.equal(data.ok,true);assert.equal(data.aiEnabled,false)});
 await t.test('HTML, JS, CSS dapat diakses',async()=>{for(const path of ['/','/app.js','/data.js','/style.css']){const r=await fetch(url+path);assert.equal(r.status,200,`${path} harus HTTP 200`);assert.ok((await r.text()).length>500)}});
 await t.test('AI endpoint tanpa key memberi pesan',async()=>{const r=await fetch(`${url}/api/generate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'recipe',query:'ayam kecap'})});assert.equal(r.status,503);const data=await r.json();assert.match(data.error,/catalog/)});
 await t.test('Request invalid dan file yang tidak ada ditangani',async()=>{const a=await fetch(`${url}/tidak-ada.html`);assert.equal(a.status,404);const b=await fetch(`${url}/api/health`,{method:'POST'});assert.equal(b.status,405)});
});
