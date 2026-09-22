# Node.js User, Category ve Post API v4

Express ve MySQL ile kullanıcı, kategori ve post yönetimi sunan REST API örneği. V4 proje sürümünü belirtir; endpoint adresleri `/api/v1` altında kalır.

## Eklenen Özellikler

- JWT Bearer authentication, kullanıcı bilgilerini getirme ve mevcut token ile logout
- `user` / `admin` rolleri, admin bootstrap ve ayrı rol değiştirme endpoint’i
- Kullanıcı ve category CRUD, arama, filtreleme, sıralama, sayfalama, soft delete ve restore
- Post CRUD, otomatik slug, draft/published durumları ve yayınlama akışı
- Post sahipliği kontrolü, draft görünürlüğü ve admin için silinmiş postları listeleme
- JOIN ile nested author/category response, standart yanıtlar ve request ID logları
- Migration ve rollback SQL dosyaları

## Gereksinimler ve Kurulum

Node.js, npm ve MySQL gerekir. Komutları proje dizininde çalıştırın:

```bash
git clone https://github.com/ismailarat56/node-user-crud-mysql.git
cd node-user-crud-mysql
npm install
cp .env.example .env
```

Mevcut bir kurulumda `.env` dosyanızı koruyun. Environment bölümüne göre veritabanı ve JWT değerlerini düzenleyin. Temiz veritabanı için:

```bash
mysql -u your_mysql_user -p < sql/schema.sql
```

Güncel `schema.sql` tüm tabloları içerir. Ardından aynı tabloları/kolonları ekleyen migration’ları tekrar çalıştırmayın. Mevcut veritabanı için **Migrationlar** bölümünü izleyin.

```bash
npm start
```

Varsayılan adres `http://localhost:3000` olur. Başlangıçta veritabanı bağlantısı kurulamazsa HTTP sunucusu açılmaz. `npm run memory`, v4 özelliklerini içermeyen eski bellek içi CRUD örneğidir.

## Rate Limiting

İstekler sliding window ile, son zaman aralığındaki kayıtlar sayılarak sınırlandırılır. Limiti aşan istek `429 RATE_LIMITED` alır; `Retry-After` başlığı bekleme süresini saniye olarak verir. Yanıttaki `error.details` içinde `limit_name` ve `retry_after_seconds` bulunur.

| Limiter | Anahtar | Sınır |
| --- | --- | --- |
| `login_ip` | IP | 15 dakikada 30 |
| `login_account` | IP + e-posta | 15 dakikada 5 |
| `register` | IP | Saatte 10 |
| `public_code_mail_ip` | IP | 15 dakikada 10 |
| `public_code_mail_email` | E-posta | Saatte 3 |
| `code_check_ip` | IP | 15 dakikada 30 |
| `code_check_email` | E-posta | Saatte 10 |
| `account_code_mail` | Kullanıcı ID | Saatte 5 |
| `comment_create` | Kullanıcı ID | Dakikada 10 |

E-posta anahtarı oluşturulurken baştaki/sondaki boşluklar silinir ve harfler küçültülür. Aynı limiter nesnesini kullanan endpointler aynı kotayı paylaşır; sayaçlar yalnızca API sürecinin belleğinde tutulur. Limiter'dan geçen başarısız istekler de sayılır.

## Docker ile Çalıştırma

Docker ve Compose gerekir. Bu çalışma kopyasında `.env.docker.example` ve `.env.db.example` henüz yoktur; ilk kurulumdan önce aşağıdaki örnekleri bu adlarla kaydedin. Mevcut gerçek ortam dosyalarınız varsa üzerlerine kopyalamayın.

`.env.docker.example` içeriği:

```dotenv
PORT=3000
DB_HOST=db
DB_PORT=3306
DB_USER=blog_app
DB_PASSWORD=replace-with-app-password
DB_NAME=simple_user_api
JWT_SECRET=replace-with-random-secret
VERIFICATION_CODE_KEY=replace-with-64-hex-characters
MAIL_TRANSPORT=json
DEV_MAIL_OUTBOX=false
RATE_LIMIT_ENABLED=true
```

`.env.db.example` içeriği:

```dotenv
MYSQL_DATABASE=simple_user_api
MYSQL_USER=blog_app
MYSQL_PASSWORD=replace-with-app-password
MYSQL_ROOT_PASSWORD=replace-with-root-password
```

1. İki örnekten gerçek ortam dosyalarını oluşturun:

   ```bash
   cp .env.docker.example .env.docker
   cp .env.db.example .env.db
   ```

2. Parola ve anahtar üretin; her değer için komutu yeniden çalıştırın:

   ```bash
   openssl rand -hex 32
   ```

   `DB_PASSWORD` ile `MYSQL_PASSWORD` aynı olsun. `MYSQL_ROOT_PASSWORD`, `JWT_SECRET` ve `VERIFICATION_CODE_KEY` için ayrı değerler kullanın. JSON mail modu gerçek e-posta göndermez.

