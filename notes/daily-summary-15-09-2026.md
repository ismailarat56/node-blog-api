# 15.09.2026 Gün Sonu Özeti

Bu özeti son commit olan `a8331ed` (`Merge pull request #9 from ismailarat56/feature/verification-codes`) ile ana dala alınan değişikliklere göre hazırladım. İlk parent ile merge commit arasındaki farkı esas aldım; içerideki özellik commit’i `5cc02d2` (`feat: implement email verification system`).

## Eklediğim ve Güncellediğim Dosyalar

E-posta doğrulamasını ve diğer kodlu işlemleri yönetmek için ortak servis, controller, model ve yardımcı dosyalar ekledim. Mevcut kayıt, giriş, parola değiştirme ve mail gönderme kodlarını bu altyapıyı kullanacak şekilde güncelledim.

| Dosyalar                                                                          | Değişiklik                                                                                                                                                                                  |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sql/migrations/011_add_email_verified_at_to_users.sql` ve rollback dosyası       | Kullanıcılara `email_verified_at` alanını ekledim; mevcut kullanıcıları `created_at` değeriyle doğrulanmış saydım.                                                                          |
| `sql/migrations/012_create_verification_codes.sql` ve rollback dosyası            | Doğrulama kodlarının özeti, amacı, hedef adresi, süresi, deneme sayısı ve tüketilme zamanını tutan tabloyu ekledim.                                                                         |
| `src/config/verification.config.js`, `src/utils/verification-code.js`             | Süre ve deneme sınırlarını, anahtar doğrulamasını, kod üretimini ve HMAC karşılaştırmasını ekledim.                                                                                         |
| `src/models/verification-code.model.js`, `src/services/verification.service.js`   | Kod kaydı, eski kodları geçersizleştirme, deneme sayma, tüketme ve mail hazırlama işlemlerini ortaklaştırdım.                                                                               |
| `src/controllers/verification.controller.js`, `src/routes/auth.routes.js`         | E-posta doğrulama, yeniden kod isteme, parola sıfırlama, parola değişikliği kodu ve e-posta değiştirme endpointlerini ekledim.                                                              |
| `src/controllers/auth.controller.js`, `src/models/auth.model.js`                  | Kayıtta doğrulama kodu gönderilmesini, doğrulanmamış hesapların girişinin reddedilmesini ve kodla parola değiştirmeyi ekledim; doğrulama, sıfırlama ve adres güncelleme sorgularını yazdım. |
| `src/validators/auth.validator.js`, `src/validators/user.validator.js`            | Yeni istek gövdelerini, altı haneli kodları ve ortak e-posta doğrulamasını düzenledim.                                                                                                      |
| `src/utils/mail-templates.js`, `src/utils/mailer.js`, `src/config/mail.config.js` | Kod ve adres değişikliği maillerini ekledim; geliştirme ortamındaki mail kutusu desteğini bağladım.                                                                                         |
| `src/utils/dev-mail-outbox.js`, `src/routes/dev.routes.js`, `src/app.js`          | Son 50 maili bellekte tutan geliştirme kutusunu ve adrese göre son maili okuyan endpointi ekledim.                                                                                          |
| `.env.example`, `server.js`                                                       | `VERIFICATION_CODE_KEY` ve `DEV_MAIL_OUTBOX` ayarlarını ekledim; başlangıçta doğrulama ayarlarının kontrol edilmesini sağladım.                                                             |

Geliştirme mail kutusu yalnızca `MAIL_TRANSPORT=json` ile açılabiliyor ve `production` ortamında açılması yapılandırma hatası veriyor. Aynı committe `notes/postman-notes.md` ile `postman/node-blog-api.postman_collection.json` dosyaları da silinmiş; bu değişiklikleri yeni özellik olarak değil, commit kapsamındaki kaldırmalar olarak kaydettim.

## Dört Akış Aynı Servisi Nasıl Kullanıyor

Kayıt sonrası e-posta doğrulama, unutulan parolayı sıfırlama, giriş yapmışken parola değiştirme ve e-posta adresini değiştirme akışlarını aynı `verification.service.js` üzerinden yürüttüm. Her akış `issueVerificationCode` ile kod istiyor ve `consumeVerificationCode` ile kodu doğrulayıp tüketiyor; aralarındaki ayrımı `userId` ve `purpose` değerleri sağlıyor.

| Akış               | `purpose`            | Kod doğrulandıktan sonraki işlem                                                                            |
| ------------------ | -------------------- | ----------------------------------------------------------------------------------------------------------- |
| E-posta doğrulama  | `email_verification` | `email_verified_at` dolduruluyor ve hoş geldin maili hazırlanıyor.                                          |
| Parola sıfırlama   | `password_reset`     | Yeni parola kaydediliyor; `password_changed_at` güncelleniyor ve gerekiyorsa e-posta doğrulanmış sayılıyor. |
| Parola değiştirme  | `password_change`    | Mevcut parola kontrolüne ek olarak kod aranıyor, ardından parola güncelleniyor.                             |
| E-posta değiştirme | `email_change`       | Kod yeni adrese gönderiliyor; onayda kayıttaki `target_email` kullanılarak adres değiştiriliyor.            |

Kodun HMAC girdisinde kullanıcı ve amaç da bulunduğu için bir akışın kodu başka bir amaç için doğrudan kullanılamıyor. E-posta değişikliğinde eski adrese istek bildirimi, işlem tamamlandığında ise hem eski hem yeni adrese sonuç bildirimi hazırlanıyor.

## Altı Haneli Kodu Güvenli Yapan Üç Kural

Altı haneli bir kodun güvenliğini yalnızca rakam sayısına bırakmadım. Kullanımını aşağıdaki üç kuralla sınırlandırdım.

1. **Kısa geçerlilik:** Kod 600 saniye, yani 10 dakika geçerli kalıyor. Süresi dolan kayıt doğrulamada kabul edilmiyor.
2. **Sınırlı deneme ve yeniden gönderim:** Bir kod için en fazla beş doğrulama denemesine izin veriliyor; doğru deneme de bu sayıya dahil. Aynı kullanıcı ve amaç için bekleyen kod varken 60 saniyelik yeniden gönderim beklemesi uygulanıyor.
3. **Tek kullanımlılık:** Başarılı doğrulamada `consumed_at` dolduruluyor ve aynı kayıt yeniden tüketilemiyor. Yeni kod üretilirken aynı kullanıcı ve amacın bekleyen eski kodları da geçersizleştiriliyor.

Kodu `crypto.randomInt` ile ürettim ve baştaki sıfırlar kaybolmasın diye altı karakterlik string olarak tuttum. Veritabanına açık kod yerine ayrı bir anahtarla üretilen HMAC-SHA256 özetini kaydettim; karşılaştırmada `timingSafeEqual` kullandım. Deneme artırma ve tüketme işlemlerindeki koşullu SQL güncellemeleri bu sınırları veritabanında da kontrol ediyor.

## Hangi Endpointler Hesap Varlığını Gizliyor, Hangileri Gizlemiyor

`POST /api/v1/auth/password/forgot` ve `POST /api/v1/auth/email/verify/resend`, geçerli biçimdeki isteklerde hesap uygun olsa da olmasa da aynı `202` yanıtını ve genel mesajı döndürüyor. Bekleme süresi dolmamışsa da bu endpointler `429` ile ayrım yapmıyor; böylece normal yanıtın durum kodu ve içeriği üzerinden hesap varlığını açıklamıyorlar.

`POST /api/v1/auth/email/verify` ve `POST /api/v1/auth/password/reset`, uygun hesap bulunmaması ile hatalı veya süresi dolmuş kod durumlarında ortak `422 INVALID_VERIFICATION_CODE` hatasını kullanıyor. Bu davranış yanıt içeriğini ortaklaştırıyor; kodda yanıt sürelerini eşitleyen bir mekanizma bulunmadığı için tam bir zamanlama gizliliği sağlandığını söyleyemem.

`POST /api/v1/auth/register`, kayıtlı adres için `409 EMAIL_ALREADY_EXISTS` döndürerek adresin kullanımda olduğunu açıklıyor. Giriş gerektiren `POST /api/v1/auth/email/change` ve `/email/change/confirm` de adres çakışmasında aynı bilgiyi veriyor. `POST /api/v1/auth/login`, yanlış kimlik bilgilerinde genel hata kullanıyor; doğru parola ve aktif hesap kontrolünden sonra doğrulanmamış adres için `403 EMAIL_NOT_VERIFIED` döndürüyor.

## 11.09'daki password_changed_at Bugün Neyi Korudu

Önceden eklediğim `password_changed_at` alanını bugün parola sıfırlama akışında da güncelledim. Authentication middleware’i JWT'nin `iat` değerini bu zamanla karşılaştırdığı için parola değişiminden önce üretilmiş tokenlar sonraki isteklerde `401 ACCESS_TOKEN_STALE` ile reddediliyor.

Böylece parolayı sıfırlamak yalnızca yeni parolayı kaydetmekle kalmıyor, eski tokenların kullanılmasını da sınırlandırıyor. Giriş yapmış kullanıcının parola değiştirme akışında işlemi yapan token ayrıca `jti` üzerinden iptal ediliyor. Karşılaştırma saniye hassasiyetinde ve `<` koşuluyla yapıldığı için aynı saniyede üretilmiş diğer tokenlar bu zaman kontrolüne takılmayabilir; mevcut kodu bütün tokenları koşulsuz iptal ediyor diye özetlemiyorum.

## Bugün En Çok Zorlandığım Konu Neydi

Kod değişikliklerine bakarak günün en zorlayıcı kısmını, ortak kod doğrulama mantığıyla her akışın farklı kimlik ve yanıt kurallarını birlikte düzenlemek olarak özetliyorum. Örneğin parola sıfırlamada giriş şartı yokken parola değiştirmede oturum, mevcut parola ve doğrulama kodu birlikte gerekiyor; herkese açık kod isteme endpointlerinde ise hesap durumunu açıklamamak gerekiyor.

Bir diğer dikkat gerektiren nokta, kodun tüketilmesi ile kullanıcı bilgisinin güncellenmesinin ayrı sorgular olması. Bunlar ortak transaction içinde olmadığı için sonraki güncelleme başarısız olsa bile kod tüketilmiş kalabiliyor; ortak servis kullanmak işlemin tamamını otomatik olarak atomik yapmıyor. Bu bölüm değişikliklerin teknik karmaşıklığına dayanan bir değerlendirme; commit geçmişi kişisel çalışma süresini veya yaşanan denemeleri göstermiyor.

## Kendi Cümlelerimle Günün Özeti

Bugün e-posta adresini yalnızca kullanıcı tablosunda tutulan bir bilgi olmaktan çıkarıp kodla doğrulanan hesap işlemlerinin parçası haline getirdim. Dört farklı işlem için aynı kod servisini kullanarak süre, deneme sınırı ve tek kullanımlılık kurallarını tek yerde topladım.

Bu çalışmadan çıkardığım temel sonuç, kod üretmenin tek başına yeterli olmadığı; kodun kime, hangi amaçla ve ne kadar süreyle verildiğinin de kontrol edilmesi gerektiği oldu. Önceki parola değişim zamanı kontrolünü yeni sıfırlama akışına bağladım ve hesap varlığını gizleme davranışının endpointlere göre değiştiğini netleştirdim. Bu özet commit ve kaynak kod incelemesine dayanıyor; canlı API veya mail teslimatı testi çalıştırıldığı iddiasını içermiyor.
