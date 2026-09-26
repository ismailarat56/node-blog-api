# nginx Notları

## Reverse Proxy Ne İşe Yarar

İstemci `127.0.0.1:8080` adresindeki nginx'e gelir; nginx API isteklerini Compose ağındaki `api:3000` adresine iletir. API'nin host'a yayınlanan portu kaldırıldığı için doğrudan `127.0.0.1:3001` bağlantısı kurulamaz, fakat aynı ağdaki nginx API'ye ulaşabilir. Nginx ayrıca büyük istekleri daha API'ye ulaşmadan keser ve `/uploads/` altındaki görselleri ortak volume'dan kendisi sunar.

## X-Forwarded-For ve İki Katmanlı Koruma

Nginx `X-Forwarded-For` başlığını `$remote_addr` ile yeniden yazar; istemcinin gönderdiği sahte IP zincirini ekleyerek korumaz. Express tarafında `TRUST_PROXY_HOPS=1`, doğrudan karşısındaki tek proxy katmanını güvenilir sayarak nginx'in aktardığı adresi `request.ip` için kullanır. API portunun dışarı kapalı olması istemcinin nginx'i atlayıp başlığı doğrudan Express'e göndermesini engeller. Proxy sayısı değişirse bu değer de yeniden değerlendirilmelidir; yalnızca atlama sayısına güvenmek farklı uzunluktaki erişim yollarında IP taklidine yol açabilir.

## alias ile root Farkı

`location /uploads/` içinde `alias /srv/uploads/` kullanıldığında eşleşen `/uploads/` öneki yerine bu disk yolu geçer; `/uploads/covers/a.png` isteği `/srv/uploads/covers/a.png` dosyasına karşılık gelir. Aynı yerde `root /srv/uploads/` kullanılsaydı URI'nin tamamı sona eklenerek `/srv/uploads/uploads/covers/a.png` aranırdı. Mevcut nginx yapılandırması ortak volume'u salt okunur kullanır ve görseli Node'a uğramadan sunar; `expires 7d` ile yedi günlük önbellek süresi verir.

## İki Ayrı 413

Multer'ın `UPLOAD_MAX_BYTES=2097152` sınırı yalnız dosyayı ölçer ve reddettiğinde JSON `413 COVER_TOO_LARGE` ile `error.details.max_bytes` döndürür. Nginx'in `client_max_body_size 3m` sınırı multipart başlıkları ve boundary satırları dahil bütün gövdeyi ölçer; aşımda istek API'ye ulaşmadan JSON `413 PAYLOAD_TOO_LARGE` döner. Bu nedenle nginx sınırı dosya sınırından her zaman biraz büyük tutulur ve iki ayar birlikte değiştirilir. 2,5 MiB dosya multer katmanına ulaşırken 5 MiB dosya nginx'te kesilir; JSON dönüşümü eklenmeden önce nginx kendi HTML 413 sayfasını üretirdi.

## error_page Hangi Hataları Değiştirir

Mevcut `error_page` kuralları nginx'in ürettiği 404, 413, 502 ve 504 hatalarını adlandırılmış konumlara yönlendirir. `error_page 502 504 = @json502` satırındaki `=`, son durum kodunu hedef konumun belirlemesini sağlar; hedefteki `return 502` hem JSON gövdesini hem de istemcinin göreceği 502 kodunu verir. `proxy_intercept_errors` açılmadığı için API'den gelen `COVER_TOO_LARGE` gibi JSON hata yanıtları bu kurallarla değiştirilmez. Mevcut nginx JSON yanıtlarında `request_id` yoktur; uygulama hatalarının çoğunda bulunur, ancak tek başına eksikliği kesin teşhis değildir. Örneğin yinelenen Authorization başlığının nginx'te ürettiği 400 için ayrıca bir kural yoktur ve yanıt HTML kalır.

## Upstream Ölünce: 499, 502, 504

İstemci nginx henüz yanıt veremeden bağlantıyı kapatırsa nginx erişim logunda 499 kaydı görülebilir; bu istemciye gönderilen bir HTTP yanıtı değildir. Upstream bağlantısının reddedilmesi veya erişilememesi 502, bağlantı ya da yanıt bekleme zaman aşımı ise 504 oluşturabilir. İlk ölçümde bu ortamda 499 yerine yaklaşık 14,26 saniyede `Host is unreachable` ile HTML 502 görüldü; deneyin sonucu ağın bağlantı hatasını ne zaman bildirdiğine bağlıdır.

`proxy_connect_timeout 3s` bağlantı kurma süresini sınırlar; `proxy_send_timeout 30s` ve `proxy_read_timeout 30s` ise ardışık yazma ve okuma işlemleri arasındaki bekleme sürelerini sınırlar, isteğin toplam süresini değil. Mevcut hata kuralı nginx'in 502 ve 504 hatalarını JSON `502 UPSTREAM_UNAVAILABLE` olarak sunar. Ayarlar sonrasında API kapalıyken yaklaşık 3 saniyede bu yanıt geldi, mevcut görsel 200 dönmeye devam etti ve API tekrar açıldığında `/health` 200 döndü.
