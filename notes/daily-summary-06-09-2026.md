# 06.09.2026 Gün Sonu Özeti

Bu özeti son commit olan `0c0db33` (`Merge pull request #4 from ismailarat56/feature/category-auth-jwtv2`) sonrasındaki çalışma alanı değişikliklerine göre hazırladım. Kapsama henüz Git takibine alınmamış yeni dosyaları da dahil ettim. Daha önce var olan JWT login/logout, scrypt parola sistemi ve Category CRUD altyapısını bugün eklenmiş özellikler olarak saymadım; yalnızca yeni rol ve Post çalışmalarına etkilerini açıkladım.

Kodda bulunan davranışları, hazırlanmış test senaryolarını ve gerçekten gözlemlenen sonuçları ayırdım. Çalıştırma çıktısı bulunmayan deneyler için ölçüm veya başarılı test sonucu yazmadım.

## Eklediğim ve Güncellediğim Dosyalar

Son commit sonrasında eklenen dosyalar:

| Dosya | İçerik / Durum |
| --- | --- |
| `src/middlewares/authorize.middleware.js` | `requireRole` ve `isAdmin` yardımcıları |
| `scripts/set-user-role.js` | Mevcut kullanıcının rolünü bootstrap ile değiştirme |
| `scripts/n-plus-one-experiment.js` | JOIN olmadan ve JOIN ile sorgu sayısını karşılaştıran deney |
| `sql/migrations/007_add_role_to_users.sql` | users.role alanı ve indeksi |
| `sql/migrations/007_add_role_to_users_rollback.sql` | Rol alanını ve indeksini geri alma |
| `sql/migrations/008_create_posts.sql` | Posts tablosu, foreign key ve indeksler |
| `sql/migrations/008_create_posts_rollback.sql` | Posts tablosunu kaldırma |
| `src/routes/post.routes.js` | Dokuz Post endpoint’i |
| `src/controllers/post.controller.js` | Post iş kuralları, sahiplik ve yayınlama |
| `src/models/post.model.js` | JOIN, filtreleme, CRUD ve conditional update sorguları |
| `src/validators/post.validator.js` | Post body ve query doğrulaması |
| `src/utils/slugify.js` | Türkçe karakter dönüşümü ve slug üretimi |
| `notes/authorization-notes.md` | Authentication, authorization ve erişim kontrolü kavramları |
| `notes/post-api-notes.md` | Dosya eklenmiş, içeriği henüz boş |
| `notes/linux-date-notes.md` | Dosya eklenmiş, içeriği henüz boş |
| `notes/daily-summary-06-09-2026.md` | Bu gün sonu özeti |

Son commit sonrasında güncellenen dosyalar:

| Dosya | Değişiklik |
| --- | --- |
| `README.md` | V4 özellikleri, endpoint/yetki tabloları, bootstrap, Post kuralları, curl örnekleri ve test matrisi |
| `package.json` | `set-user-role` npm komutu |
| `sql/schema.sql` | Güncel şemaya role ve posts eklenmesi |
| `src/app.js` | `/api/v1/posts` router’ının bağlanması |
| `src/routes/user.routes.js` | Tüm user route’larının authentication ve admin kontrolüne alınması; role endpoint’i |
| `src/controllers/user.controller.js` | `changeRole` işlemi ve kendi rolünü değiştirme engeli |
| `src/models/user.model.js` | Liste/detayda role seçilmesi ve `updateUserRole` sorgusu |
| `src/validators/user.validator.js` | Create alan allowlist’i, role doğrulaması ve parola hata mesajının mevcut 8–128 kuralıyla eşleştirilmesi |
| `src/models/auth.model.js` | Login ve authenticated user sorgularına role eklenmesi |
| `src/controllers/category.controller.js` | Silmeden önce bağlı silinmemiş post sayısının kontrolü |
| `src/middlewares/error.middleware.js` | MySQL foreign key hatalarının API hatalarına dönüştürülmesi |

Eski `scripts/set-user-password.js`, authentication middleware ve JWT yardımcıları bu diff’te değişmedi. Yeni rol akışında mevcut altyapıyı kullandım. Yeni kalıcı environment değişkeni eklemedim; bootstrap için geçici `BOOTSTRAP_EMAIL` ve `BOOTSTRAP_ROLE` kullanımını belgeledim.

