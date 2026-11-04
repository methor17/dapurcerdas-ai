// Job progress is serializable and stored in browser localStorage after EVERY completed recipe.
export function createGenerationJob(kind,plan=null,total=6,query=''){
 if(!['week','inspiration'].includes(kind))throw Error('Jenis pekerjaan tidak dikenal');
 const slots=kind==='week'?(plan||[]).flatMap((ids,day)=>ids.map((originalId,slot)=>({day,slot,originalId}))):Array.from({length:total},(_,index)=>({index}));
 return {kind,status:'running',total:slots.length,slots,completed:[],query,startedAt:Date.now(),lastError:''};
}
export function generationProgress(job){return {done:job?.completed?.length||0,total:job?.total||0}}
export function nextGenerationSlot(job){if(!job)return null;const done=new Set((job.completed||[]).map(x=>job.kind==='week'?`${x.day}:${x.slot}`:String(x.index)));return job.slots.find(s=>!done.has(job.kind==='week'?`${s.day}:${s.slot}`:String(s.index)))||null;}
export function commitGeneratedSlot(job,slot,recipeId){if(!job||!slot||!recipeId)throw Error('Hasil tidak valid');const key=job.kind==='week'?`${slot.day}:${slot.slot}`:String(slot.index);if(job.completed.some(x=>(job.kind==='week'?`${x.day}:${x.slot}`:String(x.index))===key))return false;job.completed.push({...slot,recipeId});return true}
