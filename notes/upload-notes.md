# Dosya Yükleme Notları

## Dosya Adını Neden Sunucu Üretir

İstemcinin gönderdiği dosya adı depolama yolu olarak kullanılmaz; böylece aynı adlı yüklemeler birbirinin üzerine yazmaz ve istemci hedef yolu seçemez. Sunucu `crypto.randomBytes(16)` ile rastgele bir ad üretir, uzantıyı da izin verilen MIME türünden seçer. JPEG için `.jpg`, PNG için `.png`, WebP için `.webp` kullanılır; veritabanında `covers/<rastgele>.png` gibi göreli bir yol tutulur.

## Beyan Edilen Tür ile Gerçek İçerik

Multipart içindeki MIME türü istemcinin beyanıdır; dosyaya `.png` uzantısı vermek veya `image/png` göndermek içeriği PNG yapmaz. Multer önce beyan edilen türü izin listesiyle karşılaştırır, controller ise diske yazılan dosyanın ilk 12 baytında JPEG, PNG veya WebP imzasını arar. Türler uyuşmazsa yeni dosya silinir ve `415 COVER_CONTENT_MISMATCH` döner; mevcut kapak kaydı değiştirilmez. Bu kontrol görseli çözümlemez, EXIF bilgisini temizlemez ve dosyanın tamamen geçerli bir görsel olduğunu garanti etmez.

## İki Yönlü Sıra: Yükleme ve Silme

Yüklemede önce post ve yetki kontrol edilir, ardından yeni dosya yazılıp imzası doğrulanır; yeni `cover_path` veritabanına kaydedildikten sonra eski dosya silinir. Eski kapağı önce silmek, yeni yükleme başarısız olduğunda çalışan kapağı da kaybettirirdi. Silme işleminde önce `cover_path` değeri `NULL` yapılır, sonra dosya kaldırılır ve `204` döner. Veritabanı ile dosya sistemi tek transaction içinde olmadığı için yazma/silme hataları sahipsiz dosya bırakabilir; mevcut kodda bunları tarayan otomatik temizlik işi yoktur.

## Kayıt Var, Dosya Yok

Veritabanında `cover_path` dolu olması dosyanın diskte bulunduğunu kanıtlamaz; dosya elle silinirse API hâlâ aynı `cover_url` değerini döndürebilir. Bu adrese gelen GET isteği nginx'te `404 NOT_FOUND` alır; API veritabanı kaydını bu okuma sırasında otomatik düzeltmez. Kapak silme ucunda `safeUnlink`, bulunmayan dosyanın `ENOENT` hatasını görmezden gelir; veritabanındaki yol boşaltılır ve işlem `204` ile tamamlanır. Veritabanı kaydında zaten kapak yoksa ise `404 COVER_NOT_FOUND` döner.
