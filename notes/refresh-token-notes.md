# Refresh Token ve httpOnly Cookie Notları

## Kurulum

Temiz kurulumda `sql/schema.sql`, `refresh_tokens` tablosunu içerir. Mevcut veritabanında tablo yoksa `sql/migrations/014_create_refresh_tokens.sql` uygulanmalıdır. Aynı tabloyu yeniden oluşturmak için migration'ı tekrar çalıştırmayın.

`REFRESH_TOKEN_TTL_SECONDS`, 3600–2592000 saniye arasında bir tam sayı olmalıdır; varsayılanı 604800 saniyedir (7 gün). `REFRESH_COOKIE_SECURE` varsayılan olarak `true` olur. Yerel HTTP ve HTTPS sunmayan Docker kurulumu için `false` kullanılır; `NODE_ENV=production` iken `false`, sunucunun açılışta hata vermesine neden olur.

## Oturum Akışı

- Login yanıtının gövdesinde access token bulunur; varsayılan ömrü 900 saniyedir (15 dakika). Refresh token yalnız `refresh_token` cookie'sine yazılır.
- Cookie `HttpOnly`, `SameSite=Strict`, `Path=/api/v1/auth` ve yapılandırmaya göre `Secure` özelliklerini taşır. Silme işlemi aynı cookie kapsamını kullanır.
- Veritabanı ham token yerine SHA-256 özetini saklar. Her giriş ayrı bir `family_id` oluşturur.
- Refresh, kaydı `FOR UPDATE` ile kilitler; eski kayda `used_at` yazar ve aynı aileye yeni kayıt ekler. İşlemler tek transaction içinde tamamlanır.
- Kullanılmış token yeniden sunulursa aile iptal edilir. İptal transaction'ı commit edildikten sonra `401 REFRESH_TOKEN_REUSED` döner.
- Logout, kullanılan access token'ın `jti` değerini ve giriş yapan kullanıcıya ait cookie'deki refresh token ailesini iptal eder; cookie'yi siler. Diğer girişlerin aileleri korunur.
- Parola değişikliği ve parola sıfırlama, kullanıcının bütün refresh token ailelerini iptal eder.
- Pasif veya silinmiş kullanıcının refresh isteği aileyi iptal eder; hesabın yeniden açılması eski refresh oturumunu geri getirmez.

## Hata Kodları

| HTTP | Kod | Anlamı |
| --- | --- | --- |
| 401 | `REFRESH_TOKEN_MISSING` | Cookie yok veya boş |
| 401 | `REFRESH_TOKEN_INVALID` | Token biçimi geçersiz, kayıt yok, süresi dolmuş veya iptal edilmiş; kullanıcı pasif ya da silinmiş |
| 401 | `REFRESH_TOKEN_REUSED` | Kullanılmış token yeniden gönderildi; aile iptal edildi |
| 429 | `RATE_LIMITED` | IP başına dakikada 60 refresh isteği sınırı aşıldı |

401 yanıtlarında cookie silinir. 500 gibi geçici hatalarda silinmez. Mevcut uygulama, cookie'nin zaten bulunmadığı veya boş olduğu `REFRESH_TOKEN_MISSING` yanıtında ayrıca silme başlığı göndermez.

## Postman Kontrolü

`postman/node-blog-api.postman_collection.json` dosyasını içe aktarın. `base_url`, `reader_email` ve `reader_password` environment değişkenlerini hazırlayın; reader hesabı aktif ve e-postası doğrulanmış olmalıdır. Yerel nginx adresi `http://127.0.0.1:8080` olur.

`13 Refresh Token` klasöründeki dokuz isteği sırasıyla çalıştırın. Akış giriş, rotation, yenilenen access token ile `me`, eski cookie'nin tekrar kullanılması, ailenin iptal edildiğinin doğrulanması, eksik cookie, yeniden giriş, logout ve logout öncesi cookie'nin reddedilmesini kapsar.

Normal isteklerde cookie jar açık kalır. Eski token'ı elle gönderen `13.4` ve `13.9` isteklerinde cookie jar kapalıdır; `Cookie` başlığı collection değişkeninden gelir. Postman, `SameSite` kısıtlamasını uygulamaz; bu davranış tarayıcıda doğrulanmalıdır.

## Sınırlamalar ve Sonraki Adımlar

- XSS ile çalışan script refresh isteği yapıp access token alabilir; `HttpOnly`, refresh token'ın JavaScript tarafından okunmasını engeller.
- Reuse tespiti, daha önce verilmiş access token'ları iptal etmez; varsayılan ayarda en çok 15 dakika daha geçerli kalabilirler.
- Süre kayandır: her refresh varsayılan 7 günü yeniden başlatır. Mutlak oturum ömrü eklenmelidir.
- Refresh yanıtı kaybolursa eski cookie ile tekrar deneme reuse sayılır ve oturumu kapatır; grace period yoktur.
- Açık oturumları listeleme ve tek oturumu kapatma özelliği eklenmelidir.
- Süresi dolmuş veya iptal edilmiş refresh token kayıtları ile access token revocation kayıtlarını temizleyen script eklenmelidir.