3. Servisleri başlatın (ilk seferde API image'ı da oluşturulur):

   ```bash
   docker compose up -d
   ```

4. Container durumlarını kontrol edin; database'in sağlıklı olmasını bekleyin:

   ```bash
   docker compose ps
   ```

5. API sağlık kontrolünü yapın; `200` ve `success: true` beklenir:

   ```bash
   curl -i http://localhost:3001/health
   ```

6. İşiniz bitince servisleri kapatın; database volume'u ve veriler korunur:

   ```bash
   docker compose down
   ```

**Verileri silerek sıfırlama:** Aşağıdaki ayrı komut database volume'unu da siler; yalnızca verileri kaybetmeyi kabul ediyorsanız kullanın.

```bash
docker compose down -v
```

## Docker'da Migration Çalıştırma

Servisler çalışırken yalnızca eksik migration'ları numara sırasıyla uygulayın. Örneğin `012` henüz uygulanmamışsa:

```bash
docker compose exec -T db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' < sql/migrations/012_create_verification_codes.sql
```

Temiz volume'da güncel `sql/schema.sql` otomatik çalışır; içerdiği migration'ları tekrar çalıştırmayın. Uygulanan migration'ları kaydeden tablo yoktur; `-T`, dosyadan SQL aktarırken terminal ayırmayı kapatır.

Eski Docker volume'larında `users.password_changed_at`, `users.email_verified_at` ve `verification_codes` eksikse sırasıyla `010`, `011` ve `012` migration'larını uygulayın. `docker compose up --build` mevcut veritabanına migration uygulamaz.

## Docker ile Postman Testleri

`node-blog-docker` environment'ında `base_url=http://127.0.0.1:3001` kullanın. Docker veritabanı yerel MySQL'den ayrıdır: environment'taki `admin_email` / `admin_password` ve `user_email` / `user_password` ile eşleşen aktif, e-postası doğrulanmış kullanıcılar Docker veritabanında da bulunmalıdır. Rolleri sırasıyla `admin` ve `user` olmalıdır.

`04 Posts`, aktif bir kategori için `category_id` ve silinmiş bir kategori için `empty_category_id` değişkenlerine ihtiyaç duyar. İlk hazırlıkta `00 Health → 01 Auth → 03 Categories → 04 Posts` sırasını kullanabilirsiniz; `03 Categories` bu kategori kayıtlarını ve değişkenlerini hazırlar. Kategoriler hazır olduğunda yalnızca `00 Health → 01 Auth → 04 Posts` çalıştırılabilir. Runner'da **Keep variable values** açık olsun; `01 Auth` her koşuda yeni token alır.

Art arda yapılan işlev testleri login kotasını aşabilir. Yerel geliştirmede bu testleri rate limit testlerinden ayrı çalıştırmak için `.env.docker` içinde `RATE_LIMIT_ENABLED=false` kullanıp API servisini yeniden oluşturun. `/health` yanıtının `200` olması, kullanıcıların ve veritabanı şemasının hazır olduğunu tek başına göstermez.

## Docker'da İlk Admin

Servisleri `docker compose up -d` ile açın. Temiz yerel kurulumda, yalnızca bu e-posta henüz yoksa başlangıç kullanıcısını oluşturun:

```bash
docker compose exec db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'
```

MySQL içinde aşağıdakileri çalıştırın. Burada yerel başlangıç hesabı elle doğrulanmış sayılır:

```sql
INSERT INTO users (name, email, email_verified_at)
VALUES ('İlk Admin', 'admin@example.com', CURRENT_TIMESTAMP);
exit
```

Ardından Bash terminalinde parola ve rol atayın. Scriptler yeni kullanıcı oluşturmaz; mevcut kaydı günceller:

```bash
export BOOTSTRAP_EMAIL=admin@example.com
read -r -s -p 'Admin parolası (15–128 karakter): ' BOOTSTRAP_PASSWORD
printf '\n'
export BOOTSTRAP_PASSWORD
docker compose exec -e BOOTSTRAP_EMAIL -e BOOTSTRAP_PASSWORD api npm run set-user-password
docker compose exec -e BOOTSTRAP_EMAIL -e BOOTSTRAP_ROLE=admin api npm run set-user-role
unset BOOTSTRAP_EMAIL BOOTSTRAP_PASSWORD
```

Artık `/api/v1/auth/login` üzerinden bu bilgilerle giriş yapabilirsiniz.

## Authentication ile Authorization Farkı

**Authentication**, e-posta/parola veya access token ile kimliğin doğrulanmasıdır. **Authorization**, doğrulanan kullanıcının rolüne ve post sahipliğine göre işlem izninin belirlenmesidir.

`GET /health`, `/api/v1/public` altındaki okuma uçları ve aşağıdaki tabloda authentication gerektirmediği belirtilen auth uçları public’tir. Korumalı endpoint’ler `Authorization: Bearer <access_token>` bekler. Eksik/geçersiz kimlik doğrulaması `401`, yetersiz yetki `403` üretir. Başkasına ait draft postun varlığını gizlemek için okumada `404` kullanılır.

## Role Mimarisi

`users.role`, `ENUM('user', 'admin')` alanıdır ve varsayılanı `user` olur. Yeni kullanıcı oluştururken body içinde `role` kabul edilmez.

`authenticate`, JWT doğrulaması ve iptal kontrolünden sonra aktif kullanıcıyı veritabanından getirir. Rol token içine yazılmaz; her istekte veritabanındaki güncel rol kullanılır. `/users` router’ı önce authentication, ardından `requireRole('admin')` uygular. Postlarda role ek olarak `post.author.id === request.user.id` sahiplik kontrolü yapılır.

## Roller ve Yetki Tablosu

| İşlem | user | admin |
| --- | --- | --- |
| Login, me, logout | ✓ | ✓ |
| User CRUD | ✗ | ✓ |
| Role değiştirme | ✗ | ✓ |
| Category CRUD | ✓ | ✓ |
| Post oluşturma | ✓ | ✓ |
| Kendi postunu düzenleme, yayınlama, silme | ✓ | ✓ |
| Başkasının postunu düzenleme, yayınlama, silme | ✗ | ✓ |
| Başkasının draftını okuma | ✗ | ✓ |
| Silinmiş postları listeleme | ✗ | ✓ |

Login token gerektirmez. Post restore işlemi de yazar veya admin tarafından yapılır. Admin kendi rolünü değiştiremez.

### Tüm endpoint’ler

Authentication ve role birbirinden ayrı koşullardır. “Herkes”, authentication gereken satırlarda giriş yapmış kullanıcıları ifade eder.

| Method | Endpoint | Authentication | Role | İşlem |
| --- | --- | --- | --- | --- |
| GET | `/health` | Hayır | — | Uygulama sağlık kontrolü |
| POST | `/api/v1/auth/login` | Hayır | — | Giriş; `login_ip`, `login_account` |
| POST | `/api/v1/auth/register` | Hayır | — | Kayıt; `register` |
| POST | `/api/v1/auth/email/verify` | Hayır | — | E-posta doğrula; `code_check_ip`, `code_check_email` |
| POST | `/api/v1/auth/email/verify/resend` | Hayır | — | Kod gönder; `public_code_mail_ip`, `public_code_mail_email` |
| POST | `/api/v1/auth/password/forgot` | Hayır | — | Sıfırlama kodu gönder; `public_code_mail_ip`, `public_code_mail_email` |
| POST | `/api/v1/auth/password/reset` | Hayır | — | Parolayı sıfırla; `code_check_ip`, `code_check_email` |
| POST | `/api/v1/auth/password/change-code` | Evet | Herkes | Parola değişim kodu; `account_code_mail` |
| PATCH | `/api/v1/auth/password` | Evet | Herkes | Parolayı kodla değiştir |
| POST | `/api/v1/auth/email/change` | Evet | Herkes | E-posta değişim kodu; `account_code_mail` |
| POST | `/api/v1/auth/email/change/confirm` | Evet | Herkes | E-posta değişimini onayla |
| POST | `/api/v1/posts/:postId/comments` | Evet | Herkes | Yorum oluştur; `comment_create` |
| GET | `/api/v1/auth/me` | Evet | Herkes | Kullanıcıyı role ile getir |
| POST | `/api/v1/auth/logout` | Evet | Herkes | Mevcut token’ı iptal et |
| GET | `/api/v1/users` | Evet | admin | Kullanıcıları listele |
| GET | `/api/v1/users/:id` | Evet | admin | Kullanıcı detayını getir |
| POST | `/api/v1/users` | Evet | admin | Kullanıcı oluştur |
| PUT | `/api/v1/users/:id` | Evet | admin | Kullanıcı adını ve e-postasını değiştir |
| PATCH | `/api/v1/users/:id` | Evet | admin | Kullanıcıyı kısmen güncelle |
| PATCH | `/api/v1/users/:id/role` | Evet | admin | Başka kullanıcının rolünü değiştir |
| DELETE | `/api/v1/users/:id` | Evet | admin | Kullanıcıyı soft delete et |
| PATCH | `/api/v1/users/:id/restore` | Evet | admin | Kullanıcıyı geri getir |
| GET | `/api/v1/categories` | Evet | Herkes | Category listele |
| GET | `/api/v1/categories/:id` | Evet | Herkes | Category detayını getir |
| POST | `/api/v1/categories` | Evet | Herkes | Category oluştur |
| PUT | `/api/v1/categories/:id` | Evet | Herkes | Category alanlarını tamamen güncelle |
| PATCH | `/api/v1/categories/:id` | Evet | Herkes | Category alanlarını kısmen güncelle |
| DELETE | `/api/v1/categories/:id` | Evet | Herkes | Bağlı aktif post yoksa soft delete et |
| PATCH | `/api/v1/categories/:id/restore` | Evet | Herkes | Category geri getir |
| GET | `/api/v1/posts` | Evet | Herkes | Görünür postları listele; include_deleted=1 yalnızca admin |
| GET | `/api/v1/posts/:id` | Evet | Herkes | Published post; draft için yazar veya admin |
| POST | `/api/v1/posts` | Evet | Herkes | Draft oluştur |
| PUT | `/api/v1/posts/:id` | Evet | Yazar veya admin | Postu tamamen güncelle |
| PATCH | `/api/v1/posts/:id` | Evet | Yazar veya admin | Postu kısmen güncelle |
| PATCH | `/api/v1/posts/:id/publish` | Evet | Yazar veya admin | Yayınla |
| PATCH | `/api/v1/posts/:id/unpublish` | Evet | Yazar veya admin | Yayından kaldır |
| DELETE | `/api/v1/posts/:id` | Evet | Yazar veya admin | Soft delete et |
| PATCH | `/api/v1/posts/:id/restore` | Evet | Yazar veya admin | Geri getir |

### Kullanıcı listeleme parametreleri

| Parametre | Açıklama | Varsayılan |
| --- | --- | --- |
| `search` | İsim veya e-posta içinde arama | Boş |
| `is_active` | `0`, `1`, `true`, `false` | Tümü |
| `include_deleted` | Silinmiş kayıtları dahil et | `false` |
| `sort_by` | `id`, `name`, `email`, `created_at`, `updated_at` | `id` |
| `sort_order` | `asc`, `desc` | `desc` |
| `page` | Sayfa numarası | `1` |
| `limit` | Sayfa boyutu, en fazla 50 | `10` |

## Admin Bootstrap

Public kayıt için `/api/v1/auth/register` kullanılabilir. Bootstrap scriptleri **mevcut, silinmemiş kullanıcıyı günceller**, yeni kullanıcı oluşturmaz. İlk yerel kurulumda kullanıcı yoksa MySQL istemcisinde, uygulamanın kullandığı veritabanında doğrulanmış bir başlangıç kaydı oluşturun:

```sql
USE simple_user_api;
INSERT INTO users (name, email, email_verified_at)
VALUES ('Ali Yılmaz', 'ali@example.com', CURRENT_TIMESTAMP);
```

Bu INSERT yalnızca kullanıcı henüz yoksa çalıştırılır. Mevcut kurulumda aktif bir kullanıcı seçin. Aşağıdaki komutlar seçilen hesabın parolasını ve rolünü değiştirir. Parola terminalde gösterilmeden okunur; `set -x` kullanmayın.

```bash
read -r -p 'Bootstrap e-posta: ' BOOTSTRAP_EMAIL
read -r -s -p 'Yeni parola (15–128 karakter): ' BOOTSTRAP_PASSWORD
printf '\n'

BOOTSTRAP_EMAIL="$BOOTSTRAP_EMAIL" \
BOOTSTRAP_PASSWORD="$BOOTSTRAP_PASSWORD" \
npm run set-user-password

BOOTSTRAP_EMAIL="$BOOTSTRAP_EMAIL" \
BOOTSTRAP_ROLE=admin \
npm run set-user-role

unset BOOTSTRAP_EMAIL BOOTSTRAP_PASSWORD
```

Parola scripti scrypt hash üretir. Bu scriptler `is_active` değerini değiştirmez; giriş için `is_active=1` ve `deleted_at IS NULL` gerekir.

## Role Değiştirme Endpointi

`PATCH /api/v1/users/:id/role`, admin token ve yalnızca `role` alanını kabul eder:

```json
{"role":"admin"}
```

`role`, `user` veya `admin` olabilir. Başarı `200`; geçersiz rol `422 INVALID_USER_ROLE`; ek alan `422 UNSUPPORTED_ROLE_FIELDS`; kendi rolünü değiştirme `409 CANNOT_CHANGE_OWN_ROLE` üretir. Kullanıcı bulunamazsa `404 USER_NOT_FOUND` döner. Normal `PATCH /users/:id` üzerinden rol değiştirilemez.

## Post Veri Modeli

| Alan | Tür / Kural | Kaynak |
| --- | --- | --- |
| `id` | BIGINT UNSIGNED, primary key | Sunucu |
| `user_id` | users foreign key | `request.user.id` |
| `category_id` | categories foreign key; mevcut, aktif, silinmemiş category | Client |
| `title` | 3–200 karakter | Client |
| `slug` | VARCHAR(220), unique | Başlıktan üretilir |
| `excerpt` | En fazla 500 karakter; null olabilir | Client, varsayılan null |
| `content` | MEDIUMTEXT; validator 1–50000 karakter | Client |
| `status` | `draft` veya `published`; başlangıç draft | Sunucu |
| `published_at` | İlk yayın zamanı, başlangıç null | Sunucu |
| `created_at`, `updated_at` | TIMESTAMP | Veritabanı |
| `deleted_at` | TIMESTAMP veya null | Soft delete / restore |

Create, PUT ve PATCH body’lerinde yalnızca `title`, `content`, `excerpt`, `category_id` kabul edilir. `user_id`, `slug`, `status`, `published_at` veya başka alan göndermek `422 UNSUPPORTED_POST_FIELDS` üretir. HTTP JSON body sınırı ayrıca 20 KB’dir; bkz. Bilinen Sınırlamalar.

## Post Endpointleri

| Method | Endpoint | Authentication | Role | Başarı |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/posts` | Bearer | Herkes; include_deleted=1 admin | 200, liste + meta |
| GET | `/api/v1/posts/:id` | Bearer | Published: herkes; draft: yazar/admin | 200, detay |
| POST | `/api/v1/posts` | Bearer | Herkes | 201, draft detay |
| PUT | `/api/v1/posts/:id` | Bearer | Yazar veya admin | 200, detay |
| PATCH | `/api/v1/posts/:id` | Bearer | Yazar veya admin | 200, detay |
| PATCH | `/api/v1/posts/:id/publish` | Bearer | Yazar veya admin | 200, published detay |
| PATCH | `/api/v1/posts/:id/unpublish` | Bearer | Yazar veya admin | 200, draft detay |
| DELETE | `/api/v1/posts/:id` | Bearer | Yazar veya admin | 200, data.id |
| PATCH | `/api/v1/posts/:id/restore` | Bearer | Yazar veya admin | 200, detay |

## Post Query Parametreleri

| Parametre | Değer / İşlev | Varsayılan |
| --- | --- | --- |
| `search` | title veya excerpt içinde arama; en fazla 100 karakter | Boş |
| `status` | `draft`, `published` | Tümü, görünürlük sınırları içinde |
| `category_id` | Pozitif integer | Tümü |
| `user_id` | Pozitif integer yazar filtresi | Tümü, görünürlük sınırları içinde |
| `sort_by` | `id`, `title`, `created_at`, `updated_at`, `published_at` | `id` |
| `sort_order` | `asc`, `desc` | `desc` |
| `page` | 1–1000000 | `1` |
| `limit` | 1–50 | `10` |
| `include_deleted` | `0`, `1`, `false`, `true`; etkinleştirmek yalnızca admin | `false` |

Tanımsız query alanı veya geçersiz değer `422` üretir. Filtreler başka kullanıcının draftını görme hakkı vermez. `include_deleted=1`, silinmiş ve silinmemiş kayıtları birlikte getirir.

## Post Slug Üretimi

Başlık küçük harfe çevrilir; Türkçe harfler ASCII karşılıklarına dönüştürülür, harf/sayı dışındaki gruplar tire olur. Örneğin `Node.js ile İlk API’m` → `node-js-ile-ilk-api-m`.

Temel slug en fazla 200 karakterdir; boş sonuçta `post` kullanılır. Çakışmada `-2`, `-3` gibi ekler denenir. Silinmiş postların slug’ları da rezerve kalır. Deneme sınırı aşılırsa `409 POST_SLUG_UNAVAILABLE` döner. Başlık güncellenince slug değişmez.

## Post Status ve Publish Akışı

```text
draft -- PATCH /:id/publish --> published
published -- PATCH /:id/unpublish --> draft
```

İlk publish işleminde `published_at` yazılır. Unpublish yalnızca status değerini değiştirir. Tekrar publish, `COALESCE(published_at, CURRENT_TIMESTAMP)` sayesinde ilk tarihi korur.

Zaten published postu yayınlamak `409 POST_ALREADY_PUBLISHED`; draft postu yayından kaldırmak `409 POST_NOT_PUBLISHED` üretir. Publish/unpublish için body gerekmez.

## Post Ownership Kuralları

Post oluşturulurken yazar giriş yapan kullanıcıdır. PUT, PATCH, publish, unpublish, delete ve restore için kullanıcı yazar veya admin olmalıdır. Aksi durumda `403 POST_FORBIDDEN` döner. Yetki kontrolü body doğrulamasından önce yapılabilir; yetkisiz istekte hatalı body için `422` beklenmemelidir.

## Draft Görünürlüğü

Published postları giriş yapan herkes okuyabilir. Draft postu yalnızca yazarı veya admin görebilir. Başka kullanıcı detay istediğinde `404 POST_NOT_FOUND` döner. Liste sorgusu da yalnızca published postları ve kullanıcının kendi draftlarını getirir; admin tüm yazarların draftlarını görebilir.

## Post PUT ve PATCH

PUT dört client alanının tamamını gerektirir; eksik alan `422 MISSING_POST_FIELDS` üretir:

```json
{
  "title": "Güncellenmiş başlık",
  "content": "Tam içerik",
  "excerpt": null,
  "category_id": 1
}
```

PATCH en az bir client alanı gerektirir; diğer alanları korur. Boş body `422 EMPTY_POST_PATCH_BODY` üretir:

```json
{"title":"Yeni başlık"}
```

Category değişiyorsa yeni category’nin kullanılabilirliği kontrol edilir. Bu işlemler yazar, slug, status ve yayın tarihini değiştirmez.

## Post Soft Delete ve Restore

DELETE fiziksel satırı kaldırmaz; `deleted_at` alanını doldurur. Silinmiş post normal liste ve detayda görünmez. Admin `include_deleted=1` ile listeleyebilir. Restore, silinmiş postta `deleted_at=NULL` yapar; status ve yayın tarihini korur. Silinmemiş veya bulunamayan postu restore etmek `404 DELETED_POST_NOT_FOUND` üretir.

## Category Silme Kuralı

Category’ye bağlı `deleted_at IS NULL` olan en az bir post varsa silme `409 CATEGORY_HAS_POSTS` ile reddedilir. Burada “aktif post”, hem draft hem published silinmemiş postları kapsar. `details.active_posts` sayıyı içerir. Bağlı postları önce soft delete ettikten sonra category silinebilir.

## JOIN ve Nested Response

Post sorguları users ve categories tablolarına INNER JOIN yapar; düz foreign key alanları yerine `author` ve `category` nesneleri döner. Kullanıcı parola hash’i response’a eklenmez.

Başarılı create yanıtı `201`:

```json
{
  "success": true,
  "request_id": "e7d7a987-3504-48d8-9a16-3db55ef78240",
  "message": "Post oluşturuldu.",
  "data": {
    "id": 1,
    "title": "Node.js ile İlk API’m",
    "slug": "node-js-ile-ilk-api-m",
    "excerpt": null,
    "content": "Post metni...",
    "status": "draft",
    "published_at": null,
    "author": {"id": 2, "name": "Ayşe Yılmaz"},
    "category": {"id": 1, "name": "Backend", "slug": "backend"},
    "created_at": "2026-09-06T18:00:00.000Z",
    "updated_at": "2026-09-06T18:00:00.000Z",
    "deleted_at": null
  }
}
```

Liste response’unda `data` bir dizidir ve post nesnelerinde `content` bulunmaz. Create, detay ve güncelleme gibi tek post dönen yanıtlarda content bulunur. Listeye şu metadata eklenir:

```json
{
  "page": 1,
  "limit": 10,
  "total": 1,
  "total_pages": 1,
  "has_next_page": false,
  "has_previous_page": false
}
```

`total`, yetki ve query filtrelerinden sonraki kayıt sayısıdır. Boş listede `total_pages=0` olur. Request logger, istemci `X-Request-Id` göndermediyse UUID üretir; normal API cevaplarında başlığa ve `request_id` alanına taşınır. `/health` yanıtında `request_id` gövde alanı yoktur.

## Migrationlar

| Dosya | İşlev |
| --- | --- |
| `sql/schema.sql` | Temiz kurulum için güncel bütün tablolar |
| `002_upgrade_users_table.sql` | Aktiflik, güncelleme/silme tarihleri ve indeksler |
| `003_create_user_audit_logs.sql` | Kullanıcı audit tablosu |
| `004_add_authentication_to_users.sql` | password_hash, last_login_at |
| `005_create_revoked_access_tokens.sql` | Token iptal tablosu |
| `006_create_categories.sql` | Categories tablosu |
| `007_add_role_to_users.sql` | role alanı ve indeksi |
| `008_create_posts.sql` | Posts tablosu, foreign key ve indeksler |

Migration dosyaları `sql/migrations/` altındadır. Mevcut veritabanına yalnızca henüz uygulanmamış migration’ları numara sırasıyla uygulayın. Örneğin 002–006 zaten uygulanmışsa:

```bash
mysql -u your_mysql_user -p < sql/migrations/007_add_role_to_users.sql
mysql -u your_mysql_user -p < sql/migrations/008_create_posts.sql
```

Otomatik migration takip mekanizması yoktur. `schema.sql`, mevcut tablo yapısını yükseltmez. SQL dosyaları `USE simple_user_api` içerir; farklı DB_NAME kullanılıyorsa hedef veritabanı SQL ile uyumlu olmalıdır.

002, 004, 005, 006, 007 ve 008 için `_rollback.sql` dosyaları vardır; 003 için yoktur. Geri alma gerektiğinde bağımlılıkların ters sırasını izleyin (örneğin posts tablosunu categories’den önce kaldırın). Rollback tabloları/kolonları ve verilerini kaldırabilir; önce yedek alın.

## Environment Değişkenleri

Temel veritabanı, authentication ve rate limit ayarları:

| Değişken | Kullanım | Örnek / Varsayılan |
| --- | --- | --- |
| `PORT` | HTTP portu | `3000` |
| `RATE_LIMIT_ENABLED` | Rate limit kontrolü; `false` production ortamında kabul edilmez | `true` |
| `DB_HOST` | MySQL host | `127.0.0.1` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | MySQL kullanıcı adı | `your_mysql_user` |
| `DB_PASSWORD` | MySQL parolası | `your_mysql_password` |
| `DB_NAME` | Veritabanı | `simple_user_api` |
| `JWT_SECRET` | HS256 anahtarı, en az 32 byte | Rastgele üretilmeli |
| `JWT_ISSUER` | Beklenen token issuer | `node-user-crud-mysql` |
| `JWT_AUDIENCE` | Beklenen token audience | `node-user-crud-client` |
| `JWT_EXPIRES_IN_SECONDS` | Token ömrü, 60–86400 saniye | Varsayılan `900` |

Örnek `.env`:

```dotenv
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=simple_user_api
JWT_SECRET=replace-with-a-long-random-secret
JWT_ISSUER=node-user-crud-mysql
JWT_AUDIENCE=node-user-crud-client
JWT_EXPIRES_IN_SECONDS=900
```

JWT_SECRET örnek metnini gerçek kurulumda rastgele anahtarla değiştirin. Anahtar üretimi:

```bash
node -e 'console.log(require("node:crypto").randomBytes(32).toString("hex"))'
```

Bootstrap değişkenleri yalnızca script çalıştırılırken kullanılır; `.env` içine kalıcı olarak eklenmeleri gerekmez:

| Değişken | Nerede | Kalıcı mı? |
| --- | --- | --- |
| `BOOTSTRAP_EMAIL` | set-user-password, set-user-role | Hayır |
| `BOOTSTRAP_PASSWORD` | set-user-password | Hayır |
| `BOOTSTRAP_ROLE` | set-user-role | Hayır |

## curl ile Role Testleri

Aşağıdaki Role ve Post bloklarını **aynı Bash terminalinde sırayla** çalıştırın. Beklenen kod gelmezse sonraki adıma geçmeyin. `set -x` kullanmayın. Örnekler yeni test kayıtları oluşturur; temizlik en sondadır. Admin Bootstrap adımını önce tamamlayın.

### Hazırlık ve giriş

```bash
BASE_URL="http://localhost:3000"
RUN_ID="$(date +%s)-$$"
USER_EMAIL="curl-v4-${RUN_ID}@example.com"
USER_PASSWORD='curl-test-icin-uzun-parola-2026'

json_field() {
  node -e '
    const body = JSON.parse(require("fs").readFileSync(0, "utf8"));
    if (body.success !== true) {
      console.error(body.error || "Başarısız yanıt");
      process.exit(1);
    }
    const value = process.argv[1].split(".").reduce((v, k) => v?.[k], body);
    if (value === undefined || value === null) {
      console.error("Alan bulunamadı:", process.argv[1]);
      process.exit(1);
    }
    console.log(value);
  ' "$1"
}

# HTTP 200
curl -sS "$BASE_URL/health" -w '\nHTTP %{http_code}\n'

read -r -p 'Admin e-posta: ' ADMIN_EMAIL
read -r -s -p 'Admin parola: ' ADMIN_PASSWORD
printf '\n'
ADMIN_LOGIN=$(
  ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" \
    node -e 'process.stdout.write(JSON.stringify({email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD}))' \
  | curl -sS -X POST "$BASE_URL/api/v1/auth/login" \
      -H 'Content-Type: application/json' --data-binary @- \
      -w '%{stderr}HTTP %{http_code}\n'
)
unset ADMIN_PASSWORD
ADMIN_TOKEN=$(printf '%s' "$ADMIN_LOGIN" | json_field data.access_token)
ADMIN_ID=$(printf '%s' "$ADMIN_LOGIN" | json_field data.user.id)
printf 'Admin token uzunluğu: %s\n' "${#ADMIN_TOKEN}"

# HTTP 200; data.role admin olmalı
curl -sS "$BASE_URL/api/v1/auth/me" \
  -H "Authorization: Bearer ${ADMIN_TOKEN:?Önce admin girişi yapın}" \
  -w '\nHTTP %{http_code}\n'

# HTTP 401 AUTHENTICATION_REQUIRED; WWW-Authenticate bulunmalı
curl -i "$BASE_URL/api/v1/users"
```

### Test kullanıcısı ve rol kontrolü

```bash
# HTTP 201; başlangıç rolü user
USER_CREATE=$(
  curl -sS -X POST "$BASE_URL/api/v1/users" \
    -H "Authorization: Bearer ${ADMIN_TOKEN:?Admin token gerekli}" \
    -H 'Content-Type: application/json' \
    -d "{\"name\":\"Curl Test Kullanıcısı\",\"email\":\"$USER_EMAIL\",\"password\":\"$USER_PASSWORD\"}" \
    -w '%{stderr}HTTP %{http_code}\n'
)
USER_ID=$(printf '%s' "$USER_CREATE" | json_field data.id)

# HTTP 200
USER_LOGIN=$(
  curl -sS -X POST "$BASE_URL/api/v1/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$USER_EMAIL\",\"password\":\"$USER_PASSWORD\"}" \
    -w '%{stderr}HTTP %{http_code}\n'
)
USER_TOKEN=$(printf '%s' "$USER_LOGIN" | json_field data.access_token)

# HTTP 403 FORBIDDEN; WWW-Authenticate olmamalı
curl -i "$BASE_URL/api/v1/users" \
  -H "Authorization: Bearer ${USER_TOKEN:?User token gerekli}"

# HTTP 200: başka kullanıcıyı admin yap
curl -sS -X PATCH "$BASE_URL/api/v1/users/${USER_ID:?User ID gerekli}/role" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' -d '{"role":"admin"}' \
  -w '\nHTTP %{http_code}\n'

# HTTP 200: aynı token güncel veritabanı rolünü kullanır
curl -sS "$BASE_URL/api/v1/users?limit=1" \
  -H "Authorization: Bearer $USER_TOKEN" -w '\nHTTP %{http_code}\n'

# HTTP 200: Post testleri için tekrar user yap
curl -sS -X PATCH "$BASE_URL/api/v1/users/$USER_ID/role" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' -d '{"role":"user"}' \
  -w '\nHTTP %{http_code}\n'

# HTTP 422 INVALID_USER_ROLE
curl -sS -X PATCH "$BASE_URL/api/v1/users/$USER_ID/role" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' -d '{"role":"editor"}' \
  -w '\nHTTP %{http_code}\n'

# HTTP 409 CANNOT_CHANGE_OWN_ROLE
curl -sS -X PATCH "$BASE_URL/api/v1/users/${ADMIN_ID:?Admin ID gerekli}/role" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' -d '{"role":"user"}' \
  -w '\nHTTP %{http_code}\n'
```

## curl ile Post CRUD

Role testlerindeki değişkenler ve token’larla devam edin. Token süresi dolarsa yeniden giriş yapıp ilgili token değişkenini yenileyin; test ID’lerini koruyun.

### Category ve draft oluşturma

```bash
# HTTP 201; normal kullanıcı category oluşturabilir
CATEGORY_CREATE=$(
  curl -sS -X POST "$BASE_URL/api/v1/categories" \
    -H "Authorization: Bearer ${USER_TOKEN:?Role testlerini önce çalıştırın}" \
    -H 'Content-Type: application/json' \
    -d "{\"name\":\"Curl Category\",\"slug\":\"curl-$RUN_ID\",\"is_active\":true}" \
    -w '%{stderr}HTTP %{http_code}\n'
)
CATEGORY_ID=$(printf '%s' "$CATEGORY_CREATE" | json_field data.id)

# HTTP 201; author.id USER_ID, status draft
POST_CREATE=$(
  curl -sS -X POST "$BASE_URL/api/v1/posts" \
    -H "Authorization: Bearer $USER_TOKEN" \
    -H 'Content-Type: application/json' \
    -d "{\"title\":\"Curl Post $RUN_ID\",\"content\":\"Test içeriği\",\"category_id\":${CATEGORY_ID:?Category ID gerekli}}" \
    -w '%{stderr}HTTP %{http_code}\n'
)
POST_ID=$(printf '%s' "$POST_CREATE" | json_field data.id)

# HTTP 200; listede content alanı yok
curl -sS -G "$BASE_URL/api/v1/posts" \
  -H "Authorization: Bearer $USER_TOKEN" \
  --data-urlencode "category_id=$CATEGORY_ID" --data-urlencode 'limit=5' \
  -w '\nHTTP %{http_code}\n'

# HTTP 200; detayda content alanı var
curl -sS "$BASE_URL/api/v1/posts/${POST_ID:?Post ID gerekli}" \
  -H "Authorization: Bearer $USER_TOKEN" -w '\nHTTP %{http_code}\n'
```

### PUT, PATCH ve yayınlama

```bash
# HTTP 200
curl -sS -X PUT "$BASE_URL/api/v1/posts/$POST_ID" \
  -H "Authorization: Bearer $USER_TOKEN" -H 'Content-Type: application/json' \
  -d "{\"title\":\"Tam güncelleme\",\"content\":\"Yeni içerik\",\"excerpt\":null,\"category_id\":$CATEGORY_ID}" \
  -w '\nHTTP %{http_code}\n'

# HTTP 200; slug değişmez
curl -sS -X PATCH "$BASE_URL/api/v1/posts/$POST_ID" \
  -H "Authorization: Bearer $USER_TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Kısmi güncelleme"}' -w '\nHTTP %{http_code}\n'

