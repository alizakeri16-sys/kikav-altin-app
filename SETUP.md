# راهنمای راه‌اندازی سامانه کی‌کاو آلتین

این سند قدم‌های لازم برای راه‌اندازی نهایی (وقتی سرور و حساب Supabase آماده شد) را فهرست می‌کند.

## قدم ۱: ساخت پایگاه داده

۱. وارد پنل Supabase شوید → بخش SQL Editor
۲. محتوای فایل `database/schema.sql` را اجرا کنید (می‌سازد همه جدول‌ها)
۳. محتوای فایل `database/seed_equipment.sql` را اجرا کنید (وارد می‌کند ۱۲ تجهیز و ۱۵۹ آیتم بازرسی واقعی)
۴. فایل `database/generate_initial_users.py` را روی کامپیوتر خودتان اجرا کنید (نیاز به `pip install bcrypt`)، خروجی SQL را کپی و در SQL Editor اجرا کنید (می‌سازد کاربران اولیه)

## قدم ۲: ساخت سطل ذخیره‌سازی عکس

در پنل Supabase → بخش Storage → ساخت یک Bucket جدید با نام دقیق: `report-photos`
تنظیم آن به‌صورت Public (چون عکس‌ها فقط داخلی هستند و نیازی به محرمانگی بالا ندارند)

## قدم ۳: استقرار تابع ورود (Edge Function)

```
supabase functions deploy login
```
این دستور فایل `supabase/functions/login/index.ts` را روی سرور Supabase مستقر می‌کند.

## قدم ۴: تنظیم متغیرهای محیطی

فایل `.env.example` در پوشه `web/` را کپی کنید به نام `.env` و دو مقدار را از تنظیمات پروژه Supabase (Project Settings → API) پر کنید:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## قدم ۵: ساخت و استقرار روی سرور

```
cd web
npm install
npm run build
```
خروجی در پوشه `web/dist` ساخته می‌شود — این پوشه را روی سرور (یا Vercel، یا هر سرویس میزبانی دیگر) قرار دهید.

## کاربران اولیه (رمزهای موقت - حتماً بعداً تغییر دهید)

| نام کاربری | رمز موقت | نقش |
|---|---|---|
| ali.modir | temp-pass-1404 | مدیر (دسترسی کامل به داشبوردها) |
| reza.k | temp-pass-1404 | سرپرست |
| behnam.gh | temp-pass-1404 | اپراتور/اتاق کنترل |
| meysam.k | temp-pass-1404 | اپراتور/اتاق کنترل |

## ساختار کلی سایت

- `/` — صفحه اصلی بعد از ورود
- `/daily-report` — فرم گزارش روزانه
- `/dashboard` — داشبورد گزارش روزانه (فقط مدیر)
- `/maintenance` — صفحه انتخاب بازرسی روزانه/هفتگی
- `/maintenance/dashboard` — داشبورد تعمیر و نگهداشت (فقط مدیر)
- `/maintenance/breakdown` — ثبت خرابی فوری
