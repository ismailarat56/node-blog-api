# Docker Notları

## Image, Container, Volume, Network

Image, uygulama ve bağımlılıklarını içeren şablondur; container bu şablonun çalışan halidir. Volume, database verisini container silinse de saklar; network ise API ile database'in haberleşmesini sağlar.

## Katman Önbelleği ve COPY Sırası

Önce `package.json` ve `package-lock.json` kopyalanıp `npm ci --omit=dev` çalıştırılır. Uygulama dosyaları sonra kopyalandığı için yalnızca kod değiştiğinde bağımlılık katmanı önbellekten kullanılabilir.

## Container İçinde 127.0.0.1 Neden Database Değil

API container'ında `127.0.0.1`, API container'ının kendisidir. MySQL başka container'da olduğu için bağlantı adresi Compose servis adı olan `db`, portu ise `3306` olur; bilgisayardan erişim portu `3307`'dir.

## depends_on ve Healthcheck

`depends_on` içindeki `service_healthy` koşulu, API başlamadan önce database healthcheck'inin başarılı olmasını bekler. Buradaki `mysqladmin ping` sunucunun cevap verdiğini kontrol eder; uygulama parolasının doğruluğunu veya bütün tabloların hazır olduğunu garanti etmez.

## Başlangıç SQL'i ve Parola Neden Bir Kez Okunur

MySQL image'ı başlangıç SQL'ini ve kullanıcı/parola oluşturma ayarlarını yalnızca boş veri diziniyle ilk açılışta uygular. Volume doluyken `.env.db` parolasını değiştirmek mevcut database parolasını değiştirmez; bunun için MySQL içinde parola güncellenmelidir.

## Ortam Dosyaları ve En Az Yetki

`.env.db` MySQL kurulum ayarlarını, `.env.docker` API ayarlarını taşır; gerçek parolalar Git'e eklenmez. API root yerine uygulama database'ine yetkili ayrı MySQL kullanıcısıyla bağlanır ve Dockerfile uygulamayı `node` kullanıcısıyla çalıştırır.