# HTTP 422 UNSUPPORTED_POST_FIELDS
curl -sS -X PATCH "$BASE_URL/api/v1/posts/$POST_ID" \
  -H "Authorization: Bearer $USER_TOKEN" -H 'Content-Type: application/json' \
  -d '{"status":"published"}' -w '\nHTTP %{http_code}\n'

# HTTP 200; ilk published_at değerini sakla
PUBLISH_RESPONSE=$(
  curl -sS -X PATCH "$BASE_URL/api/v1/posts/$POST_ID/publish" \
    -H "Authorization: Bearer $USER_TOKEN" -w '%{stderr}HTTP %{http_code}\n'
)
FIRST_PUBLISHED_AT=$(printf '%s' "$PUBLISH_RESPONSE" | json_field data.published_at)

# HTTP 409 POST_ALREADY_PUBLISHED
curl -sS -X PATCH "$BASE_URL/api/v1/posts/$POST_ID/publish" \
  -H "Authorization: Bearer $USER_TOKEN" -w '\nHTTP %{http_code}\n'

# HTTP 200
curl -sS -X PATCH "$BASE_URL/api/v1/posts/$POST_ID/unpublish" \
  -H "Authorization: Bearer $USER_TOKEN" -w '\nHTTP %{http_code}\n'

