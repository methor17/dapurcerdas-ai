/* 80+ resep dasar Nusantara buatan sendiri, dengan pengelompokan bahan dan urutan memasak.
   Resep rumahan disederhanakan; bukan klaim sebagai resep otentik tunggal dari setiap daerah. */
const DATA = `
Ayam Betutu Bali|Ayam|kukus|Bali|ayam:600 g|kemiri:3 butir;kunyit:3 cm;kencur:2 cm;cabai merah:5 buah|serai:2 batang;daun salam:2 lembar;daun jeruk:3 lembar|daun pisang:3 lembar;minyak:2 sdm|90
Ayam Woku Belanga|Ayam|tumis|Sulawesi Utara|ayam:600 g|cabai merah:6 buah;kunyit:2 cm;jahe:3 cm|daun pandan:1 lembar;daun kunyit:1 lembar;serai:2 batang;kemangi:1 genggam|air:250 ml|55
Ayam Taliwang|Ayam|bakar|Nusa Tenggara Barat|ayam:600 g|cabai merah:6 buah;terasi matang:1 sdt;kencur:2 cm|jeruk limau:1 buah|gula merah:1 sdm;kecap manis:1 sdm|60
Ayam Pop Padang|Ayam|rebus|Sumatera Barat|ayam:600 g|kemiri:2 butir;jahe:2 cm|daun salam:2 lembar;serai:1 batang|air kelapa:500 ml;minyak:3 sdm|60
Ayam Bumbu Rujak Jawa|Ayam|santan|Jawa Timur|ayam:600 g|cabai merah:7 buah;kemiri:3 butir;kunyit:2 cm|serai:2 batang;daun jeruk:3 lembar|santan:400 ml;gula merah:1 sdm|55
Ayam Tangkap Aceh|Ayam|goreng|Aceh|ayam:600 g|ketumbar:1 sdt;kunyit:3 cm|daun kari:1 genggam;daun pandan:2 lembar;cabai hijau:5 buah|minyak goreng:400 ml|55
Ayam Lodho Tulungagung|Ayam|santan|Jawa Timur|ayam:600 g|kemiri:4 butir;cabai rawit:4 buah;kencur:2 cm|serai:2 batang;daun salam:3 lembar|santan:500 ml|70
Ayam Cincane Samarinda|Ayam|bakar|Kalimantan Timur|ayam:600 g|cabai merah:5 buah;jahe:2 cm;kemiri:2 butir|serai:2 batang;daun salam:2 lembar|santan:200 ml;gula merah:1 sdm|60
Ayam Goreng Kalasan|Ayam|goreng|Yogyakarta|ayam:600 g|ketumbar:1 sdt;kemiri:2 butir|daun salam:2 lembar;lengkuas:3 cm|air kelapa:500 ml;gula merah:2 sdm;minyak goreng:300 ml|55
Ayam Panggang Padang|Ayam|bakar|Sumatera Barat|ayam:600 g|cabai merah:7 buah;kunyit:2 cm;kemiri:2 butir|daun kunyit:1 lembar;serai:2 batang|santan:400 ml|65
Ayam Iloni Gorontalo|Ayam|bakar|Gorontalo|ayam:600 g|cabai merah:5 buah;kunyit:2 cm;kemiri:3 butir|daun pandan:1 lembar;serai:2 batang|santan:350 ml|60
Ayam Tuturuga Manado|Ayam|santan|Sulawesi Utara|ayam:600 g|cabai merah:6 buah;kunyit:3 cm;jahe:2 cm|daun jeruk:3 lembar;daun pandan:1 lembar;kemangi:1 genggam|santan:450 ml|60
Ayam Bakar Madu Kampung|Ayam|bakar|Jawa|ayam:600 g|ketumbar:1 sdt;kunyit:2 cm|serai:1 batang;daun salam:2 lembar|madu:2 sdm;kecap manis:3 sdm|50
Ayam Kuah Asam Manado|Ayam|kuah|Sulawesi Utara|ayam:500 g;tomat:2 buah|cabai rawit:5 buah;jahe:2 cm|serai:1 batang;daun jeruk:3 lembar|jeruk nipis:1 buah;air:800 ml|45
Ayam Goreng Serundeng|Ayam|goreng|Jawa Barat|ayam:550 g;kelapa parut:150 g|ketumbar:1 sdt;kunyit:2 cm;kemiri:2 butir|lengkuas:4 cm;daun salam:2 lembar|air:350 ml;minyak goreng:300 ml|60
Rendang Daging Padang|Daging|santan|Sumatera Barat|daging sapi:600 g|cabai merah:10 buah;jahe:3 cm;kunyit:2 cm;kemiri:3 butir|daun kunyit:1 lembar;serai:2 batang;lengkuas:4 cm|santan kental:800 ml;asam kandis:2 buah|180
Kalio Daging Minang|Daging|santan|Sumatera Barat|daging sapi:600 g|cabai merah:8 buah;jahe:3 cm;kunyit:2 cm|daun kunyit:1 lembar;serai:2 batang|santan:750 ml;asam kandis:2 buah|100
Dendeng Balado Padang|Daging|goreng|Sumatera Barat|daging sapi:500 g|cabai merah:8 buah;bawang merah:6 siung|daun jeruk:2 lembar;jeruk nipis:1 buah|minyak goreng:250 ml;asam jawa:1 sdt|65
Dendeng Batokok|Daging|goreng|Sumatera Barat|daging sapi:500 g|cabai hijau:9 buah;kemiri:2 butir|daun jeruk:2 lembar;jeruk nipis:1 buah|minyak goreng:250 ml|70
Empal Gepuk Sunda|Daging|goreng|Jawa Barat|daging sapi:550 g|ketumbar:1 sdt;kemiri:3 butir|lengkuas:3 cm;daun salam:3 lembar|air kelapa:550 ml;gula merah:2 sdm;minyak:250 ml|80
Empal Gentong Cirebon|Daging|santan|Jawa Barat|daging sapi:400 g;babat matang:200 g|kemiri:3 butir;kunyit:2 cm;ketumbar:1 sdt|serai:2 batang;daun salam:3 lembar|santan:750 ml;daun kucai:2 batang|90
Tongseng Kambing Solo|Daging|tumis|Jawa Tengah|daging kambing:500 g;kol:150 g;tomat:2 buah|kemiri:3 butir;merica:1 sdt;ketumbar:1 sdt|serai:1 batang;cabai rawit:5 buah|kecap manis:4 sdm;santan:250 ml|60
Sate Maranggi Purwakarta|Daging|sate|Jawa Barat|daging sapi:600 g|ketumbar:1 sdt;jahe:2 cm|tomat:2 buah;cabai rawit:5 buah|kecap manis:4 sdm;asam jawa:1 sdm;tusuk sate:15 buah|65
Sate Padang|Daging|sate|Sumatera Barat|daging sapi:550 g|kunyit:3 cm;jahe:3 cm;ketumbar:1 sdt;cabai merah:4 buah|serai:2 batang;daun kunyit:1 lembar|tepung beras:50 g;air:800 ml;tusuk sate:15 buah|90
Gulai Kambing Jawa|Daging|santan|Jawa|daging kambing:600 g|kemiri:3 butir;kunyit:3 cm;jahe:2 cm;ketumbar:1 sdt|serai:2 batang;daun salam:3 lembar|santan:700 ml|90
Sop Konro Makassar|Daging|kuah|Sulawesi Selatan|iga sapi:700 g|ketumbar:1 sdt;keluak matang:2 buah;pala:¼ sdt;kemiri:3 butir|serai:2 batang;daun salam:2 lembar|air:1,5 liter;asam jawa:1 sdt|110
Coto Makassar|Daging|kuah|Sulawesi Selatan|daging sapi:500 g;paru matang:150 g;kacang tanah:100 g|ketumbar:1 sdt;jintan:½ sdt;kemiri:3 butir|serai:2 batang;lengkuas:3 cm|air:1,5 liter|100
Semur Daging Betawi|Daging|kuah|DKI Jakarta|daging sapi:600 g;kentang:2 buah|pala:¼ sdt;merica:1 sdt;kemiri:2 butir|cengkih:3 butir;kayu manis:1 batang|kecap manis:6 sdm;air:750 ml|75
Rabeg Daging Banten|Daging|kuah|Banten|daging kambing:500 g|jahe:3 cm;merica:1 sdt;pala:¼ sdt|kayu manis:1 batang;cengkih:3 butir|kecap manis:4 sdm;air:650 ml|85
Rawon Daging Surabaya|Daging|kuah|Jawa Timur|daging sapi:500 g;tauge pendek:100 g|keluak matang:4 buah;ketumbar:1 sdt;kunyit:2 cm|serai:2 batang;daun jeruk:4 lembar|air:1,3 liter|100
Soto Betawi Santan|Daging|santan|DKI Jakarta|daging sapi:500 g;kentang:2 buah;tomat:1 buah|kemiri:3 butir;merica:1 sdt;jahe:2 cm|kayu manis:1 batang;daun salam:3 lembar|santan:700 ml;susu cair:200 ml|90
Ikan Arsik Batak|Ikan & Seafood|kuah|Sumatera Utara|ikan mas:600 g;kacang panjang:100 g|andaliman:1 sdt;kunyit:3 cm;kemiri:3 butir|serai:2 batang;asam cikala:2 buah|air:550 ml|60
Ikan Asam Padeh Minang|Ikan & Seafood|kuah|Sumatera Barat|ikan tongkol:600 g|cabai merah:9 buah;kunyit:2 cm;jahe:2 cm|daun kunyit:1 lembar;serai:1 batang|asam kandis:3 buah;air:650 ml|55
Ikan Woku Belanga|Ikan & Seafood|kuah|Sulawesi Utara|ikan kakap:600 g;tomat:2 buah|cabai merah:5 buah;kunyit:2 cm;jahe:2 cm|serai:2 batang;kemangi:1 genggam;daun jeruk:4 lembar|air:450 ml|50
Ikan Bakar Jimbaran|Ikan & Seafood|bakar|Bali|ikan kembung:600 g|cabai merah:6 buah;terasi matang:½ sdt;kemiri:2 butir|jeruk limau:1 buah|kecap manis:3 sdm;minyak:2 sdm|45
Ikan Pesmol Sunda|Ikan & Seafood|goreng|Jawa Barat|ikan nila:600 g;wortel:1 buah|kunyit:3 cm;kemiri:3 butir;jahe:2 cm|cabai rawit:4 buah;daun salam:2 lembar|cuka masak:1 sdm;air:250 ml;minyak:250 ml|50
Ikan Bumbu Kuning|Ikan & Seafood|kuah|Nusantara|ikan kakap:600 g|kunyit:3 cm;kemiri:3 butir;jahe:2 cm|serai:1 batang;daun jeruk:3 lembar|air:450 ml;jeruk nipis:1 buah|45
Pindang Patin Palembang|Ikan & Seafood|kuah|Sumatera Selatan|ikan patin:650 g;nanas:100 g;tomat:2 buah|cabai merah:4 buah;kunyit:2 cm|serai:1 batang;kemangi:1 genggam|asam jawa:1 sdm;air:900 ml|50
Tekwan Palembang|Ikan & Seafood|kuah|Sumatera Selatan|ikan tenggiri giling:350 g;tepung tapioka:120 g;jamur kuping:50 g|bawang putih:4 siung;merica:½ sdt|seledri:2 batang;daun bawang:2 batang|air:1 liter;garam:1 sdt|60
Pempek Lenjer Palembang|Ikan & Seafood|rebus|Sumatera Selatan|ikan tenggiri giling:400 g;tepung tapioka:200 g|bawang putih:3 siung|cabai rawit:4 buah|gula merah:120 g;asam jawa:2 sdm;air:800 ml|75
Ikan Kuah Kuning Papua|Ikan & Seafood|kuah|Papua|ikan kakap:600 g|kunyit:3 cm;jahe:2 cm;kemiri:2 butir|serai:1 batang;kemangi:1 genggam|jeruk nipis:1 buah;air:700 ml|50
Papeda Kuah Ikan Kuning|Ikan & Seafood|kuah|Papua|tepung sagu:200 g;ikan tongkol:450 g|kunyit:3 cm;kemiri:2 butir;jahe:2 cm|serai:1 batang;daun jeruk:2 lembar|air:1,1 liter;jeruk nipis:1 buah|60
Udang Balado Padang|Ikan & Seafood|tumis|Sumatera Barat|udang kupas:550 g|cabai merah:9 buah;tomat:1 buah|daun jeruk:2 lembar|minyak:2 sdm;gula:½ sdt|35
Udang Saus Padang|Ikan & Seafood|tumis|Nusantara|udang:550 g;paprika:1 buah|cabai merah:6 buah;jahe:2 cm|bawang bombai:½ buah;daun bawang:1 batang|saus tomat:3 sdm;saus tiram:1 sdm|35
Cumi Hitam Madura|Ikan & Seafood|tumis|Jawa Timur|cumi utuh segar:550 g|cabai merah:4 buah;jahe:2 cm|serai:1 batang;daun jeruk:3 lembar|air:100 ml;minyak:2 sdm|35
Gulai Kepala Ikan|Ikan & Seafood|santan|Sumatera|kepala ikan kakap:600 g|cabai merah:5 buah;kunyit:3 cm;kemiri:3 butir|daun kunyit:1 lembar;serai:2 batang|santan:650 ml;asam kandis:2 buah|60
Cakalang Fufu Rica|Ikan & Seafood|tumis|Sulawesi Utara|ikan cakalang asap siap makan:450 g|cabai merah:7 buah;jahe:2 cm|daun jeruk:3 lembar;serai:1 batang|minyak:3 sdm|35
Kepiting Saus Tiram|Ikan & Seafood|tumis|Nusantara|kepiting bersih:650 g|bawang putih:5 siung;merica:½ sdt|bawang bombai:½ buah;daun bawang:1 batang|saus tiram:3 sdm;air:200 ml|45
Plecing Kangkung Lombok|Sayur|pecel|Nusa Tenggara Barat|kangkung:2 ikat;tomat:2 buah|cabai rawit:7 buah;terasi matang:½ sdt|jeruk limau:1 buah|gula merah:1 sdt;garam:½ sdt|25
Urap Sayur Jawa|Sayur|pecel|Jawa|bayam:1 ikat;kacang panjang:100 g;tauge:100 g;kelapa parut:200 g|kencur:2 cm;cabai merah:4 buah;terasi matang:¼ sdt|daun jeruk:2 lembar|gula merah:1 sdm;garam:½ sdt|35
Gudeg Nangka Jogja|Sayur|santan|Yogyakarta|nangka muda:600 g;telur rebus:3 butir|ketumbar:1 sdt;kemiri:4 butir|daun salam:4 lembar;lengkuas:4 cm|santan:750 ml;gula merah:100 g|120
Sayur Lodeh Jawa|Sayur|santan|Jawa|labu siam:1 buah;kacang panjang:150 g;terong:1 buah|kemiri:3 butir;ketumbar:½ sdt|lengkuas:3 cm;daun salam:2 lembar|santan:700 ml|45
Gulai Nangka Padang|Sayur|santan|Sumatera Barat|nangka muda:550 g;kacang panjang:100 g|cabai merah:5 buah;kunyit:2 cm;kemiri:3 butir|daun kunyit:1 lembar;serai:1 batang|santan:650 ml|70
Gulai Daun Singkong|Sayur|santan|Sumatera|daun singkong:3 ikat;ikan teri:50 g|cabai merah:4 buah;kemiri:3 butir;kunyit:2 cm|serai:1 batang;daun salam:2 lembar|santan:600 ml|50
Tumis Bunga Pepaya Manado|Sayur|tumis|Sulawesi Utara|bunga pepaya:250 g;ikan teri:70 g|cabai merah:6 buah|daun pandan:1 lembar;daun jeruk:2 lembar|minyak:2 sdm|35
Gulai Pakis Sumatera|Sayur|santan|Sumatera|daun pakis muda:400 g|cabai merah:5 buah;kunyit:2 cm;kemiri:2 butir|serai:1 batang;daun kunyit:1 lembar|santan:550 ml|35
Sayur Bening Bayam|Sayur|kuah|Jawa|bayam:2 ikat;jagung manis:1 buah|bawang putih:2 siung|temu kunci:2 cm|air:900 ml|25
Karedok Sunda|Sayur|pecel|Jawa Barat|mentimun:2 buah;kacang panjang:120 g;tauge:100 g;kol:150 g|cabai rawit:5 buah;kencur:2 cm;kacang tanah sangrai:120 g|jeruk limau:1 buah|gula merah:2 sdm;air matang:100 ml|25
Pecel Madiun|Sayur|pecel|Jawa Timur|bayam:1 ikat;kacang panjang:150 g;tauge:150 g|cabai merah:5 buah;kencur:2 cm;kacang tanah sangrai:160 g|daun jeruk:3 lembar|gula merah:2 sdm;asam jawa:1 sdt|35
Lotek Bandung|Sayur|pecel|Jawa Barat|kangkung:1 ikat;kol:200 g;labu siam:1 buah|cabai rawit:4 buah;kencur:2 cm;kacang tanah goreng:150 g|jeruk limau:1 buah|gula merah:2 sdm;air matang:100 ml|35
Gado-Gado Betawi|Sayur|pecel|DKI Jakarta|kangkung:1 ikat;tauge:150 g;kentang:2 buah;telur rebus:3 butir|cabai merah:4 buah;kacang tanah goreng:150 g|mentimun:1 buah|gula merah:2 sdm;air matang:100 ml|40
Asem-Asem Buncis|Sayur|kuah|Jawa Tengah|buncis:350 g;daging sapi:150 g;tomat:2 buah|bawang putih:3 siung;cabai rawit:4 buah|lengkuas:2 cm;daun salam:2 lembar|asam jawa:1 sdm;air:900 ml|50
Jukut Ares Bali|Sayur|santan|Bali|batang pisang muda:450 g;ayam:200 g|kunyit:2 cm;kemiri:3 butir;kencur:2 cm|serai:1 batang;daun salam:2 lembar|santan:600 ml|60
Tumis Genjer|Sayur|tumis|Jawa|genjer:2 ikat|cabai merah:4 buah;terasi matang:½ sdt|tomat:1 buah|saus tiram:1 sdm;minyak:2 sdm|20
Tumis Daun Pepaya|Sayur|tumis|Sulawesi|daun pepaya muda:2 ikat;ikan teri:80 g|cabai rawit:5 buah|daun jeruk:2 lembar|minyak:2 sdm|30
Tempe Bacem Jogja|Tempe & Tahu|rebus|Yogyakarta|tempe:500 g|ketumbar:1 sdt;kemiri:2 butir|lengkuas:3 cm;daun salam:2 lembar|air kelapa:600 ml;gula merah:65 g;kecap manis:2 sdm|50
Tahu Bacem|Tempe & Tahu|rebus|Jawa Tengah|tahu:8 buah|ketumbar:1 sdt;kemiri:2 butir|daun salam:2 lembar;lengkuas:3 cm|air kelapa:600 ml;gula merah:50 g|45
Orek Tempe Kering|Tempe & Tahu|tumis|Jawa|tempe:500 g;kacang tanah:70 g|cabai merah:5 buah|daun salam:2 lembar;lengkuas:2 cm|kecap manis:3 sdm;gula merah:2 sdm|40
Oseng Tempe Kacang Panjang|Tempe & Tahu|tumis|Jawa|tempe:350 g;kacang panjang:220 g|cabai merah:4 buah|daun salam:1 lembar|kecap manis:2 sdm;minyak:2 sdm|25
Tahu Gejrot Cirebon|Tempe & Tahu|sambal|Jawa Barat|tahu pong:10 buah|cabai rawit:8 buah;asam jawa:1 sdm|bawang merah:4 siung|gula merah:50 g;air:200 ml|20
Tahu Tek Surabaya|Tempe & Tahu|pecel|Jawa Timur|tahu:5 buah;telur:2 butir;kentang:2 buah|kacang tanah goreng:160 g;cabai rawit:4 buah|tauge:100 g|petis udang:2 sdm;kecap manis:2 sdm|35
Tahu Walik Banyuwangi|Tempe & Tahu|goreng|Jawa Timur|tahu pong:12 buah;ayam giling:200 g;tepung tapioka:100 g|bawang putih:4 siung;merica:½ sdt|daun bawang:2 batang|minyak goreng:400 ml|50
Pepes Tahu Kemangi|Tempe & Tahu|kukus|Jawa Barat|tahu putih:500 g;telur:1 butir|cabai merah:3 buah;kemiri:2 butir|kemangi:1 genggam;daun salam:2 lembar|daun pisang:4 lembar|40
Tempe Mendol Malang|Tempe & Tahu|goreng|Jawa Timur|tempe semangit:350 g|kencur:3 cm;cabai rawit:4 buah;ketumbar:½ sdt|daun jeruk:3 lembar|tepung terigu:40 g;minyak goreng:300 ml|35
Semur Tahu|Tempe & Tahu|kuah|Betawi|tahu:8 buah;kentang:2 buah|merica:½ sdt;kemiri:2 butir|cengkih:2 butir;kayu manis:1 batang|kecap manis:5 sdm;air:450 ml|40
Telur Balado Minang|Telur|tumis|Sumatera Barat|telur rebus:6 butir|cabai merah:8 buah;tomat:2 buah|daun jeruk:3 lembar|minyak:2 sdm|30
Telur Pindang Jawa|Telur|rebus|Jawa Tengah|telur:7 butir|ketumbar:1 sdt|daun salam:3 lembar;kulit bawang merah bersih:2 genggam|teh hitam:2 kantong;air:1 liter|90
Telur Bumbu Bali|Telur|tumis|Bali|telur rebus:7 butir|cabai merah:7 buah;kemiri:3 butir;jahe:2 cm|daun jeruk:3 lembar|kecap manis:2 sdm|35
Telur Dadar Padang|Telur|goreng|Sumatera Barat|telur:5 butir;kelapa parut:70 g;tepung beras:2 sdm|cabai merah:4 buah;kunyit:2 cm|daun bawang:2 batang|minyak:120 ml|25
Telur Petis Madura|Telur|kuah|Jawa Timur|telur rebus:6 butir|cabai merah:4 buah;kemiri:2 butir|daun salam:2 lembar|petis udang:2 sdm;air:350 ml|35
Telur Kecap Bawang|Telur|tumis|Jawa|telur rebus:6 butir|merica:½ sdt|bawang bombai:½ buah;cabai merah:2 buah|kecap manis:4 sdm;air:100 ml|25
Nasi Liwet Solo|Nasi & Mi|nasi|Jawa Tengah|beras:400 g;ikan teri:60 g|bawang putih:3 siung|daun salam:2 lembar;serai:2 batang|santan:650 ml|55
Nasi Uduk Betawi|Nasi & Mi|nasi|DKI Jakarta|beras:400 g|bawang putih:2 siung|daun salam:3 lembar;serai:2 batang|santan:650 ml|50
Nasi Kuning Manado|Nasi & Mi|nasi|Sulawesi Utara|beras:400 g|kunyit:3 cm;jahe:2 cm|daun pandan:2 lembar;serai:2 batang|santan:650 ml|55
Nasi Kebuli Betawi|Nasi & Mi|nasi|DKI Jakarta|beras basmati:400 g;daging kambing:250 g|jintan:1 sdt;ketumbar:1 sdt;merica:½ sdt|kayu manis:1 batang;cengkih:3 butir|susu cair:200 ml;air:400 ml|70
Nasi Bogana Tegal|Nasi & Mi|nasi|Jawa Tengah|beras:400 g;ayam:250 g|kemiri:2 butir;kunyit:2 cm|serai:1 batang;daun salam:2 lembar|santan:550 ml|65
Nasi Tutug Oncom|Nasi & Mi|nasi|Jawa Barat|nasi putih:3 piring;oncom:220 g|kencur:2 cm;cabai rawit:4 buah|daun kemangi:1 genggam|minyak:2 sdm|30
Nasi Jamblang Cirebon|Nasi & Mi|nasi|Jawa Barat|beras:400 g;tahu:4 buah;tempe:150 g|cabai merah:4 buah|daun jati layak pangan:3 lembar|air:600 ml|65
Mie Aceh Goreng|Nasi & Mi|mie|Aceh|mie kuning:400 g;daging sapi:200 g;kol:150 g|cabai merah:5 buah;jintan:½ sdt;kunyit:2 cm|daun bawang:2 batang;tomat:1 buah|kecap manis:2 sdm;air:150 ml|40
Mie Kocok Bandung|Nasi & Mi|mie|Jawa Barat|mie kuning:350 g;kikil sapi matang:200 g;tauge:150 g|bawang putih:5 siung;merica:½ sdt|seledri:2 batang;daun bawang:2 batang|air kaldu sapi:1 liter|55
Mie Celor Palembang|Nasi & Mi|mie|Sumatera Selatan|mie kuning:400 g;udang:250 g;tauge:150 g|merica:½ sdt;kemiri:2 butir|daun bawang:2 batang|santan:500 ml;tepung maizena:2 sdm|50
Soto Mie Bogor|Nasi & Mi|kuah|Jawa Barat|mie kuning:250 g;daging sapi:300 g;kol:100 g|kemiri:2 butir;merica:½ sdt|serai:1 batang;daun salam:2 lembar|air:1 liter|65
Nasi Goreng Teri Medan|Nasi & Mi|mie|Sumatera Utara|nasi putih:3 piring;ikan teri:100 g;telur:2 butir|cabai rawit:4 buah;terasi matang:¼ sdt|daun bawang:2 batang|kecap manis:2 sdm;minyak:2 sdm|25
Bihun Goreng Kampung|Nasi & Mi|mie|Jawa|bihun:300 g;telur:2 butir;kol:100 g|merica:½ sdt;kemiri:2 butir|daun bawang:2 batang|kecap manis:2 sdm;minyak:2 sdm|30
Nasi Goreng Ikan Asin|Nasi & Mi|mie|Jawa|nasi putih:3 piring;ikan asin matang:100 g;telur:2 butir|cabai rawit:4 buah|daun bawang:2 batang|kecap manis:2 sdm;minyak:2 sdm|25
`;
const P = (s) => String(s||'').split(';').map(t=>t.trim()).filter(Boolean).map(t=>{const at=t.lastIndexOf(':');return at<0?{name:t,quantity:'secukupnya'}:{name:t.slice(0,at).trim(),quantity:t.slice(at+1).trim()}});
const BASE = {
 kuah: {ground:'bawang merah:5 siung;bawang putih:4 siung;merica:½ sdt',sliced:'',extras:'garam:1 sdt;minyak:2 sdm;air:900 ml'},
 tumis: {ground:'bawang merah:5 siung;bawang putih:4 siung',sliced:'',extras:'garam:¾ sdt;minyak:2 sdm;air:100 ml'},
 santan:{ground:'bawang merah:6 siung;bawang putih:4 siung;kemiri:2 butir',sliced:'',extras:'garam:1 sdt;minyak:2 sdm;santan:600 ml'},
 bakar:{ground:'bawang merah:5 siung;bawang putih:4 siung;ketumbar:½ sdt',sliced:'',extras:'garam:¾ sdt;minyak:2 sdm;air:250 ml'},
 goreng:{ground:'bawang putih:4 siung;ketumbar:½ sdt',sliced:'',extras:'garam:¾ sdt;minyak goreng:250 ml'},
 kukus:{ground:'bawang merah:5 siung;bawang putih:4 siung',sliced:'',extras:'garam:¾ sdt;daun pisang:4 lembar'},
 rebus:{ground:'bawang merah:3 siung;bawang putih:3 siung',sliced:'',extras:'garam:¾ sdt;air:800 ml'},
 pecel:{ground:'bawang putih:2 siung',sliced:'',extras:'garam:½ sdt'},
 sambal:{ground:'bawang putih:2 siung',sliced:'',extras:'garam:½ sdt;air:100 ml'},
 sate:{ground:'bawang merah:5 siung;bawang putih:4 siung;ketumbar:1 sdt',sliced:'',extras:'garam:¾ sdt;minyak:2 sdm;tusuk sate:15 buah'},
 nasi:{ground:'bawang merah:4 siung',sliced:'',extras:'garam:¾ sdt;air:550 ml'},
 mie:{ground:'bawang merah:5 siung;bawang putih:4 siung',sliced:'',extras:'garam:¾ sdt;minyak:2 sdm'}
};
function merge(...groups){const map=new Map();for(const group of groups)for(const item of P(group)){map.set(item.name.toLowerCase(),item)}return [...map.values()]}
function cookingSteps(title,tech,main,ground,sliced,extras){
 const food=main.slice(0,3).map(x=>x.name).join(', '), season=ground.slice(0,6).map(x=>x.name).join(', '), rough=sliced.slice(0,5).map(x=>x.name).join(', ');
 const init=`Siapkan bahan untuk ${title}: cuci dan potong ${food} sesuai kebutuhan. Bahan hewani harus dimasak hingga matang.`;
 const spice=`Haluskan ${season||'bumbu yang diperlukan'}; siapkan ${rough||'bahan pelengkap'} dan takar bumbu lain sebelum mulai.`;
 const common={
 kuah:[`Didihkan air atau kaldu. Tumis bumbu halus hingga harum lalu masukkan bersama ${rough||'rempah'} ke dalam panci.`,`Masukkan bahan yang membutuhkan waktu masak paling lama, lalu bahan yang lebih cepat matang; kecilkan api agar kuah tidak cepat habis.`,`Rebus hingga seluruh bahan matang, koreksi garam dan rasa, lalu sajikan hangat.`],
 tumis:[`Panaskan minyak dan tumis bumbu halus hingga matang dan harum. Masukkan ${rough||'bumbu iris'} lalu aduk.`,`Masukkan ${food}, aduk merata dan tambahkan sedikit air agar bumbu meresap.`,`Masak sambil diaduk sampai semua bahan matang; koreksi rasa sebelum diangkat.`],
 santan:[`Tumis bumbu halus bersama ${rough||'rempah aromatik'} hingga tidak berbau mentah.`,`Masukkan ${food} dan aduk sampai terselimuti bumbu.`,`Tuangkan santan bertahap; masak api kecil sambil sesekali diaduk agar santan tidak pecah.`,`Lanjutkan hingga bahan matang dan kuah sesuai kekentalan hidangan; koreksi garam dan sajikan.`],
 bakar:[`Lumuri ${food} dengan sebagian bumbu halus dan garam, diamkan sekitar 15 menit.`,`Tumis sisa bumbu bersama ${rough||'rempah'}, tambah sedikit air, lalu masak bahan hingga hampir matang.`,`Panaskan alat panggang; bakar sambil dibalik dan dioles sisa bumbu sampai harum dan bagian dalam matang sempurna.`,`Angkat dan sajikan bersama pelengkap yang sesuai.`],
 goreng:[`Baluri ${food} dengan bumbu halus serta garam; diamkan sebentar agar meresap.`,`Panaskan minyak di wajan dengan api sedang. Goreng bertahap agar minyak tidak terlalu penuh.`,`Balik saat bagian bawah kecokelatan dan lanjutkan sampai bagian dalam matang; tiriskan.`,`Jika ada bumbu tumisan atau saus, masak terpisah lalu siram/adu k dengan hasil gorengan; sajikan.`],
 kukus:[`Campurkan ${food} dengan bumbu halus dan ${rough||'rempah'} sampai rata.`,`Siapkan daun pisang yang bersih dan layu sebentar agar lentur; bungkus campuran dengan rapat.`,`Panaskan kukusan sampai beruap lalu kukus sekitar 25–40 menit atau sampai matang menyeluruh.`,`Buka dengan hati-hati, cek kematangan, lalu sajikan hangat.`],
 rebus:[`Didihkan cairan di panci bersama bumbu halus dan ${rough||'rempah aromatik'}.`,`Masukkan ${food} dan rebus dengan api sedang; aduk seperlunya.`,`Jika menggunakan bahan keras atau daging, lanjutkan hingga empuk dan aman dimakan.`,`Sesuaikan rasa serta cairan, lalu sajikan atau tiriskan sesuai jenis hidangan.`],
 pecel:[`Masak sayuran yang perlu direbus sampai matang tapi masih segar; bahan salad mentah seperti mentimun harus dicuci bersih.`,`Ulek bumbu halus bersama kacang (jika digunakan), gula merah dan sedikit air matang hingga menjadi saus yang rata.`,`Susun ${food} pada piring saji dan siram dengan bumbu.`,`Aduk saat akan disantap dan tambahkan pelengkap sesuai selera.`],
 sambal:[`Siapkan bahan utama sesuai jenisnya: goreng atau rebus dahulu jika tidak dapat dimakan mentah.`,`Ulek bumbu halus sampai teksturnya sesuai selera; jika perlu, tumis sebentar hingga matang.`,`Masak ${food} dan aduk bersama bumbu; koreksi rasa dan sajikan.`],
 sate:[`Iris ${food} seukuran sate, balur bumbu halus dan sedikit minyak, diamkan sekitar 15 menit.`,`Tusuk bahan dengan tusuk sate yang bersih; siapkan panggangan dan saus atau kuah pendamping.`,`Panggang sambil dibolak-balik sampai matang sempurna, olesi bumbu seperlunya.`,`Hidangkan sate hangat dengan saus atau sambal pendamping.`],
 nasi:[`Cuci beras hingga air lebih jernih; bila memakai nasi matang, siapkan terpisah dan tidak perlu mencucinya.`,`Tumis bumbu aromatik sebentar jika diperlukan; masukkan beras dan cairan sesuai takaran, serta ${rough||'rempah'} ke rice cooker atau panci.`,`Masak sampai cairan terserap dan nasi matang. Jika nasi sudah matang sejak awal, cukup aduk/tumis dengan bumbu sampai merata.`,`Aduk nasi dan diamkan sebentar agar uap merata. Sajikan bersama lauk pelengkap.`],
 mie:[`Rebus atau seduh mi/bihun sesuai petunjuk sampai hampir matang, tiriskan; jika memakai nasi matang, langsung gunakan untuk ditumis.`,`Tumis bumbu halus, masukkan ${rough||'bahan iris'}, dan bahan protein/sayur hingga matang.`,`Masukkan mi, bihun, atau nasi yang sudah siap; aduk bersama bumbu hingga rata.`,`Sesuaikan tekstur dan rasa lalu sajikan hangat.`]
 };
 const tailored=[];
 if(/Pempek Lenjer/.test(title))return [init,'Aduk ikan giling, bawang putih, air, dan garam. Masukkan tepung tapioka sedikit demi sedikit; aduk ringan hingga dapat dibentuk.','Bentuk adonan memanjang, rebus dalam air mendidih hingga mengapung dan bagian tengah matang. Tiriskan.','Rebus gula merah, asam jawa, cabai dan air hingga menjadi cuko; saring.','Sajikan pempek matang bersama cuko; boleh digoreng sebentar setelah direbus.'];
 if(/Tekwan/.test(title))return [init,'Campur ikan giling, bawang, sedikit air, garam, dan tepung tapioka sampai menyatu. Bentuk bulatan kecil.','Rebus adonan tekwan hingga mengapung dan matang; tiriskan.','Tumis bawang dan merica, masukkan ke kaldu; rebus jamur kuping dan bahan kuah sampai matang.','Masukkan bulatan tekwan, taburi seledri serta daun bawang, sajikan panas.'];
 if(/Papeda/.test(title))return [init,'Campur tepung sagu dengan sebagian air dingin; siram perlahan air yang baru mendidih sambil diaduk cepat hingga bening dan kental.','Haluskan bumbu kuning kemudian tumis bersama serai dan daun jeruk sampai harum.','Tuang air dan didihkan; masukkan ikan dan masak sampai ikan matang.','Sajikan papeda bersama kuah ikan kuning dan perasan jeruk nipis.'];
 if(/Nasi Tutug Oncom/.test(title))return [init,'Sangrai oncom dengan api sedang hingga matang dan aromanya harum.','Haluskan kencur, cabai, dan bawang, tumis hingga matang lalu masukkan oncom.','Campur oncom berbumbu ke nasi putih yang masih hangat dan aduk merata.','Sajikan segera dengan kemangi dan pelengkap pilihan.'];
 if(/Nasi Jamblang/.test(title))return [init,'Cuci beras lalu masak dengan air hingga menjadi nasi yang pulen.','Goreng tahu dan tempe hingga matang; tumis cabai serta bumbu untuk lauk pendamping.','Siapkan daun jati yang bersih dan memang layak untuk kontak makanan, kemudian susun nasi dan lauk di atasnya.','Sajikan selagi hangat sebagai nasi jamblang dengan pilihan lauk sederhana.'];
 if(/Telur Dadar Padang/.test(title))return [init,'Kocok telur bersama kelapa parut, tepung beras, dan bumbu halus sampai tercampur merata.','Panaskan minyak secukupnya dalam wajan agak kecil agar dadar tebal.','Tuang adonan dan masak dengan api kecil sampai bagian bawah kokoh; balik hati-hati.','Lanjutkan hingga bagian tengah matang sempurna, potong dan sajikan.'];
 if(/Tahu Gejrot/.test(title))return [init,'Potong tahu pong menjadi potongan kecil dan tata dalam mangkuk.','Ulek kasar cabai, bawang merah, bawang putih, dan garam.','Rebus gula merah, asam jawa, dan air hingga larut; saring dan tuang ke bumbu ulek.','Siram kuah pedas-asam pada tahu, sajikan segera.'];
 if(/Cumi Hitam/.test(title))return [init,'Bersihkan cumi segar, pertahankan kantung tinta yang layak dan buang bagian keras; cuci seperlunya.','Tumis bumbu halus, serai, dan daun jeruk hingga harum.','Masukkan cumi serta tinta, tambahkan sedikit air, lalu masak sampai cumi matang tanpa merebus terlalu lama.','Koreksi rasa, angkat dan sajikan dengan nasi hangat.'];
 if(/Gudeg Nangka/.test(title))return [init,'Potong nangka muda, cuci lalu rebus sebentar agar getah berkurang.','Haluskan ketumbar, kemiri, bawang dan garam; susun nangka, daun salam, dan lengkuas dalam panci.','Tuangkan santan dan gula merah, masak dengan api kecil dalam waktu lama sambil sesekali mengecek cairan.','Masukkan telur rebus dan lanjutkan sampai nangka sangat empuk serta bumbu meresap dan berwarna cokelat.'];
 return [init,spice,...(common[tech]||common.tumis),...tailored];
}
export const REGIONAL_RECIPES = DATA.trim().split('\n').map((line,index)=>{
 const [title,category,technique,region,main,ground,sliced,extras,min]=line.split('|');
 if(!BASE[technique])throw new Error(`Teknik tidak dikenal: ${technique}`);
 const cfg=BASE[technique],ingredients={main:P(main),ground:merge(cfg.ground,ground),sliced:merge(cfg.sliced,sliced),extras:merge(cfg.extras,extras)};
 const slug=title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 return {id:`nusa-${slug}`,title,emoji:({Ayam:'🍗',Daging:'🥩',Sayur:'🥬',Telur:'🥚','Tempe & Tahu':'🌱','Ikan & Seafood':'🐟','Nasi & Mi':'🍚'})[category]||'🍲',category,minutes:Number(min)||45,servings:3,ingredients,steps:cookingSteps(title,technique,ingredients.main,ingredients.ground,ingredients.sliced,ingredients.extras),tags:[region.toLowerCase(),technique,'nusantara'],region,technique,source:'resep-dasar',note:`Adaptasi resep rumahan berciri ${region}. Sesuaikan tingkat pedas dan kematangan bahan; versi daerah/keluarga bisa berbeda.`};
});
