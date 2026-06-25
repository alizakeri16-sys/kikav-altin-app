"""
این اسکریپت رمزهای عبور موقت اولیه را با bcrypt هش می‌کند و دستورات SQL
برای وارد کردن کاربران اولیه به جدول users می‌سازد.

نحوه استفاده (بعداً، یک‌بار، روی کامپیوتر خودتان):
    pip install bcrypt
    python3 generate_initial_users.py

خروجی را در پنل SQL Editor سایت Supabase اجرا کنید.

نکته امنیتی مهم: بعد از اولین ورود هرکس، حتماً از او بخواهید رمز عبور
موقت زیر را عوض کند (یا یک صفحه «تغییر رمز» در آینده اضافه می‌کنیم).
"""
import bcrypt

# فهرست کاربران اولیه - رمزهای موقت را قبل از اجرای واقعی حتماً تغییر دهید
initial_users = [
    {"username": "ali.modir", "password": "temp-pass-1404", "full_name": "علی", "role": "admin", "position_title": "مدیریت"},
    {"username": "behnam.gh", "password": "temp-pass-1404", "full_name": "بهنام قراقلی", "role": "operator", "position_title": "مسئول اتاق کنترل"},
    {"username": "reza.k", "password": "temp-pass-1404", "full_name": "رضا کشاورز", "role": "supervisor", "position_title": "سرپرست کارخانه فرآوری"},
    {"username": "meysam.k", "password": "temp-pass-1404", "full_name": "میثم کشاورز", "role": "operator", "position_title": "مسئول اتاق کنترل"},
]

print("-- دستورات SQL ساخت کاربران اولیه")
print("-- این رمزها موقت هستند - حتماً بعد از اولین ورود تغییر داده شوند")
print()
for u in initial_users:
    hashed = bcrypt.hashpw(u["password"].encode(), bcrypt.gensalt()).decode()
    print(
        f"insert into users (username, password_hash, full_name, role, position_title) values "
        f"('{u['username']}', '{hashed}', '{u['full_name']}', '{u['role']}', '{u['position_title']}');"
    )
