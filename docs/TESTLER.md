[← README'ye dön](../README.md)

# Test senaryoları

> Bu belge README'nin önceki sürümünden kelimesi kelimesine taşındı. Metindeki "bu README" ifadeleri o sürümü kasteder.
>
> Güncellik notu: curl akışındaki "normal kullanıcı category oluşturabilir" adımı ve test matrisindeki "Normal kullanıcıyla category ve post oluşturma" satırı eski yetki tablosuna göredir. Kodda category oluşturma admin rolü ister; bu adım için category'yi admin token ile oluşturun. Akış bu taşıma sırasında çalıştırılmadı.
>
> Admin Bootstrap adımı: [KIMLIK_DOGRULAMA.md](KIMLIK_DOGRULAMA.md#admin-bootstrap). Docker kurulumu: [DOCKER.md](DOCKER.md).

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

Yukarıdaki curl akışı temel senaryoları kapsar. Matristeki diğer varyasyonlar ayrıca denenmelidir. [Eski curl senaryoları](curl-scenarios.md) v2 referansıdır; v4 için bu README’deki authentication ve role kurallarını kullanın.

## Docker ile Postman Testleri

`node-blog-nginx` environment'ında `base_url=http://127.0.0.1:8080` kullanın. API portu host'a yayınlanmaz; erişim nginx üzerinden sağlanır. Tokensız ve parolasız örnek: `postman/node-blog-nginx.postman_environment.example.json`. Docker veritabanı yerel MySQL'den ayrıdır: environment'taki `admin_email` / `admin_password` ve `user_email` / `user_password` ile eşleşen aktif, e-postası doğrulanmış kullanıcılar Docker veritabanında da bulunmalıdır. Rolleri sırasıyla `admin` ve `user` olmalıdır.

`04 Posts`, aktif bir kategori için `category_id` ve silinmiş bir kategori için `empty_category_id` değişkenlerine ihtiyaç duyar. İlk hazırlıkta `00 Health → 01 Auth → 03 Categories → 04 Posts` sırasını kullanabilirsiniz; `03 Categories` bu kategori kayıtlarını ve değişkenlerini hazırlar. Kategoriler hazır olduğunda yalnızca `00 Health → 01 Auth → 04 Posts` çalıştırılabilir. Runner'da **Keep variable values** açık olsun; `01 Auth` her koşuda yeni token alır.

Art arda yapılan işlev testleri login kotasını aşabilir. Yerel geliştirmede bu testleri rate limit testlerinden ayrı çalıştırmak için `.env.docker` içinde `RATE_LIMIT_ENABLED=false` kullanıp API servisini yeniden oluşturun. `/health` yanıtının `200` olması, kullanıcıların ve veritabanı şemasının hazır olduğunu tek başına göstermez.

`09 Mail` ve `10 Verification` için `mail_inbox`, `mail_pass_a` ve `mail_pass_b` test değişkenlerini doldurun. `MAIL_TRANSPORT=json` ve `DEV_MAIL_OUTBOX=true` kullanılan Docker ortamında `mail_inbox=postman-regression@example.test` kullanılabilir; gerçek adrese e-posta gönderilmez. `11 Rate Limit` klasörünü `RATE_LIMIT_ENABLED=true` olan ayrı bir koşuda çalıştırın.

## Postman test dosyaları

`12 Cover` klasörünü çalıştırmadan önce dosyaları yerel terminalde hazırlayın:

```bash
curl -fL -sS -o /tmp/kapak.png \
  'https://dummyimage.com/600x400/2f6fed/ffffff.png&text=kapak'
dd if=/dev/urandom of=/tmp/buyuk.png bs=1024 count=2560
dd if=/dev/urandom of=/tmp/cok-buyuk.png bs=1024 count=5120
printf 'bu bir metin dosyasidir' > /tmp/sahte.png
printf 'bu bir metin dosyasidir' > /tmp/not.txt
ls -lh /tmp/kapak.png /tmp/buyuk.png /tmp/cok-buyuk.png \
  /tmp/sahte.png /tmp/not.txt
file --mime-type /tmp/kapak.png /tmp/sahte.png
```

`buyuk.png` 2,5 MiB, `cok-buyuk.png` 5 MiB rastgele veridir; ikinci dosya sonraki nginx boyut sınırı testi içindir. `sahte.png` PNG uzantısına rağmen metin içerir. Postman'de form-data anahtarı `cover`, türü **File** olmalıdır: 12.1 ve 12.5 için `kapak.png`, 12.2 için `buyuk.png`, 12.3 için `not.txt`, 12.4 için `sahte.png` seçin. Multipart `Content-Type` başlığını elle eklemeyin; boundary değerini Postman üretir.

Dosya içeriği koleksiyon export'una gömülmez. Başka bilgisayarda dosyaları yeniden üretip File alanından tekrar seçin; yerel dosya yolu taşınabilir değildir. `/tmp` temizlenirse bu komutları yeniden çalıştırın.

Bu yolları Runner'da kullanmak için Postman **Settings → General → Working directory** değerini `/tmp` seçin. **Allow reading files outside working directory** kapalı kalabilir. Aksi halde Postman dosyayı `PPERM` nedeniyle göndermez ve API `COVER_REQUIRED` döndürür.

Aktif ve e-postası doğrulanmış iki farklı normal kullanıcıya ait `user_token` ve `reader_token`, ayrıca aktif bir `category_id` gereklidir. `12 Cover` istekleri `user_token`, 12.5 isteği `reader_token`, 12.6 ise **No Auth** kullanır. Runner'da **Keep variable values** açıkken 12.0–12.8 sırasıyla çalıştırılır. 12.0 her koşuda ayrı post oluşturup `cover_post_id` koleksiyon değişkenine yazar; 12.1 `cover_url` değişkenini kaydeder, 12.7 kapağı siler.

12.4 ve 12.5 öncesinde ve sonrasında `docker compose exec api ls -la /app/uploads/covers` ile klasörü karşılaştırın: reddedilen yüklemeler yeni dosya bırakmamalıdır. 12.7 sonrasında bu koşuda yüklenen kapak da silinmiş olmalıdır.

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
