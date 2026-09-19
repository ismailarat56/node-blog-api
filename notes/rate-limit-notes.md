# Rate Limit Notları

Rate limiting, kısa sürede gönderilen istek sayısını sınırlar. Projede sliding window kullanılır; son zaman aralığındaki istekler sayılır ve sınır aşılınca `429 RATE_LIMITED` döner.

## Fixed Window Neden Sınırda İkiye Katlanır

Dakikada 10 istek sınırında, sabit pencerenin son saniyesinde 10 ve yeni pencerenin ilk saniyesinde 10 istek geçebilir. Böylece iki saniyede 20 istek oluşur; sliding window son 60 saniyeyi sayarak bu sınır sorununu önler.

## Paylaşılan Limiter Nesnesi

`password/forgot` ve `email/verify/resend` aynı mail limiter nesnelerini kullanır. Aynı e-posta için bir uçta harcanan hak diğer uçtaki hakkı da azaltır; iki ayrı kota oluşmaz.

## Container İçinde request.ip

`request.ip`, Express'in bağlantıda gördüğü istemci adresidir; Docker ağ yönlendirmesine göre bir ağ geçidi adresi de görülebilir. Reverse proxy kullanılırsa doğru `trust proxy` ayarı olmadan proxy'nin IP'si görülür ve kullanıcılar aynı IP kotasına takılabilir.

## İki Container Olsaydı

İki API container'ı çalışsaydı her birinin belleğinde ayrı sayaç olurdu. İstekleri ikisine dağıtan kullanıcı toplamda daha fazla hak kullanabilirdi; ortak sayaç için Redis gibi paylaşılan bir depo gerekir.