## Authentication ile Authorization Arasındaki Fark Nedir?

Authentication kullanıcının kimliğini doğrular; authorization o kullanıcının hangi işlemi yapabileceğine karar verir. Önceden var olan token doğrulamasının üzerine bugün rol ve Post sahipliği kontrollerini ekledim. Böylece geçerli token sahibi olmak, user yönetimine veya başkasının postunu değiştirmeye tek başına yetmiyor.

## Role Alanını Neden ENUM ile Ekledim?

`users.role` alanını `ENUM('user', 'admin') NOT NULL DEFAULT 'user'` olarak tanımladım. Uygulamanın iki tanımlı rolünü veritabanı şemasında ifade ettim ve yeni kullanıcıların varsayılan olarak düşük yetkili başlamasını sağladım. Role için ayrıca indeks ekledim. Yeni rol eklemek ileride şema ve validator değişikliği gerektirecek.

## Role Neden JWT İçinde Değil?

Mevcut JWT yapısını değiştirmedim. Authentication akışının her istekte okuduğu kullanıcı sorgusuna `role` alanını ekledim. Yetki kararı veritabanındaki güncel role göre veriliyor; kullanıcı admin yapıldığında veya user rolüne indirildiğinde token süresinin dolmasını beklemek gerekmiyor. Bu tercih her authenticated istekte veritabanına bağımlılığı sürdürüyor.

## İlk Admini Nasıl Oluşturdum?

İlk admin için public kayıt veya yetkisiz rol yükseltme endpoint’i açmadım. Mevcut kullanıcının parolasını eski `set-user-password` scriptiyle, rolünü yeni `set-user-role` scriptiyle hazırlayan bootstrap akışını belgeledim:

```bash
BOOTSTRAP_EMAIL='ali@example.com' \
BOOTSTRAP_ROLE='admin' \
npm run set-user-role
```

Script `deleted_at IS NULL` olan mevcut kullanıcıyı günceller; kullanıcı oluşturmaz ve `is_active` değerini değiştirmez. Temiz kurulumda önce kullanıcı kaydının oluşturulması gerekir. Bu özette bootstrap yöntemini kaydettim; başarılı admin oluşturma çıktısı bulunmadığı için veritabanında tamamlandığını iddia etmiyorum.

## requireRole Middleware Nasıl Çalışıyor?

`requireRole('admin')`, izin verilen rolleri bir Set içinde tutan middleware üretir. `request.user` veya role yoksa `401 AUTHENTICATION_REQUIRED`, kullanıcının rolü izin verilenlerden değilse `403 FORBIDDEN` üretir. Role uygun olduğunda `next()` çağrılır. Hatalı middleware konfigürasyonu da başlangıçta reddedilir.

User router’ında sıralamayı authentication → role kontrolü → endpoint olacak şekilde düzenledim. Böylece role kontrolünden önce `request.user` hazırlanır.

## User Endpointlerini Neden Admin ile Sınırladım?

Kullanıcı oluşturma, listeleme, güncelleme, silme ve rol değiştirme işlemleri diğer hesapları etkiliyor. Son commit’te bazı user route’ları authentication middleware’inden önce tanımlanıyordu. Middleware’i router’ın başına taşıdım ve ardından admin şartı ekledim. Böylece bütün user endpoint’leri aynı erişim sınırına alındı. Normal kullanıcı kendi bilgilerini mevcut `/auth/me` üzerinden görebilir.

## Role Mass Assignment Nasıl Engellendi?

`POST /users` için yalnızca `name`, `email`, `password` alanlarını kabul eden allowlist ekledim. Body’ye `role` eklemek `422 UNSUPPORTED_FIELDS` üretir. Normal PATCH allowlist’i zaten role içermiyor; PUT ise yalnızca name/email alanlarını modele geçiriyor, role yazmıyor.

Rol değişikliğini ayrı `PATCH /users/:id/role` endpoint’ine ayırdım. Bu endpoint admin gerektiriyor ve yalnızca `role` alanını kabul ediyor. Geçersiz rol `422 INVALID_USER_ROLE`, ek alan ise `422 UNSUPPORTED_ROLE_FIELDS` üretiyor.

