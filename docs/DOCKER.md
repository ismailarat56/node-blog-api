[← README'ye dön](../README.md)

# Docker ve nginx

> Bu belge README'nin önceki sürümünden kelimesi kelimesine taşındı. Metindeki "bu README" ifadeleri o sürümü kasteder.
>
> Güncellik notu: metin `.env.docker.example` dosyasının henüz olmadığını söyler. Repoda bu dosya vardır ama yalnız iki boş anahtar içerir; `.env.db.example` yoktur. Aşağıdaki örnek içerikler geçerlidir.
>
> Postman ile Docker testleri: [TESTLER.md](TESTLER.md#docker-ile-postman-testleri).

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
REFRESH_TOKEN_TTL_SECONDS=604800
REFRESH_COOKIE_SECURE=false
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
   curl -i http://127.0.0.1:8080/health
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

## nginx Reverse Proxy ile Çalıştırma

Proje dizininde servisleri başlatın:

```bash
docker compose up -d
```

Giriş adresi `http://127.0.0.1:8080` olur; Postman'da `node-blog-nginx` ortamını bu adresle kullanın. Nginx container içinde 80 portunda dinler; host'a yalnız IPv4 `127.0.0.1:8080` üzerinden yayınlanır.

```bash
curl -i http://127.0.0.1:8080/health
```

`nginx/default.conf` değiştiğinde önce yapılandırmayı doğrulayın, başarılıysa yeniden yükleyin:

```bash
docker compose exec nginx nginx -t && \
  docker compose exec nginx nginx -s reload
```

`/uploads/` istekleri nginx'te biter: `alias /srv/uploads/` ile ortak `uploads-data` volume'undan okunur ve Node'a iletilmez. API dosyaları `/app/uploads` üzerinden yazar; nginx aynı volume'u salt okunur bağlar. Docker ortamında `SERVE_UPLOADS=false` kullanılır.

API portu dışarı açılmaz; `api` servisinde `ports` bloğu yoktur ve `127.0.0.1:3001` üzerinden erişilemez. Nginx API'ye Compose iç ağındaki `http://api:3000` adresinden ulaşır. `.env.docker` içindeki `TRUST_PROXY_HOPS=1`, tek nginx katmanını tanımlar; nginx `X-Forwarded-For` başlığını `$remote_addr` ile yeniden yazar.

## Boyut Sınırları: İki Katman

Bir sınırı değiştirirken `UPLOAD_MAX_BYTES` ve nginx'teki `client_max_body_size` birlikte düşünülmelidir. Multipart alanları, boundary satırları ve başlıkları da gövdeye dahil olduğundan `client_max_body_size` her zaman `UPLOAD_MAX_BYTES` değerinden biraz büyük olmalıdır.

| Sınır | Katman | Yanıt |
| --- | --- | --- |
| 2 MB (`UPLOAD_MAX_BYTES=2097152`) | multer, dosya boyutu | `413 COVER_TOO_LARGE`, JSON, `details.max_bytes` |
| 3 MB (`client_max_body_size 3m`) | nginx, toplam gövde boyutu | `413 PAYLOAD_TOO_LARGE`, JSON; istek API'ye ulaşmaz |

2,5 MB dosya nginx'i geçer ve multer tarafından reddedilir; 5 MB dosya nginx tarafından reddedilir. Nginx'teki `error_page 413 = @json413` HTML yerine JSON hata sözleşmesini korur; `=` yanıt durum kodunu da hedef konumun belirlemesini sağlar.

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
