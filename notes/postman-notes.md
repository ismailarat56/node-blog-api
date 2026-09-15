# 09 Mail ve regression — 2026-09-14

Açık Postman uygulamasındaki Node Blog API koleksiyonuna 09 Mail eklendi.
Koleksiyon dışa aktarımı: node-blog-api.postman_collection.json (v2.1, 10 klasör, 238 istek).
Önceki aynı adlı dosya bir test raporuydu; artık içe aktarılabilir gerçek koleksiyon içeriyor.

## Environment ve çalıştırma

- mail_inbox, mail_pass_a ve mail_pass_b node-blog-local environment yerel değerlerinde. Paylaşılan değerleri ve example JSON alanları boş.
- Parolalar blog test kullanıcısına aittir; Gmail uygulama parolası değildir.
- 3000 portunda başka bir Next.js uygulaması vardı. Blog API, mevcut .env ile `PORT=3001 npm start` üzerinden başlatıldı; base_url yerel değeri http://localhost:3001 oldu.
- Klasörü ilk istekten başlayarak sıralı çalıştırın. Folder pre-request her istekten önce çalıştığından yeni alias yalnızca 01 POST register (mail) adımında üretilir; altı adım boyunca sabit kalır. Sonraki koşuda yeni alias üretilir.
- Gmail +blog<zaman> adreslemesi kullanılır. Gelen kutusuna teslimi ayrıca kontrol edin.

## Dokuz kontrol

- [x] Üç environment değişkeni eklendi; örnek değerler boş.
- [x] Her kayıt koşusunda yeni alias, akış boyunca aynı e-posta.
- [x] Register No Auth: 201 ve gövdede messageId yok.
- [x] İlk login No Auth: 200, data.access_token kaydedildi.
- [x] Password PATCH: mail_user_token ile 200.
- [x] Eski token ile me: 401 ve ACCESS_TOKEN_REVOKED.
- [x] Yeni parolayla login ve yeni token ile me: 200.
- [x] Bağımsız mail koşusu: 6 istek, 8/8 assertion; SMTP register/password-change loglarında accepted=1.
- [ ] Tam regression yeşil: çalıştırıldı, 274 geçti / 182 başarısız (456 assertion).

## Tam regression sonucu

| Klasör | İstek | Geçen | Başarısız |
| --- | ---: | ---: | ---: |
| 00 Health | 1 | 1 | 0 |
| 01 Auth | 17 | 32 | 0 |
| 02 Users | 25 | 29 | 12 |
| 03 Categories | 36 | 41 | 15 |
| 04 Posts | 53 | 29 | 58 |
| 05 Public | 15 | 28 | 6 |
| 06 Register | 9 | 19 | 2 |
| 07 Comments | 61 | 50 | 89 |
| 08 Password Change | 15 | 37 | 0 |
| 09 Mail | 6 | 8 | 0 |

01 Auth, 08 Password Change ve 09 Mail tamamen geçti. 09 Mail tam regression içinde de 8/8 geçti; iki başarılı koşu tekrar çalıştırılabilirliği doğruladı.

İlk hata örnekleri: 02 Users oluşturma isteği sabit e-posta ile 409 aldı. 03 Categories oluşturma isteği sabit ARAT slug'ı ile 409 aldı. category_id oluşmayınca 04 Posts gövdesindeki tırnaksız {{category_id}} 400 ile sonuçlandı. 07 Comments cevap isteğinde {{comment_id}} çözülmediği için 400 görüldü. Bunlar mevcut klasörlerin veri ve istek bağımlılıklarını düzeltmeyi gerektiriyor; 00–08 istek tanımları bu çalışmada değiştirilmedi.

Ayrıntılı, request body ve token içermeyen rapor: postman/mail-regression-results.json. Postman’da tam regression sonuç ekranı açık bırakıldı.