## Admin Neden Kendi Rolünü Değiştiremiyor?

İstek yapan adminin ID’si hedef kullanıcı ID’siyle aynıysa `409 CANNOT_CHANGE_OWN_ROLE` döndürüyorum. Bu kontrol, adminin bu endpoint üzerinden yanlışlıkla kendi yönetim yetkisini kaldırmasını önlüyor. Ancak son adminin silinmesini, pasifleştirilmesini veya başka bir admin tarafından rolünün değiştirilmesini engelleyen kapsamlı bir kural henüz yok.

## 401 ile 403 Arasındaki Fark Nedir?

`401`, kimlik doğrulamasının bulunmadığını veya geçersiz olduğunu; `403`, kimliği doğrulanan kullanıcının gerekli yetkiye sahip olmadığını belirtir. Bugün eklediğim admin kontrolü normal kullanıcı için `403 FORBIDDEN`, Post sahiplik kontrolü ise `403 POST_FORBIDDEN` üretiyor.

Mevcut Bearer authentication hatalarında `WWW-Authenticate: Bearer realm="api"` header’ı bulunur; 403’te bulunmaz. Header hiç gönderilmemesi ile `Authorization: Bearer ` gibi token’ı boş bir header gönderilmesi farklıdır: ikincisi `INVALID_AUTHORIZATION_HEADER` üretir.

## Posts Tablosunu Nasıl Tasarladım?

`008_create_posts.sql` ile Post kaynağını ekledim. Tablo; yazar ve category bağlantıları, title, unique slug, nullable excerpt, content, draft/published status, nullable published_at ve oluşturma/güncelleme/silme tarihlerini içeriyor.

`user_id`, `category_id`, status/published_at ve deleted_at/created_at alanları için indeksler tanımladım. Varsayılan status `draft`, published_at ve deleted_at değerleri null. Güncel temiz kurulum şemasını da aynı modelle güncelledim ve posts rollback dosyasını ekledim. Migration dosyasının varlığı, canlı veritabanına uygulandığının kanıtı değildir.

## Foreign Key ON DELETE RESTRICT Ne Sağlıyor?

Postların users ve categories bağlantılarına `ON DELETE RESTRICT` ekledim. Bağlı post varken yazar veya category satırının fiziksel olarak silinmesini engeller. Ancak soft delete bir UPDATE olduğu için foreign key bu işlemi engellemez. Category soft delete kuralını bu nedenle controller’da ayrıca kontrol ediyorum.

## Slugı Neden Server Tarafında Ürettim?

Slug biçimini ve benzersizlik kontrolünü tek yerde yönetmek için oluşturmayı sunucuya bıraktım. Client title gönderiyor; controller slug üretiyor. Create, PUT ve PATCH body’sinde slug göndermek reddediliyor. Başlık sonradan değiştiğinde slug korunuyor.

## Türkçe Karakterleri Sluga Nasıl Çevirdim?

`slugify.js` içinde ç, ğ, ı, İ, ö, ş ve ü karakterleri için ASCII karşılıkları tanımladım. Ardından Unicode normalizasyonu, birleşik işaretlerin temizlenmesi, küçük harfe çevirme ve harf/sayı dışındaki grupları tireye dönüştürme uygulanıyor. Baş/son tireleri temizleyip temel slug’ı 200 karakterle sınırladım.

Örnek dönüşüm: `Node.js ile İlk API’m` → `node-js-ile-ilk-api-m`.

## Duplicate Slug Nasıl Çözüldü?

Oluşturma sırasında temel slug’ın kullanılıp kullanılmadığını kontrol ediyorum. Doluysa `-2`, `-3` gibi eklerle yeni adaylar deneniyor; soft delete edilmiş postların slug’ları da kontrol ediliyor. Boş slug için `post` tabanı kullanılıyor. Deneme sınırı aşılırsa `409 POST_SLUG_UNAVAILABLE` dönüyor.

Veritabanındaki unique indeks son korumayı sağlıyor. Kontrol ve INSERT ayrı işlemler olduğundan eşzamanlı istekler aynı slug’ı seçebilir; bu durumda mevcut duplicate hata eşlemesi `409 DUPLICATE_VALUE` döndürür. Otomatik retry henüz yok.

