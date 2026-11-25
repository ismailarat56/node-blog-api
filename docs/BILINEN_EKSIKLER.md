[← README'ye dön](../README.tr.md)

# Bilinen sınırlamalar ve sonraki adımlar

> Bu belge README'nin önceki sürümünden kelimesi kelimesine taşındı. Metindeki "bu README" ifadeleri o sürümü kasteder.

## Bilinen Sınırlamalar

- XSS olursa sayfadaki script refresh isteği atıp yeni access token alabilir; httpOnly cookie yalnız refresh token'ın okunup dışarı taşınmasını engeller.
- Reuse tespit edilince zaten verilmiş access token'lar süreleri dolana kadar (varsayılan ayarla en çok 15 dakika) geçerli kalır.
- Refresh süresi kayan (sliding); mutlak oturum ömrü yok, her refresh varsayılan 7 günü baştan başlatır.
- Refresh yanıtı yolda kaybolursa istemci eski cookie'yle kalır; sonraki refresh reuse sayılır ve oturum kapanır (grace period yok).
- Süresi dolmuş ve iptal edilmiş refresh token kayıtları tabloda birikir; temizleme scripti yok.
- Kullanıcı açık oturumlarını göremez ve tek tek kapatamaz.
- Postman SameSite özelliğini uygulamaz; SameSite davranışı yalnız tarayıcıda denenebilir.
- Docker'da HTTPS olmadığı için `REFRESH_COOKIE_SECURE=false`; production'da `false` ile sunucu açılmaz.

- Rate limit sayaçları süreç belleğinde; API yeniden başlayınca sıfırlanır, birden fazla API container'ı sayaç paylaşmaz.
- Çok IP'si olan saldırgan login_account limitini IP başına ayrı ayrı kullanabilir; IPv6'da tek kullanıcı çok adrese sahiptir.
- Register limiti yalnız IP başına; +etiket adreslerle aynı gelen kutusuna çok sayıda doğrulama maili gönderilebilir.
- email/change/confirm ve PATCH /password kod denemeleri ayrıca limitlenmedi; kod başına beş deneme ve account_code_mail ile sınırlı.
- Docker database'ine migration elle exec ile çalıştırılır; hangi migrationın koştuğunu tutan tablo yok.
- nginx yalnız 80 portunda düz http dinler; TLS sertifikası ve HTTPS yok.
- Tek API kopyası var; API yeniden başlarken kısa bir 502 penceresi oluşur.
- Yüklenen görseller yalnız uploads-data volume'unda; yedekleme yok.
- Yükleme veya silme sırasında hata olursa sahipsiz dosya kalabilir, temizlik işi yok.
- İmza kontrolü yalnız jpeg, png ve webp başlıklarını tanır; görselin gerçekten açılabildiği doğrulanmaz.
- EXIF verisi (konum bilgisi dahil) temizlenmeden saklanır ve servis edilir.
- Görseller yeniden boyutlandırılmaz; 2 MB'lık orijinal dosya olduğu gibi indirilir.
- TRUST_PROXY_HOPS değeri proxy sayısıyla elle eşleştirilir; yanlış değer IP taklidine açar.
- Otomatik entegrasyon test paketi ve MFA yoktur.
- Post validator 50000 karaktere kadar content kabul etse de Express JSON body limiti 20 KB’dir; büyük içerikler validator’a ulaşmadan 413 alabilir.
- JSON parser request logger’dan önce çalışır. Bozuk/aşırı büyük JSON hatalarında request_id null olabilir.
- `FORBIDDEN` response ayrıntıları, role middleware ve include_deleted kontrolünde aynı değildir.
- Bootstrap parola uzunluğu 15–128, kullanıcı oluşturma validator’ında 8–128 karakterdir.
- Kendi rolünü değiştirme engellenir; ancak son adminin silinmesini/pasifleştirilmesini engelleyen genel bir koruma yoktur.
- Slug uygunluk kontrolü ve INSERT aynı atomik işlem değildir; eşzamanlı oluşturmalarda unique çakışması 409 dönebilir.
- Category post sayımı ve silme arasında transaction/kilit yoktur. Eşzamanlı işlemler için ek bütünlük kontrolü gerekir.
- Post restore ve publish category aktifliğini yeniden doğrulamaz. JOIN sorguları yazar/category aktiflik veya silinme durumuna göre ek filtre uygulamaz.
- İptal kayıtları için temizleme model fonksiyonu vardır; otomatik çalışan temizlik görevi yoktur.
- `notes/post-api-notes.md` gibi bazı not dosyaları henüz doldurulmamıştır; bu README güncellemesi o dosyaları tamamlamaz.

## Sonraki Adımlar

- Açık oturumlar listesi ve tek oturumu kapatma
- Süresi dolmuş refresh token ve revocation kayıtlarını temizleyen script
- Mutlak oturum ömrü
- Görsel boyutlandırma ve thumbnail üretimi
- EXIF temizliği
- Sahipsiz dosyaları bulan temizlik scripti
- Paylaşılan rate limit deposu (Redis) ve ikinci API kopyası
- HTTPS sertifikası ve gerçek sunucuya deploy
- Migration takip tablosu veya migration aracı
- Authorization ve Post contractlarını ilgili notes dosyalarında tamamlamak
- Test matrisini otomatik entegrasyon testlerine dönüştürmek
- FORBIDDEN yanıtlarını, parola politikasını ve body/validator boyut sınırlarını tutarlı hale getirmek
- Son admin koruması eklemek
- Category/post eşzamanlılık ve restore/publish kullanılabilirlik kurallarını netleştirmek
- Request ID üretimini JSON parse hatalarını da kapsayacak şekilde geliştirmek