# HTTP 200; published_at aynı kalmalı
PUBLISH_RESPONSE=$(
  curl -sS -X PATCH "$BASE_URL/api/v1/posts/$POST_ID/publish" \
    -H "Authorization: Bearer $USER_TOKEN" -w '%{stderr}HTTP %{http_code}\n'
)
SECOND_PUBLISHED_AT=$(printf '%s' "$PUBLISH_RESPONSE" | json_field data.published_at)
if [ "$FIRST_PUBLISHED_AT" = "$SECOND_PUBLISHED_AT" ]; then
  printf 'published_at korundu.\n'
else
  printf 'HATA: published_at değişti.\n'
fi
```

### Başkasının draftı ve sahiplik

```bash
# HTTP 201; bu postun yazarı admin
OTHER_POST_CREATE=$(
  curl -sS -X POST "$BASE_URL/api/v1/posts" \
    -H "Authorization: Bearer ${ADMIN_TOKEN:?Admin token gerekli}" \
    -H 'Content-Type: application/json' \
    -d "{\"title\":\"Admin Draft $RUN_ID\",\"content\":\"Admin taslağı\",\"category_id\":$CATEGORY_ID}" \
    -w '%{stderr}HTTP %{http_code}\n'
)
OTHER_POST_ID=$(printf '%s' "$OTHER_POST_CREATE" | json_field data.id)