## user_id Neden Body İçinden Alınmıyor?

Client’ın başka bir kullanıcı adına post oluşturmasını engellemek için yazar ID’sini `request.user.id` üzerinden alıyorum. Body’de `user_id` kabul edilmiyor. Post validator yalnızca `title`, `content`, `excerpt`, `category_id` alanlarına izin veriyor; `status` ve `published_at` da client tarafından yazılamıyor.

## Ownership Kontrolü Hangi Katmanda Yapılıyor?

Sahiplik kontrolünü Post controller’ında yapıyorum. Modelden gelen `post.author.id` ile doğrulanmış kullanıcının ID’sini karşılaştırıyorum. Yazar veya admin değilse PUT, PATCH, publish, unpublish, delete ve restore reddediliyor. Model veritabanı işlemlerini, controller kaynağa özel yetki kararını yürütüyor.

## Başkasının Draftı Neden 404 Dönüyor?

Draft postu yalnızca yazarı veya admin görebiliyor. Başka kullanıcı detay istediğinde `404 POST_NOT_FOUND` döndürerek özel postun varlığını açıklamıyorum. Published postları ise giriş yapmış herkes okuyabiliyor. Yazma işlemindeki yetki reddi ayrı olarak `403 POST_FORBIDDEN` kullanıyor.

## Liste Görünürlüğü Neden SQL İçinde?

Admin olmayan kullanıcılar için sorguya `p.status = 'published' OR p.user_id = ?` koşulunu ekledim. Böylece görünmeyen draftlar LIMIT/OFFSET uygulanmadan önce eleniyor. Aynı filtreyi count sorgusunda da kullanarak total ve sayfa bilgisinin yalnızca görünür kayıtları saymasını sağladım.

Verileri önce çekip JavaScript tarafında filtrelemek sayfa boyutlarını ve toplam sayısını yanlış hale getirebilirdi. `include_deleted=1` isteğini ayrıca controller’da admin ile sınırlandırdım.

## INNER JOIN ile Nested Response Nasıl Üretildi?

Post sorgusunu users ve categories tablolarıyla INNER JOIN üzerinden birleştirdim. SQL’deki `author_id`, `author_name`, `category_id`, `category_name`, `category_slug` alias’larını `mapPostRow` ile nested nesnelere dönüştürdüm:

```json
{
  "author": {"id": 2, "name": "Ayşe Yılmaz"},
  "category": {"id": 1, "name": "Backend", "slug": "backend"}
}
```

Liste kolonları content içermiyor. Detay kolonlarına content ekleniyor; mapper yalnızca sorgu sonucunda varsa bu alanı response’a koyuyor. JOIN koşulları yazar/category aktifliğini veya soft delete durumunu ayrıca filtrelemiyor.

## N+1 Problemi Nedir ve Deneyde Ne Gördüm?

N+1, önce N kaydı getiren bir sorgu çalıştırıp sonra her kayıt için ayrı ilişki sorgusu göndermektir. Yeni `scripts/n-plus-one-experiment.js` dosyasında JOIN olmadan postları bir kez, her postun yazarını ayrıca sorgulayan yaklaşımı; tek JOIN sorgusuyla karşılaştıran deney hazırladım.

Kodun hesapladığı sorgu sayısı:

| Yaklaşım | N post için sorgu sayısı |
| --- | --- |
| JOIN olmadan, her post için yazar sorgusu | `1 + N` |
| JOIN ile post ve yazar birlikte | `1` |

Örneğin 10 post için 11 sorguya karşı 1 sorgu beklenir; bu örnek ölçülmüş bir çıktı değildir. Deneyin çalıştırma sonucu bu özette mevcut değil, bu yüzden gerçek post sayısı veya süre farkı yazmadım. Script süre ölçmüyor, sorgu sayısını sayaçla hesaplıyor.

```bash
node scripts/n-plus-one-experiment.js
```

Gerçek Post liste endpoint’inde veri ve toplam kayıt sayısı için iki model sorgusu vardır; authentication sorguları da ayrıca çalışır. Bu nedenle “JOIN sayesinde tüm HTTP isteği tek SQL sorgusu yapar” sonucu çıkarılamaz.

