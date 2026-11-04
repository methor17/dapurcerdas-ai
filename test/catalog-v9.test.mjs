import test from 'node:test';
import assert from 'node:assert/strict';
import {RECIPES,CATALOG_STATS} from '../public/data.js';

const GROUPS=['main','ground','sliced','extras'];
test('katalog 600+ resep & variasi unik',()=>{
 assert.ok(RECIPES.length>600);assert.equal(RECIPES.length,768);
 assert.equal(new Set(RECIPES.map(r=>r.id)).size,768);
 assert.equal(new Set(RECIPES.map(r=>r.title)).size,768);
 assert.deepEqual(CATALOG_STATS,{original:128,variations:640,total:768});
});
test('setiap resep memiliki bahan lengkap dan langkah berurutan',()=>{
 for(const r of RECIPES){
  assert.ok(r.title?.trim(),r.id);assert.ok(r.minutes>0,r.title);
  assert.ok(r.servings>0,r.title);
  assert.ok(r.ingredients&&GROUPS.every(g=>Array.isArray(r.ingredients[g])),r.title);
  assert.ok(r.ingredients.main.length>0,r.title);
  assert.ok(r.ingredients.ground.length>0,r.title);
  assert.ok(r.steps.length>=4,`${r.title} langkah kurang`);
  assert.ok(r.steps.every(s=>s.trim().length>=24),`Langkah tidak memadai: ${r.title}`);
  for(const g of GROUPS)for(const i of r.ingredients[g]){
   assert.ok(i.name?.trim(),r.title);assert.ok(i.quantity?.trim(),r.title);
  }
 }
});
test('variasi menambahkan proses memasak dan bahan atau takaran baru',()=>{
 const map=new Map(RECIPES.map(r=>[r.id,r]));
 for(const variant of RECIPES.filter(r=>r.parentId)){
  const base=map.get(variant.parentId);assert.ok(base,variant.title);
  assert.ok(variant.steps.length===base.steps.length+1,variant.title);
  assert.notDeepEqual(variant.ingredients,base.ingredients,variant.title);
  assert.match(variant.note,/Variasi kreatif/);
 }
});
test('hidangan daerah dapat dicari dari metadata wilayah',()=>{
 for(const area of ['Bali','Aceh','Papua','Sulawesi Utara','Jawa Timur','Sumatera Barat']){
  assert.ok(RECIPES.some(r=>r.region===area),area);
 }
});
test('contoh resep Nusantara lengkap',()=>{
 for(const key of ['Rendang Daging Padang','Pempek Lenjer Palembang','Ayam Betutu Bali','Pecel Madiun','Gulai Nangka Padang']){
  const r=RECIPES.find(r=>r.title===key);assert.ok(r, key);assert.ok(r.steps.length>=4);assert.ok(r.ingredients.ground.length>0);
 }
});