# HTTP 404 POST_NOT_FOUND
curl -sS "$BASE_URL/api/v1/posts/${OTHER_POST_ID:?Diğer post ID gerekli}" \
  -H "Authorization: Bearer $USER_TOKEN" -w '\nHTTP %{http_code}\n'

# HTTP 403 POST_FORBIDDEN
curl -sS -X PATCH "$BASE_URL/api/v1/posts/$OTHER_POST_ID" \
  -H "Authorization: Bearer $USER_TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Yetkisiz değişiklik"}' -w '\nHTTP %{http_code}\n'

# HTTP 403 FORBIDDEN
curl -sS "$BASE_URL/api/v1/posts?include_deleted=1" \
  -H "Authorization: Bearer $USER_TOKEN" -w '\nHTTP %{http_code}\n'

# HTTP 409 CATEGORY_HAS_POSTS; draft da sayılır
curl -sS -X DELETE "$BASE_URL/api/v1/categories/$CATEGORY_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -w '\nHTTP %{http_code}\n'
```

### Soft delete, restore, temizlik ve logout

```bash
# HTTP 200
curl -sS -X DELETE "$BASE_URL/api/v1/posts/$POST_ID" \
  -H "Authorization: Bearer $USER_TOKEN" -w '\nHTTP %{http_code}\n'