## Publish ve Unpublish Nasıl Çalışıyor?

Postu draft olarak oluşturuyorum. Ayrı publish endpoint’i status değerini published, unpublish endpoint’i draft yapıyor. Her iki işlem yazar veya admin gerektiriyor. Zaten yayında olan post için `409 POST_ALREADY_PUBLISHED`, zaten draft olan postu unpublish etmek için `409 POST_NOT_PUBLISHED` dönüyor.

## published_at Neden Korunuyor?

Bu alanı ilk yayınlanma tarihi olarak kullandım. Publish sorgusunda `COALESCE(published_at, CURRENT_TIMESTAMP)` yalnızca null olduğunda tarih yazıyor. Unpublish tarihi silmiyor; tekrar publish ilk tarihi koruyor. Böylece yayından kaldırıp yeniden yayınlamak postun ilk yayın zamanını değiştirmiyor.

## Conditional Update Eşzamanlı Requestte Ne Sağlıyor?

Publish UPDATE sorgusuna `status = 'draft'`, unpublish sorgusuna `status = 'published'` koşulunu ekledim. Her ikisi de `deleted_at IS NULL` şartı taşıyor. Controller’daki okuma ile UPDATE arasında durum değişmişse yanlış geçişin uygulanmasını önlüyor.

UPDATE hiçbir satırı etkilemezse `409 POST_STATE_CONFLICT` dönüyor. Bu koruma durum geçişiyle sınırlı; tüm CRUD işlemlerini kapsayan transaction veya sürüm tabanlı optimistic locking anlamına gelmiyor. Eşzamanlı istek deneyi çıktısı bu özette bulunmuyor.

## Category Silme Kuralı Nedir?

Category silinmeden önce bağlı ve `deleted_at IS NULL` olan postları sayıyorum. Draft veya published ayrımı yapmadan en az bir kayıt varsa `409 CATEGORY_HAS_POSTS` dönüyor; `details.active_posts` bağlı kayıt sayısını gösteriyor.

Tüm bağlı postlar soft delete edilmişse category soft delete edilebilir. Sayım ve silme ayrı sorgular; aralarındaki yarış durumuna karşı transaction/kilit koruması henüz eklenmedi. Post restore ve publish işlemleri de category kullanılabilirliğini yeniden kontrol etmiyor.

## Foreign Key Hataları Nasıl Ele Alınıyor?

Merkezi hata middleware’ine iki MySQL hata eşlemesi ekledim:

| MySQL kodu | HTTP / API kodu | Mesaj |
| --- | --- | --- |
| `ER_NO_REFERENCED_ROW_2` | `422 INVALID_REFERENCE` | Bağlı kayıt bulunamadı. |
| `ER_ROW_IS_REFERENCED_2` | `409 RESOURCE_IN_USE` | Kayıt başka kayıtlar tarafından kullanılıyor. |

Böylece referans hataları genel 500 yerine anlamlı client hatalarına dönüşüyor. Post create/update sırasında category’nin yok, pasif veya silinmiş olması ayrıca iş kuralı olarak `422 CATEGORY_NOT_AVAILABLE` ile ele alınıyor.

## curl ile Role Testlerini Nasıl Yaptım?

README’ye aynı Bash terminalinde yürütülecek login, token çıkarma, normal kullanıcı oluşturma, admin/user erişimini karşılaştırma ve rol değişikliği senaryolarını ekledim. Test kullanıcısını admin yapıp aynı token ile erişimi kontrol eden, ardından tekrar user rolüne indiren akışı hazırladım. Geçersiz rol için 422 ve kendi rolünü değiştirmek için 409 beklentilerini yazdım.

Paylaşılan curl çıktılarında gerçekten gördüğüm sorunlar şunlardı:

- `No host part in the URL`: URL değişkeni boş/hatalı olduğunda istek sunucuya ulaşmıyor.
- `401 INVALID_AUTHORIZATION_HEADER`: token boş veya header biçimi geçersiz.
- `INVALID_JSON` ve curl URL hatası: JSON kapanışı ile `-w` arasında boşluk bulunmaması.
- `404 ROUTE_NOT_FOUND`: method/URL eşleşmiyor; hata body doğrulamasına ulaşmadan oluşuyor. Paylaşılan yanıt tek başına hangi URL’nin hatalı olduğunu kanıtlamıyor.

