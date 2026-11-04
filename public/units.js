/* Konversi satuan Indonesia; digunakan oleh stok, resep dan kekurangan belanja.
   Satuan berbeda dimensi (buah vs kg) TIDAK dianggap sama. */
export const UNITS = [
 ['kg','Kilogram (kg)'],['ons','Ons Indonesia (100 gram)'],['g','Gram (g)'],['mg','Miligram (mg)'],
 ['l','Liter (L)'],['ml','Mililiter (ml)'],['sdm','Sendok makan (sdm)'],['sdt','Sendok teh (sdt)'],
 ['buah','Buah'],['butir','Butir'],['siung','Siung'],['ikat','Ikat'],['batang','Batang'],
 ['lembar','Lembar'],['papan','Papan'],['potong','Potong'],['bungkus','Bungkus'],
 ['sachet','Sachet'],['botol','Botol'],['kaleng','Kaleng'],['kotak','Kotak'],['ekor','Ekor'],
 ['piring','Piring'],['gelas','Gelas'],['cup','Cup'],['genggam','Genggam'],['cm','Sentimeter (cm)'],
 ['pcs','Pcs'],['tusuk','Tusuk'],['rumpun','Rumpun'],['pack','Pack'],['dus','Dus'],['karung','Karung'],['renceng','Renceng'],['toples','Toples'],['rol','Rol'],['paket','Paket']
];
const UNIT_ALIAS={kilogram:'kg',kilo:'kg',kgs:'kg',gram:'g',gr:'g',grams:'g',milligram:'mg',miligram:'mg',liter:'l',litre:'l',ltr:'l',lit:'l',mililiter:'ml',milliliter:'ml',sendokmakan:'sdm',sendokteh:'sdt',pcs:'pcs',piece:'pcs',biji:'buah',potongan:'potong',lembaran:'lembar',btr:'butir',sng:'siung'};
const ALL_UNIT_TOKENS=[...new Set([...UNITS.map(u=>u[0]),...Object.keys(UNIT_ALIAS)])].sort((a,b)=>b.length-a.length).map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
export const normalizeUnit = unit => UNIT_ALIAS[String(unit||'').toLowerCase().replace(/\s+/g,'')]||String(unit||'').toLowerCase().trim();
export function numeric(raw){let s=String(raw??'').trim().replace(',', '.');const fractions={'½':.5,'¼':.25,'¾':.75,'⅓':1/3,'⅔':2/3};if(s in fractions)return fractions[s];if(/^\d+\s*\/\s*\d+$/.test(s)){const [a,b]=s.split('/').map(Number);return b?a/b:NaN}if(/^\d+\s+[½¼¾]$/.test(s))return Number(s.split(' ')[0])+fractions[s.at(-1)];return Number(s)}
const NUM='(?:\\d+(?:[.,]\\d+)?|\\d+\\s*/\\s*\\d+|½|¼|¾|⅓|⅔)';
const PREFIX_RE=new RegExp(`^\\s*(${NUM})\\s*(${ALL_UNIT_TOKENS})(?:\\b|(?=\\s))\\s+(.+)$`,'i');
const SUFFIX_RE=new RegExp(`^(.+?)\\s+(${NUM})\\s*(${ALL_UNIT_TOKENS})(?:\\b|$)(.*)$`,'i');
const START_RE=new RegExp(`^\\s*(${NUM})\\s*(${ALL_UNIT_TOKENS})(?:\\b|$)(.*)$`,'i');
export function parsePantryText(text){const out=[];for(const part of String(text||'').replace(/(\d),(\d)/g,'$1.$2').split(/[,;\n]+/)){const item=part.trim();if(!item)continue;let name=item,amount=1,unit='buah';let match=item.match(PREFIX_RE);if(match){amount=numeric(match[1]);unit=normalizeUnit(match[2]);name=match[3].trim()}else{match=item.match(SUFFIX_RE);if(match){name=match[1].trim();amount=numeric(match[2]);unit=normalizeUnit(match[3]);}else{const maybe=item.match(new RegExp(`^(.+?)\\s+(${NUM})\\s*$`,'i'));if(maybe){name=maybe[1];amount=numeric(maybe[2]);}}}if(name&&Number.isFinite(amount)&&amount>0)out.push({name,qty:amount,unit});}
 return out.slice(0,120);
}
export function parseRecipeQuantity(raw){let value=String(raw??'').trim().toLowerCase();if(!value||value.includes('secukupnya')||value.includes('sesuai selera'))return null;
 const m=value.match(START_RE);if(!m)return null;const n=numeric(m[1]);if(!Number.isFinite(n)||n<=0)return null;return {qty:n,unit:normalizeUnit(m[2])};}
export function standard(qty,unit){const u=normalizeUnit(unit);const v=Number(qty);if(!Number.isFinite(v)||v<=0)return null;
 const mass={kg:1000,ons:100,g:1,mg:.001};const volume={l:1000,ml:1,sdm:15,sdt:5};
 if(u in mass)return {dimension:'mass',amount:v*mass[u]};if(u in volume)return {dimension:'volume',amount:v*volume[u]};
 if(UNITS.some(([name])=>name===u))return {dimension:'unit:'+u,amount:v};return null;
}
export function quantityLabel(amount,dimension){if(!Number.isFinite(amount))return 'sesuai kebutuhan';let n=amount,u=dimension;
 if(dimension==='mass'){if(amount>=1000){n=amount/1000;u='kg'}else{u='g'}}
 else if(dimension==='volume'){if(amount>=1000){n=amount/1000;u='L'}else{u='ml'}}
 else if(dimension.startsWith('unit:'))u=dimension.slice(5);
 const rounded=Math.round(n*100)/100;return `${String(rounded).replace('.',',')} ${u}`;
}