# HTTP 404 POST_NOT_FOUND
curl -sS "$BASE_URL/api/v1/posts/$POST_ID" \
  -H "Authorization: Bearer $USER_TOKEN" -w '\nHTTP %{http_code}\n'

# HTTP 200; admin silinmiş postu listede görebilir
curl -sS "$BASE_URL/api/v1/posts?include_deleted=1&category_id=$CATEGORY_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -w '\nHTTP %{http_code}\n'

# HTTP 200; sahibi geri getirebilir
curl -sS -X PATCH "$BASE_URL/api/v1/posts/$POST_ID/restore" \
  -H "Authorization: Bearer $USER_TOKEN" -w '\nHTTP %{http_code}\n'

# Yalnızca bu testte oluşturulan kayıtları soft delete et; hepsi HTTP 200
curl -sS -X DELETE "$BASE_URL/api/v1/posts/$POST_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -w '\nHTTP %{http_code}\n'
curl -sS -X DELETE "$BASE_URL/api/v1/posts/$OTHER_POST_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -w '\nHTTP %{http_code}\n'
curl -sS -X DELETE "$BASE_URL/api/v1/categories/$CATEGORY_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -w '\nHTTP %{http_code}\n'
curl -sS -X POST "$BASE_URL/api/v1/auth/logout" \
  -H "Authorization: Bearer $USER_TOKEN" -w '\nHTTP %{http_code}\n'
