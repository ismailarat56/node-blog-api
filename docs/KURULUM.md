[← README'ye dön](../README.md)

# Kurulum, ortam değişkenleri ve migration'lar

> Bu belge README'nin önceki sürümünden kelimesi kelimesine taşındı. Metindeki "bu README" ifadeleri o sürümü kasteder.
>
> Güncellik notu: aşağıdaki migration tablosu 008'e kadar listeler. Repoda `sql/migrations/` altında 009 (comments), 010 (password_changed_at), 011 (email_verified_at), 012 (verification_codes), 013 (cover) ve 014 (refresh_tokens) dosyaları da vardır. 003 ve 013 dışındaki migration'ların `_rollback.sql` dosyası bulunur.
>
> Güncellik notu: ortam değişkeni tablosu temel ayarları içerir. `SMTP_*`, `MAIL_*`, `VERIFICATION_CODE_KEY` ve `DEV_MAIL_OUTBOX` için `.env.example` dosyasına bakın. `VERIFICATION_CODE_KEY` 64 karakterlik hex olmalıdır; boşsa sunucu açılmaz.
>
> Docker kurulumu: [DOCKER.md](DOCKER.md). İlk admin: [KIMLIK_DOGRULAMA.md](KIMLIK_DOGRULAMA.md#admin-bootstrap).

## Gereksinimler ve Kurulum

Node.js, npm ve MySQL gerekir. Komutları proje dizininde çalıştırın:

```bash
git clone https://github.com/ismailarat56/node-blog-api.git
cd node-blog-api
npm install
cp .env.example .env
```

Mevcut bir kurulumda `.env` dosyanızı koruyun. Environment bölümüne göre veritabanı ve JWT değerlerini düzenleyin. Temiz veritabanı için:

```bash
mysql -u your_mysql_user -p < sql/schema.sql
```

Güncel `schema.sql` tüm tabloları içerir. Ardından aynı tabloları/kolonları ekleyen migration’ları tekrar çalıştırmayın. Mevcut veritabanı için **Migrationlar** bölümünü izleyin.

```bash
npm start
```

Varsayılan adres `http://localhost:3000` olur. Başlangıçta veritabanı bağlantısı kurulamazsa HTTP sunucusu açılmaz. `npm run memory`, v4 özelliklerini içermeyen eski bellek içi CRUD örneğidir.

## Environment Değişkenleri

Temel veritabanı, authentication, rate limit, yükleme ve proxy ayarları:

| Değişken | Kullanım | Örnek / Varsayılan |
| --- | --- | --- |
| `PORT` | HTTP portu | `3000` |
| `RATE_LIMIT_ENABLED` | Rate limit kontrolü; `false` production ortamında kabul edilmez | `true` |
| `UPLOAD_DIR` | Yüklemelerin kök dizini; kapaklar `covers/` altında saklanır | `uploads`; Docker'da `/app/uploads` |
| `UPLOAD_MAX_BYTES` | Multer dosya boyutu sınırı, bayt cinsinden | `2097152` (2 MB / 2 MiB) |
| `SERVE_UPLOADS` | Express'in `/uploads` statik sunumunu açar/kapatır | Varsayılan `true`; nginx ile `false` |
| `TRUST_PROXY_HOPS` | Express'in güveneceği proxy atlama sayısı | Varsayılan `0`; tek nginx ile `1` |
| `DB_HOST` | MySQL host | `127.0.0.1` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | MySQL kullanıcı adı | `your_mysql_user` |
| `DB_PASSWORD` | MySQL parolası | `your_mysql_password` |
| `DB_NAME` | Veritabanı | `simple_user_api` |
| `JWT_SECRET` | HS256 anahtarı, en az 32 byte | Rastgele üretilmeli |
| `JWT_ISSUER` | Beklenen token issuer | `node-user-crud-mysql` |
| `JWT_AUDIENCE` | Beklenen token audience | `node-user-crud-client` |
| `JWT_EXPIRES_IN_SECONDS` | Token ömrü, 60–86400 saniye | Varsayılan `900` |
| `REFRESH_TOKEN_TTL_SECONDS` | Refresh token ömrü, 3600–2592000 saniye | Varsayılan `604800` (7 gün) |
| `REFRESH_COOKIE_SECURE` | Cookie'nin `Secure` bayrağı; `false` yalnız yerel HTTP için, production'da açılışta hata verir | Varsayılan `true` |

Örnek `.env`:

```dotenv
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=simple_user_api
JWT_SECRET=replace-with-a-long-random-secret
JWT_ISSUER=node-user-crud-mysql
JWT_AUDIENCE=node-user-crud-client
JWT_EXPIRES_IN_SECONDS=900
REFRESH_TOKEN_TTL_SECONDS=604800
REFRESH_COOKIE_SECURE=false
```

JWT_SECRET örnek metnini gerçek kurulumda rastgele anahtarla değiştirin. Anahtar üretimi:

```bash
node -e 'console.log(require("node:crypto").randomBytes(32).toString("hex"))'
```

Bootstrap değişkenleri yalnızca script çalıştırılırken kullanılır; `.env` içine kalıcı olarak eklenmeleri gerekmez:

| Değişken | Nerede | Kalıcı mı? |
| --- | --- | --- |
| `BOOTSTRAP_EMAIL` | set-user-password, set-user-role | Hayır |
| `BOOTSTRAP_PASSWORD` | set-user-password | Hayır |
| `BOOTSTRAP_ROLE` | set-user-role | Hayır |

## Migrationlar

| Dosya | İşlev |
| --- | --- |
| `sql/schema.sql` | Temiz kurulum için güncel bütün tablolar |
| `002_upgrade_users_table.sql` | Aktiflik, güncelleme/silme tarihleri ve indeksler |
| `003_create_user_audit_logs.sql` | Kullanıcı audit tablosu |
| `004_add_authentication_to_users.sql` | password_hash, last_login_at |
| `005_create_revoked_access_tokens.sql` | Token iptal tablosu |
| `006_create_categories.sql` | Categories tablosu |
| `007_add_role_to_users.sql` | role alanı ve indeksi |
| `008_create_posts.sql` | Posts tablosu, foreign key ve indeksler |

Migration dosyaları `sql/migrations/` altındadır. Mevcut veritabanına yalnızca henüz uygulanmamış migration’ları numara sırasıyla uygulayın. Örneğin 002–006 zaten uygulanmışsa:

```bash
mysql -u your_mysql_user -p < sql/migrations/007_add_role_to_users.sql
mysql -u your_mysql_user -p < sql/migrations/008_create_posts.sql
```

Otomatik migration takip mekanizması yoktur. `schema.sql`, mevcut tablo yapısını yükseltmez. SQL dosyaları `USE simple_user_api` içerir; farklı DB_NAME kullanılıyorsa hedef veritabanı SQL ile uyumlu olmalıdır.

002, 004, 005, 006, 007 ve 008 için `_rollback.sql` dosyaları vardır; 003 için yoktur. Geri alma gerektiğinde bağımlılıkların ters sırasını izleyin (örneğin posts tablosunu categories’den önce kaldırın). Rollback tabloları/kolonları ve verilerini kaldırabilir; önce yedek alın.
