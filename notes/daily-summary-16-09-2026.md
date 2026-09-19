# 16.09.2026 Gün Sonu Özeti

Bu özet mevcut dosyalara göre hazırlanmıştır. Komut sırası, yaşanan hatalar ve zorlanılan konu bölümleri kişisel deneyime göre uyarlanacak örnek taslaktır.

## Eklediğim ve Güncellediğim Dosyalar

Rate limit için `src/config/rate-limit.config.js`, `src/middlewares/rate-limit.js`, `src/middlewares/rate-limiters.js`, `src/utils/sliding-window-limiter.js` ve `scripts/check-sliding-window.js` eklendi. `server.js`, auth ve yorum route'ları, `package.json` ve `.env.example` güncellendi.

Docker için `Dockerfile`, `compose.yaml` ve `.dockerignore` eklendi; `.gitignore` güncellendi. README ve rate limit/Docker notlarıyla kullanım adımları açıklandı.

## Dokuz Limiter Hangi Saldırıyı Durduruyor

Bu limiter'lar saldırı hızını azaltır; tamamen engelleme garantisi vermez.

| Limiter | Sınırladığı davranış |
| --- | --- |
| `login_ip` | Tek IP'den çok sayıda giriş denemesi |
| `login_account` | Aynı IP'den aynı hesabın parolasını tahmin etme |
| `register` | Tek IP'den toplu hesap açma |
| `public_code_mail_ip` | Tek IP'den çok sayıda kod maili isteme |
| `public_code_mail_email` | Aynı adrese farklı IP'lerden kod maili yağdırma |
| `code_check_ip` | Tek IP'den çok sayıda doğrulama kodu deneme |
| `code_check_email` | Aynı hesap için farklı IP'lerden kod tahmin etme |
| `account_code_mail` | Giriş yapan hesabın sürekli değişiklik kodu istemesi |
| `comment_create` | Bir hesabın kısa sürede yorum spam'i yapması |

## Docker'da İlk Çalıştırdığım Beş Komut ve Ne Yaptıkları

Örnek sıra (README'deki şablon dosyaları hazır olmalı):

1. `cp .env.docker.example .env.docker`: API ortam dosyasını oluşturur.
2. `cp .env.db.example .env.db`: Database ortam dosyasını oluşturur.
3. `openssl rand -hex 32`: Parola/anahtar üretir; her ayrı değer için tekrarlanıp ortam dosyalarına yazılır.
4. `docker compose up -d`: API ve database'i arka planda başlatır.
5. `docker compose ps`: Container durumlarını gösterir.

Sonrasında `curl -i http://localhost:3001/health` ile API kontrol edilir.

## Yaşadığım İki Container Hatası ve Düzeltmeleri

Örnek hata 1: API'de `DB_HOST=127.0.0.1` kullanınca database'e bağlanılamaz. Compose içindeki `DB_HOST=db` ve `DB_PORT=3306` ayarları bunu çözer.

Örnek hata 2: Dolu volume varken ortam dosyasında MySQL parolasını değiştirmek `Access denied` hatasına yol açabilir. Mevcut parolayla bağlantı kurulup MySQL kullanıcısının parolası değiştirilir ve API ayarı onunla eşleştirilir; volume'u silmek veriyi de siler.

## Rate Limit ile Docker Nerede Çakışıyor

Rate limit sayaçları API belleğinde olduğu için container yeniden başlayınca sıfırlanır. İki API container'ı aynı database'i kullansa bile sayaçları paylaşmaz; proxy arkasında IP'nin doğru görülmesi de ayrıca ayar ister.

## Bugün En Çok Zorlandığım Konu Neydi

Örnek kişisel değerlendirme: En çok container içindeki adres ile bilgisayardaki adresin farkını anlamakta zorlandım. API'nin database'e `db:3306` ile, benim ise bilgisayardan `127.0.0.1:3307` ile ulaşmam gerektiğini ayırınca konu netleşti.

## Kendi Cümlelerimle Günün Özeti

Rate limit ile giriş, kod gönderme ve yorum isteklerinin hızını sınırlandırmayı öğrendim. Docker ile API ve database'i ayrı çalıştırırken verinin volume'da, sayaçların ise geçici süreç belleğinde kaldığını anladım.
