# Authentication ve Authorization

## 1. Authentication ile Authorization Arasındaki Fark Nedir?

- **Authentication (kimlik doğrulama):**
  “Sen kimsin?” sorusunu yanıtlar.
  Örneğin parola veya token doğrulamak.

- **Authorization (yetkilendirme):**
  “Hangi işlemleri yapabilirsin?” sorusunu yanıtlar.
  Örneğin kullanıcının yazı silmeye yetkili olup olmadığını kontrol etmek.

---

## 2. RBAC Nedir?

**RBAC (Role-Based Access Control)**, yani **rol tabanlı erişim kontrolüdür**.

Yetkiler kullanıcının rolüne göre belirlenir.

**Örnek:**

- `admin` tüm yazıları silebilir.
- `user` yazıları silemez.

---

## 3. ABAC Nedir?

**ABAC (Attribute-Based Access Control)**, yani **özellik tabanlı erişim kontrolüdür**.

Yetkilendirme kararı;

- kullanıcının özelliklerine,
- erişilen kaynağın özelliklerine,
- ortamın özelliklerine

göre verilir.

**Örnek:**

Kullanıcı yalnızca kendi departmanına ait belgeleri mesai saatleri içerisinde düzenleyebilir.

---

## 4. Ownership Check Nedir?

**Ownership check**, erişilmek istenen kaynağın isteği yapan kullanıcıya ait olup olmadığını kontrol etmektir.

Örneğin bir yazının `user_id` değeri, kimliği doğrulanmış kullanıcının `id` değeriyle karşılaştırılır.

Kullanıcı kimliği, isteğin gövdesinde gönderilen değere güvenilerek belirlenmez.

---

## 5. BOLA veya IDOR Nedir?

**BOLA (Broken Object Level Authorization)**, belirli bir kaynağa erişirken gerekli yetki kontrolünün eksik veya hatalı olmasıdır.

**IDOR (Insecure Direct Object Reference)** ise doğrudan kullanılan kaynak kimlikleri üzerinden ortaya çıkan yaygın bir BOLA biçimidir.

**Örnek:**

Kullanıcı URL'de:

```text
/posts/10
```

yerine:

```text
/posts/11
```

yazarak başka bir kullanıcının özel yazısını okuyabiliyorsa bir yetkilendirme açığı vardır.

> **Not:** ID'nin tahmin edilebilir olması tek başına bir güvenlik açığı değildir. Asıl sorun erişim kontrolünün eksik olmasıdır.

---

## 6. BFLA Nedir?

**BFLA (Broken Function Level Authorization)**, işlem veya fonksiyon düzeyindeki yetkilendirme açığıdır.

**Örnek:**

Normal bir kullanıcının yalnızca `admin` rolüne açık olması gereken kullanıcı silme endpoint'ini çalıştırabilmesi.

### BOLA ile BFLA Arasındaki Fark

- **BOLA:** Hangi **kaynağa** erişilebildiğiyle ilgilidir.
- **BFLA:** Hangi **işlemin** yapılabildiğiyle ilgilidir.

---

## 7. 401 ile 403 Arasındaki Fark Nedir?

| HTTP Kodu | Anlamı | Örnek |
|---|---|---|
| `401 Unauthorized` | Geçerli kimlik doğrulaması yoktur. | Token eksik, geçersiz veya süresi dolmuş. |
| `403 Forbidden` | İstek anlaşılmıştır ancak erişim reddedilmiştir. | Giriş yapmış normal kullanıcı admin işlemi yapmak istiyor. |

> Bazı sistemler, özel bir kaynağın varlığını gizlemek amacıyla yetkisiz erişimlerde `404 Not Found` döndürebilir.

---

## 8. Deny by Default İlkesi Nedir?

**Deny by default**, açıkça izin verilmeyen bütün erişimlerin varsayılan olarak reddedilmesidir.

**Örnek:**

Kullanıcının rolü tanınmıyorsa erişim verilmez.

---

## 9. Least Privilege İlkesi Nedir?

**Least privilege**, kullanıcıya veya uygulamaya işini yapabilmesi için gereken **en az yetkinin verilmesi** ilkesidir.

**Örnek:**

Yalnızca yazı hazırlayan bir kullanıcıya kullanıcı silme yetkisi verilmez.

---

## 10. Privilege Escalation Nedir?

**Privilege escalation**, bir kullanıcının sahip olması gerekenden daha geniş erişim veya yetki elde etmesidir.

**Örnek:**

Normal bir kullanıcının bir güvenlik açığı üzerinden kendisini `admin` yapabilmesi.

---

## 11. Horizontal ve Vertical Privilege Escalation Nasıl Ayrılır?

| Tür | Açıklama | Örnek |
|---|---|---|
| **Horizontal — Yatay** | Aynı yetki seviyesindeki başka bir kullanıcının kaynaklarına erişmektir. | Başkasının özel yazısını düzenlemek. |
| **Vertical — Dikey** | Daha yüksek yetki seviyesine ait işlemleri yapabilmektir. | Normal kullanıcının admin işlemi yapması. |

---

## 12. Authorization Kararı Neden Client Tarafında Verilmez?

Client, yani tarayıcı veya istemci, kullanıcının kontrolündedir.

Kullanıcı:

- arayüz kodunu değiştirebilir,
- JavaScript kontrollerini aşabilir,
- API'ye `curl`, Postman veya başka bir araç ile doğrudan istek gönderebilir.

Bu nedenle:

> **Butonu gizlemek bir güvenlik kontrolü değildir.**

Sunucu, her istekte gerekli yetkiyi kendisi doğrulamalıdır.

---

## 13. Authorization Kontrolü Hangi Katmanda Yapılmalıdır?

Authorization kontrolleri **backend tarafında ve ilgili işlem gerçekleştirilmeden önce** yapılmalıdır.

### Middleware

Genel erişim kontrollerini yapabilir.

Örneğin:

- Kullanıcı giriş yapmış mı?
- Geçerli bir token var mı?
- Gerekli role sahip mi?

### Service / İş Mantığı

Kaynağa veya işleme özel kuralları kontrol eder.

Örneğin:

- Yazı kullanıcıya mı ait?
- Kullanıcı bu yazıyı değiştirebilir mi?
- Son admin kullanıcısının admin yetkisi kaldırılıyor mu?

### Model / Veritabanı Sorgusu

Erişim gerektiğinde doğrudan SQL sorgusu seviyesinde sınırlandırılabilir.

Örneğin:

```sql
SELECT *
FROM posts
WHERE id = ?
  AND user_id = ?;
```

veya:

```sql
UPDATE posts
SET title = ?
WHERE id = ?
  AND user_id = ?;
```

Service katmanı olmayan basit projelerde ilgili kontroller `controller` ve `model` arasında düzenlenebilir.

Esas olan, authorization kontrollerinin:

- **sunucu tarafında yapılması,**
- **işlemden önce uygulanması,**
- **her erişim yolunda kontrol edilmesidir.**
