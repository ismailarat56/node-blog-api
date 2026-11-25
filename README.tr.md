[English](README.md) · **Türkçe**

<div align="center">

# Node Blog API

**Express ve MySQL ile yazılmış, JWT kimlik doğrulamalı blog REST API'si.**

![Express](https://img.shields.io/badge/Express-5.2-222?logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.4-4479A1?logo=mysql&logoColor=white)
![Lisans](https://img.shields.io/badge/lisans-MIT-2ea44f)

[Öne çıkanlar](#öne-çıkanlar) · [Kurulum](#kurulum-ve-çalıştırma) · [Docker](#docker-ile-çalıştırma) · [API özeti](#api-özeti) · [Belgeler](#belgeler)

</div>

Kullanıcı, kategori, yazı ve yorum yönetimi sunan bir blog REST API'si. Node.js, Express 5 ve MySQL ile yazıldı; sorgular ORM olmadan `mysql2` üzerinden parametreli SQL ile çalışır. Uç noktalar `/api/v1` altındadır.

Arayüz ayrı bir repodadır: [node-blog-web](https://github.com/ismailarat56/node-blog-web) (React).

## Öne çıkanlar

- **Kimlik doğrulama:** HS256 imzalı JWT access token (varsayılan 15 dakika); logout token'ı iptal eder.
- **Refresh token:** httpOnly cookie'de tutulur, her yenilemede değişir; kullanılmış token tekrar gelirse oturum ailesi iptal edilir.
- **Roller ve sahiplik:** `user` ve `admin` rolleri her istekte veritabanından okunur; yazılarda yazar veya admin kontrolü yapılır.
- **Kayıt ve doğrulama:** 6 haneli kodla e-posta doğrulama, parola sıfırlama, parola ve e-posta değiştirme.
- **Yazılar:** başlıktan slug üretimi, taslak ve yayın akışı, soft delete ve geri getirme, arama, filtre, sıralama, sayfalama.
- **Yorumlar:** tek seviye yanıt; yazı sahibi veya admin yorumu gizleyebilir.
- **Public uçlar:** yayındaki yazılar, kategoriler ve yorumlar token olmadan okunur (`/api/v1/public`).
- **Kapak görseli:** JPEG, PNG ve WebP yükleme; varsayılan 2 MB sınır ve dosya imzası kontrolü.
- **Rate limiting:** bellek içi sliding window ile 11 ayrı limit; aşımda `429` ve `Retry-After` başlığı.
- **Docker:** API, MySQL 8.4 ve nginx 1.27 için Compose dosyası; API'ye erişim nginx üzerinden sağlanır.
- **Migration ve Postman:** 002-014 numaralı SQL migration dosyaları ve 14 klasörlü Postman koleksiyonu.

## Gereksinimler

- Node.js ve npm. Docker imajı `node:24-alpine` kullanır.
- MySQL. Compose dosyası `mysql:8.4` kullanır.
- Docker ve Docker Compose (isteğe bağlı, konteynerle çalıştırmak için).

## Kurulum ve çalıştırma

```bash
git clone https://github.com/ismailarat56/node-blog-api.git
cd node-blog-api
npm install
cp .env.example .env
```

`.env` içinde `DB_USER` ve `DB_PASSWORD` değerlerini düzenleyin. `JWT_SECRET` en az 32 bayt, `VERIFICATION_CODE_KEY` 64 karakterlik hex olmalıdır; ikincisi boşsa sunucu açılmaz. İkisi için de ayrı ayrı değer üretin:

```bash
node -e 'console.log(require("node:crypto").randomBytes(32).toString("hex"))'
```

Temiz veritabanını kurun ve sunucuyu başlatın:

```bash
mysql -u your_mysql_user -p < sql/schema.sql
npm start
```

Varsayılan adres `http://localhost:3000` olur. `npm start` sunucuyu `node --watch` ile çalıştırır. Kontrol için:

```bash
curl -i http://localhost:3000/health
```

`.env.example` içindeki `MAIL_TRANSPORT=json` ayarıyla gerçek e-posta gönderilmez. İlk admin hesabı için `npm run set-user-password` ve `npm run set-user-role` betikleri kullanılır: [docs/KIMLIK_DOGRULAMA.md](docs/KIMLIK_DOGRULAMA.md#admin-bootstrap).

Ortam değişkenleri ve mevcut veritabanına migration uygulama: [docs/KURULUM.md](docs/KURULUM.md)

## Docker ile çalıştırma

Compose dosyası `.env.docker` (API) ve `.env.db` (MySQL) dosyalarını bekler. İkisinin örnek içeriği [docs/DOCKER.md](docs/DOCKER.md) içindedir. Dosyalar hazır olduğunda:

```bash
docker compose up -d
docker compose ps
curl -i http://127.0.0.1:8080/health
```

nginx `127.0.0.1:8080` adresinde dinler ve istekleri API'ye iletir. API portu host'a açılmaz. Yüklenen kapak görsellerini nginx ortak volume'dan sunar.

## API özeti

| Grup | Yol | Erişim |
| --- | --- | --- |
| Sağlık | `GET /health` | Token gerekmez |
| Public | `GET /api/v1/public/posts`, `/posts/:slug`, `/posts/:slug/comments`, `/categories` | Token gerekmez |
| Auth | `/api/v1/auth`: `login`, `refresh`, `register`, `email/verify`, `email/verify/resend`, `password/forgot`, `password/reset` | Token gerekmez |
| Auth | `/api/v1/auth`: `me`, `logout`, `password`, `password/change-code`, `email/change`, `email/change/confirm` | Giriş yapan herkes |
| Users | `/api/v1/users` | Yalnız admin |
| Categories | `/api/v1/categories` | Okuma: giriş yapan herkes. Yazma: admin |
| Posts | `/api/v1/posts`, `/:id/publish`, `/:id/unpublish`, `/:id/restore` | Okuma ve oluşturma: giriş yapan herkes. Değiştirme: yazar veya admin |
| Kapak | `PUT` ve `DELETE /api/v1/posts/:postId/cover` | Yazar veya admin |
| Yorumlar | `/api/v1/posts/:postId/comments`, `/api/v1/comments/:id`, `/:id/hide`, `/:id/unhide` | Giriş yapan herkes; gizleme: yazı sahibi veya admin |

Korumalı uçlar `Authorization: Bearer <access_token>` başlığı bekler. Eksik veya geçersiz kimlik `401`, yetersiz yetki `403` döner.

Başarılı yanıt ve hata yanıtı biçimi:

```json
{ "success": true, "request_id": "...", "message": "...", "data": {}, "meta": {} }
{ "success": false, "error": { "code": "POST_NOT_FOUND", "message": "...", "details": null }, "request_id": "..." }
```

`message`, `data` ve `meta` yalnız ilgili yanıtlarda bulunur. Tüm uç noktalar, sorgu parametreleri ve hata kodları: [docs/API.md](docs/API.md)

## E-posta ve doğrulama kodları

- `MAIL_TRANSPORT` `smtp` ya da `json` olabilir. `json` modunda e-posta gönderilmez; `smtp` için `SMTP_USER` ve `SMTP_PASS` gerekir.
- Doğrulama kodları 6 hanelidir, 10 dakika geçerlidir ve en fazla 5 kez denenebilir. Yeni kod istemek için 60 saniye beklenir.
- `DEV_MAIL_OUTBOX=true` yalnız `json` modunda ve production dışında açılır; `GET /api/v1/dev/mail-outbox/latest?to=<adres>` son e-postayı döner.
- SMTP bağlantısını denemek için: `node scripts/send-test-mail.js <adres>`

## Belgeler

| Belge | İçerik |
| --- | --- |
| [docs/KURULUM.md](docs/KURULUM.md) | Kurulum, ortam değişkenleri, migration'lar |
| [docs/DOCKER.md](docs/DOCKER.md) | Compose, nginx reverse proxy, boyut sınırları, Docker'da ilk admin |
| [docs/KIMLIK_DOGRULAMA.md](docs/KIMLIK_DOGRULAMA.md) | Roller, yetki tablosu, admin bootstrap, refresh token, güvenlik kararları |
| [docs/API.md](docs/API.md) | Uç noktalar, rate limit tablosu, post veri modeli, kapak yükleme, hata kodları |
| [docs/TESTLER.md](docs/TESTLER.md) | curl senaryoları, test matrisi, Postman koşuları |
| [docs/BILINEN_EKSIKLER.md](docs/BILINEN_EKSIKLER.md) | Bilinen sınırlamalar ve sonraki adımlar |
| [docs/curl-scenarios.md](docs/curl-scenarios.md) | API v2 dönemine ait eski curl senaryoları |

`docs/` altındaki ayrıntı README'nin önceki sürümünden taşındı. Kodla uyuşmayan yerler ilgili belgenin başında not edilmiştir. Konu bazlı çalışma notları `notes/` klasöründedir.

## Klasör yapısı

```
server.js            giriş noktası: ayarları doğrular, MySQL bağlantısını dener, sunucuyu açar
src/
  app.js             Express uygulaması ve route bağlama
  config/            ortam değişkenlerini okuma ve doğrulama
  routes/            auth, users, categories, posts, comments, public, dev
  controllers/       istek işleyiciler
  models/            mysql2 sorguları
  services/          refresh token ve doğrulama kodu akışları
  middlewares/       authenticate, authorize, rate limit, upload, hata yönetimi
  validators/        body ve query doğrulama
  utils/             JWT, parola hash, slug, sayfalama, mail ve cookie yardımcıları
sql/                 schema.sql ve migrations/ (002-014)
scripts/             admin bootstrap, mail testi ve kontrol betikleri
postman/             koleksiyon, örnek environment dosyaları, koşu sonuçları
nginx/               reverse proxy yapılandırması
docs/                ayrıntılı belgeler
notes/               çalışma notları
uploads/covers/      yüklenen kapak görselleri (git'e girmez)
server-memory.js     veritabanı kullanmayan eski CRUD örneği (npm run memory)
```

## Testler

Projede `npm test` betiği ve otomatik entegrasyon test paketi yoktur. Veritabanı gerektirmeyen iki kontrol betiği vardır:

```bash
npm run check-sliding-window
npm run check-image-signature
```

Uçtan uca denemeler Postman ile yapılır. `postman/node-blog-api.postman_collection.json` koleksiyonunu ve `postman/` altındaki örnek environment dosyalarından birini içe aktarın. Klasörler `00 Health` ile `13 Refresh Token` arasında numaralıdır. Sıra, gerekli değişkenler ve curl senaryoları: [docs/TESTLER.md](docs/TESTLER.md)

## Bilinen eksikler

- Otomatik entegrasyon testi yok; doğrulama Postman koşuları ve elle çalıştırılan betiklerle yapılıyor.
- Rate limit sayaçları süreç belleğinde tutulur; API yeniden başlayınca sıfırlanır.
- Migration takip tablosu yok; migration'lar numara sırasıyla elle uygulanır.
- nginx yalnız 80 portunda HTTP dinler; TLS yapılandırması yok.
- Yüklenen görseller yeniden boyutlandırılmaz, EXIF verisi temizlenmez.

Tam liste: [docs/BILINEN_EKSIKLER.md](docs/BILINEN_EKSIKLER.md)

## Lisans

Kod [MIT lisansı](LICENSE) ile sunulur.
