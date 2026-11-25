[← README'ye dön](../README.md)

# Kimlik doğrulama ve yetkilendirme

> Bu belge README'nin önceki sürümünden kelimesi kelimesine taşındı. Metindeki "bu README" ifadeleri o sürümü kasteder.
>
> Güncellik notu: aşağıdaki yetki tablosu ve Security Decisions bölümünün son maddesi category yazma işlemlerini giriş yapan herkese açık gösterir. Kodda (`src/routes/category.routes.js`) category oluşturma, güncelleme, silme ve geri getirme `requireRole('admin')` ile sınırlıdır; listeleme ve detay giriş yapan herkese açıktır.
>
> Uç nokta listesi: [API.md](API.md).

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

## Refresh Token ve httpOnly Cookie

| Endpoint / Konu | Davranış |
| --- | --- |
| `POST /api/v1/auth/login` | Access token gövdede (15 dk); refresh token httpOnly cookie'de (7 gün) |
| `POST /api/v1/auth/refresh` | Cookie'deki token'ı tüketir, yenisini cookie'ye yazar, yeni access token döner |
| `POST /api/v1/auth/logout` | Access token'ı ve cookie'deki refresh token ailesini iptal eder, cookie'yi siler |
| Cookie | `refresh_token`; `HttpOnly`; `SameSite=Strict`; `Path=/api/v1/auth`; `Secure` (`REFRESH_COOKIE_SECURE`) |
| Veritabanı | `refresh_tokens`: token'ın kendisi değil SHA-256 özeti saklanır; `family_id` aynı girişten doğan zinciri tutar |
| Rotation | Her refresh eski kaydı `used_at` ile kapatır, aynı aileye yeni kayıt ekler (tek transaction, `FOR UPDATE`) |
| Reuse detection | `used_at` dolu bir token tekrar gelirse bütün aile iptal edilir: `401 REFRESH_TOKEN_REUSED` |

Süreler varsayılan ayarlar içindir. Parola değişince veya sıfırlanınca kullanıcının bütün refresh token'ları iptal edilir. Pasif veya silinmiş kullanıcının refresh isteği aileyi iptal eder; hesap geri açılınca eski oturum dönmez.

| HTTP | Hata kodu | Durum |
| --- | --- | --- |
| 401 | `REFRESH_TOKEN_MISSING` | Refresh cookie'si yok veya boş |
| 401 | `REFRESH_TOKEN_INVALID` | Token biçimi geçersiz, kayıt bulunamadı, süresi dolmuş veya iptal edilmiş; kullanıcı pasif veya silinmiş |
| 401 | `REFRESH_TOKEN_REUSED` | Daha önce kullanılmış token tekrar gönderildi; bütün aile iptal edilir |
| 429 | `RATE_LIMITED` | `refresh_ip` sınırı aşıldı; `Retry-After` kadar beklenmeli |

401 yanıtlarında cookie silinir. 500 gibi geçici hatalarda silinmez.

Cookie'nin zaten bulunmadığı veya boş olduğu `REFRESH_TOKEN_MISSING` yanıtında ayrıca cookie silme başlığı gönderilmez.

Postman'da `postman/node-blog-api.postman_collection.json` içindeki `13 Refresh Token` klasörünü sırayla çalıştırın. Kurulum ve akış notları: [Refresh token notları](../notes/refresh-token-notes.md).

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

## Security Decisions

- Parolalar rastgele salt ile scrypt hash olarak saklanır; login yanıtları hash içermez.
- Login, bulunamayan kullanıcı ve yanlış parola için aynı credential hatasını verir; kullanıcı/hash yoksa dummy parola çalışması yapılır.
- JWT için HS256, issuer, audience, süre ve claim kontrolleri uygulanır. Secret en az 32 byte olmalıdır.
- Her istekte token iptali ve kullanıcının aktifliği kontrol edilir. Logout kullanılan access token’ın jti değerini ve cookie'deki refresh token ailesini iptal eder, cookie'yi siler.
- Roller veritabanından okunur; kullanıcı gönderdiği body veya token rolüyle yetki kazanamaz.
- User CRUD admin ile, Post yazma işlemleri sahiplik/admin ile sınırlandırılır. Draft görünürlüğü liste ve detayda uygulanır.
- Parametreli SQL ve izin verilen sıralama/alan listeleri kullanılır.
- Token yanıtları `Cache-Control: no-store` ve `Pragma: no-cache` ile döner; loglarda request body veya token yazdırılmaz.
- Bu projenin yetki tablosu gereği category oluşturma, düzenleme ve silme giriş yapan herkese açıktır.
