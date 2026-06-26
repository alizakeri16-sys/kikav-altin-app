#!/bin/bash
# اسکریپت نصب خودکار سامانه کی‌کاو آلتین
# این اسکریپت را روی سرور (با دسترسی root) اجرا کنید: bash install.sh

set -e

echo "===================================================="
echo "شروع نصب سامانه کی‌کاو آلتین"
echo "===================================================="

# ---------------------------------------------------------------------
# قدم ۱: دریافت اطلاعات لازم از کاربر
# ---------------------------------------------------------------------
read -s -p "رمز عبور پایگاه داده PostgreSQL (همان کاربر postgres): " DB_PASSWORD
echo ""
read -p "آی‌پی این سرور (مثل 91.212.174.229): " SERVER_IP

JWT_SECRET=$(openssl rand -hex 32)

# ---------------------------------------------------------------------
# قدم ۲: بررسی کد - اگر از قبل موجود است (مثلاً با WinSCP منتقل شده)، دانلود را رد کن
# ---------------------------------------------------------------------
cd /root
if [ -d "kikav-app/web" ] && [ -d "kikav-app/server" ]; then
  echo ""
  echo "کد از قبل در /root/kikav-app موجود است، از دانلود گیت‌هاب صرف‌نظر می‌شود."
  cd kikav-app
else
  echo ""
  echo "---- دانلود کد از گیت‌هاب ----"
  read -p "آدرس مخزن گیت‌هاب (مثل https://github.com/username/kikav-altin-app.git): " REPO_URL
  if [ -d "kikav-altin-app" ]; then
    echo "پوشه قبلاً وجود دارد، حذف و دوباره دانلود می‌شود..."
    rm -rf kikav-altin-app
  fi
  git clone "$REPO_URL" kikav-altin-app
  cd kikav-altin-app
fi

# ---------------------------------------------------------------------
# قدم ۳: نصب وابستگی‌های سرور بک‌اند
# ---------------------------------------------------------------------
echo ""
echo "---- نصب وابستگی‌های سرور بک‌اند ----"
cd server
npm install --production

cat > .env << EOF
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kikavaltin
DB_USER=postgres
DB_PASSWORD=${DB_PASSWORD}
JWT_SECRET=${JWT_SECRET}
PORT=4000
EOF

# ---------------------------------------------------------------------
# قدم ۴: ساخت ساختار پایگاه داده (در صورتی که قبلاً ساخته نشده)
# ---------------------------------------------------------------------
echo ""
echo "---- بررسی و ساخت ساختار پایگاه داده ----"
PGPASSWORD="$DB_PASSWORD" psql -h localhost -U postgres -d kikavaltin -f ../database/schema.sql || echo "توجه: ممکن است جدول‌ها از قبل وجود داشته باشند، ادامه می‌دهیم."
PGPASSWORD="$DB_PASSWORD" psql -h localhost -U postgres -d kikavaltin -f ../database/seed_equipment.sql || echo "توجه: ممکن است داده تجهیزات از قبل وارد شده باشد."
PGPASSWORD="$DB_PASSWORD" psql -h localhost -U postgres -d kikavaltin -f ../database/seed_users.sql || echo "توجه: ممکن است کاربران از قبل وارد شده باشند."

# ---------------------------------------------------------------------
# قدم ۵: نصب pm2 برای اجرای همیشگی سرور
# ---------------------------------------------------------------------
echo ""
echo "---- نصب ابزار اجرای همیشگی سرور (pm2) ----"
npm install -g pm2
pm2 delete kikav-server 2>/dev/null || true
pm2 start src/index.js --name kikav-server
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash || true

# ---------------------------------------------------------------------
# قدم ۶: ساخت فرانت‌اند
# ---------------------------------------------------------------------
echo ""
echo "---- ساخت فایل‌های فرانت‌اند ----"
cd ../web

cat > .env << EOF
VITE_API_BASE_URL=http://${SERVER_IP}:4000/api
EOF

npm install
npm run build

# ---------------------------------------------------------------------
# قدم ۷: نصب و تنظیم Nginx برای نمایش سایت
# ---------------------------------------------------------------------
echo ""
echo "---- نصب و تنظیم Nginx ----"
apt install -y nginx

cat > /etc/nginx/sites-available/kikav-altin << EOF
server {
    listen 80;
    server_name _;

    root /root/kikav-altin-app/web/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /uploads {
        proxy_pass http://localhost:4000;
    }
}
EOF

ln -sf /etc/nginx/sites-available/kikav-altin /etc/nginx/sites-enabled/kikav-altin
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# ---------------------------------------------------------------------
# پایان
# ---------------------------------------------------------------------
echo ""
echo "===================================================="
echo "نصب با موفقیت کامل شد!"
echo "===================================================="
echo "سایت شما اکنون در دسترس است: http://${SERVER_IP}"
echo ""
echo "کاربران اولیه (رمز موقت برای همه: temp-pass-1404):"
echo "  ali.modir   - مدیر"
echo "  reza.k      - سرپرست"
echo "  behnam.gh   - اپراتور"
echo "  meysam.k    - اپراتور"
echo "===================================================="