Yeni örneklerde token ve ID için `${DEGISKEN:?açıklama}` kontrolleri ekledim; token’ın kendisini yazdırmak yerine uzunluğunu gösterdim. Başarılı role testlerinin tam çıktıları bulunmadığından bütün yetki matrisinin geçtiğini kaydetmedim. README’nin Bash/JSON sözdizimi kontrolleri yapıldı; bunlar canlı API testi değildir.

## curl ile Post CRUD’ı Nasıl Test Ettim?

Yeni README’de test category’si ve kullanıcı postu oluşturma, liste/detay karşılaştırma, PUT/PATCH, publish/unpublish, soft delete/restore ve temizlik akışını hazırladım. Adminin oluşturduğu ayrı draft üzerinde normal kullanıcının 404/403 alması ve include_deleted sınırı için de örnekler ekledim.

Kontrol edilmesi gereken sonuçları test matrisine yazdım: create için 201; client’ın status yazması için 422; tekrar publish ve bağlı post varken category silme için 409; listede content olmaması ve ilk published_at değerinin korunması.

Bu Post akışının canlı API çalıştırma çıktısı bu özette bulunmuyor. Dolayısıyla bu bölüm hazırlanmış doğrulama senaryolarını anlatıyor; tüm CRUD testlerinin başarıyla çalıştığı anlamına gelmiyor.

## MySQL TIMESTAMP ile Shell date Arasında Ne Fark Gördüm?

Yeni Post modelinde tarihleri MySQL `CURRENT_TIMESTAMP` ile, README örneklerinde test etiketi ve zaman gösterimini shell `date` ile ele aldım. MySQL TIMESTAMP zaman dönüşümleri veritabanı oturumunun saat diliminden etkilenir. Shell `date` ise çalıştığı ortamın saat dilimini kullanır; `date -u` UTC, `date +%s` Unix saniyesi gösterir. JSON tarihinin sonundaki `Z` UTC gösterimidir.

Bu nedenle farklı görünen saat metinleri tek başına farklı anları gösterdiklerini kanıtlamaz; saat dilimleri birlikte kontrol edilmelidir. Aynı anda alınmış MySQL ve shell çıktısı olmadığı için bu projede ölçülmüş bir saat farkı kaydetmedim. `notes/linux-date-notes.md` henüz boş; komut örnekleri README’ye eklendi. Mevcut bağlantı ayarında açık timezone seçimi yok.

## Production Öncesi Eksik Güvenlikler

Bugünkü rol ve Post çalışmasının bıraktığı başlıca açık noktalar:

- Son adminin silinmesini/pasifleştirilmesini engelleyen kapsamlı koruma ve role değişiklikleri için audit kaydı eklenmeli.
- Category silme ile post oluşturma arasındaki yarış durumu; restore/publish sırasında category kullanılabilirliği ele alınmalı.
- Slug kontrolü ile INSERT arasındaki unique çakışmasına karşı retry yaklaşımı değerlendirilmeli.
- Role, sahiplik, draft görünürlüğü ve eşzamanlı yayınlama senaryoları otomatik entegrasyon testleriyle doğrulanmalı.
- Yeni Post validator’ının 50000 karakterlik içerik sınırı, mevcut 20 KB JSON body limitiyle tutarlı hale getirilmeli.
- Yeni include_deleted kontrolündeki `FORBIDDEN` mesaj/details biçimi genel role hatasıyla sözleşme açısından netleştirilmeli.
- `notes/post-api-notes.md` ve hata contractları tamamlanmalı; hazır doküman ile doğrulanmış test sonuçları ayrı tutulmalı.

Yeni yetkilendirme akışının dayandığı eski authentication altyapısında login rate limit, refresh token/parola sıfırlama gibi ek mekanizmalar ve iptal edilmiş token kayıtlarının periyodik temizliği henüz yok. Bunlar bugün eklenmiş veya düzeltilmiş özellikler değil, production öncesinde ayrıca ele alınacak mevcut eksiklerdir.
