# 20–21.09.2026 Gün Sonu Özeti

Bu özet, 20–21.09 çalışma kapsamını mevcut uygulama ve yapılan doğrulamalar üzerinden anlatır. Kişisel değerlendirme bölümü, kendi deneyimime göre uyarlayabileceğim örnek metindir.

## Eklediğim ve Güncellediğim Dosyalar

Kapak yükleme için `src/config/upload.config.js`, `src/middlewares/upload.middleware.js`, `src/middlewares/post-cover-access.middleware.js` ve `src/controllers/post-cover.controller.js` eklendi. Dosya imzası, güvenli silme ve dışarı verilecek adres için `src/utils/image-signature.js`, `src/utils/safe-unlink.js` ve `src/utils/cover-url.js`; imza kontrolünü denemek için `scripts/check-image-signature.js` hazırlandı. `sql/migrations/013_add_cover_to_posts.sql` ve `sql/schema.sql` ile `cover_path` alanı tanımlandı.

Post modeli, post/public controller'ları, post route'ları, yetki yardımcıları ve limiter tanımları kapak akışına göre güncellendi. `server.js`, `src/app.js`, `.env.example`, `package.json` ve kilit dosyası yükleme ve proxy ayarlarına uyarlandı. `nginx/default.conf`, `compose.yaml`, `Dockerfile`, `.dockerignore`, `.gitignore` ve `uploads/covers/.gitkeep` ile servisler ve kalıcı yükleme dizini düzenlendi. README, upload/nginx notları ve tokensız `postman/node-blog-nginx.postman_environment.example.json` örneği eklendi veya güncellendi; geçici debug/IP ucu kaldırıldı.

## Bir Dosya Yüklenirken Geçtiği Dört Kontrol

Dosya açısından dört temel kontrolü ayırıyorum: yetki, boyut, beyan edilen tür ve içerik imzası. Bearer doğrulaması ve kullanıcı başına saatte 20 istek sınırı da yükleme akışının önünde çalışır.

1. **Yetki:** Post var mı ve isteği yapan post sahibi veya admin mi diye bakılır; bu aşamada dosya henüz diske yazılmaz.
2. **Boyut:** Nginx toplam gövdeyi 3 MB ile, multer dosyayı 2 MB ile sınırlar; aşıma göre farklı JSON 413 kodu döner.
3. **Beyan edilen tür:** Multer yalnız `image/jpeg`, `image/png` ve `image/webp` türlerini kabul eder.
4. **İçerik imzası:** Controller ilk 12 bayttan tanınan türü beyanla karşılaştırır; uyuşmazsa yeni dosyayı siler.

## Sahte PNG Deneyinde Ne Oldu

`printf` ile metin yazıp dosyanın adını `sahte.png` yapmak gerçek bir PNG üretmedi. Dosya `image/png` diye gönderildiğinde MIME izin listesini geçse de imza kontrolünden geçemedi ve `415 COVER_CONTENT_MISMATCH` döndü. Yeni dosya silindi, mevcut kapak kaydı korunarak dosya uzantısına ve istemcinin tür beyanına tek başına güvenilmemesi gerektiği görüldü.

## trust proxy Değerini 1 Yapmasaydım Ne Olurdu

Varsayılan `0` değerinde Express, nginx'ten gelen TCP bağlantısının adresini `request.ip` olarak görürdü. IP kullanan limiter'lar nginx arkasındaki farklı istemcileri aynı IP anahtarında birleştirebilirdi; kullanıcı ID'siyle çalışan `cover_upload` ise bundan aynı şekilde etkilenmez. Tek proxy için `1` kullanmak, nginx'in `X-Forwarded-For` başlığını yeniden yazması ve API portunun dışarı kapalı olması birlikte doğru IP aktarımını sağlar.

## nginx'in Üstlendiği Üç İş

Nginx önce tek HTTP giriş noktası olarak API isteklerini iç ağdaki `api:3000` adresine iletir. İkinci olarak `/uploads/` dosyalarını doğrudan ortak volume'dan sunar ve önbellek başlıklarını ekler; API durduğunda bile mevcut görseller erişilebilir kalır. Üçüncü olarak toplam gövde boyutunu ve upstream bekleme sürelerini sınırlar, tanımlı altyapı hatalarını JSON sözleşmesine çevirir.

## İki Günde En Çok Zorlandığım Konu Neydi

Örnek kişisel değerlendirme: En çok aynı hatanın hangi katmanda üretildiğini ayırmakta zorlandım. Dosya sınırını aşan isteğin uygulamada `COVER_TOO_LARGE`, toplam gövde sınırını aşanın nginx'te `PAYLOAD_TOO_LARGE` aldığını görünce katmanların görevleri netleşti. Regresyondaki boş Bearer isteğinde iki aynı Authorization başlığı nginx'ten HTML 400 getirdi; tekrarlanan başlığı kaldırınca beklenen uygulama JSON 401 yanıtını aldım. Bu örnek, her kırmızı testi doğrudan API hatası saymadan veri, ortam ve proxy farklarını ayrı incelemeyi öğretti.

## Kendi Cümlelerimle Özet

Kapak yüklemek, bir dosyayı kaydetmenin yanında yetkiyi, boyutu, türü ve veritabanıyla dosya sisteminin sırasını yönetmek demek. Nginx'i tek giriş noktası yapınca API portunu dışarı kapatabildim ve görselleri uygulama sürecinden bağımsız sunabildim. Postman'da nginx ortamıyla normal regresyonda 534, rate limit açık ayrı koşuda 31 test geçti; iki farklı istemci kendi altı login denemesinde ayrı ayrı beş 401 ve bir 429 aldı. Buna rağmen yedekleme, EXIF temizliği, görsel boyutlandırma, sahipsiz dosya temizliği ve HTTPS hâlâ sonraki işler arasında.
