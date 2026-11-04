import {createGenerationJob, commitGeneratedSlot, generationProgress, nextGenerationSlot} from './generation-core.js';
import {RECIPES, CATEGORIES, CATALOG_STATS} from './data.js';
import {UNITS, normalizeUnit, parsePantryText, parseRecipeQuantity, standard, quantityLabel} from './units.js';
import {resolveSelectedRecipes} from './shopping-core.js';

const STORE_KEY = 'dapurcerdas_v2'; // v3 kompatibel dengan data v2
const DAY_NAMES = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const DEFAULT_PANTRY = parsePantryText('10 kg daging sapi, 2 kg ayam, 10 butir telur, 2 papan tempe, 5 buah wortel, 1 kg kentang, 3 ons bawang merah, 2 ons bawang putih, 250 gram cabai merah, 5 buah tomat, 1 botol kecap manis, 1 kg garam, 1 liter minyak goreng');
const STAPLES = ['air'];
const STOPWORDS = new Set(['yang','mau','ingin','masak','masakan','menu','resep','olahan','dari','dengan','untuk','simple','enak','dan','di','hari','buat','bikin','ide','makan','malam','siang','pagi','sederhana','rumahan','apa','bahan','coba','jadi']);
const GROUP_LABELS = {main:'🥘 Bahan Utama',ground:'🌶️ Bumbu Halus',sliced:'🧄 Bumbu Iris / Kasar',extras:'🧂 Bahan Pelengkap'};
const $ = id => document.getElementById(id);
const h = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize = value => String(value||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const recipeIndex = new Map(RECIPES.map(r=>[r.id,r]));
let toastTimer;
let aiEnabled = false;
let googleReady = false;
let providerMode = 'catalog';
let aiModel = '';
let aiTimeoutMs = 95000;
let chatBusy = false;
let page='beranda';
let inspoPageSize=24;
let cookPageSize=24;
const ALL_REGIONS = ['Semua wilayah',...new Set(RECIPES.map(r=>r.region).filter(Boolean))].sort((a,b)=>a==='Semua wilayah'?-1:b==='Semua wilayah'?1:a.localeCompare(b,'id'));
let selectedRegion='Semua wilayah';
let selectedRecipeType='semua';
let saved;
try{saved=JSON.parse(localStorage.getItem(STORE_KEY)||'{}');}catch{saved={};}
const state = {
 pantry:Array.isArray(saved.pantry)?saved.pantry.map((x,i)=>typeof x==='string'?{...parsePantryText(x)[0],id:`legacy-${i}`}:{...x,id:x.id||`legacy-${i}`}).filter(x=>x.name):DEFAULT_PANTRY.map((x,i)=>({...x,id:`demo-${i}`})),
 plan:Array.isArray(saved.plan)?saved.plan:[],
 favorites:Array.isArray(saved.favorites)?saved.favorites:[],
 selectedShoppingRecipes:Array.isArray(saved.selectedShoppingRecipes)?saved.selectedShoppingRecipes:[],
 selectedPlanSlots:Array.isArray(saved.selectedPlanSlots)?saved.selectedPlanSlots.filter(x=>Number.isInteger(x?.day)&&Number.isInteger(x?.slot)&&typeof x?.id==='string'):[],
 chatHistory:Array.isArray(saved.chatHistory)?saved.chatHistory.slice(-30):[],
 googleResults:[], lastChatPrompt:'',
 purchased:Array.isArray(saved.purchased)?saved.purchased:[],
 custom:Array.isArray(saved.custom)?saved.custom:[],
 shoppingManual:Array.isArray(saved.shoppingManual)?saved.shoppingManual:[],
 shoppingOverrides:saved.shoppingOverrides&&typeof saved.shoppingOverrides==='object'?saved.shoppingOverrides:{},
 shoppingHidden:Array.isArray(saved.shoppingHidden)?saved.shoppingHidden:[],
 meals:Math.min(3,Math.max(1,Number(saved.meals)||2)),
 servings:Math.min(6,Math.max(1,Number(saved.servings)||3)),
 preference:saved.preference||'semua',
 note:saved.note||'',
 category:'Semua',
 time:'all',
 cookQuery:'', inspoQuery:'', shuffle:0,
 searchResults:null,
 inspirationResults:Array.isArray(saved.aiInspirationIds)?saved.aiInspirationIds.map(id=>recipeIndex.get(id)).filter(Boolean):null,
 aiJob:saved.aiJob&&['week','inspiration'].includes(saved.aiJob.kind)?{...saved.aiJob,status:'paused'}:null,
 aiInspirationIds:Array.isArray(saved.aiInspirationIds)?saved.aiInspirationIds:[]
};
state.custom.forEach(r=>recipeIndex.set(r.id,r));
state.inspirationResults=state.aiInspirationIds.length?state.aiInspirationIds.map(id=>recipeIndex.get(id)).filter(Boolean):null;
const relevanceCache=new Map();
function persist(){relevanceCache.clear();try{localStorage.setItem(STORE_KEY,JSON.stringify({pantry:state.pantry,plan:state.plan,favorites:state.favorites,selectedShoppingRecipes:state.selectedShoppingRecipes,selectedPlanSlots:state.selectedPlanSlots,chatHistory:state.chatHistory.slice(-30),purchased:state.purchased,custom:state.custom,shoppingManual:state.shoppingManual,shoppingOverrides:state.shoppingOverrides,shoppingHidden:state.shoppingHidden,meals:state.meals,servings:state.servings,preference:state.preference,note:state.note,aiJob:state.aiJob,aiInspirationIds:state.aiInspirationIds}));}catch(e){console.warn('Gagal simpan data lokal',e)}}
function notify(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3300)}
function identity(raw){let value=normalize(typeof raw==='object'?raw.name:raw);
 const map={'daging':'daging sapi','daging sapi segar':'daging sapi','daging ayam':'ayam','ayam potong':'ayam','ayam fillet':'ayam','dada ayam':'ayam','paha ayam':'ayam','cabe':'cabai','cabe merah':'cabai merah','cabe rawit':'cabai rawit','bawang bombay':'bawang bombai','bawang putih kupas':'bawang putih','bawang merah kupas':'bawang merah','minyak':'minyak goreng','minyak sayur':'minyak goreng','mie':'mie telur','tahu putih':'tahu','tahu sutra':'tahu','ikan tuna':'ikan tongkol','kentang segar':'kentang','telur ayam':'telur'};
 return map[value]||value;
}
function sameIngredient(a,b){const A=identity(a),B=identity(b);if(!A||!B)return false;if(A===B)return true;
 if(['cabai','ikan','santan','gula','tepung'].includes(A)&&B.startsWith(A+' '))return true;
 if(['cabai','ikan','santan','gula','tepung'].includes(B)&&A.startsWith(B+' '))return true;
 return false;
}
function findStock(name){return state.pantry.filter(item=>sameIngredient(item.name,name));}
function hasIngredient(name){return findStock(name).length>0;}
function measuredStock(name,dimension){return findStock(name).reduce((sum,item)=>{const value=standard(item.qty,item.unit);return value?.dimension===dimension?sum+value.amount:sum},0);}
function addPantryBatch(items){let count=0;for(const input of items){if(!input||!input.name?.trim())continue;const name=input.name.trim().slice(0,80),qty=Number(input.qty),unit=normalizeUnit(input.unit);if(!Number.isFinite(qty)||qty<=0||qty>1000000||!UNITS.some(([u])=>normalizeUnit(u)===unit))continue;
 const old=state.pantry.find(x=>sameIngredient(x.name,name)&&normalizeUnit(x.unit)===unit);
 if(old)old.qty=Math.round((Number(old.qty)+qty)*1000)/1000;
 else state.pantry.push({id:`p-${Date.now()}-${Math.random().toString(36).slice(2,9)}`,name,qty,unit});count++;
 }if(count){persist();renderAll()}return count;
}
function needForIngredient(ing,r){const parsed=parseRecipeQuantity(scaledQuantity(ing.quantity,r));return parsed?standard(parsed.qty,parsed.unit):null;}
function stockStatus(ing,r){const stock=findStock(ing.name);if(!stock.length)return 'absent';const req=needForIngredient(ing,r);if(!req)return 'unknown';const own=measuredStock(ing.name,req.dimension);if(own<=0)return 'unknown';return own+0.00001>=req.amount?'enough':'short';}
function ingredientsOf(r){return ['main','ground','sliced','extras'].flatMap(group=>(r.ingredients?.[group]||[]).map(item=>({...item,group})));}
function scaledQuantity(quantity,r){
 const base=Number(r.servings)||3, factor=state.servings/base, text=String(quantity||'secukupnya');
 if(factor===1)return text;
 const match=text.match(/^(\d+(?:[.,]\d+)?|½|¼|¾)\s*(.*)$/);
 if(!match)return text;
 const fractions={'½':0.5,'¼':0.25,'¾':0.75};
 let num=(fractions[match[1]]??Number(match[1].replace(',','.')))*factor;
 if(!Number.isFinite(num))return text;
 const unit=match[2];
 const discrete=/^(buah|butir|siung|batang|lembar|ekor|papan|bungkus|ikat|potong|genggam)/i.test(unit);
 if(discrete)num=Math.max(1,Math.ceil(num));
 else if(/^(g|gr|gram|ml)\b/i.test(unit))num=Math.round(num);
 else num=Math.round(num*10)/10;
 return `${String(num).replace('.',',')} ${unit}`.trim();
}
function relevance(r){const cached=relevanceCache.get(r);if(cached!==undefined)return cached;const list=ingredientsOf(r).filter(x=>!STAPLES.includes(identity(x.name)));if(!list.length)return 0;let score=0,total=0;for(const ing of list){const w=ing.group==='main'?3:ing.group==='extras'?.45:1;const status=stockStatus(ing,r);total+=w;score+=w*({enough:1,short:.45,unknown:.6,absent:0}[status]||0);}const result=Math.round(score/total*100);relevanceCache.set(r,result);return result}
function missing(r){return ingredientsOf(r).filter(x=>stockStatus(x,r)!=='enough'&&!STAPLES.includes(identity(x.name)));}
function catalog(){return [...RECIPES,...state.custom]}
function filterPreference(r,pref=state.preference){if(pref==='vegetarian')return !['Ayam','Daging','Ikan & Seafood'].includes(r.category) && !ingredientsOf(r).some(i=>/\bbakso\b|\bterasi\b/.test(normalize(i.name)));
 if(pref==='tanpa-pedas')return !ingredientsOf(r).some(i=>/\bcabai\b|\bsambal\b/.test(normalize(i.name)));
 if(pref==='praktis')return r.minutes<=30;
 return true}
