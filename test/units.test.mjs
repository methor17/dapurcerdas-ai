import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePantryText, parseRecipeQuantity, standard, quantityLabel} from '../public/units.js';

test('input massal termasuk 10kg daging, 2kg ayam',()=>{
 const items=parsePantryText('10kg daging sapi, 2kg ayam, 6 butir telur, bawang merah 3 ons');
 assert.deepEqual(items.map(({name,qty,unit})=>[name,qty,unit]),[
 ['daging sapi',10,'kg'],['ayam',2,'kg'],['telur',6,'butir'],['bawang merah',3,'ons']]);
});
test('input gram, ons, dan angka desimal Indonesia',()=>{
 const items=parsePantryText('1,5 kg daging; ayam 250 gram; 3 ons tomat');
 assert.deepEqual(items.map(x=>x.qty),[1.5,250,3]);
 assert.deepEqual(standard(2,'kg'),{dimension:'mass',amount:2000});
 assert.deepEqual(standard(3,'ons'),{dimension:'mass',amount:300});
 assert.equal(quantityLabel(1500,'mass'),'1,5 kg');
});
test('takaran resep dan dimensi satuan',()=>{
 assert.deepEqual(parseRecipeQuantity('½ sdt'),{qty:0.5,unit:'sdt'});
 assert.deepEqual(parseRecipeQuantity('1,2 liter'),{qty:1.2,unit:'l'});
 assert.equal(parseRecipeQuantity('secukupnya'),null);
 assert.deepEqual(standard(2,'butir'),{dimension:'unit:butir',amount:2});
 assert.notEqual(standard(2,'buah').dimension,standard(200,'g').dimension);
});
