import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenerationJob,commitGeneratedSlot,nextGenerationSlot,generationProgress} from '../public/generation-core.js';

test('Menu cepat tersedia dan AI disimpan per-slot (termasuk pause/resume)',()=>{
 const plan=[['s1','s2'],['s3']];
 const job=createGenerationJob('week',plan);
 assert.equal(job.total,3);
 const first=nextGenerationSlot(job);assert.deepEqual({day:first.day,slot:first.slot,originalId:first.originalId},{day:0,slot:0,originalId:'s1'});
 assert.equal(commitGeneratedSlot(job,first,'ai-1'),true);
 assert.equal(commitGeneratedSlot(job,first,'ai-1'),false,'hasil ganda harus ditolak');
 job.status='paused';
 const reloaded=JSON.parse(JSON.stringify(job));
 assert.equal(generationProgress(reloaded).done,1);
 reloaded.status='running';
 assert.equal(nextGenerationSlot(reloaded).originalId,'s2');
 commitGeneratedSlot(reloaded,nextGenerationSlot(reloaded),'ai-2');
 commitGeneratedSlot(reloaded,nextGenerationSlot(reloaded),'ai-3');
 assert.equal(generationProgress(reloaded).done,3);
 assert.equal(nextGenerationSlot(reloaded),null);
});
test('Ide inspirasi juga dapat disimpan bertahap',()=>{
 const job=createGenerationJob('inspiration',null,6,'ayam tanpa santan');
 assert.equal(job.total,6);assert.equal(job.query,'ayam tanpa santan');
 commitGeneratedSlot(job,nextGenerationSlot(job),'ai-a');
 assert.equal(nextGenerationSlot(job).index,1);
 job.status='stopped';
 assert.equal(generationProgress(job).done,1);
});