curl -sS -X DELETE "$BASE_URL/api/v1/users/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -w '\nHTTP %{http_code}\n'
curl -sS -X POST "$BASE_URL/api/v1/auth/logout" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -w '\nHTTP %{http_code}\n'

# HTTP 401 ACCESS_TOKEN_REVOKED
curl -sS "$BASE_URL/api/v1/auth/me" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -w '\nHTTP %{http_code}\n'

unset ADMIN_LOGIN ADMIN_TOKEN ADMIN_ID ADMIN_EMAIL
unset USER_LOGIN USER_TOKEN USER_ID USER_EMAIL USER_PASSWORD USER_CREATE
unset CATEGORY_CREATE CATEGORY_ID POST_CREATE POST_ID OTHER_POST_CREATE OTHER_POST_ID
unset PUBLISH_RESPONSE FIRST_PUBLISHED_AT SECOND_PUBLISHED_AT RUN_ID BASE_URL
unset -f json_field
```

Logout mevcut token’ı iptal eder; `unset` terminal değişkenlerini siler. Sonrasında yeni test için giriş adımını tekrar uygulayın. Yeni terminal önceki değişkenleri taşımaz. `No host part in the URL` durumunda BASE_URL’i, `INVALID_AUTHORIZATION_HEADER` durumunda token uzunluğunu kontrol edin. `/users/:id/role` için ID boşsa istek başka bir URL’ye gider; doğrulama hatası yerine `404` alınabilir.

## Authorization Hata Kodları

| HTTP | Kod | Anlam |
| --- | --- | --- |
| 401 | `AUTHENTICATION_REQUIRED` | Authorization header yok |
| 401 | `INVALID_AUTHORIZATION_HEADER` | Bearer biçimi hatalı veya token boş |
| 401 | `INVALID_ACCESS_TOKEN` | JWT doğrulanamadı |
| 401 | `INVALID_ACCESS_TOKEN_CLAIMS` | Token claimleri uygun değil |
| 401 | `ACCESS_TOKEN_EXPIRED` | Token süresi dolmuş |
| 401 | `ACCESS_TOKEN_REVOKED` | Token logout ile iptal edilmiş |
| 401 | `AUTHENTICATED_USER_UNAVAILABLE` | Kullanıcı pasif veya silinmiş |
| 401 | `INVALID_CREDENTIALS` | Login bilgileri geçersiz veya kullanıcı giriş yapamıyor |
| 403 | `FORBIDDEN` | Gerekli rol yok veya silinmiş post listeleme yetkisi yok |
| 403 | `POST_FORBIDDEN` | Post yazarı veya admin değil |
| 404 | `POST_NOT_FOUND` | Post yok, silinmiş veya draft görünür değil |
| 409 | `CANNOT_CHANGE_OWN_ROLE` | Admin kendi rolünü değiştirmeye çalışıyor |
| 422 | `INVALID_USER_ROLE` | Tanımsız/eksik role |
| 422 | `UNSUPPORTED_ROLE_FIELDS` | Role body’sinde ek alan |
| 429 | `RATE_LIMITED` | İstek sınırı aşıldı; `Retry-After` kadar bekleyin |

Bearer middleware’in ürettiği 401 yanıtlarında `WWW-Authenticate: Bearer realm="api"` bulunur. Login `INVALID_CREDENTIALS` yanıtında bu header eklenmez. 403 yanıtlarında da bulunmaz.

Admin gerektiren kullanıcı endpoint’i için örnek:

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Bu işlem için yetkiniz yok.",
    "details": {"required_roles": ["admin"]}
  },
  "request_id": "..."
}
```

Mevcut kodda normal kullanıcının `include_deleted=1` isteği de `403 FORBIDDEN` üretir; mesajı `Silinmiş postları yalnızca admin listeleyebilir.`, details değeri `null` olur. Bu yanıt genel role hatasından farklıdır.

## Post Hata Kodları

| HTTP | Kod | Anlam |
| --- | --- | --- |
| 404 | `POST_NOT_FOUND` | Post yok, silinmiş veya görünür değil |
| 404 | `DELETED_POST_NOT_FOUND` | Restore edilecek silinmiş post yok |
| 409 | `POST_ALREADY_PUBLISHED` | Zaten yayında |
| 409 | `POST_NOT_PUBLISHED` | Zaten draft |
| 409 | `POST_STATE_CONFLICT` | Yayın durumu işlem sırasında değişti |
| 409 | `POST_SLUG_UNAVAILABLE` | Slug üretim deneme sınırı aşıldı |
| 409 | `CATEGORY_HAS_POSTS` | Category’ye bağlı silinmemiş post var |
| 409 | `DUPLICATE_VALUE` | Veritabanında benzersizlik çakışması |
| 422 | `CATEGORY_NOT_AVAILABLE` | Category yok, pasif veya silinmiş |
| 422 | `INVALID_POST_ID` | Geçersiz URL ID |
| 422 | `INVALID_POST_TITLE` | Başlık geçersiz |
| 422 | `INVALID_POST_CONTENT` | İçerik geçersiz |
| 422 | `INVALID_POST_EXCERPT` | Özet geçersiz |
| 422 | `INVALID_POST_CATEGORY` | Category ID geçersiz |
| 422 | `UNSUPPORTED_POST_FIELDS` | Client’ın yazamayacağı alan gönderildi |
| 422 | `MISSING_POST_FIELDS` | PUT alanları eksik |
| 422 | `EMPTY_POST_PATCH_BODY` | PATCH body boş |
| 422 | `INVALID_QUERY_PARAMETER` | Query değeri geçersiz |
| 422 | `UNSUPPORTED_QUERY_PARAMETERS` | Query alanı tanımsız |

Örnek `422` yanıtı:

```json
{
  "success": false,
  "error": {
    "code": "CATEGORY_NOT_AVAILABLE",
    "message": "Seçilen category kullanılamıyor.",
    "details": {"field": "category_id"}
  },
  "request_id": "..."
}
```

