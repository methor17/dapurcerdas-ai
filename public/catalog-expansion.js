/**
 * Variasi resep: tiap varian mengubah bahan dan menambahkan langkah memasak yang eksplisit.
 * Varian adalah adaptasi rumahan dari resep dasar, bukan klaim hidangan tradisional daerah tersendiri.
 */
const byType = {
 'Nasi & Mi': [
 ['Pedas Rawit','cabai rawit','4 buah','ground','Ulek cabai rawit bersama bumbu halus sebelum dimasukkan ke nasi atau mi.'],
 ['Aroma Daun Salam','daun salam','2 lembar','sliced','Masukkan daun salam pada saat memasak nasi atau menumis bumbu; angkat sebelum menyajikan.'],
 ['Cabai Hijau','cabai hijau','4 buah','sliced','Iris cabai hijau dan tumis bersama bumbu sampai layu sebelum mencampurkan nasi atau mi.'],
 ['Serai Harum','serai','1 batang geprek','sliced','Masukkan serai geprek saat nasi ditanak atau mi dimasak dengan bumbu; buang sebelum disantap.'],
 ['Telur Pelengkap','telur','2 butir','main','Masak telur sampai matang secara terpisah, lalu sajikan sebagai pelengkap nasi atau mi.']
 ],
 'Sayur':[
 ['Pedas Rawit','cabai rawit','4 buah','ground','Tambahkan cabai rawit ke dalam bumbu; atur jumlah sesuai toleransi pedas.'],
 ['Aroma Daun Jeruk','daun jeruk','3 lembar','sliced','Sobek daun jeruk lalu masukkan ke dalam bumbu atau saus saat proses pemasakan.'],
 ['Cabai Hijau','cabai hijau','3 buah','sliced','Iris cabai hijau dan campurkan saat menumis bumbu atau menyiapkan saus sayur.'],
 ['Dengan Tempe','tempe','150 g','main','Potong tempe, masak hingga matang, lalu campurkan sebagai lauk pendamping sayuran.'],
 ['Dengan Jamur','jamur tiram','150 g','main','Bersihkan jamur, masak sampai matang dan campurkan pada sayuran sebelum disajikan.']
 ],
 'Tempe & Tahu':[
 ['Pedas Rawit','cabai rawit','4 buah','ground','Haluskan cabai rawit bersama bumbu untuk memberi rasa pedas.'],
 ['Aroma Daun Jeruk','daun jeruk','3 lembar','sliced','Tumis atau rebus bersama daun jeruk yang sudah disobek; keluarkan sebelum menyajikan bila perlu.'],
 ['Cabai Hijau','cabai hijau','3 buah','sliced','Iris cabai hijau dan masukkan saat bumbu dimasak agar aromanya keluar.'],
 ['Serai Jahe','serai','1 batang geprek','sliced','Masukkan serai dan jahe bersama bumbu hingga harum, kemudian lanjutkan resep seperti biasa.','jahe','2 cm'],
 ['Tomat Segar','tomat','2 buah','main','Potong tomat dan tambahkan pada akhir pemasakan atau sebagai sambal pendamping.']
 ],
 default:[
 ['Pedas Rawit','cabai rawit','5 buah','ground','Ulek cabai rawit bersama bumbu halus. Sesuaikan jumlah agar pedasnya tidak berlebihan.'],
 ['Aroma Daun Jeruk','daun jeruk','3 lembar','sliced','Sobek daun jeruk dan masukkan ke bumbu saat mulai ditumis, direbus, atau diungkep.'],
 ['Cabai Hijau','cabai hijau besar','3 buah','sliced','Iris cabai hijau dan campurkan ke bumbu saat dimasak, sampai cabai layu.'],
 ['Serai Jahe','serai','1 batang geprek','sliced','Geprek serai dan jahe, tambahkan saat mengolah bumbu agar aromanya meresap.','jahe','2 cm'],
 ['Kemangi Segar','kemangi','1 genggam','sliced','Cuci kemangi, lalu tambahkan di akhir memasak atau sajikan sebagai lalapan setelah makanan matang.']
 ]
};
function cloneRecipe(r){return {...r,ingredients:Object.fromEntries(['main','ground','sliced','extras'].map(g=>[g,(r.ingredients?.[g]||[]).map(i=>({...i}))])),steps:[...(r.steps||[])],tags:[...(r.tags||[])]};}
function createVariation(base,def,index){const r=cloneRecipe(base);const [suffix,name,quantity,group,step,optional,optionalQuantity]=def;
 r.id=`${base.id}--var-${index+1}`;r.parentId=base.id;r.title=`${base.title} — ${suffix}`;r.source='variasi-nusantara';r.variantLabel=suffix;r.tags.push('variasi nusantara',suffix.toLowerCase());
 const ingredient=r.ingredients[group].find(x=>x.name.toLowerCase()===name.toLowerCase());
 if(!ingredient)r.ingredients[group].push({name,quantity});
 else {const m=String(ingredient.quantity).match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);if(m){const current=Number(m[1].replace(',','.'));const suggested=Number(String(quantity).match(/^(\d+)/)?.[1]||1);ingredient.quantity=`${Math.ceil(Math.max(current*1.5,suggested))} ${m[2]}`;}}
 if(optional&&!r.ingredients[group].some(x=>x.name===optional))r.ingredients[group].push({name:optional,quantity:optionalQuantity});
 r.steps.splice(Math.max(1,r.steps.length-1),0,step);
 r.minutes+=(['Serai Jahe','Dengan Tempe','Dengan Jamur'].includes(suffix)?5:0);
 r.note=`Variasi kreatif ${suffix.toLowerCase()} dari ${base.title}. Bahan dan cara memasak merupakan adaptasi rumahan, bukan klaim resep tradisi asli.`;
 return r;
}
export function expandCatalog(baseRecipes){const results=[];
 for(const original of baseRecipes){const b={...original,source:original.source||'resep-dasar',parentId:null};results.push(b);
  const mods=byType[b.category]||byType.default;mods.forEach((m,i)=>results.push(createVariation(b,m,i)));
 }
 return results;
}
