[← README'ye dön](../README.tr.md)

# Uç noktalar ve veri modeli

> Bu belge README'nin önceki sürümünden kelimesi kelimesine taşındı. Metindeki "bu README" ifadeleri o sürümü kasteder.
>
> Güncellik notu: aşağıdaki "Tüm endpoint'ler" tablosu category yazma uçlarında rolü "Herkes" gösterir. Kodda (`src/routes/category.routes.js`) `POST`, `PUT`, `PATCH`, `DELETE` ve `restore` uçları admin rolü ister.
>
> Tabloda yer almayan uçlar hemen aşağıda, `src/routes` dosyalarından derlenmiştir.
>
> Kimlik doğrulama, roller ve refresh token: [KIMLIK_DOGRULAMA.md](KIMLIK_DOGRULAMA.md). Metinde anılan Bilinen Sınırlamalar: [BILINEN_EKSIKLER.md](BILINEN_EKSIKLER.md).

## Tabloda yer almayan uçlar

| Method | Endpoint | Authentication | Role | İşlem |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/auth/refresh` | Hayır (refresh cookie) | - | Oturumu yenile; `refresh_ip` |
| GET | `/api/v1/public/posts` | Hayır | - | Yayındaki postları listele |
| GET | `/api/v1/public/posts/:slug` | Hayır | - | Yayındaki postu slug ile getir |
| GET | `/api/v1/public/posts/:slug/comments` | Hayır | - | Yayındaki postun görünür yorumları |
| GET | `/api/v1/public/categories` | Hayır | - | Kategorileri listele |
| GET | `/api/v1/posts/:postId/comments` | Evet | Herkes | Yorumları listele; `include_hidden` yalnız post yazarı veya admin |
| PATCH | `/api/v1/comments/:id` | Evet | Yorum yazarı veya admin | Yorumu güncelle |
| DELETE | `/api/v1/comments/:id` | Evet | Yorum yazarı, post yazarı veya admin | Yorumu soft delete et |
| PATCH | `/api/v1/comments/:id/hide` | Evet | Post yazarı veya admin | Yorumu gizle |
| PATCH | `/api/v1/comments/:id/unhide` | Evet | Post yazarı veya admin | Yorumu tekrar görünür yap |
| GET | `/api/v1/dev/mail-outbox/latest` | Hayır | - | Yalnız `DEV_MAIL_OUTBOX=true` iken; `to` adresine giden son mail |

## Tüm endpoint’ler

Authentication ve role birbirinden ayrı koşullardır. “Herkes”, authentication gereken satırlarda giriş yapmış kullanıcıları ifade eder.

| Method | Endpoint | Authentication | Role | İşlem |
| --- | --- | --- | --- | --- |
| GET | `/health` | Hayır | - | Uygulama sağlık kontrolü |
| POST | `/api/v1/auth/login` | Hayır | - | Giriş; `login_ip`, `login_account` |
| POST | `/api/v1/auth/register` | Hayır | - | Kayıt; `register` |
| POST | `/api/v1/auth/email/verify` | Hayır | - | E-posta doğrula; `code_check_ip`, `code_check_email` |
| POST | `/api/v1/auth/email/verify/resend` | Hayır | - | Kod gönder; `public_code_mail_ip`, `public_code_mail_email` |
| POST | `/api/v1/auth/password/forgot` | Hayır | - | Sıfırlama kodu gönder; `public_code_mail_ip`, `public_code_mail_email` |
| POST | `/api/v1/auth/password/reset` | Hayır | - | Parolayı sıfırla; `code_check_ip`, `code_check_email` |
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
| PUT | `/api/v1/posts/:postId/cover` | Evet | Yazar veya admin | Kapak yükle/değiştir; `cover_upload` |
| DELETE | `/api/v1/posts/:postId/cover` | Evet | Yazar veya admin | Kapağı sil; `204`, limiter yok |
| PUT | `/api/v1/posts/:id` | Evet | Yazar veya admin | Postu tamamen güncelle |
| PATCH | `/api/v1/posts/:id` | Evet | Yazar veya admin | Postu kısmen güncelle |
| PATCH | `/api/v1/posts/:id/publish` | Evet | Yazar veya admin | Yayınla |
| PATCH | `/api/v1/posts/:id/unpublish` | Evet | Yazar veya admin | Yayından kaldır |
| DELETE | `/api/v1/posts/:id` | Evet | Yazar veya admin | Soft delete et |
| PATCH | `/api/v1/posts/:id/restore` | Evet | Yazar veya admin | Geri getir |

## Kullanıcı listeleme parametreleri

| Parametre | Açıklama | Varsayılan |
| --- | --- | --- |
| `search` | İsim veya e-posta içinde arama | Boş |
| `is_active` | `0`, `1`, `true`, `false` | Tümü |
| `include_deleted` | Silinmiş kayıtları dahil et | `false` |
| `sort_by` | `id`, `name`, `email`, `created_at`, `updated_at` | `id` |
| `sort_order` | `asc`, `desc` | `desc` |
| `page` | Sayfa numarası | `1` |
| `limit` | Sayfa boyutu, en fazla 50 | `10` |

## Rate Limiting

İstekler sliding window ile, son zaman aralığındaki kayıtlar sayılarak sınırlandırılır. Limiti aşan istek `429 RATE_LIMITED` alır; `Retry-After` başlığı bekleme süresini saniye olarak verir. Yanıttaki `error.details` içinde `limit_name` ve `retry_after_seconds` bulunur.

| Limiter | Anahtar | Sınır |
| --- | --- | --- |
| `login_ip` | IP | 15 dakikada 30 |
| `login_account` | IP + e-posta | 15 dakikada 5 |
| `refresh_ip` | IP | Dakikada 60 |
| `register` | IP | Saatte 10 |
| `public_code_mail_ip` | IP | 15 dakikada 10 |
| `public_code_mail_email` | E-posta | Saatte 3 |
| `code_check_ip` | IP | 15 dakikada 30 |
| `code_check_email` | E-posta | Saatte 10 |
| `account_code_mail` | Kullanıcı ID | Saatte 5 |
| `comment_create` | Kullanıcı ID | Dakikada 10 |
| `cover_upload` | Kullanıcı ID | Saatte 20 |

E-posta anahtarı oluşturulurken baştaki/sondaki boşluklar silinir ve harfler küçültülür. Aynı limiter nesnesini kullanan endpointler aynı kotayı paylaşır; sayaçlar yalnızca API sürecinin belleğinde tutulur. Limiter'dan geçen başarısız istekler de sayılır.

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
| PUT | `/api/v1/posts/:postId/cover` | Bearer | Yazar veya admin | 200, `data.cover_url`; `cover_upload` |
| DELETE | `/api/v1/posts/:postId/cover` | Bearer | Yazar veya admin | 204, gövde yok |
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

## Kapak Görseli Yükleme

Kapak için iki uç vardır: `PUT /api/v1/posts/:postId/cover` kapağı yükler veya değiştirir; `DELETE /api/v1/posts/:postId/cover` kapağı siler. İkisi de Bearer token ve post sahibi veya admin yetkisi ister. Post ve yetki kontrolü dosya diske yazılmadan yapılır; yükleme ucunda ayrıca kullanıcı başına saatte 20 istek sınırı olan `cover_upload` limiter'ı çalışır.

Yükleme isteği `multipart/form-data` biçiminde, tek dosyalık `cover` alanıyla gönderilir. İzin verilen türler `image/jpeg`, `image/png` ve `image/webp`; varsayılan dosya sınırı 2 MB (`2097152` bayt, 2 MiB) olur. Sunucu dosya adını rastgele üretir ve izin verilen türe göre `.jpg`, `.png` veya `.webp` uzantısını seçer; istemcinin dosya adı kullanılmaz.

Dosya kaydedildikten sonra ilk 12 bayt üzerinden imza kontrolü yapılır. Beyan edilen tür ile imza uyuşmazsa yeni dosya silinir ve `415 COVER_CONTENT_MISMATCH` döner. Kontrol geçerse veritabanındaki `cover_path` güncellenir, eski kapak varsa silinir ve `200` yanıtındaki `data.cover_url` alanı `/uploads/covers/<rastgele>.png` gibi bir adres verir. Post yanıtlarında da `cover_url` bulunur; kapak yoksa değeri `null` olur. Silme başarılıysa gövdesiz `204`, kapak zaten yoksa `404 COVER_NOT_FOUND` döner.

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
| 422 | `COVER_REQUIRED` | Multipart isteğinde `cover` dosyası eksik |
| 413 | `COVER_TOO_LARGE` | Dosya `UPLOAD_MAX_BYTES` sınırında reddedildi; `error.details.max_bytes` sınırı belirtir |
| 415 | `COVER_TYPE_NOT_ALLOWED` | Beyan edilen tür izinli değil veya beklenmeyen dosya alanı var |
| 415 | `COVER_CONTENT_MISMATCH` | Dosya imzası beyan edilen türle uyuşmuyor; yeni dosya silinir |
| 404 | `COVER_NOT_FOUND` | Silinecek kapak kaydı yok |
| 413 | `PAYLOAD_TOO_LARGE` | Nginx toplam gövdeyi `client_max_body_size` sınırında reddetti |
| 502 | `UPSTREAM_UNAVAILABLE` | Nginx'in ürettiği 502/504 hatası JSON 502 yanıtına çevrildi |

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