`CATEGORY_HAS_POSTS` yanıtında mesaj `Bu categoryye bağlı aktif postlar var.`, details ise `{"active_posts":3}` gibi bir nesnedir. Bozuk JSON için `400 INVALID_JSON`, eşleşmeyen endpoint için `404 ROUTE_NOT_FOUND` döner. Bunlar body alanı doğrulamasından farklı hatalardır.

## Test Matrisi

Aşağıdaki değerler **beklenen sonuçlardır**, tamamlanmış test raporu değildir. README güncellemesi sırasında canlı API/DB testleri çalıştırılmamıştır. Projede `npm test` scripti bulunmaz.

| Senaryo | Beklenen |
| --- | --- |
| Health | 200 |
| Yanlış parola ile login | 401 INVALID_CREDENTIALS |
| Header olmadan korumalı endpoint | 401 AUTHENTICATION_REQUIRED + WWW-Authenticate |
| Normal kullanıcıyla users | 403 FORBIDDEN, required_roles admin, WWW-Authenticate yok |
| Admin ile kullanıcı oluşturma | 201, role user |
| Normal kullanıcıyla rol değiştirme | 403 |
| Admin ile başka kullanıcının rolünü değiştirme | 200; aynı token sonraki istekte yeni rolü kullanır |
| Geçersiz role / kendi rolünü değiştirme | 422 / 409 |
| Normal kullanıcıyla category ve post oluşturma | 201 |
| Post listesi / detayı | Listede content yok, detayda var |
| Başkasının draftını okuma | 404 POST_NOT_FOUND |
| Başkasının published postunu okuma | 200 |
| Başkasının postunu PUT/PATCH/publish/unpublish/delete/restore | 403 POST_FORBIDDEN |
| Admin ile başka yazarın postunu değiştirme | 200 |
| Normal kullanıcıyla include_deleted=1 | 403 FORBIDDEN |
| Admin ile include_deleted=1 | 200, silinmiş kayıtlar dahil |
| Başka yazar filtresiyle draft listeleme | Yetkisiz draftlar listede yok |
| Client’ın user_id/slug/status/published_at göndermesi | 422 UNSUPPORTED_POST_FIELDS |
| Eksik PUT / boş PATCH | 422 MISSING_POST_FIELDS / EMPTY_POST_PATCH_BODY |
| Olmayan, pasif veya silinmiş category ile create | 422 CATEGORY_NOT_AVAILABLE |
| İlk publish / tekrar publish | 200 / 409 |
| Unpublish ve tekrar publish | İlk published_at korunur |
| Soft delete / detay / restore | 200 / 404 / 200 |
| Silinmemiş postu restore | 404 DELETED_POST_NOT_FOUND |
| Draft veya published postu olan category’yi silme | 409 CATEGORY_HAS_POSTS |
| Bağlı tüm postları soft delete ettikten sonra category silme | 200 |
| Logout / aynı token ile me | 200 / 401 ACCESS_TOKEN_REVOKED |

Yukarıdaki curl akışı temel senaryoları kapsar. Matristeki diğer varyasyonlar ayrıca denenmelidir. [Eski curl senaryoları](docs/curl-scenarios.md) v2 referansıdır; v4 için bu README’deki authentication ve role kurallarını kullanın.

## Security Decisions

- Parolalar rastgele salt ile scrypt hash olarak saklanır; login yanıtları hash içermez.
- Login, bulunamayan kullanıcı ve yanlış parola için aynı credential hatasını verir; kullanıcı/hash yoksa dummy parola çalışması yapılır.
- JWT için HS256, issuer, audience, süre ve claim kontrolleri uygulanır. Secret en az 32 byte olmalıdır.
- Her istekte token iptali ve kullanıcının aktifliği kontrol edilir. Logout yalnızca kullanılan token’ın jti değerini iptal eder.
- Roller veritabanından okunur; kullanıcı gönderdiği body veya token rolüyle yetki kazanamaz.
- User CRUD admin ile, Post yazma işlemleri sahiplik/admin ile sınırlandırılır. Draft görünürlüğü liste ve detayda uygulanır.
- Parametreli SQL ve izin verilen sıralama/alan listeleri kullanılır.
- Token yanıtları `Cache-Control: no-store` ve `Pragma: no-cache` ile döner; loglarda request body veya token yazdırılmaz.
- Bu projenin yetki tablosu gereği category oluşturma, düzenleme ve silme giriş yapan herkese açıktır.

## Bilinen Sınırlamalar

- Rate limit sayaçları süreç belleğinde; API yeniden başlayınca sıfırlanır, birden fazla API container'ı sayaç paylaşmaz.
- Reverse proxy arkasında trust proxy ayarlanmadan bütün istemciler tek IP görünür.
- Çok IP'si olan saldırgan login_account limitini IP başına ayrı ayrı kullanabilir; IPv6'da tek kullanıcı çok adrese sahiptir.
- Register limiti yalnız IP başına; +etiket adreslerle aynı gelen kutusuna çok sayıda doğrulama maili gönderilebilir.
- email/change/confirm ve PATCH /password kod denemeleri ayrıca limitlenmedi; kod başına beş deneme ve account_code_mail ile sınırlı.
- Docker database'ine migration elle exec ile çalıştırılır; hangi migrationın koştuğunu tutan tablo yok.
- Docker kurulumu yerel geliştirme içindir; HTTPS, reverse proxy ve sunucu deploy yok.
- Otomatik entegrasyon test paketi, refresh token ve MFA yoktur.
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

## Linux date Notları

Linux/GNU date ile yerel saat, UTC ve Unix timestamp görüntüleme:

```bash
date
date -u
date '+%Y-%m-%d %H:%M:%S %Z'
date +%s
TZ=Europe/Istanbul date '+%Y-%m-%d %H:%M:%S %Z'
date -u -d '@1788717600' '+%Y-%m-%dT%H:%M:%SZ'
```

`TZ=... date` yalnızca o komutun gösterimini değiştirir; sistem saatini değiştirmez. `date +%s`, örneklerde benzersiz test verisi üretmeye yardımcı olur. JWT `iat`/`exp` değerleri Unix saniyesidir; JSON tarihlerindeki `Z` UTC’yi belirtir. MySQL bağlantısı ayrıca timezone yapılandırmadığından deployment ortamında Node/MySQL saat dilimi uyumu doğrulanmalıdır.

## Sonraki Adımlar

- Paylaşılan rate limit deposu (Redis) ve birden fazla API container'ı
- Reverse proxy (nginx), trust proxy ve HTTPS
- Sunucuya deploy (VPS üzerinde docker compose)
- Migration takip tablosu veya migration aracı
- Authorization ve Post contractlarını ilgili notes dosyalarında tamamlamak
- Test matrisini otomatik entegrasyon testlerine dönüştürmek
- FORBIDDEN yanıtlarını, parola politikasını ve body/validator boyut sınırlarını tutarlı hale getirmek
- Son admin koruması ve token iptal kayıtlarının periyodik temizliğini eklemek
- Category/post eşzamanlılık ve restore/publish kullanılabilirlik kurallarını netleştirmek
- Request ID üretimini JSON parse hatalarını da kapsayacak şekilde geliştirmek

## Lisans

ISC
