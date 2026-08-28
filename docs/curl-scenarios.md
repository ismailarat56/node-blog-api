# User CRUD API v2 curl senaryoları

Bu belge, API'nin temel ve hata akışlarını elle doğrulamak için sıralı curl örnekleri içerir.

## Hazırlık

Uygulamayı başlatın ve başka bir terminalde temel adresi tanımlayın:

```bash
export BASE_URL=http://localhost:3000
```

Her cevabın `X-Request-Id` başlığı içerdiğini görmek için örneklerde `-i` seçeneği kullanılmıştır.

## 1. Sağlık kontrolü

```bash
curl -i "$BASE_URL/health"
```

Beklenen durum: `200 OK` ve `success: true`.

## 2. Kullanıcı oluşturma

```bash
curl -i -X POST "$BASE_URL/api/v1/users" \
  -H 'Content-Type: application/json' \
  -H 'X-Request-Id: curl-create-user' \
  -d '{"name":"Ali Yılmaz","email":"ali@example.com"}'
```

Beklenen durum: `201 Created`. Sonraki komutlarda kullanmak için cevap içindeki `data.id` değerini not edin:

```bash
export USER_ID=1
```

## 3. Tekrarlanan e-posta kontrolü

```bash
curl -i -X POST "$BASE_URL/api/v1/users" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Başka Kullanıcı","email":"ali@example.com"}'
```

Beklenen durum: `409 Conflict` ve `EMAIL_ALREADY_EXISTS` hata kodu.

## 4. Arama, filtreleme, sıralama ve sayfalama

```bash
curl -i --get "$BASE_URL/api/v1/users" \
  --data-urlencode 'search=ali' \
  --data-urlencode 'is_active=1' \
  --data-urlencode 'sort_by=name' \
  --data-urlencode 'sort_order=asc' \
  --data-urlencode 'page=1' \
  --data-urlencode 'limit=10'
```

Beklenen durum: `200 OK`. Cevapta `data` dizisi ile `meta.page`, `meta.limit`, `meta.total`, `meta.total_pages`, `meta.has_next_page` ve `meta.has_previous_page` alanları bulunur.

## 5. Kullanıcı detayını görüntüleme

```bash
curl -i "$BASE_URL/api/v1/users/$USER_ID"
```

Beklenen durum: `200 OK`.

## 6. Tam güncelleme

```bash
curl -i -X PUT "$BASE_URL/api/v1/users/$USER_ID" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ali Veli Yılmaz","email":"ali.veli@example.com"}'
```

Beklenen durum: `200 OK` ve `Kullanıcı güncellendi.` mesajı.

## 7. Kısmi güncelleme

```bash
curl -i -X PATCH "$BASE_URL/api/v1/users/$USER_ID" \
  -H 'Content-Type: application/json' \
  -d '{"is_active":false}'
```

Beklenen durum: `200 OK`; yalnızca gönderilen alan değişir.

Boş PATCH gövdesinin reddedildiğini doğrulayın:

```bash
curl -i -X PATCH "$BASE_URL/api/v1/users/$USER_ID" \
  -H 'Content-Type: application/json' \
  -d '{}'
```

Beklenen durum: `422 Unprocessable Entity` ve `EMPTY_PATCH_BODY` hata kodu.

## 8. Soft delete

```bash
curl -i -X DELETE "$BASE_URL/api/v1/users/$USER_ID"
```

Beklenen durum: `200 OK`. Kayıt veritabanından fiziksel olarak kaldırılmaz; `deleted_at` doldurulur ve `is_active` değeri `0` olur.

Normal detay sorgusunda kayıt görünmemelidir:

```bash
curl -i "$BASE_URL/api/v1/users/$USER_ID"
```

Beklenen durum: `404 Not Found`.

Silinmiş kayıtları listelemeye dahil edin:

```bash
curl -i "$BASE_URL/api/v1/users?include_deleted=true"
```

Beklenen durum: `200 OK`; silinen kayıt `deleted_at` değeriyle listelenir.

## 9. Kullanıcıyı geri getirme

```bash
curl -i -X PATCH "$BASE_URL/api/v1/users/$USER_ID/restore"
```

Beklenen durum: `200 OK`; `deleted_at` yeniden `null`, `is_active` yeniden `1` olur.

Aynı kullanıcıyı ikinci kez geri getirmeyi deneyin:

```bash
curl -i -X PATCH "$BASE_URL/api/v1/users/$USER_ID/restore"
```

Beklenen durum: `404 Not Found` ve `DELETED_USER_NOT_FOUND` hata kodu.

## 10. Geçersiz istekler

Geçersiz kullanıcı ID'si:

```bash
curl -i "$BASE_URL/api/v1/users/not-a-number"
```

Beklenen durum: `400 Bad Request` ve `INVALID_USER_ID` hata kodu.

Geçersiz JSON:

```bash
curl -i -X POST "$BASE_URL/api/v1/users" \
  -H 'Content-Type: application/json' \
  -d '{"name":'
```

Beklenen durum: `400 Bad Request` ve `INVALID_JSON` hata kodu.

Bulunmayan endpoint:

```bash
curl -i "$BASE_URL/api/v1/unknown"
```

Beklenen durum: `404 Not Found` ve `ROUTE_NOT_FOUND` hata kodu.