function matchQuery(r,query){const q=normalize(query);if(!q)return 1;const without=q.match(/tanpa\s+(\w+(?:\s\w+)?)/);if(without && ingredientsOf(r).some(i=>normalize(i.name).includes(without[1])))return 0;
 const words=q.replace(/tanpa\s+\w+(?:\s\w+)?/g,'').split(' ').filter(w=>w&&!STOPWORDS.has(w));if(!words.length)return 1;
 const title=normalize(r.title),category=normalize(r.category),tags=normalize((r.tags||[]).join(' ')),ing=normalize(ingredientsOf(r).map(i=>i.name).join(' '));let score=0;
 for(const word of words){if(title.includes(word))score+=10;else if(category.includes(word))score+=8;else if(tags.includes(word))score+=7;else if(ing.includes(word))score+=3;else score-=2;}
 return Math.max(0,score);
}
function sortForPantry(list,seed=0){return [...list].sort((a,b)=>{const A=relevance(a),B=relevance(b);return (B-A)||((simpleHash(a.id+'-'+seed)%23)-(simpleHash(b.id+'-'+seed)%23));});}
function simpleHash(str){let num=0;for(const c of str)num=((num<<5)-num+c.charCodeAt(0))|0;return Math.abs(num)}
function dateAt(n){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+n);return d}
function formattedDate(d){return new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short'}).format(d)}
function recipeCard(r,idx=0){const percentage=relevance(r),need=missing(r).length,fav=state.favorites.includes(r.id),selected=state.selectedShoppingRecipes.includes(r.id);
 return `<article class="recipe-card"><div class="recipe-visual tone-${(simpleHash(r.id)+idx)%6}"><span class="recipe-match">✓ ${percentage}% kecocokan stok</span><span class="visual-emoji" aria-hidden="true">${h(r.emoji||'🍛')}</span><button class="recipe-fav ${fav?'is-fav':''}" type="button" data-favorite="${h(r.id)}" title="${fav?'Hapus favorit':'Simpan favorit'}">${fav?'♥':'♡'}</button></div><div class="recipe-body"><span class="recipe-category">${h(r.category)}</span><h3>${h(r.title)}</h3><div class="recipe-meta"><span>◷ ${Number(r.minutes)||30} menit</span><span>♙ ${state.servings} porsi</span></div><div class="recipe-extra">${need===0?'✅ Bahan utama siap / cek stok':`🛒 ${need} bahan perlu dicek`}</div><div class="recipe-card-footer"><small>🌶️ ${r.ingredients?.ground?.length||0} bumbu halus</small><button class="recipe-open" type="button" data-view="${h(r.id)}">Lihat →</button><button class="recipe-shop ${selected?'is-selected':''}" type="button" data-find-ingredients="${h(r.id)}">${selected?'✓ Bahan Dicari':'🛒 Cari Bahan'}</button></div></div></article>`;}
function empty(title,desc,actionLabel,actionPage){return `<div class="empty-state"><div class="empty-emoji">🍽️</div><h3>${h(title)}</h3><p>${h(desc)}</p>${actionLabel?`<button class="btn btn-primary" data-page="${h(actionPage)}">${h(actionLabel)} →</button>`:''}</div>`}
function getPlanRecipes(){return state.plan.flatMap(day=>(day||[]).map(id=>recipeIndex.get(id)).filter(Boolean))}
function getShopping(){
 const all=new Map();
 // HANYA resep/slot yang dipilih eksplisit lewat Cari Bahan. Jadwal, hasil pencarian dan favorit adalah inspirasi saja.
  const chosen=resolveSelectedRecipes({recipeIndex,plan:state.plan,selectedShoppingRecipes:state.selectedShoppingRecipes,selectedPlanSlots:state.selectedPlanSlots});
  for(const r of chosen)for(const ing of ingredientsOf(r)){
  const key=identity(ing.name);if(!key||STAPLES.includes(key))continue;
  const parsed=parseRecipeQuantity(scaledQuantity(ing.quantity,r));const qty=parsed?standard(parsed.qty,parsed.unit):null;
  const dimension=qty?.dimension||'unknown',id=`${key}|${dimension}`;
  if(!all.has(id))all.set(id,{id,name:ing.name,key,dimension,required:0,uses:[],unknown:0,manual:false});
  const entry=all.get(id);if(qty)entry.required+=qty.amount;else entry.unknown++;
  entry.uses.push(`${scaledQuantity(ing.quantity,r)} · ${r.title}`);
 }
 for(const manual of state.shoppingManual){const qty=standard(manual.qty,manual.unit);if(!qty)continue;
  all.set(manual.id,{id:manual.id,name:manual.name,key:identity(manual.name),dimension:qty.dimension,required:qty.amount,unknown:0,uses:['Tambahan belanja manual'],manual:true});
 }
 const purchased=new Map(state.purchased.map(x=>[x.id,x]));
 return [...all.values()].filter(item=>!state.shoppingHidden.includes(item.id)).map(item=>{
  const override=state.shoppingOverrides[item.id];
  if(override){const q=standard(override.qty,override.unit);if(q){item={...item,name:override.name,dimension:q.dimension,required:q.amount,unknown:0,edited:true};}}
  const stock=findStock(item.name),available=item.dimension==='unknown'?0:measuredStock(item.name,item.dimension),shortage=Math.max(0,item.required-available);
  const uncertain=(item.dimension==='unknown'&&stock.length>0)||(item.required>0&&available===0&&stock.length>0);
  const complete=item.dimension!=='unknown'&&shortage<.00001,bought=purchased.has(item.id);
  return {...item,available,shortage,uncertain,complete,purchased:bought,requiredText:item.dimension==='unknown'?item.uses.map(x=>x.split(' · ')[0]).join(' + '):quantityLabel(item.required,item.dimension),availableText:item.dimension==='unknown'?(stock.length?'Ada, cek takaran':'Belum ada'):quantityLabel(available,item.dimension),shortageText:item.dimension==='unknown'?'cek takaran':quantityLabel(shortage,item.dimension)};
 }).filter(x=>!x.complete||x.purchased||x.manual||x.edited).sort((a,b)=>Number(a.purchased)-Number(b.purchased)||a.name.localeCompare(b.name,'id'));
}
function pendingShopping(){return getShopping().filter(x=>!x.purchased)}
function renderStats(){const pantryCount=state.pantry.length,planCount=getPlanRecipes().length,need=pendingShopping().length;
 $('statIngredients').innerHTML=`${pantryCount} <span>bahan</span>`;$('statPlanned').innerHTML=`${planCount} <span>masakan</span>`;$('statNeed').innerHTML=`${need} <span>bahan</span>`;$('statFavorite').innerHTML=`${state.favorites.length} <span>resep</span>`;
 $('navShoppingCount').textContent=need?String(need):'';$('plannerStockCount').textContent=`${pantryCount} bahan`;
}
function renderInventory(){const list=state.pantry;$('inventoryCount').textContent=`${list.length} item`;
 $('inventoryTags').innerHTML=list.length?list.map(item=>`<div class="stock-row"><div class="stock-icon">${/ayam|daging|ikan|udang|telur/.test(identity(item.name))?'🍗':'🥬'}</div><span class="stock-name">${h(item.name)}</span><span class="stock-qty">${h(String(item.qty).replace('.',','))} ${h(item.unit==='l'?'liter':item.unit)}</span><div class="row-actions"><button class="icon-action" data-edit-ingredient="${h(item.id)}" title="Edit bahan ${h(item.name)}" aria-label="Edit ${h(item.name)}">✎</button><button class="icon-action danger" data-remove-ingredient="${h(item.id)}" title="Hapus ${h(item.name)}" aria-label="Hapus ${h(item.name)}">🗑</button></div></div>`).join(''):'<div class="inventory-empty">Belum ada belanjaan. Tambahkan item di atas agar rekomendasi menyesuaikan stokmu.</div>';
 const fast=['ayam','telur','tempe','tahu','kentang','wortel','bawang merah','cabai rawit'];$('quickChips').innerHTML=fast.map(x=>`<button class="chip ${hasIngredient(x)?'active':''}" data-add-ingredient="${h(x)}" type="button">+ ${h(x)}</button>`).join('');
}
function renderHome(){renderStats();renderInventory(); const catalogEl=$('catalogTotalBanner');if(catalogEl)catalogEl.textContent=`${CATALOG_STATS.total} resep & variasi`;$('miniWeekList').innerHTML=state.plan.slice(0,5).map((ids,di)=>{const first=recipeIndex.get(ids[0]);if(!first)return '';const date=dateAt(di);return `<div class="mini-week-row"><span class="mini-day">${DAY_NAMES[date.getDay()].slice(0,3)}</span><span class="mini-food">${h(first.emoji)}</span><div class="mini-food-title"><b>${h(first.title)}</b><small>${ids.length} pilihan · ${formattedDate(date)}</small></div><button class="recipe-open mini-arrow" type="button" data-view="${h(first.id)}" aria-label="Lihat resep">→</button></div>`}).join('')||empty('Belum ada rencana','Buat menu minggu ini.','Buat menu','mingguan');
 $('homeSuggestions').innerHTML=sortForPantry(catalog()).slice(0,3).map(recipeCard).join('');}
function planCandidates(){let pool=catalog().filter(r=>filterPreference(r)); if(pool.length>230){const bases=pool.filter(r=>!r.parentId);const variants=pool.filter(r=>r.parentId).filter(r=>simpleHash(r.id)%7===0);pool=[...bases,...variants].slice(0,230);} if(!pool.length){pool=catalog();}if(state.preference==='hemat')pool=pool.filter(r=>ingredientsOf(r).length<=13);return pool.length?pool:catalog();}
function stockFit(r,consumed){let weighted=0,total=0;for(const item of ingredientsOf(r)){if(STAPLES.includes(identity(item.name)))continue;const weight=item.group==='main'?4:item.group==='extras'?.25:.8;total+=weight;const required=needForIngredient(item,r),stock=findStock(item.name);if(!stock.length)continue;
 if(!required){weighted+=weight*.4;continue;}
 const k=`${identity(item.name)}|${required.dimension}`;const amount=measuredStock(item.name,required.dimension)-(consumed.get(k)||0);
 weighted+=weight*(amount>=required.amount?1:amount>0?Math.max(0,amount/required.amount):0);
 }return total?100*weighted/total:0;}
function addConsumption(r,consumed){for(const ing of ingredientsOf(r)){const qty=needForIngredient(ing,r);if(!qty)continue;const key=`${identity(ing.name)}|${qty.dimension}`;consumed.set(key,(consumed.get(key)||0)+qty.amount);}}
function createPlan(seed=0,quiet=false){const count=state.meals,pool=planCandidates(),plan=[],used=new Map(),usedCategories=new Map(),consumed=new Map();let lastCategory='';const usedBase=new Map();for(let day=0;day<7;day++){let dayRecipes=[];for(let slot=0;slot<count;slot++){const scored=pool.filter(r=>!dayRecipes.includes(r.id)).map(r=>{
 const repeat=used.get(r.id)||0;let score=stockFit(r,consumed)*1.35-repeat*80-(usedCategories.get(r.category)||0)*15-(usedBase.get(r.parentId||r.id)||0)*115;
 if(count>=2&&slot===1)score+=r.category==='Sayur'?55:-19;
 if(count>=2&&slot===0&&r.category!=='Sayur')score+=12;
 if(count===1&&day%3===2&&r.category==='Sayur')score+=34;
 if(r.category===lastCategory)score-=12;
 if(slot===1 && dayRecipes.length){const other=recipeIndex.get(dayRecipes[0]);if(other && other.category===r.category)score-=18;}
 if(state.preference==='praktis')score+=Math.max(0,40-r.minutes);
 if(state.preference==='hemat')score+=Math.max(0,18-ingredientsOf(r).length);
 score+=(simpleHash(`${seed}|${day}|${slot}|${r.id}`)%35);return {r,score};}).sort((a,b)=>b.score-a.score);const pick=scored[0]?.r;if(!pick)break;dayRecipes.push(pick.id);addConsumption(pick,consumed);used.set(pick.id,(used.get(pick.id)||0)+1);usedBase.set(pick.parentId||pick.id,(usedBase.get(pick.parentId||pick.id)||0)+1);lastCategory=pick.category;usedCategories.set(pick.category,(usedCategories.get(pick.category)||0)+1);}plan.push(dayRecipes)}state.plan=plan;state.selectedPlanSlots=[];state.purchased=[];persist();renderAll();if(!quiet)notify('Menu 7 hari tersusun sebagai inspirasi saja. Klik Cari Bahan pada menu yang ingin dibelanjakan.')}
function generationControls(kind){
 const job=state.aiJob?.kind===kind?state.aiJob:null;const box=$(kind==='week'?'aiPlanProgress':'aiInspoProgress');if(!box)return;
 if(!job){box.hidden=true;return}
 box.hidden=false;const progress=generationProgress(job),pct=Math.round(100*progress.done/Math.max(1,progress.total));
 const isFastWeek=kind==='week'&&Boolean(job.catalogReady);
 const statusLabel={running:'Sedang membuat resep satu per satu',paused:'Dijeda — hasil tersimpan',stopped:'Dihentikan — hasil tetap tersedia',completed:'Selesai',error:'Ada kendala — hasil tersimpan'};
 box.querySelector('.ai-progress-title').textContent=isFastWeek?(job.status==='running'?'✅ Semua menu siap — AI sedang mengoptimalkan urutan':job.status==='completed'?'✅ Menu 7 hari lengkap dan siap dimasak':job.status==='paused'?'⏸ Penyempurnaan dijeda — semua menu tetap siap':job.status==='stopped'?'■ Penyempurnaan dihentikan — menu tersimpan':'Menu siap dipakai'):statusLabel[job.status]||'Menyiapkan resep';
 box.querySelector('.ai-progress-meta').textContent=isFastWeek?`${job.catalogReady}/${job.total} resep lengkap sudah bisa dibuka · ${job.status==='running'?'AI merapikan jadwal, boleh di-pause/stop':'Tidak ada menu yang hilang'}${job.lastError?' · '+job.lastError:''}`:`${progress.done}/${progress.total} resep AI selesai · ${job.total-progress.done} rekomendasi cepat${kind==='week'?' tetap tersedia':''}${job.lastError?' · '+job.lastError:''}`;
 box.querySelector('.ai-progress-bar > span').style.width=`${pct}%`;
 box.querySelector('[data-ai-pause]').hidden=job.status!=='running';
 box.querySelector('[data-ai-resume]').hidden=!['paused','stopped','error'].includes(job.status);
 box.querySelector('[data-ai-stop]').hidden=!['running','paused','error'].includes(job.status);
 box.querySelector('[data-ai-reset]').hidden=job.status==='running';
 const button=$(kind==='week'?'aiPlanBtn':'aiInspoBtn'); if(button)button.disabled=job.status==='running';
}
function renderPlanner(){const p=$('weeklyGrid');$('mealsPerDay').value=String(state.meals);$('servings').value=String(state.servings);$('mealPreference').value=state.preference;$('mealNote').value=state.note;
 $('plannerTitle').textContent='Menu untuk 7 hari ke depan';$('plannerMeta').textContent=`${getPlanRecipes().length} hidangan · ${state.servings} porsi · bisa tambah, ubah, atau hapus per menu.`;
 generationControls('week');p.innerHTML=state.plan.map((ids,day)=>{const date=dateAt(day);const d=DAY_NAMES[date.getDay()];return `<article class="day-card ${day===0?'today':''}"><div class="day-heading"><span>${day===0?'HARI INI':`HARI KE-${day+1}`}</span><b>${d}, ${formattedDate(date)}</b></div><div class="day-recipes">${ids.map((id,slot)=>{const r=recipeIndex.get(id);return r?`<div class="day-recipe"><span class="day-emoji">${h(r.emoji)}</span><b>${h(r.title)}</b><small>◷ ${r.minutes} mnt · ${relevance(r)}% cocok</small>${state.aiJob?.kind==='week'?`<span class="ai-slot-label ${state.aiJob.completed?.some(x=>x.day===day&&x.slot===slot&&x.recipeId===id)?'ai-done':''}">${state.aiJob.completed?.some(x=>x.day===day&&x.slot===slot&&x.recipeId===id)?(state.aiJob.catalogReady?'✓ Resep lengkap dari katalog':window.DAPURCERDAS_STANDALONE?'🧪 Hasil simulasi':'✦ Resep AI selesai'):'⚡ Saran cepat · bisa dimasak'}</span>`:''}<div class="day-recipe-actions"><button data-view="${h(r.id)}">Resep</button><button class="${state.selectedPlanSlots.some(x=>x.day===day&&x.slot===slot&&x.id===id)?'plan-shop-selected':''}" data-find-plan-ingredients="${day}:${slot}">${state.selectedPlanSlots.some(x=>x.day===day&&x.slot===slot&&x.id===id)?'✓ Sudah dipilih':'🛒 Cari Bahan'}</button><button data-edit-plan="${day}:${slot}" title="Ubah menu ini" aria-label="Ubah menu">✎ Edit</button><button data-delete-plan="${day}:${slot}" class="danger-text" title="Hapus menu ini" aria-label="Hapus menu">×</button></div></div>`:''}).join('')}</div><button class="plan-add-btn" type="button" data-add-plan="${day}" ${ids.length>=state.meals?'disabled title="Jumlah menu hari ini sudah maksimal"':''}>+ Tambah menu</button></article>`}).join('')||empty('Belum ada menu','Klik Susun Cepat untuk membuat jadwal mingguan.','Isi stok dulu','beranda');
}
function replaceSlot(day,slot){const current=state.plan[day]?.[slot];if(!current)return;const ids=new Set(getPlanRecipes().map(r=>r.id));const currentRecipe=recipeIndex.get(current);let pool=planCandidates().filter(r=>r.id!==current);pool.sort((a,b)=>{const aScore=relevance(a)*2-(ids.has(a.id)?40:0)-(currentRecipe?.category===a.category?8:0)+simpleHash(a.id+Date.now())%10;const bScore=relevance(b)*2-(ids.has(b.id)?40:0)-(currentRecipe?.category===b.category?8:0)+simpleHash(b.id+Date.now())%10;return bScore-aScore});if(!pool[0])return notify('Belum ada alternatif lain.');state.plan[day][slot]=pool[0].id;state.selectedPlanSlots=state.selectedPlanSlots.filter(x=>!(x.day===day&&x.slot===slot));state.purchased=[];persist();renderAll();notify(`Menu diganti menjadi ${pool[0].title}`)}
function searchCatalog(query,limit=24){const q=String(query||'').trim();const filtered=catalog().map(r=>({r,score:matchQuery(r,q)})).filter(x=>x.score>0).sort((a,b)=>(b.score-a.score)||(relevance(b.r)-relevance(a.r)));
 if(!q)return sortForPantry(catalog()).slice(0,limit);return filtered.slice(0,limit).map(x=>x.r)}
function renderCook(){const query=state.cookQuery;$('cookQuery').value=query;
 const result=state.searchResults||searchCatalog(query,RECIPES.length+state.custom.length);
 $('cookResultsTitle').textContent=query?`Hasil untuk “${query}”`:'Pilih resep favoritmu';
 $('cookResultsMeta').textContent=`${result.length} resep ditemukan dari ${CATALOG_STATS.total} resep & variasi Nusantara · bahan dan langkah lengkap.`;
 $('cookResults').innerHTML=result.length?result.slice(0,cookPageSize).map(recipeCard).join(''):empty('Resep belum ditemukan','Coba nama masakan, bahan, atau daerah. Kamu juga bisa menggunakan AI atau Google.');
 const more=$('cookMore');if(more){more.hidden=result.length<=cookPageSize;more.textContent=`Tampilkan ${Math.min(24,result.length-cookPageSize)} resep lagi · ${Math.min(result.length,cookPageSize)}/${result.length}`;}
}
function renderCategories(){$('categoryChips').innerHTML=CATEGORIES.map(c=>`<button type="button" class="chip ${state.category===c?'active':''}" data-category="${h(c)}">${h(c)}</button>`).join('');
 const el=$('regionFilter');if(el){el.innerHTML=ALL_REGIONS.map(v=>`<option value="${h(v)}">${h(v)}</option>`).join('');el.value=selectedRegion;}
 const type=$('recipeTypeFilter');if(type)type.value=selectedRecipeType;
}
function inspirationResults(){let filtered=state.inspirationResults||searchCatalog(state.inspoQuery,RECIPES.length+state.custom.length);
 filtered=filtered.filter(r=>(state.category==='Semua'||r.category===state.category)&&(state.time==='all'||r.minutes<=Number(state.time))&&(selectedRegion==='Semua wilayah'||r.region===selectedRegion)&&(selectedRecipeType==='semua'||(selectedRecipeType==='dasar'?!r.parentId:!!r.parentId)));
 return [...filtered].sort((a,b)=>(relevance(b)-relevance(a))||(simpleHash(a.id+'-'+state.shuffle)%99-simpleHash(b.id+'-'+state.shuffle)%99));
}
function renderInspiration(){generationControls('inspiration');renderCategories();$('inspoQuery').value=state.inspoQuery;$('timeFilter').value=state.time;const results=inspirationResults();
 $('inspoTitle').textContent=state.inspoQuery?`Rekomendasi: ${state.inspoQuery}`:'Koleksi Resep Nusantara';
 $('inspoMeta').textContent=`${results.length} hasil · ${CATALOG_STATS.original} resep dasar dan ${CATALOG_STATS.variations} variasi · setiap resep dapat dipakai di jadwal 7 hari & Cari Bahan.`;
 $('inspoResults').innerHTML=results.length?results.slice(0,inspoPageSize).map(recipeCard).join(''):empty('Belum ada yang cocok','Ubah kata kunci, wilayah, atau filter. Google dan AI tetap tersedia.');
 const more=$('inspoMore');if(more){more.hidden=results.length<=inspoPageSize;more.textContent=`Tampilkan ${Math.min(24,results.length-inspoPageSize)} resep lagi · ${Math.min(results.length,inspoPageSize)}/${results.length}`;}
}
function renderShopping(){const items=getShopping(),pending=items.filter(x=>!x.purchased),done=items.filter(x=>x.purchased);$('shoppingTotal').textContent=pending.length;$('shoppingDone').textContent=done.length;$('shoppingMenus').textContent=resolveSelectedRecipes({recipeIndex,plan:state.plan,selectedShoppingRecipes:state.selectedShoppingRecipes,selectedPlanSlots:state.selectedPlanSlots}).length;
 $('shoppingList').innerHTML=items.length?items.map(item=>`<div class="shopping-item ${item.purchased?'completed':''}"><button class="shopping-check" type="button" data-toggle-shopping="${h(item.id)}" title="${item.purchased?'Batalkan tanda beli':'Tandai sudah dibeli'}">${item.purchased?'✓':'+'}</button><div class="shopping-item-info"><b>${h(item.name)} ${item.manual?'<span class="badge-manual">MANUAL</span>':item.edited?'<span class="badge-manual">DIUBAH</span>':''}</b><div class="shopping-quantities"><span>Butuh: <strong>${h(item.requiredText)}</strong></span><span>Stok: <strong>${h(item.availableText)}</strong></span><span class="shopping-shortage">${item.uncertain?'⚠ Satuan perlu diperiksa':`Kurang: ${h(item.shortageText)}`}</span></div><small>${h(item.uses.slice(0,2).join(' | '))}${item.uses.length>2?` + ${item.uses.length-2} resep lain`:''}</small></div><div class="shopping-right"><span class="shopping-item-tag">${item.purchased?'SUDAH DIBELI':item.uncertain?'CEK TAKARAN':'PERLU DIBELI'}</span><div class="row-actions"><button class="icon-action" data-edit-shopping="${h(item.id)}" title="Ubah kebutuhan belanja" aria-label="Edit ${h(item.name)}">✎ Edit</button><button class="icon-action danger" data-delete-shopping="${h(item.id)}" title="Hapus dari daftar belanja" aria-label="Hapus ${h(item.name)}">🗑</button></div></div></div>`).join(''):empty('Belum ada bahan yang perlu dibeli','Klik Cari Bahan pada resep pilihan (termasuk menu 7 hari), atau tambahkan kebutuhan manual. Bahan yang sudah cukup stoknya tidak muncul sebagai kekurangan.','Lihat inspirasi','rekomendasi');
 $('shoppingHiddenCount').textContent=state.shoppingHidden.length?`${state.shoppingHidden.length} kebutuhan disembunyikan`:'';
 $('shoppingRestoreBtn').disabled=!state.shoppingHidden.length&&!Object.keys(state.shoppingOverrides).length;
}
function renderFavorites(){const result=state.favorites.map(id=>recipeIndex.get(id)).filter(Boolean);$('favoriteResults').innerHTML=result.length?result.map(recipeCard).join(''):empty('Belum ada resep favorit','Tekan ikon hati di kartu resep untuk menyimpan masakan kesukaanmu.','Cari resep','rekomendasi');}
function renderAll(){renderHome();renderPlanner();renderCook();renderInspiration();renderShopping();renderFavorites();renderMyRecipes();renderSelectedRecipes();renderChat()}
const PAGE_NAMES={'beranda':['Beranda','Ringkasan dapurmu'],'mingguan':['Rencana 7 Hari','Perencana mingguan'],'mau-masak':['Mau Masak Apa?','Pencarian masakan'],'rekomendasi':['Inspirasi Resep','Jelajahi resep'],'belanja':['Daftar Belanja','Bahan yang dibutuhkan'],'favorit':['Resep Favorit','Koleksi pribadi'],'resep-saya':['Resep Saya','Kelola resep sendiri'],'asisten':['Chat Koki GPT','Asisten memasak pribadimu']};
function navigate(p){if(!PAGE_NAMES[p])return;page=p;document.querySelectorAll('.page').forEach(el=>el.classList.toggle('active',el.id==='page-'+p));document.querySelectorAll('.nav-link').forEach(el=>el.classList.toggle('active',el.dataset.page===p));$('breadcrumb').textContent=PAGE_NAMES[p][0];$('pageSubtitle').textContent=PAGE_NAMES[p][1];$('sidebar').classList.remove('open');$('mobileShade').classList.remove('open');window.scrollTo({top:0,behavior:'instant'});history.replaceState(null,'','#'+p)}
function toggleFavorite(id){const idx=state.favorites.indexOf(id);if(idx>=0)state.favorites.splice(idx,1);else state.favorites.push(id);persist();renderAll();if(!$('recipeModal').hidden)openRecipe(id);notify(idx>=0?'Dihapus dari favorit.':'Resep disimpan di favorit; daftar belanja belum berubah. Klik Cari Bahan jika ingin memasaknya.')}
function showItem(i,r){const ing=i.name,status=stockStatus(i,r),available=status==='enough';const desc={enough:'Jumlah stok terukur mencukupi',short:'Stok tercatat tetapi kurang',unknown:'Jumlah atau satuan tidak dapat dibandingkan',absent:'Belum ada di stok'}[status];
 return `<div class="ingredient-detail"><span class="ingname" title="${h(desc)}"><span class="mark ${available?'':'missing'}">${available?'●':'○'}</span><span>${h(ing)}</span></span><span class="quantity">${h(scaledQuantity(i.quantity,r))}</span></div>`}
function openRecipe(id){const r=recipeIndex.get(id);if(!r)return;const need=missing(r),fav=state.favorites.includes(id);
 const groups=Object.entries(GROUP_LABELS).map(([key,label])=>`<div class="ingredient-group"><h4>${label}</h4>${(r.ingredients?.[key]||[]).length?(r.ingredients?.[key]||[]).map(i=>showItem(i,r)).join(''):'<small>Tidak diperlukan</small>'}</div>`).join('');
 $('modalContent').innerHTML=`<div class="modal-cover"><span class="main-emoji">${h(r.emoji||'🍛')}</span><span class="modal-cover-badge">${h(r.category)}</span></div><div class="modal-padding"><span class="eyebrow">RESEP PILIHAN DAPURCERDAS</span><h2>${h(r.title)}</h2>${r.sourceUrl?`<div class="source-line">🌐 ${r.sourceType==='google-catalog-draft'?'DRAFT dari resep katalog ('+h(r.sourceBaseTitle||'')+'); belum disamakan dengan sumber Google.':'Adaptasi AI berdasarkan inspirasi Google (bukan salinan terverifikasi).'} <a href="${h(safeExternalUrl(r.sourceUrl)||'#')}" target="_blank" rel="noopener noreferrer">Baca sumber asli ↗</a></div>`:''}${r.sourceType==='google-catalog-draft'?`<div class="google-draft-actions"><span id="googleDraftStatus">✅ Draft lengkap tersedia tanpa menunggu AI. Penyempurnaan opsional.</span><button type="button" class="btn btn-dark btn-sm" data-refine-google="${h(r.id)}">✨ Sempurnakan dengan AI (opsional)</button><button type="button" class="btn btn-outline btn-sm" data-stop-google-refine="${h(r.id)}">⏹ Stop AI</button></div>`:''}<div class="modal-subtitle"><span>◷ ${h(r.minutes)} menit</span><span>♙ ± ${state.servings} porsi</span><span>✓ ${relevance(r)}% kecocokan stok</span></div><div class="modal-callout ${need.length?'is-warning':''}"><span style="font-size:20px">${need.length?'🛒':'✅'}</span><span>${need.length?`Ada ${need.length} bahan yang belum cukup atau perlu diperiksa: ${h(need.slice(0,6).map(x=>x.name).join(', '))}${need.length>6?'…':''}.`:'Takaran bahan terukur tersedia untuk resep ini. Pastikan kondisi bahan masih baik!'}</span></div><div class="recipe-detail-columns"><div><h3 class="modal-section-title">📋 Bahan & Bumbu</h3>${groups}</div><div><h3 class="modal-section-title">👩‍🍳 Cara Memasak</h3><ol class="steps-list cooking-steps">${(r.steps||[]).map((step,i)=>`<li><label><input type="checkbox" class="cooking-step-check" aria-label="Selesai langkah ${i+1}"><span><b>Langkah ${i+1}</b><br>${h(step)}</span></label></li>`).join('')}</ol><div class="recipe-tip"><b>💡 Tips dapur:</b> ${h(r.note||'Cicipi dan sesuaikan rasa sebelum disajikan.')}</div></div></div><div class="modal-actions"><button class="btn btn-outline" data-favorite="${h(r.id)}">${fav?'♥ Hapus dari Favorit':'♡ Simpan Favorit'}</button><button class="btn btn-primary" data-find-ingredients="${h(r.id)}">🛒 ${state.selectedShoppingRecipes.includes(r.id)?'✓ Bahan sudah dicari':'Cari Bahan → Belanja'}</button><button class="btn btn-outline" data-add-to-plan="${h(r.id)}">+ Menu 7 Hari</button><button class="btn btn-dark" data-print-recipe="${h(r.id)}">↓ Simpan Resep</button><button class="btn btn-outline" data-clone-recipe="${h(r.id)}">⧉ Salin & edit</button>${state.custom.some(x=>x.id===r.id)?`<button class="btn btn-outline" data-edit-recipe="${h(r.id)}">✎ Edit resep</button><button class="btn btn-outline danger-text" data-delete-recipe="${h(r.id)}">🗑 Hapus resep</button>`:``}</div><div class="planner-hint">Tombol Cari Bahan adalah satu-satunya cara resep masuk ke belanja. Lingkaran hijau = stok tercatat mencukupi (bila takaran sejenis); lingkaran oranye = kurang atau perlu dicek. Takaran resep telah disesuaikan untuk ± ${state.servings} porsi. Sesuaikan bila memasak untuk jumlah orang berbeda.</div></div>`;
 $('recipeModal').hidden=false;document.body.style.overflow='hidden';}
function closeRecipe(){$('recipeModal').hidden=true;document.body.style.overflow=''}
function addRecipePlan(id){if(!recipeIndex.has(id))return;if(!state.plan.length)state.plan=Array.from({length:7},()=>[]);let target=state.plan.findIndex(arr=>arr.length<state.meals);if(target<0)target=0;if(!state.plan[target].includes(id)){if(state.plan[target].length>=state.meals)state.plan[target].splice(state.plan[target].length-1,1,id);else state.plan[target].push(id);}state.selectedPlanSlots=state.selectedPlanSlots.filter(x=>state.plan[x.day]?.[x.slot]===x.id);state.purchased=[];persist();renderAll();closeRecipe();notify(`Resep masuk jadwal ${DAY_NAMES[dateAt(target).getDay()]}, tetapi belum ditambahkan ke daftar belanja.`)}
function formatRecipeTxt(r){return `${r.title}\n${r.category} · ${r.minutes} menit · ${state.servings} porsi\n\n${Object.entries(GROUP_LABELS).map(([k,label])=>`${label}\n${(r.ingredients[k]||[]).map(i=>`- ${i.name}: ${scaledQuantity(i.quantity,r)}`).join('\n')}`).join('\n\n')}\n\nCARA MEMASAK\n${r.steps.map((s,i)=>`${i+1}. ${s}`).join('\n')}\n\nTips: ${r.note}\n`}
function downloadFile(file,text){const blob=new Blob([text],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=file;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)}
async function copyText(text){try{await navigator.clipboard.writeText(text);notify('Daftar belanja disalin!')}catch{const t=document.createElement('textarea');t.value=text;document.body.appendChild(t);t.select();try{document.execCommand('copy');notify('Daftar belanja disalin!')}catch{notify('Gagal menyalin, coba unduh sebagai .txt')}t.remove()}}
function shoppingText(){const items=getShopping();return `DAFTAR BELANJA DAPURCERDAS\n${new Date().toLocaleDateString('id-ID')}\n\n${items.map((x,i)=>`${i+1}. [${x.purchased?'x':' '}] ${x.name}: dibutuhkan ${x.requiredText}; stok ${x.availableText}; kekurangan ${x.shortageText}\n    ${x.uses.join('; ')}`).join('\n')}\n\nCatatan: item dengan satuan tidak sejenis perlu dicek manual.\n`}
function addIngredient(name){const n=addPantryBatch([{name,qty:1,unit:/telur/.test(name)?'butir':/ayam|daging|kentang/.test(name)?'kg':/tempe|tahu/.test(name)?'papan':'buah'}]);if(n)notify(`${name} ditambahkan ke stok (1 satuan).`)}
function toggleShopping(id){const entry=getShopping().find(x=>x.id===id);if(!entry)return;
 const old=state.purchased.find(x=>x.id===id);
 if(old){state.purchased=state.purchased.filter(x=>x.id!==id);if(old.pantryId)state.pantry=state.pantry.filter(x=>x.id!==old.pantryId);notify(`Tanda pembelian ${entry.name} dibatalkan.`)}
 else{
   const purchase={id};
   if(!entry.uncertain && entry.dimension!=='unknown'&&entry.shortage>0){
     const unit=entry.dimension==='mass'?'g':entry.dimension==='volume'?'ml':entry.dimension.replace('unit:','');
     const newEntry={id:`buy-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,name:entry.name,qty:Math.round(entry.shortage*100)/100,unit};
     state.pantry.push(newEntry);purchase.pantryId=newEntry.id;
     notify(`${entry.name} ditandai dibeli dan stok bertambah ${quantityLabel(entry.shortage,entry.dimension)}.`)
   }else notify(`${entry.name} ditandai sudah dibeli. Pastikan jumlah dan satuannya sesuai.`);
   state.purchased.push(purchase);
 }
 persist();renderAll();}
function setBusy(btn,busy,loadingText='Memproses...'){if(!btn)return;if(busy){btn.dataset.oldLabel=btn.innerHTML;btn.innerHTML=`<span class="loader"></span> ${h(loadingText)}`;btn.disabled=true}else{btn.innerHTML=btn.dataset.oldLabel||btn.innerHTML;btn.disabled=false}}
function validateAiRecipe(raw,idx=0){if(!raw||typeof raw.title!=='string'||!raw.title.trim()||!raw.ingredients||!Array.isArray(raw.steps))return null;const groups={};for(const key of Object.keys(GROUP_LABELS)){if(!Array.isArray(raw.ingredients[key]))return null;groups[key]=raw.ingredients[key].slice(0,18).filter(x=>x&&typeof x.name==='string'&&x.name.trim()).map(x=>({name:x.name.slice(0,90),quantity:String(x.quantity||'secukupnya').slice(0,60)}));}if(!raw.steps.length)return null;
 return {id:`ai-${Date.now()}-${idx}-${Math.floor(Math.random()*99999)}`,title:raw.title.slice(0,100),emoji:String(raw.emoji||'🍛').slice(0,4),category:CATEGORIES.includes(raw.category)?raw.category:'Sayur',minutes:Math.min(240,Math.max(10,Number(raw.minutes)||30)),servings:Math.min(20,Math.max(1,Number(raw.servings)||3)),ingredients:groups,steps:raw.steps.slice(0,15).map(x=>String(x).slice(0,600)),tags:Array.isArray(raw.tags)?raw.tags.map(x=>String(x).slice(0,30)):[],note:String(raw.note||'Pastikan bahan matang dan aman dikonsumsi.').slice(0,350)};
}
function rememberAiRecipes(recipes){const checked=recipes.map(validateAiRecipe).filter(Boolean);state.custom=[...checked,...state.custom].slice(0,100);for(const r of checked)recipeIndex.set(r.id,r);persist();return checked}
async function requestAI(kind,payload,signal){
 if(window.DAPURCERDAS_STANDALONE){
  // Preview only: demonstrate cancel / resume with safe catalog recipes, never claim a real AI call.
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(resolve,850);
   const abort=()=>{clearTimeout(timer);reject(new DOMException('Dibatalkan','AbortError'))};
   if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
  });
  const excluded=(payload.excludeTitles||[]).map(normalize);
  const usable=RECIPES.filter(r=>!excluded.includes(normalize('Simulasi: '+r.title)));
  const r=usable[0]||RECIPES[0];
  return rememberAiRecipes([{...structuredClone(r),title:'Simulasi: '+r.title}]);
 }
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),aiTimeoutMs+12000);
 const abort=()=>controller.abort();if(signal){if(signal.aborted)controller.abort();else signal.addEventListener('abort',abort,{once:true})}
 try{
  const response=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,pantry:state.pantry.map(x=>({name:x.name,qty:x.qty,unit:x.unit})),servings:state.servings,preference:state.preference,note:state.note,...payload}),signal:controller.signal});
  const data=await response.json();if(!response.ok)throw new Error(data.error||'Layanan AI tidak merespons');if(!Array.isArray(data.recipes))throw new Error('Format resep AI tidak sesuai');return rememberAiRecipes(data.recipes);
 }finally{clearTimeout(timer);if(signal)signal.removeEventListener('abort',abort)}
}
function aiUnavailable(){notify(providerMode==='ollama'?'Ollama belum siap. Jalankan Ollama dan unduh model ringan sesuai README.':'Aktifkan AI_PROVIDER=ollama atau isi OPENAI_API_KEY di .env.')}
let aiActiveController=null;
function saveGeneration(){persist();if(state.aiJob?.kind==='week'){renderPlanner();renderHome();renderStats()}else{renderInspiration();renderMyRecipes()}}
function toggleJob(action,kind){
 const job=state.aiJob;if(!job||job.kind!==kind)return;
 if(action==='resume'){
  if(aiActiveController)return;
  job.status='running';job.lastError='';saveGeneration();void processGeneration();return;
 }
 if(action==='pause'||action==='stop'){
  job.status=action==='pause'?'paused':'stopped';aiActiveController?.abort();saveGeneration();notify(action==='pause'?'Dijeda. Semua hasil yang sudah selesai tetap tersimpan.':'Proses dihentikan. Semua menu yang sudah muncul tetap tersedia.');return;
 }
 if(action==='reset'){
  state.aiJob=null;persist();renderAll();notify('Riwayat generate dibersihkan. Menu dan resep tidak terhapus.');
 }
}
function startGeneration(kind){
 if(!aiEnabled){aiUnavailable();return}
 if(aiActiveController){notify('Ada proses AI yang sedang berjalan. Pause atau Stop terlebih dahulu.');return}
 if(state.aiJob?.status==='running')return;
 const total=kind==='week'?7*state.meals:6;
 if(kind==='week'){
  if(state.selectedPlanSlots.length&&!confirm('Menyusun jadwal baru akan menghapus pilihan belanja berdasarkan slot menu lama. Pilihan resep lain tetap tersimpan. Lanjutkan?'))return;
  createPlan(Date.now(),true); // 7 hari rekomendasi cepat tersedia seketika (belum hasil AI)
  state.aiJob=createGenerationJob('week',state.plan);
  // v8: all 7–21 complete catalog recipes are ready now, with exact ingredients and steps.
  // AI only optimizes their order in ONE small request, never writes 21 huge recipes.
  state.aiJob.completed=state.aiJob.slots.map(slot=>({...slot,recipeId:slot.originalId,catalog:true}));
  state.aiJob.phase='refining';state.aiJob.catalogReady=state.aiJob.total;
  state.aiJob.refineStart=Date.now();
 }else{
  const query=$('inspoQuery').value.trim()||'masakan rumahan mudah sesuai bahan tersedia';
  const fallback=sortForPantry(planCandidates()).slice(0,total);
  state.aiInspirationIds=fallback.map(r=>r.id);
  state.inspirationResults=fallback;
  state.aiJob=createGenerationJob('inspiration',null,total,query);
 }
 persist();renderAll();notify(kind==='week'?`${state.aiJob.total} menu lengkap sudah siap. AI hanya merapikan urutannya; tidak perlu menunggu 21 resep.`:'Ide cepat muncul dahulu; resep AI menyusul satu per satu.');void processGeneration();
}
async function processGeneration(){
 const job=state.aiJob;if(!job||job.status!=='running'||aiActiveController)return;
 if(job.kind==='week'&&job.phase==='refining'){void processWeekRefine(job);return}
 const ctrl=new AbortController();aiActiveController=ctrl;
 try{
  while(job.status==='running'&&!ctrl.signal.aborted){
   const item=nextGenerationSlot(job);if(!item){job.status='completed';break}
   // Do not replace a recipe the user intentionally edited/selected while generation was underway.
   if(job.kind==='week'){
    const existing=state.plan[item.day]?.[item.slot];
    const selected=state.selectedPlanSlots.some(x=>x.day===item.day&&x.slot===item.slot&&x.id===existing);
    if(!existing||existing!==item.originalId||selected){commitGeneratedSlot(job,item,existing||'skipped');job.completed.at(-1).skipped=true;saveGeneration();continue}
   }
   const names=(job.kind==='week'?getPlanRecipes():state.inspirationResults||[]).map(r=>r?.title).filter(Boolean).slice(-25);
   const body={count:1,excludeTitles:names,query:job.kind==='inspiration'?job.query:''};
   let recipes;
   try{recipes=await requestAI(job.kind,body,ctrl.signal)}
   catch(e){if(ctrl.signal.aborted||job.status!=='running')break;job.status='error';job.lastError=e.name==='AbortError'?'Batas waktu per resep habis; gunakan model lebih ringan atau klik Lanjutkan.':String(e.message||e).slice(0,130);saveGeneration();notify('Generate terhenti sementara. Hasil sebelumnya aman; klik Lanjutkan.');break}
   if(ctrl.signal.aborted||job.status!=='running')break;
   const recipe=recipes[0];if(!recipe){job.status='error';job.lastError='AI tidak mengirim resep lengkap.';break}
   const oldTitles=new Set(job.completed.filter(x=>!x.skipped).map(x=>normalize(recipeIndex.get(x.recipeId)?.title)).filter(Boolean));
   if(oldTitles.has(normalize(recipe.title))){job.status='error';job.lastError='AI mengulang resep yang sudah selesai. Klik Lanjutkan untuk mencoba lagi.';saveGeneration();break}
   if(!recipe.ingredients?.main?.length||recipe.steps.length<3){job.status='error';job.lastError='Resep kurang lengkap. Klik Lanjutkan untuk mencoba lagi.';saveGeneration();break}
   if(job.kind==='week'){
    // Recheck after network request, preventing a late AI response from overwriting user edits/selection.
    const existing=state.plan[item.day]?.[item.slot];
    if(existing!==item.originalId||state.selectedPlanSlots.some(x=>x.day===item.day&&x.slot===item.slot&&x.id===existing)){
     commitGeneratedSlot(job,item,existing||'skipped');job.completed.at(-1).skipped=true;
    }else{
     state.plan[item.day][item.slot]=recipe.id;
     commitGeneratedSlot(job,item,recipe.id);
    }
   }else{
    state.aiInspirationIds[item.index]=recipe.id;
    state.inspirationResults=state.aiInspirationIds.map(id=>recipeIndex.get(id)).filter(Boolean);
    commitGeneratedSlot(job,item,recipe.id);
   }
   job.lastError='';saveGeneration();
  }
  if(job.status==='running'&&generationProgress(job).done>=job.total){job.status='completed';notify('Semua resep AI selesai! Hasil otomatis tersimpan.')}
 }finally{aiActiveController=null;saveGeneration()}
}

async function processWeekRefine(job){
 if(aiActiveController||job.status!=='running')return;
 const controller=new AbortController();aiActiveController=controller;
 const original=state.plan.flat(),titles=original.map(id=>recipeIndex.get(id)?.title||'Menu masakan');
 job.refineStart=Date.now();job.refineStage='Mengoptimalkan variasi & urutan menu menggunakan AI lokal';saveGeneration();
 const tick=setInterval(()=>{
  const el=$('aiPlanProgress');if(!el||!state.aiJob||state.aiJob!==job)return;
  const sec=Math.floor((Date.now()-job.refineStart)/1000);
  const p=el.querySelector('.ai-progress-meta');
  if(p)p.textContent=`${job.catalogReady}/${job.total} resep LENGKAP sudah tersedia · AI merapikan urutan (${sec} detik) · kamu boleh Pause / Stop.`;
 },1000);
 try{
  let indices;
  if(window.DAPURCERDAS_STANDALONE){await new Promise((resolve,reject)=>{
   const time=setTimeout(resolve,1450);controller.signal.addEventListener('abort',()=>{clearTimeout(time);reject(new DOMException('Aborted','AbortError'))},{once:true})
  });indices=original.map((_,i)=>i);}
  else{
   const timer=setTimeout(()=>controller.abort('timeout'),44000);
   try{
    const response=await fetch('/api/plan-refine',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({titles,preference:state.preference,note:state.note})});
    const data=await response.json();if(!response.ok)throw Error(data.error||'AI tidak dapat menyempurnakan menu');indices=data.indices;
   }finally{clearTimeout(timer)}
  }
  if(job.status!=='running'||controller.signal.aborted)return;
  // Only modify plan if exactly the same slots remain AND no shopping selection ties to slots.
  if(!state.selectedPlanSlots.length && state.plan.flat().join('||')===original.join('||')&&
    Array.isArray(indices)&&indices.length===original.length&&new Set(indices).size===original.length&&
    indices.every(i=>Number.isInteger(i)&&i>=0&&i<original.length)){
   const ordered=indices.map(i=>original[i]);let offset=0;
   state.plan=state.plan.map(day=>{const next=ordered.slice(offset,offset+day.length);offset+=day.length;return next});
   job.source='ai-order';
  }else job.source='catalog';
  job.status='completed';job.phase='done';job.lastError='';
  notify('Jadwal 7 hari siap. Semua bahan dan langkah tersedia; belanja hanya bertambah melalui Cari Bahan.');
 }catch(e){
  if(!controller.signal.aborted&&job.status==='running'){
   job.status='completed';job.phase='done';job.source='catalog';job.lastError='AI penyempurnaan belum berhasil; 21 resep katalog tetap siap. '+String(e.message||e).slice(0,75);
   notify('Penyempurnaan AI dilewati; semua menu tetap bisa dimasak.');
  }else if(job.status==='running'){
   job.status='completed';job.phase='done';job.source='catalog';job.lastError='AI terlalu lambat. Semua menu katalog tersimpan.';
  }
 }finally{clearInterval(tick);aiActiveController=null;saveGeneration()}
}
async function buildAIPlan(){startGeneration('week')}
async function makeCustom(){const query=$('cookQuery').value.trim();if(!query){notify('Tulis nama masakan yang ingin dibuat terlebih dahulu.');$('cookQuery').focus();return}if(!aiEnabled){aiUnavailable();return}const btn=$('customAiBtn');setBusy(btn,true,'Menulis satu resep...');try{const result=await requestAI('recipe',{query,count:1});if(!result.length)throw new Error('AI belum mengembalikan resep lengkap');state.cookQuery=query;state.searchResults=result;renderAll();openRecipe(result[0].id);notify('Resep khusus AI siap dimasak!')}catch(e){notify(`Gagal membuat resep: ${e.message}`)}finally{setBusy(btn,false)}}
async function inspireWithAI(){startGeneration('inspiration')}
// CRUD v3: semua mutasi melalui ID stabil dan modal formulir, agar jumlah dan daftar turunannya tersinkron.
const uid=(prefix='id')=>`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
const unitSelect=(id,value='g')=>`<select id="${id}" required>${UNITS.map(([u,label])=>`<option value="${h(u)}" ${normalizeUnit(value)===u?'selected':''}>${h(label)}</option>`).join('')}</select>`;
function showForm(title,fields,saveLabel,handler){
 const d=$('editDialog');$('editTitle').textContent=title;$('editFields').innerHTML=fields;$('editSave').textContent=saveLabel||'Simpan perubahan';d.hidden=false;document.body.classList.add('dialog-open');modalSave=handler;
 d.querySelector('input,select,textarea')?.focus();
}
let modalSave=null;
function closeForm(){$('editDialog').hidden=true;$('editFields').innerHTML='';modalSave=null;document.body.classList.remove('dialog-open')}
function fieldText(label,id,value='',max=80,required=true){return `<label class="crud-field">${h(label)}<input id="${id}" type="text" value="${h(value)}" maxlength="${max}" ${required?'required':''}></label>`}
function fieldNumber(label,id,value=1){return `<label class="crud-field">${h(label)}<input id="${id}" type="number" value="${h(value)}" min="0.001" max="1000000" step="any" required></label>`}
function quantityFields(name='',qty=1,unit='kg'){
 return `<div class="crud-grid">${fieldText('Nama bahan','crudName',name)}${fieldNumber('Jumlah','crudQty',qty)}<label class="crud-field">Satuan ${unitSelect('crudUnit',unit)}</label></div>`;
}
function getQuantityInputs(){const name=$('crudName').value.trim(),qty=Number($('crudQty').value),unit=normalizeUnit($('crudUnit').value);if(!name||name.length>80)throw new Error('Nama bahan harus diisi (maksimal 80 karakter).');if(!Number.isFinite(qty)||qty<=0||qty>1000000)throw new Error('Jumlah harus lebih dari 0 dan maksimal 1.000.000.');return {name,qty,unit}}
function editPantry(id){const item=state.pantry.find(x=>x.id===id);if(!item)return;showForm('✎ Edit stok bahan',quantityFields(item.name,item.qty,item.unit),'Simpan stok',()=>{
 const next=getQuantityInputs();const duplicate=state.pantry.find(x=>x.id!==id&&sameIngredient(x.name,next.name)&&normalizeUnit(x.unit)===next.unit);
 if(duplicate)throw new Error('Bahan dengan satuan ini sudah ada. Edit item yang sudah ada atau ganti satuan.');Object.assign(item,next);persist();renderAll();notify('Stok berhasil diperbarui.');return true;
 })}
function deletePantry(id){const item=state.pantry.find(x=>x.id===id);if(!item||!confirm(`Hapus ${item.name} dari stok?`))return;state.pantry=state.pantry.filter(x=>x.id!==id);state.purchased=state.purchased.filter(x=>x.pantryId!==id);persist();renderAll();notify('Bahan dihapus dari stok.')}
function clearPurchaseFor(id){const item=state.purchased.find(x=>x.id===id);if(item?.pantryId)state.pantry=state.pantry.filter(x=>x.id!==item.pantryId);state.purchased=state.purchased.filter(x=>x.id!==id)}
function editShopping(id){const item=getShopping().find(x=>x.id===id);if(!item)return;
 const dimension=item.dimension,unit=item.manual?state.shoppingManual.find(x=>x.id===id)?.unit:state.shoppingOverrides[id]?.unit||(dimension==='mass'?'g':dimension==='volume'?'ml':dimension.startsWith('unit:')?dimension.slice(5):'g');
 const qty=item.manual?state.shoppingManual.find(x=>x.id===id)?.qty:(state.shoppingOverrides[id]?.qty??item.required);
 showForm('✎ Edit kebutuhan belanja',quantityFields(item.name,qty,unit)+`<p class="crud-hint">Perubahan kebutuhan otomatis akan disimpan sebagai penyesuaian manual. Angka pada menu resep asli tetap tidak berubah.</p>`,'Simpan kebutuhan',()=>{
 const next=getQuantityInputs();if(item.manual){Object.assign(state.shoppingManual.find(x=>x.id===id),next)}else{state.shoppingOverrides[id]=next}
 clearPurchaseFor(id);persist();renderAll();notify('Kebutuhan belanja berhasil diubah.');return true;
 });
}
function addShopping(){showForm('＋ Tambah kebutuhan belanja',quantityFields('',1,'kg'),'Tambah ke daftar',()=>{const item=getQuantityInputs();state.shoppingManual.push({id:uid('need'),...item});persist();renderAll();notify('Kebutuhan belanja ditambahkan.');return true;})}
function deleteShopping(id){const item=getShopping().find(x=>x.id===id);if(!item||!confirm(`Hapus ${item.name} dari daftar belanja?`))return;
 clearPurchaseFor(id);if(item.manual){state.shoppingManual=state.shoppingManual.filter(x=>x.id!==id)}else{state.shoppingHidden=[...new Set([...state.shoppingHidden,id])];delete state.shoppingOverrides[id]}
 persist();renderAll();notify(item.manual?'Item manual dihapus.':'Kebutuhan otomatis disembunyikan. Gunakan Reset Penyesuaian untuk memunculkannya kembali.');
}
function restoreShopping(){if(!confirm('Kembalikan seluruh kebutuhan otomatis yang disembunyikan dan batalkan edit kebutuhan otomatis? Item manual tetap ada.'))return;
 for(const id of Object.keys(state.shoppingOverrides))clearPurchaseFor(id);
 state.shoppingHidden=[];state.shoppingOverrides={};persist();renderAll();notify('Kebutuhan otomatis dikembalikan.');
}
function chooseRecipe(day,slot=null){if(!Number.isInteger(day)||day<0||day>=7)return;
 if(!Array.isArray(state.plan[day]))state.plan[day]=[];
 if(slot===null&&state.plan[day].length>=state.meals)return notify('Jumlah menu di hari ini sudah maksimal.');
 const current=slot===null?'':state.plan[day][slot]||'';
 const list=catalog().sort((a,b)=>a.title.localeCompare(b.title,'id'));
 showForm(slot===null?`＋ Tambah menu ${DAY_NAMES[dateAt(day).getDay()]}`:'✎ Ubah menu pilihan',`<label class="crud-field">Cari masakan<input id="recipeFilter" placeholder="Cari ayam, sayur, rendang..." maxlength="80" autocomplete="off"></label><label class="crud-field">Pilih resep<select id="recipeChoice" required size="9">${list.map(r=>`<option value="${h(r.id)}" ${r.id===current?'selected':''}>${h(r.emoji||'🍛')} ${h(r.title)} · ${r.minutes} menit</option>`).join('')}</select></label><p class="crud-hint">Resep ditampilkan dari katalog dan Resep Saya. Pilih lalu tekan simpan.</p>`,slot===null?'Tambahkan menu':'Simpan menu',()=>{
 const selected=$('recipeChoice').value;if(!recipeIndex.has(selected))throw new Error('Pilih salah satu menu terlebih dahulu.');
 if(slot===null)state.plan[day].push(selected);else state.plan[day][slot]=selected;
 state.selectedPlanSlots=state.selectedPlanSlots.filter(x=>state.plan[x.day]?.[x.slot]===x.id);
 state.purchased=[];persist();renderAll();notify('Menu pilihan berhasil disimpan.');return true;
 });
 if(!current&&list.length)$('recipeChoice').selectedIndex=0;
 $('recipeFilter').addEventListener('input',()=>{const q=normalize($('recipeFilter').value);const currentVal=$('recipeChoice').value;
 $('recipeChoice').innerHTML=list.filter(r=>!q||normalize(r.title+' '+r.category).includes(q)).map(r=>`<option value="${h(r.id)}" ${r.id===currentVal?'selected':''}>${h(r.emoji||'🍛')} ${h(r.title)} · ${r.minutes} menit</option>`).join('');
 });
}
function deletePlan(day,slot){const r=recipeIndex.get(state.plan[day]?.[slot]);if(!r||!confirm(`Hapus ${r.title} dari menu hari ini?`))return;state.plan[day].splice(slot,1);state.selectedPlanSlots=state.selectedPlanSlots.filter(x=>x.day!==day).concat(state.selectedPlanSlots.filter(x=>x.day===day&&x.slot!==slot).map(x=>({...x,slot:x.slot>slot?x.slot-1:x.slot})));state.purchased=[];persist();renderAll();notify('Menu dihapus dari jadwal. Hanya menu yang sudah dipilih untuk belanja akan berpengaruh.')}
const groupEditor=(key,label,arr=[])=>`<label class="crud-field">${h(label)}<textarea id="ed-${key}" rows="3" placeholder="Contoh: Bawang merah | 5 siung\nBawang putih | 3 siung">${h(arr.map(i=>`${i.name} | ${i.quantity}`).join('\n'))}</textarea></label>`;
function recipeEditor(id=null,duplicate=false){const original=id?recipeIndex.get(id):null;if(id&&!original)return;
 const editing=id&&!duplicate&&state.custom.some(r=>r.id===id);
 const r=original||{title:'',emoji:'🍲',category:'Ayam',minutes:30,servings:3,ingredients:{main:[],ground:[],sliced:[],extras:[]},steps:[],note:''};
 const content=`<div class="crud-grid">${fieldText('Nama masakan','edTitle',r.title,100)}${fieldText('Emoji','edEmoji',r.emoji,8)}<label class="crud-field">Kategori<select id="edCategory">${CATEGORIES.filter(x=>x!=='Semua').map(c=>`<option value="${h(c)}" ${c===r.category?'selected':''}>${h(c)}</option>`).join('')}</select></label>${fieldNumber('Durasi (menit)','edMinutes',r.minutes)}${fieldNumber('Porsi resep dasar','edServings',r.servings)}</div><p class="crud-hint">Satu bahan per baris, gunakan format <b>nama bahan | jumlah satuan</b>. Misalnya: Ayam | 500 g.</p>${groupEditor('main','🥘 Bahan utama',r.ingredients.main)}${groupEditor('ground','🌶️ Bumbu halus',r.ingredients.ground)}${groupEditor('sliced','🧄 Bumbu kasar / iris',r.ingredients.sliced)}${groupEditor('extras','🧂 Bahan pelengkap',r.ingredients.extras)}<label class="crud-field">Langkah memasak (satu langkah per baris)<textarea id="edSteps" rows="5" required>${h(r.steps.join('\n'))}</textarea></label><label class="crud-field">Tips memasak<textarea id="edNote" rows="2">${h(r.note||'')}</textarea></label>`;
 showForm(editing?'✎ Edit resep saya':duplicate?'⧉ Salin & modifikasi resep':'＋ Buat resep sendiri',content,editing?'Simpan resep':'Buat resep',()=>{
 const title=$('edTitle').value.trim();if(!title)throw new Error('Nama masakan wajib diisi.');
 const groups={};for(const k of Object.keys(GROUP_LABELS)){
  const lines=$('ed-'+k).value.split('\n').map(x=>x.trim()).filter(Boolean);groups[k]=lines.map(line=>{const parts=line.split('|');if(parts.length<2||!parts[0].trim()||!parts.slice(1).join('|').trim())throw new Error(`Format bahan pada ${GROUP_LABELS[k]} harus Nama | takaran.`);return {name:parts[0].trim().slice(0,90),quantity:parts.slice(1).join('|').trim().slice(0,70)}})
 }
 if(!groups.main.length)throw new Error('Isi setidaknya satu bahan utama.');
 const steps=$('edSteps').value.split('\n').map(x=>x.trim()).filter(Boolean);if(!steps.length)throw new Error('Isi setidaknya satu langkah memasak.');
 const data={title,emoji:$('edEmoji').value.trim()||'🍲',category:$('edCategory').value,minutes:Math.min(240,Math.max(1,Number($('edMinutes').value)||30)),servings:Math.min(50,Math.max(1,Number($('edServings').value)||3)),ingredients:groups,steps,tags:[title],note:$('edNote').value.trim().slice(0,350)};
 if(editing){Object.assign(state.custom.find(x=>x.id===id),data);state.purchased=[]}else{const nr={id:uid('own'),...data};state.custom.unshift(nr);recipeIndex.set(nr.id,nr)}
 persist();renderAll();notify(editing?'Resep berhasil diperbarui.':'Resep pribadi ditambahkan.');return true;
 });
}
function deleteRecipe(id){const r=state.custom.find(x=>x.id===id);if(!r||!confirm(`Hapus resep "${r.title}"? Resep ini juga akan hilang dari rencana mingguan dan favorit.`))return;
 state.custom=state.custom.filter(x=>x.id!==id);state.favorites=state.favorites.filter(x=>x!==id);state.plan=state.plan.map(day=>day.filter(x=>x!==id));state.selectedShoppingRecipes=state.selectedShoppingRecipes.filter(x=>x!==id);state.selectedPlanSlots=state.selectedPlanSlots.filter(x=>x.id!==id);recipeIndex.delete(id);state.purchased=[];persist();closeRecipe();renderAll();notify('Resep pribadi berhasil dihapus.');
}
function renderMyRecipes(){const list=$('myRecipesResults');if(!list)return;list.innerHTML=state.custom.length?state.custom.map(r=>`<article class="my-recipe-row"><span class="my-recipe-emoji">${h(r.emoji)}</span><div class="my-recipe-name"><b>${h(r.title)}</b><small>${h(r.category)} · ${h(r.minutes)} menit · ${r.ingredients.main.length} bahan utama</small></div><div class="row-actions"><button class="btn btn-outline btn-sm" data-view="${h(r.id)}">Lihat</button><button class="btn btn-outline btn-sm" data-edit-recipe="${h(r.id)}">✎ Edit</button><button class="btn btn-outline btn-sm danger-text" data-delete-recipe="${h(r.id)}">🗑 Hapus</button></div></article>`).join(''):empty('Belum punya resep sendiri','Buat resep baru atau salin resep katalog untuk dimodifikasi.');
}

// V4 — rekomendasi tidak mengubah belanja tanpa pilihan pengguna.
function renderSelectedRecipes(){
 const element=$('selectedRecipeChips');if(!element)return;
 const recipes=state.selectedShoppingRecipes.map(id=>recipeIndex.get(id)).filter(Boolean);
 const planned=state.selectedPlanSlots.filter(x=>state.plan[x.day]?.[x.slot]===x.id).map(x=>({...x,recipe:recipeIndex.get(x.id)})).filter(x=>x.recipe);
 element.innerHTML=(recipes.length||planned.length)?recipes.map(r=>`<span class="selected-pill"><span>${h(r.emoji||'🍛')} ${h(r.title)} · Resep pilihan</span><button type="button" data-remove-selected="${h(r.id)}" title="Batalkan bahan resep ini">×</button></span>`).concat(planned.map(x=>`<span class="selected-pill"><span>${h(x.recipe.emoji||'🍛')} ${h(x.recipe.title)} · Hari ${x.day+1}, menu ${x.slot+1}</span><button type="button" data-remove-plan-selected="${x.day}:${x.slot}" title="Batalkan pilihan menu hari ini">×</button></span>`)).join(''):'<span class="muted">Belum ada resep yang dipilih. Jadwal 7 hari, favorit, dan inspirasi tidak otomatis masuk belanja. Klik Cari Bahan dahulu.</span>';
}
function findIngredients(id){
 const r=recipeIndex.get(id);if(!r)return notify('Resep tidak ditemukan.');
 if(!state.selectedShoppingRecipes.includes(id))state.selectedShoppingRecipes.push(id);
 persist();renderAll();closeRecipe();navigate('belanja');
 notify(`Bahan ${r.title} masuk daftar belanja. Yang sudah ada di stok akan diperhitungkan.`);
}
function removeSelected(id){
 state.selectedShoppingRecipes=state.selectedShoppingRecipes.filter(value=>value!==id);
 persist();renderAll();notify('Resep dilepas dari pencarian bahan; data favorit tetap tersimpan.');
}
function findPlanIngredients(day,slot){
 const id=state.plan[day]?.[slot];const r=recipeIndex.get(id);if(!r)return notify('Menu mingguan tidak ditemukan.');
 if(!state.selectedPlanSlots.some(x=>x.day===day&&x.slot===slot&&x.id===id))state.selectedPlanSlots.push({day,slot,id});
 persist();renderAll();navigate('belanja');notify(`Bahan menu hari ${day+1} (${r.title}) ditambahkan. Menu mingguan lainnya tetap berupa saran.`);
}
function removeSelectedPlan(day,slot){
 state.selectedPlanSlots=state.selectedPlanSlots.filter(x=>!(x.day===day&&x.slot===slot));
 persist();renderAll();notify('Pilihan menu dilepas dari kebutuhan belanja.');
}
function selectEntireWeek(){
 let count=0;for(let day=0;day<state.plan.length;day++)for(let slot=0;slot<state.plan[day].length;slot++){
  const id=state.plan[day][slot];if(!recipeIndex.has(id)||state.selectedPlanSlots.some(x=>x.day===day&&x.slot===slot&&x.id===id))continue;
  state.selectedPlanSlots.push({day,slot,id});count++;
 }
 if(!count)return notify('Tidak ada menu baru untuk ditambahkan. Susun menu 7 hari terlebih dahulu.');
 persist();renderAll();navigate('belanja');notify(`${count} menu mingguan dipilih untuk dihitung bahan belanjanya.`);
}
function unselectEntireWeek(){state.selectedPlanSlots=[];persist();renderAll();notify('Semua pilihan belanja dari jadwal mingguan dibatalkan. Resep favorit dan pilihan lain tetap ada.');}

function renderChat(){
 const box=$('chatMessages');if(!box)return;
 const entries=state.chatHistory.length?state.chatHistory:[{role:'assistant',content:'Halo! 👋 Aku Koki DapurCerdas. Tanya ide masak, bumbu, atau langkah memasak. Pilih Ollama lokal, OpenAI API, atau tombol Buka di ChatGPT. Tanpa AI terhubung, aku memakai katalog demo.'}];
 box.innerHTML=entries.map((m,i)=>`<div class="chat-bubble ${m.role==='user'?'chat-user':'chat-assistant'}"><div class="chat-bubble-title">${m.role==='user'?'Kamu':'👨‍🍳 Koki DapurCerdas'}</div><div class="chat-bubble-text">${h(m.content).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>')}</div>${m.recipeId&&recipeIndex.has(m.recipeId)?`<button type="button" class="chat-recipe-link" data-view="${h(m.recipeId)}">📖 Lihat resep lengkap & bahan →</button>`:''}${m.role==='assistant'&&m.incomplete?`<div class="chat-resume-row"><span>⚠ ${h(m.finishReason==='timeout'?'Waktu AI habis':m.finishReason==='length'?'Batas token tercapai':m.finishReason==='stopped'?'Dihentikan':'Jawaban belum lengkap')}. Hasil sudah tersimpan.</span><button type="button" class="btn btn-dark btn-sm" data-chat-resume="${i}" ${chatBusy?'disabled':''}>▶ Lanjutkan Jawaban</button></div>`:''}</div>`).join('');
 box.scrollTop=box.scrollHeight;
}
function localChat(prompt){
 const matches=searchCatalog(prompt,5);
 const r=matches.length?matches[0]:sortForPantry(catalog(),0)[0];
 const need=r?missing(r).slice(0,5).map(x=>x.name):[];
 return {content:r?`Mode katalog lokal (bukan model AI)\n\nUntuk pertanyaanmu, kamu dapat mencoba ${r.title} (${r.minutes} menit).\n\nBumbu halus: ${(r.ingredients?.ground||[]).map(x=>x.name).join(', ')||'tidak diperlukan'}.\nBumbu kasar: ${(r.ingredients?.sliced||[]).map(x=>x.name).join(', ')||'tidak diperlukan'}.\n${need.length?'Bahan yang perlu dicek: '+need.join(', ')+'.':'Sebagian besar bahan tercatat tersedia.'}\n\nBuka resep untuk urutan langkah memasaknya. Hasil saran ini BELUM ditambahkan ke daftar belanja; klik Cari Bahan bila ingin memasaknya.`:'Mode katalog: tulis masakan yang ingin dicari. Untuk AI lokal, jalankan Ollama dan unduh model. Kamu juga bisa membuka ChatGPT lewat tombol di atas.',recipeId:r?.id};
}
let chatController=null;
function stopChat(){if(chatController){chatController.abort('user-stop');notify('Chat dihentikan. Jawaban yang sudah muncul tetap tersimpan dan bisa dilanjutkan.')}}
function resumeChat(index){
 if(chatBusy)return;
 const message=state.chatHistory[index];
 if(!message||message.role!=='assistant'||!message.incomplete)return;
 const original=message.originalPrompt||state.chatHistory.slice(0,index).reverse().find(m=>m.role==='user')?.content;
 if(!original)return notify('Pertanyaan asli tidak ditemukan. Kirim ulang pertanyaannya.');
 sendChat(original,index);
}
function looksUnfinishedText(value){
 const text=String(value||'').trim();if(!text)return true;
 const last=text.slice(-110);
 // Detect an answer cut inside markdown/list formatting despite a normal provider finish signal.
 return /(?:\d+[.)]\s*\*{0,2}|\*{1,2}|[:;,(-]|\b(?:dan|atau|dengan|supaya|lalu|kemudian))\s*$/i.test(last)||
   (text.match(/\*\*/g)||[]).length%2!==0;
}
function mergeAnswerSegments(previous,added){
 if(!previous)return added;
 if(!added)return previous;
 // Remove duplicated words if the continuation repeats the tail of the previous answer.
 const strip=added.replace(/^\s+/,''),last=previous.slice(-280);
 for(let n=Math.min(last.length,strip.length,180);n>=18;n--){if(last.slice(-n).toLowerCase()===strip.slice(0,n).toLowerCase())return previous+strip.slice(n);}
 const midSentence=/(?:\*{1,2}|\d+[.)]\s*|[:;,(-]|\b(?:dan|atau|dengan|untuk))\s*$/i.test(previous);
 return previous+(midSentence||previous.endsWith('\n')?'':'\n')+strip;
}
async function sendChat(prompt,resumeIndex=null){
 prompt=String(prompt||'').trim().slice(0,1500);if(!prompt||chatBusy)return;
 const continuing=Number.isInteger(resumeIndex),button=$('sendChatBtn');
 let result,previous='';
 if(continuing){result=state.chatHistory[resumeIndex];if(!result||result.role!=='assistant')return;previous=result.content||'';
  result.incomplete=true;result.finishReason='working';result.attemptCount=(Number(result.attemptCount)||0)+1;
 }else{
  state.lastChatPrompt=prompt;state.chatHistory.push({role:'user',content:prompt});
  result={role:'assistant',content:'',incomplete:true,finishReason:'working',originalPrompt:prompt,attemptCount:0};state.chatHistory.push(result);
 }
 persist();renderChat();chatBusy=true;setBusy(button,true,'Mengirim…');$('stopChatBtn').hidden=false;
 const controller=new AbortController();chatController=controller;
 const timeout=setTimeout(()=>controller.abort('timeout'),78000);
 let chunk='',remoteError='',endEvent=null,lastPersist=0,lastRender=0;
 function update(){result.content=mergeAnswerSegments(previous,chunk);const now=Date.now();
  if(now-lastRender>=110){renderChat();lastRender=now}if(now-lastPersist>=450){persist();lastPersist=now}}
 try{
  if(aiEnabled&&!window.DAPURCERDAS_STANDALONE){
   const response=await fetch('/api/chat-stream',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},
    body:JSON.stringify({message:prompt,continueFrom:continuing?previous.slice(-1650):'',
     history:continuing?[]:state.chatHistory.slice(-9,-2).filter(m=>!m.incomplete),
     pantry:state.pantry.map(x=>({name:x.name,qty:x.qty,unit:x.unit})),
     favorites:state.favorites.slice(-6).map(id=>recipeIndex.get(id)?.title).filter(Boolean),
     planned:getPlanRecipes().slice(0,7).map(r=>r.title),servings:state.servings})});
   if(!response.ok){const data=await response.json().catch(()=>({}));throw Error(data.error||`HTTP ${response.status}`)}
   if(!response.body)throw Error('Browser tidak mendukung streaming respons.');
   const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
   while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let lineEnd;
    while((lineEnd=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,lineEnd).trim();buffer=buffer.slice(lineEnd+1);if(!line)continue;
     let ev;try{ev=JSON.parse(line)}catch{continue}
     if(ev.type==='delta'){chunk+=String(ev.text||'');update()}
     if(ev.type==='status'&&!chunk&&!previous){result.content='⏳ '+String(ev.message||'Sedang memproses…');renderChat()}
     if(ev.type==='error'){remoteError=String(ev.message||'Respons AI gagal');result.finishReason=ev.reason||'error'}
     if(ev.type==='done')endEvent=ev;
    }
   }
   if(remoteError)throw Error(remoteError);
   if(!chunk.trim()&&!previous)throw Error('Model tidak mengirim respons.');
   update();result.incomplete=endEvent?.complete===false || !endEvent || looksUnfinishedText(result.content);result.finishReason=result.incomplete?(endEvent?.reason==='stop'?'incomplete':endEvent?.reason||'interrupted'):'';
   // A deliberate SELESAI marker means the model finished, even when token statistics were ambiguous.
   if(/\bSELESAI\s*\.?\s*$/i.test(result.content)){result.incomplete=false;result.finishReason='';result.content=result.content.replace(/\bSELESAI\s*\.?\s*$/i,'').trim()}
  }else if(window.DAPURCERDAS_STANDALONE && /simulasi timeout/i.test(prompt)){
   if(!continuing){result.content='🧪 SIMULASI — Jawaban lokal, bukan AI online.\n\n1. Siapkan 900 g ayam, air dan bumbu.\n2. **';result.incomplete=true;result.finishReason='timeout';}
   else{result.content=mergeAnswerSegments(previous,'Haluskan bumbu:** bawang merah, bawang putih dan kunyit.\n3. Tumis bumbu sampai harum.\n4. Rebus ayam bersama bumbu hingga matang.\n5. Sajikan dengan daun bawang dan jeruk nipis.');result.incomplete=false;result.finishReason='';}
  }else{const local=localChat(prompt);result.content=continuing?mergeAnswerSegments(previous,local.content):local.content;result.recipeId=local.recipeId;result.incomplete=false;result.finishReason=''}
 }catch(e){
  update();const reason=controller.signal.aborted?(controller.signal.reason==='timeout'?'timeout':'stopped'):(result.finishReason||'error');
  result.incomplete=true;result.finishReason=reason;
  if(!result.content.trim()||result.content.startsWith('⏳')){
   const local=localChat(prompt);result.content=`⚠ AI belum memberikan teks yang bisa disimpan: ${String(e.message||e).slice(0,130)}.\n\nSaran cepat dari katalog:\n${local.content}`;result.recipeId=local.recipeId;
   // This catalog fallback is usable even if the AI request failed.
   result.incomplete=false;result.finishReason='';
  }
 }finally{
  clearTimeout(timeout);chatController=null;persist();chatBusy=false;setBusy(button,false);$('stopChatBtn').hidden=true;renderChat();
 }
}

async function openInChatGPT(){
 const prompt=($('chatInput')?.value||state.lastChatPrompt||'Buatkan menu masakan dari stok yang tersedia').trim();
 const pantry=state.pantry.map(x=>`${x.qty} ${x.unit} ${x.name}`).join(', ');
 const favorite=state.favorites.map(id=>recipeIndex.get(id)?.title).filter(Boolean).join(', ')||'belum ada';
 const content=`Kamu adalah asisten memasak DapurCerdas. Jawab dalam bahasa Indonesia.\n\nStok bahan: ${pantry}.\nJumlah porsi: ${state.servings}. Favorit: ${favorite}.\n\nPermintaan: ${prompt}.\n\nJika membuat resep, susun bahan utama, bumbu halus, bumbu kasar/iris, pelengkap, dan langkah-langkah bernomor. Jangan menganggap resep sudah masuk daftar belanja aplikasi; itu hanya bisa dilakukan manual dari tombol Cari Bahan.`;
 const copy = async()=>{
  try{await navigator.clipboard.writeText(content);return true}catch{
   const input=document.createElement('textarea');input.value=content;input.style.position='fixed';input.style.opacity='0';document.body.appendChild(input);input.select();const success=document.execCommand('copy');input.remove();return success;
  }
 };
 const chatgptTab=window.open('https://chatgpt.com/','_blank','noopener,noreferrer'); // synchronous user gesture avoids popup blocker
 const ok=await copy();
 if(!ok){showForm('Salin konteks untuk ChatGPT',`<textarea readonly id="chatgptTransferText" style="width:100%;min-height:180px">${h(content)}</textarea><p>Salin teks di atas lalu buka <a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">ChatGPT</a>.</p>`,'Tutup',()=>true);return;}
 notify('Konteks dapur tersalin! Tempel (Ctrl+V) di ChatGPT yang baru terbuka.');
}
function safeExternalUrl(raw){
 try{const url=new URL(raw);return ['http:','https:'].includes(url.protocol)?url.href:null}catch{return null}
}
// Search Engine ID bukan API key dan aman digunakan di frontend/preview.
// Untuk aplikasi server, /api/health dapat mengganti ID publik ini dari .env.
const PUBLIC_GOOGLE_CSE_ID = 'b0f250f042fc442b3';
let googleLoadState='idle'; // idle | loading | ready | blocked | failed
let googlePendingQuery='';
let googleLoadWatchdog;

function renderGoogleResults(){
 const div=$('googleResults');if(!div)return;
 const results=state.googleResults.slice(0,10);
 div.innerHTML=results.length?results.map((r,i)=>`<article class="google-result"><span class="web-tag">🌐 HASIL GOOGLE · ${i+1}</span><h3>${h(r.title)}</h3><p>${h(r.snippet||'Buka sumber asli untuk membaca resep.')}</p><div class="google-card-actions"><a href="${h(r.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">Lihat sumber ↗</a></div></article>`).join(''):'';
}
function showGoogleStatus(msg){$('googleStatus').textContent=msg}
function googleSearchApi(){return window.google?.search?.cse?.element}
function googleSearchElement(){try{return googleSearchApi()?.getElement?.('dc-google')}catch{return null}}
function googleFallbackLink(query,reason){
 const url='https://www.google.com/search?q='+encodeURIComponent(`${query} resep bahan dan cara membuat`);
 $('googleResults').innerHTML=`<div class="google-fallback"><p>${h(reason)}</p><a href="${h(url)}" class="btn btn-outline" target="_blank" rel="noopener noreferrer">Buka Google ↗</a></div>`;
}
function googleError(reason){
 clearTimeout(googleLoadWatchdog);
 googleLoadState='blocked'; googleReady=false;
 $('googleBadge').textContent='Google belum terhubung';
 showGoogleStatus(reason+' ID sudah ada; cek koneksi, ekstensi pemblokir, serta izin website di Google Programmable Search Engine.');
 if(googlePendingQuery)googleFallbackLink(googlePendingQuery,reason);
}
function googleActive(){
 if(!googleSearchElement())return false;
 clearTimeout(googleLoadWatchdog);
 googleLoadState='ready'; googleReady=true;
 $('googleBadge').textContent='Google terhubung';
 showGoogleStatus('Google Search siap. Ketik inspirasi masakan dan klik Cari Google.');
 if(googlePendingQuery){const q=googlePendingQuery;googlePendingQuery='';runGoogleQuery(q)}
 return true;
}
function onGoogleResultsReady(name,query,promos,results){
 state.googleResults=(Array.isArray(results)?results:[]).slice(0,10).map(r=>({
  title:String(r.titleNoFormatting||r.title||'Ide masakan').replace(/<[^>]*>/g,'').slice(0,160),
  url:safeExternalUrl(r.url||r.unescapedUrl||r.visibleUrl),
  snippet:String(r.contentNoFormatting||r.content||'').replace(/<[^>]*>/g,'').slice(0,350)
 })).filter(r=>r.url);
 renderGoogleResults();
 showGoogleStatus(state.googleResults.length?`${state.googleResults.length} hasil Google ditemukan. Klik Buat Resep Instan, lalu sempurnakan AI bila perlu.`:'Google tidak menemukan hasil yang bisa diimpor. Coba kata kunci lain atau lihat hasil Google di bawah.');
 if($('editDialog').hidden&&$('recipeModal').hidden){document.body.classList.remove('dialog-open');document.body.style.overflow='';document.documentElement.style.overflow='';}
 // True berarti custom rendering hasil di atas digunakan dan Google tidak merender duplikat.
 return true;
}
function loadGoogleEngine(cx){
 if(googleLoadState==='ready'||googleLoadState==='loading')return;
 if(!cx||!String(cx).trim()){
  googleLoadState='failed';$('googleBadge').textContent='ID belum disetel';
  showGoogleStatus('GOOGLE_CSE_ID kosong. Atur di .env lalu restart npm start.');return;
 }
 googleLoadState='loading'; googleReady=false;
 $('googleBadge').textContent='Menghubungkan Google…';
 showGoogleStatus('Memuat Google Search Engine. Mohon cek koneksi internet bila terlalu lama.');
 // API resmi: initCallback dipanggil setelah library siap; onload script saja belum cukup.
 window.__gcse={
  parsetags:'explicit',
  initializationCallback:()=>{
   const render=()=>{
    try{
     if(!googleSearchApi())throw Error('Google Search Element belum siap');
     if(!googleSearchElement())googleSearchApi().render({div:'googleElement',tag:'searchresults-only',gname:'dc-google'});
     if(!googleActive()){
      let attempts=0;
      const check=setInterval(()=>{
       if(googleActive()||googleLoadState!=='loading'||++attempts>35)clearInterval(check);
      },100);
     }
    }catch(err){googleError('Google Search Element gagal dibuat: '+String(err.message||err))}
   };
   if(document.readyState==='complete')render();
   else if(typeof window.google?.setOnLoadCallback==='function')window.google.setOnLoadCallback(render,true);
   else setTimeout(render,0);
  },
  searchCallbacks:{web:{ready:onGoogleResultsReady}}
 };
 const script=document.createElement('script');
 script.id='dapurcerdas-google-cse';
 script.src=`https://cse.google.com/cse.js?cx=${encodeURIComponent(cx)}`;
 script.async=true;
 // Jika script diunduh, tunggu initializationCallback; jangan render langsung di onload.
 script.onerror=()=>googleError('Script Google gagal dimuat (jaringan/CSP/ad-block).');
 document.head.appendChild(script);
 googleLoadWatchdog=setTimeout(()=>{
  if(googleLoadState==='loading')googleError('Google tidak merespons selama 15 detik.');
 },15000);
}
function runGoogleQuery(q){
 const engine=googleSearchElement();
 if(!engine){googlePendingQuery=q;showGoogleStatus('Google masih disiapkan; pencarian akan dilanjutkan otomatis setelah siap.');return false}
 try{showGoogleStatus(`Mencari "${q}" di Google…`);engine.execute(`${q} resep bahan dan cara membuat`);return true}
 catch(err){googleError('Pencarian Google gagal: '+String(err.message||err));googleFallbackLink(q,'Pencarian belum bisa dijalankan di halaman ini.');return false}
}
function searchGoogle(){
 const q=$('googleQuery').value.trim().slice(0,160);
 if(!q){notify('Masukkan jenis masakan yang ingin dicari di Google.');return}
 state.googleResults=[];renderGoogleResults();
 if(googleLoadState==='ready')return runGoogleQuery(q);
 if(googleLoadState==='idle')loadGoogleEngine(PUBLIC_GOOGLE_CSE_ID);
 if(googleLoadState==='loading'){
  googlePendingQuery=q;
  showGoogleStatus('Google sedang dimuat. Pencarian akan berjalan otomatis setelah Google siap.');
  return;
 }
 googleFallbackLink(q,'Google belum bisa terhubung di browser ini. Coba nonaktifkan ad-block untuk halaman ini atau jalankan aplikasi melalui localhost.');
 showGoogleStatus('ID Google sudah disetel, tetapi script Google gagal dimuat. Periksa koneksi, izin browser, dan pengaturan mesin pencari.');
}
// Import is immediate and guaranteed to preserve a usable recipe even if Ollama is offline.
// Source snippets are not the original recipe text: the draft is clearly marked as catalog-adapted.
function recipeMatchScore(title,recipe){
 const ignore=new Set(['resep','cara','membuat','masak','masakan','enak','mudah','spesial','lezat','sederhana','rumahan','praktis','dan','yang','ala','untuk','dengan','khas','paling','versi','terbaik','anti','gagal','bikin','super','pedas','gurih','cookpad','sajian','sedap']);
 const words=(text)=>new Set(normalize(text).split(' ').filter(w=>w.length>2&&!ignore.has(w)));
 const x=words(title),y=words(recipe.title);let hits=0;for(const token of x)if(y.has(token))hits++;
 const common=hits/Math.max(1,Math.max(x.size,y.size));
 const phrase=normalize(title).includes(normalize(recipe.title))?0.8:0;
 return common+phrase+(hits>=2?0.2:0);
}
function createGoogleDraft(source){
 const ranked=[...RECIPES,...state.custom.filter(r=>!r.sourceType?.startsWith('google'))]
   .map(r=>({recipe:r,score:recipeMatchScore(source.title,r)-(r.parentId?0.08:0)})).sort((a,b)=>b.score-a.score);
 const best=ranked[0];if(!best)throw Error('Katalog resep kosong.');
 const matched=best.score>=0.36;
 const draft=structuredClone(best.recipe);
 draft.id=uid('google-draft');
 draft.sourceUrl=source.url;draft.sourceTitle=source.title;draft.sourceType='google-catalog-draft';
 draft.sourceBaseTitle=best.recipe.title;
 // Keep the authentic catalog recipe title, rather than falsely claiming the Google recipe was fetched.
 draft.note=`DRAFT adaptasi katalog ${best.recipe.title}. ${matched?'Masakan ini cocok dengan topik Google, tetapi takaran/langkah belum dibandingkan dengan sumber.':'Hanya resep dasar yang paling mendekati hasil Google; mungkin berbeda dari resep yang kamu cari.'} Buka sumber asli dan periksa bahan, takaran, serta langkah sebelum memasak. `+(best.recipe.note||'');
 state.custom.unshift(draft);recipeIndex.set(draft.id,draft);persist();return draft;
}
const googleRefinements=new Map();
function importGoogle(i){
 const source=state.googleResults[Number(i)];if(!source?.url)return;
 try{
  const existing=state.custom.find(r=>['google-catalog-draft','google-ai-adapted'].includes(r.sourceType)&&r.sourceUrl===source.url);
  const draft=existing||createGoogleDraft(source);
  renderAll();openRecipe(draft.id);
  notify('Draft resep langsung tersedia. Tidak menambah belanja otomatis; sempurnakan AI jika diperlukan.');
 }catch(e){notify('Tidak dapat menyiapkan draft resep: '+String(e.message||e))}
}
async function refineGoogleDraft(id){
 const original=state.custom.find(r=>r.id===id&&r.sourceType==='google-catalog-draft');
 if(!original||googleRefinements.has(id))return;
 if(window.DAPURCERDAS_STANDALONE){notify('Mode preview: draft langsung tersedia. Penyempurnaan AI sungguhan membutuhkan aplikasi server dan Ollama.');return}
 if(!aiEnabled)return aiUnavailable();
 const button=document.querySelector(`[data-refine-google="${CSS.escape(id)}"]`);
 const controller=new AbortController();googleRefinements.set(id,controller);
 const before=JSON.stringify(original.ingredients)+JSON.stringify(original.steps);
 const seconds=Date.now();
 if(button)setBusy(button,true,'AI memperbaiki resep…');
 const status=document.getElementById('googleDraftStatus');
 const tick=setInterval(()=>{if(status&&status.isConnected)status.textContent=`AI sedang menyempurnakan draft (${Math.floor((Date.now()-seconds)/1000)} detik). Draft tetap bisa digunakan, diedit, atau dimasukkan ke belanja.`},1000);
 const deadline=setTimeout(()=>controller.abort('deadline'),38000);
 try{
  const created=await requestAI('recipe',{query:`Buat resep rumahan untuk: ${original.sourceTitle}. Sesuaikan jika perlu dengan ${original.sourceBaseTitle}`,googleSource:{title:original.sourceTitle,url:original.sourceUrl,snippet:''},count:1},controller.signal);
  const improved=created[0];if(!improved)throw Error('AI belum menghasilkan resep lengkap.');
  const current=state.custom.find(r=>r.id===id);
  const edited=current&&(JSON.stringify(current.ingredients)+JSON.stringify(current.steps)!==before);
  // requestAI saves a new recipe immediately. Keep as a separate recipe when user edited draft during generation.
  if(edited){improved.sourceUrl=original.sourceUrl;improved.sourceTitle=original.sourceTitle;improved.sourceType='google-ai-adapted';persist();notify('Resep AI tersimpan terpisah karena draft telah diedit.');return;}
  if(!current)return;
  state.custom=state.custom.filter(r=>r.id!==improved.id);recipeIndex.delete(improved.id);
  Object.assign(current,{...improved,id,sourceUrl:current.sourceUrl,sourceTitle:current.sourceTitle,sourceBaseTitle:current.sourceBaseTitle,sourceType:'google-ai-adapted'});
  recipeIndex.set(id,current);persist();renderAll();
  if(!$('recipeModal').hidden&&$('modalContent').querySelector(`[data-refine-google="${CSS.escape(id)}"]`))openRecipe(id);
  notify('Penyempurnaan AI berhasil. Periksa takaran dan langkah sebelum memasak.');
 }catch(e){
  const msg=controller.signal.aborted?'AI melewati batas 38 detik. Draft tetap tersimpan dan siap dipakai.':String(e.message||e).slice(0,130);
  if(status&&status.isConnected)status.textContent='⚠ '+msg;
  notify(msg);
 }finally{clearTimeout(deadline);clearInterval(tick);googleRefinements.delete(id);if(button?.isConnected)setBusy(button,false)}
}
function stopGoogleRefinement(id){googleRefinements.get(id)?.abort('stopped');notify('Penyempurnaan dihentikan. Draft resep tetap tersimpan.')}

function bindEvents(){document.addEventListener('click',e=>{const target=e.target;const nav=target.closest('[data-page]');if(nav){navigate(nav.dataset.page);return}
 const finder=target.closest('[data-find-ingredients]');if(finder){findIngredients(finder.dataset.findIngredients);return}
 const plannedFinder=target.closest('[data-find-plan-ingredients]');if(plannedFinder){const [d,s]=plannedFinder.dataset.findPlanIngredients.split(':').map(Number);findPlanIngredients(d,s);return}
  const unselect=target.closest('[data-remove-selected]');if(unselect){removeSelected(unselect.dataset.removeSelected);return}
 const removePlan=target.closest('[data-remove-plan-selected]');if(removePlan){const [d,s]=removePlan.dataset.removePlanSelected.split(':').map(Number);removeSelectedPlan(d,s);return}
  const importBtn=target.closest('[data-google-import]');if(importBtn){importGoogle(importBtn.dataset.googleImport);return}
 const refineBtn=target.closest('[data-refine-google]');if(refineBtn){void refineGoogleDraft(refineBtn.dataset.refineGoogle);return}
 const stopRefine=target.closest('[data-stop-google-refine]');if(stopRefine){stopGoogleRefinement(stopRefine.dataset.stopGoogleRefine);return}
  const resumeBtn=target.closest('[data-chat-resume]');if(resumeBtn){resumeChat(Number(resumeBtn.dataset.chatResume));return}
  const chatPrompt=target.closest('[data-chat-prompt]');if(chatPrompt){$('chatInput').value=chatPrompt.dataset.chatPrompt;sendChat(chatPrompt.dataset.chatPrompt);return}
  const view=target.closest('[data-view]');if(view){openRecipe(view.dataset.view);return}
 const fav=target.closest('[data-favorite]');if(fav){toggleFavorite(fav.dataset.favorite);return}
 const add=target.closest('[data-add-ingredient]');if(add){addIngredient(add.dataset.addIngredient);return}
 const editP=target.closest('[data-edit-ingredient]');if(editP){editPantry(editP.dataset.editIngredient);return}
 const remove=target.closest('[data-remove-ingredient]');if(remove){deletePantry(remove.dataset.removeIngredient);return}
 const changePlan=target.closest('[data-edit-plan]');if(changePlan){const [day,slot]=changePlan.dataset.editPlan.split(':').map(Number);chooseRecipe(day,slot);return}
 const addPlanDay=target.closest('[data-add-plan]');if(addPlanDay){chooseRecipe(Number(addPlanDay.dataset.addPlan));return}
 const deleteP=target.closest('[data-delete-plan]');if(deleteP){const [day,slot]=deleteP.dataset.deletePlan.split(':').map(Number);deletePlan(day,slot);return}
 const category=target.closest('[data-category]');if(category){inspoPageSize=24;state.category=category.dataset.category;renderInspiration();return}
 const query=target.closest('[data-query]');if(query){state.cookQuery=query.dataset.query;cookPageSize=24;state.searchResults=null;renderCook();return}
 const editS=target.closest('[data-edit-shopping]');if(editS){editShopping(editS.dataset.editShopping);return}
 const delS=target.closest('[data-delete-shopping]');if(delS){deleteShopping(delS.dataset.deleteShopping);return}
 const editR=target.closest('[data-edit-recipe]');if(editR){closeRecipe();recipeEditor(editR.dataset.editRecipe);return}
 const cloneR=target.closest('[data-clone-recipe]');if(cloneR){closeRecipe();recipeEditor(cloneR.dataset.cloneRecipe,true);return}
 const delR=target.closest('[data-delete-recipe]');if(delR){deleteRecipe(delR.dataset.deleteRecipe);return}
 const shopping=target.closest('[data-toggle-shopping]');if(shopping){toggleShopping(shopping.dataset.toggleShopping);return}
 const addPlan=target.closest('[data-add-to-plan]');if(addPlan){addRecipePlan(addPlan.dataset.addToPlan);return}
 const saveRecipe=target.closest('[data-print-recipe]');if(saveRecipe){const r=recipeIndex.get(saveRecipe.dataset.printRecipe);if(r)downloadFile(`${r.id}.txt`,formatRecipeTxt(r));return}
 });
 $('newRecipeBtn').addEventListener('click',()=>recipeEditor());$('addShoppingBtn').addEventListener('click',addShopping);$('shoppingRestoreBtn').addEventListener('click',restoreShopping);
 $('selectWholeWeekBtn').addEventListener('click',selectEntireWeek);
 $('unselectWholeWeekBtn').addEventListener('click',unselectEntireWeek);
 $('googleSearchBtn').addEventListener('click',searchGoogle);
 $('googleQuery').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchGoogle()}});
 $('stopChatBtn').addEventListener('click',stopChat);
 $('chatForm').addEventListener('submit',e=>{e.preventDefault();const input=$('chatInput');const prompt=input.value.trim();if(!prompt)return;input.value='';sendChat(prompt)});
 $('chatInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('chatForm').requestSubmit()}});
 $('openChatGPTBtn').addEventListener('click',openInChatGPT);
 $('clearChatBtn').addEventListener('click',()=>{if(!confirm('Hapus seluruh riwayat chat lokal?'))return;state.chatHistory=[];persist();renderChat();notify('Riwayat chat sudah dikosongkan.');});
 $('chatMakeRecipeBtn').addEventListener('click',async()=>{
  const prompt=state.lastChatPrompt||[...state.chatHistory].reverse().find(x=>x.role==='user')?.content||'';
  if(!prompt){notify('Kirim pertanyaan di chat dulu agar dapat dibuat menjadi resep.');return}
  if(!aiEnabled){aiUnavailable();return}
  const btn=$('chatMakeRecipeBtn');setBusy(btn,true,'Menyusun resep...');
  try{const result=await requestAI('recipe',{query:prompt,count:1});if(result[0]){renderAll();openRecipe(result[0].id);notify('Resep dibuat dari obrolan! Klik Cari Bahan bila ingin memasukkan bahan belanja.')}}
  catch(e){notify('Gagal menyusun resep: '+e.message)}finally{setBusy(btn,false)}
 });

 $('editCancel').addEventListener('click',closeForm);$('editClose').addEventListener('click',closeForm);$('editDialog').addEventListener('click',e=>{if(e.target===$('editDialog'))closeForm()});
 $('editForm').addEventListener('submit',e=>{e.preventDefault();if(!modalSave)return;try{const success=modalSave();if(success)closeForm()}catch(err){notify(err.message)}});
  $('newItemUnit').innerHTML=UNITS.map(([value,label])=>`<option value="${h(value)}">${h(label)}</option>`).join('');$('newItemUnit').value='kg';
 const addSingle=()=>{const name=$('newItemName').value.trim(),qty=Number($('newItemQty').value),unit=$('newItemUnit').value;
 if(!name){notify('Isi nama bahan dulu.');$('newItemName').focus();return}
 if(!Number.isFinite(qty)||qty<=0||qty>1000000){notify('Jumlah harus lebih dari 0 dan maksimal 1.000.000.');$('newItemQty').focus();return}
 const added=addPantryBatch([{name,qty,unit}]);if(added){$('newItemName').value='';$('newItemQty').value='1';$('newItemName').focus();notify(`${name} ${qty} ${unit} berhasil ditambahkan.`)}};
 $('addItemBtn').addEventListener('click',addSingle);$('newItemName').addEventListener('keydown',e=>{if(e.key==='Enter')addSingle()});
 $('savePantryBtn').addEventListener('click',()=>{const items=parsePantryText($('pantryInput').value);if(!items.length){notify('Tulis bahan, misalnya: 10kg daging, 2kg ayam.');$('pantryInput').focus();return}const n=addPantryBatch(items);$('pantryInput').value='';notify(`${n} item berhasil diproses dan ditambahkan.`)});
 $('clearPantryBtn').addEventListener('click',()=>{if(!window.confirm('Kosongkan semua stok belanjaan yang tersimpan?'))return;state.pantry=[];state.purchased=[];persist();renderAll();notify('Stok dapur dikosongkan.')});
 $('mealsPerDay').addEventListener('change',e=>{const next=Number(e.target.value);if(state.plan.some(day=>day.length>next)){if(!confirm(`Mengubah menjadi ${next} masakan per hari akan menghapus slot menu yang berlebih. Lanjutkan?`)){e.target.value=String(state.meals);return}state.plan=state.plan.map(day=>day.slice(0,next));state.purchased=[]}state.meals=next;state.selectedPlanSlots=state.selectedPlanSlots.filter(x=>state.plan[x.day]?.[x.slot]===x.id);persist();renderAll();notify('Jumlah masakan per hari diperbarui.');});$('servings').addEventListener('change',e=>{state.servings=Number(e.target.value);persist();renderAll()});$('mealPreference').addEventListener('change',e=>{state.preference=e.target.value;persist()});$('mealNote').addEventListener('input',e=>{state.note=e.target.value;persist()});
 $('offlinePlanBtn').addEventListener('click',()=>{if(aiActiveController)toggleJob('stop',state.aiJob.kind);state.aiJob=null;createPlan(Date.now())});$('aiPlanBtn').addEventListener('click',buildAIPlan);
 $('exportPlanBtn').addEventListener('click',()=>{const text=state.plan.map((ids,d)=>`${DAY_NAMES[dateAt(d).getDay()]} (${formattedDate(dateAt(d))})\n${ids.map((id,i)=>{const r=recipeIndex.get(id);return r?`  ${i+1}. ${r.title} (${r.minutes} menit)`:'  -'}).join('\n')}`).join('\n\n');downloadFile('rencana-masakan-7-hari.txt',`RENCANA MASAK 7 HARI\n\n${text}\n\nDibuat dengan DapurCerdas AI\n`);notify('Rencana mingguan diunduh.')});
 function searchCook(){state.cookQuery=$('cookQuery').value.trim();cookPageSize=24;state.searchResults=null;renderCook()}
 $('cookSearchBtn').addEventListener('click',searchCook);$('cookQuery').addEventListener('keydown',e=>{if(e.key==='Enter')searchCook()});$('cookQuery').addEventListener('input',e=>{state.cookQuery=e.target.value.trim();cookPageSize=24;state.searchResults=null;renderCook()});$('customAiBtn').addEventListener('click',makeCustom);
 function searchInspiration(){inspoPageSize=24;state.inspoQuery=$('inspoQuery').value.trim();state.inspirationResults=null;state.aiInspirationIds=[];if(state.aiJob?.kind==='inspiration'){toggleJob('stop','inspiration');state.aiJob=null}persist();renderInspiration()}
 $('inspoSearchBtn').addEventListener('click',searchInspiration);$('inspoQuery').addEventListener('keydown',e=>{if(e.key==='Enter')searchInspiration()});$('inspoQuery').addEventListener('input',e=>{inspoPageSize=24;state.inspoQuery=e.target.value.trim();state.inspirationResults=null;state.aiInspirationIds=[];if(state.aiJob?.kind==='inspiration'){toggleJob('stop','inspiration');state.aiJob=null}persist();renderInspiration()});
 $('timeFilter').addEventListener('change',e=>{state.time=e.target.value;inspoPageSize=24;renderInspiration()});
 $('regionFilter').addEventListener('change',e=>{selectedRegion=e.target.value;inspoPageSize=24;renderInspiration()});
 $('recipeTypeFilter').addEventListener('change',e=>{selectedRecipeType=e.target.value;inspoPageSize=24;renderInspiration()});
 $('inspoMore').addEventListener('click',()=>{inspoPageSize+=24;renderInspiration()});
 $('cookMore').addEventListener('click',()=>{cookPageSize+=24;renderCook()});$('shuffleBtn').addEventListener('click',()=>{state.shuffle++;state.inspirationResults=null;state.aiInspirationIds=[];if(state.aiJob?.kind==='inspiration'){toggleJob('stop','inspiration');state.aiJob=null}persist();renderInspiration();notify('Rekomendasi diperbarui!')});$('aiInspoBtn').addEventListener('click',inspireWithAI);
 document.querySelectorAll('[data-ai-pause],[data-ai-stop],[data-ai-resume],[data-ai-reset]').forEach(btn=>btn.addEventListener('click',()=>{const action=btn.hasAttribute('data-ai-pause')?'pause':btn.hasAttribute('data-ai-stop')?'stop':btn.hasAttribute('data-ai-resume')?'resume':'reset';toggleJob(action,btn.closest('[data-ai-job]').dataset.aiJob)}));
 $('downloadShoppingBtn').addEventListener('click',()=>{downloadFile('daftar-belanja-dapurcerdas.txt',shoppingText());notify('Daftar belanja diunduh.')});$('copyShoppingBtn').addEventListener('click',()=>copyText(shoppingText()));
 $('modalClose').addEventListener('click',closeRecipe);$('recipeModal').addEventListener('click',e=>{if(e.target===$('recipeModal'))closeRecipe()});document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('editDialog').hidden)closeForm();else if(!$('recipeModal').hidden)closeRecipe()}});
 $('mobileToggle').addEventListener('click',()=>{$('sidebar').classList.add('open');$('mobileShade').classList.add('open')});$('mobileShade').addEventListener('click',()=>{$('sidebar').classList.remove('open');$('mobileShade').classList.remove('open')});
}
async function detectAI(){if(window.DAPURCERDAS_STANDALONE){
 aiEnabled=true;providerMode='demo';aiModel='simulasi';
 $('chatMode').textContent='Preview simulasi · resep dari katalog (bukan AI sungguhan)';
 $('aiStatus').innerHTML='<span class="status-dot"></span>Simulasi AI';
 $('aiStatus').title='Simulasi Generate + Pause/Stop/Resume memakai resep katalog. Jalankan npm start + Ollama untuk AI lokal sungguhan.';
 $('aiProviderInfo').textContent='Preview simulasi: proses Generate dapat dicoba dengan resep katalog. BUKAN inferensi AI sungguhan; server + Ollama diperlukan untuk membuat resep baru.';
 loadGoogleEngine(PUBLIC_GOOGLE_CSE_ID);
 return;
 }try{
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4200);
 const r=await fetch('/api/health',{signal:controller.signal,cache:'no-store'});clearTimeout(timer);
 const data=await r.json();providerMode=data.mode||'catalog';aiModel=data.model||'';aiEnabled=!!data.aiEnabled;aiTimeoutMs=Number(data.aiTimeoutMs)||95000;
 loadGoogleEngine(data.googleCseId||PUBLIC_GOOGLE_CSE_ID);
 const modeLabel=providerMode==='ollama'?'Ollama lokal':providerMode==='openai'?'OpenAI API':'Katalog offline';
 $('chatMode').textContent=aiEnabled?`${modeLabel} · ${aiModel}`:providerMode==='ollama'?(data.ollamaReady?`Model ${aiModel} belum diunduh`:'Ollama belum berjalan'):'Mode demo katalog';
 $('aiStatus').innerHTML=`<span class="status-dot"></span>${aiEnabled?modeLabel:'Mode Katalog'}`;
 $('aiStatus').title=aiEnabled?`AI siap: ${aiModel}`:providerMode==='ollama'?`Jalankan Ollama dan ollama pull ${aiModel}`:'Gunakan rekomendasi katalog tanpa koneksi model.';
 $('aiProviderInfo').textContent=aiEnabled?`${modeLabel}: ${aiModel} siap digunakan. Resep dan chat diproses melalui server.`:providerMode==='ollama'?`Ollama ${data.ollamaReady?'tersambung, tetapi model '+aiModel+' belum diunduh':'belum tersambung'}. Jalankan Ollama dan ollama pull ${aiModel}.`:'AI online belum tersedia. Katalog tetap dapat digunakan.';
 }catch{aiEnabled=false;providerMode='catalog';$('aiProviderInfo').textContent='Backend belum terhubung; preview katalog tetap berfungsi.'}}

function init(){const today=new Date();$('todayLabel').textContent=new Intl.DateTimeFormat('id-ID',{weekday:'long',day:'numeric',month:'short',year:'numeric'}).format(today);bindEvents();renderAll();const target=window.location.hash.replace('#','');navigate(PAGE_NAMES[target]?target:'beranda');detectAI()}
init();
