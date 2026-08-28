# User CRUD API v2

Express ve MySQL ile geliştirilmiş, kullanıcı yönetimi için REST API örneği. Uygulama; arama, filtreleme, sıralama, sayfalama, kısmi güncelleme, soft delete, restore, standart API cevapları, merkezi hata yönetimi ve request ID tabanlı loglama sunar.

## Özellikler

- Kullanıcı oluşturma, listeleme, görüntüleme ve tam/kısmi güncelleme
- `name` veya `email` alanlarında arama
- Aktiflik durumuna göre filtreleme
- Güvenli alanlarla sıralama
- Sayfalama ve sayfalama metadata'sı
- Soft delete ve silinmiş kullanıcıyı geri getirme
- Standart başarı/hata cevapları
- Her istek için `X-Request-Id` ve süre logu
- MySQL migration ve rollback betikleri

## Gereksinimler

- Node.js ve npm
- MySQL

## Kurulum

```bash
git clone https://github.com/ismailarat56/node-user-crud-mysql.git
cd node-user-crud-mysql
git switch user-crud-v2
npm install
cp .env.example .env
```

`.env` dosyasındaki MySQL bağlantı değerlerini kendi ortamınıza göre düzenleyin:

```dotenv
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=simple_user_api
```

Önce başlangıç şemasını, ardından v2 migration'ını çalıştırın:

```bash
mysql -u your_mysql_user -p < sql/schema.sql
mysql -u your_mysql_user -p < sql/migrations/002_upgrade_users_table.sql
```

Uygulamayı başlatın:

```bash
npm start
```

Varsayılan adres `http://localhost:3000` şeklindedir. Veritabanı bağlantısı kurulamazsa HTTP sunucusu başlatılmaz.

## Endpoint'ler

| Metot | Yol | Açıklama |
| --- | --- | --- |
| `GET` | `/health` | Uygulama sağlık kontrolü |
| `GET` | `/api/v1/users` | Kullanıcıları listele |
| `GET` | `/api/v1/users/:id` | Kullanıcı detayını getir |
| `POST` | `/api/v1/users` | Kullanıcı oluştur |
| `PUT` | `/api/v1/users/:id` | Kullanıcıyı tamamen güncelle |
| `PATCH` | `/api/v1/users/:id` | Gönderilen alanları güncelle |
| `DELETE` | `/api/v1/users/:id` | Kullanıcıyı soft delete ile sil |
| `PATCH` | `/api/v1/users/:id/restore` | Silinmiş kullanıcıyı geri getir |

### Liste sorgu parametreleri

| Parametre | Açıklama | Varsayılan |
| --- | --- | --- |
| `search` | İsim veya e-posta içinde arama | Boş |
| `is_active` | `0`, `1`, `true` veya `false` | Tümü |
| `include_deleted` | Silinmiş kayıtları sonuca dahil et | `false` |
| `sort_by` | `id`, `name`, `email`, `created_at`, `updated_at` | `id` |
| `sort_order` | `asc` veya `desc` | `desc` |
| `page` | Sayfa numarası | `1` |
| `limit` | Sayfa başına kayıt; en fazla 50 | `10` |

Örnek:

```http
GET /api/v1/users?search=ali&is_active=1&sort_by=name&sort_order=asc&page=1&limit=10
```

## Cevap biçimi

Başarılı cevaplar ortak bir zarf kullanır:

```json
{
  "success": true,
  "request_id": "e7d7a987-3504-48d8-9a16-3db55ef78240",
  "message": "Kullanıcı oluşturuldu.",
  "data": {}
}
```

Hata cevapları HTTP durumuyla birlikte uygulama hata kodu döndürür:

```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "Kullanıcı bulunamadı.",
    "details": null
  },
  "request_id": "e7d7a987-3504-48d8-9a16-3db55ef78240"
}
```

İstemci `X-Request-Id` başlığı göndermezse uygulama UUID üretir. Aynı değer cevap başlığında ve cevap gövdesinde yer alır.

## Migration'ı geri alma

V2 kolonlarını ve indekslerini kaldırmak için:

```bash
mysql -u your_mysql_user -p < sql/migrations/002_upgrade_users_table_rollback.sql
```

Bu işlem `is_active`, `updated_at` ve `deleted_at` verilerini kalıcı olarak kaldırır; çalıştırmadan önce yedek alın.

## Manuel API senaryoları

Uçtan uca curl örnekleri için [docs/curl-scenarios.md](docs/curl-scenarios.md) dosyasına bakın.

## Yardımcı komutlar

```bash
npm start          # MySQL kullanan API'yi watch modunda başlatır
npm run memory     # Basit, bellekte çalışan eski CRUD örneğini başlatır
node test-database.js
```

## Lisans

ISC
